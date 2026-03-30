import {
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  setPersistence,
  updatePassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db, googleProvider, githubProvider, ADMIN_EMAIL } from "./firebase-config.js";

let authReadyPromise = null;
let bannedListenerUnsub = null;
let isForcedBanSignout = false;
let banModalElement = null;
let banModalAutoLogoutTimer = null;

const BANNED_MESSAGE = "Your account has been banned for violating our Terms of Service and data protocols. If you believe this is a mistake or need assistance, please contact the admin.";

function injectBanModalStyles() {
  if (document.getElementById("vg-ban-modal-style")) return;

  const style = document.createElement("style");
  style.id = "vg-ban-modal-style";
  style.textContent = `
    .vg-ban-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(2, 6, 23, 0.78);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: vgBanFadeIn 220ms ease-out;
    }
    .vg-ban-modal {
      width: min(92vw, 560px);
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: linear-gradient(165deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97));
      box-shadow: 0 24px 60px rgba(2, 6, 23, 0.55);
      color: #e2e8f0;
      padding: 1.25rem;
      animation: vgBanRise 240ms ease-out;
    }
    .vg-ban-title {
      margin: 0;
      font-size: clamp(1.25rem, 2.6vw, 1.65rem);
      font-weight: 800;
      letter-spacing: 0.01em;
      color: #f8fafc;
    }
    .vg-ban-copy {
      margin-top: 0.75rem;
      line-height: 1.55;
      color: #cbd5e1;
      font-size: 0.95rem;
    }
    .vg-ban-contact {
      margin-top: 0.85rem;
      font-size: 0.9rem;
      color: #fda4af;
    }
    .vg-ban-contact a {
      color: #fda4af;
      text-decoration: underline;
      text-underline-offset: 2px;
      font-weight: 700;
    }
    .vg-ban-actions {
      margin-top: 1.1rem;
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.6rem;
    }
    .vg-ban-btn {
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 0.65rem 0.9rem;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 170ms ease;
    }
    .vg-ban-btn:disabled {
      opacity: 0.68;
      cursor: wait;
    }
    .vg-ban-btn-contact {
      background: rgba(100, 116, 139, 0.2);
      border-color: rgba(100, 116, 139, 0.4);
      color: #e2e8f0;
    }
    .vg-ban-btn-contact:hover {
      background: rgba(100, 116, 139, 0.32);
    }
    .vg-ban-btn-logout {
      background: linear-gradient(90deg, #ef4444, #dc2626);
      color: #fff;
    }
    .vg-ban-btn-logout:hover {
      filter: brightness(1.05);
    }
    @media (min-width: 520px) {
      .vg-ban-actions {
        grid-template-columns: 1fr 1fr;
      }
    }
    @keyframes vgBanFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes vgBanRise {
      from { transform: translateY(8px) scale(0.98); opacity: 0.82; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
  `;

  document.head.appendChild(style);
}

function clearBanModalState() {
  if (banModalAutoLogoutTimer) {
    clearTimeout(banModalAutoLogoutTimer);
    banModalAutoLogoutTimer = null;
  }

  if (banModalElement) {
    banModalElement.remove();
    banModalElement = null;
  }

  document.body?.classList.remove("overflow-hidden");
}

async function forceLogoutFromBan() {
  if (isForcedBanSignout) return;

  try {
    isForcedBanSignout = true;
    await signOut(auth);
  } catch (error) {
    console.error("[Auth] Forced ban sign-out failed:", error);
  } finally {
    isForcedBanSignout = false;
  }
}

function showBannedModal() {
  if (banModalElement) return;

  injectBanModalStyles();

  const overlay = document.createElement("div");
  overlay.className = "vg-ban-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "vg-ban-title");
  overlay.setAttribute("aria-describedby", "vg-ban-copy");
  overlay.innerHTML = `
    <section class="vg-ban-modal" tabindex="-1">
      <h2 id="vg-ban-title" class="vg-ban-title">Account Restricted</h2>
      <p id="vg-ban-copy" class="vg-ban-copy">${BANNED_MESSAGE}</p>
      <p class="vg-ban-contact">
        Admin contact:
        <a href="mailto:oluwatunmbipaul@gmail.com">oluwatunmbipaul@gmail.com</a>
      </p>
      <div class="vg-ban-actions">
        <a class="vg-ban-btn vg-ban-btn-contact" href="mailto:oluwatunmbipaul@gmail.com">Contact Admin</a>
        <button type="button" id="vg-ban-logout-btn" class="vg-ban-btn vg-ban-btn-logout">Logout</button>
      </div>
    </section>
  `;

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") event.preventDefault();
  });

  const logoutBtn = overlay.querySelector("#vg-ban-logout-btn");
  logoutBtn?.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";
    await forceLogoutFromBan();
  });

  document.body.appendChild(overlay);
  document.body.classList.add("overflow-hidden");
  banModalElement = overlay;

  const focusTarget = overlay.querySelector(".vg-ban-modal");
  focusTarget?.focus();

  // Optional delayed auto-signout to ensure banned users cannot continue interacting.
  banModalAutoLogoutTimer = setTimeout(() => {
    forceLogoutFromBan();
  }, 2600);
}

async function isUserBanned(uid) {
  if (!uid) return false;
  const bannedSnap = await getDoc(doc(db, "bannedUsers", uid));
  return bannedSnap.exists();
}

function bindRealtimeBanMonitor() {
  onAuthStateChanged(auth, (user) => {
    bannedListenerUnsub?.();
    bannedListenerUnsub = null;

    if (!user?.uid) {
      clearBanModalState();
      return;
    }

    isUserBanned(user.uid)
      .then((banned) => {
        if (banned) showBannedModal();
      })
      .catch((error) => {
        console.warn("[Auth] Initial banned check failed:", error?.message || error);
      });

    // Real-time ban monitor: if bannedUsers/{uid} exists, force sign-out immediately.
    bannedListenerUnsub = onSnapshot(
      doc(db, "bannedUsers", user.uid),
      (snapshot) => {
        if (!snapshot.exists()) return;
        showBannedModal();
      },
      (error) => {
        console.warn("[Auth] Ban monitor listener error:", error?.message || error);
      }
    );
  });
}

bindRealtimeBanMonitor();

function ensureAuthReady() {
  if (!authReadyPromise) {
    authReadyPromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn("[Auth] Could not set browserLocalPersistence, continuing with defaults.", error);
    });
  }
  return authReadyPromise;
}

function avatarForName(name) {
  const safeName = encodeURIComponent(name || "Velocity Driver");
  return `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=f8fafc`;
}

async function ensureUserDocument(user, preferredName = "") {
  try {
    const userRef = doc(db, "users", user.uid);
    const existingSnap = await getDoc(userRef);
    const isNewUserDoc = !existingSnap.exists();
    const existingData = existingSnap.exists() ? existingSnap.data() : {};
    const shouldPatchCreatedAt = !isNewUserDoc && !existingData?.createdAt;

    const docData = {
      uid: user.uid,
      name: preferredName || user.displayName || "Velocity Driver",
      firstName: (preferredName || user.displayName || user.email || "Driver").split(/\s|@/)[0],
      email: user.email || "",
      emailLower: (user.email || "").toLowerCase(),
      photo: user.photoURL || avatarForName(preferredName || user.displayName),
      ...(isNewUserDoc
        ? {
            favorites: [],
            wishlist: [],
            compare: [],
            darkMode: true,
            favoritesCount: 0,
            favoriteCount: 0,
          }
        : {}),
      ...(isNewUserDoc || shouldPatchCreatedAt ? { createdAt: serverTimestamp() } : {}),
    };

    // Merge keeps existing fields while ensuring core user data is always present.
    await setDoc(userRef, docData, { merge: true });
    console.log("✓ User document saved/updated:", user.uid, docData);
    return docData;
  } catch (error) {
    console.error("✗ Error saving user document:", error);
    throw error;
  }
}

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-action-code": "Invalid or expired authentication action. Check your Firebase Authorized Domains and OAuth redirect settings.",
  "auth/expired-action-code": "This reset link has expired. Please request a new one.",
  "auth/invalid-continue-uri": "Password reset redirect URL is invalid. Contact support.",
  "auth/missing-continue-uri": "Password reset redirect URL is missing. Contact support.",
  "auth/unauthorized-continue-uri": "Password reset redirect URL is not authorized in Firebase settings.",
  "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication. Add it in Firebase Console > Authentication > Settings > Authorized domains.",
  "auth/operation-not-allowed": "This sign-in method is disabled in Firebase Console. Enable it in Authentication > Sign-in method.",
  "auth/popup-blocked": "Popup was blocked by the browser. Try again or allow popups for this site.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completion.",
  "auth/account-exists-with-different-credential": "An account already exists with the same email but a different sign-in provider.",
  "auth/invalid-credential": "Invalid credentials. Check your email and password and try again.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/requires-recent-login": "Please log in again and retry this action.",
  "auth/weak-password": "Please choose a stronger password (at least 6 characters).",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

const PASSWORD_RESET_BASE_URL =
  "https://velocity-garage-b6535.firebaseapp.com/reset-password.html";

function withFriendlyAuthError(error) {
  const code = error?.code || "auth/unknown";
  const message = AUTH_ERROR_MESSAGES[code] || error?.message || "Authentication failed.";
  const wrapped = new Error(message);
  wrapped.code = code;
  wrapped.original = error;
  return wrapped;
}

function appResetUrl() {
  const configured =
    typeof window !== "undefined" && typeof window.__ENV?.FIREBASE_PASSWORD_RESET_URL === "string"
      ? window.__ENV.FIREBASE_PASSWORD_RESET_URL.trim()
      : "";

  if (configured) {
    return configured;
  }

  return PASSWORD_RESET_BASE_URL;
}

async function findUserByEmail(email) {
  const rawEmail = (email || "").trim();
  const normalizedEmail = rawEmail.toLowerCase();
  const usersRef = collection(db, "users");

  const lookupCandidates = [rawEmail, normalizedEmail];
  const visited = new Set();

  for (const value of lookupCandidates) {
    if (!value || visited.has(value)) continue;
    visited.add(value);

    const snapshot = await getDocs(query(usersRef, where("email", "==", value), limit(1)));
    if (!snapshot.empty) return snapshot.docs[0];
  }

  const lowerFieldSnapshot = await getDocs(
    query(usersRef, where("emailLower", "==", normalizedEmail), limit(1))
  );

  if (!lowerFieldSnapshot.empty) return lowerFieldSnapshot.docs[0];

  return null;
}

export async function signup({ name, email, password }) {
  await ensureAuthReady();
  console.log("📝 Signing up:", email);
  let result;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw withFriendlyAuthError(error);
  }
  const user = result.user;
  console.log("✓ User created in Auth:", user.uid);

  await updateProfile(user, {
    displayName: name,
    photoURL: user.photoURL || avatarForName(name),
  });
  console.log("✓ Profile updated:", name);

  await ensureUserDocument(auth.currentUser || user, name);
  console.log("✓ Signup complete:", user.uid);
  return auth.currentUser || user;
}

export async function login({ email, password }) {
  await ensureAuthReady();
  console.log("🔐 Logging in:", email);
  let result;
  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw withFriendlyAuthError(error);
  }
  console.log("✓ User authenticated:", result.user.uid);
  await ensureUserDocument(result.user);
  console.log("✓ Login complete:", result.user.uid);
  return result.user;
}

async function startOAuth(provider, providerName) {
  await ensureAuthReady();
  try {
    const result = await signInWithPopup(auth, provider);
    await ensureUserDocument(result.user);
    return { user: result.user, redirected: false };
  } catch (error) {
    const popupFallbackErrors = new Set([
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment",
    ]);

    if (popupFallbackErrors.has(error?.code)) {
      console.warn(`[Auth] ${providerName} popup failed with ${error.code}; switching to redirect flow.`);
      await signInWithRedirect(auth, provider);
      return { user: null, redirected: true };
    }

    throw withFriendlyAuthError(error);
  }
}

export async function completeOAuthRedirectSignIn() {
  await ensureAuthReady();
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) {
      return { user: auth.currentUser || null, redirected: false };
    }

    await ensureUserDocument(result.user);
    return { user: result.user, redirected: true };
  } catch (error) {
    throw withFriendlyAuthError(error);
  }
}

export async function loginWithGoogle() {
  console.log("🔐 Google login starting...");
  const result = await startOAuth(googleProvider, "Google");
  if (result.redirected) return null;
  console.log("✓ Google user authenticated:", result.user.uid);
  console.log("✓ Google login complete:", result.user.uid);
  return result.user;
}

export async function loginWithGithub() {
  console.log("🔐 GitHub login starting...");
  const result = await startOAuth(githubProvider, "GitHub");
  if (result.redirected) return null;
  console.log("✓ GitHub user authenticated:", result.user.uid);
  console.log("✓ GitHub login complete:", result.user.uid);
  return result.user;
}

export async function logout() {
  await ensureAuthReady();
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function isAdmin(user) {
  return (user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function watchUsers(callback, onError) {
  const usersQuery = query(collection(db, "users"));
  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
      callback(users);
    },
    onError
  );
}

export async function requestPasswordReset(email) {
  await ensureAuthReady();
  const cleanEmail = (email || "").trim();

  if (!cleanEmail) {
    throw new Error("Email is required.");
  }

  try {
    const userDoc = await findUserByEmail(cleanEmail);
    if (!userDoc) {
      throw new Error("No account found with this email.");
    }

    const uid = userDoc.id;
    const bannedDoc = await getDoc(doc(db, "bannedUsers", uid));
    if (bannedDoc.exists()) {
      throw new Error("This account is restricted. Please contact support.");
    }

    await sendPasswordResetEmail(auth, cleanEmail, {
      url: appResetUrl(),
      handleCodeInApp: true,
    });
  } catch (error) {
    if (error?.message === "No account found with this email.") {
      throw error;
    }
    if (error?.message === "This account is restricted. Please contact support.") {
      throw error;
    }
    throw withFriendlyAuthError(error);
  }
}

export async function updateCurrentUserPassword({ currentPassword, newPassword }) {
  await ensureAuthReady();

  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error("You must be logged in with an email/password account to change password.");
  }

  const providerIds = (user.providerData || []).map((item) => item?.providerId).filter(Boolean);
  if (!providerIds.includes("password")) {
    throw new Error("Password change is only available for email/password accounts.");
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (error) {
    throw withFriendlyAuthError(error);
  }
}
