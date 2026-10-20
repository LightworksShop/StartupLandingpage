import {
  applyAnimationPreset,
  setAnimationDuration,
} from "../../../lib/marketing/design-animation";
import {
  autoFit,
  blankDesign,
  brandFonts,
  designWarnings,
  formatLabels,
  smartResize,
} from "../../../lib/marketing/design-model";
import { Icon, Thumbnail } from "./common";
import AnimationPanel from "./design-animation";
import { Palette, Panel, PanelTabs, Range, toolTabs } from "./design-controls";
import { ObjectInspector } from "./design-elements";
import { Scene } from "./design-scene";

export default function DesignInspector({
  onSavePost,
  tools,
  openTools,
  activeObject,
  selection,
  editObject,
  objectAction,
  imageMedia,
  design,
  locked,
  change,
  urls,
  imageReady,
  commit,
  nested,
  selectLayer,
  selectObject,
  selectedLayer,
  setAnimationPreview,
  setOutputType,
  outputType,
  exports,
  setExports,
  busy,
  onExport,
  rootDesign,
  setRendered,
  setAssignment,
  natural,
  images,
  rendered,
  assignment,
  media,
  posts,
  selectedExport,
  canAssign,
  onAssign,
}) {
  return (
    <aside className="mk-design-controls" aria-label="Gestaltungswerkzeuge">
      <PanelTabs
        group="tools"
        label="Werkzeuge"
        tabs={
          onSavePost ? toolTabs.filter(([id]) => id !== "calendar") : toolTabs
        }
        active={tools}
        onChange={openTools}
      />
      <Panel group="tools" id="object" active={tools === "object"}>
        <ObjectInspector
          object={activeObject?.type === "shape" ? activeObject : null}
          selection={selection}
          onChange={editObject}
          onAction={objectAction}
          images={imageMedia}
          warnings={designWarnings(design)}
        />
      </Panel>
      <Panel group="tools" id="product" active={tools === "product"}>
        <section className="mk-card">
          <h3>Produktbild</h3>
          <select
            aria-label="Produktbild wählen"
            value={design.image_url}
            disabled={locked("product")}
            onChange={(e) => change("image_url", e.target.value)}
          >
            <option value="">Transparentes Original wählen</option>
            {urls.map((u, i) => (
              <option value={u} key={u}>
                Bild {i + 1}
              </option>
            ))}
          </select>
          <button
            disabled={locked("product") || !imageReady}
            onClick={() => commit(autoFit(design))}
          >
            Produkt automatisch einpassen
          </button>
          <div className="mk-segment">
            {[
              ["Links", "x", 0],
              ["Zentrieren", "x", 0.5],
              ["Rechts", "x", 1],
              ["Oben", "y", 0],
              ["Mittig", "y", 0.5],
              ["Unten", "y", 1],
            ].map(([label, key, value]) => (
              <button
                key={label}
                aria-label={label}
                disabled={locked("product")}
                aria-pressed={design[key] === value}
                onClick={() => change(key, value)}
              >
                {label}
              </button>
            ))}
          </div>
          {[
            ["Größe", "scale", 0.1, 1],
            ["Drehung", "rotation", -180, 180],
          ].map(([label, key, min, max]) => (
            <Range
              key={key}
              label={label}
              value={design[key]}
              min={min}
              max={max}
              step={key === "rotation" ? 1 : 0.01}
              disabled={locked("product")}
              onChange={(v) => change(key, v)}
            />
          ))}
          <label className="mk-inline">
            <input
              type="checkbox"
              checked={design.aspect_locked}
              disabled={locked("product")}
              onChange={(e) => change("aspect_locked", e.target.checked)}
            />
            Seitenverhältnis sperren
          </label>
          {!design.aspect_locked && (
            <Range
              label="Breitenverhältnis"
              min={0.5}
              max={2}
              value={design.stretch}
              disabled={locked("product")}
              onChange={(v) => change("stretch", v)}
            />
          )}
        </section>
        <section className="mk-card">
          <h3>Produktschatten</h3>
          {[
            ["Stärke", "strength", 0, 1],
            ["Weichheit", "softness", 0, 80],
            ["Abstand", "distance", 0, 150],
            ["Richtung", "direction", -180, 180],
          ].map(([label, key, min, max]) => (
            <Range
              key={key}
              label={label}
              value={design.shadow[key]}
              min={min}
              max={max}
              step={key === "strength" ? 0.01 : 1}
              disabled={locked("product")}
              onChange={(v) => nested("shadow", key, v)}
            />
          ))}
        </section>
      </Panel>
      <Panel group="tools" id="background" active={tools === "background"}>
        <section className="mk-card">
          <h3>Hintergrund</h3>
          {[
            ["Hintergrund horizontal", "x", 0, 1],
            ["Hintergrund vertikal", "y", 0, 1],
            ["Hintergrund Zoom", "zoom", 1, 4],
          ].map(([label, key, min, max]) => (
            <Range
              key={key}
              label={label}
              value={design.background_transform[key]}
              min={min}
              max={max}
              disabled={locked("background")}
              onChange={(v) => nested("background_transform", key, v)}
            />
          ))}
          <select
            aria-label="Hintergrund wählen"
            value={design.background_id || ""}
            disabled={locked("background")}
            onChange={(e) => change("background_id", e.target.value || null)}
          >
            <option value="">Farbfläche</option>
            {imageMedia.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Palette
            label="Hintergrundfarbe"
            value={design.color}
            disabled={locked("background")}
            onChange={(v) => change("color", v)}
          />
          {[
            ["Helligkeit", "brightness", 0, 2],
            ["Kontrast", "contrast", 0, 2],
            ["Sättigung", "saturation", 0, 2],
            ["Blur", "blur", 0, 50],
            ["Farbton", "hue", -180, 180],
          ].map(([label, key, min, max]) => (
            <Range
              key={key}
              label={label}
              value={design.adjustments[key]}
              min={min}
              max={max}
              step={key === "hue" || key === "blur" ? 1 : 0.01}
              disabled={locked("background")}
              onChange={(v) => nested("adjustments", key, v)}
            />
          ))}
          <button
            disabled={locked("background")}
            onClick={() => change("adjustments", blankDesign().adjustments)}
          >
            Hintergrundfilter zurücksetzen
          </button>
        </section>
      </Panel>
      <Panel group="tools" id="text" active={tools === "text"}>
        {design.objects.some((o) => o.type === "text") && (
          <label className="mk-inspector-choice">
            Text bearbeiten
            <select
              aria-label="Text bearbeiten"
              value={activeObject?.type === "text" ? activeObject.id : "legacy"}
              onChange={(e) =>
                e.target.value === "legacy"
                  ? selectLayer("text")
                  : selectObject(e.target.value)
              }
            >
              {design.objects
                .filter((o) => o.type === "text")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              <option value="legacy">Überschrift / Unterzeile / CTA</option>
            </select>
          </label>
        )}
        {activeObject?.type === "text" ? (
          <ObjectInspector
            object={activeObject}
            selection={selection}
            onChange={editObject}
            onAction={objectAction}
            images={imageMedia}
            warnings={designWarnings(design)}
          />
        ) : (
          <section className="mk-card">
            <h3>Layout & Textbausteine</h3>
            <label>
              Layout
              <select
                aria-label="Layout"
                disabled={locked("text")}
                value={design.template}
                onChange={(e) => change("template", e.target.value)}
              >
                <option value="plain">Freie Fläche</option>
                <option value="caption">Mit Textfläche</option>
              </select>
            </label>
            <label>
              Überschrift
              <input
                aria-label="Überschrift"
                value={design.text}
                disabled={locked("text")}
                maxLength={80}
                placeholder="Überschrift"
                onChange={(e) => change("text", e.target.value)}
              />
            </label>
            <label>
              Unterzeile
              <input
                value={design.subtitle}
                disabled={locked("text")}
                maxLength={100}
                onChange={(e) => change("subtitle", e.target.value)}
              />
            </label>
            <label>
              CTA
              <input
                value={design.cta}
                disabled={locked("text")}
                maxLength={60}
                onChange={(e) => change("cta", e.target.value)}
              />
            </label>
            <label>
              Schrift
              <select
                aria-label="Schrift"
                value={design.font}
                disabled={locked("text")}
                onChange={(e) => change("font", e.target.value)}
              >
                {Object.keys(brandFonts).map((key) => (
                  <option key={key} value={key}>
                    {key === "sans" ? "Smartwerk Sans" : "Smartwerk Display"}{" "}
                    · {key === "sans" ? "Manrope" : "Cormorant Garamond"}
                  </option>
                ))}
              </select>
            </label>
            <Palette
              label="Textfarbe"
              value={design.text_color}
              disabled={locked("text")}
              onChange={(v) => change("text_color", v)}
            />
            {[["Textgröße", "text_scale", 0.5, 3]].map(
              ([label, key, min, max]) => (
                <Range
                  key={key}
                  label={label}
                  value={design[key]}
                  min={min}
                  max={max}
                  disabled={locked("text")}
                  onChange={(v) => change(key, v)}
                />
              ),
            )}
          </section>
        )}
      </Panel>
      <Panel group="tools" id="overlay" active={tools === "overlay"}>
        {design.objects.some((o) => o.type === "image") && (
          <label className="mk-inspector-choice">
            Logo / Bild bearbeiten
            <select
              aria-label="Logo / Bild bearbeiten"
              value={
                activeObject?.type === "image" ? activeObject.id : "legacy"
              }
              onChange={(e) =>
                e.target.value === "legacy"
                  ? selectLayer("overlay")
                  : selectObject(e.target.value)
              }
            >
              {design.objects
                .filter((o) => o.type === "image")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              <option value="legacy">Logo / Overlay</option>
            </select>
          </label>
        )}
        {activeObject?.type === "image" ? (
          <ObjectInspector
            object={activeObject}
            selection={selection}
            onChange={editObject}
            onAction={objectAction}
            images={imageMedia}
            warnings={designWarnings(design)}
          />
        ) : (
          <section className="mk-card">
            <h3>Logo / Overlay</h3>
            <select
              aria-label="Logo / Overlay wählen"
              value={design.overlay.media_id || ""}
              disabled={locked("overlay")}
              onChange={(e) =>
                nested("overlay", "media_id", e.target.value || null)
              }
            >
              <option value="">Kein Overlay</option>
              {imageMedia.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {[
              ["Overlay Größe", "scale", 0.05, 0.8],
              ["Overlay Drehung", "rotation", -180, 180],
              ["Overlay Deckkraft", "opacity", 0, 1],
            ].map(([label, key, min, max]) => (
              <Range
                key={key}
                label={label}
                value={design.overlay[key]}
                min={min}
                max={max}
                step={key === "rotation" ? 1 : 0.01}
                disabled={locked("overlay")}
                onChange={(v) => nested("overlay", key, v)}
              />
            ))}
          </section>
        )}
      </Panel>
      <Panel group="tools" id="animation" active={tools === "animation"}>
        <AnimationPanel
          design={design}
          activeTarget={
            activeObject
              ? `object:${activeObject.id}`
              : selectedLayer === "text"
                ? "headline"
                : selectedLayer
          }
          onPreview={() => setAnimationPreview((n) => n + 1)}
          onPreset={(preset) => {
            commit((d) => applyAnimationPreset(d, preset));
            if (preset !== "none") setOutputType("mp4");
          }}
          onDuration={(duration) =>
            commit((d) => setAnimationDuration(d, duration))
          }
          onSettings={(patch) => {
            commit((d) => ({
              ...d,
              animation_settings: {
                ...d.animation_settings,
                ...patch,
                preset: "custom",
              },
            }));
            setOutputType("mp4");
          }}
          onElement={(target, timing) => {
            commit((d) => ({
              ...d,
              animation_settings: {
                ...d.animation_settings,
                preset: "custom",
                layers: target.startsWith("object:")
                  ? d.animation_settings.layers
                  : { ...d.animation_settings.layers, [target]: timing },
              },
              objects: d.objects.map((o) =>
                `object:${o.id}` === target && !o.locked
                  ? {
                      ...o,
                      animation: timing.effect,
                      animation_start: timing.start,
                      animation_time: timing.duration,
                      animation_direction: timing.direction,
                    }
                  : o,
              ),
            }));
            if (timing.effect !== "none") setOutputType("mp4");
          }}
        />
      </Panel>
      <Panel group="tools" id="output" active={tools === "output"}>
        <section className="mk-card">
          <h3>
            {onSavePost
              ? "Beitragsformat & Vorschau"
              : "Kanalexport · Smart Resize"}
          </h3>
          <label>
            Anpassung
            <select
              aria-label="Formatanpassung"
              value={design.layout_mode}
              onChange={(e) => change("layout_mode", e.target.value)}
            >
              <option value="anchors">Relative Positionen erhalten</option>
              <option value="adaptive">Produkt / Text neu anordnen</option>
            </select>
          </label>
          <label>
            Exportformat
            <select
              aria-label="Exportformat"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
            >
              <option value="jpeg">
                {onSavePost ? "Bild (JPEG)" : "JPEG · Einzelbilder / Carousel"}
              </option>
              <option value="mp4">MP4 · Animierte Elemente</option>
            </select>
          </label>
          {outputType === "mp4" && (
            <p>
              {design.animation_duration} Sekunden ·{" "}
              <button onClick={() => openTools("animation")}>
                Animation bearbeiten
              </button>
            </p>
          )}
          {designWarnings(design).map((w) => (
            <p role="status" key={w}>
              {w}
            </p>
          ))}
          {!onSavePost && (
            <>
              {Object.entries(formatLabels).map(([key, label]) => (
                <label className="mk-inline" key={key}>
                  <input
                    type="checkbox"
                    checked={exports.includes(key)}
                    onChange={(e) =>
                      setExports(
                        e.target.checked
                          ? [...exports, key]
                          : exports.filter((f) => f !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
              <button
                className="mk-primary"
                disabled={
                  (design.image_url && !imageReady) || !exports.length || busy
                }
                onClick={() =>
                  onExport(
                    rootDesign,
                    exports,
                    (m) => {
                      setRendered((current) => [
                        ...current.filter((v) => v.id !== m.id),
                        m,
                      ]);
                      setAssignment((current) => ({
                        ...current,
                        media: m.id,
                      }));
                    },
                    outputType,
                  )
                }
              >
                <Icon name="upload" />
                Für Kanäle exportieren
              </button>
              <small>
                Alle Seiten und Formate werden in Reihenfolge im Medienpool
                gespeichert. Story ist ein Medienformat; Instagram-Beiträge
                benötigen Feed-Formate.
              </small>
            </>
          )}
          {onSavePost && (
            <p>
              „Speichern“ übernimmt Bild oder Video direkt in diesen
              Kalenderbeitrag.
            </p>
          )}
        </section>
        {!onSavePost && (
          <details className="mk-channel-previews">
            <summary>Vorschau je Kanal · Smart Resize</summary>
            <div className="mk-channel-grid">
              {exports.map((format) => (
                <div key={format}>
                  <strong>{formatLabels[format]}</strong>
                  <Scene
                    design={smartResize(design, format)}
                    natural={natural}
                    images={images}
                    id={`preview-${format}`}
                  />
                </div>
              ))}
            </div>
          </details>
        )}
        {!!rendered.length && (
          <section className="mk-card">
            <h3>Gespeicherte Medien</h3>
            {rendered.map((m) => (
              <a
                className="mk-export-link"
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noreferrer"
              >
                <Thumbnail media={m} />
                {m.name}
              </a>
            ))}
          </section>
        )}
      </Panel>
      <Panel group="tools" id="calendar" active={tools === "calendar"}>
        <section className="mk-card">
          <h3>Kalenderbeitrag zuordnen</h3>
          <label>
            Exportiertes Medium
            <select
              aria-label="Exportiertes Medium"
              value={assignment.media}
              onChange={(e) =>
                setAssignment({ ...assignment, media: e.target.value })
              }
            >
              <option value="">Medium wählen</option>
              {[
                ...new Map(
                  [...media.filter((m) => m.composition), ...rendered].map(
                    (m) => [m.id, m],
                  ),
                ).values(),
              ].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kalenderbeitrag
            <select
              aria-label="Kalenderbeitrag"
              value={assignment.post}
              onChange={(e) =>
                setAssignment({ ...assignment, post: e.target.value })
              }
            >
              <option value="">Neuen Beitrag als Entwurf anlegen</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.content.topic}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kanal
            <select
              aria-label="Zuordnung Kanal"
              value={assignment.channel}
              onChange={(e) =>
                setAssignment({ ...assignment, channel: e.target.value })
              }
            >
              {["linkedin", "instagram", "pinterest", "facebook"].map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </label>
          {selectedExport && !canAssign && (
            <p>{assignment.channel === "linkedin" ? "Für LinkedIn bitte ein JPEG- oder PNG-Bild wählen." : "Für Instagram bitte einen Feed-Export wählen."}</p>
          )}
          <button
            disabled={!canAssign || busy}
            onClick={() =>
              onAssign({
                media: selectedExport,
                postId: assignment.post,
                channel: assignment.channel,
              })
            }
          >
            Medium zuordnen & Beitrag öffnen
          </button>
          <small>
            Als Entwurf speichern und danach Termin und Beitragstext ergänzen.
            Eine bestehende Freigabe wird bei Änderungen aufgehoben.
          </small>
        </section>
      </Panel>
    </aside>
  );
}
