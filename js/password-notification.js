import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { app } from "./firebase-config.js";

const runtimeEnv = typeof window !== "undefined" ? window.__ENV || {} : {};
const configuredRegion =
  typeof runtimeEnv.FIREBASE_FUNCTIONS_REGION === "string" && runtimeEnv.FIREBASE_FUNCTIONS_REGION.trim()
    ? runtimeEnv.FIREBASE_FUNCTIONS_REGION.trim()
    : undefined;

const functions = configuredRegion ? getFunctions(app, configuredRegion) : getFunctions(app);
const notifyPasswordChangedCallable = httpsCallable(functions, "sendPasswordChangedEmail");

export async function notifyPasswordChanged({ email = "", source = "unknown" } = {}) {
  const payload = {
    email: typeof email === "string" ? email.trim() : "",
    source: typeof source === "string" ? source : "unknown",
  };

  try {
    const result = await notifyPasswordChangedCallable(payload);
    return result?.data || { ok: true };
  } catch (error) {
    const wrapped = new Error("Unable to send password change confirmation email right now.");
    wrapped.code = error?.code || "functions/unknown";
    wrapped.original = error;
    throw wrapped;
  }
}
