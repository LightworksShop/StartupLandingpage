import type { MarketingHost } from "../../server/host";
import { assertProducts } from "./catalog";
import {
  approvalHash,
  MarketingError,
  validateReady,
  type Media,
  type Post,
  type Settings,
  type Channel,
} from "./schema";
import {
  audit,
  database,
  getMedia,
  getPost,
  newId,
  rows,
  settings,
  type Database,
} from "./repository";
import { ProviderError, publishVersion } from "./providers";
import { publishingCredential } from "./accounts";
import { AccountError } from "./account-provider";

export function referencedProductIds(post: Post, media: Record<string, Media>) {
  return [
    ...new Set([
      ...post.content.product_ids,
      ...Object.values(media).flatMap((asset) => asset.product_ids),
    ]),
  ];
}
export async function validateApproval(
  scope: MarketingHost,
  post: Post,
  config: Settings,
  db: Database,
) {
  const media: Record<string, Media> = {};
  const selectedTargets: Record<string, string> = {};
  for (const version of post.content.versions) {
    if (version.cover_media_id)
      media[version.cover_media_id] = await getMedia(
        db,
        version.cover_media_id,
      );
    if (version.media_id)
      media[version.media_id] = await getMedia(db, version.media_id);
    if (version.channel === "facebook")
      throw new MarketingError("Facebook ist noch nicht angebunden.");
    const credential = await publishingCredential(db, version.channel, true, fetch, version.target_id || undefined);
    selectedTargets[version.channel] = credential.destination;
  }
  await assertProducts(scope, referencedProductIds(post, media), config);
  validateReady(post, media);
  return { media, targets: selectedTargets };
}
export function validApproval(post: Post) {
  return (
    !!post.approved &&
    post.approved.revision === post.revision &&
    post.approved.hash ===
      approvalHash(post, post.approved.media, post.approved.targets)
  );
}
export type Publication = {
  id: string;
  post_id: string;
  channel: Channel;
  state: string;
  value: {
    revision: number;
    error?: string;
    remote_id?: string;
    container_id?: string;
    published_at?: string;
    started_at?: string;
  };
};
export async function claim(
  db: Database,
  postId: string,
  channel: Channel,
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    const { value: config } = await settings(tx, true);
    const post = await getPost(tx, postId, true);
    if (
      config.paused ||
      !validApproval(post) ||
      !post.approved!.targets[channel] ||
      !post.scheduled_at ||
      new Date(post.scheduled_at) > now ||
      !post.content.versions.some((v) => v.channel === channel)
    )
      return null;
    const [existing] = await rows<Publication>(
      tx,
      "select * from marketing_publication where post_id=? and channel=? for update",
      [post.id, channel],
    );
    if (existing && existing.state !== "pending") return null;
    const id = existing?.id || newId("mkpub");
    const value = { revision: post.revision, started_at: now.toISOString() };
    if (existing)
      await tx.raw(
        "update marketing_publication set state='preparing',value=?::jsonb,updated_at=now() where id=?",
        [JSON.stringify(value), id],
      );
    else
      await tx.raw(
        "insert into marketing_publication (id,post_id,channel,state,value) values (?,?,?,'preparing',?::jsonb)",
        [id, post.id, channel, JSON.stringify(value)],
      );
    await audit(tx, "scheduler", "publication.claimed", id, {
      post_id: post.id,
      channel,
      revision: post.revision,
    });
    return { id, post, config };
  });
}
export async function dispatchDue(scope: MarketingHost) {
  if (process.env.MARKETING_PUBLISH_ENABLED !== "true") return;
  const db = database(scope);
  if ((await settings(db)).value.paused) return;
  // A terminated process never causes an automatic resend. Operators reconcile unknown outcomes.
  await db.raw(
    "update marketing_publication set state=case when state='dispatching' then 'unknown' else 'failed' end, value=value || '{\"error\":\"WORKER_INTERRUPTED\"}'::jsonb,updated_at=now() where state in ('preparing','dispatching') and updated_at < now() - interval '15 minutes'",
  );
  const due = await rows<Post>(
    db,
    "select * from marketing_post where approved is not null and scheduled_at<=now() and deleted_at is null and exists (select 1 from jsonb_array_elements(content->'versions') v where not exists (select 1 from marketing_publication p where p.post_id=marketing_post.id and p.channel=v->>'channel' and p.state <> 'pending')) order by scheduled_at,id limit 100",
  );
  for (const candidate of due)
    for (const version of candidate.content.versions) {
      const claimed = await claim(db, candidate.id, version.channel);
      if (!claimed) continue;
      const { id, post, config } = claimed;
      let publishing = false;
      try {
        await assertProducts(
          scope,
          referencedProductIds(post, post.approved!.media),
          config,
        );
        if (version.channel === "facebook")
          throw new ProviderError("CHANNEL_NOT_CONFIGURED", false);
        const currentVersion = post.content.versions.find(
          (v) => v.channel === version.channel,
        )!;
        validateReady(
          { ...post, content: { ...post.content, versions: [currentVersion] } },
          post.approved!.media,
        );
        const credential = await publishingCredential(db, version.channel, true, fetch, currentVersion.target_id || undefined);
        if (post.approved!.targets[version.channel] !== credential.destination)
          throw new ProviderError("TARGET_CHANGED_REAPPROVAL_REQUIRED", false);
        const remoteId = await publishVersion(
          version.channel,
          currentVersion,
          post.approved!.media[currentVersion.media_id!],
          {
            credential,
            cover: currentVersion.cover_media_id
              ? post.approved!.media[currentVersion.cover_media_id]
              : undefined,
            container: async (containerId) => {
              await db.raw(
                "update marketing_publication set value=value || ?::jsonb,updated_at=now() where id=? and state='preparing'",
                [JSON.stringify({ container_id: containerId }), id],
              );
            },
            beforePublish: async () => {
              // Commit the dispatch intent BEFORE the irreversible network call.
              await db.transaction(async (tx) => {
                const currentSettings = await settings(tx, true);
                const current = await getPost(tx, post.id, true);
                if (
                  currentSettings.value.paused ||
                  process.env.MARKETING_PUBLISH_ENABLED !== "true" ||
                  !validApproval(current) ||
                  current.approved!.hash !== post.approved!.hash
                )
                  throw new ProviderError("PAUSED_OR_APPROVAL_REVOKED", false);
                await assertProducts(
                  scope,
                  referencedProductIds(current, current.approved!.media),
                  currentSettings.value,
                );
                const activeCredential = await publishingCredential(
                  tx,
                  credential.channel,
                  false,
                  fetch,
                  currentVersion.target_id || undefined,
                );
                if (activeCredential.destination !== credential.destination)
                  throw new ProviderError(
                    "TARGET_CHANGED_REAPPROVAL_REQUIRED",
                    false,
                  );
                const changed = await rows(
                  tx,
                  "update marketing_publication set state='dispatching',updated_at=now() where id=? and state='preparing' returning id",
                  [id],
                );
                if (!changed.length)
                  throw new ProviderError("CLAIM_LOST", false);
              });
              publishing = true;
            },
          },
        );
        await db.transaction(async (tx) => {
          await tx.raw(
            "update marketing_publication set state='published',value=value || ?::jsonb,updated_at=now() where id=?",
            [
              JSON.stringify({
                remote_id: remoteId,
                published_at: new Date().toISOString(),
              }),
              id,
            ],
          );
          await audit(tx, "scheduler", "publication.published", id, {
            remote_id: remoteId,
          });
        });
      } catch (error) {
        const uncertain =
          error instanceof ProviderError ? error.uncertain : publishing;
        const code =
          error instanceof ProviderError || error instanceof AccountError
            ? error.code
            : "VALIDATION_OR_STORAGE_FAILED";
        await db.transaction(async (tx) => {
          await tx.raw(
            "update marketing_publication set state=?,value=value || ?::jsonb,updated_at=now() where id=?",
            [
              uncertain ? "unknown" : "failed",
              JSON.stringify({ error: code }),
              id,
            ],
          );
          await audit(
            tx,
            "scheduler",
            uncertain ? "publication.unknown" : "publication.failed",
            id,
            { code },
          );
        });
      }
    }
}
export async function reconcile(
  db: Database,
  id: string,
  actor: string,
  input: {
    action: "retry" | "published" | "abandon";
    remote_id?: string;
    note: string;
  },
) {
  return db.transaction(async (tx) => {
    await settings(tx, true);
    const [pub] = await rows<Publication>(
      tx,
      "select * from marketing_publication where id=? for update",
      [id],
    );
    if (!pub || !["failed", "unknown"].includes(pub.state))
      throw new MarketingError(
        "Nur fehlgeschlagene/unklare Veröffentlichungen können bearbeitet werden.",
        409,
      );
    if (input.action === "retry" && pub.state !== "failed")
      throw new MarketingError(
        "Unklarer Versand darf nicht wiederholt werden. Plattform prüfen und Ergebnis dokumentieren.",
        409,
      );
    if (
      input.action === "retry" &&
      !validApproval(await getPost(tx, pub.post_id, true))
    )
      throw new MarketingError(
        "Beitrag zuerst im Kalender erneut ausdrücklich freigeben, danach die Wiederholung vormerken.",
        409,
      );
    const next =
      input.action === "retry"
        ? "pending"
        : input.action === "published"
          ? "published"
          : "abandoned";
    if (next === "published" && !input.remote_id)
      throw new MarketingError("Plattform-ID fehlt.");
    await tx.raw(
      "update marketing_publication set state=?,value=value || ?::jsonb,updated_at=now() where id=?",
      [
        next,
        JSON.stringify(
          input.remote_id
            ? {
                remote_id: input.remote_id,
                published_at: new Date().toISOString(),
              }
            : {},
        ),
        id,
      ],
    );
    await audit(tx, actor, `publication.${input.action}`, id, {
      note: input.note,
      previous: pub.state,
      previous_value: pub.value,
    });
  });
}
