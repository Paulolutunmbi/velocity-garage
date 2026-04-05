import { onAuthChange, isAdmin } from "./auth.js";

const BUTTON = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm md:text-base px-4 py-2 transition";
const ICON_BUTTON = "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-100 transition hover:border-[#ff5d67] hover:text-white";

function themeIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/>
    </svg>
  `;
}

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

    const photo = escapeHtml(user.photoURL || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc");

    mount.innerHTML = `
      <button id="theme-toggle" type="button" class="${ICON_BUTTON}" aria-label="Toggle theme" aria-pressed="false" title="Toggle theme">${themeIconMarkup()}</button>
      <a href="profile.html" class="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 p-1 text-sm text-white" aria-label="Profile">
        <img src="${photo}" alt="Profile" class="h-8 w-8 rounded-full object-cover" referrerpolicy="no-referrer" />
      </a>
      ${isAdmin(user) ? `<a href="admin.html" class="${BUTTON}">Admin</a>` : ""}
    `;

    window.vgUserStore?.bindThemeToggle?.();
  });

  return unsub;
}
