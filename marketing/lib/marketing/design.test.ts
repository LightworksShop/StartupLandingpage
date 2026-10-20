import test, { mock } from "node:test";
import { handle } from "./http";
import assert from "node:assert/strict";
import sharp from "sharp";
import { compositionSchema, designObjectSchema } from "./schema";
import {
  blankDesign,
  makeObject,
  sceneSvg,
  smartResize,
  objectGeometry,
  designWarnings,
} from "./design-model";
import { renderComposition, compositionScene, inspectUpload } from "./media";
import { designCapabilities, designOperation } from "./design-api";
import {
  designExportSchema,
  renderAnimation,
  withRenderLimit,
} from "./design-export";
import { drawBrandText } from "./design-fonts";
import {
  animationFrame,
  animationProgress,
  applyAnimationPreset,
  setAnimationDuration,
  animationFps,
} from "./design-animation";
import { spawnSync } from "node:child_process";
const design = () => compositionSchema.parse(blankDesign());
test("animation presets stagger legacy and free text, preserve locks and leave product geometry intact", () => {
  const original = {
    ...design(),
    text: "Berlin entdecken",
    subtitle: "Mit Wunschname",
    cta: "Jetzt gestalten",
    objects: [
      makeObject("text", "title", { layout_role: "headline" }),
      makeObject("text", "personal", { layout_role: "body" }),
      makeObject("text", "locked", { locked: true, animation: "rise" }),
    ],
  };
  const d = applyAnimationPreset(original, "personalization");
  assert.equal(d.animation_duration, 6);
  assert.equal(d.animation_settings.layers.headline.effect, "reveal");
  assert.equal(d.animation_settings.layers.subtitle.effect, "pop");
  assert.ok(
    d.animation_settings.layers.cta.start >
      d.animation_settings.layers.subtitle.start,
  );
  assert.equal(d.objects[0].animation, "reveal");
  assert.equal(d.objects[1].animation, "pop");
  assert.equal(d.objects[2].animation, "rise");
  assert.equal(original.objects[0].animation, "none");
  assert.equal(d.image_url, original.image_url);
  assert.equal(d.scale, original.scale);
  assert.equal(d.x, original.x);
  const shortened = setAnimationDuration(d, 2);
  assert.ok(
    shortened.animation_settings.layers.headline.start <
      shortened.animation_settings.layers.cta.start,
  );
  assert.ok(
    shortened.animation_settings.layers.cta.start +
      shortened.animation_settings.layers.cta.duration <=
      1.5,
  );
  assert.doesNotThrow(() => compositionSchema.parse(shortened));
  for (const preset of ["focus", "personalization", "calm", "none"] as const)
    assert.doesNotThrow(() =>
      compositionSchema.parse(applyAnimationPreset(original, preset)),
    );
  const legacy = compositionSchema.parse({
    ...design(),
    animation_settings: undefined,
    objects: [
      makeObject("text", "old", {
        animation: "rise",
        animation_start: undefined,
        animation_time: undefined,
        animation_direction: undefined,
      }),
    ],
  });
  assert.equal(legacy.objects[0].animation_start, 0);
  assert.equal(legacy.objects[0].animation_time, 1);
  assert.throws(() =>
    compositionSchema.parse({
      ...design(),
      objects: [makeObject("shape", "invalid", { animation: "words" })],
    }),
  );
  assert.throws(() =>
    compositionSchema.parse({
      ...design(),
      objects: [makeObject("text", "invalid", { animation_time: 0 })],
    }),
  );
});

test("every entrance renders an invisible start, an intermediate frame and the complete final glyph image", async () => {
  for (const effect of [
    "fade",
    "rise",
    "slide",
    "pop",
    "reveal",
    "words",
  ] as const) {
    const d = {
      ...design(),
      format: "facebook" as const,
      color: "#ffffff",
      objects: [
        makeObject("text", "message", {
          text: "Berlin entdecken",
          width: 0.65,
          height: 0.3,
          size: 50,
          animation: effect,
          animation_start: 0.5,
          animation_time: 1.2,
          animation_direction: "left",
        }),
      ],
    };
    const svg = await compositionScene(Buffer.alloc(0), null, d);
    const raster = (frame: string) =>
      sharp(Buffer.from(frame))
        .flatten({ background: "#ffffff" })
        .removeAlpha()
        .raw()
        .toBuffer();
    const [start, middle, end, still] = await Promise.all([
      raster(animationFrame(svg, d, 0)),
      raster(animationFrame(svg, d, 0.86)),
      raster(animationFrame(svg, d, 2.5)),
      raster(svg),
    ]);
    assert.ok(
      start.every((channel) => channel === 255),
      `${effect}: hidden before its start`,
    );
    assert.ok(
      middle.some((channel) => channel < 180),
      `${effect}: intermediate frame shows content`,
    );
    assert.notDeepEqual(
      middle,
      still,
      `${effect}: intermediate frame differs from static content`,
    );
    assert.deepEqual(
      end,
      still,
      `${effect}: final frame preserves complete original typography`,
    );
    if (effect === "words") {
      assert.match(
        animationFrame(svg, d, 0.86),
        /data-animation-index="0" opacity="0\.[1-9]/,
      );
      assert.match(
        animationFrame(svg, d, 0.86),
        /data-animation-index="1" opacity="0"/,
      );
    }
  }
});

test("whole-scene zoom encloses every layer and shortening a clip still leaves a readable end", () => {
  const d = applyAnimationPreset(
    { ...design(), text: "Dein Berlin", cta: "Jetzt gestalten" },
    "focus",
  );
  const svg = sceneSvg(d, { width: 1, height: 1 }, { product: "" });
  const frame = animationFrame(svg, d, 3);
  assert.match(
    frame,
    /<svg[^>]*><g data-animation-scene="zoom" transform="translate\(540 675\) scale\(1\.02\)/,
  );
  assert.ok(
    frame.indexOf('data-animation-scene="zoom"') <
      frame.indexOf('data-design-layer="background"'),
  );
  assert.ok(
    frame.indexOf('data-animation-scene="zoom"') <
      frame.indexOf('data-animation-target="cta"'),
  );
  assert.equal(
    animationProgress({ ...d, animation_duration: 2 }, "cta", 1.5),
    1,
  );
});

test("real MP4 contains delayed word animation in decoded first and final frames", async () => {
  const d = {
    ...design(),
    format: "facebook" as const,
    color: "#ffffff",
    text: "Berlin entdecken",
    animation_duration: 2,
  };
  d.animation_settings.layers.headline = {
    effect: "words",
    start: 0.3,
    duration: 1.1,
    direction: "left",
  };
  const svg = await compositionScene(Buffer.alloc(0), null, d);
  const video = await renderAnimation(svg, d);
  const decoded = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      "pipe:0",
      "-vf",
      `select=eq(n\\,0)+eq(n\\,${d.animation_duration * animationFps - 1})`,
      "-vsync",
      "0",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "pipe:1",
    ],
    { input: video, maxBuffer: 8 * 1024 * 1024 },
  );
  assert.equal(decoded.status, 0, decoded.stderr.toString());
  const size = 1200 * 630 * 3;
  assert.equal(decoded.stdout.length, size * 2);
  assert.ok(
    decoded.stdout.subarray(0, size).every((channel) => channel > 245),
    "first encoded frame is blank before text enters",
  );
  assert.ok(
    decoded.stdout.subarray(size).some((channel) => channel < 100),
    "last encoded frame contains the full dark headline",
  );
});
const pixel = async (bytes: Buffer, x: number, y: number) =>
  Array.from(
    await sharp(bytes)
      .extract({ left: x, top: y, width: 1, height: 1 })
      .raw()
      .toBuffer(),
  ).slice(0, 3);
test("agent capabilities give a valid no-product example, all object variants and bounded export contracts", () => {
  const c = designCapabilities();
  assert.equal(c.contract_version, 2);
  assert.doesNotThrow(() => compositionSchema.parse(c.example));
  assert.ok(
    JSON.stringify(c.composition).includes('"additionalProperties":false'),
  );
  assert.ok(JSON.stringify(c.composition).includes('"maxItems":50'));
  const duplicate = makeObject("shape", "same");
  assert.throws(() =>
    compositionSchema.parse({ ...design(), objects: [duplicate, duplicate] }),
  );
  assert.throws(() =>
    compositionSchema.parse({ ...design(), product_id: "p" }),
  );
  assert.throws(() =>
    designObjectSchema.parse({
      ...makeObject("text", "t"),
      font: "unapproved",
    }),
  );
  assert.throws(() =>
    designExportSchema.parse({
      composition: {
        ...design(),
        pages: Array(9).fill({ ...design(), pages: undefined }),
      },
      formats: ["portrait", "pin"],
    }),
  );
  assert.throws(() =>
    compositionSchema.parse({
      ...design(),
      pages: [{ ...design(), pages: [design()] }],
    }),
  );
});
test("element actions and legacy text conversion survive resize and protect locked selections", () => {
  let d = designOperation({
    composition: {
      ...design(),
      text: "Überschrift",
      subtitle: "Unterzeile",
      cta: "Entdecken",
    },
    operation: "convert-text",
  }).composition;
  assert.equal(d.objects.length, 3);
  assert.equal(d.text, "");
  d = designOperation({
    composition: d,
    operation: "duplicate",
    ids: [d.objects[0].id],
  }).composition;
  assert.equal(d.objects.length, 4);
  assert.notEqual(d.objects[0].id, d.objects[3].id);
  d = designOperation({
    composition: d,
    operation: "group",
    ids: d.objects.slice(0, 2).map((o) => o.id),
  }).composition;
  assert.equal(d.objects[0].group, d.objects[1].group);
  assert.throws(() =>
    designOperation({
      composition: {
        ...d,
        objects: d.objects.map((o) => ({ ...o, locked: true })),
      },
      operation: "remove",
      ids: [d.objects[0].id],
    }),
  );
  assert.throws(() =>
    designOperation({
      composition: d,
      operation: "duplicate",
      ids: ["missing"],
    }),
  );
  const adaptive = { ...d, layout_mode: "adaptive" as const };
  assert.deepEqual(
    smartResize(
      smartResize(smartResize(adaptive, "facebook"), "portrait"),
      "facebook",
    ),
    smartResize(adaptive, "facebook"),
  );
  for (const format of [
    "square",
    "portrait",
    "pin",
    "story",
    "facebook",
  ] as const)
    for (const o of d.objects) {
      const b = objectGeometry(
        { ...o, rotation: 63, x: 1, y: 1 },
        smartResize(d, format),
      );
      assert.ok(
        b.cx + b.bw / 2 <=
          {
            square: 1080,
            portrait: 1080,
            pin: 1000,
            story: 1080,
            facebook: 1200,
          }[format] +
            0.01,
      );
    }
  const oversized = makeObject("text", "overflow", {
    text: "Viele Worte ".repeat(30),
    height: 0.03,
    size: 60,
  });
  assert.ok(
    designWarnings({ ...d, objects: [oversized] }).some((w) =>
      w.includes("nicht vollständig"),
    ),
  );
});
test("distribution creates equal visible gaps for objects of different widths", () => {
  const d = {
    ...design(),
    format: "square" as const,
    objects: [
      makeObject("shape", "a", { x: 0.1, width: 0.1 }),
      makeObject("shape", "b", { x: 0.3, width: 0.2 }),
      makeObject("shape", "c", { x: 0.9, width: 0.15 }),
    ],
  };
  const next = designOperation({
    composition: d,
    operation: "distribute",
    ids: ["a", "b", "c"],
    axis: "x",
  }).composition;
  const boxes = next.objects.map((o) => objectGeometry(o, next));
  const gap1 = boxes[1].left - boxes[0].left - boxes[0].width,
    gap2 = boxes[2].left - boxes[1].left - boxes[1].width;
  assert.ok(Math.abs(gap1 - gap2) < 0.001);
});
test("actual JPEG composes independent images, gradient and editable text without altering product pixels", async () => {
  const product = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 220, g: 20, b: 20, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 70,
            height: 70,
            channels: 4,
            background: { r: 220, g: 20, b: 20, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: 15,
        top: 15,
      },
    ])
    .png()
    .toBuffer();
  const detail = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#374151" },
  })
    .png()
    .toBuffer();
  const d = compositionSchema.parse({
    ...design(),
    product_id: "p",
    image_url: "https://media.example.test/p.png",
    format: "square",
    scale: 0.35,
    objects: [
      makeObject("shape", "scrim", {
        plane: "background",
        fill: "#1f2937",
        width: 0.9,
        height: 0.3,
        y: 0.9,
        gradient: { color: "#1f2937", direction: 90, end_opacity: 0 },
      }),
      makeObject("image", "detail", {
        media_id: "m",
        frame: "circle",
        width: 0.2,
        height: 0.2,
        x: 0.9,
        y: 0.1,
      }),
      makeObject("text", "copy", {
        text: "Holz & Orte\nEin besonderer Ort",
        y: 0.85,
        width: 0.8,
        height: 0.2,
        size: 40,
        color: "#ffffff",
      }),
    ],
  });
  const bytes = await renderComposition(product, null, d, null, { m: detail });
  const center = await pixel(bytes, 540, 540);
  assert.ok(center[0] > 200 && center[1] < 40);
  const detailPixel = await pixel(bytes, 886, 194);
  assert.ok(
    Math.abs(detailPixel[0] - 55) < 10 && Math.abs(detailPixel[1] - 65) < 10,
  );
  const svg = await compositionScene(product, null, d, null, { m: detail });
  assert.ok(svg.includes("<path d="));
  assert.ok(!svg.includes("<text "));
  assert.ok(
    svg.indexOf('data-design-object="scrim"') <
      svg.indexOf('data-design-layer="product"'),
  );
  assert.ok(
    svg.indexOf('data-design-object="detail"') >
      svg.indexOf('data-design-layer="product"'),
  );
  assert.equal(
    drawBrandText({
      text: "ÄÖÜ &",
      x: 100,
      y: 100,
      font: "sans",
      size: 30,
      weight: "bold",
      color: "#1f2937",
      align: "left",
      tracking: 0,
    }),
    drawBrandText({
      text: "ÄÖÜ &",
      x: 100,
      y: 100,
      font: "sans",
      size: 30,
      weight: "bold",
      color: "#1f2937",
      align: "left",
      tracking: 0,
    }),
  );
  const escaped = sceneSvg(
    {
      ...d,
      objects: [
        makeObject("text", "unsafe", { text: '<script>alert("x")</script>' }),
      ],
    },
    { width: 1, height: 1 },
    { product: "" },
  );
  assert.ok(!escaped.includes("<script>"));
});
test("no-product JPEG supports workshop layouts and server text wrapping", async () => {
  const d = {
    ...design(),
    objects: [
      makeObject("text", "headline", {
        text: "Ein Blick in unsere Werkstatt",
        y: 0.2,
        width: 0.8,
        height: 0.2,
        size: 44,
      }),
    ],
  };
  const bytes = await renderComposition(Buffer.alloc(0), null, d);
  const m = await sharp(bytes).metadata();
  assert.equal(m.width, 1080);
  assert.equal(m.height, 1350);
});
test("real MP4 export renders object animation with fixed dimensions and H264-compatible signature", async () => {
  const d = {
    ...design(),
    format: "facebook" as const,
    animation_duration: 2,
    objects: [
      makeObject("text", "hello", {
        text: "Smartwerk",
        animation: "rise",
        height: 0.3,
      }),
    ],
  };
  const svg = await compositionScene(Buffer.alloc(0), null, d);
  const bytes = await renderAnimation(svg, d);
  assert.equal(bytes.toString("ascii", 4, 8), "ftyp");
  assert.ok(bytes.length > 1000);
  assert.ok(bytes.length < 15 * 1024 * 1024);
});
test("render admission returns 503 while busy and releases capacity after failure", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const a = withRenderLimit(() => gate),
    b = withRenderLimit(() => gate);
  await assert.rejects(
    withRenderLimit(async () => 0),
    { status: 503 },
  );
  release();
  await Promise.all([a, b]);
  await assert.rejects(
    withRenderLimit(async () => {
      throw new Error("fixture");
    }),
  );
  assert.equal(await withRenderLimit(async () => 42), 42);
});

test("authenticated agent can discover and transform designs without Admin auth; wrong token and control paths fail closed", async () => {
  const previous = process.env.MARKETING_AGENT_TOKEN;
  process.env.MARKETING_AGENT_TOKEN = "editorial-fixture-".repeat(3);
  try {
    const call = async (
      resource: string,
      method = "GET",
      body?: unknown,
      token = process.env.MARKETING_AGENT_TOKEN,
    ) => {
      let status = 200,
        payload: unknown;
      const req = {
        method,
        body,
        query: {},
        headers: { "x-real-ip": "203.0.113.1", "x-marketing-agent-token": token },
        get: () => token,
        scope: {
          resolve() {
            throw new Error("No database access allowed for tools");
          },
        },
      };
      const res = {
        setHeader() {},
        status(code: number) {
          status = code;
          return this;
        },
        json(value: unknown) {
          payload = value;
          return this;
        },
      };
      await handle(req as never, res as never, resource, true);
      return { status, payload };
    };
    const capabilities = await call("design-tools");
    assert.equal(capabilities.status, 200);
    assert.equal(
      (capabilities.payload as { contract_version: number }).contract_version,
      2,
    );
    const resize = await call("design-tools", "POST", {
      composition: design(),
      operation: "resize",
      format: "pin",
    });
    assert.equal(resize.status, 200);
    assert.equal(
      (resize.payload as { composition: { format: string } }).composition
        .format,
      "pin",
    );
    assert.equal(
      (await call("design-tools", "GET", undefined, "wrong-token")).status,
      401,
    );
    for (const resource of ["settings", "approve", "reconcile", "accounts"])
      assert.equal((await call(resource, "POST", {})).status, 403);
    assert.equal(
      (
        await call("design-tools", "POST", {
          composition: design(),
          operation: "resize",
          format: "pin",
          approved: true,
        })
      ).status,
      400,
    );
  } finally {
    if (previous === undefined) delete process.env.MARKETING_AGENT_TOKEN;
    else process.env.MARKETING_AGENT_TOKEN = previous;
  }
});

test("background focal point changes the crop continuously even at zoom 1", async () => {
  const source = await sharp({
    create: { width: 400, height: 100, channels: 3, background: "#f97316" },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 200,
            height: 100,
            channels: 3,
            background: "#374151",
          },
        })
          .png()
          .toBuffer(),
        left: 200,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  const base = { ...design(), background_transform: { x: 0, y: 0.5, zoom: 1 } };
  const left = await renderComposition(Buffer.alloc(0), source, base),
    right = await renderComposition(Buffer.alloc(0), source, {
      ...base,
      background_transform: { x: 1, y: 0.5, zoom: 1 },
    });
  const a = await pixel(left, 540, 675),
    b = await pixel(right, 540, 675);
  assert.ok(a[0] > 200);
  assert.ok(Math.abs(b[0] - 55) < 8 && Math.abs(b[1] - 65) < 8 && Math.abs(b[2] - 81) < 8);
});

test("text outline is visible in actual glyph-path JPEG output", async () => {
  const text = makeObject("text", "label", {
    text: "LIGHTWORKS",
    size: 60,
    width: 0.85,
    height: 0.25,
    color: "#1f2937",
  });
  const base = { ...design(), color: "#374151", objects: [text] };
  const plain = await renderComposition(Buffer.alloc(0), null, base);
  const outlined = await renderComposition(Buffer.alloc(0), null, {
    ...base,
    objects: [{ ...text, effect: "outline" }],
  });
  const countLight = async (bytes: Buffer) => {
    const raw = await sharp(bytes).raw().toBuffer();
    let count = 0;
    for (let i = 0; i < raw.length; i += 3)
      if (raw[i] > 220 && raw[i + 1] > 210 && raw[i + 2] > 180) count++;
    return count;
  };
  assert.equal(await countLight(plain), 0);
  assert.ok((await countLight(outlined)) > 100);
});

test("adaptive resize preserves authored widths through format changes and persisted reloads", () => {
  const source = {
    ...design(),
    layout_mode: "adaptive" as const,
    objects: [
      makeObject("text", "headline", { width: 0.8, layout_role: "headline" }),
      makeObject("text", "narrow", { width: 0.2, layout_role: "body" }),
      makeObject("text", "free", { width: 0.85 }),
    ],
  };
  for (const format of [
    "portrait",
    "square",
    "pin",
    "story",
    "facebook",
  ] as const) {
    const direct = smartResize(source, format);
    const restored = compositionSchema.parse(
      JSON.parse(JSON.stringify(smartResize(source, "facebook"))),
    );
    const roundTrip = smartResize(restored, format);
    assert.deepEqual(roundTrip, direct);
    assert.equal(roundTrip.objects[0].width, 0.8);
    assert.equal(roundTrip.objects[1].width, 0.2);
    const canvasWidth =
      format === "facebook" ? 1200 : format === "pin" ? 1000 : 1080;
    assert.equal(
      objectGeometry(roundTrip.objects[0], roundTrip).width,
      canvasWidth * (format === "facebook" ? 0.38 : 0.8),
    );
    assert.equal(
      objectGeometry(roundTrip.objects[2], roundTrip).width,
      canvasWidth * 0.85,
    );
  }
});

test("pool names remain valid when used to author image objects", () => {
  for (const length of [101, 200]) {
    const object = makeObject("image", "photo", {
      media_id: "pool",
      name: "A".repeat(length),
    });
    const parsed = compositionSchema.parse({ ...design(), objects: [object] });
    assert.equal(parsed.objects[0].name, "A".repeat(100));
  }
  // Declarative API input still fails validation instead of silently changing it.
  assert.throws(() =>
    designObjectSchema.parse({
      ...makeObject("image", "photo", { media_id: "pool" }),
      name: "A".repeat(101),
    }),
  );
});

test("EXIF photo orientation is applied to every exported image layer while upload bytes stay intact", async () => {
  const source = await sharp({
    create: { width: 200, height: 100, channels: 3, background: "#f97316" },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 3,
            background: "#374151",
          },
        })
          .png()
          .toBuffer(),
        left: 100,
        top: 0,
      },
    ])
    .jpeg()
    .toBuffer();
  for (const orientation of [2, 5, 6, 7, 8]) {
    const original = await sharp(source)
      .withMetadata({ orientation })
      .jpeg()
      .toBuffer();
    const before = Buffer.from(original);
    const upload = await inspectUpload({
      mime_type: "image/jpeg",
      content: original.toString("base64"),
      labels: { name: "Photo", generated: false },
    });
    const reference = await sharp(original).autoOrient().png().toBuffer();
    const info = await sharp(reference).metadata();
    assert.equal(upload.width, info.width);
    assert.equal(upload.height, info.height);
    assert.deepEqual(upload.bytes, original);
    const scene = {
      ...design(),
      background_id: "photo",
      overlay: { ...design().overlay, media_id: "photo" },
      objects: [
        makeObject("image", "photo-object", {
          media_id: "photo",
          fit: "cover",
        }),
      ],
    };
    const actual = await renderComposition(
      Buffer.alloc(0),
      original,
      scene,
      original,
      { photo: original },
    );
    const expected = await renderComposition(
      Buffer.alloc(0),
      reference,
      scene,
      reference,
      { photo: reference },
    );
    assert.deepEqual(actual, expected, `orientation ${orientation}`);
    assert.deepEqual(original, before);
  }
});
