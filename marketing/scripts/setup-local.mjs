import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import dotenv from "dotenv";

const root = fileURLToPath(new URL("../../", import.meta.url));
const envPath = join(root, ".env");
const original = await readFile(envPath, "utf8").catch(error => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const current = dotenv.parse(original);
const values = { ...current };
const setMissing = (key, value) => { if (!values[key]) values[key] = value; };
setMissing("PORT", "3000");
setMissing("HOST", "127.0.0.1");
setMissing("TRUST_PROXY_HOPS", "0");
setMissing("MARKETING_DB_PORT", "55432");
if (!/^\d+$/.test(values.MARKETING_DB_PORT) || Number(values.MARKETING_DB_PORT) < 1024 || Number(values.MARKETING_DB_PORT) > 65535) throw new Error("Ungültiger lokaler Datenbankport.");
setMissing("MARKETING_DB_PASSWORD", randomBytes(32).toString("base64url"));
setMissing("MARKETING_DATABASE_URL", `postgresql://smartwerk:${encodeURIComponent(values.MARKETING_DB_PASSWORD)}@127.0.0.1:${values.MARKETING_DB_PORT}/smartwerk_marketing`);
setMissing("MARKETING_PUBLIC_URL", `http://localhost:${values.PORT}`);
setMissing("MARKETING_ADMIN_USER", "admin");
setMissing("MARKETING_SESSION_SECRET", randomBytes(48).toString("base64url"));
setMissing("MARKETING_CREDENTIALS_KEY", randomBytes(32).toString("base64"));
setMissing("MARKETING_AGENT_TOKEN", randomBytes(48).toString("base64url"));
setMissing("MARKETING_PUBLISH_ENABLED", "false");
setMissing("MARKETING_FEEDS_ENABLED", "false");
setMissing("MARKETING_LINKEDIN_API_VERSION", "202608");
setMissing("MARKETING_LINKEDIN_AUTHOR_TYPE", "both");
const privateDir = join(root, "marketing/var");
await mkdir(privateDir, { recursive: true, mode: 0o700 });
await chmod(privateDir, 0o700);
let createdPassword = false;
if (!values.MARKETING_ADMIN_PASSWORD_HASH) {
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  values.MARKETING_ADMIN_PASSWORD_HASH = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  await writeFile(join(privateDir, "local-access.txt"), [
    "Smartwerk – lokaler Adminzugang", `Adresse: ${values.MARKETING_PUBLIC_URL}/marketing`,
    `Benutzer: ${values.MARKETING_ADMIN_USER}`, `Passwort: ${password}`, "",
    "Nur für die lokale Entwicklung. Nicht weitergeben oder in Git aufnehmen.", "",
  ].join("\n"), { flag: "wx", mode: 0o600 });
  createdPassword = true;
}
const changes = Object.entries(values).filter(([key, value]) => current[key] !== value);
if (changes.length) {
  // Replace only managed empty values. Preserve all other settings and comments.
  let next = original;
  const appended = [];
  for (const [key, value] of changes) {
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, "gm");
    if (pattern.test(next)) next = next.replace(pattern, () => line);
    else appended.push(line);
  }
  if (appended.length) next = `${next.trimEnd()}\n\n# Local marketing backend\n${appended.join("\n")}\n`;
  await writeFile(envPath, next, { mode: 0o600 });
}
await chmod(envPath, 0o600);
process.stdout.write("Lokale Marketing-Konfiguration eingerichtet. Bestehende Werte wurden erhalten.\n");
if (createdPassword) process.stdout.write("Admin-Zugangsdaten: marketing/var/local-access.txt (nur für euren Benutzer lesbar).\n");
process.stdout.write("Datenbank starten: npm run db:up\nMigrationen: npm run db:migrate\nServer: npm start\n");
