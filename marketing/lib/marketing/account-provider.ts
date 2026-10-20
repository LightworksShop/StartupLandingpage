import { linkedinConfig, exchangeLinkedin, probeLinkedin } from "./linkedin-identity";
import { linkedinScopes } from "./linkedin-contract";
import { z } from "zod";
import { MarketingError } from "./schema";
export const accountChannel = z.enum(["instagram", "pinterest", "linkedin"]);
export type AccountChannel = z.infer<typeof accountChannel>;
export const accountScopes = {
  linkedin: ["openid", "profile", "w_member_social"],
  instagram: ["instagram_business_basic", "instagram_business_content_publish"],
  pinterest: ["user_accounts:read", "boards:read", "pins:read", "pins:write"],
};
export class AccountError extends MarketingError {
  constructor(
    public code: string,
    status = 400,
  ) {
    super(
      "Kontoanbindung fehlgeschlagen. Einrichtung und Berechtigungen prüfen.",
      status,
    );
  }
}
export function publicOrigin() {
  const raw = process.env.MARKETING_PUBLIC_URL || "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AccountError("PUBLIC_URL_MISSING", 503);
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
  )
    throw new AccountError("PUBLIC_URL_INVALID", 503);
  return url.origin;
}
export const facebookScopes = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
];
export function instagramLoginMethod(): "instagram" | "facebook" {
  const method = process.env.MARKETING_INSTAGRAM_LOGIN_METHOD || "instagram";
  if (method !== "instagram" && method !== "facebook")
    throw new AccountError("LOGIN_METHOD_INVALID", 503);
  return method;
}
export function oauthConfig(
  channel: AccountChannel,
  method = channel === "instagram" ? instagramLoginMethod() : "instagram",
) {
  const prefix =
    channel === "instagram"
      ? method === "facebook"
        ? "MARKETING_FACEBOOK"
        : "MARKETING_INSTAGRAM"
      : channel === "linkedin" ? "MARKETING_LINKEDIN" : "MARKETING_PINTEREST";
  const clientId = process.env[`${prefix}_CLIENT_ID`] || "",
    clientSecret = process.env[`${prefix}_CLIENT_SECRET`] || "";
  if (!clientId || !clientSecret)
    throw new AccountError("APP_CREDENTIALS_MISSING", 503);
  const apiVersion = process.env.MARKETING_META_API_VERSION || "";
  if (channel === "instagram" && !/^v\d+\.\d+$/.test(apiVersion))
    throw new AccountError("API_VERSION_MISSING", 503);
  const configId =
    channel === "instagram" && method === "facebook"
      ? process.env.MARKETING_FACEBOOK_LOGIN_CONFIG_ID || ""
      : "";
  if (
    channel === "instagram" &&
    method === "facebook" &&
    !/^\d+$/.test(configId)
  )
    throw new AccountError("LOGIN_CONFIG_MISSING", 503);
  return {
    loginMethod: method,
    configId,
    clientId,
    clientSecret,
    apiVersion: channel === "linkedin" ? linkedinConfig().apiVersion : apiVersion,
    targetConfig: channel === "linkedin" ? JSON.stringify([linkedinConfig(), linkedinScopes()]) : "",
    redirectUri: `${publicOrigin()}/custom/marketing-oauth/${channel}`,
  };
}
export function authorizationUrl(channel: AccountChannel, state: string) {
  const config = oauthConfig(channel),
    url = new URL(
      channel === "instagram"
        ? config.loginMethod === "facebook"
          ? `https://www.facebook.com/${config.apiVersion}/dialog/oauth`
          : "https://www.instagram.com/oauth/authorize"
        : channel === "linkedin" ? "https://www.linkedin.com/oauth/v2/authorization" : "https://www.pinterest.com/oauth/",
    );
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    ...(channel === "instagram" && config.loginMethod === "facebook"
      ? { config_id: config.configId, override_default_response_type: "true" }
      : { scope: channel === "linkedin" ? linkedinScopes().join(" ") : accountScopes[channel].join(",") }),
    state,
    ...(channel === "instagram" && config.loginMethod !== "facebook"
      ? { enable_fb_login: "0", force_authentication: "1" }
      : {}),
  }).toString();
  return url.href;
}
export async function accountRequest(
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetcher(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok)
      throw new AccountError(
        `ACCOUNT_HTTP_${response.status}`,
        response.status === 401 || response.status === 403 ? 400 : 502,
      );
    const parsed = await response.json();
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      parsed.error
    )
      throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
    return parsed;
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("ACCOUNT_NETWORK_OR_RESPONSE", 502);
  }
}
export type TokenSet = {
  login_method?: "instagram" | "facebook";
  access_token: string;
  refresh_token?: string;
  expires_at: string | null;
  refresh_expires_at: string | null;
  issued_at: string;
  scopes: string[];
};
function requiredString(raw: unknown) {
  if (typeof raw !== "string" || !raw || raw.length > 16000)
    throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  return raw;
}
function expires(raw: unknown, now: Date) {
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 400 * 86400)
    throw new AccountError("TOKEN_LIFETIME_INVALID", 502);
  return new Date(now.getTime() + seconds * 1000).toISOString();
}
function scopeList(raw: unknown) {
  return typeof raw === "string"
    ? raw.split(/[ ,]+/).filter(Boolean)
    : Array.isArray(raw)
      ? raw.filter((s): s is string => typeof s === "string")
      : [];
}
export function requireScopes(channel: AccountChannel, scopes: string[]) {
  if (accountScopes[channel].some((s) => !scopes.includes(s)))
    throw new AccountError("ACCOUNT_PERMISSIONS_MISSING");
}
function pinterestTokens(
  raw: Record<string, unknown>,
  now: Date,
  previous?: TokenSet,
): TokenSet {
  const scopes =
    raw.scope === undefined ? previous?.scopes || [] : scopeList(raw.scope);
  requireScopes("pinterest", scopes);
  const refreshToken =
    raw.refresh_token === undefined
      ? previous?.refresh_token
      : requiredString(raw.refresh_token);
  if (!refreshToken) throw new AccountError("REFRESH_TOKEN_MISSING", 502);
  const refreshExpiry =
    raw.refresh_token_expires_in !== undefined
      ? expires(raw.refresh_token_expires_in, now)
      : raw.refresh_token_expires_at !== undefined
        ? new Date(Number(raw.refresh_token_expires_at) * 1000).toISOString()
        : previous?.refresh_expires_at;
  if (
    !refreshExpiry ||
    !Number.isFinite(Date.parse(refreshExpiry)) ||
    Date.parse(refreshExpiry) <= now.getTime()
  )
    throw new AccountError("REFRESH_LIFETIME_INVALID", 502);
  return {
    access_token: requiredString(raw.access_token),
    refresh_token: refreshToken,
    expires_at: expires(raw.expires_in, now),
    refresh_expires_at: refreshExpiry,
    issued_at: now.toISOString(),
    scopes,
  };
}
async function pinterestToken(
  body: Record<string, string>,
  fetcher: typeof fetch,
) {
  const c = oauthConfig("pinterest");
  return accountRequest(
    "https://api.pinterest.com/v5/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    },
    fetcher,
  );
}
export async function exchangeCode(
  channel: AccountChannel,
  code: string,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<TokenSet> {
  const c = oauthConfig(channel);
  if (channel === "linkedin") return exchangeLinkedin(code, c.clientId, c.clientSecret, c.redirectUri, fetcher, now);
  if (channel === "pinterest")
    return pinterestTokens(
      await pinterestToken(
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: c.redirectUri,
          continuous_refresh: "true",
        },
        fetcher,
      ),
      now,
    );
  if (c.loginMethod === "facebook")
    return exchangeFacebookCode(code, fetcher, now);
  const short = await accountRequest(
    "https://api.instagram.com/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: c.redirectUri,
        code,
      }).toString(),
    },
    fetcher,
  );
  // Meta returns either a flat response or a single-item data array; never guess a user.
  const nested = short.data;
  if (
    nested !== undefined &&
    (short.access_token !== undefined ||
      !Array.isArray(nested) ||
      nested.length !== 1 ||
      !nested[0] ||
      typeof nested[0] !== "object")
  )
    throw new AccountError("TOKEN_RESPONSE_AMBIGUOUS", 502);
  const item = nested ? (nested as Record<string, unknown>[])[0] : short;
  const url = new URL("https://graph.instagram.com/access_token");
  url.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: c.clientSecret,
    access_token: requiredString(item.access_token),
  }).toString();
  const long = await accountRequest(url.href, {}, fetcher);
  return {
    access_token: requiredString(long.access_token),
    expires_at: expires(long.expires_in, now),
    refresh_expires_at: null,
    issued_at: now.toISOString(),
    scopes: [],
  };
}
export async function refreshToken(
  channel: AccountChannel,
  previous: TokenSet,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<TokenSet> {
  if (channel === "linkedin") throw new AccountError("REAUTH_REQUIRED");
  if (channel === "pinterest") {
    if (
      !previous.refresh_token ||
      !previous.refresh_expires_at ||
      Date.parse(previous.refresh_expires_at) <= now.getTime()
    )
      throw new AccountError("REFRESH_TOKEN_EXPIRED");
    return pinterestTokens(
      await pinterestToken(
        { grant_type: "refresh_token", refresh_token: previous.refresh_token },
        fetcher,
      ),
      now,
      previous,
    );
  }
  if (previous.login_method === "facebook")
    throw new AccountError("REAUTH_REQUIRED");
  if (!previous.expires_at || Date.parse(previous.expires_at) <= now.getTime())
    throw new AccountError("TOKEN_EXPIRED");
  if (now.getTime() - Date.parse(previous.issued_at) < 86400000)
    throw new AccountError("TOKEN_TOO_RECENT");
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.search = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: previous.access_token,
  }).toString();
  const raw = await accountRequest(url.href, {}, fetcher);
  return {
    ...previous,
    access_token: requiredString(raw.access_token),
    expires_at: expires(raw.expires_in, now),
    issued_at: now.toISOString(),
  };
}
export type Board = { id: string; name: string };
function board(raw: Record<string, unknown>): Board {
  if (
    raw.is_ads_only === true ||
    raw.privacy !== "PUBLIC" ||
    typeof raw.id !== "string" ||
    !/^\d{1,30}$/.test(raw.id) ||
    typeof raw.name !== "string"
  )
    throw new AccountError("BOARD_NOT_ORGANIC_PUBLIC");
  return { id: raw.id, name: raw.name.slice(0, 200) };
}
export async function readBoard(
  token: string,
  id: string,
  fetcher: typeof fetch = fetch,
) {
  if (!/^\d{1,30}$/.test(id)) throw new AccountError("BOARD_INVALID");
  return board(
    await accountRequest(
      `https://api.pinterest.com/v5/boards/${id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      fetcher,
    ),
  );
}
export async function listBoards(
  token: string,
  bookmark: string | undefined,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL("https://api.pinterest.com/v5/boards");
  url.search = new URLSearchParams({
    privacy: "PUBLIC",
    page_size: "100",
    ...(bookmark ? { bookmark } : {}),
  }).toString();
  const raw = await accountRequest(
    url.href,
    { headers: { Authorization: `Bearer ${token}` } },
    fetcher,
  );
  if (!Array.isArray(raw.items))
    throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  const boards = raw.items.flatMap((b) => {
    try {
      return [board(b)];
    } catch {
      return [];
    }
  });
  return {
    boards,
    bookmark: typeof raw.bookmark === "string" ? raw.bookmark : null,
  };
}
export async function probeAccount(
  channel: AccountChannel,
  tokens: TokenSet,
  fetcher: typeof fetch = fetch,
) {
  if (channel === "linkedin") return probeLinkedin(tokens, fetcher);
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  if (channel === "pinterest") {
    if (tokens.expires_at !== null) requireScopes(channel, tokens.scopes);
    const raw = await accountRequest(
      "https://api.pinterest.com/v5/user_account",
      { headers },
      fetcher,
    );
    if (
      !["BUSINESS"].includes(String(raw.account_type)) ||
      typeof raw.id !== "string" ||
      typeof raw.username !== "string"
    )
      throw new AccountError("BUSINESS_ACCOUNT_REQUIRED");
    return {
      account_id: raw.id,
      username: raw.username.slice(0, 200),
      scopes: tokens.scopes,
    };
  }
  if (tokens.login_method === "facebook")
    return probeFacebookAccount(tokens, fetcher);
  const version = process.env.MARKETING_META_API_VERSION || "";
  if (!/^v\d+\.\d+$/.test(version))
    throw new AccountError("API_VERSION_MISSING", 503);
  const raw = await accountRequest(
    `https://graph.instagram.com/${version}/me?fields=user_id,username`,
    { headers },
    fetcher,
  );
  const permissions = await accountRequest(
    `https://graph.instagram.com/${version}/me/permissions`,
    { headers },
    fetcher,
  );
  const scopes = Array.isArray(permissions.data)
    ? permissions.data.flatMap((v: Record<string, unknown>) =>
        v.status === "granted" && typeof v.permission === "string"
          ? [v.permission]
          : [],
      )
    : [];
  requireScopes(channel, scopes);
  const id = raw.user_id || raw.id;
  if (
    typeof id !== "string" ||
    !/^\d{1,30}$/.test(id) ||
    typeof raw.username !== "string"
  )
    throw new AccountError("PROFESSIONAL_ACCOUNT_REQUIRED");
  return { account_id: id, username: raw.username.slice(0, 200), scopes };
}

async function exchangeFacebookCode(
  code: string,
  fetcher: typeof fetch,
  now: Date,
): Promise<TokenSet> {
  const c = oauthConfig("instagram", "facebook");
  const url = new URL(
    `https://graph.facebook.com/${c.apiVersion}/oauth/access_token`,
  );
  url.search = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
    code,
  }).toString();
  const short = await accountRequest(url.href, {}, fetcher);
  url.search = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    grant_type: "fb_exchange_token",
    fb_exchange_token: requiredString(short.access_token),
  }).toString();
  const long = await accountRequest(url.href, {}, fetcher);
  return {
    login_method: "facebook",
    access_token: requiredString(long.access_token),
    expires_at: expires(long.expires_in, now),
    refresh_expires_at: null,
    issued_at: now.toISOString(),
    scopes: [],
  };
}
async function facebookRequest(
  path: string,
  token: string,
  fetcher: typeof fetch,
) {
  const version = process.env.MARKETING_META_API_VERSION || "";
  if (!/^v\d+\.\d+$/.test(version))
    throw new AccountError("API_VERSION_MISSING", 503);
  return accountRequest(
    `https://graph.facebook.com/${version}/${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
    fetcher,
  );
}
export async function probeFacebookAccount(
  tokens: TokenSet,
  fetcher: typeof fetch = fetch,
) {
  const c = oauthConfig("instagram", "facebook");
  const raw = await facebookRequest(
    "me?fields=id",
    tokens.access_token,
    fetcher,
  );
  const debug = await facebookRequest(
    `debug_token?input_token=${encodeURIComponent(tokens.access_token)}`,
    `${c.clientId}|${c.clientSecret}`,
    fetcher,
  );
  const data = debug.data as Record<string, unknown> | undefined;
  if (
    !data ||
    data.is_valid !== true ||
    data.app_id !== c.clientId ||
    data.type !== "USER" ||
    data.user_id !== raw.id
  )
    throw new AccountError("ACCOUNT_IDENTITY_CHANGED");
  const scopes = scopeList(data.scopes);
  if (facebookScopes.some((s) => !scopes.includes(s)))
    throw new AccountError("ACCOUNT_PERMISSIONS_MISSING");
  const deadlines = [data.expires_at, data.data_access_expires_at]
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!deadlines.length || deadlines.some((n) => n * 1000 <= Date.now()))
    throw new AccountError("TOKEN_EXPIRED");
  const expiry = Math.min(
    ...deadlines.map((n) => n * 1000),
    tokens.expires_at ? Date.parse(tokens.expires_at) : Infinity,
  );
  tokens.expires_at = new Date(expiry).toISOString();
  if (typeof raw.id !== "string" || !/^\d{1,30}$/.test(raw.id))
    throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  return { account_id: raw.id, username: "", scopes };
}
export type InstagramTarget = {
  id: string;
  username: string;
  page_id: string;
  page_name: string;
};
export async function listInstagramTargets(
  token: string,
  after?: string,
  fetcher: typeof fetch = fetch,
) {
  if (after && after.length > 2000) throw new AccountError("INPUT_INVALID");
  const query = new URLSearchParams({
    fields: "id,name,tasks,instagram_business_account{id,username}",
    limit: "100",
    ...(after ? { after } : {}),
  });
  const raw = await facebookRequest(`me/accounts?${query}`, token, fetcher);
  if (!Array.isArray(raw.data))
    throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  const targets: InstagramTarget[] = raw.data.flatMap(
    (page: Record<string, unknown>) => {
      const ig = page.instagram_business_account as
        | Record<string, unknown>
        | undefined;
      const tasks = Array.isArray(page.tasks) ? page.tasks : [];
      if (
        !ig ||
        typeof page.id !== "string" ||
        !/^\d{1,30}$/.test(page.id) ||
        typeof ig.id !== "string" ||
        !/^\d{1,30}$/.test(ig.id) ||
        typeof ig.username !== "string" ||
        typeof page.name !== "string" ||
        !tasks.some((t) =>
          [
            "CREATE_CONTENT",
            "MANAGE",
            "PROFILE_PLUS_CREATE_CONTENT",
            "PROFILE_PLUS_FULL_CONTROL",
          ].includes(String(t)),
        )
      )
        return [];
      return [
        {
          id: ig.id,
          username: ig.username.slice(0, 200),
          page_id: page.id,
          page_name: page.name.slice(0, 200),
        },
      ];
    },
  );
  const paging = raw.paging as
    | { next?: unknown; cursors?: { after?: unknown } }
    | undefined;
  const cursor =
    paging?.next && typeof paging.cursors?.after === "string"
      ? paging.cursors.after
      : null;
  if (cursor && cursor.length > 2000)
    throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  return { targets, after: cursor };
}
export async function readInstagramTarget(
  token: string,
  pageId: string,
  fetcher: typeof fetch = fetch,
) {
  if (!/^\d{1,30}$/.test(pageId))
    throw new AccountError("INSTAGRAM_TARGET_INVALID");
  let after: string | undefined;
  const seen = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const result = await listInstagramTargets(token, after, fetcher);
    const selected = result.targets.find((t) => t.page_id === pageId);
    if (selected) return selected;
    if (!result.after || seen.has(result.after)) break;
    seen.add(result.after);
    after = result.after;
  }
  throw new AccountError("INSTAGRAM_TARGET_INVALID");
}
