import {
  formatLabels,
  safeZone,
  smartResize,
} from "../../../lib/marketing/design-model";
import { Icon } from "./common";
import { Scene } from "./design-scene";

export default function DesignCanvas({
  design,
  commit,
  canvasViewport,
  canvasSize,
  mobilePreview,
  g,
  zoom,
  natural,
  images,
  animationPreview,
  stage,
  startDrag,
  moveDrag,
  endDrag,
  safeZones,
  guides,
  objectHit,
  overlay,
  logo,
  text,
  selectedLayer,
  setNaturalImage,
  poolImages,
  setImageSizes,
  setZoom,
  setGuides,
  setSafeZones,
  setMobilePreview,
  setAnimationPreview,
  imageReady,
}) {
  return (
    <section className="mk-design-stage">
      <div className="mk-canvas-toolbar">
        <label>
          <span className="mk-sr-only">Vorschauformat</span>
          <select
            aria-label="Vorschauformat"
            value={design.format}
            onChange={(e) => commit((d) => smartResize(d, e.target.value))}
          >
            {Object.entries(formatLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mk-canvas-scroll" ref={canvasViewport}>
        <div
          className="mk-canvas-wrap"
          style={{
            width: `${(Math.min(canvasSize.width, mobilePreview ? 320 : Infinity, (canvasSize.height * g.width) / g.height) * zoom) / 100}px`,
            aspectRatio: `${g.width}/${g.height}`,
          }}
        >
          <Scene
            design={design}
            natural={natural}
            images={images}
            id="main"
            previewKey={animationPreview}
          />
          <svg
            ref={stage}
            className="mk-canvas-interaction"
            viewBox={`0 0 ${g.width} ${g.height}`}
            aria-label="Layoutvorschau"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={(e) => endDrag(e, true)}
            // Native SVG/selection dragging cancels the pointer gesture in Chromium.
            onDragStart={(e) => e.preventDefault()}
          >
            {safeZones &&
              (() => {
                const z = safeZone(design.format);
                return (
                  <g pointerEvents="none">
                    <path
                      d={`M0 0H${g.width}V${g.height}H0Z M${z.x} ${z.y}V${z.y + z.height}H${z.x + z.width}V${z.y}Z`}
                      fill="#f97316"
                      opacity=".15"
                      fillRule="evenodd"
                    />
                    <rect
                      x={z.x}
                      y={z.y}
                      width={z.width}
                      height={z.height}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      strokeDasharray="8 8"
                    />
                  </g>
                );
              })()}
            {guides && (
              <g className="mk-guides" pointerEvents="none">
                <line x1={g.width / 2} y1="0" x2={g.width / 2} y2={g.height} />
                <line
                  x1="0"
                  y1={g.safeHeight / 2}
                  x2={g.width}
                  y2={g.safeHeight / 2}
                />
                <rect
                  x={g.width * 0.05}
                  y={g.height * 0.05}
                  width={g.width * 0.9}
                  height={g.height * 0.9}
                />
              </g>
            )}
            {design.objects
              .filter((o) => o.visible && o.plane === "background")
              .map(objectHit)}
            {design.layers
              .filter((l) => l.visible && l.id !== "background")
              .map((layer) => {
                if (
                  (layer.id === "product" && !design.image_url) ||
                  (layer.id === "overlay" && !overlay) ||
                  (layer.id === "text" &&
                    !design.text &&
                    !design.subtitle &&
                    !design.cta)
                )
                  return null;
                const bounds =
                  layer.id === "product"
                    ? [g.cx - g.bw / 2, g.cy - g.bh / 2, g.bw, g.bh]
                    : layer.id === "overlay"
                      ? [
                          logo.cx - logo.bounds / 2,
                          logo.cy - logo.bounds / 2,
                          logo.bounds,
                          logo.bounds,
                        ]
                      : [
                          text.cx - text.available / 2,
                          text.cy - text.gap - 44 * design.text_scale,
                          text.available,
                          text.gap * 2 + 44 * design.text_scale + 12,
                        ];
                return (
                  <rect
                    key={layer.id}
                    data-layer={layer.id}
                    x={bounds[0]}
                    y={bounds[1]}
                    width={bounds[2]}
                    height={bounds[3]}
                    fill="transparent"
                    stroke={
                      selectedLayer === layer.id ? "#f97316" : "transparent"
                    }
                    strokeWidth="3"
                    strokeDasharray="10 8"
                    style={{ cursor: layer.locked ? "default" : "move" }}
                  />
                );
              })}
            {design.objects
              .filter((o) => o.visible && o.plane !== "background")
              .map(objectHit)}
          </svg>
        </div>
        {design.image_url && (
          <img
            key={design.image_url}
            src={design.image_url}
            alt=""
            className="mk-image-probe"
            onLoad={(e) =>
              setNaturalImage({
                url: design.image_url,
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
            onError={() => setNaturalImage(null)}
          />
        )}
        {poolImages.map((m) => (
          <img
            key={`${m.id}:${m.url}`}
            src={m.url}
            alt=""
            className="mk-image-probe"
            onLoad={(e) => {
              // Browser dimensions include EXIF orientation, also for pool
              // records imported before oriented dimensions were stored.
              const width = e.currentTarget.naturalWidth,
                height = e.currentTarget.naturalHeight;
              setImageSizes((sizes) =>
                sizes[m.url]?.width === width && sizes[m.url]?.height === height
                  ? sizes
                  : { ...sizes, [m.url]: { width, height } },
              );
            }}
          />
        ))}
      </div>
      <div className="mk-toolbar mk-zoom">
        <button
          aria-label="Verkleinern"
          onClick={() => setZoom(Math.max(50, zoom - 25))}
        >
          −
        </button>
        <span>{zoom}%</span>
        <button
          aria-label="Vergrößern"
          onClick={() => setZoom(Math.min(200, zoom + 25))}
        >
          +
        </button>
        <button aria-label="An Ansicht anpassen" onClick={() => setZoom(100)}>
          <Icon name="expand" />
        </button>
        <label className="mk-inline">
          <input
            type="checkbox"
            aria-label="Hilfslinien & Einrasten"
            checked={guides}
            onChange={(e) => setGuides(e.target.checked)}
          />
          Hilfslinien
        </label>
        <label
          className="mk-inline"
          title="Konservative Hilfsbereiche; Plattformoberflächen können abweichen"
        >
          <input
            type="checkbox"
            checked={safeZones}
            onChange={(e) => setSafeZones(e.target.checked)}
          />
          Safe Zones
        </label>
        <button
          aria-label="Handyvorschau"
          title="Handyvorschau"
          aria-pressed={mobilePreview}
          onClick={() => setMobilePreview(!mobilePreview)}
        >
          Handy
        </button>
        <button
          aria-label="Animation ansehen"
          title="Animation ansehen"
          onClick={() => {
            setAnimationPreview((n) => n + 1);
          }}
        >
          ▶
        </button>
        <span
          className="mk-canvas-help"
          title="Ebene auf dem Canvas verschieben. Produktbilder benötigen transparente Originale; Hintergrundfilter wirken ausschließlich auf den Hintergrund."
        >
          ⓘ
        </span>
      </div>
      {design.image_url && !imageReady && (
        <p role="status">
          Produktbild wird geladen. Bei einem Ladefehler bitte ein anderes
          Original wählen.
        </p>
      )}
    </section>
  );
}
