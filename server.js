const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:4173";

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
});

function clean(input, maxLen = 2000) {
  return String(input || "").trim().slice(0, maxLen);
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

app.post("/api/contact", async (req, res) => {
  const missing = validateEnv();
  if (missing.length > 0) {
    return res.status(500).json({ ok: false, error: "smtp_not_configured", missing });
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

  const html = `
    <h2>Neue Pilotanfrage</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Firma:</strong> ${company || "-"}</p>
    <p><strong>E-Mail:</strong> ${email}</p>
    <p><strong>Quelle:</strong> ${source}</p>
    <p><strong>Zeitpunkt:</strong> ${createdAt}</p>
    <hr />
    <p><strong>Worum geht's?</strong></p>
    <p>${message.replace(/\n/g, "<br>")}</p>
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

app.listen(port, () => {
  process.stdout.write(`SMTP relay running on http://localhost:${port}\n`);
});
