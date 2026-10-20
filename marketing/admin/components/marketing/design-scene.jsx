import { useEffect, useMemo, useRef } from "react";
import {
  animationFps,
  animationFrame,
} from "../../../lib/marketing/design-animation";
import { sceneSvg } from "../../../lib/marketing/design-model";
export function Scene({ design, natural, images, id, previewKey = 0 }) {
  const ref = useRef(null),
    played = useRef(0);
  const svg = useMemo(
    () => sceneSvg(design, natural, images, id),
    [design, natural, images, id],
  );
  useEffect(() => {
    // React may already have committed a newly edited scene before this effect.
    // Cleanup must never replace it with the previous render's SVG.
    ref.current.innerHTML = svg;
    if (
      !previewKey ||
      played.current === previewKey ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    played.current = previewKey;
    const el = ref.current,
      wrap = el.parentElement,
      started = performance.now();
    let frameId,
      last = -Infinity;
    wrap.classList.add("mk-animation-preview");
    const tick = (now) => {
      const seconds = Math.min(
        design.animation_duration,
        (now - started) / 1000,
      );
      if (now - last >= 1000 / animationFps) {
        el.innerHTML = animationFrame(svg, design, seconds);
        last = now;
      }
      if (seconds < design.animation_duration)
        frameId = requestAnimationFrame(tick);
      else {
        el.innerHTML = svg;
        wrap.classList.remove("mk-animation-preview");
      }
    };
    el.innerHTML = animationFrame(svg, design, 0);
    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      wrap.classList.remove("mk-animation-preview");
    };
  }, [previewKey, svg, design]);
  return (
    <div
      ref={ref}
      className="mk-scene"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
