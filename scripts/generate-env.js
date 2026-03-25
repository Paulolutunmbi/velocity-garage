const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const outputPath = path.join(rootDir, "js", "env.js");

const REQUIRED_KEYS = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_APP_ID",
];

function stripWrappingQuotes(value) {
  if (!value) return value;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnv(content) {
  const result = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    const value = stripWrappingQuotes(trimmed.slice(equalsAt + 1).trim());
    if (!key) continue;

    result[key] = value;
  }

  return result;
}

if (!fs.existsSync(envPath)) {
  console.error("Missing .env file. Create it first.");
  process.exit(1);
}

const envText = fs.readFileSync(envPath, "utf8");
const envVars = parseEnv(envText);

const missingKeys = REQUIRED_KEYS.filter((key) => !envVars[key]);
if (missingKeys.length > 0) {
  console.error(`Missing required Firebase key(s) in .env: ${missingKeys.join(", ")}`);
  process.exit(1);
}

const runtime = `window.__ENV = ${JSON.stringify(envVars, null, 2)};\n`;

fs.writeFileSync(outputPath, runtime, "utf8");
console.log(`Generated ${path.relative(rootDir, outputPath)} from .env`);
