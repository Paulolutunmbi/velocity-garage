const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const outputPath = path.join(rootDir, "js", "env.js");

function parseEnv(content) {
  const result = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    const value = trimmed.slice(equalsAt + 1).trim();
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
const runtime = `window.__ENV = ${JSON.stringify(envVars, null, 2)};\n`;

fs.writeFileSync(outputPath, runtime, "utf8");
console.log(`Generated ${path.relative(rootDir, outputPath)} from .env`);
