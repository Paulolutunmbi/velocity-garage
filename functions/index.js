const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

let cachedTransporter = null;

function asBool(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function sanitizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeSource(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "unknown";
  if (raw === "password-reset") return "password-reset";
  if (raw === "profile-password-change") return "profile-password-change";
  return "unknown";
}

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new HttpsError("failed-precondition", `Missing required server env: ${name}`);
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port: Number(requireEnv("SMTP_PORT")),
    secure: asBool(process.env.SMTP_SECURE),
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASS"),
    },
  });

  return cachedTransporter;
}

function passwordChangedEmailBody({ source }) {
  const sourceLabel =
    source === "password-reset"
      ? "through the password reset flow"
      : source === "profile-password-change"
      ? "from your profile settings"
      : "from your account";

  return {
    subject: "Your password has been changed",
    text: [
      "Hello,",
      "",
      `Your Velocity Garage password was changed ${sourceLabel}.`,
      "If this was not you, reset your password immediately and contact support.",
      "",
      "- Velocity Garage",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">Your password has been changed</h2>
        <p>Your Velocity Garage password was changed ${sourceLabel}.</p>
        <p>If this was not you, reset your password immediately and contact support.</p>
        <p style="margin-top:24px;color:#555;">- Velocity Garage</p>
      </div>
    `,
  };
}

exports.sendPasswordChangedEmail = onCall(
  {
    cors: true,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    const authEmail = sanitizeEmail(request.auth?.token?.email || "");
    const requestedEmail = sanitizeEmail(request.data?.email || "");
    const source = sanitizeSource(request.data?.source);

    const recipientEmail = authEmail || requestedEmail;
    if (!recipientEmail) {
      throw new HttpsError("invalid-argument", "Email is required to send password change confirmation.");
    }

    if (!authEmail) {
      try {
        await admin.auth().getUserByEmail(recipientEmail);
      } catch {
        throw new HttpsError("not-found", "No account found for this email.");
      }
    }

    const transporter = getTransporter();
    const from = process.env.SMTP_FROM?.trim() || requireEnv("SMTP_USER");
    const body = passwordChangedEmailBody({ source });

    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: body.subject,
      text: body.text,
      html: body.html,
    });

    return {
      ok: true,
      source,
      email: recipientEmail,
    };
  }
);
