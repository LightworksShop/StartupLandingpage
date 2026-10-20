import { openSync, type Font } from "fontkit";
import { resolve } from "node:path";
import type { TextSpec } from "./design-model";
// Checked-in, OFL-licensed files; no host fonts or network fetch during rendering.
const fonts = new Map<string, Font>();
export function drawBrandText(t: TextSpec) {
  const key = `${t.font}-${t.weight}`;
  let font = fonts.get(key);
  if (!font) {
    const source = openSync(
      resolve(
        __dirname,
        "../../admin/assets/marketing-fonts",
        `${t.font}.ttf`,
      ),
    ) as Font;
    font = source.getVariation({ wght: t.weight === "bold" ? 700 : 400 });
    fonts.set(key, font);
  }
  const run = font.layout(t.text),
    scale = t.size / font.unitsPerEm;
  const width =
    run.positions.reduce((sum, p) => sum + p.xAdvance * scale, 0) +
    Math.max(0, run.glyphs.length - 1) * t.tracking;
  let x =
    t.x - (t.align === "center" ? width / 2 : t.align === "right" ? width : 0);
  let wordIndex = (t.wordOffset || 0) - 1,
    inWord = false;
  const paths = run.glyphs
    .map((glyph, i) => {
      const p = run.positions[i],
        path = glyph.path.toSVG();
      const element = `<path d="${path}" stroke-width="${2 / scale}" transform="translate(${x + p.xOffset * scale} ${t.y - p.yOffset * scale}) scale(${scale} ${-scale})"/>`;
      x += p.xAdvance * scale + t.tracking;
      const whitespace = glyph.codePoints.every((cp) =>
        /\s/u.test(String.fromCodePoint(cp)),
      );
      if (!whitespace && !inWord) wordIndex++;
      inWord = !whitespace;
      return t.wordTarget && !whitespace
        ? `<g data-animation-word="${t.wordTarget}" data-animation-index="${wordIndex}">${element}</g>`
        : element;
    })
    .join("");
  return `<g fill="${t.color}">${paths}</g>`;
}
