import React, { useState } from "react";
import { formatDate } from "./common";
export default function PostVersions({
  versions,
  loading,
  error,
  busy,
  onRestore,
  onRetry,
}) {
  const [revision, setRevision] = useState("");
  const selected = versions.find((v) => String(v.revision) === revision);
  return (
    <section className="mk-card">
      <h3>Speicherstände des Beitrags</h3>
      {loading && <p role="status">Lade Speicherstände …</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button disabled={busy} onClick={onRetry}>
            Erneut laden
          </button>
        </p>
      )}
      <label>
        Speicherstand
        <select
          aria-label="Speicherstand des Beitrags"
          value={selected ? revision : ""}
          onChange={(e) => setRevision(e.target.value)}
        >
          <option value="">Speicherstand wählen</option>
          {versions.map((v) => (
            <option key={v.revision} value={v.revision}>
              Version {v.revision} · {formatDate(v.saved_at)}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!selected || busy} onClick={() => onRestore(selected)}>
        Speicherstand wiederherstellen
      </button>
      <small>
        Bild, Texte und Termin werden zur Bearbeitung übernommen. Erst
        „Speichern“ übernimmt die Änderung; eine Freigabe wird dabei aufgehoben.
      </small>
    </section>
  );
}
