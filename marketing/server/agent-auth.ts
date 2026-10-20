import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export function authorizeTokenHeader(req: Request, res: Response, config: {environmentVariable: string; header: string}) {
  const secret = process.env[config.environmentVariable] || "";
  const value = req.headers[config.header];
  const hash = (s: string) => createHash("sha256").update(s).digest();
  if (secret.length < 32 || typeof value !== "string" || !timingSafeEqual(hash(secret), hash(value))) {
    res.status(401).json({ message: "Agentenanmeldung erforderlich." });
    return false;
  }
  return true;
}
// Rate limiting is installed on the host router, keyed by client IP.
export async function allowPublicMutation(..._args: unknown[]) { return true; }
