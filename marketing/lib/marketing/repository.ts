import { randomUUID } from "node:crypto";
import type { MarketingHost } from "../../server/host";
import { approvableVersions, feedExclusions } from "./post-model";
import {
  approvalHash,
  assertEditable,
  draftSchema,
  MarketingError,
  settingsSchema,
  type Approval,
  type Media,
  type Post,
  type Settings,
} from "./schema";

export interface Database {
  raw<T = { rows: Record<string, unknown>[] }>(
    sql: string,
    bindings?: unknown[],
  ): Promise<T>;
  transaction<T>(work: (db: Database) => Promise<T>): Promise<T>;
}
export function database(scope: MarketingHost) {
  return scope.db as Database;
}
export async function rows<T>(
  db: Database,
  sql: string,
  bindings: unknown[] = [],
): Promise<T[]> {
  return (await db.raw<{ rows: T[] }>(sql, bindings)).rows;
}
export const newId = (prefix: string) =>
  `${prefix}_${randomUUID().replaceAll("-", "")}`;
export async function audit(
  db: Database,
  actor: string,
  action: string,
  entity: string,
  value: unknown = {},
) {
  await db.raw(
    "insert into marketing_audit (id,actor,action,entity_id,value) values (?,?,?,?,?::jsonb)",
    [newId("mkaudit"), actor, action, entity, JSON.stringify(value)],
  );
}
export async function settings(db: Database, lock = false) {
  const [row] = await rows<{ revision: number; value: Settings }>(
    db,
    `select revision,value from marketing_settings where id='global'${lock ? " for update" : ""}`,
  );
  if (!row) throw new MarketingError("Marketing-Migration fehlt.", 503);
  row.value = { ...row.value, feed_exclusions: feedExclusions(row.value) };
  return row;
}
export type PostVersion = Pick<
  Post,
  "revision" | "content" | "scheduled_at"
> & { saved_at: string };
function postSnapshot(post: Post): PostVersion {
  return {
    revision: post.revision,
    content: post.content,
    scheduled_at: post.scheduled_at,
    saved_at: new Date(
      (post as Post & { updated_at?: string }).updated_at || Date.now(),
    ).toISOString(),
  };
}
export async function postVersions(db: Database, post: Post) {
  const snapshots = await rows<{ value: PostVersion }>(
    db,
    "select value from marketing_audit where entity_id=? and action='draft.snapshot' order by created_at desc,id desc limit 20",
    [post.id],
  );
  const saved = snapshots.map((row) => row.value);
  return [
    ...saved,
    ...(saved.some((v) => v.revision === post.revision)
      ? []
      : [postSnapshot(post)]),
  ]
    .filter(
      (version, index, all) =>
        all.findIndex((v) => v.revision === version.revision) === index,
    )
    .sort((a, b) => b.revision - a.revision)
    .slice(0, 20);
}
export async function withPostStates(db: Database, posts: Post[]) {
  if (!posts.length) return [];
  const publications = await rows<{
    post_id: string;
    channel: string;
    state: string;
    value: unknown;
  }>(
    db,
    `select post_id,channel,state,value from marketing_publication where post_id in (${posts.map(() => "?").join(",")}) order by created_at`,
    posts.map((post) => post.id),
  );
  return posts.map((post) => {
    const attempts = publications.filter((pub) => pub.post_id === post.id);
    return { ...post, publications: attempts, editable: !attempts.length };
  });
}
export async function getPost(db: Database, id: string, lock = false) {
  const [post] = await rows<Post>(
    db,
    `select * from marketing_post where id=? and deleted_at is null${lock ? " for update" : ""}`,
    [id],
  );
  if (!post) throw new MarketingError("Beitrag nicht gefunden.", 404);
  // Drivers return Dates; canonicalize for hashing and API comparisons.
  post.scheduled_at = post.scheduled_at
    ? new Date(post.scheduled_at).toISOString()
    : null;
  return post;
}
export async function getMedia(db: Database, id: string): Promise<Media> {
  const [row] = await rows<{ id: string; value: Omit<Media, "id"> }>(
    db,
    "select id,value from marketing_media where id=? and deleted_at is null",
    [id],
  );
  if (!row) throw new MarketingError("Medium nicht gefunden.", 404);
  return { ...row.value, id: row.id };
}
export async function saveDraft(db: Database, raw: unknown, actor: string) {
  const input = draftSchema.parse(raw);
  return db.transaction(async (tx) => {
    // All publication-related mutations take global -> post locks in this order.
    await settings(tx, true);
    if (!input.id) {
      const id = newId("mkpost");
      await tx.raw(
        "insert into marketing_post (id,content,scheduled_at) values (?,?::jsonb,?)",
        [id, JSON.stringify(input.content), input.scheduled_at],
      );
      await audit(tx, actor, "draft.create", id);
      const saved = await getPost(tx, id);
      await audit(tx, actor, "draft.snapshot", id, postSnapshot(saved));
      return saved;
    }
    const post = await getPost(tx, input.id, true);
    if (post.revision !== input.revision)
      throw new MarketingError(
        "Der Beitrag wurde inzwischen geändert. Neu laden.",
        409,
      );
    const publications = await rows<{ state: string }>(
      tx,
      "select state from marketing_publication where post_id=?",
      [post.id],
    );
    assertEditable(publications.map((p) => p.state));
    const [snapshot] = await rows(
      tx,
      "select id from marketing_audit where entity_id=? and action='draft.snapshot' and value->>'revision'=? limit 1",
      [post.id, String(post.revision)],
    );
    if (!snapshot)
      await audit(tx, actor, "draft.snapshot", post.id, postSnapshot(post));
    await tx.raw(
      "update marketing_post set content=?::jsonb, scheduled_at=?, revision=revision+1, approved=null, updated_at=now() where id=?",
      [JSON.stringify(input.content), input.scheduled_at, post.id],
    );
    await audit(tx, actor, "draft.edit_approval_revoked", post.id, {
      previous_revision: post.revision,
    });
    const saved = await getPost(tx, post.id);
    await audit(tx, actor, "draft.snapshot", post.id, postSnapshot(saved));
    return saved;
  });
}
export async function saveSettings(
  db: Database,
  value: unknown,
  revision: number,
  actor: string,
) {
  const next = settingsSchema.parse(value);
  return db.transaction(async (tx) => {
    const old = await settings(tx, true);
    if (old.revision !== revision)
      throw new MarketingError(
        "Vorgaben wurden inzwischen geändert. Neu laden.",
        409,
      );
    next.feed_exclusions ??= feedExclusions(old.value);
    await tx.raw(
      "update marketing_settings set value=?::jsonb,revision=revision+1,updated_at=now() where id='global'",
      [JSON.stringify(next)],
    );
    await audit(
      tx,
      actor,
      next.paused ? "settings.paused" : "settings.updated",
      "global",
    );
    return settings(tx);
  });
}
export async function approvePost(
  db: Database,
  id: string,
  revision: number,
  actor: string,
  validate: (
    post: Post,
    config: Settings,
    db: Database,
  ) => Promise<{
    media: Record<string, Media>;
    targets: Record<string, string>;
  }>,
) {
  return db.transaction(async (tx) => {
    const { value: config } = await settings(tx, true);
    const post = await getPost(tx, id, true);
    if (post.revision !== revision)
      throw new MarketingError("Veralteter Beitragsstand.", 409);
    const publications = await rows<{ channel: string; state: string }>(
      tx,
      "select channel,state from marketing_publication where post_id=?",
      [id],
    );
    // Reapprove unchanged content after an account/target change. Recovery is
    // limited to definitive failures (including already queued retries).
    // Content editing remains blocked by saveDraft once any attempt exists.
    const versions = approvableVersions(post.content, publications);
    if (!versions.length)
      throw new MarketingError(
        "Erneute Freigabe nur bei eindeutig fehlgeschlagenen oder vorgemerkten Wiederholungen möglich. Für neue Inhalte einen neuen Entwurf anlegen.",
        409,
      );
    // Only remaining channels need current accounts/media. The hash still binds
    // the entire unchanged post; completed publication records are never rewritten.
    const { media, targets } = await validate(
      { ...post, content: { ...post.content, versions } }, config, tx,
    );
    const approval: Approval = {
      revision,
      actor,
      at: new Date().toISOString(),
      media,
      targets,
      hash: approvalHash(post, media, targets),
    };
    await tx.raw(
      "update marketing_post set approved=?::jsonb,updated_at=now() where id=?",
      [JSON.stringify(approval), id],
    );
    await audit(tx, actor, "post.approved", id, {
      revision,
      hash: approval.hash,
    });
    return getPost(tx, id);
  });
}
export async function revokePost(
  db: Database,
  id: string,
  revision: number,
  actor: string,
) {
  return db.transaction(async (tx) => {
    await settings(tx, true);
    const post = await getPost(tx, id, true);
    if (post.revision !== revision)
      throw new MarketingError("Veralteter Beitragsstand.", 409);
    await tx.raw(
      "update marketing_post set approved=null,updated_at=now() where id=?",
      [id],
    );
    await audit(tx, actor, "post.approval_revoked", id);
    return getPost(tx, id);
  });
}
