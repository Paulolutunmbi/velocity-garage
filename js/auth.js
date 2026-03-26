import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  setPersistence,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db, googleProvider, githubProvider, ADMIN_EMAIL } from "./firebase-config.js";

let authReadyPromise = null;

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
      photo: user.photoURL || avatarForName(preferredName || user.displayName),
      ...(isNewUserDoc
        ? {
            favorites: [],
            wishlist: [],
            compare: [],
            darkMode: true,
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
  "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication. Add it in Firebase Console > Authentication > Settings > Authorized domains.",
  "auth/operation-not-allowed": "This sign-in method is disabled in Firebase Console. Enable it in Authentication > Sign-in method.",
  "auth/popup-blocked": "Popup was blocked by the browser. Try again or allow popups for this site.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completion.",
  "auth/account-exists-with-different-credential": "An account already exists with the same email but a different sign-in provider.",
  "auth/invalid-credential": "Invalid credentials. Check your email and password and try again.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

function withFriendlyAuthError(error) {
  const code = error?.code || "auth/unknown";
  const message = AUTH_ERROR_MESSAGES[code] || error?.message || "Authentication failed.";
  const wrapped = new Error(message);
  wrapped.code = code;
  wrapped.original = error;
  return wrapped;
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
