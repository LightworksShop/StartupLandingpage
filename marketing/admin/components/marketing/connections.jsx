import React, { useState } from "react";
import AccountControls from "./account-controls";
import { Platform, platformNames } from "./common";
import { request } from "./data";

function LinkedinTarget({ account, onAction }) {
  const [targets, setTargets] = useState([]), [selected, setSelected] = useState(account.target_id || "");
  const [error, setError] = useState(""), [loading, setLoading] = useState(false);
  return <section className="mk-panel">
    <h3>Veröffentlichungsziel</h3>
    <p>Aktuelles Ziel: <strong>{account.target_id || "Noch kein Ziel"}</strong></p>
    <p>Wählt euer persönliches Profil oder eine Unternehmensseite. Nach einem Wechsel müssen wartende Beiträge erneut freigegeben werden.</p>
    <button disabled={loading} onClick={async () => {
      setLoading(true); setError("");
      try { setTargets((await request("linkedin-targets")).targets); }
      catch (e) { setError(e.message); } finally { setLoading(false); }
    }}>{loading ? "Ziele werden geprüft …" : "Verfügbare Ziele laden"}</button>
    {error && <p role="alert">{error}</p>}
    {!!targets.length && <>
      <label>LinkedIn-Profil oder Unternehmensseite<select value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">Ziel auswählen</option>
        {targets.map(target => <option key={target.id} value={target.id}>{target.name}</option>)}
      </select></label>
      <button disabled={!selected || selected === account.target_id} onClick={() => onAction("linkedin", "linkedin_target", { target_id: selected })}>Ziel speichern</button>
    </>}
  </section>;
}
export default function Connections({ accounts = {}, onAccountAction, loadBoards, loadInstagramAccounts }) {
  const [selected, setSelected] = useState("linkedin");
  const account = accounts[selected] || {};
  return <>
    <p>Verbindet eure Konten und legt fest, wohin freigegebene Beiträge veröffentlicht werden.</p>
    <div className="mk-tabs" aria-label="Plattform auswählen">
      {["linkedin", "instagram", "pinterest"].map(channel => <button key={channel} aria-pressed={selected === channel} onClick={() => setSelected(channel)}><Platform channel={channel} small /> {platformNames[channel]}</button>)}
    </div>
    <section className="mk-panel">
      <h2>{platformNames[selected]}</h2>
      {selected === "linkedin" && <p>Text mit einem JPEG- oder PNG-Bild. Persönliches Profil und Unternehmensseiten benötigen die jeweils passenden App-Berechtigungen. Abgelaufene Zugänge werden erneut verbunden.</p>}
      <AccountControls key={selected} channel={selected} account={account} onAction={onAccountAction} loadBoards={loadBoards} loadInstagramAccounts={loadInstagramAccounts} />
      {selected === "linkedin" && account.state === "connected" && <LinkedinTarget key={account.target_id} account={account} onAction={onAccountAction} />}
    </section>
  </>;
}
