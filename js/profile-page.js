import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { checkAuth } from "./auth-guard.js";
import { updateCurrentUserPassword } from "./auth.js";
import { initAuthNavbar } from "./navbar-auth.js";

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profilePhoto = document.getElementById("profile-photo");
const profileJoined = document.getElementById("profile-joined");

const profileUpdateForm = document.getElementById("profile-update-form");
const updateNameInput = document.getElementById("update-name");
const updatePhotoInput = document.getElementById("update-photo");
const profileUpdateSubmit = document.getElementById("profile-update-submit");
const profileUpdateSuccess = document.getElementById("profile-update-success");
const profileUpdateError = document.getElementById("profile-update-error");
const updateNameError = document.getElementById("update-name-error");
const updatePhotoError = document.getElementById("update-photo-error");

const passwordForm = document.getElementById("password-change-form");
const currentPasswordInput = document.getElementById("current-password");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const passwordSubmit = document.getElementById("password-change-submit");
const passwordSuccess = document.getElementById("password-change-success");
const passwordError = document.getElementById("password-change-error");
const currentPasswordError = document.getElementById("current-password-error");
const newPasswordError = document.getElementById("new-password-error");
const confirmPasswordError = document.getElementById("confirm-password-error");

let currentUser = null;

function formatJoinDate(value) {
  if (!value) return "Joined recently";

  const rawDate = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(rawDate.getTime())) return "Joined recently";

  const diffMs = Date.now() - rawDate.getTime();
  if (diffMs < 0) return "Joined recently";

  const day = 24 * 60 * 60 * 1000;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < day) return "Joined today";

  if (diffMs >= year) {
    const years = Math.floor(diffMs / year);
    return `Joined ${years} year${years > 1 ? "s" : ""} ago`;
  }

  if (diffMs >= month) {
    const months = Math.floor(diffMs / month);
    return `Joined ${months} month${months > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(diffMs / day);
  return `Joined ${days} day${days > 1 ? "s" : ""} ago`;
}

async function initProfile() {
  const user = await checkAuth();
  currentUser = user;
  initAuthNavbar();
  window.vgUserStore?.bindThemeToggle?.();

  profileName.textContent = user.displayName || "Velocity Driver";
  profileEmail.textContent = user.email || "No email";
  profilePhoto.src = user.photoURL || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";

  if (updateNameInput) updateNameInput.value = user.displayName || "";
  if (updatePhotoInput) updatePhotoInput.value = user.photoURL || "";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    profileJoined.textContent = "Joined recently";
    bindFormHandlers();
    return;
  }

  const data = userSnap.data();
  if (updateNameInput && data?.name && !updateNameInput.value) updateNameInput.value = data.name;
  if (updatePhotoInput && data?.photo && !updatePhotoInput.value) updatePhotoInput.value = data.photo;
  profileJoined.textContent = formatJoinDate(data.createdAt);
  bindFormHandlers();
}

function setMessage(element, message = "") {
  if (!element) return;
  if (!message) {
    element.textContent = "";
    element.classList.add("hidden");
    return;
  }

  element.textContent = message;
  element.classList.remove("hidden");
}

function setFieldError(input, errorNode, message = "") {
  if (!errorNode || !input) return;
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

function setProfileLoading(isLoading) {
  if (!profileUpdateSubmit) return;

  if (!profileUpdateSubmit.dataset.defaultText) {
    profileUpdateSubmit.dataset.defaultText = profileUpdateSubmit.textContent;
  }

  profileUpdateSubmit.disabled = isLoading;
  profileUpdateSubmit.textContent = isLoading
    ? "Saving..."
    : profileUpdateSubmit.dataset.defaultText || "Save Profile";
}

function setPasswordLoading(isLoading) {
  if (!passwordSubmit) return;

  if (!passwordSubmit.dataset.defaultText) {
    passwordSubmit.dataset.defaultText = passwordSubmit.textContent;
  }

  passwordSubmit.disabled = isLoading;
  passwordSubmit.textContent = isLoading
    ? "Updating..."
    : passwordSubmit.dataset.defaultText || "Update Password";
}

function isValidImageUrl(value) {
  if (!value) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function firstNameFromName(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "Driver";
  return trimmed.split(/\s+/)[0];
}

function clearProfileErrors() {
  setFieldError(updateNameInput, updateNameError, "");
  setFieldError(updatePhotoInput, updatePhotoError, "");
  setMessage(profileUpdateError, "");
  setMessage(profileUpdateSuccess, "");
}

function clearPasswordErrors() {
  setFieldError(currentPasswordInput, currentPasswordError, "");
  setFieldError(newPasswordInput, newPasswordError, "");
  setFieldError(confirmPasswordInput, confirmPasswordError, "");
  setMessage(passwordError, "");
  setMessage(passwordSuccess, "");
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  clearProfileErrors();

  const user = auth.currentUser;
  if (!user?.uid || !currentUser?.uid || user.uid !== currentUser.uid) {
    setMessage(profileUpdateError, "Session expired. Please log in again.");
    return;
  }

  const name = (updateNameInput?.value || "").trim();
  const photo = (updatePhotoInput?.value || "").trim();

  let hasError = false;
  if (!name || name.length < 2) {
    setFieldError(updateNameInput, updateNameError, "Name must be at least 2 characters.");
    hasError = true;
  }

  if (name.length > 80) {
    setFieldError(updateNameInput, updateNameError, "Name cannot exceed 80 characters.");
    hasError = true;
  }

  if (!isValidImageUrl(photo)) {
    setFieldError(updatePhotoInput, updatePhotoError, "Profile image must be a valid http/https URL.");
    hasError = true;
  }

  if (hasError) return;

  setProfileLoading(true);
  try {
    // Keep Firebase Auth profile and Firestore profile in sync.
    await updateProfile(user, {
      displayName: name,
      photoURL: photo || user.photoURL || "",
    });

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name,
        firstName: firstNameFromName(name),
        email: user.email || "",
        photo: photo || user.photoURL || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    profileName.textContent = name;
    profilePhoto.src = photo || user.photoURL || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";
    setMessage(profileUpdateSuccess, "Profile updated successfully.");
  } catch (error) {
    setMessage(profileUpdateError, error?.message || "Unable to update profile. Please try again.");
  } finally {
    setProfileLoading(false);
  }
}

async function handlePasswordChange(event) {
  event.preventDefault();
  clearPasswordErrors();

  const currentPassword = currentPasswordInput?.value || "";
  const newPassword = newPasswordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";

  let hasError = false;
  if (!currentPassword) {
    setFieldError(currentPasswordInput, currentPasswordError, "Current password is required.");
    hasError = true;
  }

  if (!newPassword || newPassword.length < 6) {
    setFieldError(newPasswordInput, newPasswordError, "New password must be at least 6 characters.");
    hasError = true;
  }

  if (confirmPassword !== newPassword) {
    setFieldError(confirmPasswordInput, confirmPasswordError, "Passwords do not match.");
    hasError = true;
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    setFieldError(newPasswordInput, newPasswordError, "New password must be different from current password.");
    hasError = true;
  }

  if (hasError) return;

  setPasswordLoading(true);
  try {
    // Helper enforces re-authentication before password update.
    await updateCurrentUserPassword({ currentPassword, newPassword });
    passwordForm?.reset();
    setMessage(passwordSuccess, "Password updated successfully.");
  } catch (error) {
    setMessage(passwordError, error?.message || "Unable to change password. Please try again.");
  } finally {
    setPasswordLoading(false);
  }
}

function bindFormHandlers() {
  if (profileUpdateForm && profileUpdateForm.dataset.bound !== "true") {
    profileUpdateForm.dataset.bound = "true";
    profileUpdateForm.addEventListener("submit", handleProfileUpdate);
  }

  if (passwordForm && passwordForm.dataset.bound !== "true") {
    passwordForm.dataset.bound = "true";
    passwordForm.addEventListener("submit", handlePasswordChange);
  }
}

initProfile().catch((error) => {
  alert(error.message || "Unable to load profile.");
});
