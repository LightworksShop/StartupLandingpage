import React, { createContext, useContext, useEffect, useRef } from "react";
export const Feedback = createContext({ error: "", busy: false });
export const sections = {
  calendar: [
    "Kalender",
    "Alle Inhalte im Überblick planen, bearbeiten und freigeben.",
  ],
  media: [
    "Bibliothek",
    "Eigene Fotos, Videos und Hintergründe verwalten und verschlagworten.",
  ],
  design: [
    "Bildgestaltung",
    "Bilder, Texte und Markenelemente zu eigenen Motiven kombinieren.",
  ],
  products: [
    "Produkte im Marketing",
    "Veröffentlichte Produkte verwenden, bevorzugen oder ausschließen.",
  ],
  planning: [
    "Einstellungen",
    "Vorgaben für die Vorbereitung eurer Beiträge durch den Agenten.",
  ],
  history: ["Verlauf", "Veröffentlichungen und Ergebnisse nachvollziehen."],
  connections: [
    "Anbindungen",
    "Profile und Unternehmensseiten verbinden.",
  ],
};
export const platformNames = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  pinterest: "Pinterest",
  facebook: "Facebook",
  google: "Google Merchant Center",
};
export function Icon({ name, size = 18, ...props }) {
  const paths = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    left: <path d="m14 6-6 6 6 6" />,
    right: <path d="m10 6 6 6-6 6" />,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    list: <path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </>
    ),
    link: (
      <>
        <path d="m9 15 6-6m-6-3 2-2a5 5 0 0 1 7 7l-2 2m-1 5-2 2a5 5 0 0 1-7-7l2-2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v1" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="m7 4 14 8-14 8z" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    check: <path d="m4 12 5 5L20 6" />,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.image}
    </svg>
  );
}
export function Platform({ channel, small = false }) {
  return (
    <span
      className={`mk-platform mk-platform-${channel} ${small ? "mk-platform-small" : ""}`}
      aria-label={platformNames[channel]}
    >
      {channel === "instagram" ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
        </svg>
      ) : channel === "linkedin" ? (
        "in"
      ) : channel === "pinterest" ? (
        "P"
      ) : channel === "facebook" ? (
        "f"
      ) : (
        "G"
      )}
    </span>
  );
}
export function ChannelBadge({ channel }) {
  return (
    <span className={`mk-channel mk-channel-${channel}`}>
      <Platform channel={channel} small />
      {platformNames[channel]}
    </span>
  );
}
export function Search({
  value,
  onChange,
  placeholder = "Suchen …",
  label = placeholder,
}) {
  return (
    <div className="mk-search">
      <Icon name="search" />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Empty({ children, action }) {
  return (
    <div className="mk-empty">
      <Icon name="image" size={28} />
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const feedback = useContext(Feedback);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`mk mk-modal ${wide ? "mk-modal-wide" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="mk-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="mk-icon-button"
          aria-label="Dialog schließen"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      {feedback.error && (
        <p role="alert" className="mk-error">
          {feedback.error}
          {feedback.onRetry && (
            <button
              type="button"
              disabled={feedback.busy}
              onClick={feedback.onRetry}
            >
              Erneut laden
            </button>
          )}
        </p>
      )}
      <fieldset disabled={feedback.busy} className="mk-body">
        {children}
      </fieldset>
    </dialog>
  );
}
export function Pager({ page, total, size = 20, onChange }) {
  return (
    <footer className="mk-pager">
      <span>{total} Einträge</span>
      <div>
        <button
          aria-label="Vorherige Seite"
          disabled={!page}
          onClick={() => onChange(page - 1)}
        >
          <Icon name="left" />
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(total / size))}
        </span>
        <button
          aria-label="Nächste Seite"
          disabled={(page + 1) * size >= total}
          onClick={() => onChange(page + 1)}
        >
          <Icon name="right" />
        </button>
      </div>
    </footer>
  );
}
export function Thumbnail({ media, alt = "", className = "", ...props }) {
  const url = media?.url || media?.thumbnail || media?.images?.[0]?.url;
  return url ? (
    media?.mime_type?.startsWith("video/") ? (
      <video
        className={`mk-thumb ${className}`}
        src={url}
        preload="metadata"
        muted
        {...props}
      />
    ) : (
      <img
        className={`mk-thumb ${className}`}
        src={url}
        alt={alt || media?.name || media?.title || ""}
        loading="lazy"
        {...props}
      />
    )
  ) : (
    <div className={`mk-thumb mk-thumb-empty ${className}`}>
      <Icon name="image" size={30} />
    </div>
  );
}
export function formatDate(
  date,
  options = { dateStyle: "medium", timeStyle: "short" },
) {
  return date
    ? new Date(date).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        ...options,
      })
    : "—";
}
export function dayKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function monday(date = dayKey(new Date())) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function plusDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
