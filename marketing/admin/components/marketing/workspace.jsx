import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { berlinInstant } from "../../../lib/marketing/berlin-time";
import {
  blankDesign,
  documentPages,
  smartResize,
} from "../../../lib/marketing/design-model";
import { automaticProductIds } from "../../../lib/marketing/post-model";
import { accountErrors } from "./account-controls";
import Calendar from "./calendar";
import { Feedback, Modal, sections } from "./common";
import Connections from "./connections";
import { request, useMarketingData } from "./data";
import Design from "./design";
import EditMediaDialog from "./edit-media-dialog";
import MediaLibrary, { categoryOf } from "./media-library";
import PlanningSettings from "./planning-settings";
import PostEditor from "./post-editor";
import Products from "./products";
import PublicationHistory from "./publication-history";
import "./styles.css";
import UploadMediaDialog from "./upload-media-dialog";
import { blankPost, blankVersion, channels, labels } from "./workspace-model";
export default function MarketingWorkspace({ section = "calendar" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = {
    calendar: "Kalender",
    media: "Medienpool",
    design: "Bildgestaltung",
    products: "Produkte",
    planning: "Planung",
    history: "Verlauf",
    connections: "Anbindungen",
  }[section];
  const [uploading, setUploading] = useState(false),
    [folderDialog, setFolderDialog] = useState(false),
    [folderName, setFolderName] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null),
    [mediaEditor, setMediaEditor] = useState(null),
    [editingDesign, setEditingDesign] = useState(null);
  const designMode = section === "design" || !!editingDesign;
  const [upload, setUpload] = useState({
      name: "",
      tags: [],
      product_ids: [],
      generated: false,
      provenance: "",
      category: "image",
      folder: "",
    }),
    [file, setFile] = useState(null);
  const [planningDraft, setPlanning] = useState(null),
    [historyPage, setHistoryPage] = useState(0);
  const [recovery, setRecovery] = useState(null),
    [feedReport, setFeedReport] = useState(null);
  const {
    data,
    error: loadError,
    editorLoading,
    editorError,
    productsLoading,
    productsError,
    history,
    versions,
    versionsLoading,
    versionsError,
    load,
  } = useMarketingData(section, {
    editor,
    editingDesign,
    uploading,
    mediaEditor,
    historyPage,
  });
  const settings = data?.settings;
  const planning = planningDraft || settings?.value;
  useEffect(() => {
    if (settings) {
      setPlanning(settings.value);
      setFeedReport(settings.feed_report || null);
    }
  }, [settings]);
  useEffect(() => {
    if (searchParams.has("oauth")) {
      if (searchParams.get("oauth") === "success")
        setMessage(
          "Konto verbunden. Bitte das Veröffentlichungsziel prüfen.",
        );
      else
        setError(
          accountErrors[searchParams.get("reason")] ||
            "Kontoanmeldung fehlgeschlagen. Bitte erneut starten.",
        );
      const next = new URLSearchParams(searchParams);
      next.delete("oauth");
      next.delete("reason");
      setSearchParams(next, { replace: true });
      // Account callbacks must refresh previously cached settings and approvals.
      load().catch((e) => setError(e.message));
    }
  }, [load, searchParams, setSearchParams]);
  async function run(work, success = "Gespeichert.") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      await load();
      setMessage(success);
      return true;
    } catch (e) {
      // Conflicts and partial exports may have changed server state as well.
      await load().catch(() => {});
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const changeContent = (key, value) =>
    setEditor((current) => {
      const content = { ...current.content, [key]: value };
      if (key === "versions")
        content.product_ids = automaticProductIds(content, data.media);
      return { ...current, content };
    });
  const changeVersion = (channel, key, value) =>
    changeContent(
      "versions",
      editor.content.versions.map((v) =>
        v.channel === channel ? { ...v, [key]: value } : v,
      ),
    );
  function changeSchedule(value) {
    try {
      const scheduled_at = berlinInstant(value);
      setEditor((post) => ({ ...post, scheduled_at }));
      setError("");
    } catch (error) {
      setError(error.message);
    }
  }
  function restorePostVersion(snapshot, channel) {
    const version = snapshot.content.versions.find(
      (v) => v.channel === channel,
    );
    const composition =
      version && data.media.find((m) => m.id === version.media_id)?.composition;
    if (channel && !composition) {
      setError(
        "Dieser Speicherstand enthält für diese Plattform keine bearbeitbare Gestaltung.",
      );
      return null;
    }
    setEditor((current) => ({
      ...current,
      content: structuredClone(snapshot.content),
      scheduled_at: snapshot.scheduled_at,
    }));
    setMessage(
      "Speicherstand zur Bearbeitung übernommen. Bitte prüfen und speichern.",
    );
    return composition;
  }

  const folders = [
    ...new Set([
      ...(data?.settings.value.media_folders || []),
      ...(data?.media.map((m) => m.folder).filter(Boolean) || []),
    ]),
  ].sort();
  const saveSettings = (value) =>
    request("settings", { revision: data.settings.revision, value });
  function openPostDesign(version) {
    const medium = data.media.find((m) => m.id === version.media_id);
    const product = data.products.find((p) =>
      editor.content.product_ids.includes(p.id),
    );
    let composition = medium?.composition;
    if (!composition) {
      composition = blankDesign();
      composition.format =
        version.channel === "pinterest"
          ? "pin"
          : ["facebook", "linkedin"].includes(version.channel)
            ? "facebook"
            : "portrait";
      if (medium) {
        composition.background_id = medium.id;
        // Preserve the closest supported aspect ratio for an imported image.
        if (medium.width && medium.height) {
          const ratios = {
            square: 1,
            portrait: 0.8,
            pin: 2 / 3,
            facebook: 1200 / 630,
          };
          const formats =
            version.channel === "instagram"
              ? ["square", "portrait"]
              : Object.keys(ratios);
          composition.format = formats.sort(
            (a, b) =>
              Math.abs(ratios[a] - medium.width / medium.height) -
              Math.abs(ratios[b] - medium.width / medium.height),
          )[0];
        }
      } else if (product) {
        composition.product_id = product.id;
        composition.image_url =
          product.images?.[0]?.url || product.thumbnail || "";
      }
    }
    setError("");
    setMessage("");
    setEditingDesign({
      channel: version.channel,
      name: (medium?.name || editor.content.topic || "Gestaltung").slice(
        0,
        100,
      ),
      composition: structuredClone(composition),
      output: medium?.mime_type.startsWith("video/") ? "mp4" : "jpeg",
    });
  }
  async function savePostDesign(design, output) {
    const source = structuredClone(editor);
    const channel = editingDesign.channel;
    const ok = await run(async () => {
      if (channel === "linkedin" && output === "mp4")
        throw new Error("Für LinkedIn bitte als JPEG-Bild exportieren.");
      if (!source.content.topic.trim())
        throw new Error("Bitte zuerst ein Thema für den Beitrag eingeben.");
      if (
        channel === "instagram" &&
        output !== "mp4" &&
        !["square", "portrait"].includes(design.format)
      )
        throw new Error(
          "Für Instagram bitte das Format Quadrat oder Hochformat wählen.",
        );
      // A post version holds one image/video. Save the currently selected page.
      const composition = { ...design, pages: [] };
      let medium;
      if (output === "mp4") {
        const result = await request("design-export", {
          composition,
          formats: [composition.format],
          output,
        });
        if (!result.complete || !result.media?.[0])
          throw new Error(
            result.results?.find((r) => r.error)?.error ||
              "Videoexport fehlgeschlagen.",
          );
        medium = result.media[0];
      } else {
        medium = (await request("compose", composition)).media;
      }
      const result = await request("posts", {
        ...(source.id ? { id: source.id, revision: source.revision } : {}),
        content: {
          ...source.content,
          product_ids: automaticProductIds(
            {
              ...source.content,
              versions: source.content.versions.map((v) =>
                v.channel === channel ? { ...v, media_id: medium.id } : v,
              ),
            },
            [...data.media, medium],
          ),
          versions: source.content.versions.map((v) =>
            v.channel === channel ? { ...v, media_id: medium.id } : v,
          ),
        },
        scheduled_at: source.scheduled_at,
      });
      // Retain the returned revision even if refreshing the calendar fails.
      setEditor(result.post);
    }, "Bild und Kalenderbeitrag gespeichert.");
    if (ok) {
      setEditingDesign(null);
      setEditor(null);
    }
  }
  const retryLoad = () => {
    setError("");
    load().catch((e) => setError(e.message));
  };
  return (
    <Feedback.Provider
      value={{
        error: error || loadError,
        busy,
        onRetry: loadError ? retryLoad : null,
      }}
    >
      <main className={`mk ${designMode ? "mk-editor-page" : ""}`}>
        {designMode ? (
          <header className="mk-editor-header">
            {editingDesign ? (
              <button disabled={busy} onClick={() => setEditingDesign(null)}>
                Zurück zum Beitrag
              </button>
            ) : (
              <Link to="/marketing/library" aria-label="Zur Bibliothek">
                Bibliothek
              </Link>
            )}
            <span aria-hidden="true">›</span>
            <h1>Bildgestaltung</h1>
            {editingDesign && (
              <span>
                {editor.content.topic} · {labels[editingDesign.channel]}
              </span>
            )}
            {data && (
              <span
                className="mk-editor-status"
                title={`${data.settings.value.paused ? "Veröffentlichung pausiert" : "Terminierter Versand freigegebener Beiträge"}${!data.settings.connections.publishing_enabled ? " · Plattformversand deaktiviert" : ""}`}
              >
                <span
                  className={`mk-status-dot ${data.settings.value.paused ? "" : "mk-active-dot"}`}
                />
                {data.settings.value.paused ? "Pause aktiv" : "Versand aktiv"}
                {!data.settings.connections.publishing_enabled &&
                  " · Versand aus"}
              </span>
            )}
          </header>
        ) : (
          <>
            <div className="mk-breadcrumb">
              <Link to="/marketing/calendar">Marketing & Social Media</Link>
              <span>›</span>
              <span>{sections[section][0]}</span>
            </div>
            <header className="mk-heading mk-page-heading">
              <div>
                <h1>{sections[section][0]}</h1>
                <p>{sections[section][1]}</p>
              </div>
              <div className="mk-toolbar">
                {section === "calendar" && (
                  <button
                    className="mk-primary"
                    onClick={() => setEditor(blankPost())}
                  >
                    Neuer Beitrag
                  </button>
                )}
                {section === "media" && (
                  <>
                    <button
                      className="mk-primary"
                      onClick={() => setUploading(true)}
                    >
                      Hochladen
                    </button>
                    <button onClick={() => setFolderDialog(true)}>
                      Neuer Ordner
                    </button>
                  </>
                )}
              </div>
            </header>
          </>
        )}
        {!designMode && (
          <nav
            className="mk-toolbar mk-section-nav"
            aria-label="Marketing-Bereiche"
          >
            {["calendar", "history"].includes(section) && (
              <>
                <Link
                  to="/marketing/calendar"
                  aria-current={section === "calendar" ? "page" : undefined}
                >
                  Kalender & Liste
                </Link>
                <Link
                  to="/marketing/calendar?panel=history"
                  aria-current={section === "history" ? "page" : undefined}
                >
                  Veröffentlichungsverlauf
                </Link>
              </>
            )}
            {["media"].includes(section) && (
              <>
                <Link to="/marketing/library" aria-current="page">
                  Medien
                </Link>
                <Link to="/marketing/library?tab=design">
                  Vorlagen & Gestaltung
                </Link>
              </>
            )}
            {["planning", "products", "connections"].includes(section) && (
              <>
                <Link
                  to="/marketing/settings"
                  aria-current={section === "planning" ? "page" : undefined}
                >
                  Planungsvorgaben
                </Link>
                <Link
                  to="/marketing/settings?tab=connections"
                  aria-current={section === "connections" ? "page" : undefined}
                >
                  Konten & Ziele
                </Link>
              </>
            )}
          </nav>
        )}
        {(error || loadError) && (
          <p role="alert" className="mk-error">
            {error || loadError}
            {loadError && (
              <button disabled={busy} onClick={retryLoad}>
                Erneut laden
              </button>
            )}
          </p>
        )}
        {message && (
          <p role="status" className="mk-success">
            {message}
          </p>
        )}
        {data && !designMode && (
          <div className="mk-publish-status">
            <span>
              <span
                className={`mk-status-dot ${data.settings.value.paused ? "" : "mk-active-dot"}`}
              />
              {data.settings.value.paused
                ? "Veröffentlichung pausiert"
                : "Terminierter Versand freigegebener Beiträge"}
              {!data.settings.connections.publishing_enabled &&
                " · Plattformversand deaktiviert"}
            </span>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    saveSettings({
                      ...data.settings.value,
                      paused: !data.settings.value.paused,
                    }),
                  data.settings.value.paused
                    ? "Veröffentlichungspause aufgehoben."
                    : "Veröffentlichung pausiert.",
                )
              }
            >
              {data.settings.value.paused
                ? "Veröffentlichung fortsetzen"
                : "Veröffentlichung pausieren"}
            </button>
          </div>
        )}
        {!data ? (
          !loadError && <p role="status">Lade Marketing …</p>
        ) : (
          <>
            <fieldset disabled={busy} className="mk-body">
              {section === "calendar" && (
                <div className="mk-calendar-origin" hidden={!!editingDesign}>
                  <Calendar
                    posts={data.posts}
                    media={data.media}
                    onEdit={setEditor}
                    onNew={() => setEditor(blankPost())}
                  />
                </div>
              )}
              {section === "media" && (
                <MediaLibrary
                  media={data.media}
                  folders={folders}
                  onEdit={(m) =>
                    setMediaEditor({
                      id: m.id,
                      labels: {
                        name: m.name,
                        tags: m.tags,
                        product_ids: m.product_ids,
                        generated: m.generated,
                        provenance: m.provenance,
                        category: categoryOf(m),
                        folder: m.folder || "",
                      },
                    })
                  }
                />
              )}
              {section === "products" && (
                <Products
                  products={data.products}
                  preferences={data.settings.value.preferences}
                  feedExclusions={data.settings.value.feed_exclusions || []}
                  onSaveFeeds={(feed_exclusions) =>
                    run(
                      () =>
                        saveSettings({
                          ...data.settings.value,
                          feed_exclusions,
                        }),
                      "Feed-Auswahl gespeichert.",
                    )
                  }
                  onSave={(preferences) =>
                    run(() =>
                      saveSettings({ ...data.settings.value, preferences }),
                    )
                  }
                  onImport={(product_id, image_url) =>
                    run(
                      () => request("media", { product_id, image_url }),
                      "Produktbild im Medienpool gespeichert.",
                    )
                  }
                />
              )}
              {designMode && productsLoading && (
                <p role="status">Lade Bildgestaltung …</p>
              )}
              {designMode && !productsLoading && !productsError && (
                <Design
                  key={
                    editingDesign ? `post-${editingDesign.channel}` : "library"
                  }
                  initialDesign={editingDesign}
                  postVersions={editingDesign ? versions : undefined}
                  versionsLoading={versionsLoading}
                  versionsError={versionsError}
                  onRetryVersions={retryLoad}
                  onRestorePostVersion={
                    editingDesign
                      ? (snapshot) =>
                          restorePostVersion(snapshot, editingDesign.channel)
                      : undefined
                  }
                  onSavePost={editingDesign ? savePostDesign : undefined}
                  products={data.products}
                  media={data.media}
                  drafts={data.settings.value.design_drafts || []}
                  posts={data.posts}
                  busy={busy}
                  onSave={async (draft) => {
                    const ok = await run(
                      () =>
                        saveSettings({
                          ...data.settings.value,
                          design_drafts: [
                            ...(data.settings.value.design_drafts || []).filter(
                              (d) => d.id !== draft.id,
                            ),
                            draft,
                          ],
                        }),
                      "Gestaltungsentwurf gespeichert.",
                    );
                    if (!ok) throw new Error("Speichern fehlgeschlagen");
                  }}
                  brand={
                    data.settings.value.brand || { logos: [], text_styles: [] }
                  }
                  onSaveBrand={(brand) =>
                    run(
                      () =>
                        request("brand", {
                          revision: data.settings.revision,
                          brand,
                        }),
                      "Markenbibliothek gespeichert.",
                    )
                  }
                  onExport={(design, formats, onResult, output = "jpeg") =>
                    run(async () => {
                      const pages = documentPages(design);
                      if (pages.length * formats.length > 10)
                        throw new Error(
                          "Bitte höchstens zehn Seiten-/Format-Exporte wählen.",
                        );
                      for (const page of pages)
                        for (const format of formats) {
                          if (output === "mp4") {
                            const result = await request("design-export", {
                              composition: page,
                              formats: [format],
                              output,
                            });
                            result.media.forEach(onResult);
                            if (!result.complete)
                              throw new Error(
                                result.results.find((r) => r.error)?.error ||
                                  "Videoexport fehlgeschlagen.",
                              );
                          } else {
                            const result = await request(
                              "compose",
                              smartResize(page, format),
                            );
                            onResult(result.media);
                          }
                        }
                    }, "Kanalexporte im Medienpool gespeichert.")
                  }
                  onAssign={({ media, postId, channel }) =>
                    run(async () => {
                      const existing = data.posts.find(
                        (post) => post.id === postId,
                      );
                      const content = existing
                        ? existing.content
                        : {
                            topic: media.name,
                            notes: "",
                            product_ids: media.product_ids || [],
                            versions: [],
                          };
                      const version =
                        content.versions.find(
                          (value) => value.channel === channel,
                        ) || blankVersion(channel);
                      const result = await request("posts", {
                        ...(existing
                          ? { id: existing.id, revision: existing.revision }
                          : {}),
                        content: {
                          ...content,
                          versions: [
                            ...content.versions.filter(
                              (value) => value.channel !== channel,
                            ),
                            { ...version, media_id: media.id },
                          ],
                        },
                        scheduled_at: existing?.scheduled_at || null,
                      });
                      setEditor(result.post);
                    }, "Medium zugeordnet; Kalenderentwurf geöffnet.")
                  }
                />
              )}
              {section === "planning" && !editingDesign && (
                <PlanningSettings
                  planning={planning}
                  setPlanning={setPlanning}
                  run={run}
                  data={data}
                />
              )}
              {tab === "Verlauf" && (
                <PublicationHistory
                  history={history}
                  data={data}
                  setRecovery={setRecovery}
                  recovery={recovery}
                  run={run}
                  historyPage={historyPage}
                  setHistoryPage={setHistoryPage}
                />
              )}

              {section === "connections" && (
                <Connections
                  connections={data.settings.connections}
                  accounts={data.settings.accounts || {}}
                  onAccountAction={(channel, action, extra = {}) =>
                    run(async () => {
                      const result = await request("accounts", {
                        channel,
                        action,
                        ...(action === "connect"
                          ? {}
                          : {
                              revision:
                                data.settings.accounts?.[channel]?.revision ||
                                0,
                            }),
                        ...extra,
                      });
                      if (result.authorization_url)
                        window.location.assign(result.authorization_url);
                    }, { linkedin_target: "LinkedIn-Ziel gespeichert. Wartende Beiträge benötigen erneut eine Freigabe.", instagram_target: "Instagram-Konto gespeichert. Wartende Beiträge benötigen erneut eine Freigabe.", verify: "Zugang geprüft.", refresh: "Zugang erneuert.", disconnect: "Verbindung getrennt. Wartende Beiträge benötigen erneut eine Freigabe.", board: "Zielboard gespeichert. Wartende Beiträge benötigen erneut eine Freigabe.", connect: "Kontoanmeldung geöffnet." }[action])
                  }
                  loadInstagramAccounts={(after) =>
                    request(
                      `instagram-targets${after ? `?after=${encodeURIComponent(after)}` : ""}`,
                    )
                  }
                  loadBoards={(bookmark) =>
                    request(
                      `boards${bookmark ? `?bookmark=${encodeURIComponent(bookmark)}` : ""}`,
                    )
                  }
                  report={feedReport}
                  onCheck={() =>
                    run(
                      async () =>
                        setFeedReport({
                          ...(await request("feed-check")),
                          checked_at: new Date().toISOString(),
                        }),
                      "Produktfeed geprüft.",
                    )
                  }
                />
              )}
            </fieldset>
            {editor && !editingDesign && (
              <PostEditor
                post={editor}
                media={data.media}
                channels={channels.filter(
                  (channel) =>
                    editor.content.versions.some(
                      (v) => v.channel === channel,
                    ) ||
                    (channel !== "facebook" &&
                      data.settings.connections[channel]),
                )}
                busy={busy}
                loading={editorLoading}
                error={editorError}
                saved={
                  !!data.posts.find(
                    (post) =>
                      post.id === editor.id &&
                      post.revision === editor.revision &&
                      JSON.stringify(post.content) ===
                        JSON.stringify(editor.content) &&
                      post.scheduled_at === editor.scheduled_at,
                  )
                }
                versions={versions}
                versionsLoading={versionsLoading}
                versionsError={versionsError}
                onRetry={retryLoad}
                onClose={() => setEditor(null)}
                onContent={changeContent}
                onVersion={changeVersion}
                onSchedule={changeSchedule}
                onDesign={openPostDesign}
                onRestore={(snapshot) => restorePostVersion(snapshot)}
                onSave={() =>
                  run(async () => {
                    const result = await request("posts", {
                      ...(editor.id
                        ? { id: editor.id, revision: editor.revision }
                        : {}),
                      content: editor.content,
                      scheduled_at: editor.scheduled_at,
                    });
                    setEditor(result.post);
                  }, "Beitrag gespeichert.")
                }
                onApprove={() =>
                  run(async () => {
                    const result = await request("approve", {
                      id: editor.id,
                      revision: editor.revision,
                      action: "approve",
                    });
                    setEditor(result.post);
                  }, "Beitrag ausdrücklich freigegeben.")
                }
                onRevoke={() =>
                  run(async () => {
                    const result = await request("approve", {
                      id: editor.id,
                      revision: editor.revision,
                      action: "revoke",
                    });
                    setEditor(result.post);
                  }, "Freigabe widerrufen.")
                }
                onCopy={() =>
                  setEditor({
                    ...blankPost(),
                    content: structuredClone(editor.content),
                  })
                }
              />
            )}

            {uploading && (
              <UploadMediaDialog
                setUploading={setUploading}
                busy={busy}
                productsLoading={productsLoading}
                productsError={productsError}
                setFile={setFile}
                setUpload={setUpload}
                upload={upload}
                folders={folders}
                data={data}
                file={file}
                run={run}
              />
            )}
            {mediaEditor && (
              <EditMediaDialog
                setMediaEditor={setMediaEditor}
                busy={busy}
                productsLoading={productsLoading}
                productsError={productsError}
                data={data}
                mediaEditor={mediaEditor}
                folders={folders}
                run={run}
              />
            )}

            {folderDialog && (
              <Modal
                title="Neuer Medienordner"
                onClose={() => setFolderDialog(false)}
              >
                <label>
                  Ordnername
                  <input
                    value={folderName}
                    maxLength={80}
                    onChange={(e) => setFolderName(e.target.value)}
                  />
                </label>
                <button
                  disabled={
                    busy ||
                    !folderName.trim() ||
                    folders.includes(folderName.trim())
                  }
                  onClick={() =>
                    run(async () => {
                      await saveSettings({
                        ...data.settings.value,
                        media_folders: [...folders, folderName.trim()],
                      });
                      setFolderName("");
                      setFolderDialog(false);
                    }, "Ordner angelegt.")
                  }
                >
                  Ordner anlegen
                </button>
              </Modal>
            )}
          </>
        )}
      </main>
    </Feedback.Provider>
  );
}
