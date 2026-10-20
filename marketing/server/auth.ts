import { scrypt as nodeScrypt, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { publicOrigin } from "../lib/marketing/account-provider";

declare module "express-session" {
  interface SessionData { user?: string; csrf?: string; credentialVersion?: string }
}
const scrypt = promisify(nodeScrypt);
export function adminCredentialVersion(
  user = process.env.MARKETING_ADMIN_USER,
  passwordHash = process.env.MARKETING_ADMIN_PASSWORD_HASH,
) {
  const secret = process.env.MARKETING_SESSION_SECRET;
  if (!user || !passwordHash || !secret) return undefined;
  return createHmac("sha256", secret).update(JSON.stringify([user, passwordHash])).digest("hex");
}
export function sessionUser(req: Request) {
  const version = adminCredentialVersion();
  if (version && req.session?.user === process.env.MARKETING_ADMIN_USER &&
      req.session.credentialVersion === version) return req.session.user;
  // Legacy sessions and sessions issued for previous credentials become anonymous.
  if (req.session?.user || req.session?.credentialVersion) {
    delete req.session.user;
    delete req.session.credentialVersion;
    delete req.session.csrf;
  }
  return null;
}
export async function verifyPassword(password: unknown, encoded: string) {
  if (typeof password !== "string" || password.length > 256) return false;
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  const actual = await scrypt(password, match[1], 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}
export function csrf(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  const token = req.headers["x-csrf-token"];
  if ((origin && origin !== publicOrigin()) || !req.session.csrf || typeof token !== "string" || token !== req.session.csrf) {
    return res.status(403).json({ message: "Sicherheitsprüfung fehlgeschlagen. Seite neu laden." });
  }
  next();
}
export function csrfToken(req: Request) { return req.session.csrf ||= randomBytes(32).toString("hex"); }
export function requireHuman(req: Request, res: Response, next: NextFunction) {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ message: "Bitte persönlich anmelden." });
  Object.assign(req, { auth_context: { actor_type: "user", actor_id: user, auth_identity_id: "password-session" } });
  next();
}
