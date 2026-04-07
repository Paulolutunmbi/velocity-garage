import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { onAuthChange } from "./auth.js";

const MAX_COMPARE = 3;
const listeners = new Set();

let unsubscribeUserDoc = null;
let currentUser = null;
let currentState = normalizeState();
let persistQueue = Promise.resolve();
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

    body.vg-light [class*="bg-vgBg"],
    body.vg-light [class*="bg-vg-bg"] {
      background-color: #eef2f7 !important;
    }

    body.vg-light [class*="bg-vgSurface"],
    body.vg-light [class*="bg-vg-panel"],
    body.vg-light [class*="bg-vg-panel-hi"],
    body.vg-light [class*="bg-slate-"],
    body.vg-light [class*="bg-gray-"],
    body.vg-light [class*="bg-black/"] {
      background-color: rgba(255, 255, 255, 0.9) !important;
    }

    body.vg-light [class*="bg-black"] {
      background-color: #f8fafc !important;
    }

    body.vg-light [class*="border-vgLine"],
    body.vg-light [class*="border-vg-panel"],
    body.vg-light [class*="border-vg-panel-hi"],
    body.vg-light [class*="border-slate-"] {
      border-color: #cbd5e1 !important;
    }

    body.vg-light [class*="border-white/"] {
      border-color: #cbd5e1 !important;
    }

    body.vg-light [class*="text-vgMuted"],
    body.vg-light [class*="text-vg-muted"] {
      color: #475569 !important;
    }

    body.vg-light [class*="text-vg-copy"] {
      color: #0f172a !important;
    }

    body.vg-light [class*="text-vgPrimary"],
    body.vg-light [class*="text-vg-accent"] {
      color: #be123c !important;
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

    body.vg-light .glass-panel {
      background: rgba(255, 255, 255, 0.9) !important;
      border-color: rgba(148, 163, 184, 0.64) !important;
    }

    body.vg-light .deck-grid-card {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    }

    body.vg-light .deck-grid-card [class*="bg-black/"],
    body.vg-light .deck-grid-card [class*="bg-white/5"] {
      background-color: #f8fafc !important;
    }

    body.vg-light .deck-grid-card button {
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }

    body.vg-light .deck-grid-card button[data-action="details"],
    body.vg-light .deck-grid-card button[data-action="rec-details"],
    body.vg-light .deck-grid-card button[data-action="compare"],
    body.vg-light .deck-grid-card button[data-action="rec-compare"] {
      background: #0f172a !important;
      border-color: #0f172a !important;
      color: #f8fafc !important;
    }

    body.vg-light #compare-bar,
    body.vg-light #notification {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }

    body.vg-light #back-to-top {
      background: #0f172a !important;
      border-color: #0f172a !important;
      color: #f8fafc !important;
    }

    body.vg-light #modal > div,
    body.vg-light #modal section {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }

    body.vg-light #modal #modal-carousel,
    body.vg-light #modal #modal-carousel-dots {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
    }

    body.vg-light #modal #modal-compare {
      background: #0f172a !important;
      border-color: #0f172a !important;
      color: #f8fafc !important;
    }

    body.vg-light #modal #modal-fav,
    body.vg-light #modal #modal-wishlist,
    body.vg-light #modal #modal-cancel {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }

    body.vg-light #auth-controls [class*="bg-slate-"],
    body.vg-light #auth-controls [class*="border-slate-"] {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }
  `;

  document.head.appendChild(style);
}

function getThemeToggleIconMarkup(isDarkMode) {
  if (isDarkMode) {
    // Dark mode active -> show sun icon (switch to light mode).
    return `
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/>
      </svg>
    `;
  }

  // Light mode active -> show moon icon (switch to dark mode).
  return `
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
    </svg>
  `;
}

function updateThemeToggleButton(toggle, isDarkMode) {
  toggle.innerHTML = getThemeToggleIconMarkup(isDarkMode);
  toggle.setAttribute("aria-label", isDarkMode ? "Switch to light mode" : "Switch to dark mode");
  toggle.setAttribute("title", isDarkMode ? "Switch to light mode" : "Switch to dark mode");
  toggle.setAttribute("aria-pressed", String(!isDarkMode));
}

function applyThemeToDom(isDarkMode) {
  injectThemeStyles();
  document.body.classList.toggle("vg-light", !isDarkMode);

  const logoSrc = isDarkMode ? "assets/images/default-monochrome-white.svg" : "assets/images/default-monochrome-black.svg";
  document.querySelectorAll("#site-logo, #site-logo-desktop").forEach((logo) => {
    logo.src = logoSrc;
  });

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    updateThemeToggleButton(toggle, isDarkMode);
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
            favoritesCount: 0,
            favoriteCount: 0,
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

function subscribeUsers(listener) {
  if (typeof listener !== "function") return () => {};

  // Keep leaderboard reads bounded to align with Firestore list-rule limits.
  const usersQuery = query(collection(db, "users"), limit(500));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      listener(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() || {}),
        }))
      );
    },
    (error) => {
      console.error("[Firestore Read Error] users collection", error);
      listener([]);
    }
  );
}

async function runPersistRemote(patch) {
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
        favoritesCount: nextState.favorites.length,
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

  // Re-fetch after writes to keep local state aligned with Firestore snapshots.
  currentState = await loadUserData(currentUser.uid);
  applyThemeToDom(currentState.darkMode);
  notifyState();

  return currentState;
}

function persistRemote(patch) {
  // Serialize writes so rapid button taps never race and drop leaderboard/user updates.
  persistQueue = persistQueue
    .catch(() => undefined)
    .then(() => runPersistRemote(patch));

  return persistQueue;
}

function bindThemeToggle() {
  applyThemeToDom(currentState.darkMode);

  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle || themeToggle.dataset.vgBound === "true") return;

  themeToggle.dataset.vgBound = "true";
  themeToggle.addEventListener("click", async () => {
    const nextDark = !currentState.darkMode;
    try {
      await persistRemote({ darkMode: nextDark });
    } catch (error) {
      console.error("[Theme Toggle] failed to persist preference", error);
    }
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
  subscribeUsers,
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
