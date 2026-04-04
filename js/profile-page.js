const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

const localState = window.vgUserStore?.getLocalState?.() || {
  favorites: [],
  wishlist: [],
  compare: [],
  darkMode: true,
};

const state = {
  favorites: new Set(localState.favorites || []),
  wishlist: new Set(localState.wishlist || []),
  compare: new Set(localState.compare || []),
  currentUser: null,
  pendingPreviewObjectUrl: "",
  persistedProfilePhotoUrl: "",
  modules: null,
};

const elements = {
  profileName: document.getElementById("profile-name"),
  profileId: document.getElementById("profile-id"),
  profileEmail: document.getElementById("profile-email"),
  profilePhoto: document.getElementById("profile-photo"),
  profileJoined: document.getElementById("profile-joined"),
  profileFavoritesCount: document.getElementById("profile-favorites-count"),
  profileWishlistCount: document.getElementById("profile-wishlist-count"),
  profileCompareCount: document.getElementById("profile-compare-count"),
  profileGarageHighlight: document.getElementById("profile-garage-highlight"),

  profileUpdateForm: document.getElementById("profile-update-form"),
  updateNameInput: document.getElementById("update-name"),
  updatePhotoInput: document.getElementById("update-photo"),
  profileUpdateSubmit: document.getElementById("profile-update-submit"),
  profileUpdateSuccess: document.getElementById("profile-update-success"),
  profileUpdateError: document.getElementById("profile-update-error"),
  updateNameError: document.getElementById("update-name-error"),
  updatePhotoError: document.getElementById("update-photo-error"),
  updatePhotoPreview: document.getElementById("update-photo-preview"),

  passwordForm: document.getElementById("password-change-form"),
  currentPasswordInput: document.getElementById("current-password"),
  newPasswordInput: document.getElementById("new-password"),
  confirmPasswordInput: document.getElementById("confirm-password"),
  passwordSubmit: document.getElementById("password-change-submit"),
  passwordSuccess: document.getElementById("password-change-success"),
  passwordError: document.getElementById("password-change-error"),
  currentPasswordError: document.getElementById("current-password-error"),
  newPasswordError: document.getElementById("new-password-error"),
  confirmPasswordError: document.getElementById("confirm-password-error"),

  profileLogoutBtn: document.getElementById("profile-logout-btn"),
  accountSettingsTrigger: document.getElementById("account-settings-trigger"),
  accountSettingsModal: document.getElementById("account-settings-modal"),
  accountSettingsOverlay: document.getElementById("account-settings-overlay"),
  accountSettingsClose: document.getElementById("account-settings-close"),
  accountSettingsOptions: document.getElementById("account-settings-options"),
  profileFormPanel: document.getElementById("profile-form-panel"),
  passwordFormPanel: document.getElementById("password-form-panel"),
  openProfileUpdateBtn: document.getElementById("open-profile-update"),
  openPasswordChangeBtn: document.getElementById("open-password-change"),
  profileModalBack: document.getElementById("profile-modal-back"),
  passwordModalBack: document.getElementById("password-modal-back"),
  pageLoading: document.getElementById("page-loading"),
  notification: document.getElementById("notification"),
};

let notificationTimer = null;

function fallbackAvatar(name = "Driver") {
  const safeName = encodeURIComponent(name || "Driver");
  return `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=f8fafc`;
}

function resolvePhotoUrl(user, userData = null) {
  const fromDoc = userData?.profileImage || userData?.photo || "";
  return fromDoc || user?.photoURL || fallbackAvatar(user?.displayName || "Driver");
}

function syncProfilePhotoPreview(src) {
  const nextSrc = src || fallbackAvatar(state.currentUser?.displayName || "Driver");
  if (elements.profilePhoto) elements.profilePhoto.src = nextSrc;
  if (elements.updatePhotoPreview) elements.updatePhotoPreview.src = nextSrc;
}

function clearObjectPreviewUrl() {
  if (!state.pendingPreviewObjectUrl) return;
  URL.revokeObjectURL(state.pendingPreviewObjectUrl);
  state.pendingPreviewObjectUrl = "";
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

function showNotification(message, tone = "default") {
  if (!elements.notification) return;

  elements.notification.textContent = message;
  elements.notification.classList.remove("hidden");
  elements.notification.classList.remove("border-red-500/60", "border-emerald-500/60", "text-red-200", "text-emerald-200");

  if (tone === "success") {
    elements.notification.classList.add("border-emerald-500/60", "text-emerald-200");
  } else if (tone === "error") {
    elements.notification.classList.add("border-red-500/60", "text-red-200");
  }

  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    elements.notification?.classList.add("hidden");
  }, 1900);
}

function setProfileLoading(isLoading, loadingText = "Saving...") {
  if (!elements.profileUpdateSubmit) return;

  if (!elements.profileUpdateSubmit.dataset.defaultText) {
    elements.profileUpdateSubmit.dataset.defaultText = elements.profileUpdateSubmit.textContent;
  }

  elements.profileUpdateSubmit.disabled = isLoading;
  elements.profileUpdateSubmit.textContent = isLoading
    ? loadingText
    : elements.profileUpdateSubmit.dataset.defaultText || "Save Changes";
}

function setPasswordLoading(isLoading) {
  if (!elements.passwordSubmit) return;

  if (!elements.passwordSubmit.dataset.defaultText) {
    elements.passwordSubmit.dataset.defaultText = elements.passwordSubmit.textContent;
  }

  elements.passwordSubmit.disabled = isLoading;
  elements.passwordSubmit.textContent = isLoading
    ? "Updating..."
    : elements.passwordSubmit.dataset.defaultText || "Save Changes";
}

function formatMemberSince(value) {
  if (!value) return "MEMBER SINCE RECENTLY";

  const rawDate = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(rawDate.getTime())) return "MEMBER SINCE RECENTLY";

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  });

  return `MEMBER SINCE ${formatter.format(rawDate).toUpperCase()}`;
}

function shortUserId(uid = "") {
  if (!uid) return "VEL-0000-000";
  const clean = uid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `VEL-${clean.slice(0, 4) || "0000"}-${clean.slice(4, 8) || "000"}`;
}

function syncSetsFromRemote(remote = {}) {
  state.favorites = new Set(remote.favorites || []);
  state.wishlist = new Set(remote.wishlist || []);
  state.compare = new Set(remote.compare || []);
  renderGarageMetrics();
}

function renderGarageMetrics() {
  if (elements.profileFavoritesCount) {
    elements.profileFavoritesCount.textContent = String(state.favorites.size);
  }

  if (elements.profileWishlistCount) {
    elements.profileWishlistCount.textContent = String(state.wishlist.size);
  }

  if (elements.profileCompareCount) {
    elements.profileCompareCount.textContent = `${state.compare.size}/3`;
  }

  const candidateIds = [
    ...state.favorites,
    ...state.wishlist,
    ...state.compare,
  ];
  const leadCar = candidateIds.map((id) => getCarFromRuntime(id)).find(Boolean);

  if (elements.profileGarageHighlight) {
    elements.profileGarageHighlight.textContent = leadCar
      ? `Garage Lead: ${leadCar.brand} ${leadCar.name}`
      : "Garage Lead: N/A";
  }
}

function getCarFromRuntime(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;

  if (typeof window.getCarById === "function") {
    return window.getCarById(numericId);
  }

  if (!Array.isArray(window.cars)) return null;
  return window.cars.find((car) => Number(car?.id) === numericId) || null;
}

function clearProfileErrors() {
  setFieldError(elements.updateNameInput, elements.updateNameError, "");
  setFieldError(elements.updatePhotoInput, elements.updatePhotoError, "");
  setMessage(elements.profileUpdateError, "");
  setMessage(elements.profileUpdateSuccess, "");
}

function clearPasswordErrors() {
  setFieldError(elements.currentPasswordInput, elements.currentPasswordError, "");
  setFieldError(elements.newPasswordInput, elements.newPasswordError, "");
  setFieldError(elements.confirmPasswordInput, elements.confirmPasswordError, "");
  setMessage(elements.passwordError, "");
  setMessage(elements.passwordSuccess, "");
}

function hideAccountSettingsPanels() {
  elements.accountSettingsOptions?.classList.add("hidden");
  elements.profileFormPanel?.classList.add("hidden");
  elements.passwordFormPanel?.classList.add("hidden");
}

function showAccountOptions() {
  hideAccountSettingsPanels();
  elements.accountSettingsOptions?.classList.remove("hidden");
}

function showProfilePanel() {
  hideAccountSettingsPanels();
  elements.profileFormPanel?.classList.remove("hidden");
}

function showPasswordPanel() {
  hideAccountSettingsPanels();
  elements.passwordFormPanel?.classList.remove("hidden");
}

function openAccountSettingsModal() {
  if (!elements.accountSettingsModal) return;

  showAccountOptions();
  elements.accountSettingsModal.classList.remove("hidden");
  elements.accountSettingsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("overflow-hidden");
}

function closeAccountSettingsModal() {
  if (!elements.accountSettingsModal) return;

  elements.accountSettingsModal.classList.add("hidden");
  elements.accountSettingsModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overflow-hidden");

  showAccountOptions();
}

function firstNameFromName(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "Driver";
  return trimmed.split(/\s+/)[0];
}

async function loadModules() {
  if (state.modules) return state.modules;

  const [
    firestoreModule,
    authSdkModule,
    storageModule,
    firebaseConfigModule,
    authModule,
    passwordNotificationModule,
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"),
    import("/js/firebase-config.js"),
    import("/js/auth.js"),
    import("/js/password-notification.js"),
  ]);

  state.modules = {
    firestore: {
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      updateDoc: firestoreModule.updateDoc,
      serverTimestamp: firestoreModule.serverTimestamp,
    },
    authSdk: {
      updateProfile: authSdkModule.updateProfile,
    },
    storageSdk: {
      getDownloadURL: storageModule.getDownloadURL,
      ref: storageModule.ref,
      uploadBytes: storageModule.uploadBytes,
    },
    firebase: {
      auth: firebaseConfigModule.auth,
      db: firebaseConfigModule.db,
      storage: firebaseConfigModule.storage,
    },
    authModule: {
      logout: authModule.logout,
      updateCurrentUserPassword: authModule.updateCurrentUserPassword,
    },
    notifications: {
      notifyPasswordChanged: passwordNotificationModule.notifyPasswordChanged,
    },
  };

  return state.modules;
}

async function uploadProfileImage(uid, file) {
  const modules = await loadModules();
  const imageRef = modules.storageSdk.ref(modules.firebase.storage, `users/${uid}/profile.jpg`);

  await modules.storageSdk.uploadBytes(imageRef, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "public,max-age=3600",
  });

  return modules.storageSdk.getDownloadURL(imageRef);
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  clearProfileErrors();

  const modules = await loadModules();
  const user = modules.firebase.auth.currentUser;

  if (!user?.uid || !state.currentUser?.uid || user.uid !== state.currentUser.uid) {
    setMessage(elements.profileUpdateError, "Session expired. Please log in again.");
    showNotification("Session expired. Please log in again.", "error");
    return;
  }

  const name = (elements.updateNameInput?.value || "").trim();
  const selectedImage = elements.updatePhotoInput?.files?.[0] || null;

  let hasError = false;

  if (!name || name.length < 2) {
    setFieldError(elements.updateNameInput, elements.updateNameError, "Name must be at least 2 characters.");
    hasError = true;
  }

  if (name.length > 80) {
    setFieldError(elements.updateNameInput, elements.updateNameError, "Name cannot exceed 80 characters.");
    hasError = true;
  }

  const imageError = validateProfileImageFile(selectedImage);
  if (imageError) {
    setFieldError(elements.updatePhotoInput, elements.updatePhotoError, imageError);
    hasError = true;
  }

  if (hasError) return;

  setProfileLoading(true, selectedImage ? "Uploading image..." : "Saving...");

  try {
    const userRef = modules.firestore.doc(modules.firebase.db, "users", user.uid);
    const userSnap = await modules.firestore.getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User profile record is missing. Please sign out and sign in again.");
    }

    const existingData = userSnap.data() || {};
    let photoUrl = user.photoURL || "";

    if (selectedImage) {
      photoUrl = await uploadProfileImage(user.uid, selectedImage);
    }

    const nextPhoto = photoUrl || user.photoURL || "";

    await modules.authSdk.updateProfile(user, {
      displayName: name,
      photoURL: nextPhoto,
    });

    const updates = {
      updatedAt: modules.firestore.serverTimestamp(),
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

    await modules.firestore.updateDoc(userRef, updates);

    if (elements.profileName) elements.profileName.textContent = name;

    state.persistedProfilePhotoUrl = nextPhoto || fallbackAvatar(name || "Driver");
    syncProfilePhotoPreview(state.persistedProfilePhotoUrl);

    if (selectedImage && elements.updatePhotoInput) {
      elements.updatePhotoInput.value = "";
      clearObjectPreviewUrl();
    }

    setMessage(elements.profileUpdateSuccess, "Profile updated successfully.");
    showNotification("Profile updated successfully.", "success");
  } catch (error) {
    const message = error?.message || "Unable to update profile. Please try again.";
    setMessage(elements.profileUpdateError, message);
    showNotification(message, "error");
  } finally {
    setProfileLoading(false);
  }
}

async function handlePasswordChange(event) {
  event.preventDefault();
  clearPasswordErrors();

  const modules = await loadModules();

  const currentPassword = elements.currentPasswordInput?.value || "";
  const newPassword = elements.newPasswordInput?.value || "";
  const confirmPassword = elements.confirmPasswordInput?.value || "";

  let hasError = false;

  if (!currentPassword) {
    setFieldError(elements.currentPasswordInput, elements.currentPasswordError, "Current password is required.");
    hasError = true;
  }

  if (!newPassword || newPassword.length < 6) {
    setFieldError(elements.newPasswordInput, elements.newPasswordError, "New password must be at least 6 characters.");
    hasError = true;
  }

  if (confirmPassword !== newPassword) {
    setFieldError(elements.confirmPasswordInput, elements.confirmPasswordError, "Passwords do not match.");
    hasError = true;
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    setFieldError(elements.newPasswordInput, elements.newPasswordError, "New password must be different from current password.");
    hasError = true;
  }

  if (hasError) return;

  setPasswordLoading(true);

  try {
    await modules.authModule.updateCurrentUserPassword({ currentPassword, newPassword });

    let notificationMessage = "Password updated successfully. A confirmation email has been sent.";
    try {
      await modules.notifications.notifyPasswordChanged({
        email: modules.firebase.auth.currentUser?.email || "",
        source: "profile-password-change",
      });
    } catch (notificationError) {
      console.error("[Password Notification] Failed after in-app password change", notificationError);
      notificationMessage = "Password updated successfully, but confirmation email could not be sent right now.";
    }

    elements.passwordForm?.reset();
    setMessage(elements.passwordSuccess, notificationMessage);
    showNotification("Password updated.", "success");
  } catch (error) {
    const message = error?.message || "Unable to change password. Please try again.";
    setMessage(elements.passwordError, message);
    showNotification(message, "error");
  } finally {
    setPasswordLoading(false);
  }
}

function bindFormHandlers() {
  if (elements.accountSettingsTrigger && elements.accountSettingsTrigger.dataset.bound !== "true") {
    elements.accountSettingsTrigger.dataset.bound = "true";
    elements.accountSettingsTrigger.addEventListener("click", openAccountSettingsModal);
  }

  if (elements.accountSettingsClose && elements.accountSettingsClose.dataset.bound !== "true") {
    elements.accountSettingsClose.dataset.bound = "true";
    elements.accountSettingsClose.addEventListener("click", closeAccountSettingsModal);
  }

  if (elements.accountSettingsOverlay && elements.accountSettingsOverlay.dataset.bound !== "true") {
    elements.accountSettingsOverlay.dataset.bound = "true";
    elements.accountSettingsOverlay.addEventListener("click", closeAccountSettingsModal);
  }

  if (elements.openProfileUpdateBtn && elements.openProfileUpdateBtn.dataset.bound !== "true") {
    elements.openProfileUpdateBtn.dataset.bound = "true";
    elements.openProfileUpdateBtn.addEventListener("click", showProfilePanel);
  }

  if (elements.openPasswordChangeBtn && elements.openPasswordChangeBtn.dataset.bound !== "true") {
    elements.openPasswordChangeBtn.dataset.bound = "true";
    elements.openPasswordChangeBtn.addEventListener("click", showPasswordPanel);
  }

  if (elements.profileModalBack && elements.profileModalBack.dataset.bound !== "true") {
    elements.profileModalBack.dataset.bound = "true";
    elements.profileModalBack.addEventListener("click", showAccountOptions);
  }

  if (elements.passwordModalBack && elements.passwordModalBack.dataset.bound !== "true") {
    elements.passwordModalBack.dataset.bound = "true";
    elements.passwordModalBack.addEventListener("click", showAccountOptions);
  }

  if (elements.accountSettingsModal && elements.accountSettingsModal.dataset.bound !== "true") {
    elements.accountSettingsModal.dataset.bound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.accountSettingsModal.classList.contains("hidden")) {
        closeAccountSettingsModal();
      }
    });
  }

  if (elements.profileUpdateForm && elements.profileUpdateForm.dataset.bound !== "true") {
    elements.profileUpdateForm.dataset.bound = "true";
    elements.profileUpdateForm.addEventListener("submit", handleProfileUpdate);
  }

  if (elements.updatePhotoInput && elements.updatePhotoInput.dataset.bound !== "true") {
    elements.updatePhotoInput.dataset.bound = "true";
    elements.updatePhotoInput.addEventListener("change", () => {
      setFieldError(elements.updatePhotoInput, elements.updatePhotoError, "");
      setMessage(elements.profileUpdateError, "");
      setMessage(elements.profileUpdateSuccess, "");

      const selectedImage = elements.updatePhotoInput.files?.[0] || null;
      if (!selectedImage) {
        clearObjectPreviewUrl();
        syncProfilePhotoPreview(state.persistedProfilePhotoUrl || resolvePhotoUrl(state.currentUser));
        return;
      }

      const validationMessage = validateProfileImageFile(selectedImage);
      if (validationMessage) {
        setFieldError(elements.updatePhotoInput, elements.updatePhotoError, validationMessage);
        elements.updatePhotoInput.value = "";
        clearObjectPreviewUrl();
        syncProfilePhotoPreview(state.persistedProfilePhotoUrl || resolvePhotoUrl(state.currentUser));
        return;
      }

      clearObjectPreviewUrl();
      state.pendingPreviewObjectUrl = URL.createObjectURL(selectedImage);
      syncProfilePhotoPreview(state.pendingPreviewObjectUrl);
    });
  }

  if (elements.passwordForm && elements.passwordForm.dataset.bound !== "true") {
    elements.passwordForm.dataset.bound = "true";
    elements.passwordForm.addEventListener("submit", handlePasswordChange);
  }

  if (elements.profileLogoutBtn && elements.profileLogoutBtn.dataset.bound !== "true") {
    elements.profileLogoutBtn.dataset.bound = "true";
    elements.profileLogoutBtn.addEventListener("click", async () => {
      const modules = await loadModules();

      elements.profileLogoutBtn.disabled = true;
      if (!elements.profileLogoutBtn.dataset.defaultText) {
        elements.profileLogoutBtn.dataset.defaultText = elements.profileLogoutBtn.textContent;
      }
      elements.profileLogoutBtn.textContent = "Logging out...";

      try {
        await modules.authModule.logout();
      } catch (error) {
        elements.profileLogoutBtn.disabled = false;
        elements.profileLogoutBtn.textContent = elements.profileLogoutBtn.dataset.defaultText || "Logout";
        showNotification(error?.message || "Unable to logout right now.", "error");
      }
    });
  }

  if (document.body && document.body.dataset.profileCleanupBound !== "true") {
    document.body.dataset.profileCleanupBound = "true";
    window.addEventListener("beforeunload", clearObjectPreviewUrl);
  }
}

async function loadUserDetails() {
  const modules = await loadModules();

  await window.vgUserStore?.waitForReady?.();
  const user = window.vgUserStore?.getCurrentUser?.() || modules.firebase.auth.currentUser;

  if (!user) {
    throw new Error("Unable to resolve current user session.");
  }

  state.currentUser = user;

  if (elements.profileName) elements.profileName.textContent = user.displayName || "Velocity Driver";
  if (elements.profileId) elements.profileId.textContent = shortUserId(user.uid || "");
  if (elements.profileEmail) elements.profileEmail.textContent = user.email || "No email";

  state.persistedProfilePhotoUrl = resolvePhotoUrl(user);
  syncProfilePhotoPreview(state.persistedProfilePhotoUrl);

  if (elements.updateNameInput) {
    elements.updateNameInput.value = user.displayName || "";
  }

  const userRef = modules.firestore.doc(modules.firebase.db, "users", user.uid);
  const userSnap = await modules.firestore.getDoc(userRef);

  if (!userSnap.exists()) {
    if (elements.profileJoined) elements.profileJoined.textContent = "MEMBER SINCE RECENTLY";
    return;
  }

  const data = userSnap.data();

  state.persistedProfilePhotoUrl = resolvePhotoUrl(user, data);
  syncProfilePhotoPreview(state.persistedProfilePhotoUrl);

  if (elements.updateNameInput && data?.name && !elements.updateNameInput.value) {
    elements.updateNameInput.value = data.name;
  }

  if (elements.profileJoined) {
    elements.profileJoined.textContent = formatMemberSince(data.createdAt);
  }
}

async function init() {
  await loadModules();
  await loadUserDetails();

  renderGarageMetrics();
  bindFormHandlers();

  window.vgUserStore?.bindThemeToggle?.();
  window.vgUserStore?.subscribeUserState?.((remote) => {
    syncSetsFromRemote(remote || {});
  });

  elements.pageLoading?.classList.add("hidden");
}

init().catch((error) => {
  console.error("[UI Init Error] profile page failed to initialize", error);
  showNotification(error?.message || "Unable to load profile.", "error");
  elements.pageLoading?.classList.add("hidden");
});
