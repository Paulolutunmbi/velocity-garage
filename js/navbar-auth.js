import { onAuthChange, logout, isAdmin } from "./auth.js";

const BUTTON = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 transition";

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function initAuthNavbar({ mountId = "auth-controls" } = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return () => {};

  mount.innerHTML = '<span class="text-sm text-slate-300">Loading account...</span>';

  const unsub = onAuthChange((user) => {
    if (!user) {
      mount.innerHTML = `
        <a href="login.html" class="${BUTTON}">Login</a>
        <a href="signup.html" class="${BUTTON}">Signup</a>
      `;
      return;
    }

    const name = escapeHtml(user.displayName || user.email || "Driver");
    const photo = escapeHtml(user.photoURL || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc");

    mount.innerHTML = `
      <a href="profile.html" class="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white">
        <img src="${photo}" alt="${name}" class="h-8 w-8 rounded-full object-cover" referrerpolicy="no-referrer" />
        <span class="max-w-[10rem] truncate">${name}</span>
      </a>
      ${isAdmin(user) ? `<a href="admin.html" class="${BUTTON}">Admin</a>` : ""}
      <button id="logout-btn" type="button" class="${BUTTON}">Logout</button>
    `;

    const logoutBtn = mount.querySelector("#logout-btn");
    logoutBtn?.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";
      try {
        await logout();
      } catch (error) {
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";
        alert(error.message || "Unable to logout right now.");
      }
    });
  });

  return unsub;
}
