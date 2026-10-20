// Shared deterministic timeline for browser SVG preview and MP4 raster frames.
import type { Composition } from "./schema";
export const animationFps = 24;

export const animationLabels = {
  none: "Keine",
  fade: "Sanft einblenden",
  rise: "Sanft aufsteigen",
  slide: "Hereingleiten",
  pop: "Sanft aufpoppen",
  reveal: "Text aufdecken",
  words: "Wortweise erscheinen",
};
export const animationPresets = {
  none: "Keine Animation",
  focus: "Produkt im Fokus",
  personalization: "Personalisierung hervorheben",
  calm: "Ruhig & hochwertig",
  custom: "Individuell",
};
export type AnimationTiming =
  Composition["animation_settings"]["layers"]["headline"];
const timing = (): AnimationTiming => ({
  effect: "none",
  start: 0,
  duration: 1,
  direction: "up",
});
export function defaultAnimationSettings(): Composition["animation_settings"] {
  return {
    preset: "none",
    strength: 0.5,
    scene_zoom: false,
    layers: {
      product: timing(),
      headline: timing(),
      subtitle: timing(),
      cta: timing(),
      overlay: timing(),
    },
  };
}
export function animationTiming(
  design: Composition,
  target: string,
): AnimationTiming {
  const object = design.objects.find((o) => `object:${o.id}` === target);
  if (object)
    return fitTiming(
      {
        effect: object.animation,
        start: object.animation_start ?? 0,
        duration: object.animation_time ?? 1,
        direction: object.animation_direction ?? "up",
      },
      design.animation_duration,
    );
  return fitTiming(
    design.animation_settings?.layers[
      target as keyof Composition["animation_settings"]["layers"]
    ] || timing(),
    design.animation_duration,
  );
}
function fitTiming(t: AnimationTiming, total: number): AnimationTiming {
  const duration = Math.min(t.duration, total - 0.5);
  return {
    ...t,
    duration,
    start: Math.min(t.start, Math.max(0, total - duration - 0.5)),
  };
}
export function setAnimationDuration(
  design: Composition,
  total: number,
): Composition {
  const ratio = total / design.animation_duration;
  const resized = (t: AnimationTiming) =>
    fitTiming(
      {
        ...t,
        start: Math.round(t.start * ratio * 10) / 10,
        duration: Math.max(
          0.2,
          Math.min(3, Math.round(t.duration * ratio * 10) / 10),
        ),
      },
      total,
    );
  return {
    ...design,
    animation_duration: total,
    animation_settings: {
      ...design.animation_settings,
      layers: Object.fromEntries(
        Object.entries(design.animation_settings.layers).map(([id, t]) => [
          id,
          design.layers.some(
            (l) =>
              l.locked &&
              l.id ===
                (["headline", "subtitle", "cta"].includes(id) ? "text" : id),
          )
            ? t
            : resized(t),
        ]),
      ) as Composition["animation_settings"]["layers"],
    },
    objects: design.objects.map((o) => {
      if (o.locked) return o;
      const t = resized(animationTiming(design, `object:${o.id}`));
      return { ...o, animation_start: t.start, animation_time: t.duration };
    }),
  };
}
export function applyAnimationPreset(
  design: Composition,
  preset: keyof typeof animationPresets,
): Composition {
  if (preset === "custom")
    return {
      ...design,
      animation_settings: { ...design.animation_settings, preset },
    };
  const total =
    preset === "none"
      ? design.animation_duration
      : Math.max(6, design.animation_duration);
  const entry = (role: string): AnimationTiming => {
    const effect =
      preset === "none" || role === "product"
        ? "none"
        : preset === "personalization"
          ? role === "headline"
            ? "reveal"
            : role === "body"
              ? "pop"
              : "fade"
          : preset === "focus" && role === "headline"
            ? "slide"
            : "fade";
    const fraction =
      {
        product: 0,
        headline: 0.06,
        body: 0.22,
        cta: 0.42,
        overlay: 0.12,
        shape: 0,
      }[role] || 0;
    return {
      effect,
      start: Math.round(total * fraction * 10) / 10,
      duration: 0.8,
      direction: role === "headline" && effect === "reveal" ? "left" : "up",
    };
  };
  const defaults = defaultAnimationSettings();
  const layers = {
    ...defaults.layers,
    product: entry("product"),
    headline: entry("headline"),
    subtitle: entry("body"),
    cta: entry("cta"),
    overlay: entry("overlay"),
  };
  // Authoring locks protect existing element settings, just as other inspector edits do.
  for (const layer of design.layers)
    if (layer.locked) {
      const keys =
        layer.id === "text" ? ["headline", "subtitle", "cta"] : [layer.id];
      for (const key of keys)
        if (key in layers) {
          const k = key as keyof typeof layers;
          layers[k] =
            design.animation_settings?.layers[k] || defaults.layers[k];
        }
    }
  return {
    ...design,
    animation_duration: total,
    animation_settings: {
      ...defaults,
      strength: design.animation_settings?.strength ?? 0.5,
      preset,
      scene_zoom: preset === "focus",
      layers,
    },
    objects: design.objects.map((o) => {
      if (o.locked) return o;
      const role =
        o.type === "image"
          ? "overlay"
          : o.type === "shape"
            ? "shape"
            : o.layout_role === "free"
              ? "body"
              : o.layout_role;
      const t = entry(role);
      return {
        ...o,
        animation: t.effect,
        animation_start: t.start,
        animation_time: t.duration,
        animation_direction: t.direction,
      };
    }),
  };
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
const number = (n: number) => Number(n.toFixed(5));
export function animationProgress(
  design: Composition,
  target: string,
  seconds: number,
) {
  const t = animationTiming(design, target);
  // Always finish the entrance before the final half-second, even after shortening a clip.
  return t.effect === "none" ? 1 : clamp((seconds - t.start) / t.duration);
}
export function animationFrame(
  svg: string,
  design: Composition,
  seconds: number,
): string {
  const strength = design.animation_settings?.strength ?? 0.5;
  const counts = new Map<string, number>();
  for (const m of svg.matchAll(
    /data-animation-word="([^"]+)" data-animation-index="(\d+)"/g,
  ))
    counts.set(m[1], Math.max(counts.get(m[1]) || 0, Number(m[2]) + 1));
  let frame = svg.replace(
    /<g data-animation-target="([^"]+)" data-animation-box="([^"]+)">/g,
    (tag, target: string, box: string) => {
      const t = animationTiming(design, target);
      if (t.effect === "none") return tag;
      const p = animationProgress(design, target, seconds),
        e = ease(p);
      const [cx, cy, width, height] = box.split(" ").map(Number);
      let transform = "",
        opacity = e,
        defs = "",
        clip = "";
      if (t.effect === "slide" || t.effect === "rise") {
        const distance = 60 * strength * (1 - e);
        const direction = t.effect === "rise" ? "up" : t.direction;
        const dx =
          direction === "left"
            ? -distance
            : direction === "right"
              ? distance
              : 0;
        const dy =
          direction === "up" ? distance : direction === "down" ? -distance : 0;
        transform = `translate(${number(dx)} ${number(dy)})`;
      } else if (t.effect === "pop") {
        const scale = 1 - 0.16 * strength * (1 - e);
        transform = `translate(${cx} ${cy}) scale(${number(scale)}) translate(${-cx} ${-cy})`;
      } else if (t.effect === "reveal") {
        const id = `motion-${Array.from(target)
          .map((c) => c.charCodeAt(0).toString(16))
          .join("-")}`;
        const vertical = t.direction === "up" || t.direction === "down";
        const w = vertical ? width : width * e,
          h = vertical ? height * e : height;
        const x = cx - width / 2 + (t.direction === "right" ? width - w : 0);
        const y = cy - height / 2 + (t.direction === "up" ? height - h : 0);
        defs = `<defs><clipPath id="${id}"><rect x="${number(x)}" y="${number(y)}" width="${number(w)}" height="${number(h)}"/></clipPath></defs>`;
        clip = ` clip-path="url(#${id})"`;
        opacity = p === 0 ? 0 : 1;
      } else if (t.effect === "words" && counts.has(target)) opacity = 1;
      return `${tag.slice(0, -1)} opacity="${number(opacity)}" transform="${transform}"${clip}>${defs}`;
    },
  );
  frame = frame.replace(
    /<(?:g|tspan) data-animation-word="([^"]+)" data-animation-index="(\d+)"/g,
    (tag, target: string, index: string) =>
      animationTiming(design, target).effect === "words"
        ? `${tag} opacity="${number(ease(animationProgress(design, target, seconds) * (counts.get(target) || 1) - Number(index)))}"`
        : tag,
  );
  if (design.animation_settings?.scene_zoom) {
    const dimensions = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (dimensions) {
      const cx = Number(dimensions[1]) / 2,
        cy = Number(dimensions[2]) / 2;
      const scale =
        1 + 0.08 * strength * clamp(seconds / design.animation_duration);
      frame = frame.replace(
        /^(<svg\b[^>]*>)([\s\S]*)(<\/svg>)$/,
        `$1<g data-animation-scene="zoom" transform="translate(${cx} ${cy}) scale(${number(scale)}) translate(${-cx} ${-cy})">$2</g>$3`,
      );
    }
  }
  return frame;
}
export function animationTarget(
  target: string,
  box: { cx: number; cy: number; bw: number; bh: number },
  content: string,
) {
  return `<g data-animation-target="${target}" data-animation-box="${box.cx} ${box.cy} ${box.bw} ${box.bh}">${content}</g>`;
}
