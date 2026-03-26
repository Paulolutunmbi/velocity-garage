import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { isAdmin, onAuthChange } from "./auth.js";

const MAX_COMPARE = 3;
const listeners = new Set();

let unsubscribeUserDoc = null;
let currentUser = null;
let currentState = normalizeState();
let isReady = false;
let resolveReady = () => {};
let readyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))];
}

function normalizeState(value = {}) {
  const favorites = normalizeIds(value.favorites);
  const wishlist = normalizeIds(value.wishlist);
  const compare = normalizeIds(value.compare).slice(0, MAX_COMPARE);

  return {
    favorites,
    wishlist,
    compare,
    darkMode: typeof value.darkMode === "boolean" ? value.darkMode : true,
  };
}

function notifyState() {
  for (const listener of listeners) listener({ ...currentState });
}

function markReady() {
  // Resolve exactly once so page scripts can delay first render until user state is hydrated.
  if (isReady) return;
  isReady = true;
  resolveReady({ ...currentState });
}

function resetReadyPromise() {
  isReady = false;
  readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });
}

function getFirstName(user = null) {
  const displayName = user?.displayName?.trim() || "";
  if (displayName) return displayName.split(/\s+/)[0];
  const email = user?.email || "Driver";
  return email.split("@")[0];
}

function injectThemeStyles() {
  if (document.getElementById("vg-theme-style")) return;

  const style = document.createElement("style");
  style.id = "vg-theme-style";
  style.textContent = `
    body.vg-light {
      background-image: radial-gradient(circle at 15% 0%, rgba(251, 146, 60, 0.2) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%) !important;
      color: #0f172a !important;
    }
    body.vg-light [class*="bg-slate-"],
    body.vg-light [class*="bg-gray-"] {
      background-color: rgba(255, 255, 255, 0.88) !important;
    }
    body.vg-light [class*="border-slate-"] {
      border-color: #cbd5e1 !important;
    }
    body.vg-light [class*="text-white"],
    body.vg-light [class*="text-slate-"],
    body.vg-light p,
    body.vg-light h1,
    body.vg-light h2,
    body.vg-light h3,
    body.vg-light h4,
    body.vg-light h5,
    body.vg-light h6,
    body.vg-light span,
    body.vg-light label {
      color: #0f172a !important;
    }
    body.vg-light .text-orange-500,
    body.vg-light .text-orange-300 {
      color: #9a3412 !important;
    }
  `;

  document.head.appendChild(style);
}

function applyThemeToDom(isDarkMode) {
  injectThemeStyles();
  document.body.classList.toggle("vg-light", !isDarkMode);

  const logo = document.getElementById("site-logo");
  if (logo) {
    logo.src = isDarkMode ? "assets/images/default-monochrome-white.svg" : "assets/images/default.svg";
  }

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
    toggle.setAttribute("aria-pressed", String(!isDarkMode));
  }
}

async function ensureUserDocument(user) {
  const existingSnap = await getDoc(doc(db, "users", user.uid));
  const isNewUserDoc = !existingSnap.exists();

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "Velocity Driver",
      firstName: getFirstName(user),
      ...(isNewUserDoc
        ? {
            favorites: [],
            wishlist: [],
            compare: [],
            darkMode: true,
            createdAt: serverTimestamp(),
          }
        : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function loadUserData(uid) {
  if (!uid) return normalizeState();

  try {
    const snapshot = await getDoc(doc(db, "users", uid));
    if (!snapshot.exists()) {
      console.log("[Firestore Read] users/" + uid + " not found, returning defaults");
      return normalizeState();
    }

    console.log("[Firestore Read] loadUserData users/" + uid, snapshot.data());
    return normalizeState(snapshot.data());
  } catch (error) {
    console.error("[Firestore Read Error] loadUserData users/" + uid, error);
    return normalizeState();
  }
}

function diffFavorites(previousList, nextList) {
  const previous = new Set(previousList);
  const next = new Set(nextList);

  const added = [];
  const removed = [];

  for (const id of next) if (!previous.has(id)) added.push(id);
  for (const id of previous) if (!next.has(id)) removed.push(id);

  return { added, removed };
}

async function updateLeaderboard(user, previousState, nextState) {
  // Keep leaderboard writes admin-only so the app remains compatible with strict Firestore rules.
  if (!isAdmin(user)) {
    return;
  }

  const { added, removed } = diffFavorites(previousState.favorites, nextState.favorites);
  if (!added.length && !removed.length) return;

  const statsRef = doc(db, "leaderboard", "stats");

  const carsPatch = {};
  for (const carId of added) {
    carsPatch[`cars.${String(carId)}`] = increment(1);
  }

  for (const carId of removed) {
    carsPatch[`cars.${String(carId)}`] = increment(-1);
  }

  const usersPatch = {
    [`users.${user.uid}.count`]: nextState.favorites.length,
    [`users.${user.uid}.name`]: getFirstName(user),
    [`users.${user.uid}.updatedAt`]: serverTimestamp(),
  };

  await setDoc(statsRef, { ...carsPatch, ...usersPatch }, { merge: true });
}

function subscribeLeaderboard(listener) {
  if (typeof listener !== "function") return () => {};

  return onSnapshot(
    doc(db, "leaderboard", "stats"),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      listener({
        cars: data?.cars && typeof data.cars === "object" ? data.cars : {},
        users: data?.users && typeof data.users === "object" ? data.users : {},
      });
    },
    (error) => {
      console.error("[Firestore Read Error] leaderboard/stats", error);
      listener({ cars: {}, users: {} });
    }
  );
}

async function persistRemote(patch) {
  const nextState = normalizeState({ ...currentState, ...patch });
  const previousState = { ...currentState };

  currentState = nextState;
  applyThemeToDom(currentState.darkMode);
  notifyState();

  if (!currentUser?.uid) {
    console.warn("[Firestore Write] Skipped write because no authenticated user is available.");
    return currentState;
  }

  // Firestore is the single source of truth; every change writes to users/{uid} immediately.
  console.log("[Firestore Write] users/" + currentUser.uid, nextState);

  try {
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        uid: currentUser.uid,
        email: currentUser.email || "",
        name: currentUser.displayName || "Velocity Driver",
        firstName: getFirstName(currentUser),
        photo: currentUser.photoURL || "",
        favorites: nextState.favorites,
        wishlist: nextState.wishlist,
        compare: nextState.compare,
        darkMode: nextState.darkMode,
        favoriteCount: nextState.favorites.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("[Firestore Write Error] users/" + currentUser.uid, {
      error,
      payload: nextState,
    });
    currentState = previousState;
    applyThemeToDom(currentState.darkMode);
    notifyState();
    throw error;
  }

  // Re-fetch after writes to avoid stale UI and guarantee Firestore is the source of truth.
  currentState = await loadUserData(currentUser.uid);
  applyThemeToDom(currentState.darkMode);
  notifyState();

  try {
    await updateLeaderboard(currentUser, previousState, nextState);
    console.log("[Firestore Write] leaderboard/stats updated from favorites diff");
  } catch (error) {
    // Leaderboard failure must not block the main user-state write path.
    console.warn("[Firestore Write Warning] leaderboard/stats update skipped", error);
  }

  return currentState;
}

function bindThemeToggle() {
  applyThemeToDom(currentState.darkMode);

  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle || themeToggle.dataset.vgBound === "true") return;

  themeToggle.dataset.vgBound = "true";
  themeToggle.addEventListener("click", async () => {
    const nextDark = !currentState.darkMode;
    await persistRemote({ darkMode: nextDark });
  });
}

function subscribeUserState(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  if (isReady) listener({ ...currentState });
  return () => listeners.delete(listener);
}

async function setupUserListener(user) {
  currentUser = user;
  resetReadyPromise();

  if (unsubscribeUserDoc) {
    unsubscribeUserDoc();
    unsubscribeUserDoc = null;
  }

  if (!user?.uid) {
    currentState = normalizeState();
    applyThemeToDom(currentState.darkMode);
    notifyState();
    markReady();
    return;
  }

  await ensureUserDocument(user);

  currentState = await loadUserData(user.uid);
  applyThemeToDom(currentState.darkMode);
  markReady();
  notifyState();

  unsubscribeUserDoc = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
    if (!snapshot.exists()) return;
    // Real-time sync keeps all pages and devices in lockstep.
    console.log("[Firestore Read] users/" + user.uid, snapshot.data());
    const remote = normalizeState(snapshot.data());
    currentState = remote;
    applyThemeToDom(currentState.darkMode);
    markReady();
    notifyState();
  }, (error) => {
    console.error("[Firestore Read Error] users/" + user.uid, error);
    markReady();
  });
}

const store = {
  getLocalState: () => ({ ...currentState }),
  loadUserData,
  updateUserState: persistRemote,
  subscribeUserState,
  subscribeLeaderboard,
  bindThemeToggle,
  waitForReady: () => readyPromise,
  getCurrentUser: () => currentUser,
};

window.vgUserStore = store;

onAuthChange((user) => {
  setupUserListener(user).catch((error) => {
    console.error("[vgUserStore] Failed to initialize user listener", error);
  });
});

applyThemeToDom(currentState.darkMode);

export default store;
