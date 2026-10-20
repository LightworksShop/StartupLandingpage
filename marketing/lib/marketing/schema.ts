import { createHash } from "node:crypto";
import { z } from "zod";
import { linkedinAuthor } from "./linkedin-contract";

export const channelSchema = z.enum(["instagram", "pinterest", "facebook", "linkedin"]);
export type Channel = z.infer<typeof channelSchema>;
export const id = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-zA-Z0-9_-]+$/);
export { formats } from "./design-model";
import { brandColors, defaultLayers } from "./design-model";
export const formatSchema = z.enum([
  "square",
  "portrait",
  "pin",
  "story",
  "facebook",
]);
const httpsUrl = z
  .string()
  .url()
  .max(2000)
  .refine((v) => {
    if (!URL.canParse(v)) return false;
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Öffentliche HTTPS-URL erforderlich");
export const versionSchema = z
  .object({
    channel: channelSchema,
    target_id: linkedinAuthor.nullable().default(null),
    title: z.string().max(100).default(""),
    text: z.string().max(3000).default(""),
    alt: z.string().max(4086).default(""),
    media_id: id.nullable().default(null),
    cover_media_id: id.nullable().default(null),
    link: z.union([httpsUrl, z.literal("")]).default(""),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.channel !== "linkedin" && v.target_id) ctx.addIssue({code: "custom", path: ["target_id"], message: "Ein Beitragsziel wird nur für LinkedIn unterstützt."});
    const max = v.channel === "linkedin" ? 3000 : v.channel === "pinterest" ? 800 : 2200;
    if (v.text.length > max) ctx.addIssue({code: "custom", path: ["text"], message: `Höchstens ${max} Zeichen für ${v.channel}.`});
    if (v.channel !== "linkedin" && v.alt.length > 500) ctx.addIssue({code: "custom", path: ["alt"], message: "Höchstens 500 Zeichen Alternativtext."});
    if (v.channel === "linkedin" && (v.title || v.link || v.cover_media_id)) ctx.addIssue({code: "custom", message: "LinkedIn: Link in den Beitragstext schreiben; Titel und Video-Titelbild werden nicht unterstützt."});
  });
export const contentSchema = z
  .object({
    topic: z.string().trim().min(1).max(200),
    notes: z.string().max(5000).default(""),
    product_ids: z.array(id).max(20).default([]),
    versions: z
      .array(versionSchema)
      .min(1)
      .max(4)
      .refine(
        (v) => new Set(v.map((x) => x.channel)).size === v.length,
        "Kanal doppelt",
      ),
  })
  .strict();
export type Content = z.infer<typeof contentSchema>;
export const draftSchema = z
  .object({
    id: id.optional(),
    revision: z.number().int().positive().optional(),
    content: contentSchema,
    scheduled_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict()
  .refine((v) => !v.id || v.revision, "Revision fehlt");
export const animationEffects = [
  "none",
  "fade",
  "rise",
  "slide",
  "pop",
  "reveal",
  "words",
] as const;
const animationTimingSchema = z
  .object({
    effect: z.enum(animationEffects).default("none"),
    start: z.number().min(0).max(8).default(0),
    duration: z.number().min(0.2).max(3).default(1),
    direction: z.enum(["up", "down", "left", "right"]).default("up"),
  })
  .strict();
export const animationSettingsSchema = z
  .object({
    preset: z
      .enum(["none", "custom", "focus", "personalization", "calm"])
      .default("none"),
    strength: z.number().min(0).max(1).default(0.5),
    scene_zoom: z.boolean().default(false),
    layers: z
      .object({
        product: animationTimingSchema.default({}),
        headline: animationTimingSchema.default({}),
        subtitle: animationTimingSchema.default({}),
        cta: animationTimingSchema.default({}),
        overlay: animationTimingSchema.default({}),
      })
      .strict()
      .default({}),
  })
  .strict();
const objectBase = {
  id,
  name: z.string().trim().min(1).max(100),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  width: z.number().min(0.02).max(1).default(0.5),
  height: z.number().min(0.01).max(1).default(0.15),
  rotation: z.number().min(-180).max(180).default(0),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  group: id.nullable().default(null),
  plane: z.enum(["background", "foreground"]).default("foreground"),
  layout_role: z.enum(["free", "headline", "body", "cta"]).default("free"),
  animation: z.enum(animationEffects).default("none"),
  animation_start: z.number().min(0).max(8).default(0),
  animation_time: z.number().min(0.2).max(3).default(1),
  animation_direction: z.enum(["up", "down", "left", "right"]).default("up"),
};
const color = z.enum(brandColors);
export const designObjectSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...objectBase,
      type: z.literal("text"),
      text: z.string().max(600).default("Text"),
      font: z.enum(["sans", "display"]).default("sans"),
      size: z.number().min(12).max(160).default(44),
      weight: z.enum(["regular", "bold"]).default("bold"),
      color: color.default("#1f2937"),
      align: z.enum(["left", "center", "right"]).default("center"),
      line_height: z.number().min(0.8).max(2).default(1.2),
      tracking: z.number().min(-2).max(12).default(0),
      background: color.nullable().default(null),
      padding: z.number().min(0).max(40).default(12),
      radius: z.number().min(0).max(100).default(0),
      effect: z.enum(["none", "shadow", "outline"]).default("none"),
    })
    .strict(),
  z
    .object({
      ...objectBase,
      type: z.literal("shape"),
      shape: z.enum(["rect", "ellipse", "line", "arrow"]).default("rect"),
      fill: color.nullable().default("#f97316"),
      stroke: color.nullable().default(null),
      stroke_width: z.number().min(0).max(30).default(2),
      radius: z.number().min(0).max(200).default(16),
      gradient: z
        .object({
          color,
          direction: z.number().min(-180).max(180).default(90),
          end_opacity: z.number().min(0).max(1).default(0),
        })
        .strict()
        .nullable()
        .default(null),
    })
    .strict(),
  z
    .object({
      ...objectBase,
      type: z.literal("image"),
      media_id: id,
      frame: z.enum(["rect", "circle", "rounded"]).default("rect"),
      fit: z.enum(["contain", "cover"]).default("contain"),
      zoom: z.number().min(1).max(4).default(1),
      focal_x: z.number().min(0).max(1).default(0.5),
      focal_y: z.number().min(0).max(1).default(0.5),
      radius: z.number().min(0).max(200).default(24),
    })
    .strict(),
]);
export type DesignObject = z.infer<typeof designObjectSchema>;
export const brandSchema = z
  .object({
    logos: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            media_id: id,
            variant: z.enum(["light", "dark", "standard"]).default("standard"),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    text_styles: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            font: z.enum(["sans", "display"]),
            size: z.number().min(12).max(160),
            weight: z.enum(["regular", "bold"]),
            color,
          })
          .strict(),
      )
      .max(20)
      .default([]),
  })
  .strict();
const layerId = z.enum(["background", "product", "text", "overlay"]);
export const sceneSchema = z
  .object({
    product_id: id.nullable(),
    image_url: z.union([z.string().url().max(2000), z.literal("")]),
    background_id: id.nullable(),
    template: z.enum(["plain", "caption"]),
    format: formatSchema,
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(0.1).max(1),
    text: z.string().max(80).default(""),
    subtitle: z.string().max(100).default(""),
    rotation: z.number().min(-180).max(180).default(0),
    aspect_locked: z.boolean().default(true),
    stretch: z.number().min(0.5).max(2).default(1),
    cta: z.string().max(60).default(""),
    font: z.enum(["sans", "display"]).default("sans"),
    text_color: z.enum(brandColors).default("#1f2937"),
    text_x: z.number().min(0).max(1).default(0.5),
    text_y: z.number().min(0).max(1).default(0.86),
    text_scale: z.number().min(0.5).max(3).default(1),
    shadow: z
      .object({
        strength: z.number().min(0).max(1).default(0),
        softness: z.number().min(0).max(80).default(18),
        distance: z.number().min(0).max(150).default(16),
        direction: z.number().min(-180).max(180).default(45),
      })
      .strict()
      .default({}),
    adjustments: z
      .object({
        brightness: z.number().min(0).max(2).default(1),
        contrast: z.number().min(0).max(2).default(1),
        saturation: z.number().min(0).max(2).default(1),
        blur: z.number().min(0).max(50).default(0),
        hue: z.number().min(-180).max(180).default(0),
      })
      .strict()
      .default({}),
    overlay: z
      .object({
        media_id: id.nullable().default(null),
        x: z.number().min(0).max(1).default(0.85),
        y: z.number().min(0).max(1).default(0.12),
        scale: z.number().min(0.05).max(0.8).default(0.15),
        rotation: z.number().min(-180).max(180).default(0),
        opacity: z.number().min(0).max(1).default(1),
      })
      .strict()
      .default({}),
    layers: z
      .array(
        z
          .object({ id: layerId, visible: z.boolean(), locked: z.boolean() })
          .strict(),
      )
      .length(4)
      .refine(
        (layers) => new Set(layers.map((layer) => layer.id)).size === 4,
        "Jede Ebene genau einmal erforderlich",
      )
      .default(defaultLayers),
    objects: z.array(designObjectSchema).max(50).default([]),
    background_transform: z
      .object({
        x: z.number().min(0).max(1).default(0.5),
        y: z.number().min(0).max(1).default(0.5),
        zoom: z.number().min(1).max(4).default(1),
      })
      .strict()
      .default({}),
    layout_mode: z.enum(["anchors", "adaptive"]).default("anchors"),
    animation_duration: z.number().int().min(2).max(8).default(4),
    animation_settings: animationSettingsSchema.default({}),
    color: z
      .string()
      .regex(/^#[a-fA-F0-9]{6}$/)
      .default("#eee9df"),
  })
  .strict();
const validScene = (v: z.infer<typeof sceneSchema>) =>
  new Set(v.objects.map((o) => o.id)).size === v.objects.length &&
  !v.objects.some((o) =>
    ["background", "product", "text", "overlay"].includes(o.id),
  ) &&
  !v.objects.some(
    (o) => o.type !== "text" && ["words", "reveal"].includes(o.animation),
  ) &&
  ["none", "fade"].includes(v.animation_settings.layers.product.effect) &&
  !["words", "reveal"].includes(v.animation_settings.layers.overlay.effect) &&
  !!v.product_id === !!v.image_url;
export const compositionSchema = sceneSchema
  .extend({
    pages: z
      .array(
        sceneSchema.refine(
          validScene,
          "Ungültige Objekt- oder Produktzuordnung",
        ),
      )
      .max(9)
      .default([]),
  })
  .strict()
  .refine(
    validScene,
    "Objekt-IDs müssen eindeutig sein; Produkt und Bild gemeinsam wählen",
  );
export type Composition = z.infer<typeof compositionSchema>;
export const settingsSchema = z
  .object({
    brand: brandSchema.default({}),
    media_folders: z
      .array(z.string().trim().min(1).max(80))
      .max(100)
      .default([]),
    design_drafts: z
      .array(
        z
          .object({
            id,
            name: z.string().trim().min(1).max(100),
            composition: compositionSchema,
            is_template: z.boolean().default(false),
            versions: z
              .array(
                z
                  .object({
                    id,
                    saved_at: z.string().datetime(),
                    composition: compositionSchema,
                  })
                  .strict(),
              )
              .max(20)
              .default([]),
          })
          .strict(),
      )
      .max(100)
      .default([]),
    paused: z.boolean(),
    timezone: z.literal("Europe/Berlin"),
    slots: z
      .array(
        z
          .object({
            day: z.number().int().min(1).max(7),
            time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            channel: channelSchema,
            topic: z.string().min(1).max(200),
          })
          .strict(),
      )
      .max(30),
    seasons: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            from: z.string().date(),
            to: z.string().date(),
          })
          .strict()
          .refine((v) => v.from <= v.to),
      )
      .max(30),
    repeat_days: z.number().int().min(0).max(365),
    feed_exclusions: z.array(id).max(10000).optional(),
    preferences: z
      .record(id, z.enum(["prefer", "exclude"]))
      .refine((v) => Object.keys(v).length <= 10000),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const mediaLabelsSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    product_ids: z.array(id).max(20).default([]),
    category: z
      .enum(["image", "video", "background", "overlay", "other"])
      .optional(),
    folder: z.string().trim().max(80).optional(),
    generated: z.boolean(),
    provenance: z.string().max(1000).default(""),
  })
  .strict()
  .refine(
    (v) => !v.generated || !!v.provenance.trim(),
    "Generierte Medien benötigen Herkunft/Modellhinweis",
  );
export type Media = z.infer<typeof mediaLabelsSchema> & {
  id: string;
  url: string;
  file_id: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  checksum: string;
  size: number;
  source: "upload" | "composition" | "product";
  composition?: z.infer<typeof compositionSchema>;
};
export type Post = {
  id: string;
  revision: number;
  content: Content;
  scheduled_at: string | null;
  approved: Approval | null;
};
export type Approval = {
  revision: number;
  hash: string;
  actor: string;
  at: string;
  media: Record<string, Media>;
  targets: Record<string, string>;
};
export function digest(value: unknown) {
  const canonical = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object")
      return Object.fromEntries(
        Object.entries(input)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, canonical(item)]),
      );
    return input;
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
export function approvalHash(
  post: Pick<Post, "content" | "scheduled_at">,
  media: Record<string, Media>,
  targets: Record<string, string>,
) {
  return digest({
    content: contentSchema.parse(post.content),
    scheduled_at: post.scheduled_at
      ? new Date(post.scheduled_at).toISOString()
      : null,
    media,
    targets,
  });
}
export class MarketingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function assertEditable(states: string[]) {
  if (states.length)
    throw new MarketingError(
      "Versand bereits begonnen. Historie prüfen; für neue Inhalte einen neuen Entwurf anlegen.",
      409,
    );
}
export function validateReady(post: Post, media: Record<string, Media>) {
  for (const v of post.content.versions) {
    if (v.channel === "facebook")
      throw new MarketingError(
        "Facebook ist vorbereitet, aber noch nicht zur Veröffentlichung angebunden.",
      );
    const m = v.media_id && media[v.media_id];
    if (!m || !v.text.trim() || !v.alt.trim())
      throw new MarketingError(
        `${v.channel}: Text, Alternativtext und Medium erforderlich.`,
      );
    if (v.channel === "linkedin" && (!["image/jpeg", "image/png"].includes(m.mime_type) || !m.width || !m.height || m.width * m.height >= 36_152_320 || m.size > 15 * 1024 * 1024))
      throw new MarketingError("LinkedIn benötigt ein JPEG- oder PNG-Bild mit weniger als 36.152.320 Pixeln und höchstens 15 MiB.");
    if (!m.url.startsWith("https://"))
      throw new MarketingError(
        "Veröffentlichung benötigt öffentlich erreichbare HTTPS-Medien.",
      );
    if (v.channel === "pinterest" && (v.text.length > 800 || !v.title.trim()))
      throw new MarketingError(
        "Pinterest benötigt einen Titel und höchstens 800 Zeichen Beschreibung.",
      );
    if (m.mime_type.startsWith("video/")) {
      if (v.channel === "pinterest") {
        const cover = v.cover_media_id && media[v.cover_media_id];
        if (
          !cover ||
          !cover.mime_type.startsWith("image/") ||
          !cover.url.startsWith("https://")
        )
          throw new MarketingError(
            "Pinterest-Videos benötigen ein öffentliches Titelbild aus dem Medienpool.",
          );
      }
    } else {
      if (v.channel === "instagram" && m.mime_type !== "image/jpeg")
        throw new MarketingError(
          "Instagram benötigt JPEG; Bildgestaltung erzeugt passende JPEG-Dateien.",
        );
      const ratio = (m.width || 0) / (m.height || 1);
      if (
        v.channel === "instagram" &&
        (ratio < 0.8 ||
          ratio > 1.91 ||
          (m.width || 0) < 320 ||
          m.size > 8 * 1024 * 1024)
      )
        throw new MarketingError(
          "Instagram-Bildformat ungültig (Seitenverhältnis 4:5 bis 1.91:1, mindestens 320 px, maximal 8 MiB).",
        );
    }
  }
}
