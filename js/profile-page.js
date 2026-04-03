import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js";
import { checkAuth } from "./auth-guard.js";
import { logout, updateCurrentUserPassword } from "./auth.js";
import { initAuthNavbar } from "./navbar-auth.js";
import { notifyPasswordChanged } from "./password-notification.js";

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
const updatePhotoPreview = document.getElementById("update-photo-preview");

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
const profileLogoutBtn = document.getElementById("profile-logout-btn");
const accountSettingsTrigger = document.getElementById("account-settings-trigger");
const accountSettingsModal = document.getElementById("account-settings-modal");
const accountSettingsOverlay = document.getElementById("account-settings-overlay");
const accountSettingsClose = document.getElementById("account-settings-close");
const accountSettingsOptions = document.getElementById("account-settings-options");
const profileFormPanel = document.getElementById("profile-form-panel");
const passwordFormPanel = document.getElementById("password-form-panel");
const openProfileUpdateBtn = document.getElementById("open-profile-update");
const openPasswordChangeBtn = document.getElementById("open-password-change");
const profileModalBack = document.getElementById("profile-modal-back");
const passwordModalBack = document.getElementById("password-modal-back");

let currentUser = null;
let pendingPreviewObjectUrl = "";
let persistedProfilePhotoUrl = "";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

function fallbackAvatar(name = "Driver") {
  const safeName = encodeURIComponent(name || "Driver");
  return `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=f8fafc`;
}

function resolvePhotoUrl(user, userData = null) {
  const fromDoc = userData?.profileImage || userData?.photo || "";
  return fromDoc || user?.photoURL || fallbackAvatar(user?.displayName || "Driver");
}

function syncProfilePhotoPreview(src) {
  const nextSrc = src || fallbackAvatar(currentUser?.displayName || "Driver");
  if (profilePhoto) profilePhoto.src = nextSrc;
  if (updatePhotoPreview) updatePhotoPreview.src = nextSrc;
}

function clearObjectPreviewUrl() {
  if (!pendingPreviewObjectUrl) return;
  URL.revokeObjectURL(pendingPreviewObjectUrl);
  pendingPreviewObjectUrl = "";
}

function validateProfileImageFile(file) {
  if (!file) return "";

  if (!file.type || !file.type.startsWith("image/")) {
    return "Please choose a valid image file.";
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return "Image size must be 5MB or less.";
  }

  return "";
}

async function uploadProfileImage(uid, file) {
  const imageRef = ref(storage, `users/${uid}/profile.jpg`);
  await uploadBytes(imageRef, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "public,max-age=3600",
  });
  return getDownloadURL(imageRef);
}

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
  persistedProfilePhotoUrl = resolvePhotoUrl(user);
  syncProfilePhotoPreview(persistedProfilePhotoUrl);

  if (updateNameInput) updateNameInput.value = user.displayName || "";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    profileJoined.textContent = "Joined recently";
    bindFormHandlers();
    return;
  }

  const data = userSnap.data();
  persistedProfilePhotoUrl = resolvePhotoUrl(user, data);
  syncProfilePhotoPreview(persistedProfilePhotoUrl);

  if (updateNameInput && data?.name && !updateNameInput.value) {
    updateNameInput.value = data.name;
  }

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

function setProfileLoading(isLoading, loadingText = "Saving...") {
  if (!profileUpdateSubmit) return;

  if (!profileUpdateSubmit.dataset.defaultText) {
    profileUpdateSubmit.dataset.defaultText = profileUpdateSubmit.textContent;
  }

  profileUpdateSubmit.disabled = isLoading;
  profileUpdateSubmit.textContent = isLoading
    ? loadingText
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

function hideAccountSettingsPanels() {
  accountSettingsOptions?.classList.add("hidden");
  profileFormPanel?.classList.add("hidden");
  passwordFormPanel?.classList.add("hidden");
}

function showAccountOptions() {
  hideAccountSettingsPanels();
  accountSettingsOptions?.classList.remove("hidden");
}

function showProfilePanel() {
  hideAccountSettingsPanels();
  profileFormPanel?.classList.remove("hidden");
}

function showPasswordPanel() {
  hideAccountSettingsPanels();
  passwordFormPanel?.classList.remove("hidden");
}

function openAccountSettingsModal() {
  if (!accountSettingsModal) return;
  showAccountOptions();
  accountSettingsModal.classList.remove("hidden");
  accountSettingsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("overflow-hidden");
}

function closeAccountSettingsModal() {
  if (!accountSettingsModal) return;
  accountSettingsModal.classList.add("hidden");
  accountSettingsModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overflow-hidden");
  showAccountOptions();
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
  const selectedImage = updatePhotoInput?.files?.[0] || null;

  let hasError = false;
  if (!name || name.length < 2) {
    setFieldError(updateNameInput, updateNameError, "Name must be at least 2 characters.");
    hasError = true;
  }

  if (name.length > 80) {
    setFieldError(updateNameInput, updateNameError, "Name cannot exceed 80 characters.");
    hasError = true;
  }

  const imageError = validateProfileImageFile(selectedImage);
  if (imageError) {
    setFieldError(updatePhotoInput, updatePhotoError, imageError);
    hasError = true;
  }

  if (hasError) return;

  setProfileLoading(true, selectedImage ? "Uploading image..." : "Saving...");
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile record is missing. Please sign out and sign in again.");
    }

    const existingData = userSnap.data() || {};

    let photoUrl = user.photoURL || "";
    if (selectedImage) {
      photoUrl = await uploadProfileImage(user.uid, selectedImage);
    }

    const nextPhoto = photoUrl || user.photoURL || "";

    // Keep Firebase Auth profile and Firestore profile in sync.
    await updateProfile(user, {
      displayName: name,
      photoURL: nextPhoto,
    });

    const updates = {
      updatedAt: serverTimestamp(),
    };

    if (name !== (existingData.name || "")) {
      updates.name = name;
      updates.firstName = firstNameFromName(name);
    }

    if ((user.email || "") !== (existingData.email || "")) {
      updates.email = user.email || "";
    }

    if (nextPhoto !== (existingData.photo || "")) {
      updates.photo = nextPhoto;
      updates.profileImage = nextPhoto;
    }

    await updateDoc(userRef, updates);

    profileName.textContent = name;
    persistedProfilePhotoUrl = nextPhoto || fallbackAvatar(name || "Driver");
    syncProfilePhotoPreview(persistedProfilePhotoUrl);

    if (selectedImage && updatePhotoInput) {
      updatePhotoInput.value = "";
      clearObjectPreviewUrl();
    }

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

    let notificationMessage = "Password updated successfully. A confirmation email has been sent.";
    try {
      await notifyPasswordChanged({
        email: auth.currentUser?.email || "",
        source: "profile-password-change",
      });
    } catch (notificationError) {
      console.error("[Password Notification] Failed after in-app password change", notificationError);
      notificationMessage =
        "Password updated successfully, but confirmation email could not be sent right now.";
    }

    passwordForm?.reset();
    setMessage(passwordSuccess, notificationMessage);
  } catch (error) {
    setMessage(passwordError, error?.message || "Unable to change password. Please try again.");
  } finally {
    setPasswordLoading(false);
  }
}

function bindFormHandlers() {
  if (accountSettingsTrigger && accountSettingsTrigger.dataset.bound !== "true") {
    accountSettingsTrigger.dataset.bound = "true";
    accountSettingsTrigger.addEventListener("click", openAccountSettingsModal);
  }

  if (accountSettingsClose && accountSettingsClose.dataset.bound !== "true") {
    accountSettingsClose.dataset.bound = "true";
    accountSettingsClose.addEventListener("click", closeAccountSettingsModal);
  }

  if (accountSettingsOverlay && accountSettingsOverlay.dataset.bound !== "true") {
    accountSettingsOverlay.dataset.bound = "true";
    accountSettingsOverlay.addEventListener("click", closeAccountSettingsModal);
  }

  if (openProfileUpdateBtn && openProfileUpdateBtn.dataset.bound !== "true") {
    openProfileUpdateBtn.dataset.bound = "true";
    openProfileUpdateBtn.addEventListener("click", showProfilePanel);
  }

  if (openPasswordChangeBtn && openPasswordChangeBtn.dataset.bound !== "true") {
    openPasswordChangeBtn.dataset.bound = "true";
    openPasswordChangeBtn.addEventListener("click", showPasswordPanel);
  }

  if (profileModalBack && profileModalBack.dataset.bound !== "true") {
    profileModalBack.dataset.bound = "true";
    profileModalBack.addEventListener("click", showAccountOptions);
  }

  if (passwordModalBack && passwordModalBack.dataset.bound !== "true") {
    passwordModalBack.dataset.bound = "true";
    passwordModalBack.addEventListener("click", showAccountOptions);
  }

  if (accountSettingsModal && accountSettingsModal.dataset.bound !== "true") {
    accountSettingsModal.dataset.bound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !accountSettingsModal.classList.contains("hidden")) {
        closeAccountSettingsModal();
      }
    });
  }

  if (profileUpdateForm && profileUpdateForm.dataset.bound !== "true") {
    profileUpdateForm.dataset.bound = "true";
    profileUpdateForm.addEventListener("submit", handleProfileUpdate);
  }

  if (updatePhotoInput && updatePhotoInput.dataset.bound !== "true") {
    updatePhotoInput.dataset.bound = "true";
    updatePhotoInput.addEventListener("change", () => {
      setFieldError(updatePhotoInput, updatePhotoError, "");
      setMessage(profileUpdateError, "");
      setMessage(profileUpdateSuccess, "");

      const selectedImage = updatePhotoInput.files?.[0] || null;
      if (!selectedImage) {
        clearObjectPreviewUrl();
        syncProfilePhotoPreview(persistedProfilePhotoUrl || resolvePhotoUrl(currentUser));
        return;
      }

      const validationMessage = validateProfileImageFile(selectedImage);
      if (validationMessage) {
        setFieldError(updatePhotoInput, updatePhotoError, validationMessage);
        updatePhotoInput.value = "";
        clearObjectPreviewUrl();
        syncProfilePhotoPreview(persistedProfilePhotoUrl || resolvePhotoUrl(currentUser));
        return;
      }

      clearObjectPreviewUrl();
      pendingPreviewObjectUrl = URL.createObjectURL(selectedImage);
      syncProfilePhotoPreview(pendingPreviewObjectUrl);
    });
  }

  if (passwordForm && passwordForm.dataset.bound !== "true") {
    passwordForm.dataset.bound = "true";
    passwordForm.addEventListener("submit", handlePasswordChange);
  }

  if (profileLogoutBtn && profileLogoutBtn.dataset.bound !== "true") {
    profileLogoutBtn.dataset.bound = "true";
    profileLogoutBtn.addEventListener("click", async () => {
      profileLogoutBtn.disabled = true;
      if (!profileLogoutBtn.dataset.defaultText) {
        profileLogoutBtn.dataset.defaultText = profileLogoutBtn.textContent;
      }
      profileLogoutBtn.textContent = "Logging out...";

      try {
        await logout();
      } catch (error) {
        profileLogoutBtn.disabled = false;
        profileLogoutBtn.textContent = profileLogoutBtn.dataset.defaultText || "Logout";
        alert(error?.message || "Unable to logout right now.");
      }
    });
  }

  if (document.body && document.body.dataset.profileCleanupBound !== "true") {
    document.body.dataset.profileCleanupBound = "true";
    window.addEventListener("beforeunload", clearObjectPreviewUrl);
  }
}

initProfile().catch((error) => {
  alert(error.message || "Unable to load profile.");
});
