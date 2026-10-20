import React, { useEffect, useState } from "react";
import { formatDate } from "./common";
export const accountStates = {
  connected: "Verbunden",
  needs_target: "Zielboard wählen",
  configured: "Serverzugang konfiguriert",
  disconnected: "Nicht verbunden",
  reauth_required: "Erneut anmelden",
  refresh_required: "Zugang erneuern",
};
export const accountErrors = {
  APP_CREDENTIALS_MISSING: "App-ID und App-Geheimnis fehlen auf dem Server.",
  LOGIN_CONFIG_MISSING:
    "Die Konfigurations-ID für Facebook Login for Business fehlt auf dem Server.",
  LINKEDIN_API_VERSION_MISSING: "Die LinkedIn-API-Version fehlt auf dem Server.",
  LINKEDIN_AUTHOR_INVALID: "LinkedIn-Zielkonfiguration prüfen.",
  LINKEDIN_ORGANIZATION_ROLE_REQUIRED: "Für diese Unternehmensseite fehlt die Veröffentlichungsberechtigung.",
  API_VERSION_MISSING: "Die Instagram-API-Version fehlt auf dem Server.",
  CREDENTIALS_KEY_MISSING:
    "Der Verschlüsselungsschlüssel fehlt auf dem Server.",
  PUBLIC_URL_MISSING: "Die öffentliche Backend-Adresse fehlt auf dem Server.",
  PUBLIC_URL_INVALID: "Die öffentliche Backend-Adresse ist ungültig.",
  OAUTH_STATE_INVALID: "Der Login ist abgelaufen. Bitte erneut starten.",
  OAUTH_DENIED: "Die Kontoanmeldung wurde abgebrochen.",
  ACCOUNT_PERMISSIONS_MISSING:
    "Erforderliche Berechtigungen fehlen. Bitte erneut verbinden.",
  ACCOUNT_CHANGED: "Die Anbindung wurde inzwischen geändert. Bitte neu laden.",
  TOKEN_TOO_RECENT:
    "Instagram-Zugänge lassen sich erst nach 24 Stunden erneuern.",
  TOKEN_EXPIRED: "Der Zugang ist abgelaufen. Bitte erneut verbinden.",
  REFRESH_TOKEN_EXPIRED: "Bitte erneut verbinden, um den Zugang zu erneuern.",
  REAUTH_REQUIRED: "Bitte das Konto erneut verbinden.",
};
export default function AccountControls({
  channel,
  account = {},
  onAction,
  loadBoards,
  loadInstagramAccounts,
}) {
  const [targets, setTargets] = useState([]),
    [after, setAfter] = useState(null),
    [page, setPage] = useState(account.page_id || "");
  useEffect(() => {
    setPage(account.page_id || "");
  }, [account.page_id]);
  async function getTargets(cursor) {
    setLoading(true);
    setBoardError("");
    try {
      const result = await loadInstagramAccounts(cursor);
      setTargets((previous) =>
        cursor ? [...previous, ...result.targets] : result.targets,
      );
      setAfter(result.after);
    } catch (error) {
      setBoardError(error.message);
    } finally {
      setLoading(false);
    }
  }
  const facebook =
    channel === "instagram" && account.login_method === "facebook";
  const [boards, setBoards] = useState([]),
    [bookmark, setBookmark] = useState(null),
    [board, setBoard] = useState(account.target_id || ""),
    [boardError, setBoardError] = useState(""),
    [loading, setLoading] = useState(false),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setBoard(account.target_id || "");
  }, [account.target_id]);
  async function getBoards(cursor) {
    setLoading(true);
    setBoardError("");
    try {
      const result = await loadBoards(cursor);
      setBoards((previous) =>
        cursor ? [...previous, ...result.boards] : result.boards,
      );
      setBookmark(result.bookmark);
    } catch (error) {
      setBoardError(error.message);
    } finally {
      setLoading(false);
    }
  }
  const active = ["connected", "needs_target"].includes(account.state);
  return (
    <>
      <div className="mk-info">
        <div>
          <strong>
            {account.state === "needs_target" && facebook
              ? "Instagram-Konto wählen"
              : accountStates[account.state] || "Nicht verbunden"}
          </strong>
          {account.username && <p>@{account.username}</p>}
          {account.page_name && <p>Facebook-Seite: {account.page_name}</p>}
          {account.target_name && <p>Zielboard: {account.target_name}</p>}
        </div>
      </div>
      {!account.oauth_ready && (
        <p>
          Zuerst eine{" "}
          {channel === "instagram"
            ? facebook
              ? "Meta-App mit Facebook Login for Business"
              : "Meta-App mit Instagram Login"
            : channel === "linkedin" ? "LinkedIn-Developer-App" : "Pinterest-Developer-App"}{" "}
          anlegen. App-ID und App-Geheimnis werden anschließend auf dem
          Backend hinterlegt.
          <a
            href={
              channel === "instagram"
                ? "https://developers.facebook.com/apps/"
                : channel === "linkedin" ? "https://www.linkedin.com/developers/apps" : "https://developers.pinterest.com/"
            }
            target="_blank"
            rel="noreferrer"
          >
            {" "}
            Entwicklerportal öffnen
          </a>
        </p>
      )}
      {account.setup_error && (
        <p className="mk-banner">
          {accountErrors[account.setup_error] || "Servereinrichtung prüfen."}
        </p>
      )}
      <div className="mk-toolbar">
        <button
          className="mk-primary"
          disabled={!account.oauth_ready}
          onClick={() => onAction(channel, "connect")}
        >
          {facebook
            ? "Mit Facebook anmelden"
            : active
              ? "Konto erneut verbinden"
              : "Mit Konto anmelden"}
        </button>
        {["connected", "needs_target", "configured"].includes(
          account.state,
        ) && (
          <button onClick={() => onAction(channel, "verify")}>
            Zugang prüfen
          </button>
        )}
        {(active || account.state === "refresh_required") &&
          account.source === "oauth" &&
          !facebook && channel !== "linkedin" && (
            <button onClick={() => onAction(channel, "refresh")}>
              Zugang erneuern
            </button>
          )}
        {account.state && account.state !== "disconnected" && (
          <button className="mk-danger" onClick={() => setConfirm(true)}>
            Verbindung trennen
          </button>
        )}
      </div>
      {confirm && (
        <div className="mk-panel">
          <p>
            Die Verbindung wird im Backend entfernt. Die Freigaben wartender
            Beiträge für diese Plattform werden aufgehoben. Die App-Berechtigung
            könnt ihr zusätzlich im Plattformkonto widerrufen.
          </p>
          <div className="mk-toolbar">
            <button
              className="mk-danger"
              onClick={async () => {
                if (await onAction(channel, "disconnect")) setConfirm(false);
              }}
            >
              Verbindung jetzt trennen
            </button>
            <button onClick={() => setConfirm(false)}>Abbrechen</button>
          </div>
        </div>
      )}
      {facebook && active && (
        <section className="mk-panel">
          <h3>Instagram-Konto auswählen</h3>
          <p>
            Ein Wechsel des Kontos hebt die Freigaben wartender
            Instagram-Beiträge auf.
          </p>
          <button disabled={loading} onClick={() => getTargets()}>
            Instagram-Konten laden
          </button>
          {targets.length > 0 && (
            <>
              <label>
                Instagram-Konto und Facebook-Seite
                <select
                  aria-label="Instagram-Konto"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                >
                  <option value="">Konto auswählen</option>
                  {targets.map((t) => (
                    <option key={t.page_id} value={t.page_id}>
                      @{t.username} · {t.page_name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={!page || page === account.page_id}
                onClick={() =>
                  onAction(channel, "instagram_target", { page_id: page })
                }
              >
                Instagram-Konto speichern
              </button>
            </>
          )}
          {after && (
            <button disabled={loading} onClick={() => getTargets(after)}>
              Weitere Konten laden
            </button>
          )}
          {!loading && targets.length === 0 && (
            <p>
              Es werden verknüpfte professionelle Konten mit
              Veröffentlichungsberechtigung angezeigt.
            </p>
          )}
          {boardError && (
            <p role="alert" className="mk-error">
              {boardError}
            </p>
          )}
        </section>
      )}
      {channel === "pinterest" && active && (
        <section className="mk-panel">
          <h3>Zielboard für organische Pins</h3>
          <p>
            Ein Wechsel des Zielboards hebt bestehende Freigaben wartender
            Beiträge auf.
          </p>
          <button disabled={loading} onClick={() => getBoards()}>
            Boards laden
          </button>
          {boards.length > 0 && (
            <label>
              Öffentliches Board
              <select
                aria-label="Öffentliches Board"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              >
                <option value="">Board auswählen</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {bookmark && (
            <button disabled={loading} onClick={() => getBoards(bookmark)}>
              Weitere Boards laden
            </button>
          )}
          {boards.length > 0 && (
            <button
              disabled={!board || board === account.target_id}
              onClick={() => onAction(channel, "board", { board_id: board })}
            >
              Zielboard speichern
            </button>
          )}
          {boardError && (
            <p role="alert" className="mk-error">
              {boardError}
            </p>
          )}
        </section>
      )}
      <dl className="mk-account-facts">
        <dt>Letzte Prüfung</dt>
        <dd>{formatDate(account.checked_at)}</dd>
        <dt>Zugang gültig bis</dt>
        <dd>{formatDate(account.expires_at)}</dd>
        <dt>Letzte Erneuerung</dt>
        <dd>{formatDate(account.last_refresh_at)}</dd>
        <dt>Erneuerung</dt>
        <dd>
          {account.source === "oauth"
            ? facebook
              ? "Vor Ablauf erneut mit Facebook anmelden"
              : "Automatisch vor Ablauf, auch bei Veröffentlichungspause"
            : "Für Serverzugänge manuell"}
        </dd>
        <dt>Berechtigungen</dt>
        <dd>
          {account.scopes?.length
            ? account.scopes.join(", ")
            : "Noch nicht bestätigt"}
        </dd>
      </dl>
      {account.error && (
        <p role="alert" className="mk-error">
          {accountErrors[account.error] ||
            "Letzte Zugangsprüfung oder Erneuerung fehlgeschlagen. Bitte Zugang prüfen."}
        </p>
      )}
      {account.source === "environment" && (
        <p>
          Dieser Zugang stammt aus der Serverkonfiguration. Für automatische
          Erneuerung bitte das Konto hier neu anmelden.
        </p>
      )}
      {account.redirect_uri && (
        <details>
          <summary>Callback für die App-Einrichtung</summary>
          <p>Diese Rücksprungadresse exakt in der Plattform-App hinterlegen:</p>
          <input
            aria-label="OAuth-Rücksprungadresse"
            readOnly
            value={account.redirect_uri}
            onFocus={(e) => e.target.select()}
          />
        </details>
      )}
      <p className="mk-muted">
        Die Anmeldung bereitet das Konto vor. Beiträge benötigen weiterhin eine
        ausdrückliche Freigabe.
      </p>
    </>
  );
}
