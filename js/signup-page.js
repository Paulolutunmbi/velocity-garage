import { completeOAuthRedirectSignIn, signup, loginWithGoogle, loginWithGithub, onAuthChange } from "./auth.js";

const signupForm = document.getElementById("signup-form");
const googleBtn = document.getElementById("google-signup-btn");
const githubBtn = document.getElementById("github-signup-btn");
const errorBox = document.getElementById("signup-error");
const submitBtn = document.getElementById("signup-submit");

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
    submitBtn.textContent = "Creating account...";
    googleBtn.textContent = "Connecting...";
    githubBtn.textContent = "Connecting...";
  } else {
    if (submitBtn) submitBtn.textContent = submitBtn.dataset.defaultText || "Create Account";
    if (googleBtn) googleBtn.textContent = googleBtn.dataset.defaultText || "Continue with Google";
    if (githubBtn) githubBtn.textContent = githubBtn.dataset.defaultText || "Continue with GitHub";
  }
}

onAuthChange((user) => {
  if (!authBootstrapped) return;
  if (user) {
    console.log("✓ User registered and authenticated, redirecting to:", nextPath);
    window.location.href = nextPath;
  }
});

async function initializeAuthFlow() {
  setBusy(true);
  try {
    await completeOAuthRedirectSignIn();
  } catch (error) {
    console.error("✗ Redirect auth error:", error);
    setError(authMessage(error, "Unable to complete sign-up redirect."));
  } finally {
    authBootstrapped = true;
    setBusy(false);
  }
}

initializeAuthFlow();

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  console.log("📝 Attempting email signup...");

  const name = signupForm.name.value.trim();
  const email = signupForm.email.value.trim();
  const password = signupForm.password.value;
  const confirmPassword = signupForm.confirmPassword.value;

  if (!name || !email || !password || !confirmPassword) {
    setError("Please complete all fields.");
    return;
  }

  if (password.length < 6) {
    setError("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  setBusy(true);
  try {
    console.log("🔐 Signing up:", name, email);
    await signup({ name, email, password });
    console.log("✓ Signup successful!");
  } catch (error) {
    console.error("✗ Signup error:", error);
    setError(authMessage(error, "Unable to create your account."));
    setBusy(false);
  }
});

googleBtn?.addEventListener("click", async () => {
  setError("");
  console.log("🔐 Starting Google signup...");
  setBusy(true);
  try {
    await loginWithGoogle();
    console.log("✓ Google signup successful!");
  } catch (error) {
    console.error("✗ Google signup error:", error);
    setError(authMessage(error, "Google signup failed."));
    setBusy(false);
  }
});

githubBtn?.addEventListener("click", async () => {
  setError("");
  console.log("🔐 Starting GitHub signup...");
  setBusy(true);
  try {
    await loginWithGithub();
    console.log("✓ GitHub signup successful!");
  } catch (error) {
    console.error("✗ GitHub signup error:", error);
    setError(authMessage(error, "GitHub signup failed."));
    setBusy(false);
  }
});
