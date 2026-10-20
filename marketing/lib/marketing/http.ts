import { linkedinPost } from "./linkedin-contract";
import type {
  AuthenticatedRequest,
  MarketingRequest,
  MarketingResponse,
} from "../../server/host";
import { z } from "zod";
import { authorizeTokenHeader, allowPublicMutation } from "../../server/agent-auth";
import {
  audit,
  approvePost,
  database,
  getMedia,
  getPost,
  rows,
  saveDraft,
  saveSettings,
  settings,
  revokePost,
  postVersions,
  withPostStates,
} from "./repository";
import {
  compositionSchema,
  draftSchema,
  MarketingError,
  mediaLabelsSchema,
} from "./schema";
import {
  importProductMedia,
  composeMedia,
  uploadMedia,
  uploadSchema,
} from "./media";
import { products, assertProducts } from "./catalog";
import { accountSummaries } from "./accounts";
import { connectionState } from "./providers";
import { reconcile, validateApproval } from "./publishing";
import { proposeWeek } from "./planning";
import {
  designOperation,
  designCapabilities,
  designSaveSchema,
  saveDesign,
  brandSaveSchema,
  saveBrand,
  jsonSchema as designCapabilitiesSchema,
} from "./design-api";
import {
  previewDesign,
  exportDesign,
  withRenderLimit,
  designExportSchema,
  designPreviewSchema,
} from "./design-export";
import { documentPages, brandColors, brandFonts } from "./design-model";
import { automaticProductIds } from "./post-model";
import type { Media, Post } from "./schema";

// Agent routes have their own credential and an explicit operation allowlist.
// Native Admin API keys are NOT accepted for human approval/settings/recovery.
export function humanActor(req: AuthenticatedRequest) {
  if (
    req.auth_context?.actor_type !== "user" ||
    !req.auth_context.actor_id ||
    req.auth_context.auth_identity_id === "api-key"
  )
    throw new MarketingError("Persönliche Admin-Anmeldung erforderlich.", 403);
  return `user:${req.auth_context.actor_id}`;
}
export async function handle(
  req: MarketingRequest,
  res: MarketingResponse,
  resource: string,
  agent = false,
) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    let actor: string;
    if (agent) {
      if (
        !authorizeTokenHeader(req, res, {
          environmentVariable: "MARKETING_AGENT_TOKEN",
          header: "x-marketing-agent-token",
        })
      )
        return;
      actor = "agent:editorial";
      if (
        ![
          "products",
          "media",
          "posts",
          "history",
          "planning",
          "compose",
          "design-tools",
          "designs",
          "brand",
          "design-preview",
          "design-export",
        ].includes(resource)
      )
        throw new MarketingError("Agentenzugriff nicht erlaubt.", 403);
      if (
        !(await allowPublicMutation(
          req.headers as Record<string, string | string[] | undefined>,
          "marketing-agent",
          120,
          60,
        ))
      )
        return res.status(429).json({ message: "Zu viele Anfragen." });
    } else actor = humanActor(req as AuthenticatedRequest);
    if (resource === "design-tools") {
      if (req.method === "GET")
        return res.json({
          ...designCapabilities(),
          design_export: designCapabilitiesSchema(designExportSchema),
          design_preview: designCapabilitiesSchema(designPreviewSchema),
        });
      if (req.method === "POST") return res.json(designOperation(req.body));
      throw new MarketingError("Operation nicht unterstützt.", 405);
    }
    const db = database(req.scope),
      write = req.method === "POST";
    const paging = z
      .object({ offset: z.coerce.number().int().min(0).max(100000).default(0) })
      .parse(req.query);
    const offset = paging.offset;
    if (resource === "designs") {
      if (!write) {
        const row = await settings(db),
          designs = row.value.design_drafts || [];
        const requested =
          typeof req.query.id === "string" ? req.query.id : null;
        if (requested && !designs.some((d) => d.id === requested))
          throw new MarketingError("Gestaltung nicht gefunden.", 404);
        return res.json({
          revision: row.revision,
          ...(requested
            ? { design: designs.find((d) => d.id === requested) }
            : { designs }),
        });
      }
      const input = designSaveSchema.parse(req.body);
      if (input.composition)
        await validateDesignReferences(req, input.composition);
      return res.json(await saveDesign(db, input, actor));
    }
    if (resource === "brand") {
      if (!write) {
        const row = await settings(db);
        return res.json({
          revision: row.revision,
          brand: row.value.brand || { logos: [], text_styles: [] },
          colors: brandColors,
          fonts: brandFonts,
        });
      }
      const input = brandSaveSchema.parse(req.body);
      for (const logo of input.brand.logos)
        if (!(await getMedia(db, logo.media_id)).mime_type.startsWith("image/"))
          throw new MarketingError("Logo muss ein Bild sein.");
      return res.json(await saveBrand(db, input, actor));
    }
    if (resource === "design-preview" && write)
      return res.json(await previewDesign(req.scope, req.body));
    if (resource === "design-export" && write)
      return res.json(await exportDesign(req.scope, req.body, actor));
    if (resource === "products" && !write) {
      const catalog = await products(req.scope, offset);
      const usage = await rows<{ product_id: string; last_used_at: string }>(
        db,
        `
        select referenced.product_id, max(pub.value->>'published_at') as last_used_at
        from marketing_publication pub join marketing_post post on post.id = pub.post_id
        cross join lateral jsonb_array_elements_text(
          coalesce(post.content->'product_ids', '[]'::jsonb) ||
          coalesce((select jsonb_agg(pid.product_id) from jsonb_each(coalesce(post.approved->'media', '{}'::jsonb)) m
            cross join lateral jsonb_array_elements_text(coalesce(m.value->'product_ids', '[]'::jsonb)) pid(product_id)), '[]'::jsonb)
        ) referenced(product_id)
        where pub.state = 'published' group by referenced.product_id`,
      );
      return res.json({
        ...catalog,
        products: catalog.products.map((product) => ({
          ...product,
          last_used_at:
            usage.find((item) => item.product_id === product.id)
              ?.last_used_at || null,
        })),
      });
    }
    if (resource === "posts") {
      if (write) {
        const config = (await settings(db)).value;
        const input = req.body as { content?: { product_ids?: string[] } };
        // Validate canonical input and native references before saving the draft.
        const parsed = draftSchema.parse(input);
        const selected: Media[] = [];
        for (const mediaId of new Set(
          parsed.content.versions
            .flatMap((v) => [v.media_id, v.cover_media_id])
            .filter((id): id is string => !!id),
        ))
          selected.push(await getMedia(db, mediaId));
        parsed.content.product_ids = automaticProductIds(
          parsed.content,
          selected,
        );
        await assertProducts(req.scope, parsed.content.product_ids, config);
        const [post] = await withPostStates(db, [
          await saveDraft(db, parsed, actor),
        ]);
        return res.json({ post });
      }
      const id = typeof req.query.id === "string" ? req.query.id : null;
      if (id) {
        const [post] = await withPostStates(db, [await getPost(db, id)]);
        return res.json({
          post,
          ...(req.query.versions === "1"
            ? { versions: await postVersions(db, post) }
            : {}),
        });
      }
      const posts = await rows<Post>(
        db,
        "select * from marketing_post where deleted_at is null order by scheduled_at asc nulls last, created_at desc limit 100 offset ?",
        [offset],
      );
      const [count] = await rows<{ count: string }>(
        db,
        "select count(*) from marketing_post where deleted_at is null",
      );
      return res.json({
        posts: await withPostStates(db, posts),
        count: Number(count.count),
        offset,
        limit: 100,
      });
    }
    if (resource === "media") {
      if (write) {
        if (
          req.body &&
          typeof req.body === "object" &&
          "product_id" in req.body
        ) {
          const input = z
            .object({
              product_id: z.string().min(1).max(150),
              image_url: z.string().url().max(2000),
            })
            .strict()
            .parse(req.body);
          await assertProducts(
            req.scope,
            [input.product_id],
            (await settings(db)).value,
          );
          return res.json({
            media: await importProductMedia(
              req.scope,
              input.product_id,
              input.image_url,
              actor,
            ),
          });
        }
        const body = req.body as { id?: string; labels?: unknown };
        if (body.id) {
          const input = z
            .object({
              id: z.string().min(1).max(150),
              labels: mediaLabelsSchema,
            })
            .strict()
            .parse(body);
          await assertProducts(
            req.scope,
            input.labels.product_ids,
            (await settings(db)).value,
          );
          const previous = await getMedia(db, input.id);
          if (previous.generated && !input.labels.generated)
            throw new MarketingError(
              "Kennzeichnung generierter Medien kann nicht entfernt werden.",
            );
          await db.transaction(async (tx) => {
            // Immutable bytes/URL/checksum; labels do not alter the approved publication snapshot.
            await tx.raw(
              "update marketing_media set value=value || ?::jsonb,updated_at=now() where id=?",
              [JSON.stringify(input.labels), input.id],
            );
            await audit(tx, actor, "media.labels", input.id);
          });
          return res.json({ media: await getMedia(db, input.id) });
        }
        const upload = uploadSchema.parse(req.body);
        await assertProducts(
          req.scope,
          upload.labels.product_ids,
          (await settings(db)).value,
        );
        return res.json({ media: await uploadMedia(req.scope, upload, actor) });
      }
      if (typeof req.query.id === "string")
        return res.json({ media: await getMedia(db, req.query.id) });
      // Automated feed assets have their own listing so the regular social
      // pool/editor does not eagerly load the entire S/M/L derivative catalog.
      const purpose =
        req.query.purpose === "google-feed" ? "is not null" : "is null";
      const media = (
        await rows<{ id: string; value: object }>(
          db,
          `select id,value from marketing_media where deleted_at is null and value->'merchant_feed_image' ${purpose} order by created_at desc limit 100 offset ?`,
          [offset],
        )
      ).map((m) => ({ ...m.value, id: m.id }));
      const [count] = await rows<{ count: string }>(
        db,
        `select count(*) from marketing_media where deleted_at is null and value->'merchant_feed_image' ${purpose}`,
      );
      return res.json({
        media,
        count: Number(count.count),
        offset,
        limit: 100,
      });
    }
    if (resource === "compose" && write)
      return res.json({
        media: await withRenderLimit(() =>
          composeMedia(req.scope, compositionSchema.parse(req.body), actor),
        ),
      });
    if (resource === "history" && !write)
      return res.json({
        publications: await rows(
          db,
          "select * from marketing_publication order by created_at desc limit 100 offset ?",
          [offset],
        ),
        audit: await rows(
          db,
          "select * from marketing_audit where action <> 'draft.snapshot' order by created_at desc limit 100 offset ?",
          [offset],
        ),
        offset,
        limit: 100,
      });
    if (resource === "planning" && !write) return res.json(await settings(db));
    if (resource === "planning" && write) {
      const { start } = z
        .object({ start: z.string().date() })
        .strict()
        .parse(req.body);
      const catalog = [];
      for (let page = 0; ; page += 100) {
        const part = await products(req.scope, page);
        catalog.push(...part.products);
        if (part.products.length < 100) break;
        if (page >= 49900) throw new MarketingError("Katalog zu groß.");
      }
      const history = await rows<{
        content: { product_ids: string[] };
        scheduled_at: string | null;
      }>(
        db,
        "select content,scheduled_at from marketing_post where scheduled_at between ?::date - interval '365 days' and ?::date + interval '372 days' and deleted_at is null",
        [start, start],
      );
      return res.json({
        proposals: proposeWeek(
          start,
          (await settings(db)).value,
          catalog,
          history,
        ),
      });
    }
    if (resource === "settings") {
      if (!write) {
        const accounts = await accountSummaries(db);
        return res.json({
          ...(await settings(db)),
          accounts,
          connections: {
            ...connectionState(),
            instagram:
              (accounts.instagram as { state: string }).state === "connected" ||
              (accounts.instagram as { state: string }).state === "configured",
            linkedin: (accounts.linkedin as { state: string }).state === "connected",
            pinterest:
              (accounts.pinterest as { state: string }).state === "connected" ||
              (accounts.pinterest as { state: string }).state === "configured",
          },
          feed_report:
            (
              await rows<{ value: unknown }>(
                db,
                "select value from marketing_audit where action='feed.checked' order by created_at desc limit 1",
              )
            )[0]?.value || null,
        });
      }
      const body = z
        .object({ revision: z.number().int().positive(), value: z.unknown() })
        .strict()
        .parse(req.body);
      return res.json(await saveSettings(db, body.value, body.revision, actor));
    }
    if (resource === "approve" && write) {
      const input = z
        .object({
          id: z.string().min(1).max(150),
          revision: z.number().int().positive(),
          action: z.enum(["approve", "revoke"]),
        })
        .strict()
        .parse(req.body);
      const post =
        input.action === "revoke"
          ? await revokePost(db, input.id, input.revision, actor)
          : await approvePost(db, input.id, input.revision, actor, (p, c, tx) =>
              validateApproval(req.scope, p, c, tx),
            );
      const [result] = await withPostStates(db, [post]);
      return res.json({ post: result });
    }
    if (resource === "reconcile" && write) {
      const input = z
        .object({
          id: z.string().min(1).max(150),
          action: z.enum(["retry", "published", "abandon"]),
          remote_id: z
            .string()
            .max(200)
            .refine(value => /^[a-zA-Z0-9_-]+$/.test(value) || linkedinPost.safeParse(value).success)
            .optional(),
          note: z.string().trim().min(10).max(1000),
        })
        .strict()
        .parse(req.body);
      await reconcile(db, input.id, actor, input);
      return res.json({ ok: true });
    }
    throw new MarketingError("Operation nicht unterstützt.", 405);
  } catch (error) {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        message: "Ungültige Eingabe.",
        issues: error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
    if (error instanceof MarketingError)
      return res.status(error.status).json({ message: error.message });
    // No upstream response bodies, headers or secret-bearing exception objects in logs.
    req.scope.logger.error("Marketing operation failed");
    return res.status(500).json({
      message:
        "Marketing-Vorgang fehlgeschlagen. Konfiguration und Systemstatus prüfen.",
    });
  }
}

async function validateDesignReferences(
  req: MarketingRequest,
  composition: z.infer<typeof compositionSchema>,
) {
  const db = database(req.scope),
    config = (await settings(db)).value;
  for (const page of documentPages(composition)) {
    if (page.product_id) {
      await assertProducts(req.scope, [page.product_id], config);
      const product = (await products(req.scope, 0, [page.product_id]))
        .products[0];
      if (
        ![product.thumbnail, ...product.images.map((i) => i.url)].includes(
          page.image_url,
        )
      )
        throw new MarketingError("Bild gehört nicht zum Produkt.");
    }
    for (const id of [
      page.background_id,
      page.overlay.media_id,
      ...page.objects.filter((o) => o.type === "image").map((o) => o.media_id),
    ])
      if (id) {
        const media = await getMedia(db, id);
        if (!media.mime_type.startsWith("image/"))
          throw new MarketingError("Bildebene muss ein Bild sein.");
        await assertProducts(req.scope, media.product_ids, config);
      }
  }
}
