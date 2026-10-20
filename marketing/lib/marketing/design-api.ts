import { z, type ZodTypeAny } from "zod";
import {
  compositionSchema,
  designObjectSchema,
  brandSchema,
  id,
  formatSchema,
  MarketingError,
  settingsSchema,
} from "./schema";
import {
  blankDesign,
  brandColors,
  brandFonts,
  builtInTemplates,
  autoFit,
  applyTemplate,
  smartResize,
  convertText,
  designWarnings,
  makeObject,
  distributeObjects,
} from "./design-model";
import { settings, audit, newId, type Database } from "./repository";

export const designOperationSchema = z
  .object({
    composition: compositionSchema,
    operation: z.enum([
      "auto-fit",
      "resize",
      "template",
      "convert-text",
      "add",
      "duplicate",
      "remove",
      "group",
      "ungroup",
      "align",
      "distribute",
    ]),
    format: formatSchema.optional(),
    template_id: z.string().max(100).optional(),
    object: designObjectSchema.optional(),
    ids: z.array(id).min(1).max(50).optional(),
    alignment: z
      .enum(["left", "center", "right", "top", "middle", "bottom"])
      .optional(),
    axis: z.enum(["x", "y"]).optional(),
  })
  .strict();
export function designOperation(raw: unknown) {
  const input = designOperationSchema.parse(raw);
  let d = input.composition;
  const selected = d.objects.filter((o) => input.ids?.includes(o.id));
  if (input.ids && selected.length !== input.ids.length)
    throw new MarketingError("Objekt nicht gefunden oder doppelt gewählt.");
  if (selected.some((o) => o.locked))
    throw new MarketingError("Gesperrte Objekte zuerst entsperren.");
  if (input.operation === "auto-fit") d = autoFit(d);
  else if (input.operation === "resize") {
    if (!input.format) throw new MarketingError("format fehlt.");
    d = smartResize(d, input.format);
  } else if (input.operation === "template") {
    if (!builtInTemplates.some((t) => t.id === input.template_id))
      throw new MarketingError("Vorlage nicht gefunden.");
    d = applyTemplate(d, input.template_id!);
  } else if (input.operation === "convert-text") d = convertText(d);
  else if (input.operation === "add") {
    if (!input.object) throw new MarketingError("object fehlt.");
    d = { ...d, objects: [...d.objects, input.object] };
  } else {
    if (!selected.length) throw new MarketingError("ids fehlt.");
    if (input.operation === "duplicate")
      d = {
        ...d,
        objects: [
          ...d.objects,
          ...selected.map((o) => ({
            ...o,
            id: newId("object"),
            name: `${o.name} Kopie`.slice(0, 100),
            group: null,
            x: Math.min(1, o.x + 0.03),
            y: Math.min(1, o.y + 0.03),
          })),
        ],
      };
    if (input.operation === "remove")
      d = {
        ...d,
        objects: d.objects.filter((o) => !input.ids!.includes(o.id)),
      };
    if (input.operation === "group" || input.operation === "ungroup") {
      const group = input.operation === "group" ? newId("group") : null;
      d = {
        ...d,
        objects: d.objects.map((o) =>
          input.ids!.includes(o.id) ? { ...o, group } : o,
        ),
      };
    }
    if (input.operation === "align") {
      if (!input.alignment) throw new MarketingError("alignment fehlt.");
      const align = input.alignment,
        axis = ["left", "center", "right"].includes(align) ? "x" : "y",
        value = ["left", "top"].includes(align)
          ? 0
          : ["right", "bottom"].includes(align)
            ? 1
            : 0.5;
      d = {
        ...d,
        objects: d.objects.map((o) =>
          input.ids!.includes(o.id) ? { ...o, [axis]: value } : o,
        ),
      };
    }
    if (input.operation === "distribute") {
      if (!input.axis || selected.length < 3)
        throw new MarketingError(
          "Mindestens drei Objekte und axis erforderlich.",
        );
      d = distributeObjects(d, input.ids!, input.axis);
    }
  }
  const composition = compositionSchema.parse(d);
  return { composition, warnings: designWarnings(composition) };
}
export const designSaveSchema = z
  .object({
    revision: z.number().int().positive(),
    id: id.optional(),
    action: z.enum(["save", "restore", "delete"]).default("save"),
    name: z.string().trim().min(1).max(100).optional(),
    composition: compositionSchema.optional(),
    is_template: z.boolean().optional(),
    version_id: id.optional(),
  })
  .strict();
export async function saveDesign(db: Database, raw: unknown, actor: string) {
  const input = designSaveSchema.parse(raw);
  return db.transaction(async (tx) => {
    const row = await settings(tx, true);
    if (row.revision !== input.revision)
      throw new MarketingError(
        "Gestaltungen wurden inzwischen geändert. Neu laden.",
        409,
      );
    const value = settingsSchema.parse(row.value),
      previous = value.design_drafts.find((d) => d.id === input.id);
    if (input.id && !previous)
      throw new MarketingError("Gestaltung nicht gefunden.", 404);
    const designId = previous?.id || newId("design");
    if (input.action === "delete" && !previous)
      throw new MarketingError("id fehlt.");
    let composition = input.composition;
    if (input.action === "restore") {
      const snapshot = previous?.versions.find(
        (v) => v.id === input.version_id,
      );
      if (!snapshot) throw new MarketingError("Version nicht gefunden.", 404);
      composition = snapshot.composition;
    }
    if (input.action !== "delete") {
      if (!composition) throw new MarketingError("composition fehlt.");
      const draft = {
        id: designId,
        name: input.name || previous?.name || "Gestaltung",
        composition,
        is_template: input.is_template ?? previous?.is_template ?? false,
        versions: [
          ...(previous?.versions || []),
          {
            id: newId("version"),
            saved_at: new Date().toISOString(),
            composition,
          },
        ].slice(-20),
      };
      value.design_drafts = [
        ...value.design_drafts.filter((d) => d.id !== designId),
        draft,
      ];
    } else
      value.design_drafts = value.design_drafts.filter(
        (d) => d.id !== designId,
      );
    const validated = settingsSchema.parse(value);
    await tx.raw(
      "update marketing_settings set value=?::jsonb,revision=revision+1,updated_at=now() where id='global'",
      [JSON.stringify(validated)],
    );
    await audit(tx, actor, `design.${input.action}`, designId);
    return {
      revision: row.revision + 1,
      design: validated.design_drafts.find((d) => d.id === designId) || null,
    };
  });
}
export const brandSaveSchema = z
  .object({ revision: z.number().int().positive(), brand: brandSchema })
  .strict();
export async function saveBrand(db: Database, raw: unknown, actor: string) {
  const input = brandSaveSchema.parse(raw);
  return db.transaction(async (tx) => {
    const row = await settings(tx, true);
    if (row.revision !== input.revision)
      throw new MarketingError(
        "Markenbibliothek wurde geändert. Neu laden.",
        409,
      );
    const value = settingsSchema.parse({ ...row.value, brand: input.brand });
    await tx.raw(
      "update marketing_settings set value=?::jsonb,revision=revision+1,updated_at=now() where id='global'",
      [JSON.stringify(value)],
    );
    await audit(tx, actor, "brand.save", "global");
    return { revision: row.revision + 1, brand: value.brand };
  });
}
// Describe the same Zod contracts used by the handlers, rather than a drifting handwritten schema.
export function jsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const d = schema._def;
  if (d.typeName === "ZodDefault")
    return { ...jsonSchema(d.innerType), default: d.defaultValue() };
  if (d.typeName === "ZodOptional") return jsonSchema(d.innerType);
  if (d.typeName === "ZodNullable")
    return { anyOf: [jsonSchema(d.innerType), { type: "null" }] };
  if (d.typeName === "ZodEffects") return jsonSchema(d.schema);
  if (d.typeName === "ZodObject") {
    const shape = d.shape();
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(shape).map(([key, s]) => [
          key,
          jsonSchema(s as ZodTypeAny),
        ]),
      ),
      required: Object.entries(shape)
        .filter(([, s]) => !(s as ZodTypeAny).isOptional())
        .map(([key]) => key),
      additionalProperties: false,
    };
  }
  if (d.typeName === "ZodArray")
    return {
      type: "array",
      items: jsonSchema(d.type),
      ...(d.minLength ? { minItems: d.minLength.value } : {}),
      ...(d.maxLength ? { maxItems: d.maxLength.value } : {}),
      ...(d.exactLength
        ? { minItems: d.exactLength.value, maxItems: d.exactLength.value }
        : {}),
    };
  if (d.typeName === "ZodEnum") return { type: "string", enum: d.values };
  if (d.typeName === "ZodLiteral") return { const: d.value };
  if (d.typeName === "ZodUnion" || d.typeName === "ZodDiscriminatedUnion")
    return { anyOf: d.options.map(jsonSchema) };
  if (d.typeName === "ZodBoolean") return { type: "boolean" };
  if (d.typeName === "ZodNumber" || d.typeName === "ZodString") {
    const result: Record<string, unknown> = {
      type: d.typeName === "ZodNumber" ? "number" : "string",
    };
    for (const c of d.checks) {
      if (c.kind === "int") result.type = "integer";
      if (c.kind === "min")
        result[d.typeName === "ZodString" ? "minLength" : "minimum"] = c.value;
      if (c.kind === "max")
        result[d.typeName === "ZodString" ? "maxLength" : "maximum"] = c.value;
      if (c.kind === "regex") result.pattern = c.regex.source;
      if (c.kind === "url") result.format = "uri";
      if (c.kind === "datetime") result.format = "date-time";
    }
    return result;
  }
  return {};
}
export function designCapabilities() {
  return {
    contract_version: 2,
    validation_notes: [
      "Object IDs unique within each page; reserve background/product/text/overlay",
      "product_id and image_url must both be present or both empty",
      "Images must reference eligible pool assets; maximum ten unique image sources per page",
      "Composition pages contain scenes without a nested pages property",
      "Element locks are authoring controls; API input remains declarative",
    ],
    colors: brandColors,
    fonts: brandFonts,
    font_families: { sans: "Manrope", display: "Cormorant Garamond" },
    templates: builtInTemplates,
    operations: jsonSchema(designOperationSchema),
    composition: jsonSchema(compositionSchema),
    design_save: jsonSchema(designSaveSchema),
    brand_save: jsonSchema(brandSaveSchema),
    limits: {
      objects_per_page: 50,
      pages: 10,
      export_items: 10,
      versions: 20,
      mp4_export_items: 3,
    },
    example: {
      ...blankDesign(),
      objects: [
        makeObject("text", "headline", {
          text: "Ein besonderer Ort",
          y: 0.15,
          width: 0.85,
          height: 0.2,
        }),
      ],
    },
    resources: {
      "design-tools": "GET capabilities; POST validated transform",
      designs: "GET list/id; POST save/restore/delete with revision",
      brand: "GET library; POST scoped library update with revision",
      "design-preview": "POST composition: JPEG base64 + warnings",
      "design-export":
        "POST composition, formats[], output jpeg|mp4: ordered media/results",
      posts: "GET/POST calendar drafts and schedule with revision",
      compose: "POST one JPEG",
    },
    publication:
      "Draft generation and scheduling use posts. Human approval remains required.",
  };
}
