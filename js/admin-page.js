import { checkAdmin } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";
import { watchUsers } from "./auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const loadingState = document.getElementById("admin-loading");
const errorState = document.getElementById("admin-error");
const emptyState = document.getElementById("admin-empty");
const tableBody = document.getElementById("user-list-body");
const leaderboardCars = document.getElementById("leaderboard-cars");
const leaderboardCarsEmpty = document.getElementById("leaderboard-cars-empty");
const leaderboardUsers = document.getElementById("leaderboard-users");
const leaderboardUsersEmpty = document.getElementById("leaderboard-users-empty");

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

function renderLeaderboardCars(data = {}) {
  if (!leaderboardCars || !leaderboardCarsEmpty) return;

  const sorted = Object.entries(data)
    .map(([carId, count]) => ({ carId, count: Number(count || 0) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (!sorted.length) {
    leaderboardCarsEmpty.classList.remove("hidden");
    leaderboardCars.innerHTML = "";
    return;
  }

  leaderboardCarsEmpty.classList.add("hidden");
  leaderboardCars.innerHTML = sorted
    .map(
      (item, index) => `
      <li class="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 text-xs font-bold text-yellow-300">${index + 1}</span>
          <span class="font-semibold text-white">${getCarNameById(item.carId)}</span>
        </div>
        <span class="rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">${item.count} favorites</span>
      </li>
      `
    )
    .join("");
}

function renderLeaderboardUsers(data = {}) {
  if (!leaderboardUsers || !leaderboardUsersEmpty) return;

  const sorted = Object.entries(data)
    .map(([uid, value]) => ({
      uid,
      firstName: value?.name || "Driver",
      favoriteCount: Number(value?.count || 0),
    }))
    .filter((item) => item.favoriteCount > 0)
    .sort((a, b) => b.favoriteCount - a.favoriteCount)
    .slice(0, 10);

  if (!sorted.length) {
    leaderboardUsersEmpty.classList.remove("hidden");
    leaderboardUsers.innerHTML = "";
    return;
  }

  leaderboardUsersEmpty.classList.add("hidden");
  leaderboardUsers.innerHTML = sorted
    .map(
      (item, index) => `
      <li class="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">${index + 1}</span>
          <span class="font-semibold text-white">${item.firstName}</span>
        </div>
        <span class="rounded-full border border-blue-300/40 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">${item.favoriteCount} favorites</span>
      </li>
      `
    )
    .join("");
}

function watchLeaderboard() {
  onSnapshot(doc(db, "leaderboard", "stats"), (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : {};
    renderLeaderboardCars(data?.cars || {});
    renderLeaderboardUsers(data?.users || {});
  }, (error) => {
    console.error("[Firestore Read Error] leaderboard/stats", error);
    renderLeaderboardCars({});
    renderLeaderboardUsers({});
  });
}

async function initAdmin() {
  try {
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

    watchLeaderboard();
  } catch (error) {
    loadingState.classList.add("hidden");
    errorState.textContent = error.message || "Unable to access admin.";
    errorState.classList.remove("hidden");
  }
}

initAdmin();
