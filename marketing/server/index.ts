import express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import knex from "knex";
import path from "node:path";
import { handle } from "../lib/marketing/http";
import { handleAccounts, handleOauthCallback } from "../lib/marketing/account-http";
import { publicOrigin } from "../lib/marketing/account-provider";
import { dispatchDue } from "../lib/marketing/publishing";
import { refreshAccounts } from "../lib/marketing/accounts";
import { localStorage } from "./storage";
import { adminCredentialVersion, csrf, csrfToken, requireHuman, sessionUser, verifyPassword } from "./auth";
import type { Database } from "../lib/marketing/repository";
import type { MarketingHost, MarketingRequest } from "./host";

export function mountMarketing(app: express.Express) {
  const publicDir = path.join(__dirname, "../dist");
  app.use("/marketing-assets", express.static(publicDir, { index: false, maxAge: "1h" }));
  app.get(["/marketing", "/marketing/calendar", "/marketing/library", "/marketing/design", "/marketing/settings"], (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(path.join(publicDir, "index.html"));
  });
  const required = ["MARKETING_DATABASE_URL", "MARKETING_SESSION_SECRET", "MARKETING_ADMIN_PASSWORD_HASH", "MARKETING_ADMIN_USER", "MARKETING_PUBLIC_URL"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    app.use(["/api/marketing", "/api/marketing-agent", "/custom/marketing-oauth", "/marketing-media"], (_req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.status(503).json({ message: "Marketing-Backend noch nicht eingerichtet.", missing });
    });
    return { close: async () => {} };
  }
  if (process.env.MARKETING_SESSION_SECRET!.length < 32) throw new Error("MARKETING_SESSION_SECRET muss mindestens 32 Zeichen haben.");
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.MARKETING_ADMIN_PASSWORD_HASH!)) throw new Error("MARKETING_ADMIN_PASSWORD_HASH ist ungültig.");
  const origin = publicOrigin();
  const db = knex({ client: "pg", connection: process.env.MARKETING_DATABASE_URL, pool: { min: 0, max: 10 } });
  const storage = localStorage(process.env.MARKETING_MEDIA_DIR || path.join(__dirname, "../var/media"), origin);
  const scope: MarketingHost = { db: db as unknown as Database, storage, logger: { error: message => process.stderr.write(`${message}\n`) } };
  const Store = pgSession(session);
  const store = new Store({ conString: process.env.MARKETING_DATABASE_URL, tableName: "marketing_session", createTableIfMissing: false, errorLog: () => scope.logger.error("Marketing session storage failed") });
  const sessions = session({
    name: "smartwerk_marketing", secret: process.env.MARKETING_SESSION_SECRET!, store,
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), maxAge: 8 * 3600000, path: "/" },
  });
  const human = express.Router();
  human.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
  human.use(sessions, cookieParser(), express.json({ limit: "22mb" }));
  human.get("/session", (req, res) => res.json({ user: sessionUser(req), csrf: csrfToken(req) }));
  human.use(csrf);
  human.post("/login", rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }), async (req, res, next) => {
    try {
      const user = process.env.MARKETING_ADMIN_USER;
      const passwordHash = process.env.MARKETING_ADMIN_PASSWORD_HASH!;
      const credentialVersion = adminCredentialVersion(user, passwordHash);
      const valid = await verifyPassword(req.body?.password, passwordHash);
      if (!valid || !credentialVersion || req.body?.user !== user) return res.status(401).json({ message: "Anmeldung fehlgeschlagen." });
      req.session.regenerate(error => {
        if (error) return next(error);
        req.session.user = user;
        req.session.credentialVersion = credentialVersion;
        const token = csrfToken(req);
        req.session.save(error => error ? next(error) : res.json({ user: req.session.user, csrf: token }));
      });
    } catch (error) { next(error); }
  });
  human.use(requireHuman);
  human.post("/logout", (req, res, next) => req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("smartwerk_marketing", { path: "/" });
    res.json({ ok: true });
  }));
  human.use(rateLimit({ windowMs: 60000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false }));
  human.all("/:resource", async (req, res, next) => {
    if (!["GET", "POST"].includes(req.method)) return res.sendStatus(405);
    const request = Object.assign(req, { scope }) as MarketingRequest;
    try {
      if (["accounts", "boards", "instagram-targets", "linkedin-targets"].includes(req.params.resource)) return await handleAccounts(request, res, req.params.resource);
      await handle(request, res, req.params.resource);
    } catch (error) { next(error); }
  });
  app.use("/api/marketing", human);
  app.use("/custom/marketing-oauth", sessions, cookieParser(), requireHuman);
  app.get("/custom/marketing-oauth/:channel", (req, res, next) => {
    handleOauthCallback(Object.assign(req, { scope }) as MarketingRequest, res).catch(next);
  });
  app.use("/marketing-media", (req, res, next) => {
    if (!/^\/[a-f0-9-]{36}\.(jpeg|png|webp|mp4)$/.test(req.path)) return res.sendStatus(404);
    next();
  }, express.static(process.env.MARKETING_MEDIA_DIR || path.join(__dirname, "../var/media"), { index: false, dotfiles: "deny", maxAge: 0, setHeaders: res => res.setHeader("Cache-Control", "private, no-store") }));
  app.use("/api/marketing-agent", rateLimit({ windowMs: 60000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }), express.json({ limit: "22mb" }));
  app.all("/api/marketing-agent/:resource", (req, res, next) => {
    if (!["GET", "POST"].includes(req.method)) return res.sendStatus(405);
    handle(Object.assign(req, { scope }) as MarketingRequest, res, req.params.resource, true).catch(next);
  });
  let running = false, maintenance = false;
  const publish = async () => {
    if (running) return;
    running = true;
    try { await dispatchDue(scope); } catch { scope.logger.error("Marketing scheduler failed"); } finally { running = false; }
  };
  const maintain = async () => {
    if (maintenance) return;
    maintenance = true;
    try { await refreshAccounts(scope.db); } catch { scope.logger.error("Marketing account maintenance failed"); } finally { maintenance = false; }
  };
  const job = setInterval(publish, 60000); job.unref();
  const upkeep = setInterval(maintain, 3600000); upkeep.unref();
  return { async close() { clearInterval(job); clearInterval(upkeep); await store.close(); await db.destroy(); } };
}
