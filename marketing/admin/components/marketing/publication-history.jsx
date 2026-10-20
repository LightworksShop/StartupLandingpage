import { request } from "./data";
import "./styles.css";
import { dateLabel, labels, states } from "./workspace-model";

export default function PublicationHistory({
  history,
  data,
  setRecovery,
  recovery,
  run,
  historyPage,
  setHistoryPage,
}) {
  return (
    <section className="mk-panel">
      <h2>Veröffentlichungen und Fehler</h2>
      <p>
        Unklare Ergebnisse werden niemals automatisch wiederholt. Prüfe zuerst
        das Plattformkonto und dokumentiere das Ergebnis.
      </p>
      <p>
        Fehlt nach einer Kontoänderung die Freigabe, gib den unveränderten
        Beitrag zuerst im Kalender erneut frei und wähle anschließend hier
        „Erneut versuchen“.
      </p>
      {history.publications.map((pub) => (
        <article key={pub.id} className="mk-card">
          <h3>
            {data.posts.find((p) => p.id === pub.post_id)?.content.topic ||
              pub.post_id}{" "}
            · {labels[pub.channel]}
          </h3>
          <p>
            {states[pub.state]} ·{" "}
            {dateLabel(pub.value.published_at || pub.created_at)}
          </p>
          {pub.value.error && <code>{pub.value.error}</code>}
          {pub.value.remote_id && <p>Plattform-ID: {pub.value.remote_id}</p>}
          {["failed", "unknown"].includes(pub.state) && (
            <button
              onClick={() =>
                setRecovery({
                  id: pub.id,
                  state: pub.state,
                  action: pub.state === "failed" ? "retry" : "published",
                  note: "",
                  remote_id: "",
                })
              }
            >
              Ergebnis klären
            </button>
          )}
        </article>
      ))}
      {recovery && (
        <div className="mk-panel">
          <h3>Veröffentlichung klären</h3>
          <label>
            Ergebnis
            <select
              value={recovery.action}
              onChange={(e) =>
                setRecovery({ ...recovery, action: e.target.value })
              }
            >
              {recovery.state === "failed" && (
                <option value="retry">
                  Erneut versuchen (eindeutig fehlgeschlagen)
                </option>
              )}
              <option value="published">Auf Plattform veröffentlicht</option>
              <option value="abandon">Abschließen, nicht wiederholen</option>
            </select>
          </label>
          {recovery.action === "published" && (
            <label>
              Plattform-ID
              <input
                value={recovery.remote_id}
                onChange={(e) =>
                  setRecovery({
                    ...recovery,
                    remote_id: e.target.value,
                  })
                }
              />
            </label>
          )}
          <label>
            Prüfnotiz (mindestens 10 Zeichen)
            <textarea
              value={recovery.note}
              onChange={(e) =>
                setRecovery({ ...recovery, note: e.target.value })
              }
            />
          </label>
          <button
            onClick={() =>
              run(async () => {
                await request("reconcile", {
                  id: recovery.id,
                  action: recovery.action,
                  note: recovery.note,
                  ...(recovery.action === "published"
                    ? { remote_id: recovery.remote_id }
                    : {}),
                });
                setRecovery(null);
              })
            }
          >
            Ergebnis speichern
          </button>
          <button onClick={() => setRecovery(null)}>Abbrechen</button>
        </div>
      )}
      <h3>Änderungsprotokoll</h3>
      {history.audit.map((event) => (
        <p key={event.id} className="mk-audit">
          {dateLabel(event.created_at)} · {event.actor} · {event.action} ·{" "}
          {event.entity_id}
        </p>
      ))}
      <div className="mk-toolbar">
        <button
          disabled={!historyPage}
          onClick={() => setHistoryPage(historyPage - 1)}
        >
          Neuere
        </button>
        <button
          disabled={
            history.publications.length < 100 && history.audit.length < 100
          }
          onClick={() => setHistoryPage(historyPage + 1)}
        >
          Ältere
        </button>
      </div>
    </section>
  );
}
