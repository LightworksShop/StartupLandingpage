import {
  applyTemplate,
  autoFit,
  builtInTemplates,
  convertText,
  makeObject,
  normalizeDesign,
} from "../../../lib/marketing/design-model";
import { Search, Thumbnail } from "./common";
import { Panel, newId } from "./design-controls";
import { BrandLibrary, ElementLibrary } from "./design-elements";
import DesignSidebar from "./design-sidebar";
import PostVersions from "./post-versions";
import { priceLabel } from "./products";

export default function DesignLibrary({
  onSavePost,
  tab,
  setTab,
  setSearch,
  design,
  selection,
  selectedLayer,
  selectObject,
  selectLayer,
  toggleSidebarLayer,
  reorderSidebarLayer,
  addObject,
  pageIndex,
  rootDesign,
  setPageIndex,
  setSelection,
  addPage,
  deletePage,
  updatePages,
  search,
  products,
  locked,
  commit,
  imageMedia,
  change,
  nested,
  setTools,
  brand,
  onSaveBrand,
  activeObject,
  editObject,
  drafts,
  openDraft,
  media,
  setRendered,
  onRestorePostVersion,
  postVersions,
  versionsLoading,
  versionsError,
  onRetryVersions,
  busy,
  versionId,
  setVersionId,
  activeDraft,
}) {
  return (
    <DesignSidebar
      singlePage={!!onSavePost}
      contentTab={tab}
      onContentTabChange={(id) => {
        setTab(id);
        setSearch("");
      }}
      design={design}
      selection={selection}
      selectedLayer={selectedLayer}
      onSelectObject={selectObject}
      onSelectLayer={selectLayer}
      onToggle={toggleSidebarLayer}
      onReorder={reorderSidebarLayer}
      onAdd={addObject}
      pageIndex={pageIndex}
      pageCount={rootDesign.pages.length + 1}
      pages={
        <section className="mk-card">
          <h3>Carousel / Story-Serie</h3>
          {[rootDesign, ...rootDesign.pages].map((page, index) => (
            <button
              key={index}
              aria-pressed={pageIndex === index}
              onClick={() => {
                setPageIndex(index);
                setSelection([]);
              }}
            >
              Seite {index + 1} ·{" "}
              {page.text ||
                page.objects.find((o) => o.type === "text")?.text ||
                "Gestaltung"}
            </button>
          ))}
          <button disabled={rootDesign.pages.length >= 9} onClick={addPage}>
            Seite duplizieren
          </button>
          <button disabled={rootDesign.pages.length === 0} onClick={deletePage}>
            Seite entfernen
          </button>
          <div className="mk-toolbar">
            {[-1, 1].map((delta) => (
              <button
                key={delta}
                disabled={
                  pageIndex + delta < 0 ||
                  pageIndex + delta > rootDesign.pages.length
                }
                onClick={() => {
                  const pages = [rootDesign, ...rootDesign.pages],
                    i = pageIndex,
                    j = i + delta;
                  [pages[i], pages[j]] = [pages[j], pages[i]];
                  updatePages(pages, pageIndex + delta);
                }}
              >
                {delta < 0 ? "Seite vorziehen" : "Seite nach hinten"}
              </button>
            ))}
          </div>
          <small>
            Bis zu zehn Seiten. Der Export liefert alle Seiten in Reihenfolge.
            Die Seiten lassen sich einzeln Kalenderbeiträgen zuordnen.
          </small>
        </section>
      }
    >
      <Panel group="library" id="products" active={tab === "products"}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={
            tab === "products"
              ? "Produkte suchen …"
              : "Medien / Vorlagen suchen …"
          }
        />
        {tab === "products" && (
          <div className="mk-design-items">
            {products
              .filter((p) =>
                p.title
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((p) => (
                <button
                  className="mk-design-product"
                  key={p.id}
                  disabled={locked("product")}
                  aria-pressed={p.id === design.product_id}
                  onClick={() =>
                    commit((d) =>
                      autoFit({
                        ...d,
                        product_id: p.id,
                        image_url: p.images?.[0]?.url || p.thumbnail || "",
                      }),
                    )
                  }
                >
                  <Thumbnail media={p} />
                  <span>
                    <strong>{p.title}</strong>
                    <small>{p.variants?.length ?? "—"} Varianten</small>
                    <small>{priceLabel(p)}</small>
                  </span>
                </button>
              ))}
          </div>
        )}
      </Panel>
      <Panel group="library" id="media" active={tab === "media"}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={
            tab === "products"
              ? "Produkte suchen …"
              : "Medien / Vorlagen suchen …"
          }
        />
        {tab === "media" && (
          <div className="mk-design-items">
            {imageMedia
              .filter((m) =>
                m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
              )
              .map((m) => (
                <div className="mk-card" key={m.id}>
                  <Thumbnail media={m} />
                  <strong>{m.name}</strong>
                  <div className="mk-toolbar">
                    <button
                      disabled={locked("background")}
                      onClick={() => change("background_id", m.id)}
                    >
                      Als Hintergrund
                    </button>
                    <button
                      disabled={locked("overlay")}
                      onClick={() => nested("overlay", "media_id", m.id)}
                    >
                      Als Logo / Overlay
                    </button>
                    <button
                      disabled={design.objects.length >= 50}
                      onClick={() =>
                        addObject(
                          makeObject("image", newId(), {
                            media_id: m.id,
                            name: m.name,
                            width: 0.4,
                            height: 0.3,
                          }),
                        )
                      }
                    >
                      Als Bildelement
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Panel>
      <Panel group="library" id="elements" active={tab === "elements"}>
        <ElementLibrary
          images={imageMedia}
          onAdd={addObject}
          onConvert={() => {
            commit(convertText(design));
            setTools("object");
          }}
        />
      </Panel>
      <Panel group="library" id="brand" active={tab === "brand"}>
        <BrandLibrary
          brand={brand}
          images={imageMedia}
          onSave={onSaveBrand}
          onAdd={addObject}
          selected={activeObject}
          onStyle={editObject}
        />
      </Panel>
      <Panel group="library" id="templates" active={tab === "templates"}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={
            tab === "products"
              ? "Produkte suchen …"
              : "Medien / Vorlagen suchen …"
          }
        />
        {tab === "templates" && (
          <>
            <div className="mk-grid">
              {builtInTemplates
                .filter((t) =>
                  t.name
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
                )
                .map((t) => (
                  <button
                    disabled={design.layers.some((l) => l.locked)}
                    key={t.id}
                    onClick={() => commit((d) => applyTemplate(d, t.id))}
                  >
                    {t.name}
                  </button>
                ))}
            </div>
            <h3>Gespeicherte Entwürfe und Vorlagen</h3>
            {drafts
              .filter((d) =>
                d.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
              )
              .map((d) => (
                <button
                  className="mk-saved-design"
                  key={d.id}
                  onClick={() => openDraft(d)}
                >
                  {d.name}
                  {d.is_template && <small>Vorlage</small>}
                </button>
              ))}
            <h3>Bereits exportiert</h3>
            {media
              .filter(
                (m) =>
                  m.composition &&
                  m.name
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
              )
              .map((m) => (
                <button
                  className="mk-design-product"
                  key={m.id}
                  onClick={() => {
                    openDraft({
                      id: null,
                      name: m.name,
                      composition: m.composition,
                    });
                    setRendered([m]);
                  }}
                >
                  <Thumbnail media={m} />
                  <span>{m.name}</span>
                </button>
              ))}
          </>
        )}
      </Panel>
      <Panel group="library" id="versions" active={tab === "versions"}>
        {onRestorePostVersion ? (
          <PostVersions
            versions={postVersions || []}
            loading={versionsLoading}
            error={versionsError}
            onRetry={onRetryVersions}
            busy={busy}
            onRestore={(snapshot) => {
              const composition = onRestorePostVersion(snapshot);
              if (composition) {
                commit(normalizeDesign(composition), true);
                setPageIndex(0);
              }
            }}
          />
        ) : (
          <section className="mk-card">
            <h3>Gespeicherte Versionen</h3>
            <select
              aria-label="Gespeicherte Version"
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
            >
              <option value="">Version wählen</option>
              {(activeDraft?.versions || []).map((v, i) => (
                <option key={v.id} value={v.id}>
                  Version {i + 1} ·{" "}
                  {new Date(v.saved_at).toLocaleString("de-DE", {
                    timeZone: "Europe/Berlin",
                  })}
                </option>
              ))}
            </select>
            <button
              disabled={!versionId || busy}
              onClick={() => {
                const version = activeDraft?.versions.find(
                  (v) => v.id === versionId,
                );
                if (version) {
                  commit(normalizeDesign(version.composition), true);
                  setPageIndex(0);
                }
              }}
            >
              Version wiederherstellen
            </button>
            <small>
              Die letzten 20 Speicherstände bleiben erhalten. Wiederherstellen
              wird erst beim Speichern dauerhaft.
            </small>
          </section>
        )}
      </Panel>
    </DesignSidebar>
  );
}
