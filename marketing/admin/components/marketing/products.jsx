import React, { useState } from "react";
import {
  Empty,
  Icon,
  Modal,
  Pager,
  Search,
  Thumbnail,
  formatDate,
} from "./common";
export function priceLabel(product) {
  const prices = (product.variants || [])
    .flatMap((v) => v.prices || [])
    .filter(
      (p) =>
        p.currency_code === "eur" &&
        !p.price_list_id &&
        Number.isFinite(Number(p.amount)),
    );
  return prices.length
    ? `Ab ${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.min(...prices.map((p) => Number(p.amount))))}`
    : "—";
}
export default function Products({
  products,
  preferences: socialPreferences,
  feedExclusions = [],
  onSaveFeeds,
  onSave,
  onImport,
}) {
  const [scope, setScope] = useState("social");
  const preferences =
    scope === "feeds"
      ? Object.fromEntries(feedExclusions.map((id) => [id, "exclude"]))
      : socialPreferences;
  const [search, setSearch] = useState(""),
    [priority, setPriority] = useState(""),
    [used, setUsed] = useState(""),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState([]),
    [editing, setEditing] = useState(null),
    [image, setImage] = useState("");
  const filtered = products.filter(
    (p) =>
      p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (!priority || (preferences[p.id] || "normal") === priority) &&
      (!used || (used === "never" ? !p.last_used_at : !!p.last_used_at)),
  );
  const current = Math.min(
      page,
      Math.max(0, Math.ceil(filtered.length / 20) - 1),
    ),
    shown = filtered.slice(current * 20, current * 20 + 20);
  function save(ids, value) {
    const next = { ...preferences };
    for (const id of ids) {
      if (value === "normal") delete next[id];
      else next[id] = value;
    }
    if (scope === "feeds") onSaveFeeds(Object.keys(next));
    else onSave(next);
  }
  const urls = editing
    ? [
        ...new Set(
          [
            editing.thumbnail,
            ...(editing.images || []).map((i) => i.url),
          ].filter(Boolean),
        ),
      ]
    : [];
  return (
    <>
      <div className="mk-tabs" aria-label="Produktauswahl-Bereich">
        <button
          aria-pressed={scope === "social"}
          onClick={() => {
            setScope("social");
            setSelected([]);
            setPriority("");
          }}
        >
          Social Media
        </button>
        <button
          aria-pressed={scope === "feeds"}
          onClick={() => {
            setScope("feeds");
            setSelected([]);
            setPriority("");
          }}
        >
          Produktfeeds
        </button>
      </div>
      <div className="mk-info">
        <Icon name="info" />
        <div>
          <strong>Keine Freigabe pro Produkt erforderlich</strong>
          <p>
            Alle veröffentlichten Produkte stehen automatisch für Marketing zur
            Verfügung. Bevorzugungen steuern die Vorbereitung der
            Social-Media-Beiträge. Social-Media-Ausschlüsse und
            Produktfeed-Ausschlüsse werden getrennt gespeichert.
          </p>
        </div>
      </div>
      <div className="mk-toolbar mk-filters">
        <Search
          value={search}
          onChange={setSearch}
          placeholder="Produkte suchen …"
          label="Produkte suchen"
        />
        <select
          aria-label="Priorität filtern"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Alle Prioritäten</option>
          {scope === "social" && <option value="prefer">Bevorzugt</option>}
          <option value="normal">Normal</option>
          <option value="exclude">Ausgeschlossen</option>
        </select>
        <select
          aria-label="Letzte Verwendung filtern"
          value={used}
          onChange={(e) => setUsed(e.target.value)}
        >
          <option value="">Jede Verwendung</option>
          <option value="used">Bereits veröffentlicht</option>
          <option value="never">Noch nicht veröffentlicht</option>
        </select>
      </div>
      {selected.length > 0 && (
        <div className="mk-toolbar mk-banner">
          <span>{selected.length} ausgewählt</span>
          {scope === "social" && (
            <button onClick={() => save(selected, "prefer")}>Bevorzugen</button>
          )}
          <button onClick={() => save(selected, "normal")}>
            Normal verwenden
          </button>
          <button onClick={() => save(selected, "exclude")}>
            Ausschließen
          </button>
          <button onClick={() => setSelected([])}>Auswahl aufheben</button>
        </div>
      )}
      <div className="mk-table-scroll">
        <table className="mk-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Alle sichtbaren Produkte auswählen"
                  checked={
                    !!shown.length &&
                    shown.every((p) => selected.includes(p.id))
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...new Set([...selected, ...shown.map((p) => p.id)])]
                        : selected.filter(
                            (id) => !shown.some((p) => p.id === id),
                          ),
                    )
                  }
                />
              </th>
              <th>Produkt</th>
              <th>Basispreis (EUR)</th>
              <th>Status</th>
              <th>Priorität</th>
              <th>Letzte Veröffentlichung</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${p.title} auswählen`}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.id]
                          : selected.filter((id) => id !== p.id),
                      )
                    }
                  />
                </td>
                <td>
                  <div className="mk-product-cell">
                    <Thumbnail media={p} />
                    <div>
                      <strong>{p.title}</strong>
                      <small>{p.variants?.length ?? "—"} Varianten</small>
                    </div>
                  </div>
                </td>
                <td>{priceLabel(p)}</td>
                <td>
                  <span
                    className={`mk-status ${preferences[p.id] === "exclude" ? "" : "mk-status-green"}`}
                  >
                    {preferences[p.id] === "exclude"
                      ? "Ausgeschlossen"
                      : "Verfügbar"}
                  </span>
                </td>
                <td>
                  <select
                    aria-label={`Verwendung ${p.title}`}
                    value={preferences[p.id] || "normal"}
                    onChange={(e) => save([p.id], e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    {scope === "social" && (
                      <option value="prefer">Bevorzugt</option>
                    )}
                    <option value="exclude">Ausgeschlossen</option>
                  </select>
                </td>
                <td>{formatDate(p.last_used_at, { dateStyle: "medium" })}</td>
                <td>
                  <button
                    onClick={() => {
                      setEditing(p);
                      setImage("");
                    }}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <Empty>Keine Produkte für diese Auswahl gefunden.</Empty>
      )}
      <Pager page={current} total={filtered.length} onChange={setPage} />
      {editing && (
        <Modal title={editing.title} onClose={() => setEditing(null)}>
          <Thumbnail media={editing} />
          <label>
            Verwendung
            <select
              value={preferences[editing.id] || "normal"}
              onChange={(e) => save([editing.id], e.target.value)}
            >
              <option value="normal">Normal verwenden</option>
              {scope === "social" && <option value="prefer">Bevorzugen</option>}
              <option value="exclude">Ausschließen</option>
            </select>
          </label>
          {urls.length > 0 && (
            <>
              <label>
                Produktbild
                <select
                  value={image || urls[0]}
                  onChange={(e) => setImage(e.target.value)}
                >
                  {urls.map((u, i) => (
                    <option key={u} value={u}>
                      Bild {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => onImport(editing.id, image || urls[0])}>
                In Medienpool übernehmen
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
