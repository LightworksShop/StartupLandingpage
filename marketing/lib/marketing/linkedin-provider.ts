import { createHash } from "node:crypto";
import { linkedinAuthor, linkedinImage, linkedinPost } from "./linkedin-contract";
import { linkedinHeaders } from "./linkedin-identity";
import { ProviderError, type Version } from "./providers";
import type { PublishingCredential } from "./accounts";
import type { Media } from "./schema";
import { mediaBytes } from "./media";

// Preserve headers and accept empty success responses (PUT and POST /rest/posts).
export async function linkedinRequest(url: string, init: RequestInit, publishing: boolean, fetcher: typeof fetch = fetch) {
  let response: Response;
  try { response = await fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(25000) }); }
  catch { throw new ProviderError("LINKEDIN_NETWORK_OR_TIMEOUT", publishing); }
  if (!response.ok) throw new ProviderError(`LINKEDIN_HTTP_${response.status}`, publishing && (response.status >= 500 || response.status === 408));
  return response;
}
export async function publishLinkedin(version: Version, media: Media, hooks: {
  credential: PublishingCredential;
  container(id: string): Promise<void>;
  beforePublish(): Promise<void>;
}, io = { fetch: globalThis.fetch, read: mediaBytes, sleep: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) }) {
  const { token, target, apiVersion } = hooks.credential;
  if (!linkedinAuthor.safeParse(target).success || !/^20\d{2}(0[1-9]|1[0-2])$/.test(apiVersion)) throw new ProviderError("LINKEDIN_CONFIGURATION_INVALID", false);
  if (!["image/jpeg", "image/png"].includes(media.mime_type)) throw new ProviderError("LINKEDIN_IMAGE_REQUIRED", false);
  const bytes = await io.read(media.url);
  if (createHash("sha256").update(bytes).digest("hex") !== media.checksum) throw new ProviderError("MEDIA_CHECKSUM_CHANGED", false);
  const headers = linkedinHeaders(token, apiVersion);
  const initialized = await linkedinRequest("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST", headers, body: JSON.stringify({ initializeUploadRequest: { owner: target } }),
  }, false, io.fetch);
  let raw: { value?: { image?: string; uploadUrl?: string } };
  try { raw = await initialized.json(); } catch { throw new ProviderError("LINKEDIN_UPLOAD_RESPONSE_INVALID", false); }
  const image = raw.value?.image;
  if (!linkedinImage.safeParse(image).success || typeof raw.value?.uploadUrl !== "string") throw new ProviderError("LINKEDIN_UPLOAD_RESPONSE_INVALID", false);
  let upload: URL;
  try { upload = new URL(raw.value.uploadUrl); } catch { throw new ProviderError("LINKEDIN_UPLOAD_ORIGIN_INVALID", false); }
  // Documented upload origin only. Never send the bearer token to arbitrary URLs.
  if (upload.origin !== "https://www.linkedin.com" || !upload.pathname.startsWith("/dms-uploads/") || upload.username || upload.password) throw new ProviderError("LINKEDIN_UPLOAD_ORIGIN_INVALID", false);
  await hooks.container(image!);
  await linkedinRequest(upload.href, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": media.mime_type }, body: new Uint8Array(bytes) }, false, io.fetch);
  let available = false;
  const deadline = Date.now() + 180000;
  for (let i = 0; i < 30 && Date.now() < deadline; i++) {
    let response: Response;
    try { response = await linkedinRequest(`https://api.linkedin.com/rest/images/${encodeURIComponent(image!)}`, { headers }, false, io.fetch); }
    catch (error) {
      if (error instanceof ProviderError && error.code === "LINKEDIN_HTTP_403") throw new ProviderError("LINKEDIN_IMAGE_STATUS_PERMISSION_REQUIRED", false);
      throw error;
    }
    let state: { status?: string; owner?: string };
    try { state = await response.json(); } catch { throw new ProviderError("LINKEDIN_IMAGE_STATUS_INVALID", false); }
    if (state.owner !== target) throw new ProviderError("LINKEDIN_IMAGE_OWNER_CHANGED", false);
    if (state.status === "AVAILABLE") { available = true; break; }
    if (state.status === "PROCESSING_FAILED") throw new ProviderError("LINKEDIN_IMAGE_PROCESSING_FAILED", false);
    if (!["PROCESSING", "WAITING_UPLOAD"].includes(state.status || "")) throw new ProviderError("LINKEDIN_IMAGE_STATUS_INVALID", false);
    if (i < 29) await io.sleep(2000);
  }
  if (!available) throw new ProviderError("LINKEDIN_IMAGE_PROCESSING_TIMEOUT", false);
  await hooks.beforePublish();
  const response = await linkedinRequest("https://api.linkedin.com/rest/posts", {
    method: "POST", headers,
    body: JSON.stringify({ author: target, commentary: version.text, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, content: { media: { id: image, altText: version.alt } }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false }),
  }, true, io.fetch);
  const id = response.headers.get("x-restli-id");
  if (response.status !== 201 || !linkedinPost.safeParse(id).success) throw new ProviderError("LINKEDIN_POST_ID_MISSING", true);
  return id!;
}
