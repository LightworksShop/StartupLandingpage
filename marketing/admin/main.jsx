import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, useLocation, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MarketingWorkspace from "./components/marketing/workspace";
import { sessionRequest } from "./session";
import "./shell.css";

const client = new QueryClient();
function App() {
  const [session, setSession] = useState(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation(), [params] = useSearchParams();
  const load = () => sessionRequest("session").then(setSession).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const expired = () => { client.clear(); setSession({ user: null }); setError("Sitzung abgelaufen. Bitte erneut anmelden."); };
    window.addEventListener("marketing-session-expired", expired);
    return () => window.removeEventListener("marketing-session-expired", expired);
  }, []);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      await sessionRequest("session");
      setSession(await sessionRequest("login", { user: data.get("user"), password: data.get("password") }));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!session?.user) return <main className="marketing-login">
    <a href="/" className="marketing-brand">SMARTWERK<span>Marketing</span></a>
    <h1>Inhalte planen. Wirkung zeigen.</h1>
    <p>Meldet euch an, um Beiträge, Medien und LinkedIn-Anbindungen zu verwalten.</p>
    {error && <p role="alert">{error}</p>}
    {session ? <form onSubmit={login}>
      <label>Benutzername<input name="user" autoComplete="username" required /></label>
      <label>Passwort<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>{busy ? "Anmeldung läuft …" : "Anmelden"}</button>
    </form> : <button onClick={load}>Verbindung erneut prüfen</button>}
    <a href="/">Zur Website</a>
  </main>;
  const path = location.pathname;
  const section = path.endsWith("/library") ? params.get("tab") === "design" ? "design" : "media"
    : path.endsWith("/design") ? "design"
    : path.endsWith("/settings") ? params.get("tab") === "connections" ? "connections" : "planning"
    : params.get("panel") === "history" ? "history" : "calendar";
  return <>
    <header className="marketing-shell">
      <Link className="marketing-brand" to="/marketing/calendar">SMARTWERK<span>Marketing</span></Link>
      <nav aria-label="Hauptnavigation">
        <Link to="/marketing/calendar" aria-current={section === "calendar" ? "page" : undefined}>Kalender</Link>
        <Link to="/marketing/library" aria-current={section === "media" ? "page" : undefined}>Bibliothek</Link>
        <Link to="/marketing/library?tab=design" aria-current={section === "design" ? "page" : undefined}>Gestalter</Link>
        <Link to="/marketing/settings?tab=connections" aria-current={section === "connections" ? "page" : undefined}>Anbindungen</Link>
        <Link to="/marketing/settings" aria-current={section === "planning" ? "page" : undefined}>Einstellungen</Link>
      </nav>
      <button onClick={async () => { try { await sessionRequest("logout", {}); client.clear(); setSession({ user: null }); await load(); } catch (e) { setError(e.message); } }}>Abmelden</button>
    </header>
    {error && <p role="alert" className="marketing-shell-error">{error}</p>}
    <MarketingWorkspace key={section} section={section} />
  </>;
}
createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><BrowserRouter><App /></BrowserRouter></QueryClientProvider>);
