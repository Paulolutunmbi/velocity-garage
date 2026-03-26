import {
  doc,
  onSnapshot,
  runTransaction,
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
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "Velocity Driver",
      firstName: getFirstName(user),
      favorites: [],
      wishlist: [],
      compare: [],
      darkMode: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
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
  const { added, removed } = diffFavorites(previousState.favorites, nextState.favorites);
  if (!added.length && !removed.length) return;

  const statsRef = doc(db, "leaderboard", "stats");

  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsRef);
    const statsData = statsSnap.exists() ? statsSnap.data() : {};

    const carsData = statsData?.cars && typeof statsData.cars === "object" ? { ...statsData.cars } : {};
    const usersData = statsData?.users && typeof statsData.users === "object" ? { ...statsData.users } : {};

    for (const carId of added) {
      const key = String(carId);
      carsData[key] = Math.max(0, Number(carsData[key] || 0) + 1);
    }

    for (const carId of removed) {
      const key = String(carId);
      carsData[key] = Math.max(0, Number(carsData[key] || 0) - 1);
    }

    usersData[user.uid] = {
      name: usersData[user.uid]?.name || getFirstName(user),
      count: nextState.favorites.length,
      updatedAt: new Date().toISOString(),
    };

    transaction.set(
      statsRef,
      {
        cars: carsData,
        users: usersData,
      },
      { merge: true }
    );
  });
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

  await setDoc(
    doc(db, "users", currentUser.uid),
    {
      favorites: nextState.favorites,
      wishlist: nextState.wishlist,
      compare: nextState.compare,
      darkMode: nextState.darkMode,
      firstName: getFirstName(currentUser),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await updateLeaderboard(currentUser, previousState, nextState);
  console.log("[Firestore Write] leaderboard/stats updated from favorites diff");
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
  updateUserState: persistRemote,
  subscribeUserState,
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
