import { checkAdmin } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";
import { watchUsers } from "./auth.js";

const loadingState = document.getElementById("admin-loading");
const errorState = document.getElementById("admin-error");
const emptyState = document.getElementById("admin-empty");
const tableBody = document.getElementById("user-list-body");
const leaderboardCars = document.getElementById("leaderboard-cars");
const leaderboardCarsEmpty = document.getElementById("leaderboard-cars-empty");
const leaderboardUsers = document.getElementById("leaderboard-users");
const leaderboardUsersEmpty = document.getElementById("leaderboard-users-empty");
const leaderboardWishlist = document.getElementById("leaderboard-wishlist");
const leaderboardWishlistEmpty = document.getElementById("leaderboard-wishlist-empty");
const metricPlatformValuation = document.getElementById("metric-platform-valuation");
const metricGrowth = document.getElementById("metric-growth");
const metricActiveTickers = document.getElementById("metric-active-tickers");
const metricTotalUsers = document.getElementById("metric-total-users");
const metricInventory = document.getElementById("metric-inventory");
const metricWishlistTotal = document.getElementById("metric-wishlist-total");
const metricEngagement = document.getElementById("metric-engagement");
const metricLastSync = document.getElementById("metric-last-sync");
const signinChartBars = document.getElementById("signin-chart-bars");
const signinChartLabels = document.getElementById("signin-chart-labels");
const signinChartEmpty = document.getElementById("signin-chart-empty");

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
  if (!value) return "Joined recently";

  const dateValue = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "Joined recently";

  const diffMs = Date.now() - dateValue.getTime();
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

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
}

function toDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    const dateValue = value.toDate();
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function formatCompact(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrencyCompact(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedPercent(value = 0) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function parsePriceToNumber(raw = "") {
  if (!raw) return 0;
  const normalized = String(raw).replaceAll(",", "").trim().toLowerCase();
  const numeric = Number(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;

  if (normalized.includes("b")) return numeric * 1_000_000_000;
  if (normalized.includes("m")) return numeric * 1_000_000;
  if (normalized.includes("k")) return numeric * 1_000;
  return numeric;
}

function getPriceMap() {
  const map = new Map();
  if (!Array.isArray(window.cars)) return map;

  window.cars.forEach((car) => {
    const id = Number(car?.id);
    if (!Number.isFinite(id)) return;
    map.set(id, parsePriceToNumber(car?.price || 0));
  });

  return map;
}

function calculateMoMGrowth(users = []) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let current = 0;
  let previous = 0;

  users.forEach((user) => {
    const dateValue = toDate(user.createdAt) || toDate(user.updatedAt);
    if (!dateValue) return;
    if (dateValue >= currentMonthStart) {
      current += 1;
      return;
    }
    if (dateValue >= previousMonthStart && dateValue < currentMonthStart) {
      previous += 1;
    }
  });

  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return ((current - previous) / previous) * 100;
}

function buildMonthlyTimeline(users = [], monthsBack = 8) {
  const now = new Date();
  const points = [];

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    points.push({
      label: monthStart.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      month: monthStart.getMonth(),
      year: monthStart.getFullYear(),
      count: 0,
    });
  }

  users.forEach((user) => {
    const dateValue = toDate(user.createdAt) || toDate(user.updatedAt);
    if (!dateValue) return;

    const match = points.find((point) => point.month === dateValue.getMonth() && point.year === dateValue.getFullYear());
    if (match) match.count += 1;
  });

  return points;
}

function renderSignInChart(users = []) {
  if (!signinChartBars || !signinChartLabels || !signinChartEmpty) return;

  const timeline = buildMonthlyTimeline(users, 8);
  const hasData = timeline.some((item) => item.count > 0);
  const max = Math.max(1, ...timeline.map((item) => item.count));

  signinChartBars.innerHTML = timeline
    .map((item, index) => {
      const height = Math.max(16, Math.round((item.count / max) * 95));
      const isLatest = index === timeline.length - 1;
      return `<div class="relative flex-1 rounded-t-sm ${isLatest ? "bg-vg-accent shadow-[0_-10px_22px_rgba(255,82,92,0.22)]" : "bg-vg-panel-hi"}" style="height:${height}%" title="${item.label}: ${item.count} sign-ins"></div>`;
    })
    .join("");

  signinChartLabels.innerHTML = timeline.map((item) => `<span>${item.label}</span>`).join("");
  signinChartEmpty.classList.toggle("hidden", hasData);
}

function renderLiveMetrics(users = []) {
  const totalUsers = users.length;
  const inventoryCount = Array.isArray(window.cars) ? window.cars.length : 0;
  const priceById = getPriceMap();

  let wishlistCount = 0;
  let activeTickers = 0;
  let platformValuation = 0;
  let engagedUsers = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  users.forEach((user) => {
    const favorites = normalizeIds(user.favorites);
    const wishlist = normalizeIds(user.wishlist);
    const compare = normalizeIds(user.compare);

    wishlistCount += wishlist.length;

    wishlist.forEach((carId) => {
      platformValuation += priceById.get(Number(carId)) || 0;
    });

    if (favorites.length || wishlist.length || compare.length) engagedUsers += 1;

    const lastActive = toDate(user.updatedAt) || toDate(user.createdAt);
    if (lastActive && lastActive.getTime() >= sevenDaysAgo) activeTickers += 1;
  });

  const engagementRate = totalUsers ? (engagedUsers / totalUsers) * 100 : 0;
  const growth = calculateMoMGrowth(users);

  if (metricPlatformValuation) metricPlatformValuation.textContent = formatCurrencyCompact(platformValuation);
  if (metricGrowth) metricGrowth.textContent = formatSignedPercent(growth);
  if (metricActiveTickers) metricActiveTickers.textContent = formatCompact(activeTickers);
  if (metricTotalUsers) metricTotalUsers.textContent = formatCompact(totalUsers);
  if (metricInventory) metricInventory.textContent = formatCompact(inventoryCount);
  if (metricWishlistTotal) metricWishlistTotal.textContent = formatCompact(wishlistCount);
  if (metricEngagement) metricEngagement.textContent = `${engagementRate.toFixed(1)}%`;

  if (metricLastSync) {
    metricLastSync.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  renderSignInChart(users);
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

function getTopCarsFromUsers(users = []) {
  // Recompute from live users docs so admin leaderboard always reflects current favorites.
  const counts = {};
  users.forEach((user) => {
    normalizeIds(user.favorites).forEach((carId) => {
      const key = String(carId);
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([carId, count]) => ({ carId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getTopUsersFromUsers(users = []) {
  return users
    .map((user) => ({
      uid: user.id,
      firstName: getFirstNameFromUserRecord(user) || shortUid(user.id),
      count: normalizeIds(user.favorites).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getTopWishlistedCarsFromUsers(users = []) {
  // Wishlist leaderboard uses the same live aggregation strategy as favorites.
  const counts = {};
  users.forEach((user) => {
    normalizeIds(user.wishlist).forEach((carId) => {
      const key = String(carId);
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([carId, count]) => ({ carId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function renderTopCars(topCars = []) {
  if (!leaderboardCars || !leaderboardCarsEmpty) return;

  if (!topCars.length) {
    leaderboardCarsEmpty.classList.remove("hidden");
    leaderboardCars.innerHTML = "";
    return;
  }

  leaderboardCarsEmpty.classList.add("hidden");
  leaderboardCars.innerHTML = `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">${topCars
    .map(
      (item, index) => `
      <article class="animate-[riseUp_.35s_ease] rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 text-sm transition hover:-translate-y-0.5 hover:border-orange-400/50 hover:shadow-lg">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <img src="${getCarImageById(item.carId)}" alt="${getCarNameById(item.carId)}" class="h-32 w-full rounded object-cover sm:h-12 sm:w-16" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white md:text-base">${medal(index)} ${getCarNameById(item.carId)}</p>
            <p class="text-xs text-slate-300">Car ID: ${item.carId}</p>
          </div>
          <span class="self-start rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300 sm:self-auto">${item.count} ❤️</span>
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

function renderTopWishlistedCars(topCars = []) {
  if (!leaderboardWishlist || !leaderboardWishlistEmpty) return;

  if (!topCars.length) {
    leaderboardWishlistEmpty.classList.remove("hidden");
    leaderboardWishlist.innerHTML = "";
    return;
  }

  leaderboardWishlistEmpty.classList.add("hidden");
  leaderboardWishlist.innerHTML = `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">${topCars
    .map(
      (item, index) => `
      <article class="animate-[riseUp_.35s_ease] rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 text-sm transition hover:-translate-y-0.5 hover:border-purple-400/40 hover:shadow-lg">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <img src="${getCarImageById(item.carId)}" alt="${getCarNameById(item.carId)}" class="h-32 w-full rounded object-cover sm:h-12 sm:w-16" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white md:text-base">${medal(index)} ${getCarNameById(item.carId)}</p>
            <p class="text-xs text-slate-300">Car ID: ${item.carId}</p>
          </div>
          <span class="self-start rounded-full border border-purple-300/40 bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-200 sm:self-auto">${item.count} ★</span>
        </div>
      </article>
      `
    )
    .join("")}</div>`;
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
        renderLiveMetrics(users);
        // Single snapshot source keeps table + leaderboard cards in sync.
        renderTopCars(getTopCarsFromUsers(users));
        renderTopUsers(getTopUsersFromUsers(users));
        renderTopWishlistedCars(getTopWishlistedCarsFromUsers(users));
      },
      (error) => {
        loadingState.classList.add("hidden");
        errorState.textContent = error.message || "Unable to load users.";
        errorState.classList.remove("hidden");
      }
    );

  } catch (error) {
    loadingState.classList.add("hidden");
    errorState.textContent = error.message || "Unable to access admin.";
    errorState.classList.remove("hidden");
  }
}

initAdmin();
