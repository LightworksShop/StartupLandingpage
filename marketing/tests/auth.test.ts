import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, scryptSync } from "node:crypto";
import { adminCredentialVersion, csrfToken, requireHuman, sessionUser, verifyPassword } from "../server/auth";
import { medusaAdapter } from "../adapters/medusa";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

test("sessions reject old users, rotated passwords and legacy logins while preserving current sessions", () => {
  const keys = ["MARKETING_ADMIN_USER", "MARKETING_ADMIN_PASSWORD_HASH", "MARKETING_SESSION_SECRET"];
  const previous = keys.map(key => process.env[key]);
  try {
    Object.assign(process.env, {
      MARKETING_ADMIN_USER: "admin",
      MARKETING_ADMIN_PASSWORD_HASH: "original-salted-password-hash",
      MARKETING_SESSION_SECRET: "session-secret-for-auth-regression",
    });
    const login = () => ({ session: {
      user: process.env.MARKETING_ADMIN_USER,
      credentialVersion: adminCredentialVersion(),
      csrf: "original-csrf",
    } }) as any;
    const authorize = (req: any) => {
      let allowed = false, status = 200;
      requireHuman(req, { status(code: number) { status = code; return this; }, json() {} } as any,
        () => { allowed = true; });
      return { allowed, status };
    };
    const original = login();
    assert.equal(sessionUser(original), "admin");
    assert.deepEqual(authorize(original), { allowed: true, status: 200 });

    process.env.MARKETING_ADMIN_USER = "replacement";
    const staleUser = structuredClone(original);
    assert.deepEqual(authorize(staleUser), { allowed: false, status: 401 });
    assert.equal(staleUser.session.csrf, undefined);
    const renamed = login();
    assert.deepEqual(authorize(renamed), { allowed: true, status: 200 });

    process.env.MARKETING_ADMIN_PASSWORD_HASH = "rotated-salted-password-hash";
    // /session also becomes anonymous, so the UI does not show a stale login.
    assert.equal(sessionUser(renamed), null);
    assert.equal(renamed.session.credentialVersion, undefined);
    assert.notEqual(csrfToken(renamed), "original-csrf");
    assert.deepEqual(authorize(login()), { allowed: true, status: 200 });
    assert.deepEqual(authorize({ session: { user: "replacement" } }), { allowed: false, status: 401 });
    const anonymous = { session: { csrf: "login-csrf" } } as any;
    assert.equal(sessionUser(anonymous), null);
    assert.equal(csrfToken(anonymous), "login-csrf");
    const current = login();
    delete process.env.MARKETING_ADMIN_PASSWORD_HASH;
    assert.deepEqual(authorize(current), { allowed: false, status: 401 });
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

test("personal passwords use salted scrypt and fail closed for malformed/oversized inputs", async () => {
  const salt = randomBytes(16).toString("hex");
  const password = "a-long-test-password";
  const encoded = `scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`;
  assert.equal(await verifyPassword(password,encoded),true);
  assert.equal(await verifyPassword("wrong",encoded),false);
  assert.equal(await verifyPassword(password,"invalid"),false);
  assert.equal(await verifyPassword("x".repeat(257),encoded),false);
});
test("password setup CLI produces a usable hash without echoing the supplied password", async () => {
  const password = "long-cli-test-password";
  const cli = spawnSync(process.execPath,[join(__dirname,"../scripts/password.mjs")],{input:`${password}\n`,encoding:"utf8"});
  assert.equal(cli.status,0);
  assert.equal(cli.stdout.includes(password),false);
  assert.equal(await verifyPassword(password,cli.stdout.trim()),true);
});
test("Medusa adapter preserves human/agent boundary and resolves explicit host services", async () => {
  let resolved = false;
  const host = { db:{}, storage:{}, logger:{error(){}} } as any;
  const adapter = medusaAdapter(() => { resolved = true; return host; });
  let status = 0;
  const response = { setHeader(){}, status(code:number){status=code;return this;}, json(){return this;} } as any;
  await adapter.admin({scope:{},auth_context:{actor_type:"user",actor_id:"machine",auth_identity_id:"api-key"}} as any,response,"approve");
  assert.equal(resolved,true);
  assert.equal(status,403);
  const previous = process.env.MARKETING_AGENT_TOKEN;
  process.env.MARKETING_AGENT_TOKEN = "test-agent-token-".repeat(3);
  try {
    await adapter.agent({scope:{},headers:{"x-marketing-agent-token":process.env.MARKETING_AGENT_TOKEN}} as any,response,"approve");
    assert.equal(status,403);
  } finally { if (previous === undefined) delete process.env.MARKETING_AGENT_TOKEN; else process.env.MARKETING_AGENT_TOKEN=previous; }
});
