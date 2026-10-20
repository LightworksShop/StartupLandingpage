// Pure design contract shared by the Admin preview and server renderer.
import type { Composition, DesignObject } from "./schema";
import { defaultAnimationSettings, animationTarget } from "./design-animation";

export const formats = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  pin: [1000, 1500],
  story: [1080, 1920],
  facebook: [1200, 630],
} as const;
export const formatLabels = {
  square: "LinkedIn / Instagram / Facebook Feed · 1080 × 1080",
  portrait: "LinkedIn / Instagram Feed · 1080 × 1350",
  pin: "Pinterest · 1000 × 1500",
  story: "Instagram / Facebook Story · 1080 × 1920",
  facebook: "LinkedIn / Facebook Querformat · 1200 × 630",
};
// Fixed Storefront palette and bundled, OFL-licensed Sans/Display faces.
export const brandColors = [
  "#ffffff",
  "#f3f4f6",
  "#d1d5db",
  "#1f2937",
  "#f97316",
  "#374151",
  "#6b7280",
] as const;
export const brandFonts = {
  sans: "Smartwerk Sans, sans-serif",
  display: "Smartwerk Display, serif",
} as const;
export const layerNames = {
  background: "Hintergrund",
  product: "Produkt",
  text: "Text",
  overlay: "Logo / Overlay",
} as const;
export type LayerId = keyof typeof layerNames;
export const defaultLayers = () =>
  (Object.keys(layerNames) as LayerId[]).map((id) => ({
    id,
    visible: true,
    locked: false,
  }));
export function blankDesign(): Composition {
  return {
    product_id: null,
    image_url: "",
    background_id: null,
    template: "plain",
    format: "portrait",
    x: 0.5,
    y: 0.5,
    scale: 0.75,
    rotation: 0,
    aspect_locked: true,
    stretch: 1,
    text: "",
    subtitle: "",
    cta: "",
    color: "#f3f4f6",
    text_color: "#1f2937",
    font: "sans",
    text_x: 0.5,
    text_y: 0.86,
    text_scale: 1,
    shadow: { strength: 0, softness: 18, distance: 16, direction: 45 },
    adjustments: { brightness: 1, contrast: 1, saturation: 1, blur: 0, hue: 0 },
    overlay: {
      media_id: null,
      x: 0.85,
      y: 0.12,
      scale: 0.15,
      rotation: 0,
      opacity: 1,
    },
    objects: [],
    pages: [],
    background_transform: { x: 0.5, y: 0.5, zoom: 1 },
    layout_mode: "anchors",
    animation_duration: 4,
    animation_settings: defaultAnimationSettings(),
    layers: defaultLayers(),
  };
}
export function normalizeDesign(raw: Partial<Composition>): Composition {
  const defaults = blankDesign();
  return {
    ...defaults,
    ...raw,
    shadow: { ...defaults.shadow, ...raw.shadow },
    adjustments: { ...defaults.adjustments, ...raw.adjustments },
    overlay: { ...defaults.overlay, ...raw.overlay },
    background_transform: {
      ...defaults.background_transform,
      ...raw.background_transform,
    },
    animation_settings: {
      ...defaults.animation_settings,
      ...raw.animation_settings,
      preset:
        raw.animation_settings?.preset ??
        ((raw.objects || []).some((o) => o.animation !== "none")
          ? "custom"
          : "none"),
      layers: {
        ...defaults.animation_settings.layers,
        ...raw.animation_settings?.layers,
      },
    },
    objects: (raw.objects || []).map((o) => ({
      ...o,
      animation_start: o.animation_start ?? 0,
      animation_time: o.animation_time ?? 1,
      animation_direction: o.animation_direction ?? "up",
    })),
    layers: raw.layers || defaultLayers(),
  };
}
export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export function productGeometry(
  design: Composition,
  natural: { width: number; height: number },
) {
  const [width, height] = formats[design.format];
  const safeHeight =
    design.template === "caption" ? Math.floor(height * 0.72) : height;
  const angle = (design.rotation * Math.PI) / 180;
  const nw =
      Math.max(1, natural.width) * (design.aspect_locked ? 1 : design.stretch),
    nh = Math.max(1, natural.height);
  const boundsWidth =
    Math.abs(nw * Math.cos(angle)) + Math.abs(nh * Math.sin(angle));
  const boundsHeight =
    Math.abs(nw * Math.sin(angle)) + Math.abs(nh * Math.cos(angle));
  const ratio = Math.min(
    (width * design.scale) / boundsWidth,
    (safeHeight * design.scale) / boundsHeight,
  );
  const fw = nw * ratio,
    fh = nh * ratio,
    bw = boundsWidth * ratio,
    bh = boundsHeight * ratio;
  const cx = bw / 2 + (width - bw) * design.x,
    cy = bh / 2 + (safeHeight - bh) * design.y;
  return {
    width,
    height,
    safeHeight,
    fw,
    fh,
    bw,
    bh,
    cx,
    cy,
    left: cx - fw / 2,
    top: cy - fh / 2,
  };
}
export function overlayGeometry(design: Composition) {
  const [width, height] = formats[design.format],
    o = design.overlay;
  const angle = (o.rotation * Math.PI) / 180;
  const factor = Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
  const size = (Math.min(width, height) * o.scale) / factor;
  const bounds = size * factor;
  const cx = bounds / 2 + (width - bounds) * o.x,
    cy = bounds / 2 + (height - bounds) * o.y;
  return { size, bounds, cx, cy, left: cx - size / 2, top: cy - size / 2 };
}
export function textGeometry(design: Composition) {
  const [width, height] = formats[design.format],
    gap = height * 0.055;
  const cx = clamp(design.text_x * width, width * 0.05, width * 0.95);
  const cy = clamp(
    design.text_y * height,
    44 * design.text_scale + gap + 8,
    height - gap - 8,
  );
  return { cx, cy, gap, available: Math.min(cx, width - cx) * 1.8 };
}
export function autoFit(design: Composition): Composition {
  return {
    ...design,
    x: 0.5,
    y: 0.5,
    scale: 0.82,
    aspect_locked: true,
    stretch: 1,
  };
}
// Anchors are relative to remaining space; geometry is recomputed for each format.
export function smartResize(
  design: Composition,
  format: Composition["format"],
): Composition {
  const resized = { ...design, format };
  if (design.layout_mode !== "adaptive") return resized;
  const landscape = formats[format][0] > formats[format][1];
  return {
    ...resized,
    template: "plain",
    scale: landscape ? 0.62 : 0.62,
    x: landscape ? 0.08 : 0.5,
    y: landscape ? 0.5 : 0.22,
    text_x: landscape ? 0.76 : 0.5,
    text_y: landscape ? 0.5 : 0.84,
    objects: design.objects.map((o) =>
      o.type === "text" && o.layout_role !== "free"
        ? {
            ...o,
            x: landscape ? 0.78 : 0.5,
            y: landscape
              ? { headline: 0.28, body: 0.5, cta: 0.72, free: o.y }[
                  o.layout_role
                ]
              : { headline: 0.73, body: 0.83, cta: 0.93, free: o.y }[
                  o.layout_role
                ],
          }
        : o,
    ),
  };
}
export const builtInTemplates = [
  {
    id: "light",
    name: "Lifestyle hell",
    values: {
      template: "caption",
      color: "#ffffff",
      text_color: "#1f2937",
      font: "display",
      shadow: { strength: 0.22, softness: 24, distance: 18, direction: 60 },
    },
  },
  {
    id: "christmas",
    name: "Weihnachten",
    values: {
      template: "caption",
      color: "#374151",
      text_color: "#ffffff",
      font: "display",
      text: "Freude verschenken",
      cta: "Geschenk entdecken",
    },
  },
  {
    id: "pure",
    name: "Produkt pur",
    values: {
      template: "plain",
      color: "#f3f4f6",
      text: "",
      subtitle: "",
      cta: "",
      background_id: null,
      shadow: { strength: 0, softness: 18, distance: 16, direction: 45 },
    },
  },
  {
    id: "gift",
    name: "Geschenkidee",
    values: {
      template: "caption",
      color: "#d1d5db",
      text_color: "#1f2937",
      font: "display",
      text: "Ein besonderer Ort",
      subtitle: "Eine persönliche Geschenkidee",
      cta: "Jetzt entdecken",
    },
  },
  {
    id: "intro",
    name: "Produkt vorstellen",
    values: {
      template: "caption",
      text: "Dein besonderer Ort",
      subtitle: "",
      cta: "Entdecken",
      color: "#f3f4f6",
    },
  },
  {
    id: "detail",
    name: "Detail zeigen",
    values: {
      template: "plain",
      text: "Ein Blick ins Detail",
      subtitle: "",
      cta: "",
      text_y: 0.9,
      scale: 0.62,
    },
  },
  {
    id: "personal",
    name: "Personalisierung erklären",
    values: {
      template: "caption",
      text: "So wird es persönlich",
      subtitle: "Deinen Ort und Text auswählen",
      cta: "Gestaltung starten",
    },
  },
  {
    id: "compare",
    name: "Größen vergleichen",
    values: {
      template: "plain",
      text: "Welche Größe passt zu dir?",
      subtitle: "",
      cta: "",
      text_y: 0.9,
    },
  },
  {
    id: "quote",
    name: "Kundenstimme",
    values: {
      template: "caption",
      text: "",
      subtitle: "Hier eine echte Kundenstimme ergänzen",
      cta: "",
    },
  },
] as const;
export function applyTemplate(design: Composition, id: string): Composition {
  const preset = builtInTemplates.find((item) => item.id === id);
  return preset
    ? autoFit(
        normalizeDesign({
          ...design,
          ...preset.values,
          layers: design.layers.map((layer) =>
            layer.id === "product" ||
            layer.id === "text" ||
            layer.id === "background"
              ? { ...layer, visible: true }
              : layer,
          ),
        } as Composition),
      )
    : design;
}
export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function sceneSvg(
  design: Composition,
  natural: { width: number; height: number },
  images: {
    product: string;
    background?: string;
    overlay?: string;
    objects?: Record<string, string>;
    sizes?: Record<string, { width: number; height: number }>;
    background_size?: { width: number; height: number };
  },
  prefix = "scene",
  drawText: (spec: TextSpec) => string = svgText,
) {
  const g = productGeometry(design, natural),
    { width, height } = g;
  const logo = overlayGeometry(design),
    text = textGeometry(design);
  const a = design.adjustments,
    s = design.shadow,
    o = design.overlay;
  const rad = (s.direction * Math.PI) / 180,
    dx = Math.cos(rad) * s.distance,
    dy = Math.sin(rad) * s.distance;
  const slope = a.brightness * a.contrast,
    intercept = a.brightness * (0.5 - 0.5 * a.contrast);
  const bg = mediaPlacement(
    width,
    height,
    images.background_size || { width, height },
    design.background_transform.zoom,
    design.background_transform.x,
    design.background_transform.y,
    "cover",
  );
  const image = (url: string, attrs: string) =>
    `<image href="${escapeXml(url)}" ${attrs}/>`;
  const parts: Record<LayerId, string> = {
    background: `<g data-design-layer="background" ${a.brightness !== 1 || a.contrast !== 1 || a.saturation !== 1 || a.hue !== 0 || a.blur !== 0 ? `filter="url(#${prefix}-bg)"` : ""}><rect width="${width}" height="${height}" fill="${design.color}"/>${images.background ? image(images.background, `x="${bg.left}" y="${bg.top}" width="${bg.width}" height="${bg.height}" preserveAspectRatio="none"`) : ""}</g>`,
    product: images.product
      ? `<g data-design-layer="product" ${s.strength > 0 ? `filter="url(#${prefix}-shadow)"` : ""}>${image(images.product, `x="${g.left}" y="${g.top}" width="${g.fw}" height="${g.fh}" preserveAspectRatio="none" transform="rotate(${design.rotation} ${g.cx} ${g.cy})"`)}</g>`
      : "",
    text: `<g data-design-layer="text">${design.template === "caption" ? `<rect y="${g.safeHeight}" width="${width}" height="${height - g.safeHeight}" fill="${design.color}"/>` : ""}${[
      design.text,
      design.subtitle,
      design.cta,
    ]
      .map((line, index) => {
        if (!line) return "";
        const baseSize = [44, 26, 25][index] * design.text_scale;
        const available = text.available;
        const size = Math.min(
          baseSize,
          available / Math.max(1, line.length * 0.65),
        );
        const y = text.cy + (index - 1) * text.gap;
        const x = text.cx;
        const target = ["headline", "subtitle", "cta"][index];
        return animationTarget(
          target,
          { cx: x, cy: y - size / 3, bw: available, bh: size * 1.5 },
          drawText({
            wordTarget:
              design.animation_settings?.layers[
                target as "headline" | "subtitle" | "cta"
              ]?.effect === "words"
                ? target
                : undefined,
            text: line,
            x,
            y,
            font: design.font,
            size,
            weight: index === 1 ? "regular" : "bold",
            color: design.text_color,
            align: "center",
            tracking: 0,
          }),
        );
      })
      .join("")}</g>`,
    overlay: images.overlay
      ? `<g data-design-layer="overlay" opacity="${o.opacity}" transform="rotate(${o.rotation} ${logo.cx} ${logo.cy})">${image(images.overlay, `x="${logo.left}" y="${logo.top}" width="${logo.size}" height="${logo.size}" preserveAspectRatio="xMidYMid meet"`)}</g>`
      : "",
  };
  parts.product = animationTarget("product", g, parts.product);
  parts.overlay = animationTarget(
    "overlay",
    { cx: logo.cx, cy: logo.cy, bw: logo.bounds, bh: logo.bounds },
    parts.overlay,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="${prefix}-bg" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feComponentTransfer>${["R", "G", "B"].map((c) => `<feFunc${c} type="linear" slope="${slope}" intercept="${intercept}"/>`).join("")}</feComponentTransfer><feColorMatrix type="saturate" values="${a.saturation}"/><feColorMatrix type="hueRotate" values="${a.hue}"/><feGaussianBlur stdDeviation="${a.blur}"/></filter><filter id="${prefix}-shadow" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="${s.softness}"/><feOffset dx="${dx}" dy="${dy}" result="${prefix}-offset"/><feFlood flood-color="#1f2937" flood-opacity="${s.strength}"/><feComposite in2="${prefix}-offset" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="${width}" height="${height}" fill="${design.color}"/>${design.layers
    .filter((l) => l.visible)
    .map(
      (l) =>
        parts[l.id] +
        (l.id === "background"
          ? design.objects
              .filter((o) => o.visible && o.plane === "background")
              .map((o) =>
                objectSvg(
                  o,
                  design,
                  images.objects || {},
                  prefix,
                  drawText,
                  images.sizes || {},
                ),
              )
              .join("")
          : ""),
    )
    .join("")}${design.objects
    .filter((o) => o.visible && o.plane !== "background")
    .map((o) =>
      objectSvg(
        o,
        design,
        images.objects || {},
        prefix,
        drawText,
        images.sizes || {},
      ),
    )
    .join("")}</svg>`;
}

export type TextSpec = {
  text: string;
  x: number;
  y: number;
  font: "sans" | "display";
  size: number;
  weight: "regular" | "bold";
  color: string;
  align: "left" | "center" | "right";
  tracking: number;
  wordTarget?: string;
  wordOffset?: number;
};
export function svgText(t: TextSpec) {
  return `<text x="${t.x}" y="${t.y}" text-anchor="${t.align === "left" ? "start" : t.align === "right" ? "end" : "middle"}" font-family="${brandFonts[t.font]}" font-size="${t.size}" font-weight="${t.weight === "bold" ? 700 : 400}" letter-spacing="${t.tracking}" fill="${t.color}">${
    t.wordTarget
      ? t.text
          .split(/(\s+)/)
          .map((part, i, parts) =>
            /\S/.test(part)
              ? `<tspan data-animation-word="${t.wordTarget}" data-animation-index="${(t.wordOffset || 0) + parts.slice(0, i).filter((p) => /\S/.test(p)).length}">${escapeXml(part)}</tspan>`
              : escapeXml(part),
          )
          .join("")
      : escapeXml(t.text)
  }</text>`;
}
export function objectGeometry(object: DesignObject, design: Composition) {
  const [cw, ch] = formats[design.format],
    angle = (object.rotation * Math.PI) / 180;
  // Keep the authored width in the document. Apply adaptive limits only to
  // geometry so a landscape round trip cannot shrink the source text box.
  const width =
    design.layout_mode === "adaptive" &&
    object.type === "text" &&
    object.layout_role !== "free"
      ? Math.min(object.width, cw > ch ? 0.38 : 0.9)
      : object.width;
  let w = width * cw,
    h = object.height * ch;
  const bw = Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle)),
    bh = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
  const scale = Math.min(1, cw / bw, ch / bh);
  w *= scale;
  h *= scale;
  const cx = (bw * scale) / 2 + (cw - bw * scale) * object.x,
    cy = (bh * scale) / 2 + (ch - bh * scale) * object.y;
  return {
    width: w,
    height: h,
    cx,
    cy,
    left: cx - w / 2,
    top: cy - h / 2,
    bw: bw * scale,
    bh: bh * scale,
  };
}
export function wrapText(
  text: string,
  width: number,
  size: number,
  tracking = 0,
) {
  const max = Math.max(
    1,
    Math.floor(width / Math.max(1, size * 0.65 + tracking)),
  );
  return text.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && (line + " " + word).length > max) {
        lines.push(line);
        line = "";
      }
      let rest = word;
      while (rest.length > max) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(rest.slice(0, max));
        rest = rest.slice(max);
      }
      line += (line ? " " : "") + rest;
    }
    lines.push(line);
    return lines;
  });
}
function objectSvg(
  o: DesignObject,
  design: Composition,
  images: Record<string, string>,
  prefix: string,
  drawText: (s: TextSpec) => string,
  sizes: Record<string, { width: number; height: number }>,
) {
  const b = objectGeometry(o, design),
    id = `${prefix}-object-${o.id}`,
    { left: x, top: y, width: w, height: h } = b;
  let content = "";
  if (o.type === "text") {
    const lines = wrapText(
      o.text,
      Math.max(1, w - 2 * o.padding),
      o.size,
      o.tracking,
    );
    const tx =
      o.align === "left"
        ? x + o.padding
        : o.align === "right"
          ? x + w - o.padding
          : b.cx;
    let wordOffset = 0;
    content = `<defs><clipPath id="${id}-clip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>${o.effect === "shadow" ? `<filter id="${id}-shadow"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-opacity="0.35"/></filter>` : ""}</defs>${o.background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.radius}" fill="${o.background}"/>` : ""}<g clip-path="url(#${id}-clip)" ${o.effect === "shadow" ? `filter="url(#${id}-shadow)"` : ""} ${o.effect === "outline" ? 'stroke="#ffffff" stroke-width="2" paint-order="stroke fill"' : ""}>${lines
      .slice(
        0,
        Math.max(0, Math.floor((h - 2 * o.padding) / (o.size * o.line_height))),
      )
      .map((line, i) => {
        const offset = wordOffset;
        wordOffset += line.match(/\S+/g)?.length || 0;
        return drawText({
          wordTarget: o.animation === "words" ? `object:${o.id}` : undefined,
          wordOffset: offset,
          text: line,
          x: tx,
          y: y + o.padding + o.size + i * o.size * o.line_height,
          font: o.font,
          size: o.size,
          weight: o.weight,
          color: o.color,
          align: o.align,
          tracking: o.tracking,
        });
      })
      .join("")}</g>`;
  } else if (o.type === "shape") {
    const fill = o.gradient ? `url(#${id}-gradient)` : o.fill || "none";
    const attrs = `fill="${fill}" stroke="${o.stroke || "none"}" stroke-width="${o.stroke_width}"`;
    if (o.gradient)
      content += `<defs><linearGradient id="${id}-gradient" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(${o.gradient.direction} .5 .5)"><stop stop-color="${o.fill || o.gradient.color}"/><stop offset="1" stop-color="${o.gradient.color}" stop-opacity="${o.gradient.end_opacity}"/></linearGradient></defs>`;
    if (o.shape === "rect")
      content += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.radius}" ${attrs}/>`;
    if (o.shape === "ellipse")
      content += `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${w / 2}" ry="${h / 2}" ${attrs}/>`;
    if (o.shape === "line" || o.shape === "arrow") {
      const stroke = o.stroke || o.fill || "#1f2937";
      content += `<path d="M ${x} ${b.cy} H ${x + w}" stroke="${stroke}" stroke-width="${o.stroke_width}"/>`;
      if (o.shape === "arrow")
        content += `<path d="M ${x + w - h / 2} ${y} L ${x + w} ${b.cy} L ${x + w - h / 2} ${y + h}" fill="none" stroke="${stroke}" stroke-width="${o.stroke_width}"/>`;
    }
  } else if (images[o.media_id]) {
    const clip =
      o.frame === "circle"
        ? `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${w / 2}" ry="${h / 2}"/>`
        : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.frame === "rounded" ? o.radius : 0}"/>`;
    const crop = mediaPlacement(
      w,
      h,
      sizes[o.media_id] || { width: w, height: h },
      o.zoom,
      o.focal_x,
      o.focal_y,
      o.fit,
    );
    content = `<defs><clipPath id="${id}-clip">${clip}</clipPath></defs><g clip-path="url(#${id}-clip)"><image href="${escapeXml(images[o.media_id])}" x="${x + crop.left}" y="${y + crop.top}" width="${crop.width}" height="${crop.height}" preserveAspectRatio="none"/></g>`;
  }
  return animationTarget(
    `object:${o.id}`,
    b,
    `<g data-design-object="${o.id}" data-animation="${o.animation}" opacity="${o.opacity}" transform="rotate(${o.rotation} ${b.cx} ${b.cy})">${content}</g>`,
  );
}
export function convertText(design: Composition): Composition {
  const fields = [design.text, design.subtitle, design.cta];
  return {
    ...design,
    text: "",
    subtitle: "",
    cta: "",
    objects: [
      ...design.objects,
      ...fields.flatMap((text, i) =>
        text
          ? [
              makeObject(
                "text",
                (() => {
                  let n = design.objects.length;
                  while (design.objects.some((o) => o.id === `copy_${n}_${i}`))
                    n++;
                  return `copy_${n}_${i}`;
                })(),
                {
                  text,
                  name: ["Überschrift", "Unterzeile", "CTA"][i],
                  layout_role: ["headline", "body", "cta"][i],
                  font: design.font,
                  color: design.text_color,
                  size: [44, 26, 25][i] * design.text_scale,
                  x: design.text_x,
                  y: clamp(design.text_y + (i - 1) * 0.055),
                  width: 0.85,
                  height: Math.min(
                    1,
                    Math.max(
                      0.12,
                      (wrapText(
                        text,
                        formats[design.format][0] * 0.85 - 24,
                        [44, 26, 25][i] * design.text_scale,
                      ).length *
                        [44, 26, 25][i] *
                        design.text_scale *
                        1.2 +
                        24) /
                        formats[design.format][1],
                    ),
                  ),
                },
              ),
            ]
          : [],
      ),
    ],
  };
}
export function makeObject(
  type: DesignObject["type"],
  id: string,
  values: Record<string, unknown> = {},
): DesignObject {
  const base = {
    id,
    name: type === "text" ? "Text" : type === "image" ? "Bild" : "Form",
    x: 0.5,
    y: 0.5,
    width: 0.5,
    height: 0.15,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    group: null,
    plane: "foreground",
    layout_role: "free",
    animation: "none",
    animation_start: 0,
    animation_time: 1,
    animation_direction: "up",
  };
  const specific =
    type === "text"
      ? {
          text: "Text",
          font: "sans",
          size: 44,
          weight: "bold",
          color: "#1f2937",
          align: "center",
          line_height: 1.2,
          tracking: 0,
          background: null,
          padding: 12,
          radius: 0,
          effect: "none",
        }
      : type === "shape"
        ? {
            shape: "rect",
            fill: "#f97316",
            stroke: null,
            stroke_width: 2,
            radius: 16,
            gradient: null,
          }
        : {
            media_id: "",
            frame: "rect",
            fit: "contain",
            zoom: 1,
            focal_x: 0.5,
            focal_y: 0.5,
            radius: 24,
          };
  return {
    ...base,
    ...specific,
    type,
    ...values,
    name:
      String(values.name ?? base.name)
        .trim()
        .slice(0, 100) || base.name,
  } as DesignObject;
}
export function safeZone(format: Composition["format"]) {
  // Conservative authoring guides, not a guarantee of platform UI placement.
  const [w, h] = formats[format];
  const story = format === "story";
  return {
    x: w * 0.06,
    y: h * (story ? 0.14 : 0.06),
    width: w * 0.88,
    height: h * (story ? 0.68 : 0.88),
  };
}
export function designWarnings(design: Composition) {
  const warnings: string[] = [];
  for (const o of design.objects)
    if (o.visible && o.type === "text") {
      const b = objectGeometry(o, design),
        lines = wrapText(o.text, b.width - 2 * o.padding, o.size, o.tracking);
      if (lines.length * o.size * o.line_height > b.height - 2 * o.padding)
        warnings.push(
          `${o.name}: Text passt nicht vollständig in die Textfläche.`,
        );
      if ((o.size * 320) / formats[design.format][0] < 10)
        warnings.push(`${o.name}: In der Handyvorschau sehr kleine Schrift.`);
    }
  return warnings;
}
export function documentPages(design: Composition): Composition[] {
  return [
    { ...design, pages: [] },
    ...design.pages.map((p) => normalizeDesign(p)),
  ];
}

export function distributeObjects(
  design: Composition,
  ids: string[],
  axis: "x" | "y",
) {
  const full = formats[design.format][axis === "x" ? 0 : 1];
  const boxes = design.objects
    .filter((o) => ids.includes(o.id))
    .map((o) => ({ o, b: objectGeometry(o, design) }))
    .sort((a, b) => (axis === "x" ? a.b.cx - b.b.cx : a.b.cy - b.b.cy));
  if (boxes.length < 3) return design;
  const size = (b: ReturnType<typeof objectGeometry>) =>
    axis === "x" ? b.bw : b.bh;
  const center = (b: ReturnType<typeof objectGeometry>) =>
    axis === "x" ? b.cx : b.cy;
  const first = boxes[0],
    last = boxes.at(-1)!;
  let cursor = center(first.b) - size(first.b) / 2;
  const gap =
    (center(last.b) +
      size(last.b) / 2 -
      cursor -
      boxes.reduce((sum, item) => sum + size(item.b), 0)) /
    (boxes.length - 1);
  const positions = new Map<string, number>();
  for (const item of boxes) {
    positions.set(item.o.id, clamp(cursor / Math.max(1, full - size(item.b))));
    cursor += size(item.b) + gap;
  }
  return {
    ...design,
    objects: design.objects.map((o) =>
      positions.has(o.id) ? { ...o, [axis]: positions.get(o.id)! } : o,
    ),
  };
}

export function mediaPlacement(
  width: number,
  height: number,
  natural: { width: number; height: number },
  zoom: number,
  x: number,
  y: number,
  fit: "contain" | "cover",
) {
  const ratio =
    (fit === "cover"
      ? Math.max(
          width / Math.max(1, natural.width),
          height / Math.max(1, natural.height),
        )
      : Math.min(
          width / Math.max(1, natural.width),
          height / Math.max(1, natural.height),
        )) * zoom;
  const w = Math.max(1, natural.width) * ratio,
    h = Math.max(1, natural.height) * ratio;
  return { left: (width - w) * x, top: (height - h) * y, width: w, height: h };
}
