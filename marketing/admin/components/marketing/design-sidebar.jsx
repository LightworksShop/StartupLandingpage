import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./common";
import { layerNames, makeObject } from "../../../lib/marketing/design-model";

const sidebarTabs = [
  ["products", "Produkte", "product"],
  ["media", "Medien", "image"],
  ["elements", "Elemente", "elements"],
  ["brand", "Marke", "brand"],
  ["pages", "Seiten", "pages"],
  ["templates", "Vorlagen", "template"],
  ["layers", "Ebenen", "layers"],
  ["versions", "Versionen", "history"],
];

function SidebarIcon({ name }) {
  const paths = {
    elements: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <circle cx="17" cy="7" r="4" />
        <path d="m7 14 5 7H2l5-7Zm8 2h6m-3-3v6" />
      </>
    ),
    brand: <path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />,
    pages: (
      <>
        <rect x="7" y="7" width="13" height="14" rx="2" />
        <path d="M16 7V3H3v14h4" />
      </>
    ),
    template: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 9v12" />
      </>
    ),
    history: (
      <>
        <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" />
      </>
    ),
    text: <path d="M5 5h14M12 5v14M8 19h8M5 5v3M19 5v3" />,
    shape: <rect x="4" y="4" width="16" height="16" rx="1" />,
    product: (
      <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10 9-5M12 13 3 8m9 5v8M7 6l9 5" />
    ),
    layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
    eye: (
      <>
        <path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    hidden: (
      <>
        <path d="m3 3 18 18M9 6c7-2 13 6 13 6a19 19 0 0 1-4 4M6 7a19 19 0 0 0-4 5s3 6 10 6l3-.4" />
      </>
    ),
    lock: (
      <>
        <rect x="6" y="10" width="12" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    unlock: (
      <>
        <rect x="6" y="10" width="12" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 7-2" />
      </>
    ),
    grip: (
      <>
        {[7, 12, 17].flatMap((y) =>
          [9, 15].map((x) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="1"
              fill="currentColor"
              stroke="none"
            />
          )),
        )}
      </>
    ),
    down: <path d="m6 9 6 6 6-6" />,
  };
  if (!paths[name]) return <Icon name={name} size={17} />;
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function LayerRow({
  layer,
  selected,
  onSelect,
  onToggle,
  onReorder,
  peers,
  dragging,
  onDrag,
}) {
  const index = peers.findIndex((l) => l.id === layer.id);
  return (
    <div
      className="mk-layer-row"
      data-selected={selected}
      data-layer-id={layer.id}
      onDragOver={(e) => {
        if (dragging?.kind === layer.kind && !layer.locked) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (dragging?.kind === layer.kind)
          onReorder(layer.kind, dragging.id, layer.id);
        onDrag(null);
      }}
    >
      <button
        className="mk-layer-grip"
        aria-label={`${layer.name} verschieben`}
        title="Ziehen oder mit Pfeil hoch/runter verschieben"
        disabled={layer.locked}
        draggable={!layer.locked}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", layer.id);
          e.dataTransfer.effectAllowed = "move";
          onDrag({ kind: layer.kind, id: layer.id });
        }}
        onDragEnd={() => onDrag(null)}
        onKeyDown={(e) => {
          const delta =
            e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
          if (!delta) return;
          e.preventDefault();
          if (peers[index + delta])
            onReorder(layer.kind, layer.id, peers[index + delta].id);
        }}
      >
        <SidebarIcon name="grip" />
      </button>
      <button
        className="mk-layer-select"
        aria-pressed={selected}
        onClick={onSelect}
        title={layer.name}
      >
        <SidebarIcon name={layer.icon} />
        <span>
          {layer.name}
          {layer.group ? " · Gruppe" : ""}
        </span>
      </button>
      <label
        className="mk-layer-toggle"
        title={layer.visible ? "Ausblenden" : "Einblenden"}
      >
        <input
          aria-label={`${layer.name} sichtbar`}
          type="checkbox"
          checked={layer.visible}
          disabled={layer.kind === "objects" && layer.locked}
          onChange={(e) => onToggle("visible", e.target.checked)}
        />
        <SidebarIcon name={layer.visible ? "eye" : "hidden"} />
      </label>
      <label
        className="mk-layer-toggle"
        title={layer.locked ? "Entsperren" : "Sperren"}
      >
        <input
          aria-label={`${layer.name} sperren`}
          type="checkbox"
          checked={layer.locked}
          onChange={(e) => onToggle("locked", e.target.checked)}
        />
        <SidebarIcon name={layer.locked ? "lock" : "unlock"} />
      </label>
    </div>
  );
}

export default function DesignSidebar({
  children,
  singlePage = false,
  pages,
  pageIndex,
  pageCount,
  contentTab,
  onContentTabChange,
  design,
  selection,
  selectedLayer,
  onSelectObject,
  onSelectLayer,
  onToggle,
  onReorder,
  onAdd,
}) {
  const tabs = sidebarTabs.filter(([id]) => !singlePage || id !== "pages");
  const [view, setView] = useState("layers"),
    [adding, setAdding] = useState(false),
    [dragging, setDragging] = useState(null);
  const addControl = useRef(null);
  useEffect(() => {
    if (!adding) return;
    const dismiss = (e) => {
      if (!addControl.current?.contains(e.target)) setAdding(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [adding]);
  const activeTab = view === "contents" ? contentTab : view;
  const browse = (id) => {
    if (id === "layers" || id === "pages") setView(id);
    else {
      onContentTabChange(id);
      setView("contents");
    }
    setAdding(false);
  };
  const add = (type, patch) => {
    const id = `object_${Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    onAdd(makeObject(type, id, patch));
    setAdding(false);
  };
  const objects = [...design.objects]
    .reverse()
    .map((o) => ({ ...o, kind: "objects", icon: o.type }));
  const layers = [...design.layers].reverse().map((l) => ({
    ...l,
    kind: "layers",
    name: layerNames[l.id],
    icon: l.id === "overlay" ? "image" : l.id === "background" ? "shape" : l.id,
  }));
  // Match the shared scene: foreground objects, built-in stack, and background
  // objects immediately in front of the background layer.
  const rows = [
    ...objects.filter((o) => o.plane !== "background"),
    ...layers.flatMap((l) =>
      l.id === "background"
        ? [...objects.filter((o) => o.plane === "background"), l]
        : [l],
    ),
  ];
  return (
    <aside
      className="mk-design-library mk-design-sidebar"
      aria-label="Gestaltungsbibliothek"
    >
      <div role="tablist" aria-label="Bibliothek" className="mk-library-tabs">
        {tabs.map(([id, name, icon], index) => (
          <button
            key={id}
            role="tab"
            id={`library-${id}-tab`}
            aria-label={name}
            title={name}
            aria-controls={`library-${id}-panel`}
            aria-selected={activeTab === id}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => browse(id)}
            onKeyDown={(e) => {
              let next;
              if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
              if (e.key === "ArrowLeft")
                next = (index - 1 + tabs.length) % tabs.length;
              if (e.key === "Home") next = 0;
              if (e.key === "End") next = tabs.length - 1;
              if (next === undefined) return;
              e.preventDefault();
              browse(tabs[next][0]);
              e.currentTarget.parentElement
                .querySelector(`#library-${tabs[next][0]}-tab`)
                .focus();
            }}
          >
            <SidebarIcon name={icon} />
          </button>
        ))}
      </div>
      <div
        className="mk-add-element"
        ref={addControl}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAdding(false);
            addControl.current.querySelector("button").focus();
          }
        }}
      >
        <button
          className="mk-primary mk-add-element-button"
          aria-expanded={adding}
          aria-controls="design-add-options"
          onClick={() => setAdding(!adding)}
        >
          <Icon name="plus" size={17} />
          <span>Element hinzufügen</span>
          <span className="mk-add-chevron">
            <SidebarIcon name="down" />
          </span>
        </button>
        {adding && (
          <div
            id="design-add-options"
            className="mk-add-options"
            role="group"
            aria-label="Element hinzufügen"
          >
            <button
              disabled={objects.length >= 50}
              onClick={() =>
                add("text", {
                  name: "Überschrift",
                  text: "Überschrift",
                  size: 52,
                  y: 0.18,
                  width: 0.8,
                  height: 0.18,
                  layout_role: "headline",
                })
              }
            >
              <SidebarIcon name="text" />
              Überschrift hinzufügen
            </button>
            <button
              disabled={objects.length >= 50}
              onClick={() =>
                add("text", {
                  name: "Text",
                  text: "Text",
                  size: 30,
                  width: 0.8,
                  height: 0.18,
                })
              }
            >
              <SidebarIcon name="text" />
              Text hinzufügen
            </button>
            <button
              disabled={objects.length >= 50}
              onClick={() =>
                add("shape", { name: "Fläche", shape: "rect", height: 0.1 })
              }
            >
              <SidebarIcon name="shape" />
              Fläche hinzufügen
            </button>
            <button onClick={() => browse("elements")}>
              <SidebarIcon name="image" />
              Bilder & weitere Elemente
            </button>
            <button onClick={() => browse("brand")}>
              <SidebarIcon name="image" />
              Logo / Marke
            </button>
            <button onClick={() => browse("products")}>
              <SidebarIcon name="product" />
              Produkt wählen
            </button>
            <button onClick={() => browse("media")}>
              <SidebarIcon name="shape" />
              Hintergrund wählen
            </button>
          </div>
        )}
      </div>
      <div className="mk-library-contents" hidden={view !== "contents"}>
        {children}
      </div>
      <section
        id="library-pages-panel"
        className="mk-panel-scroll mk-page-list"
        role="tabpanel"
        aria-labelledby="library-pages-tab"
        tabIndex={0}
        hidden={view !== "pages"}
      >
        {pages}
      </section>
      <section
        id="library-layers-panel"
        className="mk-panel-scroll mk-layer-list"
        role="tabpanel"
        aria-labelledby="library-layers-tab"
        tabIndex={0}
        hidden={view !== "layers"}
      >
        {rows.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            selected={
              layer.kind === "objects"
                ? selection.includes(layer.id)
                : !selection.length && selectedLayer === layer.id
            }
            onSelect={(e) =>
              layer.kind === "objects"
                ? onSelectObject(layer.id, e.shiftKey)
                : onSelectLayer(layer.id)
            }
            onToggle={(key, value) =>
              onToggle(layer.kind, layer.id, key, value)
            }
            onReorder={onReorder}
            peers={rows.filter(
              (l) =>
                l.kind === layer.kind &&
                (l.kind !== "objects" || l.plane === layer.plane),
            )}
            dragging={dragging}
            onDrag={setDragging}
          />
        ))}
      </section>
      {!singlePage && (
        <div className="mk-sidebar-pages">
          <button
            className="mk-pages-toggle"
            aria-label="Seitenverwaltung"
            aria-expanded={view === "pages"}
            aria-controls="library-pages-panel"
            onClick={() => browse(view === "pages" ? "layers" : "pages")}
          >
            <SidebarIcon name="layers" />
            <span>
              Seiten · {pageIndex + 1} / {pageCount}
            </span>
            <Icon name={view === "pages" ? "left" : "right"} size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
