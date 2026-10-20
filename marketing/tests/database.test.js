// These tests create/drop the seven marketing tables. Only a disposable *_test database is accepted.
if (process.env.MARKETING_TEST_DATABASE_URL && !new URL(process.env.MARKETING_TEST_DATABASE_URL).pathname.endsWith("_test")) throw new Error("Use a disposable database whose name ends in _test.");
const assert = require("node:assert/strict");
const test = require("node:test");
const knex = require("knex");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
class SqlMigration {
  constructor() {}
  async up() { this.addSql(readFileSync(join(__dirname, "../migrations", this.file), "utf8")); }
  async down() { for (const table of this.tables) this.addSql(`drop table if exists ${table}`); }
}
class Migration20261006120000 extends SqlMigration {}
Migration20261006120000.prototype.file = "001-marketing.sql";
Migration20261006120000.prototype.tables = ["marketing_audit", "marketing_publication", "marketing_settings", "marketing_media", "marketing_post"];
class Migration20261006180000 extends SqlMigration {}
Migration20261006180000.prototype.file = "002-accounts.sql";
Migration20261006180000.prototype.tables = ["marketing_oauth_state", "marketing_account"];
const {
  saveDraft,
  settings,
  saveSettings,
  approvePost,
  getPost,
  postVersions,
  withPostStates,
  revokePost,
  rows,
} = require("../lib/marketing/repository");
const {
  claim,
  dispatchDue,
  reconcile,
} = require("../lib/marketing/publishing");
const { contentSchema } = require("../lib/marketing/schema");
const { blankDesign } = require("../lib/marketing/design-model");

test(
  "real PostgreSQL: migration, competing editors, approval invalidation, concurrent claims, pause, uncertain outcome and due queue progress",
  { skip: !process.env.MARKETING_TEST_DATABASE_URL },
  async () => {
    const db = knex({
      client: "pg",
      connection: process.env.MARKETING_TEST_DATABASE_URL,
      pool: { min: 0, max: 10 },
    });
    const queries = [];
    const migration = Object.create(Migration20261006120000.prototype);
    migration.addSql = (sql) => queries.push(sql);
    const originalEnv = { ...process.env },
      originalFetch = global.fetch;
    try {
      await migration.up();
      const accountMigration = Object.create(Migration20261006180000.prototype);
      accountMigration.addSql = (sql) => queries.push(sql);
      await accountMigration.up();
      for (const sql of queries) await db.raw(sql);
      const content = contentSchema.parse({
        topic: "Werkstatt",
        versions: [
          {
            channel: "pinterest",
            title: "Werkstatt",
            text: "Ein Blick",
            alt: "Werkbank",
            media_id: "m",
          },
        ],
      });
      const media = {
        id: "m",
        name: "Foto",
        url: "https://media.example.test/a.jpg",
        file_id: "f",
        mime_type: "image/jpeg",
        width: 1000,
        height: 1500,
        size: 1000,
        checksum: "fixture",
        tags: [],
        product_ids: [],
        generated: false,
        provenance: "",
        source: "upload",
      };
      const validate = async () => ({
        media: { m: media },
        targets: { pinterest: "board" },
      });
      const create = () =>
        saveDraft(
          db,
          { content, scheduled_at: "2020-01-01T12:00:00Z" },
          "agent",
        );
      let post = await create();
      await approvePost(db, post.id, 1, "human", validate);
      const edits = await Promise.allSettled([
        saveDraft(
          db,
          {
            id: post.id,
            revision: 1,
            content: { ...content, topic: "A" },
            scheduled_at: null,
          },
          "agent",
        ),
        saveDraft(
          db,
          {
            id: post.id,
            revision: 1,
            content: { ...content, topic: "B" },
            scheduled_at: null,
          },
          "human",
        ),
      ]);
      assert.equal(edits.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal((await getPost(db, post.id)).approved, null);
      const snapshots = await postVersions(db, await getPost(db, post.id));
      assert.deepEqual(
        snapshots.map((v) => v.revision),
        [2, 1],
      );
      assert.equal(snapshots[1].content.topic, "Werkstatt");
      assert.equal(snapshots[1].scheduled_at, "2020-01-01T12:00:00.000Z");
      assert.notEqual(snapshots[0].content.topic, snapshots[1].content.topic);
      assert.equal(
        (await withPostStates(db, [await getPost(db, post.id)]))[0].editable,
        true,
      );
      const restored = await saveDraft(
        db,
        {
          id: post.id,
          revision: 2,
          content: snapshots[1].content,
          scheduled_at: snapshots[1].scheduled_at,
        },
        "human",
      );
      assert.equal(restored.revision, 3);
      assert.equal(restored.approved, null);
      assert.deepEqual(
        (await postVersions(db, restored)).map((v) => v.revision),
        [3, 2, 1],
      );

      await assert.rejects(
        () => approvePost(db, post.id, 1, "human", validate),
        /Veralteter/,
      );
      post = await create();
      await approvePost(db, post.id, 1, "human", validate);
      assert.equal(await claim(db, post.id, "pinterest"), null); // initially paused
      let config = await settings(db);
      await saveSettings(
        db,
        { ...config.value, paused: false },
        config.revision,
        "human",
      );
      const claims = await Promise.all(
        Array.from({ length: 20 }, () => claim(db, post.id, "pinterest")),
      );
      assert.equal(claims.filter(Boolean).length, 1);
      assert.equal(
        (
          await rows(
            db,
            "select * from marketing_publication where post_id=?",
            [post.id],
          )
        ).length,
        1,
      );
      await assert.rejects(
        () =>
          saveDraft(
            db,
            { id: post.id, revision: 1, content, scheduled_at: null },
            "agent",
          ),
        /Versand bereits/,
      );
      await revokePost(db, post.id, 1, "human");
      assert.equal((await getPost(db, post.id)).approved, null);
      Object.assign(process.env, {
        MARKETING_PUBLISH_ENABLED: "true",
        MARKETING_PINTEREST_TOKEN: "fixture",
        MARKETING_PINTEREST_BOARD_ID: "board",
      });
      const scope = { db };
      const ambiguous = await create();
      await approvePost(db, ambiguous.id, 1, "human", validate);
      let calls = 0;
      global.fetch = async () => {
        calls++;
        throw new Error("socket reset after platform accepted");
      };
      await dispatchDue(scope);
      await dispatchDue(scope);
      assert.equal(calls, 1);
      const [unknown] = await rows(
        db,
        "select * from marketing_publication where post_id=?",
        [ambiguous.id],
      );
      assert.equal(unknown.state, "unknown");
      await assert.rejects(
        () =>
          reconcile(db, unknown.id, "human", {
            action: "retry",
            note: "Checked remote",
          }),
        /Unklarer/,
      );
      await reconcile(db, unknown.id, "human", {
        action: "published",
        remote_id: "remote1",
        note: "Verified in platform history",
      });
      // Already-published oldest posts must not starve newer due posts.
      for (let i = 0; i < 101; i++) {
        const p = await create();
        await approvePost(db, p.id, 1, "human", validate);
        await db.raw(
          "insert into marketing_publication (id,post_id,channel,state,value) values (?,?,'pinterest','published','{}')",
          [`old_${i}`, p.id],
        );
      }
      const last = await create();
      await approvePost(db, last.id, 1, "human", validate);
      global.fetch = async () => {
        calls++;
        return new Response(JSON.stringify({ id: "newpin" }), { status: 201 });
      };
      await dispatchDue(scope);
      assert.equal(
        (
          await rows(
            db,
            "select * from marketing_publication where post_id=?",
            [last.id],
          )
        )[0].state,
        "published",
      );
      assert.equal(calls, 2);
      assert.ok(
        (
          await rows(
            db,
            "select * from marketing_audit where action='publication.published'",
          )
        ).length,
      );
      // A human pause while Instagram processes a container prevents the publish call.
      Object.assign(process.env, {
        MARKETING_INSTAGRAM_TOKEN: "fixture",
        MARKETING_INSTAGRAM_USER_ID: "account",
        MARKETING_META_API_VERSION: "v25.0",
      });
      const igContent = contentSchema.parse({
        topic: "Pause test",
        versions: [
          {
            channel: "instagram",
            text: "Werkstatt",
            alt: "Werkbank",
            media_id: "m",
          },
        ],
      });
      const igPost = await saveDraft(
        db,
        { content: igContent, scheduled_at: "2020-01-01T12:00:00Z" },
        "agent",
      );
      await approvePost(db, igPost.id, 1, "human", async () => ({
        media: { m: { ...media, width: 1080, height: 1080 } },
        targets: { instagram: "account" },
      }));
      const igCalls = [];
      global.fetch = async (url) => {
        igCalls.push(String(url));
        if (String(url).includes("status_code")) {
          const current = await settings(db);
          await saveSettings(
            db,
            { ...current.value, paused: true },
            current.revision,
            "human",
          );
          return new Response(JSON.stringify({ status_code: "FINISHED" }));
        }
        return new Response(JSON.stringify({ id: "container" }));
      };
      await dispatchDue(scope);
      assert.equal(
        igCalls.some((url) => url.endsWith("media_publish")),
        false,
      );
      const [pausedPublication] = await rows(
        db,
        "select * from marketing_publication where post_id=?",
        [igPost.id],
      );
      assert.equal(pausedPublication.state, "failed");
      assert.equal(pausedPublication.value.error, "PAUSED_OR_APPROVAL_REVOKED");
      // Additive JSON settings and the product usage join use the real PostgreSQL contract.
      const currentSettings = await settings(db);
      const composition = {
        ...blankDesign(),
        product_id: "direct",
        image_url: "https://media.example.test/map.png",
        template: "caption",
        rotation: 25,
        subtitle: "Ort",
        cta: "Entdecken",
        overlay: { ...blankDesign().overlay, media_id: "m" },
      };
      await saveSettings(
        db,
        {
          ...currentSettings.value,
          media_folders: ["Werkstatt"],
          design_drafts: [
            {
              id: "design_test",
              name: "Test",
              composition,
              is_template: true,
              versions: [
                {
                  id: "version_test",
                  saved_at: "2026-10-07T12:00:00.000Z",
                  composition: { ...composition, rotation: 0 },
                },
              ],
            },
          ],
        },
        currentSettings.revision,
        "human",
      );
      assert.equal(
        (await settings(db)).value.design_drafts[0].composition.subtitle,
        "Ort",
      );
      const savedDesign = (await settings(db)).value.design_drafts[0];
      assert.equal(savedDesign.composition.rotation, 25);
      assert.equal(savedDesign.composition.overlay.media_id, "m");
      assert.equal(savedDesign.is_template, true);
      assert.equal(savedDesign.versions[0].composition.rotation, 0);
      await assert.rejects(
        () =>
          saveSettings(
            db,
            currentSettings.value,
            currentSettings.revision,
            "human",
          ),
        (e) => e.status === 409,
      );
      assert.deepEqual(
        (await settings(db)).value.design_drafts[0],
        savedDesign,
      );
      const usagePost = await saveDraft(
        db,
        {
          content: { ...content, product_ids: ["direct"] },
          scheduled_at: null,
        },
        "human",
      );
      await db.raw("update marketing_post set approved=?::jsonb where id=?", [
        JSON.stringify({ media: { m: { product_ids: ["linked"] } } }),
        usagePost.id,
      ]);
      await db.raw(
        "insert into marketing_publication (id,post_id,channel,state,value) values (?,?,?,'published',?::jsonb)",
        [
          "usage_test",
          usagePost.id,
          "pinterest",
          JSON.stringify({ published_at: "2026-10-06T12:00:00Z" }),
        ],
      );
      const { handle } = require("../lib/marketing/http");
      let response,
        status = 200;
      const res = {
        setHeader() {},
        status(code) {
          status = code;
          return this;
        },
        json(value) {
          response = value;
          return this;
        },
      };
      await handle(
        {
          method: "GET",
          query: {},
          auth_context: { actor_type: "user", actor_id: "admin" },
          scope: { db, logger: { error(message) { throw new Error(message); } }, catalog: async () => ({ products: [{id: "direct"}, {id: "linked"}, {id: "unused"}], count: 3 }) },
        },
        res,
        "products",
      );
      assert.equal(status, 200);
      assert.equal(response.products[0].last_used_at, "2026-10-06T12:00:00Z");
      assert.equal(response.products[1].last_used_at, "2026-10-06T12:00:00Z");
      assert.equal(response.products[2].last_used_at, null);
      const [observed] = await withPostStates(db, [
        await getPost(db, usagePost.id),
      ]);
      assert.equal(observed.editable, false);
      assert.equal(observed.publications[0].state, "published");
      let feedSettings = await settings(db);
      // Legacy social exclusions seed feed exclusions once; subsequent social edits are separate.
      await db.raw(
        "update marketing_settings set value=value - 'feed_exclusions' || ?::jsonb where id='global'",
        [JSON.stringify({ preferences: { direct: "exclude" } })],
      );
      feedSettings = await settings(db);
      assert.deepEqual(feedSettings.value.feed_exclusions, ["direct"]);
      feedSettings = await saveSettings(
        db,
        { ...feedSettings.value, preferences: {} },
        feedSettings.revision,
        "human",
      );
      assert.deepEqual(feedSettings.value.feed_exclusions, ["direct"]);
      feedSettings = await saveSettings(
        db,
        { ...feedSettings.value, feed_exclusions: [] },
        feedSettings.revision,
        "human",
      );
      const { feed_exclusions, ...oldClient } = feedSettings.value;
      feedSettings = await saveSettings(
        db,
        { ...oldClient, preferences: { direct: "exclude" } },
        feedSettings.revision,
        "human",
      );
      assert.deepEqual(feedSettings.value.feed_exclusions, []);

      queries.length = 0;
      await accountMigration.down();
      await migration.down();
      for (const sql of queries) await db.raw(sql);
    } finally {
      global.fetch = originalFetch;
      for (const key of Object.keys(process.env))
        if (!(key in originalEnv)) delete process.env[key];
      Object.assign(process.env, originalEnv);
      await db.destroy();
    }
  },
);

test(
  "real PostgreSQL: OAuth actor/cookie/replay binding, encrypted credentials, target approval invalidation, serialized rotation and durable disconnect",
  { skip: !process.env.MARKETING_TEST_DATABASE_URL },
  async () => {
    const db = knex({
        client: "pg",
        connection: process.env.MARKETING_TEST_DATABASE_URL,
        pool: { min: 0, max: 16 },
      }),
      sql = [],
      env = { ...process.env };
    const migrations = [Migration20261006120000, Migration20261006180000].map(
      (Type) => {
        const m = Object.create(Type.prototype);
        m.addSql = (q) => sql.push(q);
        return m;
      },
    );
    const { accountScopes } = require("../lib/marketing/account-provider");
    const {
      startOauth,
      finishOauth,
      accountRow,
      accountSummaries,
      accountBoards,
      accountInstagramTargets,
      selectInstagramTarget,
      verifyAccount,
      selectBoard,
      disconnectAccount,
      publishingCredential,
      refreshAccount,
      sealTokens,
      openTokens,
    } = require("../lib/marketing/accounts");
    const now = new Date(),
      later = (days) => new Date(now.getTime() + days * 86400000).toISOString();
    const json = (value) => new Response(JSON.stringify(value));
    Object.assign(process.env, {
      MARKETING_INSTAGRAM_LOGIN_METHOD: "instagram",
      MARKETING_PUBLIC_URL: "https://admin.example.test",
      MARKETING_CREDENTIALS_KEY: Buffer.alloc(32, 7).toString("base64"),
      MARKETING_PINTEREST_CLIENT_ID: "fixture-client",
      MARKETING_PINTEREST_CLIENT_SECRET: "fixture-secret",
      MARKETING_META_API_VERSION: "v25.0",
    });
    let calls = 0;
    const fetcher = async (url) => {
      calls++;
      if (String(url).endsWith("oauth/token"))
        return json({
          access_token: "fixture-access",
          refresh_token: "fixture-refresh",
          expires_in: 2592000,
          refresh_token_expires_in: 5184000,
          scope: accountScopes.pinterest.join(" "),
        });
      if (String(url).endsWith("user_account"))
        return json({
          id: "123",
          username: "werkstatt",
          account_type: "BUSINESS",
        });
      if (String(url).includes("/boards?"))
        return json({
          items: [
            { id: "111", name: "Werkstatt", privacy: "PUBLIC" },
            { id: "222", name: "Stadtpläne", privacy: "PUBLIC" },
          ],
          bookmark: null,
        });
      return json({
        id: String(url).split("/").at(-1),
        name: "Stadtpläne",
        privacy: "PUBLIC",
      });
    };
    try {
      for (const m of migrations) await m.up();
      for (const q of sql) await db.raw(q);
      const flow = await startOauth(db, "pinterest", "user:a"),
        state = new URL(flow.url).searchParams.get("state");
      await assert.rejects(
        finishOauth(
          db,
          "pinterest",
          "user:b",
          { state, nonce: flow.nonce, code: "code" },
          fetcher,
        ),
        { code: "OAUTH_STATE_INVALID" },
      );
      await assert.rejects(
        finishOauth(
          db,
          "pinterest",
          "user:a",
          { state, nonce: "wrong", code: "code" },
          fetcher,
        ),
        { code: "OAUTH_STATE_INVALID" },
      );
      assert.equal(calls, 0);
      await finishOauth(
        db,
        "pinterest",
        "user:a",
        { state, nonce: flow.nonce, code: "code" },
        fetcher,
      );
      await assert.rejects(
        finishOauth(
          db,
          "pinterest",
          "user:a",
          { state, nonce: flow.nonce, code: "code" },
          fetcher,
        ),
        { code: "OAUTH_STATE_INVALID" },
      );
      let row = await accountRow(db, "pinterest");
      assert.equal(row.value.state, "needs_target");
      assert.ok(!row.encrypted.includes("fixture-access"));
      const summary = JSON.stringify(await accountSummaries(db));
      for (const secret of [
        "fixture-access",
        "fixture-refresh",
        row.encrypted,
        "fixture-secret",
      ])
        assert.equal(summary.includes(secret), false);
      assert.equal(
        (await accountBoards(db, undefined, fetcher)).boards.length,
        2,
      );
      await selectBoard(db, row.revision, "111", "user:a", fetcher);
      const media = {
        id: "m",
        ...{
          name: "Werkbank",
          tags: [],
          product_ids: [],
          generated: false,
          provenance: "",
          mime_type: "image/jpeg",
          width: 1000,
          height: 1500,
          size: 1000,
          source: "upload",
          url: "https://media.example.test/a.jpg",
          checksum: "test",
          file_id: "f",
        },
      };
      const post = await saveDraft(
        db,
        {
          content: {
            topic: "Werkstatt",
            versions: [
              {
                channel: "pinterest",
                title: "Titel",
                text: "Beitrag",
                alt: "Werkbank",
                media_id: "m",
              },
            ],
          },
          scheduled_at: null,
        },
        "user:a",
      );
      const approve = () =>
        approvePost(db, post.id, 1, "user:a", async () => ({
          media: { m: media },
          targets: {
            pinterest: (await publishingCredential(db, "pinterest", false))
              .destination,
          },
        }));
      await approve();
      row = await accountRow(db, "pinterest");
      await selectBoard(db, row.revision, "222", "user:a", fetcher);
      assert.equal((await getPost(db, post.id)).approved, null);
      await approve();
      row = await accountRow(db, "pinterest");
      const tokens = {
        ...openTokens("pinterest", row.encrypted),
        expires_at: later(2),
        issued_at: later(-3),
      };
      await db.raw(
        "update marketing_account set encrypted=?,value=value||?::jsonb where id='pinterest'",
        [
          sealTokens("pinterest", tokens),
          JSON.stringify({ expires_at: tokens.expires_at }),
        ],
      );
      calls = 0;
      await Promise.all(
        Array.from({ length: 12 }, () =>
          refreshAccount(db, "pinterest", "scheduler", false, fetcher, now),
        ),
      );
      assert.equal(calls, 1);
      assert.ok((await getPost(db, post.id)).approved);
      row = await accountRow(db, "pinterest");
      await assert.rejects(
        disconnectAccount(db, "pinterest", row.revision - 1, "user:a"),
        { code: "ACCOUNT_CHANGED" },
      );
      await disconnectAccount(db, "pinterest", row.revision, "user:a");
      assert.equal((await accountRow(db, "pinterest")).encrypted, null);
      assert.equal((await getPost(db, post.id)).approved, null);
      process.env.MARKETING_PINTEREST_TOKEN = "legacy-fixture";
      process.env.MARKETING_PINTEREST_BOARD_ID = "222";
      await assert.rejects(publishingCredential(db, "pinterest"), {
        code: "ACCOUNT_NOT_READY",
      });
      assert.equal((await settings(db)).value.paused, true);
      // An OAuth response already in flight cannot resurrect a disconnected account.
      const race = await startOauth(db, "pinterest", "user:a");
      let disconnected = false;
      const raceFetcher = async (url) => {
        if (!disconnected) {
          disconnected = true;
          const current = await accountRow(db, "pinterest");
          await disconnectAccount(db, "pinterest", current.revision, "user:a");
        }
        return fetcher(url);
      };
      await assert.rejects(
        finishOauth(
          db,
          "pinterest",
          "user:a",
          {
            state: new URL(race.url).searchParams.get("state"),
            nonce: race.nonce,
            code: "code",
          },
          raceFetcher,
        ),
        { code: "ACCOUNT_CHANGED" },
      );
      assert.equal(
        (await accountRow(db, "pinterest")).value.state,
        "disconnected",
      );
      Object.assign(process.env, {
        MARKETING_INSTAGRAM_LOGIN_METHOD: "facebook",
        MARKETING_FACEBOOK_CLIENT_ID: "123",
        MARKETING_FACEBOOK_CLIENT_SECRET: "fixture-secret",
        MARKETING_FACEBOOK_LOGIN_CONFIG_ID: "456",
      });
      const {
        facebookScopes,
      } = require("../lib/marketing/account-provider");
      let linkedId = "222";
      const fbFetch = async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("oauth/access_token"))
          return json({
            access_token: "fixture-facebook-token",
            expires_in: 60 * 86400,
          });
        if (url.pathname.endsWith("debug_token"))
          return json({
            data: {
              is_valid: true,
              app_id: "123",
              type: "USER",
              user_id: "789",
              scopes: facebookScopes,
              expires_at: Math.floor(Date.now() / 1000) + 60 * 86400,
            },
          });
        if (url.pathname.endsWith("me")) return json({ id: "789" });
        if (url.pathname.endsWith("me/accounts"))
          return json({
            data: [
              {
                id: "111",
                name: "Lightworks",
                tasks: ["CREATE_CONTENT"],
                instagram_business_account: {
                  id: linkedId,
                  username: "lightworks",
                },
              },
            ],
          });
        throw new Error("Unexpected Facebook request");
      };
      const fbFlow = await startOauth(db, "instagram", "user:a");
      const fbInput = {
        state: new URL(fbFlow.url).searchParams.get("state"),
        nonce: fbFlow.nonce,
        code: "fixture-code",
      };
      // A login configuration change invalidates its pending state.
      process.env.MARKETING_FACEBOOK_LOGIN_CONFIG_ID = "999";
      await assert.rejects(
        finishOauth(db, "instagram", "user:a", fbInput, fbFetch),
        { code: "OAUTH_STATE_INVALID" },
      );
      process.env.MARKETING_FACEBOOK_LOGIN_CONFIG_ID = "456";
      await finishOauth(db, "instagram", "user:a", fbInput, fbFetch);
      let ig = await accountRow(db, "instagram");
      assert.equal(ig.value.state, "needs_target");
      assert.equal(ig.encrypted.includes("fixture-facebook-token"), false);
      assert.equal(
        (await accountInstagramTargets(db, undefined, fbFetch)).targets[0]
          .page_id,
        "111",
      );
      await selectInstagramTarget(db, ig.revision, "111", "user:a", fbFetch);
      ig = await accountRow(db, "instagram");
      assert.equal(ig.value.target_id, "222");
      assert.equal(
        (await publishingCredential(db, "instagram", true, fbFetch))
          .destination,
        "facebook/789/111/222",
      );
      await verifyAccount(db, "instagram", ig.revision, "user:a", fbFetch);
      linkedId = "333";
      await assert.rejects(
        publishingCredential(db, "instagram", false, fbFetch),
        { code: "ACCOUNT_IDENTITY_CHANGED" },
      );
      ig = await accountRow(db, "instagram");
      await assert.rejects(
        verifyAccount(db, "instagram", ig.revision, "user:a", fbFetch),
        { code: "ACCOUNT_IDENTITY_CHANGED" },
      );
      await disconnectAccount(db, "instagram", ig.revision, "user:a");
      await assert.rejects(
        publishingCredential(db, "instagram", false, fbFetch),
        { code: "ACCOUNT_NOT_READY" },
      );
      const audits = await rows(db, "select value from marketing_audit");
      assert.equal(JSON.stringify(audits).includes("fixture-access"), false);
    } finally {
      sql.length = 0;
      for (const m of [...migrations].reverse()) await m.down();
      for (const q of sql) await db.raw(q);
      for (const key of Object.keys(process.env))
        if (!(key in env)) delete process.env[key];
      Object.assign(process.env, env);
      await db.destroy();
    }
  },
);

test(
  "real PostgreSQL: scoped agent designs/versions and brand edits preserve pause/settings, reject stale writes and never authorize publication",
  { skip: !process.env.MARKETING_TEST_DATABASE_URL },
  async () => {
    const db = knex({
      client: "pg",
      connection: process.env.MARKETING_TEST_DATABASE_URL,
      pool: { min: 0, max: 4 },
    });
    const sql = [],
      migration = Object.create(Migration20261006120000.prototype);
    migration.addSql = (q) => sql.push(q);
    const {
      saveDesign,
      saveBrand,
    } = require("../lib/marketing/design-api");
    const { makeObject } = require("../lib/marketing/design-model");
    try {
      await migration.up();
      for (const q of sql) await db.raw(q);
      const original = await settings(db);
      const composition = {
        ...blankDesign(),
        objects: [makeObject("text", "headline", { text: "Werkstatt" })],
      };
      const first = await saveDesign(
        db,
        {
          revision: original.revision,
          name: "Werkstatt",
          composition,
          is_template: true,
        },
        "agent:editorial",
      );
      assert.equal(first.design.versions.length, 1);
      const results = await Promise.allSettled([
        saveDesign(
          db,
          {
            revision: first.revision,
            id: first.design.id,
            composition: {
              ...composition,
              objects: [makeObject("text", "headline", { text: "A" })],
            },
          },
          "agent:editorial",
        ),
        saveDesign(
          db,
          {
            revision: first.revision,
            id: first.design.id,
            composition: {
              ...composition,
              objects: [makeObject("text", "headline", { text: "B" })],
            },
          },
          "agent:editorial",
        ),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        results.find((r) => r.status === "rejected").reason.status,
        409,
      );
      let row = await settings(db);
      const design = row.value.design_drafts[0];
      assert.equal(design.versions.length, 2);
      const restored = await saveDesign(
        db,
        {
          revision: row.revision,
          id: design.id,
          action: "restore",
          version_id: design.versions[0].id,
        },
        "agent:editorial",
      );
      assert.equal(restored.design.composition.objects[0].text, "Werkstatt");
      assert.equal(restored.design.versions.length, 3);
      const branded = await saveBrand(
        db,
        {
          revision: restored.revision,
          brand: {
            logos: [],
            text_styles: [
              {
                name: "Titel",
                font: "sans",
                size: 44,
                weight: "bold",
                color: "#1f2937",
              },
            ],
          },
        },
        "agent:editorial",
      );
      row = await settings(db);
      assert.equal(row.value.paused, original.value.paused);
      assert.deepEqual(row.value.slots, original.value.slots);
      assert.equal(row.value.design_drafts[0].versions.length, 3);
      await assert.rejects(
        saveDesign(
          db,
          { revision: row.revision, composition, paused: false },
          "agent:editorial",
        ),
      );
      await assert.rejects(
        saveBrand(
          db,
          {
            revision: row.revision,
            brand: { logos: [], text_styles: [] },
            preferences: {},
          },
          "agent:editorial",
        ),
      );
      const deleted = await saveDesign(
        db,
        { revision: branded.revision, id: design.id, action: "delete" },
        "agent:editorial",
      );
      assert.equal(deleted.design, null);
      row = await settings(db);
      assert.equal(row.value.brand.text_styles.length, 1);
      assert.equal(row.value.design_drafts.length, 0);
      const posts = await rows(db, "select * from marketing_post");
      assert.equal(posts.length, 0);
      const audits = await rows(db, "select action from marketing_audit");
      assert.ok(audits.some((a) => a.action === "design.restore"));
      assert.ok(!audits.some((a) => a.action.includes("approve")));
    } finally {
      sql.length = 0;
      await migration.down();
      for (const q of sql) await db.raw(q);
      await db.destroy();
    }
  },
);

test(
  "real agent HTTP flow: discover, save, preview, partial multi-page export through host storage adapter and calendar draft",
  { skip: !process.env.MARKETING_TEST_DATABASE_URL },
  async () => {
    const db = knex({
      client: "pg",
      connection: process.env.MARKETING_TEST_DATABASE_URL,
      pool: { min: 0, max: 4 },
    });
    const { handle } = require("../lib/marketing/http");
    const { makeObject } = require("../lib/marketing/design-model");
    const sharp = require("sharp"), fileBytes = [];
    const scope = { db, logger: { error() {} }, storage: {
      async put(bytes) { fileBytes.push(bytes); return {id: `fixture-file-${fileBytes.length}`, url: `https://media.example.test/${fileBytes.length}.jpg`}; },
      async remove() {}
    } };
    const sql = [],
      migration = Object.create(Migration20261006120000.prototype);
    migration.addSql = (q) => sql.push(q);
    const old = process.env.MARKETING_AGENT_TOKEN;
    process.env.MARKETING_AGENT_TOKEN = "editorial-fixture-".repeat(3);
    const call = async (resource, method = "GET", body, query = {}) => {
      let status = 200,
        payload;
      const req = {
        method,
        body,
        query,
        headers: { "x-real-ip": "203.0.113.2", "x-marketing-agent-token": process.env.MARKETING_AGENT_TOKEN },
        get: () => process.env.MARKETING_AGENT_TOKEN,
        scope,
      };
      const res = {
        setHeader() {},
        status(code) {
          status = code;
          return this;
        },
        json(value) {
          payload = value;
          return this;
        },
      };
      await handle(req, res, resource, true);
      return { status, payload };
    };
    try {
      await migration.up();
      for (const q of sql) await db.raw(q);
      const capabilities = await call("design-tools");
      assert.equal(
        capabilities.status,
        200,
        JSON.stringify(capabilities.payload),
      );
      const composition = capabilities.payload.example;
      const list = await call("designs");
      const saved = await call("designs", "POST", {
        revision: list.payload.revision,
        name: "Agent Werkstatt",
        composition,
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.payload.design.versions.length, 1);
      const preview = await call("design-preview", "POST", {
        composition,
        width: 320,
      });
      assert.equal(preview.status, 200);
      const info = await sharp(
        Buffer.from(preview.payload.content, "base64"),
      ).metadata();
      assert.equal(info.width, 320);
      assert.equal(info.height, 400);
      const { pages: ignored, ...badPage } = composition;
      badPage.objects = [
        makeObject("image", "missing", { media_id: "missing-media" }),
      ];
      const exported = await call("design-export", "POST", {
        composition: { ...composition, pages: [badPage] },
        formats: ["portrait", "pin"],
        output: "jpeg",
      });
      assert.equal(exported.status, 200);
      assert.equal(exported.payload.complete, false);
      assert.equal(
        exported.payload.media.length,
        2,
        JSON.stringify(exported.payload.results),
      );
      assert.equal(fileBytes.length, 2);
      assert.deepEqual(
        exported.payload.results.map((r) => [r.page, r.format, !!r.error]),
        [
          [1, "portrait", false],
          [1, "pin", false],
          [2, "portrait", true],
          [2, "pin", true],
        ],
      );
      assert.equal((await sharp(fileBytes[0]).metadata()).height, 1350);
      assert.equal((await sharp(fileBytes[1]).metadata()).width, 1000);
      const media = exported.payload.media[0];
      const draft = await call("posts", "POST", {
        content: {
          topic: "Werkstatt",
          product_ids: [],
          versions: [
            {
              channel: "instagram",
              text: "Ein Blick in unsere Werkstatt",
              alt: "Gestalteter Werkstattbeitrag",
              media_id: media.id,
            },
          ],
        },
        scheduled_at: "2026-12-01T10:00:00Z",
      });
      assert.equal(draft.status, 200);
      assert.equal(draft.payload.post.approved, null);
      assert.equal(draft.payload.post.content.versions[0].media_id, media.id);
      const previousVersions = await call("posts", "GET", undefined, {
        id: draft.payload.post.id,
        versions: "1",
      });
      assert.equal(previousVersions.status, 200);
      assert.deepEqual(
        previousVersions.payload.versions.map((v) => v.revision),
        [1],
      );
      assert.equal(previousVersions.payload.post.editable, true);
      // Native product references are derived server-side, regardless of stale form metadata.
      scope.catalog = async () => ({ products: [{id: "scene-product", status: "published"}], count: 1 });
      await db.raw(
        "update marketing_media set value=jsonb_set(value,'{product_ids}',?::jsonb) where id=?",
        [JSON.stringify(["scene-product"]), media.id],
      );
      const linked = await call("posts", "POST", {
        id: draft.payload.post.id,
        revision: 1,
        content: { ...draft.payload.post.content, product_ids: ["obsolete"] },
        scheduled_at: draft.payload.post.scheduled_at,
      });
      assert.equal(linked.status, 200, JSON.stringify(linked.payload));
      assert.deepEqual(linked.payload.post.content.product_ids, [
        "scene-product",
      ]);
      assert.deepEqual(
        (
          await call("posts", "GET", undefined, {
            id: linked.payload.post.id,
            versions: "1",
          })
        ).payload.versions.map((v) => v.revision),
        [2, 1],
      );

      assert.equal(
        (
          await call("approve", "POST", {
            id: draft.payload.post.id,
            revision: 1,
            action: "approve",
          })
        ).status,
        403,
      );
      const read = await call("media", "GET", undefined, { id: media.id });
      assert.equal(read.payload.media.checksum, media.checksum);
      const audits = await rows(db, "select actor,action from marketing_audit");
      assert.ok(audits.every((a) => a.actor === "agent:editorial"));
    } finally {
      if (old === undefined) delete process.env.MARKETING_AGENT_TOKEN;
      else process.env.MARKETING_AGENT_TOKEN = old;
      sql.length = 0;
      await migration.down();
      for (const q of sql) await db.raw(q);
      await db.destroy();
    }
  },
);

test(
  "real PostgreSQL: account changes require reapproval before retry, without reopening uncertain or completed attempts",
  { skip: !process.env.MARKETING_TEST_DATABASE_URL },
  async () => {
    const db = knex({
      client: "pg",
      connection: process.env.MARKETING_TEST_DATABASE_URL,
    });
    const env = { ...process.env },
      originalFetch = global.fetch,
      sql = [];
    const migrations = [Migration20261006120000, Migration20261006180000].map(
      (Type) => {
        const m = Object.create(Type.prototype);
        m.addSql = (q) => sql.push(q);
        return m;
      },
    );
    const {
      sealTokens,
      selectBoard,
    } = require("../lib/marketing/accounts");
    const { validateApproval } = require("../lib/marketing/publishing");
    const scope = { db };
    Object.assign(process.env, {
      MARKETING_CREDENTIALS_KEY: Buffer.alloc(32, 8).toString("base64"),
      MARKETING_PUBLISH_ENABLED: "true",
    });
    try {
      for (const m of migrations) await m.up();
      for (const q of sql) await db.raw(q);
      const config = await settings(db);
      await saveSettings(
        db,
        { ...config.value, paused: false },
        config.revision,
        "human",
      );
      const tokens = {
        access_token: "fixture",
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        issued_at: new Date().toISOString(),
        refresh_expires_at: null,
        scopes: [],
      };
      await db.raw(
        "insert into marketing_account (id,value,encrypted) values ('pinterest',?::jsonb,?)",
        [
          JSON.stringify({
            state: "connected",
            source: "oauth",
            account_id: "123",
            target_id: "111",
          }),
          sealTokens("pinterest", tokens),
        ],
      );
      await db.raw(
        "insert into marketing_media (id,value) values ('m',?::jsonb)",
        [
          JSON.stringify({
            name: "Photo",
            url: "https://media.example.test/photo.jpg",
            mime_type: "image/jpeg",
            width: 1000,
            height: 1500,
            size: 1000,
            product_ids: [],
            tags: [],
            generated: false,
            provenance: "",
            checksum: "fixture",
            file_id: "f",
            source: "upload",
          }),
        ],
      );
      const content = contentSchema.parse({
        topic: "Retry",
        versions: [
          {
            channel: "pinterest",
            title: "Title",
            text: "Copy",
            alt: "Photo",
            media_id: "m",
          },
        ],
      });
      const post = await saveDraft(
        db,
        { content, scheduled_at: "2020-01-01T12:00:00Z" },
        "human",
      );
      const approve = (revision = 1) =>
        approvePost(db, post.id, revision, "human", (p, c, tx) =>
          validateApproval(scope, p, c, tx),
        );
      await approve();
      const attempt = await claim(db, post.id, "pinterest");
      await db.raw(
        "update marketing_publication set state='failed' where id=?",
        [attempt.id],
      );
      await selectBoard(
        db,
        1,
        "222",
        "human",
        async () =>
          new Response(
            JSON.stringify({ id: "222", name: "New board", privacy: "PUBLIC" }),
          ),
      );
      assert.equal((await getPost(db, post.id)).approved, null);
      await assert.rejects(
        reconcile(db, attempt.id, "human", {
          action: "retry",
          note: "Target corrected",
        }),
        /zuerst im Kalender/,
      );
      assert.equal(
        (
          await rows(db, "select state from marketing_publication where id=?", [
            attempt.id,
          ])
        )[0].state,
        "failed",
      );
      await assert.rejects(approve(2), /Veralteter/);
      await assert.rejects(
        saveDraft(
          db,
          { id: post.id, revision: 1, content, scheduled_at: null },
          "agent",
        ),
        /Versand bereits/,
      );
      await approve();
      const approved = await getPost(db, post.id);
      assert.deepEqual(approved.content, content);
      assert.equal(approved.approved.targets.pinterest, "123/222");
      assert.equal(await claim(db, post.id, "pinterest"), null); // Reapproval alone cannot retry a failed attempt.
      await reconcile(db, attempt.id, "human", {
        action: "retry",
        note: "Target corrected",
      });
      // Old queued retries whose approvals were revoked can also be recovered.
      await revokePost(db, post.id, 1, "human");
      assert.equal(await claim(db, post.id, "pinterest"), null);
      await approve();
      let published = 0;
      global.fetch = async (url, init) => {
        assert.equal(String(url), "https://api.pinterest.com/v5/pins");
        assert.equal(JSON.parse(init.body).board_id, "222");
        published++;
        return new Response(JSON.stringify({ id: "remote-pin" }), {
          status: 201,
        });
      };
      await dispatchDue(scope);
      await dispatchDue(scope);
      assert.equal(published, 1);
      assert.equal(
        (
          await rows(db, "select state from marketing_publication where id=?", [
            attempt.id,
          ])
        )[0].state,
        "published",
      );
      for (const state of [
        "preparing",
        "dispatching",
        "unknown",
        "published",
        "abandoned",
      ]) {
        await db.raw("update marketing_publication set state=? where id=?", [
          state,
          attempt.id,
        ]);
        await revokePost(db, post.id, 1, "human");
        await assert.rejects(approve(), (error) => error.status === 409);
        await assert.rejects(
          reconcile(db, attempt.id, "human", {
            action: "retry",
            note: "Must remain blocked",
          }),
          (error) => error.status === 409,
        );
      }
      // An uncertain sibling channel still prevents reapproval.
      await db.raw(
        "insert into marketing_publication (id,post_id,channel,state,value) values ('sibling',?,'instagram','unknown','{}')",
        [post.id],
      );
      await db.raw(
        "update marketing_publication set state='failed' where id=?",
        [attempt.id],
      );
      await assert.rejects(approve(), (error) => error.status === 409);
      // Completed siblings must not require live credentials/media or be resent.
      for (const completedState of ["published", "abandoned"]) {
        const mixedContent = contentSchema.parse({
          topic: `Partial ${completedState}`,
          versions: [
            { channel: "linkedin", text: "Already handled", alt: "Old media", media_id: "completed-medium" },
            ...content.versions,
          ],
        });
        const mixed = await saveDraft(db, {
          content: mixedContent, scheduled_at: "2020-01-01T12:00:00Z",
        }, "human");
        const failedId = `${mixed.id}_pinterest`, completedId = `${mixed.id}_linkedin`;
        await db("marketing_publication").insert([
          { id: completedId, post_id: mixed.id, channel: "linkedin", state: completedState,
            value: JSON.stringify({ revision: 1, remote_id: "urn:li:share:123", published_at: "2020-01-01T12:00:00Z" }) },
          { id: failedId, post_id: mixed.id, channel: "pinterest", state: "failed",
            value: JSON.stringify({ revision: 1, error: "PAUSED_OR_APPROVAL_REVOKED" }) },
        ]);
        const completedBefore = await db("marketing_publication").where({ id: completedId }).first();
        const reapprove = () => approvePost(db, mixed.id, 1, "human", (p, c, tx) =>
          validateApproval(scope, p, c, tx));
        await reapprove();
        await revokePost(db, mixed.id, 1, "human");
        await assert.rejects(reconcile(db, failedId, "human", {
          action: "retry", note: "Requires renewed approval",
        }), /zuerst im Kalender/);
        await reapprove();
        const account = await db("marketing_account").where({ id: "pinterest" }).first();
        const boardId = completedState === "published" ? "333" : "444";
        await selectBoard(db, account.revision, boardId, "human", async () =>
          new Response(JSON.stringify({ id: boardId, name: "Corrected board", privacy: "PUBLIC" })));
        assert.equal((await getPost(db, mixed.id)).approved, null);
        await reapprove();
        const recovered = await getPost(db, mixed.id);
        assert.deepEqual(recovered.content, mixedContent);
        assert.deepEqual(recovered.approved.targets, { pinterest: `123/${boardId}` });
        assert.deepEqual(Object.keys(recovered.approved.media), ["m"]);
        assert.equal(await claim(db, mixed.id, "linkedin"), null);
        assert.equal(await claim(db, mixed.id, "pinterest"), null);
        await assert.rejects(saveDraft(db, {
          id: mixed.id, revision: 1, content: mixedContent, scheduled_at: null,
        }, "human"), /Versand bereits/);
        await reconcile(db, failedId, "human", { action: "retry", note: "Only failed channel should publish" });
        let sends = 0;
        global.fetch = async (url, init) => {
          assert.equal(String(url), "https://api.pinterest.com/v5/pins");
          assert.equal(JSON.parse(init.body).board_id, boardId);
          sends++;
          return new Response(JSON.stringify({ id: `pin-${boardId}` }), { status: 201 });
        };
        await Promise.all([dispatchDue(scope), dispatchDue(scope)]);
        await dispatchDue(scope);
        assert.equal(sends, 1);
        assert.equal((await db("marketing_publication").where({ id: failedId }).first()).state, "published");
        assert.deepEqual(await db("marketing_publication").where({ id: completedId }).first(), completedBefore);
        await assert.rejects(reapprove(), (error) => error.status === 409);
      }
    } finally {
      global.fetch = originalFetch;
      for (const key of Object.keys(process.env))
        if (!(key in env)) delete process.env[key];
      Object.assign(process.env, env);
      sql.length = 0;
      for (const m of [...migrations].reverse()) await m.down();
      for (const q of sql) await db.raw(q);
      await db.destroy();
    }
  },
);
