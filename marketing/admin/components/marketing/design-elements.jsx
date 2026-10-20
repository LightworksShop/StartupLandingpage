import { useState } from "react";
import {
  brandColors,
  brandFonts,
  makeObject,
} from "../../../lib/marketing/design-model";
const uuid = () =>
  `object_${Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
export function ElementLibrary({
  onAdd,
  onConvert,
  images,
  canConvert = true,
  canAdd = true,
}) {
  const [mediaId, setMediaId] = useState("");
  return (
    <div className="mk-design-items">
      <fieldset disabled={!canAdd} className="mk-element-library">
        <section className="mk-card">
          <h3>Text hinzufügen</h3>
          {[
            ["Überschrift", 52, 0.18],
            ["Erklärung", 30, 0.75],
            ["CTA", 28, 0.9],
          ].map(([name, size, y]) => (
            <button
              key={name}
              onClick={() =>
                onAdd(
                  makeObject("text", uuid(), {
                    name,
                    text: name,
                    size,
                    y,
                    width: 0.8,
                    height: 0.18,
                    layout_role:
                      name === "Überschrift"
                        ? "headline"
                        : name === "CTA"
                          ? "cta"
                          : "body",
                  }),
                )
              }
            >
              {name} hinzufügen
            </button>
          ))}
          <button disabled={!canConvert} onClick={onConvert}>
            Textbausteine einzeln bearbeiten
          </button>
        </section>
        <section className="mk-card">
          <h3>Formen & Lesbarkeit</h3>
          <div className="mk-grid">
            {[
              ["Fläche", "rect"],
              ["Kreis", "ellipse"],
              ["Linie", "line"],
              ["Pfeil", "arrow"],
            ].map(([name, shape]) => (
              <button
                key={shape}
                onClick={() =>
                  onAdd(
                    makeObject("shape", uuid(), {
                      name,
                      shape,
                      height: shape === "ellipse" ? 0.3 : 0.1,
                    }),
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              onAdd(
                makeObject("shape", uuid(), {
                  name: "Textverlauf",
                  width: 0.9,
                  height: 0.3,
                  y: 0.8,
                  fill: "#1f2937",
                  gradient: { color: "#1f2937", direction: 90, end_opacity: 0 },
                }),
              )
            }
          >
            Verlauf hinter Text
          </button>
        </section>
        <section className="mk-card">
          <h3>Labels</h3>
          {["Geschenkidee", "Personalisierbar", "Neu"].map((text) => (
            <button
              key={text}
              onClick={() =>
                onAdd(
                  makeObject("text", uuid(), {
                    name: text,
                    text,
                    size: 28,
                    width: 0.4,
                    height: 0.08,
                    background: "#374151",
                    color: "#ffffff",
                    radius: 30,
                  }),
                )
              }
            >
              {text}
            </button>
          ))}
          <small>Passende, sachlich zutreffende Bezeichnung wählen.</small>
        </section>
        <section className="mk-card">
          <h3>Bild / Detailfenster</h3>
          <select
            aria-label="Elementbild"
            value={mediaId}
            onChange={(e) => setMediaId(e.target.value)}
          >
            <option value="">Medium wählen</option>
            {images.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            disabled={!mediaId}
            onClick={() =>
              onAdd(
                makeObject("image", uuid(), {
                  media_id: mediaId,
                  name: images.find((m) => m.id === mediaId)?.name || "Bild",
                  width: 0.35,
                  height: 0.3,
                }),
              )
            }
          >
            Bild hinzufügen
          </button>
        </section>
      </fieldset>
    </div>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  disabled,
}) {
  return (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
            onChange(Math.min(max, Math.max(min, e.target.valueAsNumber)));
        }}
      />
    </label>
  );
}
function ColorField({ label, value, onChange, nullable = false }) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        {nullable && <option value="">Keine</option>}
        {brandColors.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ObjectInspector({
  object,
  selection,
  onChange,
  onAction,
  images,
  warnings,
}) {
  if (!object)
    return <p>Ein Element auf dem Canvas oder in der Bibliothek auswählen.</p>;
  const update = (key, value) => onChange({ [key]: value });
  return (
    <div className="mk-design-items">
      <section className="mk-card">
        <h3>
          {selection.length > 1
            ? `${selection.length} Elemente ausgewählt`
            : object.name}
        </h3>
        {object.locked && (
          <p role="status">
            Diese Ebene ist gesperrt. Links unter Ebenen entsperren.
          </p>
        )}
        <fieldset disabled={object.locked}>
          {object.type === "text" && (
            <>
              <label>
                Inhalt
                <textarea
                  aria-label="Elementtext"
                  value={object.text}
                  maxLength={600}
                  onChange={(e) => update("text", e.target.value)}
                />
              </label>
              <div className="mk-inspector-fields">
                <label>
                  Schrift
                  <select
                    aria-label="Elementschrift"
                    value={object.font}
                    onChange={(e) => update("font", e.target.value)}
                  >
                    {Object.keys(brandFonts).map((k) => (
                      <option key={k} value={k}>
                        {k === "sans" ? "Manrope" : "Cormorant Garamond"}
                      </option>
                    ))}
                  </select>
                </label>
                <NumberField
                  label="Element Schriftgröße"
                  value={object.size}
                  min={12}
                  max={160}
                  step={1}
                  onChange={(v) => update("size", v)}
                />
                <label>
                  Schriftschnitt
                  <select
                    value={object.weight}
                    onChange={(e) => update("weight", e.target.value)}
                  >
                    <option value="regular">Normal</option>
                    <option value="bold">Fett</option>
                  </select>
                </label>
                <label>
                  Ausrichtung
                  <select
                    aria-label="Element Textausrichtung"
                    value={object.align}
                    onChange={(e) => update("align", e.target.value)}
                  >
                    <option value="left">Links</option>
                    <option value="center">Zentriert</option>
                    <option value="right">Rechts</option>
                  </select>
                </label>
                <ColorField
                  label="Element Textfarbe"
                  value={object.color}
                  onChange={(v) => update("color", v)}
                />
              </div>
              <details className="mk-inspector-more">
                <summary>Textdetails</summary>
                <div className="mk-inspector-fields">
                  <ColorField
                    label="Element Textfläche"
                    value={object.background}
                    nullable
                    onChange={(v) => update("background", v)}
                  />
                  <NumberField
                    label="Zeilenabstand"
                    value={object.line_height}
                    min={0.8}
                    max={2}
                    onChange={(v) => update("line_height", v)}
                  />
                  <NumberField
                    label="Zeichenabstand"
                    value={object.tracking}
                    min={-2}
                    max={12}
                    step={0.1}
                    onChange={(v) => update("tracking", v)}
                  />
                  <NumberField
                    label="Innenabstand"
                    value={object.padding}
                    min={0}
                    max={40}
                    step={1}
                    onChange={(v) => update("padding", v)}
                  />
                  <NumberField
                    label="Textfläche Rundung"
                    value={object.radius}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(v) => update("radius", v)}
                  />
                  <label>
                    Texteffekt
                    <select
                      value={object.effect}
                      onChange={(e) => update("effect", e.target.value)}
                    >
                      <option value="none">Keiner</option>
                      <option value="shadow">Schatten</option>
                      <option value="outline">Kontur</option>
                    </select>
                  </label>
                </div>
              </details>
            </>
          )}
          {object.type === "shape" && (
            <div className="mk-inspector-fields">
              <label>
                Form
                <select
                  value={object.shape}
                  onChange={(e) => update("shape", e.target.value)}
                >
                  {[
                    ["rect", "Rechteck"],
                    ["ellipse", "Ellipse"],
                    ["line", "Linie"],
                    ["arrow", "Pfeil"],
                  ].map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <ColorField
                label="Füllung"
                value={object.fill}
                nullable
                onChange={(v) => update("fill", v)}
              />
              <ColorField
                label="Kontur"
                value={object.stroke}
                nullable
                onChange={(v) => update("stroke", v)}
              />
              <NumberField
                label="Konturstärke"
                value={object.stroke_width}
                min={0}
                max={30}
                step={1}
                onChange={(v) => update("stroke_width", v)}
              />
              <NumberField
                label="Rundung"
                value={object.radius}
                min={0}
                max={200}
                step={1}
                onChange={(v) => update("radius", v)}
              />
              <label className="mk-inline">
                <input
                  aria-label="Farbverlauf"
                  type="checkbox"
                  checked={!!object.gradient}
                  onChange={(e) =>
                    update(
                      "gradient",
                      e.target.checked
                        ? {
                            color: object.fill || "#1f2937",
                            direction: 90,
                            end_opacity: 0,
                          }
                        : null,
                    )
                  }
                />
                Farbverlauf
              </label>
              {object.gradient && (
                <>
                  <ColorField
                    label="Verlauf Zielfarbe"
                    value={object.gradient.color}
                    onChange={(v) =>
                      update("gradient", { ...object.gradient, color: v })
                    }
                  />
                  <NumberField
                    label="Verlauf Richtung"
                    value={object.gradient.direction}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(v) =>
                      update("gradient", { ...object.gradient, direction: v })
                    }
                  />
                  <NumberField
                    label="Verlauf Enddeckkraft"
                    value={object.gradient.end_opacity}
                    min={0}
                    max={1}
                    onChange={(v) =>
                      update("gradient", { ...object.gradient, end_opacity: v })
                    }
                  />
                </>
              )}
            </div>
          )}
          {object.type === "image" && (
            <div className="mk-inspector-fields">
              <label>
                Bild
                <select
                  aria-label="Element Medium"
                  value={object.media_id}
                  onChange={(e) => update("media_id", e.target.value)}
                >
                  {images.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bildrahmen
                <select
                  aria-label="Bildrahmen"
                  value={object.frame}
                  onChange={(e) => update("frame", e.target.value)}
                >
                  <option value="rect">Rechteck</option>
                  <option value="rounded">Abgerundet</option>
                  <option value="circle">Ellipse / Kreis</option>
                </select>
              </label>
              <label>
                Einpassen
                <select
                  value={object.fit}
                  onChange={(e) => update("fit", e.target.value)}
                >
                  <option value="contain">Vollständig</option>
                  <option value="cover">Ausschnitt füllen</option>
                </select>
              </label>
              <NumberField
                label="Bildausschnitt Zoom"
                value={object.zoom}
                min={1}
                max={4}
                onChange={(v) => update("zoom", v)}
              />
              <NumberField
                label="Bildausschnitt horizontal"
                value={object.focal_x}
                min={0}
                max={1}
                onChange={(v) => update("focal_x", v)}
              />
              <NumberField
                label="Bildausschnitt vertikal"
                value={object.focal_y}
                min={0}
                max={1}
                onChange={(v) => update("focal_y", v)}
              />
              <NumberField
                label="Bildrahmen Rundung"
                value={object.radius}
                min={0}
                max={200}
                step={1}
                onChange={(v) => update("radius", v)}
              />
            </div>
          )}
          <details className="mk-inspector-more">
            <summary>Größe & Drehung</summary>
            <div className="mk-inspector-fields">
              {[
                ["Element Breite", "width", 0.02, 1],
                ["Element Höhe", "height", 0.01, 1],
                ["Element Drehung", "rotation", -180, 180],
                ["Element Deckkraft", "opacity", 0, 1],
              ].map(([label, key, min, max]) => (
                <NumberField
                  key={key}
                  label={label}
                  value={object[key]}
                  min={min}
                  max={max}
                  step={key === "rotation" ? 1 : 0.01}
                  onChange={(v) => update(key, v)}
                />
              ))}
            </div>
          </details>
          <details className="mk-inspector-more">
            <summary>Weitere Einstellungen</summary>
            <div className="mk-inspector-fields">
              <label>
                Name
                <input
                  aria-label="Elementname"
                  value={object.name}
                  maxLength={100}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <label>
                Ebene
                <select
                  aria-label="Elementebene"
                  value={object.plane}
                  onChange={(e) => update("plane", e.target.value)}
                >
                  <option value="foreground">Vor dem Produkt</option>
                  <option value="background">Hinter dem Produkt</option>
                </select>
              </label>
              <label>
                Formatrolle
                <select
                  aria-label="Formatrolle"
                  value={object.layout_role}
                  onChange={(e) => update("layout_role", e.target.value)}
                >
                  <option value="free">Freie Position</option>
                  <option value="headline">Überschrift</option>
                  <option value="body">Erklärung</option>
                  <option value="cta">CTA</option>
                </select>
              </label>
            </div>
          </details>
        </fieldset>
        {warnings.map((w) => (
          <p role="status" key={w}>
            {w}
          </p>
        ))}
        <div className="mk-grid">
          {["duplicate", "remove"].map((action) => (
            <button
              key={action}
              disabled={object.locked}
              onClick={() => onAction(action)}
            >
              {
                {
                  duplicate: "Duplizieren",
                  remove: "Entfernen",
                }[action]
              }
            </button>
          ))}
        </div>
        <details className="mk-inspector-more">
          <summary>Anordnen & Gruppieren</summary>
          <div className="mk-grid">
            {["forward", "backward", "group", "ungroup"].map((action) => (
              <button
                key={action}
                disabled={
                  object.locked || (action === "group" && selection.length < 2)
                }
                onClick={() => onAction(action)}
              >
                {
                  {
                    forward: "Nach vorne",
                    backward: "Nach hinten",
                    group: "Gruppieren",
                    ungroup: "Gruppe lösen",
                  }[action]
                }
              </button>
            ))}
          </div>
          <h4>Ausrichten</h4>
          <div className="mk-grid">
            {["left", "center", "right", "top", "middle", "bottom"].map((a) => (
              <button
                disabled={object.locked}
                key={a}
                onClick={() => onAction("align", a)}
              >
                {
                  {
                    left: "Links",
                    center: "Zentrieren",
                    right: "Rechts",
                    top: "Oben",
                    middle: "Mittig",
                    bottom: "Unten",
                  }[a]
                }
              </button>
            ))}
          </div>
          <div className="mk-grid">
            <button
              disabled={selection.length < 3 || object.locked}
              onClick={() => onAction("distribute", "x")}
            >
              Horizontal verteilen
            </button>
            <button
              disabled={selection.length < 3 || object.locked}
              onClick={() => onAction("distribute", "y")}
            >
              Vertikal verteilen
            </button>
          </div>
          <small>
            Mit Umschalt-Klick mehrere Elemente auswählen. Gruppen gemeinsam
            verschieben.
          </small>
        </details>
      </section>
    </div>
  );
}
export function BrandLibrary({
  brand,
  images,
  onSave,
  onAdd,
  onStyle,
  selected,
}) {
  const [logo, setLogo] = useState(""),
    [variant, setVariant] = useState("standard"),
    [styleName, setStyleName] = useState("");
  return (
    <div className="mk-design-items">
      <section className="mk-card">
        <h3>Smartwerk Marke</h3>
        <small>Feste Palette · Manrope / Cormorant Garamond</small>
        <div className="mk-swatches">
          {brandColors.map((c) => (
            <span key={c} title={c} style={{ background: c }} />
          ))}
        </div>
        <select
          aria-label="Markenlogo wählen"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
        >
          <option value="">Medium als Logo wählen</option>
          {images.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Logovariante"
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
        >
          <option value="standard">Standard</option>
          <option value="light">Für dunkle Hintergründe</option>
          <option value="dark">Für helle Hintergründe</option>
        </select>
        <button
          disabled={!logo || brand.logos.length >= 20}
          onClick={() =>
            onSave({
              ...brand,
              logos: [
                ...brand.logos,
                {
                  name: (
                    images.find((m) => m.id === logo)?.name || "Logo"
                  ).slice(0, 80),
                  media_id: logo,
                  variant,
                },
              ],
            })
          }
        >
          In Markenbibliothek speichern
        </button>
        {brand.logos.map((l, i) => (
          <div key={`${l.media_id}-${i}`} className="mk-toolbar">
            <button
              onClick={() =>
                onAdd(
                  makeObject("image", uuid(), {
                    name: l.name,
                    media_id: l.media_id,
                    width: 0.2,
                    height: 0.1,
                    x: 0.85,
                    y: 0.08,
                  }),
                )
              }
            >
              {l.name} · {l.variant}
            </button>
            <button
              aria-label={`Markenlogo ${l.name} entfernen`}
              onClick={() =>
                onSave({
                  ...brand,
                  logos: brand.logos.filter((_, index) => index !== i),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
      </section>
      <section className="mk-card">
        <h3>Gespeicherte Textstile</h3>
        {brand.text_styles.map((s, i) => (
          <div className="mk-toolbar" key={`${s.name}-${i}`}>
            <button
              disabled={
                !selected || selected.type !== "text" || selected.locked
              }
              onClick={() =>
                onStyle({
                  font: s.font,
                  size: s.size,
                  weight: s.weight,
                  color: s.color,
                })
              }
            >
              {s.name}
            </button>
            <button
              aria-label={`Textstil ${s.name} entfernen`}
              onClick={() =>
                onSave({
                  ...brand,
                  text_styles: brand.text_styles.filter(
                    (_, index) => index !== i,
                  ),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <input
          aria-label="Name des Textstils"
          placeholder="Name des Textstils"
          value={styleName}
          maxLength={80}
          onChange={(e) => setStyleName(e.target.value)}
        />
        <button
          disabled={
            !styleName.trim() ||
            selected?.type !== "text" ||
            brand.text_styles.length >= 20
          }
          onClick={() =>
            onSave({
              ...brand,
              text_styles: [
                ...brand.text_styles,
                {
                  name: styleName.trim(),
                  font: selected.font,
                  size: selected.size,
                  weight: selected.weight,
                  color: selected.color,
                },
              ],
            })
          }
        >
          Ausgewählten Textstil speichern
        </button>
      </section>
    </div>
  );
}
