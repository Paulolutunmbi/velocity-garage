import { checkAdmin } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";
import { watchUsers } from "./auth.js";
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const loadingState = document.getElementById("admin-loading");
const errorState = document.getElementById("admin-error");
const emptyState = document.getElementById("admin-empty");
const tableBody = document.getElementById("user-list-body");
const leaderboardCars = document.getElementById("leaderboard-cars");
const leaderboardCarsEmpty = document.getElementById("leaderboard-cars-empty");
const leaderboardUsers = document.getElementById("leaderboard-users");
const leaderboardUsersEmpty = document.getElementById("leaderboard-users-empty");
let hasAttemptedLeaderboardRecovery = false;

function ensureLeaderboardAnimations() {
  if (document.getElementById("vg-admin-anim")) return;
  const style = document.createElement("style");
  style.id = "vg-admin-anim";
  style.textContent = "@keyframes riseUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(style);
}

function shortUid(uid = "") {
  return uid ? `${uid.slice(0, 6)}...` : "Driver";
}

function formatJoinDate(value) {
  if (!value) return "Not available";
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  return String(value);
}

function renderUsers(users) {
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");

  if (!users.length) {
    emptyState.classList.remove("hidden");
    tableBody.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");

  tableBody.innerHTML = users
    .map((user) => {
      const name = user.name || "Velocity Driver";
      const email = user.email || "No email";
      const photo = user.photo || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";
      const createdAt = formatJoinDate(user.createdAt);

      return `
        <tr class="border-b border-slate-700/70">
          <td class="px-4 py-3">
            <img src="${photo}" alt="${name}" class="h-10 w-10 rounded-full object-cover" referrerpolicy="no-referrer" />
          </td>
          <td class="px-4 py-3">
            <span class="font-semibold text-white">${name}</span>
          </td>
          <td class="px-4 py-3 text-slate-200">${email}</td>
          <td class="px-4 py-3 text-slate-300">${createdAt}</td>
        </tr>
      `;
    })
    .join("");
}

function getCarNameById(id) {
  const car = Array.isArray(window.cars) ? window.cars.find((item) => Number(item.id) === Number(id)) : null;
  return car?.name || `Car #${id}`;
}

function getCarImageById(id) {
  const car = Array.isArray(window.cars) ? window.cars.find((item) => Number(item.id) === Number(id)) : null;
  return car?.image || window.CAR_IMAGE_FALLBACK || "";
}

function medal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
}

function normalizeTopCars(data = {}) {
  return Object.entries(data)
    .map(([carId, count]) => ({
      carId,
      count: Math.max(0, Number(count || 0)),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function normalizeTopUsers(data = {}) {
  return Object.entries(data)
    .map(([uid, value]) => {
      const count = Math.max(0, Number(typeof value === "number" ? value : value?.count || 0));
      const nameSource = String(typeof value === "object" ? value?.name || "" : "").trim();
      const firstName = nameSource ? nameSource.split(/\s+/)[0] : shortUid(uid);

      return {
        uid,
        firstName,
        count,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getFirstNameFromUserRecord(user = {}) {
  const fromFirstName = String(user.firstName || "").trim();
  if (fromFirstName) return fromFirstName.split(/\s+/)[0];

  const fromName = String(user.name || "").trim();
  if (fromName) return fromName.split(/\s+/)[0];

  const fromEmail = String(user.email || "").trim();
  if (fromEmail) return fromEmail.split("@")[0];

  return "Driver";
}

async function rebuildLeaderboardFromUsersOnce() {
  if (hasAttemptedLeaderboardRecovery) return;
  hasAttemptedLeaderboardRecovery = true;

  try {
    console.log("[Leaderboard Recovery] rebuilding leaderboard/stats from users collection");
    const usersSnap = await getDocs(collection(db, "users"));

    const cars = {};
    const users = {};

    usersSnap.docs.forEach((userDoc) => {
      const data = userDoc.data() || {};
      const uid = userDoc.id;
      const favorites = Array.isArray(data.favorites) ? [...new Set(data.favorites.map(Number).filter((id) => Number.isFinite(id) && id > 0))] : [];

      users[uid] = {
        count: favorites.length,
        name: getFirstNameFromUserRecord(data),
        updatedAt: serverTimestamp(),
      };

      favorites.forEach((carId) => {
        const key = String(carId);
        cars[key] = (cars[key] || 0) + 1;
      });
    });

    await setDoc(
      doc(db, "leaderboard", "stats"),
      {
        cars,
        users,
        recoveredAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[Leaderboard Recovery] completed", { carsCount: Object.keys(cars).length, usersCount: Object.keys(users).length });
  } catch (error) {
    console.error("[Leaderboard Recovery] failed", error);
  }
}

function renderTopCars(topCars = []) {
  if (!leaderboardCars || !leaderboardCarsEmpty) return;

  if (!topCars.length) {
    leaderboardCarsEmpty.classList.remove("hidden");
    leaderboardCars.innerHTML = "";
    return;
  }

  leaderboardCarsEmpty.classList.add("hidden");
  leaderboardCars.innerHTML = `<div class="grid gap-3 sm:grid-cols-2">${topCars
    .map(
      (item, index) => `
      <article class="animate-[riseUp_.35s_ease] rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 text-sm transition hover:-translate-y-0.5 hover:border-orange-400/50 hover:shadow-lg">
        <div class="flex items-center gap-3">
          <img src="${getCarImageById(item.carId)}" alt="${getCarNameById(item.carId)}" class="h-12 w-16 rounded object-cover" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-white">${medal(index)} ${getCarNameById(item.carId)}</p>
            <p class="text-xs text-slate-300">Car ID: ${item.carId}</p>
          </div>
          <span class="rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">${item.count} ❤️</span>
        </div>
      </article>
      `
    )
    .join("")}</div>`;
}

function renderTopUsers(topUsers = []) {
  if (!leaderboardUsers || !leaderboardUsersEmpty) return;

  if (!topUsers.length) {
    leaderboardUsersEmpty.classList.remove("hidden");
    leaderboardUsers.innerHTML = "";
    return;
  }

  leaderboardUsersEmpty.classList.add("hidden");
  leaderboardUsers.innerHTML = `<div class="grid gap-3">${topUsers
    .map(
      (item, index) => `
      <article class="animate-[riseUp_.35s_ease] flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm transition hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-lg">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">${medal(index)}</span>
          <span class="font-semibold text-white">${item.firstName}</span>
        </div>
        <span class="rounded-full border border-blue-300/40 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">${item.count} ❤️</span>
      </article>
      `
    )
    .join("")}</div>`;
}

function loadLeaderboard() {
  onSnapshot(doc(db, "leaderboard", "stats"), (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : {};
    const topCars = normalizeTopCars(data?.cars || {});
    const topUsers = normalizeTopUsers(data?.users || {});
    console.log("[Leaderboard] top cars:", topCars, "top users:", topUsers);

    if (!topCars.length && !topUsers.length) {
      rebuildLeaderboardFromUsersOnce();
    }

    renderTopCars(topCars);
    renderTopUsers(topUsers);
  }, (error) => {
    console.error("[Firestore Read Error] leaderboard/stats", error);
    renderTopCars([]);
    renderTopUsers([]);
  });
}

async function initAdmin() {
  try {
    ensureLeaderboardAnimations();
    await checkAdmin();
    initAuthNavbar();
    window.vgUserStore?.bindThemeToggle?.();

    watchUsers(
      (users) => {
        renderUsers(users);
      },
      (error) => {
        loadingState.classList.add("hidden");
        errorState.textContent = error.message || "Unable to load users.";
        errorState.classList.remove("hidden");
      }
    );

    loadLeaderboard();
  } catch (error) {
    loadingState.classList.add("hidden");
    errorState.textContent = error.message || "Unable to access admin.";
    errorState.classList.remove("hidden");
  }
}

initAdmin();
