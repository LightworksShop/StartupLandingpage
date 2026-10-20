import assert from "node:assert/strict";
import { redactOauthLog } from "./oauth-log";
import test from "node:test";
import {
  AccountError,
  facebookScopes,
  listInstagramTargets,
  readInstagramTarget,
  accountScopes,
  authorizationUrl,
  exchangeCode,
  refreshToken,
  listBoards,
  probeAccount,
  accountRequest,
  type TokenSet,
} from "./account-provider";
import {
  sealTokens,
  openTokens,
  ensureSameOrigin,
  accountSummaries,
} from "./accounts";
import { handleAccounts, handleOauthCallback } from "./account-http";
const env = {
  MARKETING_PUBLIC_URL: "https://admin.example.test",
  MARKETING_CREDENTIALS_KEY: Buffer.alloc(32, 7).toString("base64"),
  MARKETING_INSTAGRAM_LOGIN_METHOD: "instagram",
  MARKETING_INSTAGRAM_CLIENT_ID: "test-app",
  MARKETING_INSTAGRAM_CLIENT_SECRET: "test-secret",
  MARKETING_PINTEREST_CLIENT_ID: "test-app",
  MARKETING_PINTEREST_CLIENT_SECRET: "test-secret",
  MARKETING_META_API_VERSION: "v25.0",
};
async function configured(work: () => unknown) {
  const old = { ...process.env };
  Object.assign(process.env, env);
  try {
    await work();
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
  }
}
const now = new Date("2026-10-06T12:00:00Z");
const tokens: TokenSet = {
  access_token: "fixture-access",
  refresh_token: "fixture-refresh",
  expires_at: "2026-10-08T12:00:00Z",
  refresh_expires_at: "2026-11-01T12:00:00Z",
  issued_at: "2026-10-01T12:00:00Z",
  scopes: accountScopes.pinterest,
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}
test("credentials are authenticated, randomized and bound to their platform", () =>
  configured(() => {
    const sealed = sealTokens("pinterest", tokens),
      other = sealTokens("pinterest", tokens);
    assert.notEqual(sealed, other);
    assert.equal(sealed.includes(tokens.access_token), false);
    assert.deepEqual(openTokens("pinterest", sealed), tokens);
    assert.throws(() => openTokens("instagram", sealed), {
      code: "CREDENTIALS_DECRYPTION_FAILED",
    });
    const parts = sealed.split(".");
    parts[3] = Buffer.from("modified").toString("base64");
    assert.throws(() => openTokens("pinterest", parts.join(".")), {
      code: "CREDENTIALS_DECRYPTION_FAILED",
    });
    process.env.MARKETING_CREDENTIALS_KEY = Buffer.alloc(32, 9).toString(
      "base64",
    );
    assert.throws(() => openTokens("pinterest", sealed), {
      code: "CREDENTIALS_DECRYPTION_FAILED",
    });
    delete process.env.MARKETING_CREDENTIALS_KEY;
    assert.throws(() => sealTokens("pinterest", tokens), {
      code: "CREDENTIALS_KEY_MISSING",
    });
  }));
test("OAuth URLs use exact registered callbacks and organic least-privilege scopes", () =>
  configured(() => {
    for (const channel of ["instagram", "pinterest"] as const) {
      const url = new URL(authorizationUrl(channel, "opaque-state"));
      assert.equal(
        url.searchParams.get("redirect_uri"),
        `https://admin.example.test/custom/marketing-oauth/${channel}`,
      );
      assert.equal(url.searchParams.get("state"), "opaque-state");
      assert.equal(
        url.searchParams.get("scope"),
        accountScopes[channel].join(","),
      );
      assert.equal(url.search.includes("ads:"), false);
      assert.equal(
        url.search.includes(env.MARKETING_INSTAGRAM_CLIENT_SECRET),
        false,
      );
    }
    assert.throws(() => ensureSameOrigin("https://attacker.test"), {
      code: "ORIGIN_INVALID",
    });
    process.env.MARKETING_PUBLIC_URL = "http://remote.test";
    assert.throws(() => authorizationUrl("instagram", "state"), {
      code: "PUBLIC_URL_INVALID",
    });
  }));
test("Pinterest obtains continuous refresh tokens and can refresh after access expiry", () =>
  configured(async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url, init) => {
      requests.push({ url: String(url), init: init! });
      return json({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 2592000,
        refresh_token_expires_in: 5184000,
        scope: accountScopes.pinterest.join(" "),
      });
    }) as typeof fetch;
    const result = await exchangeCode("pinterest", "test-code", fetcher, now);
    assert.equal(
      new URLSearchParams(String(requests[0].init.body)).get(
        "continuous_refresh",
      ),
      "true",
    );
    assert.equal(requests[0].init.redirect, "error");
    assert.equal(result.refresh_token, "new-refresh");
    const refreshed = await refreshToken(
      "pinterest",
      { ...tokens, expires_at: "2026-10-05T12:00:00Z" },
      fetcher,
      now,
    );
    assert.equal(refreshed.access_token, "new-access");
    assert.equal(
      new URLSearchParams(String(requests[1].init.body)).get("grant_type"),
      "refresh_token",
    );
    await assert.rejects(
      exchangeCode(
        "pinterest",
        "test-code",
        (async () =>
          json({
            access_token: "a",
            refresh_token: "b",
            expires_in: 100,
            refresh_token_expires_in: 100,
            scope: "boards:read",
          })) as typeof fetch,
        now,
      ),
      { code: "ACCOUNT_PERMISSIONS_MISSING" },
    );
  }));
test("Instagram exchanges short tokens, verifies grants, and respects minimum refresh age", () =>
  configured(async () => {
    const calls: string[] = [];
    const fetcher = (async (url) => {
      const u = String(url);
      calls.push(u);
      if (u.includes("api.instagram.com"))
        return json({ data: [{ access_token: "short", user_id: "123" }] });
      if (u.includes("/access_token"))
        return json({ access_token: "long", expires_in: 5184000 });
      if (u.includes("/permissions"))
        return json({
          data: accountScopes.instagram.map((permission) => ({
            permission,
            status: "granted",
          })),
        });
      return json({ user_id: "123", username: "werkstatt" });
    }) as typeof fetch;
    const token = await exchangeCode("instagram", "code", fetcher, now);
    const profile = await probeAccount("instagram", token, fetcher);
    assert.equal(token.access_token, "long");
    assert.equal(profile.account_id, "123");
    assert.deepEqual(profile.scopes, accountScopes.instagram);
    await assert.rejects(
      refreshToken(
        "instagram",
        { ...token, scopes: profile.scopes },
        fetcher,
        now,
      ),
      { code: "TOKEN_TOO_RECENT" },
    );
    await assert.rejects(
      exchangeCode(
        "instagram",
        "code",
        (async () => json({ data: [{}, {}] })) as typeof fetch,
        now,
      ),
      { code: "TOKEN_RESPONSE_AMBIGUOUS" },
    );
    assert.equal(
      calls.some((url) => url.includes("grant_type=ig_exchange_token")),
      true,
    );
  }));
test("board selection excludes private and advertising-only destinations, preserves pagination", () =>
  configured(async () => {
    const result = await listBoards("token", "opaque cursor", (async (url) => {
      assert.equal(
        new URL(String(url)).searchParams.get("bookmark"),
        "opaque cursor",
      );
      assert.equal(new URL(String(url)).searchParams.get("privacy"), "PUBLIC");
      return json({
        bookmark: "next",
        items: [
          { id: "123", name: "Werkstatt", privacy: "PUBLIC" },
          { id: "124", name: "Private", privacy: "SECRET" },
          { id: "125", name: "Ads", privacy: "PUBLIC", is_ads_only: true },
        ],
      });
    }) as typeof fetch);
    assert.deepEqual(result, {
      boards: [{ id: "123", name: "Werkstatt" }],
      bookmark: "next",
    });
  }));
test("account failures expose only controlled codes; agents and API keys cannot manage credentials", () =>
  configured(async () => {
    await assert.rejects(
      accountRequest(
        "https://api.pinterest.com/v5/oauth/token",
        {},
        (async () => json({ error: "secret-token" }, 401)) as typeof fetch,
      ),
      (error) =>
        error instanceof AccountError &&
        error.code === "ACCOUNT_HTTP_401" &&
        !error.message.includes("secret-token"),
    );
    for (const auth_context of [
      { actor_type: "user", actor_id: "agent", auth_identity_id: "api-key" },
      { actor_type: "customer", actor_id: "c" },
    ]) {
      let status = 0;
      const res = {
        setHeader() {},
        status(value: number) {
          status = value;
          return this;
        },
        json() {
          return this;
        },
      };
      await handleAccounts(
        {
          auth_context,
          method: "GET",
          scope: {
            resolve() {
              throw new Error("must not touch DB");
            },
          },
        } as never,
        res as never,
      );
      assert.equal(status, 403);
    }
  }));

test("missing apps still expose registered callbacks; missing callback origin fails safely", () =>
  configured(async () => {
    delete process.env.MARKETING_INSTAGRAM_CLIENT_ID;
    delete process.env.MARKETING_PINTEREST_CLIENT_ID;
    const db = { raw: async () => ({ rows: [] }) };
    const summaries = (await accountSummaries(db as never)) as Record<
      string,
      { oauth_ready: boolean; setup_error: string; redirect_uri: string }
    >;
    for (const channel of ["instagram", "pinterest"]) {
      assert.equal(summaries[channel].oauth_ready, false);
      assert.equal(summaries[channel].setup_error, "APP_CREDENTIALS_MISSING");
      assert.equal(
        summaries[channel].redirect_uri,
        `https://admin.example.test/custom/marketing-oauth/${channel}`,
      );
    }
    delete process.env.MARKETING_PUBLIC_URL;
    let status = 0,
      body: { code?: string } = {};
    await handleOauthCallback(
      { auth_context: { actor_type: "customer" } } as never,
      {
        setHeader() {},
        status(value: number) {
          status = value;
          return this;
        },
        json(value: { code?: string }) {
          body = value;
          return this;
        },
      } as never,
    );
    assert.equal(status, 503);
    assert.equal(body.code, "PUBLIC_URL_MISSING");
  }));

test("OAuth log redaction strips codes/state before logging", () => {
  const req = {
    originalUrl:
      "/custom/marketing-oauth/pinterest?code=sensitive-code&state=sensitive-state",
    url: "/custom/marketing-oauth/pinterest?code=sensitive-code&state=sensitive-state",
    query: { code: "sensitive-code", state: "sensitive-state" },
    headers: { referer: "https://provider.test/?code=sensitive-code" },
  };
  let continued = false;
  redactOauthLog(req as never, {} as never, () => {
    continued = true;
  });
  assert.equal(continued, true);
  assert.equal(req.originalUrl, "/custom/marketing-oauth/pinterest");
  assert.equal(req.headers.referer, "[redacted]");
  assert.equal(req.query.code, "sensitive-code");
});

test("Facebook Login verifies user/app permissions and exposes only accessible Instagram targets", () =>
  configured(async () => {
    Object.assign(process.env, {
      MARKETING_INSTAGRAM_LOGIN_METHOD: "facebook",
      MARKETING_FACEBOOK_CLIENT_ID: "123",
      MARKETING_FACEBOOK_CLIENT_SECRET: "fixture-secret",
      MARKETING_FACEBOOK_LOGIN_CONFIG_ID: "456",
    });
    const url = new URL(authorizationUrl("instagram", "fixture-state"));
    assert.equal(url.origin, "https://www.facebook.com");
    assert.equal(url.searchParams.get("config_id"), "456");
    assert.equal(
      url.searchParams.get("override_default_response_type"),
      "true",
    );
    assert.equal(url.searchParams.has("client_secret"), false);
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const u = new URL(String(input));
      calls.push(u.href);
      if (u.pathname.endsWith("oauth/access_token"))
        return json({
          access_token: "fixture-facebook",
          expires_in: 60 * 86400,
        });
      if (u.pathname.endsWith("debug_token"))
        return json({
          data: {
            is_valid: true,
            app_id: "123",
            type: "USER",
            user_id: "789",
            scopes: facebookScopes,
            expires_at: Math.floor(Date.now() / 1000) + 86400,
            data_access_expires_at: Math.floor(Date.now() / 1000) + 7200,
          },
        });
      if (u.pathname.endsWith("me")) return json({ id: "789" });
      if (u.pathname.endsWith("me/accounts"))
        return json({
          data: [
            {
              id: "111",
              name: "Smartwerk",
              tasks: ["CREATE_CONTENT"],
              instagram_business_account: { id: "222", username: "lightworks" },
              access_token: "never-return-this",
            },
            {
              id: "333",
              name: "No permission",
              tasks: ["ANALYZE"],
              instagram_business_account: { id: "444", username: "other" },
            },
          ],
          paging: {
            next: "https://untrusted.test/?access_token=secret",
            cursors: { after: "opaque-cursor" },
          },
        });
      throw new Error("unexpected request");
    };
    const token = await exchangeCode("instagram", "fixture-code", fetcher);
    assert.equal(token.login_method, "facebook");
    assert.equal(
      (await probeAccount("instagram", token, fetcher)).account_id,
      "789",
    );
    assert.ok(Date.parse(token.expires_at!) < Date.now() + 7300000);
    const targets = await listInstagramTargets(
      token.access_token,
      undefined,
      fetcher,
    );
    assert.deepEqual(targets.targets, [
      {
        id: "222",
        username: "lightworks",
        page_id: "111",
        page_name: "Smartwerk",
      },
    ]);
    assert.equal(JSON.stringify(targets).includes("never-return-this"), false);
    assert.equal(
      (await readInstagramTarget(token.access_token, "111", fetcher)).id,
      "222",
    );
    await assert.rejects(
      readInstagramTarget(token.access_token, "333", fetcher),
      { code: "INSTAGRAM_TARGET_INVALID" },
    );
    assert.ok(calls.every((u) => new URL(u).hostname === "graph.facebook.com"));
    await assert.rejects(refreshToken("instagram", token, fetcher), {
      code: "REAUTH_REQUIRED",
    });
    const invalid: typeof fetch = async (input) =>
      String(input).includes("debug_token")
        ? json({
            data: {
              is_valid: true,
              app_id: "wrong-app",
              type: "USER",
              user_id: "789",
              scopes: facebookScopes,
            },
          })
        : json({ id: "789" });
    await assert.rejects(probeAccount("instagram", token, invalid), {
      code: "ACCOUNT_IDENTITY_CHANGED",
    });
    const missing: typeof fetch = async (input) =>
      String(input).includes("debug_token")
        ? json({
            data: {
              is_valid: true,
              app_id: "123",
              type: "USER",
              user_id: "789",
              scopes: ["instagram_basic"],
            },
          })
        : json({ id: "789" });
    await assert.rejects(probeAccount("instagram", token, missing), {
      code: "ACCOUNT_PERMISSIONS_MISSING",
    });
  }));
