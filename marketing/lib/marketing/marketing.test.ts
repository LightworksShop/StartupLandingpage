import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  compositionSchema,
  approvalHash,
  contentSchema,
  draftSchema,
  settingsSchema,
  validateReady,
  type Media,
  type Post,
} from "./schema";
import {
  inspectUpload,
  isPublicAddress,
  renderComposition,
  compositionLabels,
} from "./media";
import {
  blankDesign,
  productGeometry,
  overlayGeometry,
  formats,
  autoFit,
  smartResize,
  sceneSvg,
  applyTemplate,
} from "./design-model";
import { berlinTime, proposeWeek } from "./planning";
import { approvableVersions, automaticProductIds, feedExclusions, postStatus } from "./post-model";
import { berlinInput, berlinInstant } from "./berlin-time";
import { humanActor, handle } from "./http";
import { ProviderError, providerRequest, publishVersion } from "./providers";
import { validApproval, referencedProductIds } from "./publishing";
test("approval offers only remaining channels and blocks active or uncertain delivery", () => {
  const content = contentSchema.parse({ topic: "Mixed", versions: [
    { channel: "linkedin" }, { channel: "pinterest" },
  ] });
  for (const state of ["published", "abandoned"]) {
    assert.deepEqual(approvableVersions(content, [
      { channel: "linkedin", state }, { channel: "pinterest", state: "failed" },
    ]).map(v => v.channel), ["pinterest"]);
    assert.equal(approvableVersions(content, [
      { channel: "linkedin", state }, { channel: "pinterest", state },
    ]).length, 0);
  }
  for (const state of ["preparing", "dispatching", "unknown", "unexpected"]) {
    assert.equal(approvableVersions(content, [
      { channel: "linkedin", state }, { channel: "pinterest", state: "failed" },
    ]).length, 0);
  }
  assert.equal(approvableVersions(content).length, 2);
});
const content = contentSchema.parse({
  topic: "Werkstatt",
  versions: [
    {
      channel: "pinterest",
      text: "Handarbeit",
      title: "Holz",
      alt: "Werkbank",
      media_id: "m1",
    },
  ],
});
const media: Media = {
  id: "m1",
  name: "Werkbank",
  url: "https://media.example.test/photo.jpg",
  file_id: "f1",
  mime_type: "image/jpeg",
  width: 1000,
  height: 1500,
  size: 3000,
  checksum: "fixture",
  tags: [],
  product_ids: [],
  generated: false,
  provenance: "",
  source: "upload",
};
const post: Post = {
  id: "post1",
  revision: 1,
  content,
  scheduled_at: "2026-10-06T10:00:00Z",
  approved: null,
};
const settings = settingsSchema.parse({
  paused: true,
  timezone: "Europe/Berlin",
  slots: [],
  seasons: [],
  repeat_days: 21,
  preferences: {},
});

test("strict draft contract cannot smuggle approval, publication state or duplicate channel", () => {
  assert.throws(() =>
    draftSchema.parse({ ...post, approved: { actor: "agent" } }),
  );
  assert.throws(() =>
    contentSchema.parse({
      ...content,
      versions: [...content.versions, ...content.versions],
    }),
  );
  assert.throws(() =>
    draftSchema.parse({ id: "p", content, scheduled_at: null }),
  );
});
test("approval is bound to exact content, media, destination and schedule", () => {
  const approved = {
    ...post,
    approved: {
      revision: 1,
      actor: "human",
      at: "now",
      media: { m1: media },
      targets: { pinterest: "board" },
      hash: approvalHash(post, { m1: media }, { pinterest: "board" }),
    },
  };
  assert.equal(validApproval(approved), true);
  for (const changed of [
    { ...approved, revision: 2 },
    { ...approved, scheduled_at: null },
    { ...approved, content: { ...content, topic: "Changed" } },
    {
      ...approved,
      approved: { ...approved.approved, targets: { pinterest: "different" } },
    },
  ])
    assert.equal(validApproval(changed), false);
});
test("readiness blocks missing copy/media, bad Instagram ratio and unimplemented Facebook", () => {
  validateReady(post, { m1: media });
  assert.throws(() => validateReady(post, {}));
  assert.throws(() =>
    validateReady(
      {
        ...post,
        content: {
          ...content,
          versions: [{ ...content.versions[0], channel: "instagram" }],
        },
      },
      { m1: media },
    ),
  );
  assert.throws(() =>
    validateReady(
      {
        ...post,
        content: {
          ...content,
          versions: [{ ...content.versions[0], channel: "facebook" }],
        },
      },
      { m1: media },
    ),
  );
});
test("only personal user auth can approve; agent API denies control paths before resolving DB", async () => {
  for (const context of [
    undefined,
    { actor_type: "api-key", actor_id: "key" },
    { actor_type: "customer", actor_id: "c" },
  ])
    assert.throws(() => humanActor({ auth_context: context } as never));
  assert.equal(
    humanActor({
      auth_context: { actor_type: "user", actor_id: "u" },
    } as never),
    "user:u",
  );
  const old = process.env.MARKETING_AGENT_TOKEN;
  process.env.MARKETING_AGENT_TOKEN = "t".repeat(40);
  try {
    let status = 200;
    const res = {
      setHeader() {},
      status(n: number) {
        status = n;
        return this;
      },
      json() {
        return this;
      },
    };
    await handle(
      {
        headers: { "x-marketing-agent-token": "incorrect" },
        scope: {
          resolve() {
            throw new Error("must not resolve");
          },
        },
      } as never,
      res as never,
      "approve",
      true,
    );
    assert.equal(status, 401);
    for (const operation of ["approve", "settings", "reconcile"]) {
      await handle(
        {
          headers: { "x-marketing-agent-token": "t".repeat(40) },
          scope: {
            resolve() {
              throw new Error("must not resolve");
            },
          },
        } as never,
        res as never,
        operation,
        true,
      );
      assert.equal(status, 403);
    }
  } finally {
    if (old === undefined) delete process.env.MARKETING_AGENT_TOKEN;
    else process.env.MARKETING_AGENT_TOKEN = old;
  }
});
test("Berlin slots observe daylight saving, reject gap, exclude products and space repeats", () => {
  assert.equal(berlinTime("2026-10-19", "18:00"), "2026-10-19T16:00:00.000Z");
  assert.equal(berlinTime("2026-10-26", "18:00"), "2026-10-26T17:00:00.000Z");
  assert.throws(() => berlinTime("2026-03-29", "02:30"));
  const config = {
    ...settings,
    preferences: { p1: "exclude" as const, p2: "prefer" as const },
    slots: [
      {
        day: 1,
        time: "18:00",
        channel: "pinterest" as const,
        topic: "Werkstatt",
      },
      { day: 2, time: "18:00", channel: "instagram" as const, topic: "Holz" },
    ],
  };
  const proposals = proposeWeek(
    "2026-10-05",
    config,
    [{ id: "p1" }, { id: "p2" }] as never,
    [],
  );
  assert.deepEqual(
    proposals.map((p) => p.content.product_ids),
    [["p2"], []],
  );
  assert.throws(() => proposeWeek("2026-10-06", config, [], []));
});
test("social exclusions and feed exclusions are independent with legacy fallback", () => {
  const legacy = { ...settings, preferences: { p: "exclude" as const } };
  assert.deepEqual(feedExclusions(legacy), ["p"]);
  assert.deepEqual(feedExclusions({ ...legacy, feed_exclusions: [] }), []);
  assert.deepEqual(feedExclusions({ ...legacy, feed_exclusions: ["q"] }), [
    "q",
  ]);
});
test("post product metadata follows all selected channel media and covers", () => {
  const selection = contentSchema.parse({
    topic: "Mix",
    product_ids: ["outdated"],
    versions: [
      { channel: "instagram", media_id: "scene" },
      { channel: "pinterest", media_id: "film", cover_media_id: "cover" },
    ],
  });
  const refs = [
    {
      ...media,
      id: "scene",
      product_ids: ["p1"],
      composition: { ...blankDesign(), product_id: "p2" },
    },
    { ...media, id: "film", product_ids: ["p1", "p3"] },
    { ...media, id: "cover", product_ids: ["p4"] },
    { ...media, id: "unused", product_ids: ["p5"] },
  ];
  assert.deepEqual(automaticProductIds(selection, refs), [
    "p1",
    "p2",
    "p3",
    "p4",
  ]);
  assert.deepEqual(
    automaticProductIds({ ...content, product_ids: ["stale"] }, [media]),
    [],
  );
  assert.deepEqual(
    automaticProductIds(
      contentSchema.parse({
        topic: "Planung",
        product_ids: ["p1"],
        versions: [{ channel: "instagram" }],
      }),
      [],
    ),
    ["p1"],
  );
});
test("calendar status prioritizes actual attempts over approval", () => {
  const attempt = (state: string, channel = "pinterest") => ({
    state,
    channel,
  });
  assert.equal(postStatus(post), "draft");
  assert.equal(
    postStatus({ ...post, publications: [attempt("published")] }),
    "published",
  );
  assert.equal(
    postStatus({
      ...post,
      content: {
        ...content,
        versions: [
          ...content.versions,
          { ...content.versions[0], channel: "instagram" },
        ],
      },
      publications: [attempt("published")],
    }),
    "partial",
  );
  assert.equal(
    postStatus({
      ...post,
      publications: [attempt("published"), attempt("unknown", "instagram")],
    }),
    "unknown",
  );
  for (const state of ["failed", "pending"])
    assert.equal(
      postStatus({ ...post, publications: [attempt(state)] }),
      state,
    );
  assert.equal(
    postStatus({ ...post, publications: [attempt("dispatching")] }),
    "active",
  );
});
test("calendar wall times round-trip in Berlin and reject DST gaps and incomplete inputs", () => {
  for (const [wall, utc] of [
    ["2026-01-12T10:30", "2026-01-12T09:30:00.000Z"],
    ["2026-07-12T10:30", "2026-07-12T08:30:00.000Z"],
    ["2026-10-25T02:30", "2026-10-25T01:30:00.000Z"],
  ]) {
    assert.equal(berlinInstant(wall), utc);
    assert.equal(berlinInput(utc), wall);
  }
  assert.equal(berlinInstant(""), null);
  assert.throws(
    () => berlinInstant("2026-03-29T02:30"),
    /Zeitumstellungslücke/,
  );
  assert.throws(() => berlinInstant("2026-02-31T12:30"));
  assert.throws(() => berlinInstant("2026-01-12T1"), /vollständigen/);
});

test("media validation preserves original bytes and requires honest generated provenance", async () => {
  const bytes = await sharp({
    create: {
      width: 200,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const input = {
    labels: { name: "Karte", generated: false },
    mime_type: "image/png",
    content: bytes.toString("base64"),
  };
  const inspected = await inspectUpload(input);
  assert.deepEqual(inspected.bytes, bytes);
  await assert.rejects(() =>
    inspectUpload({ ...input, mime_type: "image/jpeg" }),
  );
  await assert.rejects(() =>
    inspectUpload({ ...input, labels: { name: "KI", generated: true } }),
  );
  await assert.rejects(() =>
    inspectUpload({ ...input, content: input.content + "\n" }),
  );
});
test("composition scales proportionally, contains complete foreground and escapes overlay text", async () => {
  const opaque = await sharp({
    create: {
      width: 200,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const rgba = await sharp(opaque).raw().toBuffer();
  rgba[3] = 0; // A real transparent original, keeping the 200:100 geometry.
  const foreground = await sharp(rgba, {
    raw: { width: 200, height: 100, channels: 4 },
  })
    .png()
    .toBuffer();
  const source = Buffer.from(foreground);
  const result = await renderComposition(foreground, null, {
    product_id: "p",
    image_url: "https://example.test/a.png",
    background_id: null,
    template: "plain",
    format: "square" as const,
    x: 1,
    y: 1,
    scale: 0.5,
    text: "",
    color: "#ffffff",
  });
  assert.deepEqual(foreground, source);
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1080);
  // 200:100 at 50% of 1080 means 540:270 at bottom right, never cropped/stretched.
  const pixel = async (x: number, y: number) =>
    Array.from(
      await sharp(result)
        .extract({ left: x, top: y, width: 1, height: 1 })
        .raw()
        .toBuffer(),
    );
  assert.ok((await pixel(800, 900))[1] < 20);
  assert.ok((await pixel(800, 790))[1] > 230);
  assert.ok((await pixel(500, 900))[1] > 230);
  await renderComposition(foreground, null, {
    product_id: "p",
    image_url: "https://example.test/a.png",
    background_id: null,
    template: "caption",
    format: "pin",
    x: 0.5,
    y: 0.5,
    scale: 0.7,
    text: "<script>& Holz",
    color: "#ffffff",
  });
});
test("media network guard rejects private and mapped addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "100.64.0.1",
  ])
    assert.equal(isPublicAddress(address), false);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("provider timeout/invalid success after publish is uncertain; provider errors never expose bodies", async () => {
  await assert.rejects(
    () =>
      providerRequest("https://example.test", "private", {}, true, async () => {
        throw new Error("private secret");
      }),
    (e) =>
      e instanceof ProviderError &&
      e.uncertain &&
      e.message === "NETWORK_OR_TIMEOUT",
  );
  await assert.rejects(
    () =>
      providerRequest(
        "https://example.test",
        "private",
        {},
        true,
        async () => new Response("secret", { status: 500 }),
      ),
    (e) =>
      e instanceof ProviderError &&
      e.uncertain &&
      !e.message.includes("secret"),
  );
});
test("Pinterest request is organic only and Instagram commits container then publishes only after ready", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, {
    MARKETING_PINTEREST_TOKEN: "fixture",
    MARKETING_PINTEREST_BOARD_ID: "board",
    MARKETING_INSTAGRAM_TOKEN: "fixture",
    MARKETING_INSTAGRAM_USER_ID: "account",
    MARKETING_META_API_VERSION: "v25.0",
  });
  try {
    const steps: string[] = [];
    await publishVersion(
      "pinterest",
      content.versions[0],
      media,
      {
        container: async () => {},
        beforePublish: async () => {
          steps.push("intent");
        },
      },
      async (url, _token, body) => {
        steps.push(url);
        assert.deepEqual((body as { media_source: unknown }).media_source, {
          source_type: "image_url",
          url: media.url,
        });
        return { id: "pin" };
      },
    );
    assert.equal(steps[0], "intent");
    assert.equal(steps[1], "https://api.pinterest.com/v5/pins");
    steps.length = 0;
    const id = await publishVersion(
      "instagram",
      { ...content.versions[0], channel: "instagram" },
      media,
      {
        container: async () => {
          steps.push("container_saved");
        },
        beforePublish: async () => {
          steps.push("intent");
        },
      },
      async (url) => {
        steps.push(url);
        return url.includes("status_code")
          ? { status_code: "FINISHED" }
          : { id: url.endsWith("media_publish") ? "published" : "container" };
      },
    );
    assert.equal(id, "published");
    assert.equal(steps[1], "container_saved");
    assert.equal(steps[3], "intent");
    assert.ok(steps[4].endsWith("media_publish"));
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test("Pinterest video uploads before publish and never sends OAuth credentials to storage", async () => {
  const oldToken = process.env.MARKETING_PINTEREST_TOKEN,
    oldBoard = process.env.MARKETING_PINTEREST_BOARD_ID;
  process.env.MARKETING_PINTEREST_TOKEN = "fixture";
  process.env.MARKETING_PINTEREST_BOARD_ID = "board";
  try {
    const events: string[] = [];
    const result = await publishVersion(
      "pinterest",
      content.versions[0],
      { ...media, mime_type: "video/mp4" },
      {
        cover: media,
        container: async () => {
          events.push("registered");
        },
        beforePublish: async () => {
          events.push("intent");
        },
      },
      async (url, _token, body) => {
        if (url.endsWith("/media"))
          return {
            media_id: "video1",
            upload_url:
              "https://pinterest-media-upload.s3-accelerate.amazonaws.com/",
            upload_parameters: { key: "fixture" },
          };
        if (url.endsWith("/media/video1")) return { status: "succeeded" };
        assert.equal(events.at(-1), "intent");
        assert.equal(
          (body as { media_source: { source_type: string } }).media_source
            .source_type,
          "video_id",
        );
        return { id: "video-pin" };
      },
      {
        read: async () => Buffer.from("fixture video"),
        fetch: async (_url, init) => {
          assert.equal(init?.headers, undefined);
          assert.ok(init?.body instanceof FormData);
          events.push("upload");
          return new Response(null, { status: 204 });
        },
      },
    );
    assert.equal(result, "video-pin");
    assert.deepEqual(events, ["registered", "upload", "intent"]);
  } finally {
    if (oldToken === undefined) delete process.env.MARKETING_PINTEREST_TOKEN;
    else process.env.MARKETING_PINTEREST_TOKEN = oldToken;
    if (oldBoard === undefined) delete process.env.MARKETING_PINTEREST_BOARD_ID;
    else process.env.MARKETING_PINTEREST_BOARD_ID = oldBoard;
  }
});

test("excluded/unpublished product checks include product-linked media and video covers", () => {
  assert.deepEqual(
    referencedProductIds(
      { ...post, content: { ...content, product_ids: ["p1"] } },
      {
        m1: { ...media, product_ids: ["p2", "p1"] },
        cover: { ...media, id: "cover", product_ids: ["p3"] },
      },
    ),
    ["p1", "p2", "p3"],
  );
});

test("existing settings accept folders and reusable designs without a migration or approval fields", () => {
  const legacy = {
    paused: true,
    timezone: "Europe/Berlin",
    slots: [],
    seasons: [],
    repeat_days: 21,
    preferences: {},
  };
  assert.deepEqual(settingsSchema.parse(legacy).design_drafts, []);
  const draft = {
    id: "design_1",
    name: "Werkstatt",
    composition: {
      product_id: "p1",
      image_url: "https://media.example.test/map.png",
      background_id: null,
      template: "caption",
      format: "portrait",
      x: 0.5,
      y: 0.5,
      scale: 0.75,
      text: "Hamburg",
      subtitle: "Mein Lieblingsort",
    },
  };
  const parsed = settingsSchema.parse({
    ...legacy,
    media_folders: ["Hintergründe"],
    design_drafts: [draft],
  });
  assert.equal(
    parsed.design_drafts[0].composition.subtitle,
    "Mein Lieblingsort",
  );
  assert.equal(
    settingsSchema.safeParse({
      ...legacy,
      design_drafts: [{ ...draft, approved: true }],
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({ ...legacy, media_folders: [""] }).success,
    false,
  );
});

test("Facebook Login publishes Instagram through Graph Facebook after deterministic intent", async () => {
  const steps: string[] = [];
  const result = await publishVersion(
    "instagram",
    { ...content.versions[0], channel: "instagram" },
    media,
    {
      credential: {
        channel: "instagram",
        loginMethod: "facebook",
        token: "fixture-user",
        target: "222",
        destination: "facebook/789/111/222",
        apiVersion: "v25.0",
        source: "oauth",
      },
      container: async () => {
        steps.push("container");
      },
      beforePublish: async () => {
        steps.push("intent");
      },
    },
    async (url, token) => {
      assert.equal(token, "fixture-user");
      assert.equal(new URL(url).hostname, "graph.facebook.com");
      steps.push(url);
      return url.includes("status_code")
        ? { status_code: "FINISHED" }
        : { id: url.endsWith("media_publish") ? "published" : "container-id" };
    },
  );
  assert.equal(result, "published");
  assert.equal(steps[0], "https://graph.facebook.com/v25.0/222/media");
  assert.equal(steps[3], "intent");
  assert.equal(steps[4], "https://graph.facebook.com/v25.0/222/media_publish");
});

test("rotated product and overlay stay within all format bounds, including smart resize at edge anchors", () => {
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
    rotation: 43,
    x: 1,
    y: 0,
    scale: 1,
  };
  for (const format of Object.keys(formats) as Array<keyof typeof formats>) {
    for (const template of ["plain", "caption"] as const) {
      for (const ratio of [
        { width: 400, height: 100 },
        { width: 100, height: 400 },
      ]) {
        const resized = smartResize(
          {
            ...design,
            template,
            overlay: {
              ...design.overlay,
              rotation: 45,
              scale: 0.8,
              x: 0,
              y: 1,
            },
          },
          format,
        );
        const g = productGeometry(resized, ratio),
          o = overlayGeometry(resized);
        assert.ok(g.cx - g.bw / 2 >= -0.001 && g.cy - g.bh / 2 >= -0.001);
        assert.ok(
          g.cx + g.bw / 2 <= g.width + 0.001 &&
            g.cy + g.bh / 2 <= g.safeHeight + 0.001,
        );
        assert.ok(Math.abs(g.fw / g.fh - ratio.width / ratio.height) < 0.001);
        assert.ok(
          o.cx - o.bounds / 2 >= -0.001 && o.cy - o.bounds / 2 >= -0.001,
        );
        assert.ok(
          o.cx + o.bounds / 2 <= g.width + 0.001 &&
            o.cy + o.bounds / 2 <= g.height + 0.001,
        );
      }
    }
  }
  const fitted = autoFit({ ...design, aspect_locked: false, stretch: 2 });
  assert.deepEqual(autoFit(fitted), fitted);
  assert.equal(fitted.image_url, design.image_url);
  assert.equal(fitted.rotation, 43);
  assert.equal(fitted.aspect_locked, true);
  assert.equal(fitted.stretch, 1);
  assert.equal(design.x, 1);
});

test("editor contract accepts legacy layouts and bounded version snapshots, rejects arbitrary fonts and effects", () => {
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
  };
  assert.equal(compositionSchema.parse(design).aspect_locked, true);
  for (const invalid of [
    { font: "custom" },
    { text_color: "#123456" },
    { rotation: 181 },
    { adjustments: { brightness: 100 } },
    { shadow: { strength: 1.5 } },
    { overlay: { opacity: -1 } },
    { layers: [...design.layers.slice(1), design.layers[1]] },
  ])
    assert.equal(
      compositionSchema.safeParse({ ...design, ...invalid }).success,
      false,
    );
  const draft = {
    id: "design_1",
    name: "Vorlage",
    is_template: true,
    composition: design,
    versions: [
      {
        id: "version_1",
        saved_at: "2026-10-07T12:00:00.000Z",
        composition: { ...design, rotation: 10 },
      },
    ],
  };
  const parsed = settingsSchema.parse({ ...settings, design_drafts: [draft] });
  assert.equal(parsed.design_drafts[0].versions[0].composition.rotation, 10);
  assert.equal(parsed.design_drafts[0].is_template, true);
  assert.equal(
    settingsSchema.safeParse({
      ...settings,
      design_drafts: [
        {
          ...draft,
          versions: Array.from({ length: 21 }, () => draft.versions[0]),
        },
      ],
    }).success,
    false,
  );
});

async function transparentFixture() {
  const pixels = Buffer.alloc(200 * 100 * 4);
  for (let y = 10; y < 90; y++)
    for (let x = 10; x < 190; x++) {
      const i = (y * 200 + x) * 4;
      pixels[i] = 230;
      pixels[i + 1] = 30;
      pixels[i + 2] = 20;
      pixels[i + 3] = 255;
    }
  return sharp(pixels, { raw: { width: 200, height: 100, channels: 4 } })
    .png()
    .toBuffer();
}
async function rgb(image: Buffer, x: number, y: number) {
  return Array.from(
    await sharp(image)
      .extract({ left: x, top: y, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer(),
  );
}

test("real JPEG: background filters affect only background, product and source bytes keep their colors", async () => {
  const foreground = await transparentFixture(),
    source = Buffer.from(foreground);
  const background = await sharp({
    create: { width: 1080, height: 1080, channels: 3, background: "#374151" },
  })
    .png()
    .toBuffer();
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
    format: "square" as const,
    scale: 0.5,
  };
  const plain = await renderComposition(foreground, background, design);
  const edited = await renderComposition(foreground, background, {
    ...design,
    adjustments: {
      brightness: 0.3,
      contrast: 1.3,
      saturation: 0,
      blur: 8,
      hue: 120,
    },
  });
  const centerA = await rgb(plain, 540, 540),
    centerB = await rgb(edited, 540, 540);
  centerA.forEach((value, i) => assert.ok(Math.abs(value - centerB[i]) <= 3));
  assert.ok(
    (await rgb(edited, 60, 60))[1] < (await rgb(plain, 60, 60))[1] - 40,
  );
  assert.deepEqual(foreground, source);
});

test("real JPEG: alpha shadow follows direction and strength, leaving opaque product pixels intact", async () => {
  const foreground = await transparentFixture();
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
    format: "square" as const,
    color: "#ffffff",
    scale: 0.5,
  };
  const plain = await renderComposition(foreground, null, design);
  const shadow = await renderComposition(foreground, null, {
    ...design,
    shadow: { strength: 0.8, softness: 3, distance: 60, direction: 90 },
  });
  assert.ok(
    (await rgb(shadow, 540, 680))[0] < (await rgb(plain, 540, 680))[0] - 70,
  );
  const a = await rgb(plain, 540, 540),
    b = await rgb(shadow, 540, 540);
  a.forEach((value, i) => assert.ok(Math.abs(value - b[i]) <= 3));
});

test("real JPEG: layer visibility and order govern logo compositing, all five formats export exact dimensions", async () => {
  const foreground = await transparentFixture();
  const logo = await sharp({
    create: { width: 100, height: 100, channels: 4, background: "#0000ff" },
  })
    .png()
    .toBuffer();
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
    format: "square" as const,
    overlay: { ...blankDesign().overlay, x: 0.5, y: 0.5, scale: 0.2 },
  };
  const front = await renderComposition(foreground, null, design, logo);
  assert.ok((await rgb(front, 540, 540))[2] > 240);
  const back = await renderComposition(
    foreground,
    null,
    {
      ...design,
      layers: [
        design.layers[0],
        design.layers[3],
        design.layers[1],
        design.layers[2],
      ],
    },
    logo,
  );
  assert.ok((await rgb(back, 540, 540))[0] > 210);
  const hidden = await renderComposition(
    foreground,
    null,
    {
      ...design,
      layers: design.layers.map((l) =>
        l.id === "overlay" ? { ...l, visible: false } : l,
      ),
    },
    logo,
  );
  assert.deepEqual(await rgb(hidden, 540, 540), await rgb(back, 540, 540));
  for (const format of Object.keys(formats) as Array<keyof typeof formats>) {
    const output = await renderComposition(
      foreground,
      null,
      smartResize(
        {
          ...design,
          rotation: 37,
          template: "caption",
          text: "Ort & <Freude>",
          subtitle: "Holz",
          cta: "Entdecken",
        },
        format,
      ),
      logo,
    );
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, "jpeg");
    assert.deepEqual([meta.width, meta.height], formats[format]);
  }
});

test("opaque RGBA and non-alpha originals are rejected before composition", async () => {
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
  };
  for (const channels of [3, 4] as const) {
    const opaque = await sharp({
      create: { width: 10, height: 10, channels, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    await assert.rejects(
      () => renderComposition(opaque, null, design),
      /transparent/,
    );
  }
});

test("template application preserves product identity and scene escaping never creates executable markup", () => {
  const design = {
    ...blankDesign(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
    text: '<script>alert("x")</script>',
  };
  for (const id of ["light", "christmas", "pure", "gift"]) {
    const preset = applyTemplate(design, id);
    assert.equal(preset.product_id, "p");
    assert.equal(preset.image_url, design.image_url);
    assert.ok(compositionSchema.safeParse(preset).success);
  }
  const scene = sceneSvg(
    design,
    { width: 200, height: 100 },
    { product: 'https://media.example.test/p.png?x=" onload="bad' },
  );
  assert.ok(!scene.includes("<script>"));
  assert.ok(scene.includes("&lt;script&gt;"));
  assert.ok(scene.includes("&quot; onload=&quot;"));
});

test("composition carries generated provenance and product references from both pool layers without truncating evidence", () => {
  const background = {
    product_ids: ["background_product"],
    generated: false,
    provenance: "Originalfoto",
  };
  const overlay = {
    product_ids: ["overlay_product", "p"],
    generated: true,
    provenance: "Modell: Fixture",
  };
  const labels = compositionLabels(
    { id: "p", title: "Karte" },
    background,
    overlay,
    "facebook",
  );
  assert.deepEqual(labels.product_ids, [
    "p",
    "background_product",
    "overlay_product",
  ]);
  assert.equal(labels.generated, true);
  assert.equal(labels.provenance, "Originalfoto · Modell: Fixture");
  assert.throws(() =>
    compositionLabels(
      { id: "p", title: "Karte" },
      background,
      { ...overlay, provenance: "x".repeat(1000) },
      "pin",
    ),
  );
  assert.throws(() =>
    compositionLabels(
      { id: "p", title: "Karte" },
      {
        ...background,
        product_ids: Array.from({ length: 20 }, (_, i) => `p${i}`),
      },
      overlay,
      "pin",
    ),
  );
});
