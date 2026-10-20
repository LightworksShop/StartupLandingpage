import { useEffect, useState } from "react";
import {
  animationLabels,
  animationPresets,
  animationTiming,
} from "../../../lib/marketing/design-animation";

function Seconds({ label, value, min = 0, max, onChange }) {
  return (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step="0.1"
        value={value}
        onChange={(e) => {
          if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
            onChange(Math.max(min, Math.min(max, e.target.valueAsNumber)));
        }}
      />
    </label>
  );
}
export default function AnimationPanel({
  design,
  activeTarget,
  onSettings,
  onPreset,
  onDuration,
  onElement,
  onPreview,
}) {
  const targets = [
    ...(design.image_url
      ? [{ id: "product", name: "Produkt", type: "product", layer: "product" }]
      : []),
    ...[
      ["headline", design.text, "Überschrift"],
      ["subtitle", design.subtitle, "Unterzeile"],
      ["cta", design.cta, "CTA"],
    ]
      .filter(([, text]) => text)
      .map(([id, , name]) => ({ id, name, type: "text", layer: "text" })),
    ...(design.overlay.media_id
      ? [
          {
            id: "overlay",
            name: "Logo / Overlay",
            type: "image",
            layer: "overlay",
          },
        ]
      : []),
    ...design.objects.map((o) => ({
      id: `object:${o.id}`,
      name: o.name,
      type: o.type,
      locked: o.locked,
      visible: o.visible,
    })),
  ].map((t) => ({
    ...t,
    locked: t.locked || design.layers.find((l) => l.id === t.layer)?.locked,
    visible:
      t.visible ?? design.layers.find((l) => l.id === t.layer)?.visible ?? true,
  }));
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [target, setTarget] = useState(activeTarget);
  useEffect(() => {
    setTarget(activeTarget);
  }, [activeTarget]);
  const selected = targets.find((t) => t.id === target) || targets[0];
  const timing = selected ? animationTiming(design, selected.id) : null;
  const settings = design.animation_settings;
  const changeTiming = (patch) =>
    onElement(selected.id, { ...timing, ...patch });
  return (
    <section className="mk-card mk-animation-panel">
      <h3>Animation</h3>
      <label>
        Vorlage
        <select
          aria-label="Animationsvorlage"
          value={settings.preset}
          onChange={(e) => onPreset(e.target.value)}
        >
          {Object.entries(animationPresets).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="mk-muted">
        {
          {
            focus:
              "Langsamer Szenenzoom, danach Überschrift, Personalisierung und CTA.",
            personalization:
              "Überschrift aufdecken, Personalisierung hervorheben, CTA einblenden.",
            calm: "Texte und Logo ruhig nacheinander einblenden.",
            none: "Eine Vorlage wählen oder einzelne Elemente animieren.",
            custom: "Eigene Effekte und Startzeiten pro Element.",
          }[settings.preset]
        }
      </p>
      <label>
        Gesamtdauer · Sekunden
        <input
          aria-label="Animationsdauer"
          type="range"
          min="2"
          max="8"
          step="1"
          value={design.animation_duration}
          onChange={(e) => onDuration(Number(e.target.value))}
        />
        <span>{design.animation_duration} s</span>
      </label>
      <label>
        Bewegungsstärke
        <select
          aria-label="Bewegungsstärke"
          value={settings.strength}
          onChange={(e) => onSettings({ strength: Number(e.target.value) })}
        >
          {![0.25, 0.5, 1].includes(settings.strength) && (
            <option value={settings.strength}>
              Individuell · {Math.round(settings.strength * 100)} %
            </option>
          )}
          <option value="0.25">Dezent</option>
          <option value="0.5">Normal</option>
          <option value="1">Kräftig</option>
        </select>
      </label>
      <label className="mk-inline">
        <input
          aria-label="Langsamer Szenenzoom"
          type="checkbox"
          checked={settings.scene_zoom}
          onChange={(e) => onSettings({ scene_zoom: e.target.checked })}
        />
        Langsamer Szenenzoom
      </label>
      <small>
        Zoom bewegt alle Ebenen gemeinsam. Größenverhältnisse und Überdeckungen
        bleiben erhalten.
      </small>
      <button className="mk-primary" onClick={onPreview}>
        Vorschau abspielen
      </button>
      {reducedMotion && (
        <p role="status">
          Die Systemoption „Bewegung reduzieren“ ist aktiv. Die Vorschau bleibt
          statisch; MP4 wird animiert exportiert.
        </p>
      )}
      <p>
        Für bewegte Beiträge MP4 verwenden. Auf Instagram erfolgt die
        Veröffentlichung als Reel.
      </p>
      <details className="mk-inspector-more">
        <summary>Elemente anpassen</summary>
        {selected ? (
          <>
            <label>
              Element
              <select
                aria-label="Animationselement"
                value={selected.id}
                onChange={(e) => setTarget(e.target.value)}
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.locked ? " · gesperrt" : ""}
                    {!t.visible ? " · ausgeblendet" : ""}
                  </option>
                ))}
              </select>
            </label>
            {selected.locked && (
              <p>Diese Ebene links unter Ebenen entsperren.</p>
            )}
            <fieldset disabled={selected.locked}>
              <label>
                Effekt
                <select
                  aria-label="Animationseffekt"
                  value={timing.effect}
                  onChange={(e) => changeTiming({ effect: e.target.value })}
                >
                  {Object.entries(animationLabels)
                    .filter(
                      ([id]) =>
                        selected.type === "text" ||
                        (selected.type === "product"
                          ? ["none", "fade"].includes(id)
                          : !["reveal", "words"].includes(id)),
                    )
                    .map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              {timing.effect !== "none" && (
                <>
                  <div className="mk-inspector-fields">
                    <Seconds
                      label="Startzeit · Sekunden"
                      value={timing.start}
                      max={Math.max(
                        0,
                        design.animation_duration - timing.duration - 0.5,
                      )}
                      onChange={(start) => changeTiming({ start })}
                    />
                    <Seconds
                      label="Eintrittsdauer · Sekunden"
                      value={timing.duration}
                      min={0.2}
                      max={Math.min(3, design.animation_duration - 0.5)}
                      onChange={(duration) => changeTiming({ duration })}
                    />
                  </div>
                  {["slide", "reveal"].includes(timing.effect) && (
                    <label>
                      Richtung
                      <select
                        aria-label="Animationsrichtung"
                        value={timing.direction}
                        onChange={(e) =>
                          changeTiming({ direction: e.target.value })
                        }
                      >
                        <option value="up">Von unten</option>
                        <option value="down">Von oben</option>
                        <option value="left">Von links</option>
                        <option value="right">Von rechts</option>
                      </select>
                    </label>
                  )}
                </>
              )}
            </fieldset>
          </>
        ) : (
          <p>
            Text, Logo oder ein weiteres Element ergänzen, um einen einzelnen
            Effekt einzustellen.
          </p>
        )}
      </details>
      {targets.some((t) => t.locked) && (
        <small>
          Gesperrte Ebenen behalten ihre bisherigen Effekte bei
          Vorlagenwechseln.
        </small>
      )}
    </section>
  );
}
