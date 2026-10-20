import { randomUUID, createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import type { MarketingHost } from "../../server/host";
import sharp from "sharp";
import { localStorage } from "../../server/storage";
import { join } from "node:path";
import { z } from "zod";
import { audit, database, getMedia, newId } from "./repository";
import {
  compositionSchema,
  formats,
  MarketingError,
  mediaLabelsSchema,
  type Media,
} from "./schema";
import { products, assertProducts } from "./catalog";
import { settings } from "./repository";
import { sceneSvg } from "./design-model";
import { drawBrandText } from "./design-fonts";
const maxBytes = 15 * 1024 * 1024;
export const uploadSchema = z
  .object({
    labels: mediaLabelsSchema,
    mime_type: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
    content: z.string().max(21 * 1024 * 1024),
  })
  .strict();
export async function inspectUpload(raw: unknown) {
  const input = uploadSchema.parse(raw);
  const bytes = Buffer.from(input.content, "base64");
  if (
    !bytes.length ||
    bytes.length > maxBytes ||
    bytes.toString("base64") !== input.content
  )
    throw new MarketingError("Ungültige Base64-Datei oder mehr als 15 MiB.");
  let width: number | null = null,
    height: number | null = null;
  if (input.mime_type === "video/mp4") {
    if (
      bytes.length < 16 ||
      bytes.toString("ascii", 4, 8) !== "ftyp" ||
      !/^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(
        bytes.toString("ascii", 8, 12),
      )
    )
      throw new MarketingError("Keine unterstützte MP4-Datei.");
  } else {
    const meta = await sharp(bytes, {
      limitInputPixels: 40_000_000,
    }).metadata();
    if (
      input.mime_type !== `image/${meta.format}` ||
      (meta.pages || 1) !== 1 ||
      !meta.width ||
      !meta.height
    )
      throw new MarketingError(
        "Bildformat stimmt nicht mit dem Dateiinhalt überein.",
      );
    width = meta.autoOrient.width;
    height = meta.autoOrient.height;
    await sharp(bytes, { limitInputPixels: 40_000_000 }).stats();
  }
  return { input, bytes, width, height };
}
export async function storeMedia(
  scope: MarketingHost,
  bytes: Buffer,
  value: Omit<Media, "id" | "url" | "file_id" | "checksum" | "size">,
  actor: string,
) {
  const extension = value.mime_type.split("/")[1];
  const file = await scope.storage.put(bytes, extension);
  if (!file?.id || !file.url)
    throw new MarketingError("Dateispeicherung fehlgeschlagen.", 503);
  const id = newId("mkmedia");
  const stored = {
    ...value,
    file_id: file.id,
    url: file.url,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  };
  try {
    await database(scope).transaction(async (tx) => {
      await tx.raw(
        "insert into marketing_media (id,value) values (?,?::jsonb)",
        [id, JSON.stringify(stored)],
      );
      await audit(tx, actor, "media.create", id, {
        source: value.source,
        generated: value.generated,
      });
    });
  } catch (e) {
    await scope.storage.remove(file.id).catch(() => undefined);
    throw e;
  }
  return { ...stored, id };
}
export async function uploadMedia(
  scope: MarketingHost,
  raw: unknown,
  actor: string,
) {
  const { input, bytes, width, height } = await inspectUpload(raw);
  return storeMedia(
    scope,
    bytes,
    {
      ...input.labels,
      source: "upload",
      mime_type: input.mime_type,
      width,
      height,
    },
    actor,
  );
}
// Only known Medusa image URLs on explicitly configured media origins may be fetched.
// Redirects and nonpublic DNS destinations are rejected, even for allowlisted origins.
export function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address);
}
export async function mediaBytes(url: string) {
  if (process.env.MARKETING_PUBLIC_URL) {
    const local = localStorage(process.env.MARKETING_MEDIA_DIR || join(__dirname, "../../var/media"), new URL(process.env.MARKETING_PUBLIC_URL).origin);
    const bytes = await local.readURL(url);
    if (bytes) {
      if (bytes.length > maxBytes) throw new MarketingError("Medium zu groß.");
      return bytes;
    }
  }
  const u = new URL(url);
  const origins = (
    process.env.MARKETING_MEDIA_ORIGINS ||
    process.env.S3_FILE_URL ||
    ""
  )
    .split(",")
    .filter(Boolean)
    .map((v) => new URL(v.trim()).origin);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    !origins.includes(u.origin)
  )
    throw new MarketingError(
      "Medien-Origin muss in MARKETING_MEDIA_ORIGINS freigegeben sein.",
    );
  const addresses = await lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new MarketingError("Interne Medienadresse nicht zulässig.");
  // Pin the validated DNS answer to the actual socket (prevents DNS rebinding).
  const address = addresses[0];
  return new Promise<Buffer>((resolve, reject) => {
    const request = httpsRequest(
      u,
      {
        family: address.family,
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new MarketingError(
              "Medium konnte nicht geladen werden (Weiterleitungen sind gesperrt).",
            ),
          );
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes)
            request.destroy(new MarketingError("Medium zu groß."));
          else chunks.push(chunk);
        });
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );
    const timer = setTimeout(
      () =>
        request.destroy(
          new MarketingError("Medienabruf hat das Zeitlimit überschritten."),
        ),
      20000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    request.end();
  });
}
export { escapeXml } from "./design-model";
export async function compositionScene(
  foreground: Buffer,
  background: Buffer | null,
  raw: unknown,
  overlay: Buffer | null = null,
  objectImages: Record<string, Buffer> = {},
) {
  const input = compositionSchema.parse(raw);
  const meta = foreground.length
    ? await sharp(foreground, {
        limitInputPixels: 40_000_000,
      }).metadata()
    : { autoOrient: { width: 1, height: 1 }, hasAlpha: true, pages: 1 };
  if (!meta.hasAlpha || (meta.pages || 1) !== 1)
    throw new MarketingError(
      "Das Produktbild muss eine transparente, statische Grafik sein.",
    );
  const stats = foreground.length
    ? await sharp(foreground, {
        limitInputPixels: 40_000_000,
      }).stats()
    : { isOpaque: false };
  if (stats.isOpaque)
    throw new MarketingError(
      "Das Produktbild enthält keine transparenten Pixel.",
    );
  const embed = async (bytes: Buffer | null) => {
    if (!bytes) return "";
    const image = sharp(bytes, { limitInputPixels: 40_000_000 });
    const info = await image.metadata();
    if ((info.pages || 1) !== 1)
      throw new MarketingError(
        "Animierte Medien sind nicht als Ebene erlaubt.",
      );
    return `data:image/png;base64,${(await image.autoOrient().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).png().toBuffer()).toString("base64")}`;
  };
  const [product, backdrop, logo] = await Promise.all([
    embed(foreground.length ? foreground : null),
    embed(background),
    embed(overlay),
  ]);
  const sizes = Object.fromEntries(
    await Promise.all(
      Object.entries(objectImages).map(async ([id, bytes]) => {
        const info = await sharp(bytes, {
          limitInputPixels: 40_000_000,
        }).metadata();
        return [id, info.autoOrient];
      }),
    ),
  );
  const bgInfo = background
    ? await sharp(background, { limitInputPixels: 40_000_000 }).metadata()
    : null;
  const objects = Object.fromEntries(
    await Promise.all(
      Object.entries(objectImages).map(async ([id, bytes]) => [
        id,
        await embed(bytes),
      ]),
    ),
  );
  const svg = sceneSvg(
    input,
    meta.autoOrient,
    {
      product,
      background: backdrop,
      overlay: logo,
      objects,
      sizes,
      background_size: bgInfo?.autoOrient,
    },
    "export",
    drawBrandText,
  );
  return svg;
}
export async function renderComposition(
  foreground: Buffer,
  background: Buffer | null,
  raw: unknown,
  overlay: Buffer | null = null,
  objects: Record<string, Buffer> = {},
) {
  const input = compositionSchema.parse(raw);
  const svg = await compositionScene(
    foreground,
    background,
    input,
    overlay,
    objects,
  );
  return sharp(Buffer.from(svg), { limitInputPixels: 40_000_000 })
    .flatten({ background: input.color })
    .jpeg({ quality: 94 })
    .toBuffer();
}
export function compositionLabels(
  product: { id: string; title: string },
  background: Pick<Media, "product_ids" | "generated" | "provenance"> | null,
  overlay: Pick<Media, "product_ids" | "generated" | "provenance"> | null,
  format: keyof typeof formats,
) {
  return mediaLabelsSchema.parse({
    name: `${product.title} · ${format}`.slice(0, 200),
    tags: [format],
    product_ids: [
      ...new Set([
        product.id,
        ...(background?.product_ids || []),
        ...(overlay?.product_ids || []),
      ]),
    ],
    generated: !!(background?.generated || overlay?.generated),
    provenance: [
      ...new Set([background?.provenance, overlay?.provenance].filter(Boolean)),
    ].join(" · "),
  });
}
export async function prepareComposition(scope: MarketingHost, raw: unknown) {
  const input = compositionSchema.parse(raw);
  const product = input.product_id
    ? (await products(scope, 0, [input.product_id])).products[0]
    : null;
  if (
    input.product_id &&
    (!product ||
      ![product.thumbnail, ...product.images.map((x) => x.url)].includes(
        input.image_url,
      ))
  )
    throw new MarketingError(
      "Bild gehört nicht zu einem veröffentlichten Medusa-Produkt.",
    );
  const ids = [
    ...new Set(
      [
        input.background_id,
        input.overlay.media_id,
        ...input.objects
          .filter((o) => o.type === "image")
          .map((o) => o.media_id),
      ].filter((id): id is string => !!id),
    ),
  ];
  if (ids.length > 10)
    throw new MarketingError(
      "Höchstens zehn unterschiedliche Bildquellen pro Seite.",
    );
  const layers = await Promise.all(
    ids.map((id) => getMedia(database(scope), id)),
  );
  for (const layer of layers)
    if (!layer.mime_type.startsWith("image/"))
      throw new MarketingError("Bildebenen benötigen statische Bilder.");
  const labels = mediaLabelsSchema.parse({
    name: `${product?.title || "Gestaltung"} · ${input.format}`.slice(0, 200),
    tags: [input.format],
    product_ids: [
      ...new Set([
        ...(product ? [product.id] : []),
        ...layers.flatMap((l) => l.product_ids),
      ]),
    ],
    generated: layers.some((l) => l.generated),
    provenance: [
      ...new Set(layers.map((l) => l.provenance).filter(Boolean)),
    ].join(" · "),
  });
  await assertProducts(
    scope,
    labels.product_ids,
    (await settings(database(scope))).value,
  );
  if (layers.reduce((sum, l) => sum + l.size, 0) > 50 * 1024 * 1024)
    throw new MarketingError("Bildquellen zusammen größer als 50 MiB.");
  const fetched: Record<string, Buffer> = Object.fromEntries(
    await Promise.all(layers.map(async (l) => [l.id, await mediaBytes(l.url)])),
  );
  const foreground = input.image_url
    ? await mediaBytes(input.image_url)
    : Buffer.alloc(0);
  if (
    foreground.length +
      Object.values(fetched).reduce((n, b) => n + b.length, 0) >
    50 * 1024 * 1024
  )
    throw new MarketingError("Bildquellen zusammen größer als 50 MiB.");
  return {
    input,
    labels,
    foreground,
    backdrop: input.background_id ? fetched[input.background_id] : null,
    logo: input.overlay.media_id ? fetched[input.overlay.media_id] : null,
    objects: fetched,
  };
}
export async function composeMedia(
  scope: MarketingHost,
  raw: unknown,
  actor: string,
) {
  const input = compositionSchema.parse(raw);
  if (input.pages.length)
    throw new MarketingError(
      "Mehrseitige Gestaltungen über design-export exportieren.",
    );
  const p = await prepareComposition(scope, input);
  const bytes = await renderComposition(
    p.foreground,
    p.backdrop,
    p.input,
    p.logo,
    p.objects,
  );
  const [width, height] = formats[p.input.format];
  return storeMedia(
    scope,
    bytes,
    {
      ...p.labels,
      source: "composition",
      composition: p.input,
      mime_type: "image/jpeg",
      width,
      height,
    },
    actor,
  );
}

export async function importProductMedia(
  scope: MarketingHost,
  productId: string,
  imageUrl: string,
  actor: string,
) {
  const product = (await products(scope, 0, [productId])).products[0];
  if (
    !product ||
    ![product.thumbnail, ...product.images.map((image) => image.url)].includes(
      imageUrl,
    )
  )
    throw new MarketingError("Bild gehört nicht zum veröffentlichten Produkt.");
  const bytes = await mediaBytes(imageUrl);
  const meta = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    !meta.width ||
    !meta.height ||
    (meta.pages || 1) !== 1
  )
    throw new MarketingError("Produktbildformat nicht unterstützt.");
  return storeMedia(
    scope,
    bytes,
    {
      name: product.title,
      tags: ["Produktbild"],
      product_ids: [productId],
      generated: false,
      provenance: "Medusa-Produktbild",
      source: "product",
      mime_type: `image/${meta.format}`,
      width: meta.autoOrient.width,
      height: meta.autoOrient.height,
    },
    actor,
  );
}
