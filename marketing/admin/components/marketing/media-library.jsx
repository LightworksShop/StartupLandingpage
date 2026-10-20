import React, { useState } from "react";
import { Empty, Icon, Pager, Search, Thumbnail } from "./common";
export const categories = {
  all: "Alle",
  image: "Bilder",
  video: "Videos",
  background: "Hintergründe",
  overlay: "Overlays",
  other: "Sonstiges",
};
export function categoryOf(m) {
  return m.category || (m.mime_type?.startsWith("video/") ? "video" : "image");
}
export function MediaFields({ value, onChange, folders }) {
  return (
    <div className="mk-toolbar">
      <label>
        Kategorie
        <select
          aria-label="Kategorie"
          value={value.category || "image"}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
        >
          {Object.entries(categories)
            .filter(([key]) => key !== "all")
            .map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
        </select>
      </label>
      <label>
        Ordner
        <select
          aria-label="Ordner"
          value={value.folder || ""}
          onChange={(e) => onChange({ ...value, folder: e.target.value })}
        >
          <option value="">Ohne Ordner</option>
          {folders.map((folder) => (
            <option key={folder}>{folder}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
export default function MediaLibrary({ media, folders, onEdit }) {
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [tag, setTag] = useState(""),
    [folder, setFolder] = useState(""),
    [sort, setSort] = useState("new"),
    [layout, setLayout] = useState("grid"),
    [page, setPage] = useState(0);
  const tags = [...new Set(media.flatMap((m) => m.tags))].sort();
  const filtered = media.filter(
    (m) =>
      (category === "all" || categoryOf(m) === category) &&
      (!tag || m.tags.includes(tag)) &&
      (!folder || m.folder === folder) &&
      `${m.name} ${m.tags.join(" ")}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "old") filtered.reverse();
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  return (
    <>
      <div className="mk-heading">
        <div className="mk-tabs">
          {Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              aria-pressed={category === key}
              onClick={() => {
                setCategory(key);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mk-segment">
          <button
            aria-label="Rasteransicht"
            aria-pressed={layout === "grid"}
            onClick={() => setLayout("grid")}
          >
            <Icon name="grid" />
          </button>
          <button
            aria-label="Listenansicht"
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
          >
            <Icon name="list" />
          </button>
        </div>
      </div>
      <div className="mk-toolbar mk-filters">
        <Search
          value={search}
          onChange={setSearch}
          placeholder="Medien suchen …"
          label="Medien suchen"
        />
        <select
          aria-label="Ordner filtern"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          <option value="">Alle Ordner</option>
          {folders.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          aria-label="Schlagwort filtern"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">Alle Tags</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Medien sortieren"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="new">Neueste zuerst</option>
          <option value="old">Älteste zuerst</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div
        className={`mk-media-grid ${layout === "list" ? "mk-media-list" : ""}`}
      >
        {filtered.slice(current * 20, current * 20 + 20).map((m) => (
          <button
            className="mk-media-card"
            key={m.id}
            onClick={() => onEdit(m)}
          >
            <div className="mk-media-visual">
              <Thumbnail media={m} />
              {m.mime_type.startsWith("video/") && (
                <span className="mk-video-icon">
                  <Icon name="play" />
                </span>
              )}
              {m.generated && <span className="mk-generated">Generiert</span>}
            </div>
            <div className="mk-media-caption">
              <strong>{m.name}</strong>
              <div className="mk-tags">
                <span>{categories[categoryOf(m)]}</span>
                {m.tags.slice(0, 3).map((t) => (
                  <span key={t}>{t}</span>
                ))}
                {m.folder && <span>{m.folder}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty>
          Keine Medien in dieser Auswahl. Lade eigene Inhalte hoch oder passe
          die Filter an.
        </Empty>
      )}
      <Pager page={current} total={filtered.length} onChange={setPage} />
    </>
  );
}
