const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { mountMarketing } = require("./marketing/server/index.ts");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const allowedOrigins = String(
  process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "http://localhost:4173,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const cspConnectSrc = ["'self'", ...allowedOrigins];

app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));

app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "mailto:"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", "data:"],
        styleSrc: ["'self'", (req) => req.path === "/marketing" || req.path.startsWith("/marketing/") ? "'unsafe-inline'" : "'self'"],
        fontSrc: ["'self'"],
        mediaSrc: ["'self'", "blob:"],
        scriptSrc: ["'self'"],
        connectSrc: cspConnectSrc
      }
    }
  })
);

const marketing = mountMarketing(app);
app.use(express.json({ limit: "100kb" }));

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }
  return allowedOrigins.includes(origin);
}

function apiCors(req, res, next) {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
}

const contactRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  limit: Number(process.env.RATE_LIMIT_MAX || 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" }
});

function clean(input, maxLen = 2000) {
  return String(input || "").trim().slice(0, maxLen);
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function validateEnv() {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_TO"];
  const missing = required.filter((name) => !process.env[name]);
  return missing;
}

app.get("/health", (_req, res) => {
  const missing = validateEnv();
  res.status(200).json({ ok: true, smtpConfigured: missing.length === 0, missing });
});

app.options("/api/contact", apiCors);
app.post("/api/contact", apiCors, contactRateLimiter, async (req, res) => {
  const missing = validateEnv();
  if (missing.length > 0) {
    return res.status(500).json({ ok: false, error: "smtp_not_configured", missing });
  }

  const website = clean(req.body?.website, 120);
  if (website) {
    return res.status(200).json({ ok: true });
  }

  const name = clean(req.body?.name, 120);
  const company = clean(req.body?.company, 160);
  const email = clean(req.body?.email, 190);
  const message = clean(req.body?.message, 4000);
  const source = clean(req.body?.source, 80) || "landingpage";
  const createdAt = clean(req.body?.createdAt, 80) || new Date().toISOString();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "missing_required_fields" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "invalid_email" });
  }

  const transporter = createTransporter();

  const subject = `Neue Pilotanfrage: ${name}`;
  const text = [
    `Name: ${name}`,
    `Firma: ${company || "-"}`,
    `E-Mail: ${email}`,
    `Quelle: ${source}`,
    `Zeitpunkt: ${createdAt}`,
    "",
    "Worum geht's?",
    message
  ].join("\n");

  const nameHtml = escapeHtml(name);
  const companyHtml = escapeHtml(company || "-");
  const emailHtml = escapeHtml(email);
  const sourceHtml = escapeHtml(source);
  const createdAtHtml = escapeHtml(createdAt);
  const messageHtml = escapeHtml(message).replace(/\n/g, "<br>");

  const html = `
    <h2>Neue Pilotanfrage</h2>
    <p><strong>Name:</strong> ${nameHtml}</p>
    <p><strong>Firma:</strong> ${companyHtml}</p>
    <p><strong>E-Mail:</strong> ${emailHtml}</p>
    <p><strong>Quelle:</strong> ${sourceHtml}</p>
    <p><strong>Zeitpunkt:</strong> ${createdAtHtml}</p>
    <hr />
    <p><strong>Worum geht's?</strong></p>
    <p>${messageHtml}</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_TO,
      replyTo: email,
      subject,
      text,
      html
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ ok: false, error: "smtp_send_failed" });
  }
});

// Serve only the public website. Backend source, exports and manifests stay private.
app.use("/assets", express.static(path.join(rootDir, "assets"), {
  etag: true, maxAge: "30d", immutable: true, index: false, dotfiles: "deny"
}));
for (const file of ["index.html", "404.html", "impressum.html", "datenschutz.html", "app.js", "content.js", "legal.js", "styles.css", "robots.txt", "sitemap.xml"]) {
  app.get(`/${file}`, (_req, res) => res.sendFile(path.join(rootDir, file), {
    headers: { "Cache-Control": file.endsWith(".html") ? "no-cache" : "public, max-age=3600" }
  }));
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, error: "not_found" });
});

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }

  return res.status(404).sendFile(path.join(rootDir, "404.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.type === "entity.too.large" ? 413 : error.type === "entity.parse.failed" ? 400 : 500;
  res.status(status).json({ message: status === 413 ? "Datei zu groß." : status === 400 ? "Ungültiges JSON." : "Servervorgang fehlgeschlagen." });
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () => {
  process.stdout.write(`Smartwerk running on http://localhost:${port}\n`);
});
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => {
  server.close(() => marketing.close().finally(() => process.exit(0)));
});
