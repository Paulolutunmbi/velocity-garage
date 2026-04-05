import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// In build environments (for example Vercel), FIREBASE_* values can be injected
// via process.env. In the browser, values are provided by /env.js as window.__ENV.
const processEnv = typeof process !== "undefined" && process?.env ? process.env : {};
const runtimeEnv = typeof window !== "undefined" ? window.__ENV || {} : {};

function getEnvValue(name, fallback = "") {
  const value = processEnv[name] || runtimeEnv[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function requireEnvValue(name) {
  const value = getEnvValue(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeDomain(domain) {
  return domain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
}

function parseCsvEnv(name) {
  const raw = getEnvValue(name);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => normalizeDomain(item))
    .filter(Boolean);
}

// Shared admin identity for access checks.
export const ADMIN_EMAIL = getEnvValue("FIREBASE_ADMIN_EMAIL", "oluwatunmbipaul@gmail.com");

const firebaseConfig = {
  apiKey: requireEnvValue("FIREBASE_API_KEY"),
  authDomain: normalizeDomain(requireEnvValue("FIREBASE_AUTH_DOMAIN")),
  projectId: requireEnvValue("FIREBASE_PROJECT_ID"),
  storageBucket: requireEnvValue("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnvValue("FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnvValue("FIREBASE_APP_ID")
};

const expectedDomains = parseCsvEnv("FIREBASE_EXPECTED_AUTH_DOMAINS");
const currentHost = typeof window !== "undefined" ? normalizeDomain(window.location.hostname) : "";

if (typeof window !== "undefined") {
  const hints = [firebaseConfig.authDomain, "localhost", "127.0.0.1", ...expectedDomains].filter(Boolean);
  const uniqueHints = Array.from(new Set(hints));
  if (currentHost && !uniqueHints.includes(currentHost)) {
    console.warn(
      "[Firebase Auth] Current hostname is not listed in expected auth domains:",
      currentHost,
      "Expected one of:",
      uniqueHints.join(", ")
    );
  }
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });