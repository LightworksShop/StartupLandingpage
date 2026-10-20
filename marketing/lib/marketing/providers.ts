import { publishLinkedin } from "./linkedin-provider";
import {
  MarketingError,
  type Channel,
  type Media,
  type Content,
} from "./schema";
import type { PublishingCredential } from "./accounts";
import { mediaBytes } from "./media";
export type Version = Content["versions"][number];
export class ProviderError extends Error {
  constructor(
    public code: string,
    public uncertain: boolean,
  ) {
    super(code);
  }
}
export function targets(): Record<string, string> {
  return {
    instagram: process.env.MARKETING_INSTAGRAM_USER_ID || "",
    pinterest: process.env.MARKETING_PINTEREST_BOARD_ID || "",
  };
}
export function connectionState() {
  return {
    instagram: !!(
      process.env.MARKETING_INSTAGRAM_TOKEN &&
      process.env.MARKETING_INSTAGRAM_USER_ID &&
      /^v\d+\.\d+$/.test(process.env.MARKETING_META_API_VERSION || "")
    ),
    pinterest: !!(
      process.env.MARKETING_PINTEREST_TOKEN &&
      process.env.MARKETING_PINTEREST_BOARD_ID
    ),
    facebook: false,
    linkedin: false,
    publishing_enabled: process.env.MARKETING_PUBLISH_ENABLED === "true",
    feeds_configured: !!(
      process.env.MARKETING_STORE_API_URL &&
      process.env.MARKETING_STORE_PUBLISHABLE_KEY &&
      process.env.MARKETING_FEED_REGION_ID &&
      process.env.MARKETING_FEEDS_ENABLED === "true"
    ),
  };
}
export async function providerRequest(
  url: string,
  token: string,
  body?: unknown,
  publishing = false,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new ProviderError("NETWORK_OR_TIMEOUT", publishing);
  }
  // Provider bodies may contain tokens/URLs/content. Never store or log them.
  if (!response.ok)
    throw new ProviderError(
      `PROVIDER_HTTP_${response.status}`,
      publishing && (response.status >= 500 || response.status === 408),
    );
  try {
    return (await response.json()) as {
      id?: string;
      status_code?: string;
      media_id?: string;
      status?: string;
      upload_url?: string;
      upload_parameters?: Record<string, string>;
    };
  } catch {
    throw new ProviderError("PROVIDER_INVALID_RESPONSE", publishing);
  }
}
export async function publishVersion(
  channel: Channel,
  version: Version,
  media: Media,
  hooks: {
    cover?: Media;
    credential?: PublishingCredential;
    container: (id: string) => Promise<void>;
    beforePublish: () => Promise<void>;
  },
  request = providerRequest,
  videoIO = { read: mediaBytes, fetch: globalThis.fetch },
) {
  if (channel === "linkedin") {
    if (!hooks.credential) throw new ProviderError("CHANNEL_NOT_CONFIGURED", false);
    return publishLinkedin(version, media, { ...hooks, credential: hooks.credential });
  }
  const state = connectionState();
  if (!hooks.credential && !state[channel])
    throw new ProviderError("CHANNEL_NOT_CONFIGURED", false);
  if (channel === "pinterest") {
    let source: Record<string, string> = {
      source_type: "image_url",
      url: media.url,
    };
    if (media.mime_type.startsWith("video/")) {
      if (!hooks.cover) throw new ProviderError("VIDEO_COVER_REQUIRED", false);
      const token =
        hooks.credential?.token || process.env.MARKETING_PINTEREST_TOKEN!;
      const registered = await request(
        "https://api.pinterest.com/v5/media",
        token,
        { media_type: "video" },
      );
      if (
        !registered.media_id ||
        !registered.upload_url ||
        !registered.upload_parameters
      )
        throw new ProviderError("VIDEO_REGISTRATION_INVALID", false);
      // Upload credentials are sent only to the documented Pinterest media bucket, never persisted.
      const uploadUrl = new URL(registered.upload_url);
      if (
        uploadUrl.origin !==
          "https://pinterest-media-upload.s3-accelerate.amazonaws.com" ||
        uploadUrl.username ||
        uploadUrl.password
      )
        throw new ProviderError("VIDEO_UPLOAD_ORIGIN_INVALID", false);
      await hooks.container(registered.media_id);
      const bytes = await videoIO.read(media.url);
      const form = new FormData();
      for (const [key, value] of Object.entries(registered.upload_parameters))
        form.append(key, value);
      form.append(
        "file",
        new Blob([new Uint8Array(bytes)], { type: "video/mp4" }),
        "video.mp4",
      );
      const upload = await videoIO
        .fetch(uploadUrl, {
          method: "POST",
          body: form,
          redirect: "error",
          signal: AbortSignal.timeout(60000),
        })
        .catch(() => null);
      if (!upload?.ok) throw new ProviderError("VIDEO_UPLOAD_FAILED", false);
      let ready = false;
      const deadline = Date.now() + 180000;
      for (let i = 0; i < 30 && Date.now() < deadline; i++) {
        const status = await request(
          `https://api.pinterest.com/v5/media/${encodeURIComponent(registered.media_id)}`,
          token,
        );
        if (status.status === "succeeded") {
          ready = true;
          break;
        }
        if (status.status === "failed")
          throw new ProviderError("VIDEO_PROCESSING_FAILED", false);
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }
      if (!ready) throw new ProviderError("VIDEO_PROCESSING_TIMEOUT", false);
      source = {
        source_type: "video_id",
        media_id: registered.media_id,
        cover_image_url: hooks.cover.url,
      };
    }
    await hooks.beforePublish();
    const result = await request(
      "https://api.pinterest.com/v5/pins",
      hooks.credential?.token || process.env.MARKETING_PINTEREST_TOKEN!,
      {
        board_id: hooks.credential?.target || targets().pinterest,
        title: version.title,
        description: version.text,
        alt_text: version.alt,
        ...(version.link ? { link: version.link } : {}),
        media_source: source,
      },
      true,
    );
    if (!result.id) throw new ProviderError("PROVIDER_MISSING_ID", true);
    return result.id;
  }
  if (channel !== "instagram")
    throw new MarketingError("Facebook ist noch nicht angebunden.");
  const token =
    hooks.credential?.token || process.env.MARKETING_INSTAGRAM_TOKEN!;
  const root = `https://${hooks.credential?.loginMethod === "facebook" ? "graph.facebook.com" : "graph.instagram.com"}/${hooks.credential?.apiVersion || process.env.MARKETING_META_API_VERSION}`;
  const account = encodeURIComponent(
    hooks.credential?.target || targets().instagram,
  );
  const container = await request(`${root}/${account}/media`, token, {
    caption: version.text,
    ...(media.mime_type.startsWith("video/")
      ? { media_type: "REELS", video_url: media.url }
      : { image_url: media.url, alt_text: version.alt }),
  });
  if (!container.id) throw new ProviderError("CONTAINER_MISSING_ID", false);
  await hooks.container(container.id);
  // Bound to 3 minutes. A container is not a publication; never publish until FINISHED.
  let ready = false;
  const deadline = Date.now() + 180000;
  for (let i = 0; i < 30 && Date.now() < deadline; i++) {
    const status = await request(
      `${root}/${encodeURIComponent(container.id)}?fields=status_code`,
      token,
    );
    if (status.status_code === "FINISHED") {
      ready = true;
      break;
    }
    if (["ERROR", "EXPIRED", "PUBLISHED"].includes(status.status_code || ""))
      throw new ProviderError("CONTAINER_NOT_PUBLISHABLE", false);
    await new Promise((resolve) => setTimeout(resolve, 6000));
  }
  if (!ready) throw new ProviderError("CONTAINER_PROCESSING_TIMEOUT", false);
  await hooks.beforePublish();
  const result = await request(
    `${root}/${account}/media_publish`,
    token,
    { creation_id: container.id },
    true,
  );
  if (!result.id) throw new ProviderError("PROVIDER_MISSING_ID", true);
  return result.id;
}
