import {
  confirmPasswordReset,
  getAuth,
  verifyPasswordResetCode,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("reset-password-form");
const newPasswordInput = document.getElementById("reset-new-password");
const confirmPasswordInput = document.getElementById("reset-confirm-password");
const newPasswordError = document.getElementById("reset-new-password-error");
const confirmPasswordError = document.getElementById("reset-confirm-password-error");
const submitBtn = document.getElementById("reset-submit");
const successBox = document.getElementById("reset-success");
const errorBox = document.getElementById("reset-error");

const auth = getAuth();

function setMessage(target, message = "") {
  if (!target) return;
  if (!message) {
    target.textContent = "";
    target.classList.add("hidden");
    return;
  }

  target.textContent = message;
  target.classList.remove("hidden");
}

function setFieldError(input, errorNode, message = "") {
  if (!input || !errorNode) return;

  if (!message) {
    errorNode.textContent = "";
    errorNode.classList.add("hidden");
    input.setAttribute("aria-invalid", "false");
    return;
  }

  errorNode.textContent = message;
  errorNode.classList.remove("hidden");
  input.setAttribute("aria-invalid", "true");
}

function setBusy(isBusy) {
  if (!submitBtn) return;

  if (!submitBtn.dataset.defaultText) {
    submitBtn.dataset.defaultText = submitBtn.textContent;
  }

  submitBtn.disabled = isBusy;
  submitBtn.textContent = isBusy ? "Updating..." : submitBtn.dataset.defaultText || "Update Password";
}

function parseActionParams() {
  const params = new URLSearchParams(window.location.search);
  let mode = params.get("mode") || "";
  let oobCode = params.get("oobCode") || "";

  // Some providers include mode/oobCode inside a nested link param.
  if ((!mode || !oobCode) && params.get("link")) {
    try {
      const nested = new URL(params.get("link"));
      mode = mode || nested.searchParams.get("mode") || "";
      oobCode = oobCode || nested.searchParams.get("oobCode") || "";
    } catch {
      // Ignore malformed nested link.
    }
  }

  if ((!mode || !oobCode) && params.get("continueUrl")) {
    try {
      const nested = new URL(params.get("continueUrl"));
      mode = mode || nested.searchParams.get("mode") || "";
      oobCode = oobCode || nested.searchParams.get("oobCode") || "";
    } catch {
      // Ignore malformed continue URL.
    }
  }

  return { mode, oobCode };
}

async function validateResetCode(oobCode) {
  try {
    await verifyPasswordResetCode(auth, oobCode);
    return true;
  } catch {
    setMessage(errorBox, "This reset link is invalid or expired. Request a new link.");
    if (form) form.classList.add("hidden");
    return false;
  }
}

function clearMessages() {
  setMessage(errorBox, "");
  setMessage(successBox, "");
  setFieldError(newPasswordInput, newPasswordError, "");
  setFieldError(confirmPasswordInput, confirmPasswordError, "");
}

const action = parseActionParams();
if (!new Set(["resetPassword", "action"]).has(action.mode) || !action.oobCode) {
  setMessage(errorBox, "Invalid password reset link. Please request a new one.");
  if (form) form.classList.add("hidden");
} else {
  validateResetCode(action.oobCode);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const newPassword = newPasswordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";

  let hasError = false;
  if (!newPassword || newPassword.length < 6) {
    setFieldError(newPasswordInput, newPasswordError, "Password must be at least 6 characters.");
    hasError = true;
  }

  if (confirmPassword !== newPassword) {
    setFieldError(confirmPasswordInput, confirmPasswordError, "Passwords do not match.");
    hasError = true;
  }

  if (hasError) return;

  setBusy(true);
  try {
    await confirmPasswordReset(auth, action.oobCode, newPassword);
    setMessage(successBox, "Password reset successful. Redirecting to login...");
    form.reset();

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  } catch (error) {
    const friendly =
      error?.code === "auth/expired-action-code" || error?.code === "auth/invalid-action-code"
        ? "This reset link is invalid or expired. Request a new link."
        : error?.message || "Unable to reset password. Please try again.";

    setMessage(errorBox, friendly);
  } finally {
    setBusy(false);
  }
});
