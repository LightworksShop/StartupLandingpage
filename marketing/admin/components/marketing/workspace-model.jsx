import { useState } from "react";
import "./styles.css";
export const channels = ["linkedin", "instagram", "pinterest", "facebook"];

export const blankVersion = (channel) => ({
  channel,
  title: "",
  text: "",
  alt: "",
  media_id: null,
  cover_media_id: null,
  link: "",
});

export const blankPost = () => ({
  content: {
    topic: "",
    notes: "",
    product_ids: [],
    versions: [blankVersion("linkedin")],
  },
  scheduled_at: null,
});

export const labels = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  pinterest: "Pinterest",
  facebook: "Facebook (vorbereitet)",
};

export const states = {
  pending: "Wiederholung vorgemerkt",
  preparing: "Medium wird vorbereitet",
  dispatching: "Wird veröffentlicht",
  published: "Veröffentlicht",
  unknown: "Unklar – Plattform prüfen",
  failed: "Fehlgeschlagen",
  abandoned: "Abgeschlossen ohne Wiederholung",
};

export function dateLabel(value) {
  return value
    ? new Date(value).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Ohne Termin";
}

export function ProductPicker({ products, value, onChange }) {
  const [search, setSearch] = useState("");
  return (
    <div>
      <input
        aria-label="Produkte suchen"
        placeholder="Produkte suchen …"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mk-options">
        {products
          .filter(
            (p) =>
              p.title.toLowerCase().includes(search.toLowerCase()) ||
              value.includes(p.id),
          )
          .map((p) => (
            <label key={p.id} className="mk-inline">
              <input
                type="checkbox"
                checked={value.includes(p.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, p.id]
                      : value.filter((id) => id !== p.id),
                  )
                }
              />
              {p.title}
            </label>
          ))}
      </div>
    </div>
  );
}

export function MediaPreview({ media }) {
  return !media ? null : media.mime_type.startsWith("video/") ? (
    <video className="mk-preview" src={media.url} controls preload="metadata" />
  ) : (
    <img
      className="mk-preview"
      src={media.url}
      alt={media.name}
      loading="lazy"
    />
  );
}
