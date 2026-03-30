import { requestPasswordReset } from "./auth.js";

const form = document.getElementById("forgot-password-form");
const emailInput = document.getElementById("forgot-email");
const emailError = document.getElementById("forgot-email-error");
const submitBtn = document.getElementById("forgot-submit");
const successBox = document.getElementById("forgot-success");
const errorBox = document.getElementById("forgot-error");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldError(message = "") {
  if (!emailError) return;

  if (!message) {
    emailError.textContent = "";
    emailError.classList.add("hidden");
    emailInput?.setAttribute("aria-invalid", "false");
    return;
  }

  emailError.textContent = message;
  emailError.classList.remove("hidden");
  emailInput?.setAttribute("aria-invalid", "true");
}

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

function setBusy(isBusy) {
  if (!submitBtn) return;

  if (!submitBtn.dataset.defaultText) {
    submitBtn.dataset.defaultText = submitBtn.textContent;
  }

  submitBtn.disabled = isBusy;
  submitBtn.textContent = isBusy ? "Sending..." : submitBtn.dataset.defaultText || "Send Reset Link";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  setFieldError("");
  setMessage(successBox, "");
  setMessage(errorBox, "");

  const email = emailInput?.value?.trim() || "";
  if (!email) {
    setFieldError("Email is required.");
    return;
  }

  if (!isValidEmail(email)) {
    setFieldError("Enter a valid email address.");
    return;
  }

  setBusy(true);
  console.info("[ForgotPassword] Submit started", { email });
  try {
    await requestPasswordReset(email);
    console.info("[ForgotPassword] Reset email request succeeded", { email });
    setMessage(successBox, "Reset link sent. If you don’t see the email, please check Promotions/Spam.");
    form.reset();
  } catch (error) {
    console.error("[ForgotPassword] Reset email request failed", {
      email,
      code: error?.code || null,
      message: error?.message || "Unknown error",
      stack: error?.stack || null,
      raw: error,
    });
    const friendly =
      error?.code === "permission-denied"
        ? "Reset request is temporarily unavailable. Please contact support."
        : error?.message || "Unable to send reset link. Please try again.";
    setMessage(errorBox, friendly);
  } finally {
    setBusy(false);
  }
});
