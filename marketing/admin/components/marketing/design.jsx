import { useLayoutEffect, useRef, useState } from "react";
import {
  blankDesign,
  clamp,
  distributeObjects,
  normalizeDesign,
  objectGeometry,
  overlayGeometry,
  productGeometry,
  textGeometry,
} from "../../../lib/marketing/design-model";
import displayFont from "../../assets/marketing-fonts/display.ttf";
import sansFont from "../../assets/marketing-fonts/sans.ttf";
import DesignCanvas from "./design-canvas";
import { newId } from "./design-controls";
import DesignInspector from "./design-inspector";
import DesignLibrary from "./design-library";
import { useDesignHistory } from "./use-design-history";
export { blankDesign } from "../../../lib/marketing/design-model";
export default function Design({
  products,
  media,
  drafts,
  posts = [],
  brand = { logos: [], text_styles: [] },
  onSaveBrand,
  onSave,
  onExport,
  onAssign,
  initialDesign,
  onSavePost,
  postVersions,
  versionsLoading,
  versionsError,
  onRetryVersions,
  onRestorePostVersion,
  busy,
}) {
  const {
    history,
    setHistory,
    pageIndex,
    setPageIndex,
    rootDesign,
    design,
    writePage,
    commit,
    change,
    nested,
    undo,
    redo,
    versionId,
    setVersionId,
  } = useDesignHistory(initialDesign);
  const [selection, setSelection] = useState([]),
    [safeZones, setSafeZones] = useState(false),
    [mobilePreview, setMobilePreview] = useState(false),
    [outputType, setOutputType] = useState(initialDesign?.output || "jpeg"),
    [animationPreview, setAnimationPreview] = useState(0);
  const activeObject = design.objects.find((o) => selection.includes(o.id));
  const [active, setActive] = useState(null),
    [name, setName] = useState(initialDesign?.name || ""),
    [tab, setTab] = useState(products.length ? "products" : "media"),
    [search, setSearch] = useState(""),
    [tools, setTools] = useState(products.length ? "product" : "background"),
    [mobilePane, setMobilePane] = useState("library"),
    [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 }),
    [naturalImage, setNaturalImage] = useState(null),
    [imageSizes, setImageSizes] = useState({}),
    [zoom, setZoom] = useState(100),
    [exports, setExports] = useState(["square", "facebook"]),
    [rendered, setRendered] = useState([]),
    [selectedLayer, setSelectedLayer] = useState(products.length ? "product" : "background"),
    [guides, setGuides] = useState(true),
    [assignment, setAssignment] = useState({
      post: "",
      channel: "linkedin",
      media: "",
    });
  const workspace = useRef(null),
    canvasViewport = useRef(null),
    focusFrame = useRef(null);
  const measureWorkspace = () => {
    const element = workspace.current;
    if (element)
      element.style.setProperty(
        "--mk-editor-height",
        `${Math.max(320, window.innerHeight - Math.max(0, element.getBoundingClientRect().top) - 24)}px`,
      );
  };
  useLayoutEffect(measureWorkspace);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(measureWorkspace);
    observer.observe(workspace.current.closest("main"));
    window.addEventListener("resize", measureWorkspace);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureWorkspace);
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    };
  }, []);
  useLayoutEffect(() => {
    const resize = () => {
      const el = canvasViewport.current;
      const width = Math.max(1, el.clientWidth - 32),
        height = Math.max(1, el.clientHeight - 32);
      setCanvasSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvasViewport.current);
    resize();
    return () => observer.disconnect();
  }, []);
  const focusTextEditor = () => {
    const origin = document.activeElement;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      // A later field selection takes precedence over this deferred autofocus.
      if (document.activeElement !== origin) return;
      const field = workspace.current?.querySelector(
        '#tools-text-panel textarea, #tools-text-panel input[aria-label="Überschrift"]',
      );
      if (field && !field.matches(":disabled"))
        field.focus({ preventScroll: true });
    });
  };
  const objectTool = (object) =>
    object?.type === "text"
      ? "text"
      : object?.type === "image"
        ? "overlay"
        : "object";
  const selectLayer = (id, focus = true) => {
    setSelection([]);
    setSelectedLayer(id);
    setTools(id);
    setMobilePane("tools");
    if (id === "text" && focus) focusTextEditor();
  };
  const drag = useRef(null),
    stage = useRef(null),
    currentDesign = useRef(design);
  currentDesign.current = design;
  const natural =
    naturalImage?.url === design.image_url
      ? naturalImage
      : { width: 1, height: 1 };
  const imageReady = naturalImage?.url === design.image_url;
  const g = productGeometry(design, natural),
    logo = overlayGeometry(design),
    text = textGeometry(design),
    product = products.find((p) => p.id === design.product_id),
    background = media.find((m) => m.id === design.background_id),
    overlay = media.find((m) => m.id === design.overlay.media_id),
    activeDraft = drafts.find((d) => d.id === active);
  const poolIds = new Set([
    design.background_id,
    design.overlay.media_id,
    ...design.objects.filter((o) => o.type === "image").map((o) => o.media_id),
  ]);
  const poolImages = media.filter((m) => poolIds.has(m.id));
  const mediaSize = (m) =>
    imageSizes[m?.url] ||
    (m?.width && m?.height ? { width: m.width, height: m.height } : undefined);
  const images = {
    product: design.image_url,
    background: background?.url,
    overlay: overlay?.url,
    objects: Object.fromEntries(media.map((m) => [m.id, m.url])),
    sizes: Object.fromEntries(
      poolImages.filter((m) => mediaSize(m)).map((m) => [m.id, mediaSize(m)]),
    ),
    background_size: mediaSize(background),
  };
  const imageMedia = media.filter((m) => m.mime_type.startsWith("image/"));
  const urls = product
    ? [
        ...new Set(
          [
            product.thumbnail,
            ...(product.images || []).map((i) => i.url),
          ].filter(Boolean),
        ),
      ]
    : [];
  const locked = (id) =>
    design.objects.find((o) => o.id === id)?.locked ??
    design.layers.find((l) => l.id === id)?.locked;
  function openDraft(d) {
    setPageIndex(0);
    setSelection([]);
    setHistory({
      past: [],
      present: normalizeDesign(d.composition),
      future: [],
    });
    setActive(d.id);
    setName(d.name.slice(0, 100));
    setVersionId("");
    setRendered([]);
  }
  async function save(isTemplate = false) {
    const id = active || newId();
    const snapshot = {
      id: newId(),
      saved_at: new Date().toISOString(),
      composition: rootDesign,
    };
    await onSave({
      id,
      name: (name.trim() || product?.title || "Gestaltung").slice(0, 100),
      composition: rootDesign,
      is_template: isTemplate || activeDraft?.is_template || false,
      versions: [...(activeDraft?.versions || []), snapshot].slice(-20),
    });
    setActive(id);
  }
  function toggleSidebarLayer(kind, id, key, value) {
    commit((d) => ({
      ...d,
      [kind]: d[kind].map((layer) =>
        layer.id === id ? { ...layer, [key]: value } : layer,
      ),
    }));
  }
  function reorderSidebarLayer(kind, id, targetId) {
    const rows = [...design[kind]],
      from = rows.findIndex((l) => l.id === id),
      to = rows.findIndex((l) => l.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    if (
      rows
        .slice(Math.min(from, to), Math.max(from, to) + 1)
        .some((l) => l.locked)
    )
      return;
    if (kind === "objects" && rows[from].plane !== rows[to].plane) return;
    const [row] = rows.splice(from, 1);
    rows.splice(to, 0, row);
    change(kind, rows);
  }
  function point(e) {
    const rect = stage.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * g.width) / rect.width,
      y: ((e.clientY - rect.top) * g.height) / rect.height,
    };
  }
  function startDrag(e) {
    const id = e.target.dataset.layer;
    const object = design.objects.find((o) => o.id === id);
    if (object) {
      const ids = e.shiftKey
        ? selection.includes(id)
          ? selection.filter((v) => v !== id)
          : [...selection, id]
        : selection.includes(id)
          ? selection
          : [id];
      setSelection(ids);
      setTools(objectTool(design.objects.find((o) => ids.includes(o.id))));
      setMobilePane("tools");
      setSelectedLayer(id);
      if (object.locked || !ids.length || e.shiftKey) return;
      const groupIds = object.group
        ? design.objects
            .filter((o) => o.group === object.group)
            .map((o) => o.id)
        : ids;
      const moving = design.objects.filter((o) => groupIds.includes(o.id));
      if (moving.some((o) => o.locked)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        id,
        ids: groupIds,
        mode: e.target.dataset.mode || "move",
        origin: point(e),
        design,
        root: rootDesign,
        geometry: g,
        object,
      };
      return;
    }
    if (
      !id ||
      locked(id) ||
      id === "background" ||
      (id === "product" && !imageReady)
    )
      return;
    selectLayer(id, false);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id,
      origin: point(e),
      design,
      root: rootDesign,
      geometry: g,
    };
  }
  function moveDrag(e) {
    const gesture = drag.current;
    if (!gesture) return;
    const p = point(e),
      dx = p.x - gesture.origin.x,
      dy = p.y - gesture.origin.y;
    let next = gesture.design;
    const snap = (v) => (guides && Math.abs(v - 0.5) < 0.018 ? 0.5 : clamp(v));
    if (gesture.id === "product")
      next = {
        ...next,
        x: snap(next.x + dx / Math.max(1, g.width - gesture.geometry.bw)),
        y: snap(next.y + dy / Math.max(1, g.safeHeight - gesture.geometry.bh)),
      };
    if (gesture.id === "text")
      next = {
        ...next,
        text_x: snap(next.text_x + dx / g.width),
        text_y: snap(next.text_y + dy / g.height),
      };
    if (gesture.id === "overlay")
      next = {
        ...next,
        overlay: {
          ...next.overlay,
          x: snap(next.overlay.x + dx / Math.max(1, g.width - logo.bounds)),
          y: snap(next.overlay.y + dy / Math.max(1, g.height - logo.bounds)),
        },
      };
    if (gesture.ids)
      next = {
        ...next,
        objects: next.objects.map((o) => {
          if (!gesture.ids.includes(o.id)) return o;
          if (gesture.mode === "scale")
            return {
              ...o,
              width: clamp(o.width + dx / g.width, 0.02, 1),
              height: clamp(o.height + dy / g.height, 0.01, 1),
            };
          if (gesture.mode === "rotate") {
            const b = objectGeometry(o, next);
            return {
              ...o,
              rotation: clamp(
                (Math.atan2(p.y - b.cy, p.x - b.cx) * 180) / Math.PI + 90,
                -180,
                180,
              ),
            };
          }
          const b = objectGeometry(o, next);
          return {
            ...o,
            x: snap(o.x + dx / Math.max(1, g.width - b.bw)),
            y: snap(o.y + dy / Math.max(1, g.height - b.bh)),
          };
        }),
      };
    setHistory((h) => ({ ...h, present: writePage(h.present, next) }));
  }
  function endDrag(e, cancel = false) {
    const gesture = drag.current;
    if (!gesture) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    const next = currentDesign.current;
    if (
      !cancel &&
      JSON.stringify(next) === JSON.stringify(gesture.design) &&
      (gesture.id === "text" || gesture.object?.type === "text")
    )
      focusTextEditor();
    setHistory((h) =>
      cancel
        ? { ...h, present: gesture.root }
        : JSON.stringify(next) === JSON.stringify(gesture.design)
          ? h
          : {
              past: [...h.past, gesture.root].slice(-100),
              present: writePage(h.present, next),
              future: [],
            },
    );
  }
  function selectObject(
    id,
    extend = false,
    object = design.objects.find((o) => o.id === id),
  ) {
    const ids = extend
      ? selection.includes(id)
        ? selection.filter((v) => v !== id)
        : [...selection, id]
      : [id];
    const selected = extend
      ? design.objects.find((o) => ids.includes(o.id))
      : object;
    setSelection(ids);
    setSelectedLayer(id);
    setTools(objectTool(selected));
    setMobilePane("tools");
    if (!extend && selected?.type === "text") focusTextEditor();
  }
  function openTools(id) {
    const type =
      id === "text"
        ? "text"
        : id === "overlay"
          ? "image"
          : id === "object"
            ? "shape"
            : null;
    if (type && activeObject?.type !== type) {
      const object = design.objects.find((o) => o.type === type);
      if (object) {
        selectObject(object.id);
        return;
      }
      if (type !== "shape") {
        selectLayer(id);
        return;
      }
    }
    setTools(id);
    if (id === "text") focusTextEditor();
  }
  function addObject(object) {
    if (design.objects.length >= 50) return;
    commit((d) => ({ ...d, objects: [...d.objects, object] }));
    selectObject(object.id, false, object);
  }
  function editObject(patch) {
    const shared = [
      "x",
      "y",
      "width",
      "height",
      "rotation",
      "opacity",
      "visible",
      "locked",
      "group",
      "plane",
      "layout_role",
      "animation",
    ];
    const specific = Object.keys(patch).some((k) => !shared.includes(k));
    commit((d) => ({
      ...d,
      objects: d.objects.map((o) =>
        selection.includes(o.id) &&
        (!specific || o.type === activeObject?.type) &&
        (!o.locked || Object.keys(patch).every((k) => k === "locked"))
          ? { ...o, ...patch }
          : o,
      ),
    }));
  }

  function objectAction(action, arg) {
    const selected = design.objects.filter((o) => selection.includes(o.id));
    if (selected.some((o) => o.locked)) return;
    if (action === "duplicate") {
      const copies = selected.map((o) => ({
        ...o,
        id: newId(),
        name: `${o.name} Kopie`.slice(0, 100),
        group: null,
        x: clamp(o.x + 0.03),
        y: clamp(o.y + 0.03),
      }));
      commit((d) => ({
        ...d,
        objects: [...d.objects, ...copies].slice(0, 50),
      }));
      setSelection(copies.map((o) => o.id));
      return;
    }
    if (action === "remove") {
      change(
        "objects",
        design.objects.filter((o) => !selection.includes(o.id)),
      );
      setSelection([]);
      return;
    }
    if (action === "group" || action === "ungroup") {
      editObject({ group: action === "group" ? newId() : null });
      return;
    }
    if (action === "align") {
      const axis = ["left", "center", "right"].includes(arg) ? "x" : "y";
      editObject({
        [axis]: ["left", "top"].includes(arg)
          ? 0
          : ["right", "bottom"].includes(arg)
            ? 1
            : 0.5,
      });
      return;
    }
    if (action === "distribute") {
      commit(distributeObjects(design, selection, arg));
      return;
    }

    const objects = [...design.objects];
    for (const id of action === "forward"
      ? [...selection].reverse()
      : selection) {
      const i = objects.findIndex((o) => o.id === id),
        j = i + (action === "forward" ? 1 : -1);
      if (j >= 0 && j < objects.length && !objects[j].locked)
        [objects[i], objects[j]] = [objects[j], objects[i]];
    }
    change("objects", objects);
  }
  function addPage() {
    if (rootDesign.pages.length >= 9) return;
    const page = { ...design, pages: undefined };
    commit((root) => ({ ...root, pages: [...root.pages, page] }), true);
    setPageIndex(rootDesign.pages.length + 1);
    setSelection([]);
  }
  function updatePages(pages, nextIndex) {
    const [first, ...rest] = pages;
    commit(
      {
        ...first,
        pages: rest.map((page) => {
          const scene = { ...page };
          delete scene.pages;
          return scene;
        }),
      },
      true,
    );
    setPageIndex(nextIndex);
    setSelection([]);
  }
  function deletePage() {
    const pages = [rootDesign, ...rootDesign.pages];
    if (pages.length < 2) return;
    updatePages(
      pages.filter((_, i) => i !== pageIndex),
      Math.max(0, pageIndex - 1),
    );
  }

  function objectHit(o) {
    const b = objectGeometry(o, design),
      selected = selection.includes(o.id);
    return (
      <g key={o.id}>
        <rect
          data-layer={o.id}
          x={b.cx - b.bw / 2}
          y={b.cy - b.bh / 2}
          width={b.bw}
          height={b.bh}
          fill="transparent"
          stroke={selected ? "#f97316" : "transparent"}
          strokeWidth="3"
          strokeDasharray="10 8"
          style={{ cursor: o.locked ? "default" : "move" }}
        />
        {selected && !o.locked && (
          <>
            <rect
              data-layer={o.id}
              data-mode="scale"
              x={b.cx + b.bw / 2 - 10}
              y={b.cy + b.bh / 2 - 10}
              width="24"
              height="24"
              fill="#f97316"
              style={{ cursor: "nwse-resize" }}
            />
            <circle
              data-layer={o.id}
              data-mode="rotate"
              cx={b.cx}
              cy={b.cy - b.bh / 2 - 18}
              r="12"
              fill="#f97316"
              style={{ cursor: "grab" }}
            />
          </>
        )}
      </g>
    );
  }
  const selectedExport = [
    ...rendered,
    ...media.filter((m) => m.composition),
  ].find((m) => m.id === assignment.media);
  const canAssign =
    selectedExport &&
    (assignment.channel !== "linkedin" || ["image/jpeg", "image/png"].includes(selectedExport.mime_type)) &&
    !(
      assignment.channel === "instagram" &&
      selectedExport.mime_type.startsWith("image/") &&
      (selectedExport.composition?.format === "story" ||
        selectedExport.composition?.format === "pin")
    );
  return (
    <div
      ref={workspace}
      className="mk-design-workspace"
      data-mobile-pane={mobilePane}
    >
      <style>{`@font-face{font-family:'Smartwerk Sans';src:url('${sansFont}');font-weight:200 800;font-display:block}@font-face{font-family:'Smartwerk Display';src:url('${displayFont}');font-weight:300 700;font-display:block}`}</style>
      <div className="mk-heading mk-design-actions">
        {!onSavePost && (
          <label>
            <span className="mk-sr-only">Name der Gestaltung</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meine Gestaltung"
              maxLength={100}
            />
          </label>
        )}
        <div className="mk-toolbar">
          <button
            className={onSavePost ? "mk-primary" : ""}
            aria-label={onSavePost ? "Speichern" : "Entwurf speichern"}
            title={
              onSavePost
                ? "Bild und Kalenderbeitrag speichern"
                : "Entwurf speichern"
            }
            disabled={busy}
            onClick={() =>
              (onSavePost ? onSavePost(design, outputType) : save()).catch(
                () => {},
              )
            }
          >
            Speichern
          </button>
          <button
            aria-label="Als Vorlage speichern"
            title="Als Vorlage speichern"
            disabled={busy}
            onClick={() => save(true).catch(() => {})}
          >
            Vorlage
          </button>
          <button
            className={onSavePost ? "" : "mk-primary"}
            aria-label="Neuer Entwurf"
            title="Neuer Entwurf"
            disabled={busy}
            onClick={() => {
              setHistory({ past: [], present: blankDesign(), future: [] });
              setPageIndex(0);
              setSelection([]);
              setName("");
              setActive(null);
              setRendered([]);
              setVersionId("");
            }}
          >
            Neu
          </button>
          <button
            aria-label="Rückgängig"
            disabled={!history.past.length || busy}
            onClick={undo}
          >
            ↶
          </button>
          <button
            aria-label="Wiederholen"
            disabled={!history.future.length || busy}
            onClick={redo}
          >
            ↷
          </button>
        </div>
      </div>
      <div
        className="mk-mobile-pane-tabs"
        role="group"
        aria-label="Seitenleiste wählen"
      >
        <button
          aria-pressed={mobilePane === "library"}
          onClick={() => setMobilePane("library")}
        >
          Bibliothek
        </button>
        <button
          aria-pressed={mobilePane === "tools"}
          onClick={() => setMobilePane("tools")}
        >
          Werkzeuge
        </button>
      </div>
      <div className="mk-designer">
        <DesignLibrary
          onSavePost={onSavePost}
          tab={tab}
          setTab={setTab}
          setSearch={setSearch}
          design={design}
          selection={selection}
          selectedLayer={selectedLayer}
          selectObject={selectObject}
          selectLayer={selectLayer}
          toggleSidebarLayer={toggleSidebarLayer}
          reorderSidebarLayer={reorderSidebarLayer}
          addObject={addObject}
          pageIndex={pageIndex}
          rootDesign={rootDesign}
          setPageIndex={setPageIndex}
          setSelection={setSelection}
          addPage={addPage}
          deletePage={deletePage}
          updatePages={updatePages}
          search={search}
          products={products}
          locked={locked}
          commit={commit}
          imageMedia={imageMedia}
          change={change}
          nested={nested}
          setTools={setTools}
          brand={brand}
          onSaveBrand={onSaveBrand}
          activeObject={activeObject}
          editObject={editObject}
          drafts={drafts}
          openDraft={openDraft}
          media={media}
          setRendered={setRendered}
          onRestorePostVersion={onRestorePostVersion}
          postVersions={postVersions}
          versionsLoading={versionsLoading}
          versionsError={versionsError}
          onRetryVersions={onRetryVersions}
          busy={busy}
          versionId={versionId}
          setVersionId={setVersionId}
          activeDraft={activeDraft}
        />
        <DesignCanvas
          design={design}
          commit={commit}
          canvasViewport={canvasViewport}
          canvasSize={canvasSize}
          mobilePreview={mobilePreview}
          g={g}
          zoom={zoom}
          natural={natural}
          images={images}
          animationPreview={animationPreview}
          stage={stage}
          startDrag={startDrag}
          moveDrag={moveDrag}
          endDrag={endDrag}
          safeZones={safeZones}
          guides={guides}
          objectHit={objectHit}
          overlay={overlay}
          logo={logo}
          text={text}
          selectedLayer={selectedLayer}
          setNaturalImage={setNaturalImage}
          poolImages={poolImages}
          setImageSizes={setImageSizes}
          setZoom={setZoom}
          setGuides={setGuides}
          setSafeZones={setSafeZones}
          setMobilePreview={setMobilePreview}
          setAnimationPreview={setAnimationPreview}
          imageReady={imageReady}
        />
        <DesignInspector
          onSavePost={onSavePost}
          tools={tools}
          openTools={openTools}
          activeObject={activeObject}
          selection={selection}
          editObject={editObject}
          objectAction={objectAction}
          imageMedia={imageMedia}
          design={design}
          locked={locked}
          change={change}
          urls={urls}
          imageReady={imageReady}
          commit={commit}
          nested={nested}
          selectLayer={selectLayer}
          selectObject={selectObject}
          selectedLayer={selectedLayer}
          setAnimationPreview={setAnimationPreview}
          setOutputType={setOutputType}
          outputType={outputType}
          exports={exports}
          setExports={setExports}
          busy={busy}
          onExport={onExport}
          rootDesign={rootDesign}
          setRendered={setRendered}
          setAssignment={setAssignment}
          natural={natural}
          images={images}
          rendered={rendered}
          assignment={assignment}
          media={media}
          posts={posts}
          selectedExport={selectedExport}
          canAssign={canAssign}
          onAssign={onAssign}
        />
      </div>
    </div>
  );
}
