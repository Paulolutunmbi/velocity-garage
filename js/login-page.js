import { completeOAuthRedirectSignIn, login, loginWithGoogle, loginWithGithub, onAuthChange } from "./auth.js";

const loginForm = document.getElementById("login-form");
const googleBtn = document.getElementById("google-login-btn");
const githubBtn = document.getElementById("github-login-btn");
const errorBox = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");

const params = new URLSearchParams(window.location.search);
const nextPath = params.get("next") || "home.html";
let authBootstrapped = false;

function authMessage(error, fallback) {
  return error?.message || error?.original?.message || fallback;
}

function setError(message = "") {
  if (!errorBox) return;
  if (!message) {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
    return;
  }

  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function setBusy(isBusy) {
  const buttons = [submitBtn, googleBtn, githubBtn];
  buttons.forEach((btn) => {
    if (!btn) return;
    if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent;
    btn.disabled = isBusy;
  });

  if (isBusy) {
    submitBtn.textContent = "Signing in...";
    googleBtn.textContent = "Connecting...";
    githubBtn.textContent = "Connecting...";
  } else {
    if (submitBtn) submitBtn.textContent = submitBtn.dataset.defaultText || "Login";
    if (googleBtn) googleBtn.textContent = googleBtn.dataset.defaultText || "Continue with Google";
    if (githubBtn) githubBtn.textContent = githubBtn.dataset.defaultText || "Continue with GitHub";
  }
}

onAuthChange((user) => {
  if (!authBootstrapped) return;
  if (user) {
    console.log("✓ User authenticated, redirecting to:", nextPath);
    window.location.href = nextPath;
  }
});

async function initializeAuthFlow() {
  setBusy(true);
  try {
    await completeOAuthRedirectSignIn();
  } catch (error) {
    console.error("✗ Redirect auth error:", error);
    setError(authMessage(error, "Unable to complete sign-in redirect."));
  } finally {
    authBootstrapped = true;
    setBusy(false);
  }
}

initializeAuthFlow();

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  console.log("📝 Attempting email login...");

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || !password) {
    setError("Enter your email and password.");
    return;
  }

  setBusy(true);
  try {
    console.log("🔐 Logging in as:", email);
    await login({ email, password });
    console.log("✓ Login successful!");
  } catch (error) {
    console.error("✗ Login error:", error);
    setError(authMessage(error, "Unable to sign in."));
    setBusy(false);
  }
});

googleBtn?.addEventListener("click", async () => {
  setError("");
  console.log("🔐 Starting Google login...");
  setBusy(true);
  try {
    await loginWithGoogle();
    console.log("✓ Google login successful!");
  } catch (error) {
    console.error("✗ Google login error:", error);
    setError(authMessage(error, "Google login failed."));
    setBusy(false);
  }
});

githubBtn?.addEventListener("click", async () => {
  setError("");
  console.log("🔐 Starting GitHub login...");
  setBusy(true);
  try {
    await loginWithGithub();
    console.log("✓ GitHub login successful!");
  } catch (error) {
    console.error("✗ GitHub login error:", error);
    setError(authMessage(error, "GitHub login failed."));
    setBusy(false);
  }
});
