import { linkedinConfig, probeLinkedin, linkedinTargets, verifyLinkedinTarget } from "./linkedin-identity";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { audit, rows, settings, type Database } from "./repository";
import {
  AccountError,
  accountChannel,
  authorizationUrl,
  exchangeCode,
  listBoards,
  listInstagramTargets,
  readInstagramTarget,
  instagramLoginMethod,
  oauthConfig,
  probeAccount,
  publicOrigin,
  readBoard,
  refreshToken,
  type AccountChannel,
  type TokenSet,
} from "./account-provider";

const tokenSchema = z
  .object({
    login_method: z.enum(["instagram", "facebook"]).optional(),
    access_token: z.string().min(1).max(16000),
    refresh_token: z.string().min(1).max(16000).optional(),
    expires_at: z.string().datetime().nullable(),
    refresh_expires_at: z.string().datetime().nullable(),
    issued_at: z.string().datetime(),
    scopes: z.array(z.string().max(100)).max(50),
  })
  .strict();
export type AccountValue = {
  state: "connected" | "needs_target" | "disconnected" | "reauth_required";
  login_method?: "instagram" | "facebook";
  page_id?: string;
  page_name?: string;
  account_id?: string;
  username?: string;
  target_id?: string;
  target_name?: string;
  scopes?: string[];
  expires_at?: string | null;
  refresh_expires_at?: string | null;
  issued_at?: string;
  checked_at?: string;
  last_refresh_at?: string;
  last_refresh_attempt_at?: string;
  error?: string;
  permissions_verified?: boolean;
  source?: "oauth" | "environment";
};
export type AccountRow = {
  id: AccountChannel;
  revision: number;
  value: AccountValue;
  encrypted: string | null;
};
export type PublishingCredential = {
  loginMethod?: "instagram" | "facebook";
  channel: AccountChannel;
  token: string;
  target: string;
  destination: string;
  apiVersion: string;
  source: "oauth" | "environment";
};
function encryptionKey() {
  const raw = process.env.MARKETING_CREDENTIALS_KEY || "";
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw))
    throw new AccountError("CREDENTIALS_KEY_MISSING", 503);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw)
    throw new AccountError("CREDENTIALS_KEY_INVALID", 503);
  return key;
}
export function sealTokens(channel: AccountChannel, tokens: TokenSet) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`marketing:${channel}:v1`));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokenSchema.parse(tokens)), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function openTokens(
  channel: AccountChannel,
  envelope: string,
): TokenSet {
  try {
    const [version, iv, tag, value, ...rest] = envelope.split(".");
    if (version !== "v1" || rest.length || !iv || !tag || !value)
      throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(iv, "base64"),
    );
    decipher.setAAD(Buffer.from(`marketing:${channel}:v1`));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const bytes = Buffer.concat([
      decipher.update(Buffer.from(value, "base64")),
      decipher.final(),
    ]);
    return tokenSchema.parse(JSON.parse(bytes.toString("utf8")));
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("CREDENTIALS_DECRYPTION_FAILED", 503);
  }
}
export function stateDigest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function oauthStateDigest(channel: AccountChannel, state: string) {
  const config = oauthConfig(channel);
  return stateDigest(
    JSON.stringify([
      state,
      channel,
      config.loginMethod,
      config.clientId,
      config.configId,
      config.targetConfig,
    ]),
  );
}
export async function accountRow(
  db: Database,
  channel: AccountChannel,
  lock = false,
) {
  return (
    (
      await rows<AccountRow>(
        db,
        `select id,revision,value,encrypted from marketing_account where id=?${lock ? " for update" : ""}`,
        [channel],
      )
    )[0] || null
  );
}
function legacy(channel: AccountChannel): PublishingCredential | null {
  if (channel === "linkedin") return null;
  const token =
      process.env[
        channel === "instagram"
          ? "MARKETING_INSTAGRAM_TOKEN"
          : "MARKETING_PINTEREST_TOKEN"
      ] || "",
    target =
      process.env[
        channel === "instagram"
          ? "MARKETING_INSTAGRAM_USER_ID"
          : "MARKETING_PINTEREST_BOARD_ID"
      ] || "",
    apiVersion = process.env.MARKETING_META_API_VERSION || "";
  return token &&
    target &&
    (channel !== "instagram" || /^v\d+\.\d+$/.test(apiVersion))
    ? {
        channel,
        token,
        target,
        destination: target,
        apiVersion,
        source: "environment",
      }
    : null;
}
export async function accountSummaries(db: Database) {
  const result: Record<string, unknown> = {};
  for (const channel of accountChannel.options) {
    let configured = false,
      setupError = "",
      redirectUri = "";
    try {
      redirectUri = `${publicOrigin()}/custom/marketing-oauth/${channel}`;
      encryptionKey();
      const cfg = oauthConfig(channel);
      configured = true;
      redirectUri = cfg.redirectUri;
    } catch (error) {
      setupError =
        error instanceof AccountError ? error.code : "SETUP_INCOMPLETE";
    }
    const row = await accountRow(db, channel),
      fallback = !row ? legacy(channel) : null;
    const value = row
      ? { ...row.value }
      : fallback
        ? {
            state: "configured",
            source: "environment",
            target_id: fallback.target,
          }
        : { state: "disconnected" };
    if (
      row?.value.expires_at &&
      ["connected", "needs_target"].includes(row.value.state) &&
      Date.parse(row.value.expires_at) <= Date.now()
    )
      value.state =
        channel === "pinterest" &&
        row.value.source === "oauth" &&
        row.value.refresh_expires_at &&
        Date.parse(row.value.refresh_expires_at) > Date.now()
          ? "refresh_required"
          : "reauth_required";
    result[channel] = {
      ...value,
      login_method:
        row?.value.login_method ||
        (channel === "instagram" ? instagramLoginMethod() : undefined),
      revision: row?.revision || 0,
      oauth_ready: configured,
      setup_error: setupError,
      redirect_uri: redirectUri,
    };
  }
  return result;
}
async function saveAccount(
  db: Database,
  channel: AccountChannel,
  expected: number,
  value: AccountValue,
  tokens: TokenSet | null,
  actor: string,
  action: string,
  revoke = true,
) {
  const encrypted = tokens ? sealTokens(channel, tokens) : null;
  return db.transaction(async (tx) => {
    await settings(tx, true);
    const old = await accountRow(tx, channel, true);
    if ((old?.revision || 0) !== expected)
      throw new AccountError("ACCOUNT_CHANGED", 409);
    const nextRevision = expected + 1;
    if (old)
      await tx.raw(
        "update marketing_account set revision=?,value=?::jsonb,encrypted=?,updated_at=now() where id=?",
        [nextRevision, JSON.stringify(value), encrypted, channel],
      );
    else
      await tx.raw(
        "insert into marketing_account (id,revision,value,encrypted) values (?,?,?::jsonb,?)",
        [channel, nextRevision, JSON.stringify(value), encrypted],
      );
    if (revoke) {
      // The global lock prevents consent/target changes from racing approval or dispatch intent.
      await tx.raw(
        "update marketing_post set approved=null,updated_at=now() where approved is not null and deleted_at is null and exists (select 1 from jsonb_array_elements(content->'versions') v where v->>'channel'=?) and not exists (select 1 from marketing_publication p where p.post_id=marketing_post.id and (p.state in ('preparing','dispatching','unknown') or (p.channel=? and p.state in ('published','abandoned'))))",
        [channel, channel],
      );
    }
    await audit(tx, actor, action, channel);
    return { revision: nextRevision, ...value };
  });
}
export async function startOauth(
  db: Database,
  channel: AccountChannel,
  actor: string,
) {
  encryptionKey();
  oauthConfig(channel);
  const state = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await settings(tx, true);
    const row = await accountRow(tx, channel, true);
    await tx.raw(
      "delete from marketing_oauth_state where expires_at<now() or (actor=? and channel=?)",
      [actor, channel],
    );
    await tx.raw(
      "insert into marketing_oauth_state (id,actor,channel,nonce_hash,account_revision,expires_at) values (?,?,?,?,?,now()+interval '10 minutes')",
      [
        oauthStateDigest(channel, state),
        actor,
        channel,
        stateDigest(nonce),
        row?.revision || 0,
      ],
    );
    await audit(tx, actor, "account.oauth_started", channel);
  });
  return { url: authorizationUrl(channel, state), nonce };
}
export async function finishOauth(
  db: Database,
  channel: AccountChannel,
  actor: string,
  input: { state: string; nonce: string; code?: string; denied?: boolean },
  fetcher: typeof fetch = fetch,
) {
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(input.state) ||
    !/^[A-Za-z0-9_-]{43}$/.test(input.nonce)
  )
    throw new AccountError("OAUTH_STATE_INVALID");
  const [flow] = await rows<{ account_revision: number }>(
    db,
    "update marketing_oauth_state set used_at=now(),updated_at=now() where id=? and actor=? and channel=? and nonce_hash=? and used_at is null and expires_at>now() returning account_revision",
    [
      oauthStateDigest(channel, input.state),
      actor,
      channel,
      stateDigest(input.nonce),
    ],
  );
  if (!flow) throw new AccountError("OAUTH_STATE_INVALID");
  if (input.denied) {
    await audit(db, actor, "account.oauth_denied", channel);
    throw new AccountError("OAUTH_DENIED");
  }
  if (!input.code || input.code.length > 4096)
    throw new AccountError("OAUTH_CODE_MISSING");
  const tokens = await exchangeCode(channel, input.code, fetcher),
    profile = await probeAccount(channel, tokens, fetcher);
  tokens.scopes = profile.scopes;
  const old = await accountRow(db, channel),
    sameIdentity = old?.value.account_id === profile.account_id;
  // Keep a board only for the exact same Pinterest identity and revalidate it.
  const selected =
    channel === "pinterest" && sameIdentity && old?.value.target_id
      ? await readBoard(tokens.access_token, old.value.target_id, fetcher)
      : null;
  const target =
    channel === "linkedin" ? (profile as {target_id: string}).target_id :
    channel === "instagram" && tokens.login_method !== "facebook"
      ? profile.account_id
      : selected?.id;
  const value: AccountValue = {
    state: target ? "connected" : "needs_target",
    source: "oauth",
    login_method: tokens.login_method,
    permissions_verified: true,
    ...profile,
    target_id: target,
    target_name: selected?.name,
    expires_at: tokens.expires_at,
    refresh_expires_at: tokens.refresh_expires_at,
    issued_at: tokens.issued_at,
    checked_at: new Date().toISOString(),
  };
  return saveAccount(
    db,
    channel,
    flow.account_revision,
    value,
    tokens,
    actor,
    "account.connected",
  );
}
export async function disconnectAccount(
  db: Database,
  channel: AccountChannel,
  revision: number,
  actor: string,
) {
  // A tombstone overrides legacy environment credentials; a disconnect never resumes a fallback.
  return saveAccount(
    db,
    channel,
    revision,
    { state: "disconnected" },
    null,
    actor,
    "account.disconnected",
  );
}
export async function refreshAccount(
  db: Database,
  channel: AccountChannel,
  actor: string,
  force = false,
  fetcher: typeof fetch = fetch,
  now = new Date(),
  expectedRevision?: number,
) {
  return db.transaction(async (tx) => {
    const row = await accountRow(tx, channel, true);
    if (expectedRevision !== undefined && row?.revision !== expectedRevision)
      throw new AccountError("ACCOUNT_CHANGED", 409);
    if (
      !row?.encrypted ||
      row.value.source !== "oauth" ||
      row.value.state === "disconnected"
    )
      throw new AccountError("ACCOUNT_NOT_CONNECTED");
    const token = openTokens(channel, row.encrypted);
    if (channel === "linkedin" || token.login_method === "facebook") {
      if (force) throw new AccountError("REAUTH_REQUIRED");
      return row;
    }
    const due =
      !token.expires_at ||
      Date.parse(token.expires_at) - now.getTime() < 7 * 86400000;
    const backoff =
      row.value.last_refresh_attempt_at &&
      now.getTime() - Date.parse(row.value.last_refresh_attempt_at) < 3600000;
    if (!force && (!due || backoff)) return row;
    if (row.value.state === "reauth_required")
      throw new AccountError("REAUTH_REQUIRED");
    try {
      const updated = await refreshToken(channel, token, fetcher, now);
      const value = {
        ...row.value,
        expires_at: updated.expires_at,
        refresh_expires_at: updated.refresh_expires_at,
        issued_at: updated.issued_at,
        last_refresh_at: now.toISOString(),
        last_refresh_attempt_at: now.toISOString(),
        error: undefined,
      };
      const encrypted = sealTokens(channel, updated);
      await tx.raw(
        "update marketing_account set encrypted=?,value=?::jsonb,revision=revision+1,updated_at=now() where id=?",
        [encrypted, JSON.stringify(value), channel],
      );
      await audit(tx, actor, "account.refreshed", channel);
      return {
        ...row,
        revision: row.revision + 1,
        value,
        encrypted,
      };
    } catch (error) {
      const code =
        error instanceof AccountError ? error.code : "ACCOUNT_REFRESH_FAILED";
      const terminal = [
        "TOKEN_EXPIRED",
        "REFRESH_TOKEN_EXPIRED",
        "ACCOUNT_HTTP_400",
        "ACCOUNT_HTTP_401",
        "ACCOUNT_HTTP_403",
        "ACCOUNT_PERMISSIONS_MISSING",
      ].includes(code);
      const value = {
        ...row.value,
        state: terminal ? ("reauth_required" as const) : row.value.state,
        error: code,
        last_refresh_attempt_at: now.toISOString(),
      };
      await tx.raw(
        "update marketing_account set value=?::jsonb,updated_at=now() where id=?",
        [JSON.stringify(value), channel],
      );
      await audit(tx, actor, "account.refresh_failed", channel, { code });
      // Commit the failure/backoff; return a safe result instead of rolling the transaction back.
      return { ...row, value };
    }
  });
}
export async function publishingCredential(
  db: Database,
  channel: AccountChannel,
  refresh = true,
  fetcher: typeof fetch = fetch,
  requestedTarget?: string,
): Promise<PublishingCredential> {
  let row = await accountRow(db, channel);
  if (!row) {
    const fallback = legacy(channel);
    if (fallback) return fallback;
    throw new AccountError("ACCOUNT_NOT_CONNECTED");
  }
  if (
    refresh &&
    row.encrypted &&
    row.value.source === "oauth" &&
    row.value.state !== "disconnected"
  )
    row = await refreshAccount(db, channel, "scheduler");
  if (!row.encrypted || row.value.state !== "connected" || !row.value.target_id)
    throw new AccountError("ACCOUNT_NOT_READY");
  const token = openTokens(channel, row.encrypted);
  if (token.expires_at && Date.parse(token.expires_at) <= Date.now())
    throw new AccountError("TOKEN_EXPIRED");
  const target = channel === "linkedin" && requestedTarget ? requestedTarget : row.value.target_id;
  if (channel === "linkedin") {
    const profile = await verifyLinkedinTarget(token, target, fetcher);
    if (profile.account_id !== row.value.account_id) throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  }
  if (token.login_method === "facebook") {
    const selected = await readInstagramTarget(
      token.access_token,
      row.value.page_id || "",
      fetcher,
    );
    if (selected.id !== row.value.target_id)
      throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  }
  return {
    loginMethod: token.login_method,
    channel,
    token: token.access_token,
    target,
    destination:
      token.login_method === "facebook"
        ? `facebook/${row.value.account_id}/${row.value.page_id}/${row.value.target_id}`
        : `${row.value.account_id}/${target}`,
    apiVersion: channel === "linkedin" ? linkedinConfig().apiVersion : process.env.MARKETING_META_API_VERSION || "",
    source: row.value.source || "oauth",
  };
}
export async function verifyAccount(
  db: Database,
  channel: AccountChannel,
  revision: number,
  actor: string,
  fetcher: typeof fetch = fetch,
) {
  const row = await accountRow(db, channel);
  if ((row?.revision || 0) !== revision)
    throw new AccountError("ACCOUNT_CHANGED", 409);
  let token: TokenSet;
  if (row?.encrypted) token = openTokens(channel, row.encrypted);
  else {
    const fallback = !row ? legacy(channel) : null;
    if (!fallback) throw new AccountError("ACCOUNT_NOT_CONNECTED");
    token = {
      access_token: fallback.token,
      expires_at: null,
      refresh_expires_at: null,
      issued_at: new Date().toISOString(),
      scopes: [],
    };
  }
  const profile = await probeAccount(channel, token, fetcher);
  token.scopes = profile.scopes;
  const previousTarget = row?.value.target_id || legacy(channel)?.target;
  if (channel === "linkedin" && row?.value.target_id) await verifyLinkedinTarget(token, row.value.target_id, fetcher);
  if (row?.value.account_id && row.value.account_id !== profile.account_id)
    throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  if (
    channel === "instagram" &&
    token.login_method !== "facebook" &&
    previousTarget &&
    previousTarget !== profile.account_id
  )
    throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  const facebookTarget =
    token.login_method === "facebook" && row?.value.page_id
      ? await readInstagramTarget(
          token.access_token,
          row.value.page_id,
          fetcher,
        )
      : null;
  if (facebookTarget && facebookTarget.id !== previousTarget)
    throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  const target =
    channel === "linkedin" ? previousTarget :
    channel === "instagram" && token.login_method !== "facebook"
      ? profile.account_id
      : previousTarget;
  const selected =
    target && channel === "pinterest"
      ? await readBoard(token.access_token, target, fetcher)
      : null;
  const value: AccountValue = {
    ...row?.value,
    ...profile,
    username: facebookTarget?.username || profile.username,
    state: target ? "connected" : "needs_target",
    source: row?.value.source || "environment",
    permissions_verified: row?.value.source === "oauth",
    target_id: target,
    target_name: selected?.name,
    scopes: profile.scopes,
    expires_at: token.expires_at,
    refresh_expires_at: token.refresh_expires_at,
    issued_at: token.issued_at,
    checked_at: new Date().toISOString(),
    error: undefined,
  };
  return saveAccount(
    db,
    channel,
    revision,
    value,
    token,
    actor,
    "account.checked",
    !row,
  );
}
export async function accountBoards(
  db: Database,
  bookmark?: string,
  fetcher: typeof fetch = fetch,
) {
  const row = await accountRow(db, "pinterest");
  if (
    !row?.encrypted ||
    !["connected", "needs_target"].includes(row.value.state)
  )
    throw new AccountError("ACCOUNT_NOT_CONNECTED");
  return listBoards(
    openTokens("pinterest", row.encrypted).access_token,
    bookmark,
    fetcher,
  );
}
export async function selectBoard(
  db: Database,
  revision: number,
  boardId: string,
  actor: string,
  fetcher: typeof fetch = fetch,
) {
  const row = await accountRow(db, "pinterest");
  if (!row?.encrypted || row.revision !== revision)
    throw new AccountError("ACCOUNT_CHANGED", 409);
  if (!["connected", "needs_target"].includes(row.value.state))
    throw new AccountError("ACCOUNT_NOT_READY");
  const token = openTokens("pinterest", row.encrypted);
  if (token.expires_at && Date.parse(token.expires_at) <= Date.now())
    throw new AccountError("TOKEN_EXPIRED");
  const selected = await readBoard(token.access_token, boardId, fetcher);
  return saveAccount(
    db,
    "pinterest",
    revision,
    {
      ...row.value,
      state: "connected",
      target_id: selected.id,
      target_name: selected.name,
      checked_at: new Date().toISOString(),
    },
    token,
    actor,
    "account.target_changed",
  );
}
export async function accountInstagramTargets(
  db: Database,
  after?: string,
  fetcher: typeof fetch = fetch,
) {
  const row = await accountRow(db, "instagram");
  if (
    !row?.encrypted ||
    !["connected", "needs_target"].includes(row.value.state)
  )
    throw new AccountError("ACCOUNT_NOT_CONNECTED");
  const token = openTokens("instagram", row.encrypted);
  if (token.login_method !== "facebook")
    throw new AccountError("INSTAGRAM_TARGET_INVALID");
  if (!token.expires_at || Date.parse(token.expires_at) <= Date.now())
    throw new AccountError("TOKEN_EXPIRED");
  return listInstagramTargets(token.access_token, after, fetcher);
}
export async function selectInstagramTarget(
  db: Database,
  revision: number,
  pageId: string,
  actor: string,
  fetcher: typeof fetch = fetch,
) {
  const row = await accountRow(db, "instagram");
  if (!row?.encrypted || row.revision !== revision)
    throw new AccountError("ACCOUNT_CHANGED", 409);
  if (!["connected", "needs_target"].includes(row.value.state))
    throw new AccountError("ACCOUNT_NOT_READY");
  const token = openTokens("instagram", row.encrypted);
  if (token.login_method !== "facebook")
    throw new AccountError("INSTAGRAM_TARGET_INVALID");
  const profile = await probeAccount("instagram", token, fetcher);
  if (profile.account_id !== row.value.account_id)
    throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  const selected = await readInstagramTarget(
    token.access_token,
    pageId,
    fetcher,
  );
  return saveAccount(
    db,
    "instagram",
    revision,
    {
      ...row.value,
      ...profile,
      username: selected.username,
      state: "connected",
      page_id: selected.page_id,
      page_name: selected.page_name,
      target_id: selected.id,
      expires_at: token.expires_at,
      checked_at: new Date().toISOString(),
    },
    token,
    actor,
    "account.target_changed",
  );
}
export async function refreshAccounts(db: Database) {
  for (const channel of accountChannel.options) {
    const row = await accountRow(db, channel);
    if (
      row?.encrypted &&
      row.value.source === "oauth" &&
      ["connected", "needs_target"].includes(row.value.state)
    )
      await refreshAccount(db, channel, "scheduler");
  }
  await db.raw(
    "delete from marketing_oauth_state where expires_at<now()-interval '1 day'",
  );
}
export function ensureSameOrigin(origin: unknown) {
  if (origin !== undefined && origin !== publicOrigin())
    throw new AccountError("ORIGIN_INVALID", 403);
}

export async function accountLinkedinTargets(db: Database, fetcher: typeof fetch = fetch) {
  const row = await accountRow(db, "linkedin");
  if (!row?.encrypted || row.value.state !== "connected") throw new AccountError("ACCOUNT_NOT_CONNECTED");
  const { targets } = await linkedinTargets(openTokens("linkedin", row.encrypted), fetcher);
  return { targets };
}
export async function selectLinkedinTarget(db: Database, revision: number, target: string, actor: string, fetcher: typeof fetch = fetch) {
  const row = await accountRow(db, "linkedin");
  if (!row?.encrypted || row.revision !== revision) throw new AccountError("ACCOUNT_CHANGED", 409);
  if (row.value.state !== "connected") throw new AccountError("ACCOUNT_NOT_READY");
  const tokens = openTokens("linkedin", row.encrypted);
  const profile = await verifyLinkedinTarget(tokens, target, fetcher);
  if (profile.account_id !== row.value.account_id) throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  return saveAccount(db, "linkedin", revision, { ...row.value, target_id: target, checked_at: new Date().toISOString() }, tokens, actor, "account.target_changed");
}
