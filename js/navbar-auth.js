import { onAuthChange, logout, isAdmin } from "./auth.js";

const BUTTON = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm md:text-base px-4 py-2 transition";

function bindResponsiveNavbar(mount) {
  const menuContainer = mount?.parentElement;
  const navRoot = menuContainer?.parentElement;

  if (!menuContainer || !navRoot || menuContainer.dataset.vgResponsiveBound === "true") return;

  menuContainer.dataset.vgResponsiveBound = "true";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.id = "navbar-toggle";
  toggleButton.className = `${BUTTON} inline-flex items-center gap-2 md:hidden`;
  toggleButton.setAttribute("aria-expanded", "false");
  toggleButton.setAttribute("aria-controls", "navbar-menu");
  toggleButton.innerHTML = `
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16"/>
    </svg>
    <span>Menu</span>
  `;

  menuContainer.id = menuContainer.id || "navbar-menu";
  menuContainer.classList.add("md:flex", "md:w-auto");

  const closeMenu = () => {
    if (window.innerWidth >= 768) return;
    menuContainer.classList.add("hidden");
    menuContainer.classList.remove("flex", "flex-col", "items-stretch");
    toggleButton.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menuContainer.classList.remove("hidden");
    menuContainer.classList.add("flex", "flex-col", "items-stretch");
    toggleButton.setAttribute("aria-expanded", "true");
  };

  const syncMenuForViewport = () => {
    if (window.innerWidth >= 768) {
      menuContainer.classList.remove("hidden", "flex-col", "items-stretch");
      menuContainer.classList.add("flex");
      toggleButton.setAttribute("aria-expanded", "false");
      return;
    }

    closeMenu();
  };

  toggleButton.addEventListener("click", () => {
    const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
    if (isExpanded) closeMenu();
    else openMenu();
  });

  menuContainer.addEventListener("click", (event) => {
    const target = event.target.closest("a, button");
    if (!target) return;
    closeMenu();
  });

  navRoot.insertBefore(toggleButton, menuContainer);
  window.addEventListener("resize", syncMenuForViewport);
  syncMenuForViewport();
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

  bindResponsiveNavbar(mount);

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
      <a href="wishlist.html" class="${BUTTON}">Wishlist</a>
      <button id="theme-toggle" type="button" class="${BUTTON}">Light Mode</button>
      <a href="profile.html" class="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white">
        <img src="${photo}" alt="${name}" class="h-8 w-8 rounded-full object-cover" referrerpolicy="no-referrer" />
        <span class="max-w-[10rem] truncate">${name}</span>
      </a>
      ${isAdmin(user) ? `<a href="admin.html" class="${BUTTON}">Admin</a>` : ""}
      <button id="logout-btn" type="button" class="${BUTTON}">Logout</button>
    `;

    window.vgUserStore?.bindThemeToggle?.();

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
