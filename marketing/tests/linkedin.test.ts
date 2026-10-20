import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { publishLinkedin, linkedinRequest } from "../lib/marketing/linkedin-provider";
import { ProviderError } from "../lib/marketing/providers";
import { contentSchema, validateReady, type Media } from "../lib/marketing/schema";
import { linkedinAuthor, linkedinPost, linkedinScopes } from "../lib/marketing/linkedin-contract";
import { linkedinTargets, verifyLinkedinTarget } from "../lib/marketing/linkedin-identity";
import { authorizationUrl, exchangeCode, refreshToken, AccountError } from "../lib/marketing/account-provider";

const bytes = Buffer.from("immutable image bytes");
const checksum = createHash("sha256").update(bytes).digest("hex");
const image = "urn:li:image:ABC_123";
const author = "urn:li:organization:123";
const postId = "urn:li:share:1234567890";
const media = { id: "m1", mime_type: "image/jpeg", url: "https://media.example.test/image.jpeg", size: bytes.length, checksum, width: 1200, height: 630 } as Media;
const version = contentSchema.parse({ topic: "Smartwerk", versions: [{ channel: "linkedin", media_id: "m1", text: "Euer Team. Eure Prozesse.", alt: "Team" }] }).versions[0];
const credential = { token: "secret-bearer", target: author, channel: "linkedin", apiVersion: "202608", destination: author, source: "oauth" } as const;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function fixture(overrides: { status?: string; statusHTTP?: number; upload?: number; post?: number; missingId?: boolean; timeout?: boolean; url?: string; read?: Buffer } = {}) {
  const events: string[] = [], requests: {url: string; init: RequestInit}[] = [];
  const fetcher = (async (raw: string | URL, init: RequestInit) => {
    const url = String(raw); requests.push({url, init});
    if (url.includes("initializeUpload")) { events.push("initialize"); return json({ value: { image, uploadUrl: overrides.url || "https://www.linkedin.com/dms-uploads/abc/uploaded-image/0?sig=secret" } }); }
    if (init.method === "PUT") { events.push("upload"); return new Response(null, {status: overrides.upload || 201}); }
    if (url.includes("/rest/images/")) { events.push("status"); if (overrides.statusHTTP) return new Response(null,{status:overrides.statusHTTP}); return json({ status: overrides.status || "AVAILABLE", owner: author }); }
    events.push("post");
    if (overrides.timeout) throw new Error("secret token must never be logged");
    return new Response(null, { status: overrides.post || 201, headers: overrides.missingId ? {} : {"x-restli-id": postId} });
  }) as typeof fetch;
  return { events, requests, hooks: { credential, container: async (id: string) => { assert.equal(id, image); events.push("persist"); }, beforePublish: async () => { events.push("dispatch"); } }, io: {fetch: fetcher, read: async () => overrides.read || bytes, sleep: async () => {}} };
}
test("LinkedIn uploads immutable bytes, persists image URN, waits, dispatches and reads the post ID from an empty 201 response", async () => {
  const f = fixture();
  assert.equal(await publishLinkedin(version, media, f.hooks, f.io), postId);
  assert.deepEqual(f.events, ["initialize", "persist", "upload", "status", "dispatch", "post"]);
  assert.equal(new Headers(f.requests[0].init.headers).get("Linkedin-Version"), "202608");
  assert.equal(new Headers(f.requests[0].init.headers).get("X-Restli-Protocol-Version"), "2.0.0");
  const body = JSON.parse(String(f.requests.at(-1)!.init.body));
  assert.equal(body.author, author); assert.equal(body.content.media.id, image);
});
test("LinkedIn upload failure, processing failure and timeout never send a post", async () => {
  for (const override of [{upload: 400}, {statusHTTP: 403}, {status: "PROCESSING_FAILED"}, {status: "PROCESSING"}]) {
    const f = fixture(override);
    await assert.rejects(publishLinkedin(version, media, f.hooks, f.io), e => e instanceof ProviderError && !e.uncertain);
    assert.ok(!f.events.includes("post"));
  }
});
test("LinkedIn rejects foreign upload origins and changed approved media", async () => {
  for (const override of [{url: "https://attacker.test/dms-uploads/abc"}, {url: "https://www.linkedin.com.evil.test/dms-uploads/abc"}, {read: Buffer.from("changed")}]) {
    const f = fixture(override);
    await assert.rejects(publishLinkedin(version, media, f.hooks, f.io), e => e instanceof ProviderError && !e.uncertain);
    assert.ok(!f.events.includes("upload")); assert.ok(!f.events.includes("post"));
  }
});
test("LinkedIn revocation during upload prevents publication", async () => {
  const f = fixture();
  f.hooks.beforePublish = async () => { throw new ProviderError("PAUSED_OR_APPROVAL_REVOKED", false); };
  await assert.rejects(publishLinkedin(version, media, f.hooks, f.io), /PAUSED_OR_APPROVAL_REVOKED/);
  assert.ok(!f.events.includes("post"));
});
test("LinkedIn ambiguous post delivery and missing post ID are uncertain; explicit permission refusal is definitive", async () => {
  for (const override of [{timeout: true}, {missingId: true}, {post: 503}]) {
    const f = fixture(override);
    await assert.rejects(publishLinkedin(version, media, f.hooks, f.io), e => e instanceof ProviderError && e.uncertain);
    assert.equal(f.events.filter(e => e === "post").length, 1);
  }
  const f = fixture({post: 403});
  await assert.rejects(publishLinkedin(version, media, f.hooks, f.io), e => e instanceof ProviderError && !e.uncertain);
});
test("HTTP adapter accepts empty 204 and keeps provider errors free of secrets", async () => {
  assert.equal((await linkedinRequest("https://api.linkedin.com/rest/test", {}, false, (async () => new Response(null, {status: 204})) as typeof fetch)).status, 204);
  await assert.rejects(linkedinRequest("https://api.linkedin.com/rest/test", {}, false, (async () => { throw new Error("secret"); }) as typeof fetch), e => e instanceof ProviderError && e.message === "LINKEDIN_NETWORK_OR_TIMEOUT");
});
test("LinkedIn contract permits four distinct channels and enforces channel-specific text/media limits", () => {
  assert.ok(contentSchema.safeParse({topic:"four", versions: ["linkedin", "instagram", "pinterest", "facebook"].map(channel => ({channel}))}).success);
  assert.ok(contentSchema.safeParse({topic:"long", versions:[{channel:"linkedin", text:"x".repeat(3000)}]}).success);
  assert.ok(!contentSchema.safeParse({topic:"long", versions:[{channel:"instagram", text:"x".repeat(2201)}]}).success);
  assert.ok(!contentSchema.safeParse({topic:"long", versions:[{channel:"linkedin", text:"x".repeat(3001)}]}).success);
  assert.ok(!contentSchema.safeParse({topic:"link", versions:[{...version, link:"https://example.test"}]}).success);
  const post = {content: {topic:"image", versions:[version]}} as any;
  validateReady(post, {m1:media});
  for (const m of [{...media,mime_type:"video/mp4"}, {...media,mime_type:"image/webp"}, {...media,width:10000,height:10000}]) assert.throws(() => validateReady(post, {m1:m}));
  assert.ok(linkedinAuthor.safeParse("urn:li:person:abc_123").success);
  assert.ok(!linkedinAuthor.safeParse("urn:li:organization:attacker").success);
  assert.ok(linkedinPost.safeParse(postId).success);
});
test("LinkedIn OAuth uses space-delimited scopes, exact callback and explicit reconnect", async () => {
  const old = {...process.env};
  Object.assign(process.env, { MARKETING_PUBLIC_URL:"https://admin.example.test", MARKETING_LINKEDIN_CLIENT_ID:"app", MARKETING_LINKEDIN_CLIENT_SECRET:"secret", MARKETING_LINKEDIN_API_VERSION:"202608", MARKETING_LINKEDIN_AUTHOR_TYPE:"both" });
  try {
    const url = new URL(authorizationUrl("linkedin", "state"));
    assert.equal(url.origin, "https://www.linkedin.com");
    assert.equal(url.searchParams.get("redirect_uri"), "https://admin.example.test/custom/marketing-oauth/linkedin");
    assert.ok(url.searchParams.get("scope")!.includes("w_member_social w_organization_social"));
    const fetcher = (async () => json({access_token:"token", expires_in:3600, scope: linkedinScopes().join(" ")})) as typeof fetch;
    const tokens = await exchangeCode("linkedin", "code", fetcher);
    assert.equal(tokens.access_token, "token");
    await assert.rejects(refreshToken("linkedin", tokens), /Kontoanbindung/);
    await assert.rejects(exchangeCode("linkedin", "code", (async () => json({access_token:"token", expires_in:3600})) as typeof fetch), e => e instanceof AccountError && e.code === "ACCOUNT_PERMISSIONS_MISSING");
    const api = (async (raw: string | URL) => String(raw).includes("userinfo") ? json({sub:"member", name:"Team"}) : json({elements:[
      {roleAssignee:"urn:li:person:member", organization:author, state:"APPROVED", role:"CONTENT_ADMINISTRATOR"},
      {roleAssignee:"urn:li:person:member", organization:"urn:li:organization:456", state:"REVOKED", role:"ADMINISTRATOR"},
      {roleAssignee:"urn:li:person:other", organization:"urn:li:organization:789", state:"APPROVED", role:"ADMINISTRATOR"},
    ]})) as typeof fetch;
    assert.deepEqual((await linkedinTargets(tokens, api)).targets.map(t => t.id), ["urn:li:person:member",author]);
    await assert.rejects(verifyLinkedinTarget(tokens, "urn:li:organization:456", api), e => e instanceof AccountError && e.code === "LINKEDIN_ORGANIZATION_ROLE_REQUIRED");
  } finally { for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key]; Object.assign(process.env, old); }
});
