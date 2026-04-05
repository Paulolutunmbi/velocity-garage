import { checkAdmin } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

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
const signinToggleMonthly = document.getElementById("signin-toggle-monthly");
const signinToggleQuarterly = document.getElementById("signin-toggle-quarterly");
const navUserManagement = document.getElementById("nav-user-management");
const navAnalytics = document.getElementById("nav-analytics");
const openUserManagementBtn = document.getElementById("open-user-management-btn");
const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
const userManagementView = document.getElementById("user-management-view");
const dashboardSections = Array.from(document.querySelectorAll(".dashboard-only"));
const userManagementTotal = document.getElementById("um-total-users");
const userManagementActive = document.getElementById("um-active-users");
const userManagementVerified = document.getElementById("um-verified-users");
const userManagementBanned = document.getElementById("um-banned-users");
const userSearchInput = document.getElementById("user-search-input");
const userSearchClearBtn = document.getElementById("user-search-clear");
const userSearchDropdown = document.getElementById("user-search-dropdown");
const userSearchResults = document.getElementById("user-search-results");
const userSearchLoading = document.getElementById("user-search-loading");
const userSearchEmpty = document.getElementById("user-search-empty");

let signInChartMode = "monthly";
let lastUsersSnapshot = [];
let activeAdminView = "dashboard";
let latestBannedSet = new Set();
let userSearchQuery = "";
let searchDebounceTimer = null;

const ADMIN_EMAIL = "oluwatunmbipaul@gmail.com";

const NAV_ACTIVE_CLASS = "mb-1 flex items-center gap-3 rounded-md border-l-2 border-vg-accent bg-gradient-to-r from-[#ff525c1f] to-transparent px-4 py-3 text-xs font-bold uppercase tracking-wider text-vg-accent";
const NAV_INACTIVE_CLASS = "mb-1 flex items-center gap-3 rounded-md px-4 py-3 text-xs font-bold uppercase tracking-wider text-vg-muted hover:bg-vg-panel hover:text-white";

function ensureLeaderboardAnimations() {
  if (document.getElementById("vg-admin-anim")) return;
  const style = document.createElement("style");
  style.id = "vg-admin-anim";
  style.textContent = "@keyframes riseUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(style);
}

function isPrivilegedAdmin() {
  return (auth.currentUser?.email || "").toLowerCase() === ADMIN_EMAIL;
}

function canManageUsersOrWarn() {
  if (isPrivilegedAdmin()) return true;

  const message = `Only ${ADMIN_EMAIL} can manage users.`;
  alert(message);
  return false;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortUid(uid = "") {
  return uid ? `${uid.slice(0, 6)}...` : "Driver";
}

function getUserStatus(user = {}) {
  return latestBannedSet.has(user.uid || user.id) || String(user.status || "active").toLowerCase() === "banned"
    ? "banned"
    : "active";
}

function filterUsersByQuery(users = []) {
  const q = userSearchQuery.trim().toLowerCase();
  if (!q) return users;

  return users.filter((user) => {
    const name = String(user.name || "").toLowerCase();
    const email = String(user.email || "").toLowerCase();
    const status = getUserStatus(user);
    return name.includes(q) || email.includes(q) || status.includes(q);
  });
}

function showSearchDropdown(show) {
  if (!userSearchDropdown) return;
  userSearchDropdown.classList.toggle("hidden", !show);
}

function updateSearchDropdown(users = []) {
  if (!userSearchDropdown || !userSearchResults || !userSearchLoading || !userSearchEmpty) return;

  const q = userSearchQuery.trim();
  if (!q) {
    showSearchDropdown(false);
    userSearchResults.innerHTML = "";
    userSearchLoading.classList.add("hidden");
    userSearchEmpty.classList.add("hidden");
    return;
  }

  showSearchDropdown(true);
  userSearchLoading.classList.remove("hidden");
  userSearchEmpty.classList.add("hidden");
  userSearchResults.innerHTML = "";

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const matches = filterUsersByQuery(users).slice(0, 8);
    userSearchLoading.classList.add("hidden");

    if (!matches.length) {
      userSearchEmpty.classList.remove("hidden");
      return;
    }

    userSearchEmpty.classList.add("hidden");
    userSearchResults.innerHTML = matches
      .map((user) => {
        const status = getUserStatus(user);
        const statusChip = status === "banned"
          ? '<span class="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-200">Banned</span>'
          : '<span class="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">Active</span>';

        return `
          <li>
            <button type="button" data-user-id="${user.id}" class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-vg-panel-hi/35">
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-white">${escapeHtml(user.name || "Velocity Driver")}</span>
                <span class="block truncate text-xs text-vg-muted">${escapeHtml(user.email || "No email")}</span>
              </span>
              ${statusChip}
            </button>
          </li>
        `;
      })
      .join("");
  }, 140);
}

function bindUserSearchControls() {
  if (!userSearchInput || userSearchInput.dataset.bound === "true") return;
  userSearchInput.dataset.bound = "true";

  userSearchInput.addEventListener("input", (event) => {
    userSearchQuery = event.target.value || "";
    userSearchClearBtn?.classList.toggle("hidden", !userSearchQuery.trim());
    renderUsers(lastUsersSnapshot);
    updateSearchDropdown(lastUsersSnapshot);
  });

  userSearchInput.addEventListener("focus", () => {
    if (userSearchQuery.trim()) updateSearchDropdown(lastUsersSnapshot);
  });

  userSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      showSearchDropdown(false);
      userSearchInput.blur();
    }
  });

  userSearchClearBtn?.addEventListener("click", () => {
    userSearchQuery = "";
    userSearchInput.value = "";
    userSearchClearBtn.classList.add("hidden");
    showSearchDropdown(false);
    renderUsers(lastUsersSnapshot);
  });

  userSearchResults?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-user-id]");
    if (!button) return;

    const selectedId = button.getAttribute("data-user-id");
    const selectedUser = lastUsersSnapshot.find((item) => item.id === selectedId);
    if (!selectedUser) return;

    userSearchQuery = selectedUser.name || selectedUser.email || "";
    userSearchInput.value = userSearchQuery;
    userSearchClearBtn?.classList.toggle("hidden", !userSearchQuery.trim());
    showSearchDropdown(false);
    renderUsers(lastUsersSnapshot);
  });

  document.addEventListener("click", (event) => {
    if (!userSearchDropdown || !userSearchInput) return;
    const container = userSearchDropdown.parentElement;
    if (!container) return;
    if (!container.contains(event.target)) showSearchDropdown(false);
  });
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

function formatLastActive(value) {
  if (!value) return "-";

  const dateValue = toDate(value);
  if (!dateValue) return "-";

  const diffMs = Date.now() - dateValue.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diffMs < hour) return "Within 1 hour";
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

function setAdminView(view = "dashboard") {
  activeAdminView = view;
  const showUsers = view === "users";

  dashboardSections.forEach((section) => {
    section.classList.toggle("hidden", showUsers);
  });

  if (userManagementView) {
    userManagementView.classList.toggle("hidden", !showUsers);
  }

  if (navAnalytics) navAnalytics.className = showUsers ? NAV_INACTIVE_CLASS : NAV_ACTIVE_CLASS;
  if (navUserManagement) navUserManagement.className = showUsers ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS;
}

function bindInternalViewSwitching() {
  navAnalytics?.addEventListener("click", (event) => {
    event.preventDefault();
    setAdminView("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  navUserManagement?.addEventListener("click", (event) => {
    event.preventDefault();
    setAdminView("users");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  openUserManagementBtn?.addEventListener("click", () => {
    setAdminView("users");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  backToDashboardBtn?.addEventListener("click", () => {
    setAdminView("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (window.location.hash === "#user-management-view") {
    setAdminView("users");
  } else {
    setAdminView("dashboard");
  }
}

function normalizeUsersFromSnapshot(snapshot) {
  const byUid = new Map();

  snapshot.docs.forEach((snap) => {
    const data = snap.data() || {};
    const docId = String(snap.id || "").trim();
    const storedUid = String(data.uid || "").trim();

    if (!docId) return;
    // Canonical identity is users/{uid}. Skip legacy docs whose id does not match their stored uid.
    if (storedUid && storedUid !== docId) return;

    byUid.set(docId, {
      ...data,
      id: docId,
      uid: docId,
    });
  });

  return Array.from(byUid.values());
}

// Keeps /users and /bannedUsers synchronized from one realtime source for the UI.
function watchUsersWithBanState(onData, onError) {
  let latestUsers = [];

  const emit = () => {
    const merged = latestUsers.map((user) => ({
      ...user,
      status: getUserStatus(user),
    }));

    onData(merged);
  };

  const unsubUsers = onSnapshot(
    query(collection(db, "users")),
    (snapshot) => {
      latestUsers = normalizeUsersFromSnapshot(snapshot);
      emit();
    },
    onError
  );

  const unsubBanned = onSnapshot(
    query(collection(db, "bannedUsers")),
    (snapshot) => {
      latestBannedSet = new Set(
        snapshot.docs
          .map((snap) => snap.id || snap.data()?.uid)
          .filter(Boolean)
      );
      emit();
    },
    onError
  );

  return () => {
    unsubUsers?.();
    unsubBanned?.();
  };
}

async function setUserStatus(user, nextStatus) {
  if (!user?.id) return;
  if (!canManageUsersOrWarn()) return;

  // User documents are rendered by doc id, while Firebase Auth UID is stored as user.uid.
  const userDocId = user.id;
  const uid = user.uid || user.id;
  const userRef = doc(db, "users", userDocId);
  const bannedRef = doc(db, "bannedUsers", uid);

  if (nextStatus === "banned") {
    await setDoc(
      bannedRef,
      {
        uid,
        email: user.email || "",
        name: user.name || "Velocity Driver",
        status: "banned",
        bannedAt: serverTimestamp(),
        bannedBy: auth.currentUser?.email || ADMIN_EMAIL,
      },
      { merge: true }
    );

    await setDoc(
      userRef,
      {
        status: "banned",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  await deleteDoc(bannedRef);
  await setDoc(
    userRef,
    {
      status: "active",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function bindDeleteControls() {
  if (tableBody?.dataset.userActionsBound === "true") return;
  if (!tableBody) return;

  tableBody.dataset.userActionsBound = "true";

  tableBody.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) return;

    const userId = actionBtn.getAttribute("data-user-id");
    if (!userId) return;
    const user = lastUsersSnapshot.find((item) => item.id === userId);
    if (!user) return;

    const action = actionBtn.getAttribute("data-action");

    if (action === "ban-user") {
      setUserStatus(user, "banned").catch((error) => {
        alert(error.message || "Unable to ban user.");
      });
      return;
    }

    if (action === "unban-user") {
      setUserStatus(user, "active").catch((error) => {
        alert(error.message || "Unable to unban user.");
      });
      return;
    }
  });
}

function renderUsers(users) {
  lastUsersSnapshot = Array.isArray(users) ? users : [];
  const filteredUsers = filterUsersByQuery(lastUsersSnapshot);

  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers = users.filter((user) => {
    const lastActive = toDate(user.updatedAt) || toDate(user.createdAt);
    return lastActive && lastActive.getTime() >= sevenDaysAgo;
  }).length;
  const verifiedUsers = users.filter((user) => {
    if (typeof user.emailVerified === "boolean") return user.emailVerified;
    return Boolean(user.email && String(user.email).includes("@"));
  }).length;

  if (userManagementTotal) userManagementTotal.textContent = String(users.length);
  if (userManagementActive) userManagementActive.textContent = String(activeUsers);
  if (userManagementVerified) userManagementVerified.textContent = String(verifiedUsers);
  if (userManagementBanned) userManagementBanned.textContent = String(latestBannedSet.size);

  if (!users.length) {
    emptyState.classList.remove("hidden");
    tableBody.innerHTML = "";
    return;
  }

  if (!filteredUsers.length) {
    emptyState.classList.remove("hidden");
    emptyState.textContent = "No users found for this search.";
    tableBody.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");
  emptyState.textContent = "No users found in Firestore yet.";

  tableBody.innerHTML = filteredUsers
    .map((user) => {
      const name = user.name || "Velocity Driver";
      const email = user.email || "No email";
      const photo = user.photo || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";
      const createdAt = formatJoinDate(user.createdAt);
      const favorites = normalizeIds(user.favorites).length;
      const wishlist = normalizeIds(user.wishlist).length;
      const lastActive = formatLastActive(user.updatedAt || user.createdAt);
      const status = getUserStatus(user);
      const statusChip = status === "banned"
        ? '<span class="inline-flex rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-200">Banned</span>'
        : '<span class="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">Active</span>';
      const statusActionBtn = status === "banned"
        ? `<button type="button" data-action="unban-user" data-user-id="${user.id}" class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200 hover:bg-emerald-500/20">Unban</button>`
        : `<button type="button" data-action="ban-user" data-user-id="${user.id}" class="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-yellow-200 hover:bg-yellow-500/20">Ban</button>`;

      return `
        <tr class="border-b border-slate-700/70">
          <td class="px-4 py-3">
            <img src="${photo}" alt="${name}" class="h-10 w-10 rounded-full object-cover" referrerpolicy="no-referrer" />
          </td>
          <td class="px-4 py-3">
            <span class="font-semibold text-white">${name}</span>
          </td>
          <td class="px-4 py-3 text-slate-200">${email}</td>
          <td class="px-4 py-3">${statusChip}</td>
          <td class="px-4 py-3 text-slate-300">${favorites}</td>
          <td class="px-4 py-3 text-slate-300">${wishlist}</td>
          <td class="px-4 py-3 text-slate-300">${createdAt}</td>
          <td class="px-4 py-3 text-slate-300">${lastActive}</td>
          <td class="px-4 py-3 text-slate-200">
            <div class="flex flex-wrap items-center gap-2">${statusActionBtn}</div>
          </td>
        </tr>
      `;
    })
    .join("");

  updateSearchDropdown(lastUsersSnapshot);
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

function buildQuarterlyTimeline(users = [], quartersBack = 6) {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const points = [];

  for (let offset = quartersBack - 1; offset >= 0; offset -= 1) {
    const qIndex = currentQuarter - offset;
    const year = now.getFullYear() + Math.floor(qIndex / 4);
    const quarter = ((qIndex % 4) + 4) % 4;
    points.push({
      label: `Q${quarter + 1} ${String(year).slice(-2)}`,
      year,
      quarter,
      count: 0,
    });
  }

  users.forEach((user) => {
    const dateValue = toDate(user.createdAt) || toDate(user.updatedAt);
    if (!dateValue) return;
    const quarter = Math.floor(dateValue.getMonth() / 3);
    const year = dateValue.getFullYear();
    const match = points.find((point) => point.year === year && point.quarter === quarter);
    if (match) match.count += 1;
  });

  return points;
}

function renderChartModeButtons() {
  if (!signinToggleMonthly || !signinToggleQuarterly) return;

  const monthlyActive = signInChartMode === "monthly";
  signinToggleMonthly.className = monthlyActive
    ? "border-b border-vg-accent text-[10px] font-bold uppercase tracking-[0.2em] text-vg-accent"
    : "text-[10px] font-bold uppercase tracking-[0.2em] text-vg-muted/45 hover:text-vg-muted";

  signinToggleQuarterly.className = !monthlyActive
    ? "border-b border-vg-accent text-[10px] font-bold uppercase tracking-[0.2em] text-vg-accent"
    : "text-[10px] font-bold uppercase tracking-[0.2em] text-vg-muted/45 hover:text-vg-muted";
}

function bindChartModeControls() {
  if (signinToggleMonthly && signinToggleMonthly.dataset.bound !== "true") {
    signinToggleMonthly.dataset.bound = "true";
    signinToggleMonthly.addEventListener("click", () => {
      signInChartMode = "monthly";
      renderChartModeButtons();
      renderSignInChart(lastUsersSnapshot);
    });
  }

  if (signinToggleQuarterly && signinToggleQuarterly.dataset.bound !== "true") {
    signinToggleQuarterly.dataset.bound = "true";
    signinToggleQuarterly.addEventListener("click", () => {
      signInChartMode = "quarterly";
      renderChartModeButtons();
      renderSignInChart(lastUsersSnapshot);
    });
  }

  renderChartModeButtons();
}

function renderSignInChart(users = []) {
  if (!signinChartBars || !signinChartLabels || !signinChartEmpty) return;

  const timeline = signInChartMode === "quarterly"
    ? buildQuarterlyTimeline(users, 6)
    : buildMonthlyTimeline(users, 8);
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
  lastUsersSnapshot = Array.isArray(users) ? users : [];

  const totalUsers = users.length;
  const inventoryCount = Array.isArray(window.cars) ? window.cars.length : 0;
  const priceById = getPriceMap();

  let wishlistCount = 0;
  let activeTickers = 0;
  let wishlistValuation = 0;
  let favoritesValuation = 0;
  let engagedUsers = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  users.forEach((user) => {
    const favorites = normalizeIds(user.favorites);
    const wishlist = normalizeIds(user.wishlist);
    const compare = normalizeIds(user.compare);

    wishlistCount += wishlist.length;

    wishlist.forEach((carId) => {
      wishlistValuation += priceById.get(Number(carId)) || 0;
    });

    favorites.forEach((carId) => {
      favoritesValuation += priceById.get(Number(carId)) || 0;
    });

    if (favorites.length || wishlist.length || compare.length) engagedUsers += 1;

    const lastActive = toDate(user.updatedAt) || toDate(user.createdAt);
    if (lastActive && lastActive.getTime() >= sevenDaysAgo) activeTickers += 1;
  });

  const engagementRate = totalUsers ? (engagedUsers / totalUsers) * 100 : 0;
  const growth = calculateMoMGrowth(users);
  const inventoryBaseValuation = Array.from(priceById.values()).reduce((sum, value) => sum + value, 0);
  // Blend inventory base value with observed demand so valuation remains meaningful and live.
  const platformValuation = inventoryBaseValuation + wishlistValuation + (favoritesValuation * 0.35);

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
  const peak = Math.max(1, ...topCars.map((item) => item.count));
  leaderboardWishlist.innerHTML = `<div class="grid grid-cols-1 gap-3">${topCars
    .map(
      (item, index) => `
      <article class="animate-[riseUp_.35s_ease] rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 text-sm transition hover:-translate-y-0.5 hover:border-purple-400/40 hover:shadow-lg">
        <div class="flex items-start gap-3">
          <img src="${getCarImageById(item.carId)}" alt="${getCarNameById(item.carId)}" class="h-12 w-16 shrink-0 rounded object-cover" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">${medal(index)} ${getCarNameById(item.carId)}</p>
            <p class="text-xs text-slate-300">Car ID: ${item.carId}</p>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
              <div class="h-full rounded-full bg-purple-400/80" style="width:${Math.max(8, (item.count / peak) * 100)}%"></div>
            </div>
          </div>
          <span class="rounded-full border border-purple-300/40 bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-200">${item.count} ★</span>
        </div>
      </article>
      `
    )
    .join("")}</div>`;
}

async function initAdmin() {
  try {
    ensureLeaderboardAnimations();
    bindInternalViewSwitching();
    bindDeleteControls();
    bindUserSearchControls();
    bindChartModeControls();
    await checkAdmin();
    initAuthNavbar();
    window.vgUserStore?.bindThemeToggle?.();

    // Real-time listener combines /users and /bannedUsers so status updates instantly.
    watchUsersWithBanState(
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
