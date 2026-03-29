import { checkAdmin } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";
import { watchUsers } from "./auth.js";

const loadingState = document.getElementById("users-loading");
const errorState = document.getElementById("users-error");
const emptyState = document.getElementById("users-empty");
const tableBody = document.getElementById("users-table-body");
const totalMetric = document.getElementById("users-total");
const activeMetric = document.getElementById("users-active");
const verifiedMetric = document.getElementById("users-verified");

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

function formatDate(value) {
  const dateValue = toDate(value);
  if (!dateValue) return "-";
  return dateValue.toLocaleDateString();
}

function formatLastActive(user = {}) {
  const dateValue = toDate(user.updatedAt) || toDate(user.createdAt);
  if (!dateValue) return "-";

  const diffMs = Date.now() - dateValue.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diffMs < hour) return "Within 1 hour";
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

function renderUsers(users = []) {
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");

  totalMetric.textContent = String(users.length);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers = users.filter((user) => {
    const lastActive = toDate(user.updatedAt) || toDate(user.createdAt);
    return lastActive && lastActive.getTime() >= sevenDaysAgo;
  }).length;

  const verifiedUsers = users.filter((user) => {
    if (typeof user.emailVerified === "boolean") return user.emailVerified;
    return Boolean(user.email && String(user.email).includes("@"));
  }).length;

  activeMetric.textContent = String(activeUsers);
  verifiedMetric.textContent = String(verifiedUsers);

  if (!users.length) {
    emptyState.classList.remove("hidden");
    tableBody.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");

  tableBody.innerHTML = users
    .sort((a, b) => {
      const dateA = (toDate(a.createdAt) || new Date(0)).getTime();
      const dateB = (toDate(b.createdAt) || new Date(0)).getTime();
      return dateB - dateA;
    })
    .map((user) => {
      const name = user.name || user.firstName || "Velocity Driver";
      const email = user.email || "No email";
      const photo = user.photo || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";
      const favorites = normalizeIds(user.favorites).length;
      const wishlist = normalizeIds(user.wishlist).length;

      return `
        <tr class="align-top">
          <td class="px-4 py-3">
            <img src="${photo}" alt="${name}" class="h-10 w-10 rounded-full object-cover" referrerpolicy="no-referrer" />
          </td>
          <td class="px-4 py-3 font-semibold text-white">${name}</td>
          <td class="px-4 py-3 text-slate-200">${email}</td>
          <td class="px-4 py-3 text-slate-200">${favorites}</td>
          <td class="px-4 py-3 text-slate-200">${wishlist}</td>
          <td class="px-4 py-3 text-slate-300">${formatDate(user.createdAt)}</td>
          <td class="px-4 py-3 text-slate-300">${formatLastActive(user)}</td>
        </tr>
      `;
    })
    .join("");
}

async function initAdminUsersPage() {
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
  } catch (error) {
    loadingState.classList.add("hidden");
    errorState.textContent = error.message || "Admin access required.";
    errorState.classList.remove("hidden");
  }
}

initAdminUsersPage();
