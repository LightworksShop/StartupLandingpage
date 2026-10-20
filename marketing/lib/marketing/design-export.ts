import { z } from "zod";
import { animationFrame, animationFps } from "./design-animation";
import sharp from "sharp";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MarketingHost } from "../../server/host";
import {
  compositionSchema,
  formatSchema,
  MarketingError,
  formats,
} from "./schema";
import {
  documentPages,
  smartResize,
  designWarnings,
  safeZone,
} from "./design-model";
import { prepareComposition, compositionScene, storeMedia } from "./media";
export const designExportSchema = z
  .object({
    composition: compositionSchema,
    formats: z.array(formatSchema).min(1).max(5),
    output: z.enum(["jpeg", "mp4"]).default("jpeg"),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.formats).size === v.formats.length &&
      (v.composition.pages.length + 1) * v.formats.length <= 10 &&
      (v.output !== "mp4" ||
        (v.composition.pages.length + 1) * v.formats.length <= 3),
    "Höchstens zehn eindeutige JPEG- bzw. drei MP4-Exporte pro Anfrage",
  );
export const designPreviewSchema = z
  .object({
    composition: compositionSchema,
    format: formatSchema.optional(),
    page: z.number().int().min(1).max(10).default(1),
    width: z.number().int().min(160).max(1080).optional(),
  })
  .strict();
let running = 0;
export async function withRenderLimit<T>(work: () => Promise<T>) {
  if (running >= 2)
    throw new MarketingError(
      "Bildgestaltung ausgelastet. Später erneut versuchen.",
      503,
    );
  running++;
  try {
    return await work();
  } finally {
    running--;
  }
}
export async function renderAnimation(
  svg: string,
  input: z.infer<typeof compositionSchema>,
) {
  const directory = await mkdtemp(join(tmpdir(), "smartwerk-design-")),
    deadline = Date.now() + 120000;
  try {
    const frames = input.animation_duration * animationFps;
    for (let i = 0; i < frames; i++) {
      if (Date.now() > deadline)
        throw new MarketingError(
          "Animationsrendering hat das Zeitlimit überschritten.",
          503,
        );
      const frame = animationFrame(svg, input, i / animationFps);
      await writeFile(
        join(directory, `frame-${String(i).padStart(3, "0")}.jpg`),
        await sharp(Buffer.from(frame))
          .flatten({ background: input.color })
          .jpeg({ quality: 90 })
          .toBuffer(),
      );
    }
    const output = join(directory, "design.mp4");
    await new Promise<void>((resolve, reject) => {
      const process = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-framerate",
          String(animationFps),
          "-i",
          join(directory, "frame-%03d.jpg"),
          "-an",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-threads",
          "2",
          output,
        ],
        { stdio: ["ignore", "ignore", "ignore"] },
      );
      const timer = setTimeout(
        () => {
          process.kill("SIGKILL");
          reject(
            new MarketingError(
              "Videoexport hat das Zeitlimit überschritten.",
              503,
            ),
          );
        },
        Math.max(1, deadline - Date.now()),
      );
      process.on("error", () => {
        clearTimeout(timer);
        reject(
          new MarketingError(
            "Videoexport benötigt FFmpeg auf dem Server.",
            503,
          ),
        );
      });
      process.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new MarketingError("Videoexport fehlgeschlagen.", 503));
      });
    });
    if ((await stat(output)).size > 15 * 1024 * 1024)
      throw new MarketingError("Videoexport größer als 15 MiB.");
    return readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
export async function previewDesign(scope: MarketingHost, raw: unknown) {
  const input = designPreviewSchema.parse(raw),
    page = documentPages(input.composition)[input.page - 1];
  if (!page) throw new MarketingError("Seite nicht gefunden.", 404);
  const design = input.format ? smartResize(page, input.format) : page;
  return withRenderLimit(async () => {
    const p = await prepareComposition(scope, design),
      svg = await compositionScene(
        p.foreground,
        p.backdrop,
        p.input,
        p.logo,
        p.objects,
      );
    const raster = sharp(Buffer.from(svg));
    if (input.width) raster.resize({ width: input.width });
    const bytes = await raster
      .flatten({ background: design.color })
      .jpeg({ quality: 94 })
      .toBuffer();
    return {
      mime_type: "image/jpeg",
      content: bytes.toString("base64"),
      width: input.width || formats[design.format][0],
      height: Math.round(
        (formats[design.format][1] *
          (input.width || formats[design.format][0])) /
          formats[design.format][0],
      ),
      canvas_width: formats[design.format][0],
      canvas_height: formats[design.format][1],
      page: input.page,
      warnings: designWarnings(design),
      safe_zone: safeZone(design.format),
    };
  });
}
export async function exportDesign(
  scope: MarketingHost,
  raw: unknown,
  actor: string,
) {
  const input = designExportSchema.parse(raw);
  return withRenderLimit(async () => {
    const results: Record<string, unknown>[] = [],
      media = [];
    const pages = documentPages(input.composition);
    for (let page = 0; page < pages.length; page++)
      for (const format of input.formats) {
        const design = smartResize(pages[page], format);
        try {
          const p = await prepareComposition(scope, design),
            svg = await compositionScene(
              p.foreground,
              p.backdrop,
              p.input,
              p.logo,
              p.objects,
            );
          const bytes =
            input.output === "mp4"
              ? await renderAnimation(svg, design)
              : await sharp(Buffer.from(svg))
                  .flatten({ background: design.color })
                  .jpeg({ quality: 94 })
                  .toBuffer();
          const m = await storeMedia(
            scope,
            bytes,
            {
              ...p.labels,
              name: `${p.labels.name} · Seite ${page + 1}`.slice(0, 200),
              source: "composition",
              composition: design,
              mime_type: input.output === "mp4" ? "video/mp4" : "image/jpeg",
              width: formats[format][0],
              height: formats[format][1],
            },
            actor,
          );
          media.push(m);
          results.push({
            page: page + 1,
            format,
            media_id: m.id,
            warnings: designWarnings(design),
          });
        } catch (error) {
          results.push({
            page: page + 1,
            format,
            error:
              error instanceof MarketingError
                ? error.message
                : "Export fehlgeschlagen.",
            status: error instanceof MarketingError ? error.status : 500,
          });
        }
      }
    return {
      media,
      results,
      complete: media.length === pages.length * input.formats.length,
    };
  });
}
