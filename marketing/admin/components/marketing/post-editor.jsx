import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Thumbnail, Search, Empty } from "./common";
import { berlinInput } from "../../../lib/marketing/berlin-time";
import {
  postStatus,
  postStatusLabels,
  approvableVersions,
} from "../../../lib/marketing/post-model";
import PostVersions from "./post-versions";
import { request } from "./data";

const labels = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  pinterest: "Pinterest",
  facebook: "Facebook (Entwurf)",
};
export default function PostEditor({
  post,
  media,
  channels,
  busy,
  loading,
  error,
  saved,
  versions,
  versionsLoading,
  versionsError,
  onRetry,
  onClose,
  onContent,
  onVersion,
  onSchedule,
  onDesign,
  onSave,
  onApprove,
  onRevoke,
  onCopy,
  onRestore,
}) {
  const [choosing, setChoosing] = useState(null),
    [search, setSearch] = useState("");
  const [linkedinTargets, setLinkedinTargets] = useState([]), [targetError, setTargetError] = useState("");
  const locked = post.editable === false;
  const choices = choosing
    ? media.filter(
        (m) =>
          (choosing.channel !== "linkedin" || ["image/jpeg", "image/png"].includes(m.mime_type)) &&
          (choosing.field !== "cover_media_id" ||
            m.mime_type.startsWith("image/")) &&
          m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      )
    : [];
  return (
    <Modal
      title={post.id ? "Beitrag bearbeiten" : "Neuer Entwurf"}
      onClose={() => !busy && onClose()}
      wide
    >
      <p>
        <strong>{postStatusLabels[postStatus(post)]}</strong>
        {post.approved
          ? " · Änderungen benötigen eine neue Freigabe."
          : " · Vor der Veröffentlichung prüfen und ausdrücklich freigeben."}
      </p>
      {locked && (
        <p>
          Dieser Beitrag gehört bereits zum Veröffentlichungsverlauf. Für neue
          Inhalte könnt ihr ihn als neuen Entwurf kopieren.{" "}
          <Link to="/marketing/calendar?panel=history" onClick={onClose}>
            Verlauf öffnen
          </Link>
        </p>
      )}
      <fieldset
        disabled={busy || loading || error || locked}
        aria-busy={loading}
        className="mk-body"
      >
        {loading && <p role="status">Lade Beitrag …</p>}
        <div className="mk-grid">
          <label>
            Thema
            <input
              value={post.content.topic}
              maxLength={200}
              onChange={(e) => onContent("topic", e.target.value)}
            />
          </label>
          <label>
            Termin (Europe/Berlin)
            <input
              type="datetime-local"
              value={berlinInput(post.scheduled_at)}
              onChange={(e) => onSchedule(e.target.value)}
            />
          </label>
        </div>
        <div className="mk-toolbar" aria-label="Plattformen">
          {channels.map((channel) => (
            <label key={channel} className="mk-inline">
              <input
                type="checkbox"
                checked={post.content.versions.some(
                  (v) => v.channel === channel,
                )}
                disabled={
                  post.content.versions.length === 1 &&
                  post.content.versions[0].channel === channel
                }
                onChange={(e) =>
                  onContent(
                    "versions",
                    e.target.checked
                      ? [
                          ...post.content.versions,
                          {
                            channel,
                            title: "",
                            text: "",
                            alt: "",
                            media_id: null,
                            cover_media_id: null,
                            link: "",
                          },
                        ]
                      : post.content.versions.filter(
                          (v) => v.channel !== channel,
                        ),
                  )
                }
              />
              {labels[channel]}
            </label>
          ))}
        </div>
        <div className="mk-grid">
          {post.content.versions.map((v) => {
            const medium = media.find((m) => m.id === v.media_id);
            const editable =
              !medium?.mime_type.startsWith("video/") || !!medium.composition;
            return (
              <section className="mk-card mk-post-version" key={v.channel}>
                <h3>{labels[v.channel]}</h3>
                {medium ? (
                  medium.mime_type.startsWith("video/") ? (
                    <video
                      className="mk-post-image"
                      src={medium.url}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      className="mk-post-image"
                      src={medium.url}
                      alt={v.alt || medium.name}
                    />
                  )
                ) : (
                  <p className="mk-info">Noch kein Beitragsbild vorhanden.</p>
                )}
                <div className="mk-toolbar">
                  <button
                    disabled={!editable}
                    title={
                      !editable
                        ? "Dieses Video hat keine bearbeitbare Bildgestaltung."
                        : undefined
                    }
                    aria-label={`Bildgestalter öffnen ${labels[v.channel]}`}
                    onClick={() => onDesign(v)}
                  >
                    {medium ? "Bild bearbeiten" : "Bild gestalten"}
                  </button>
                  <button
                    aria-label={`Bild austauschen ${labels[v.channel]}`}
                    onClick={() => {
                      setSearch("");
                      setChoosing({ channel: v.channel, field: "media_id" });
                    }}
                  >
                    Bild austauschen
                  </button>
                </div>
                {v.channel === "linkedin" && <div>
                  <label>LinkedIn-Veröffentlichungsziel
                    <select value={v.target_id || ""} onChange={e => onVersion(v.channel, "target_id", e.target.value || null)}>
                      <option value="">Standardziel aus den Anbindungen</option>
                      {v.target_id && !linkedinTargets.some(t => t.id === v.target_id) && <option value={v.target_id}>{v.target_id}</option>}
                      {linkedinTargets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                  <button onClick={async () => {
                    setTargetError("");
                    try { setLinkedinTargets((await request("linkedin-targets")).targets); } catch(e) { setTargetError(e.message); }
                  }}>Profil und Unternehmensseiten laden</button>
                  {targetError && <p role="alert">{targetError}</p>}
                </div>}
                {v.channel === "facebook" && (
                  <p>Facebook-Veröffentlichung ist noch nicht verfügbar.</p>
                )}
                {v.channel === "pinterest" && (
                  <label>
                    Titel
                    <input
                      aria-label="Titel Pinterest"
                      value={v.title}
                      maxLength={100}
                      onChange={(e) =>
                        onVersion(v.channel, "title", e.target.value)
                      }
                    />
                  </label>
                )}
                <label>
                  Caption & Hashtags
                  <textarea
                    rows={6}
                    aria-label={`Beitragstext ${labels[v.channel]}`}
                    value={v.text}
                    maxLength={v.channel === "linkedin" ? 3000 : v.channel === "pinterest" ? 800 : 2200}
                    onChange={(e) =>
                      onVersion(v.channel, "text", e.target.value)
                    }
                  />
                </label>
                <small>
                  {v.text.length} / {v.channel === "linkedin" ? 3000 : v.channel === "pinterest" ? 800 : 2200}
                </small>
                {v.channel === "pinterest" && (
                  <label>
                    Ziel-Link
                    <input
                      type="url"
                      value={v.link}
                      onChange={(e) =>
                        onVersion(v.channel, "link", e.target.value)
                      }
                    />
                  </label>
                )}
                <details className="mk-post-details">
                  <summary>Weitere Angaben · {labels[v.channel]}</summary>
                  <label>
                    Alternativtext
                    <textarea
                      aria-label={`Alternativtext ${labels[v.channel]}`}
                      value={v.alt}
                      maxLength={v.channel === "linkedin" ? 4086 : 500}
                      onChange={(e) =>
                        onVersion(v.channel, "alt", e.target.value)
                      }
                    />
                  </label>
                  {v.channel === "pinterest" &&
                    medium?.mime_type.startsWith("video/") && (
                      <button
                        aria-label="Titelbild austauschen Pinterest"
                        onClick={() => {
                          setSearch("");
                          setChoosing({
                            channel: v.channel,
                            field: "cover_media_id",
                          });
                        }}
                      >
                        Titelbild auswählen
                      </button>
                    )}
                  {v.cover_media_id && (
                    <Thumbnail
                      media={media.find((m) => m.id === v.cover_media_id)}
                    />
                  )}
                  {v.channel !== "pinterest" && v.link && (
                    <p>
                      <a href={v.link} target="_blank" rel="noreferrer">
                        Shopprodukt ansehen
                      </a>{" "}
                      · Redaktioneller Produktlink
                    </p>
                  )}
                </details>
              </section>
            );
          })}
        </div>
        <details className="mk-post-details">
          <summary>Weitere Angaben zum Beitrag</summary>
          <label>
            Redaktionelle Notizen
            <textarea
              value={post.content.notes}
              maxLength={5000}
              onChange={(e) => onContent("notes", e.target.value)}
            />
          </label>
          <p>
            Produktzuordnung: automatisch aus der Gestaltung.{" "}
            {post.content.product_ids.length
              ? `${post.content.product_ids.length} Produkt(e) zugeordnet.`
              : "Freier Beitrag ohne Produktzuordnung."}
          </p>
          {!!post.id && (
            <PostVersions
              versions={versions}
              loading={versionsLoading}
              error={versionsError}
              busy={busy}
              onRestore={onRestore}
              onRetry={onRetry}
            />
          )}
        </details>
      </fieldset>
      <div className="mk-toolbar mk-post-footer">
        <button
          className="mk-primary"
          aria-label="Entwurf speichern"
          disabled={busy || loading || error || locked}
          onClick={onSave}
        >
          Speichern
        </button>
        <button
          aria-label="Gespeicherten Beitrag ausdrücklich freigeben"
          disabled={
            busy ||
            loading ||
            error ||
            !post.id ||
            !!post.approved ||
            !saved ||
            post.content.versions.some((v) => v.channel === "facebook") ||
            !approvableVersions(post.content, post.publications).length
          }
          onClick={onApprove}
        >
          Freigeben
        </button>
        <button disabled={busy} onClick={onCopy}>
          Als neuen Entwurf kopieren
        </button>
        {post.approved && (
          <button disabled={busy} onClick={onRevoke}>
            Freigabe widerrufen
          </button>
        )}
      </div>
      {choosing && (
        <Modal
          title="Beitragsbild auswählen"
          onClose={() => setChoosing(null)}
          wide
        >
          <Search
            value={search}
            onChange={setSearch}
            label="Beitragsmedien suchen"
            placeholder="Bild oder Video suchen …"
          />
          {!choices.length && (
            <Empty>Keine passenden Beitragsmedien gefunden.</Empty>
          )}
          <div className="mk-media-grid">
            {choices.map((m) => (
              <button
                key={m.id}
                data-media-id={m.id}
                onClick={() => {
                  onVersion(choosing.channel, choosing.field, m.id);
                  setChoosing(null);
                }}
              >
                <Thumbnail media={m} />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </Modal>
  );
}
