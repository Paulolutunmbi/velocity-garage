const FAVORITES_KEY = "vg-favorites";
const COMPARE_KEY = "vg-compare";
const THEME_KEY = "vg-theme";
const MAX_COMPARE = 3;

const state = {
  favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")),
  compare: new Set(JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]")),
  currentModalCarId: null,
};

const elements = {
  favoritesContainer: document.getElementById("favorites-container"),
  favoritesEmpty: document.getElementById("favorites-empty"),
  compareQuickInfo: document.getElementById("compare-quick-info"),
  notification: document.getElementById("notification"),
  modal: document.getElementById("modal"),
  modalClose: document.getElementById("modal-close"),
  modalName: document.getElementById("modal-name"),
  modalCarousel: document.getElementById("modal-carousel"),
  modalBrand: document.getElementById("modal-brand"),
  modalMaker: document.getElementById("modal-maker"),
  modalCountry: document.getElementById("modal-country"),
  modalHp: document.getElementById("modal-hp"),
  modalSpeed: document.getElementById("modal-speed"),
  modalPrice: document.getElementById("modal-price"),
  modalDesc: document.getElementById("modal-desc"),
  modalCompare: document.getElementById("modal-compare"),
  modalFav: document.getElementById("modal-fav"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
};

function carImage(car) {
  return car.image || car.images?.[0] || CAR_IMAGE_FALLBACK;
}

function persistSets() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  localStorage.setItem(COMPARE_KEY, JSON.stringify([...state.compare]));
}

function showNotification(message) {
  if (!elements.notification) return;
  elements.notification.textContent = message;
  elements.notification.classList.remove("hidden");
  setTimeout(() => elements.notification.classList.add("hidden"), 1700);
}

function updateCompareQuickInfo() {
  if (!elements.compareQuickInfo) return;
  const count = state.compare.size;
  elements.compareQuickInfo.textContent = count
    ? `Compare list: ${count}/3 ready`
    : "Compare list: 0/3";
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    showNotification("Removed from Favorites");
  } else {
    state.favorites.add(id);
    showNotification("Added to Favorites");
  }

  persistSets();
  renderFavoritesPage();
  updateModalButtons();
}

function toggleCompare(id) {
  if (state.compare.has(id)) {
    state.compare.delete(id);
    showNotification("Removed from Compare");
  } else {
    if (state.compare.size >= MAX_COMPARE) {
      showNotification("You can compare up to 3 cars only");
      return;
    }
    state.compare.add(id);
    showNotification("Added to Compare");
  }

  persistSets();
  updateCompareQuickInfo();
  renderFavoritesPage();
  updateModalButtons();
}

function favoritesTemplate(car) {
  const isCompare = state.compare.has(car.id);

  return `
    <article class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <div class="relative overflow-hidden rounded-xl">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-56 w-full object-cover transition duration-500 hover:scale-105">
        <span class="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">${car.brand}</span>
      </div>
      <h3 class="mt-4 text-xl font-bold">${car.name}</h3>
      <div class="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <p class="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">${car.hp}</p>
        <p class="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">${car.speed}</p>
        <p class="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">${car.price}</p>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button data-action="details" data-id="${car.id}" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black dark:bg-slate-100 dark:text-slate-900">Details</button>
        <button data-action="compare" data-id="${car.id}" class="rounded-lg px-3 py-2 text-xs font-semibold transition ${isCompare ? "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "bg-blue-500 text-white hover:bg-blue-600"}">${isCompare ? "Remove Compare" : "Add Compare"}</button>
        <button data-action="favorite" data-id="${car.id}" class="rounded-lg bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">Unfavorite</button>
      </div>
    </article>
  `;
}

function renderFavoritesPage() {
  if (!elements.favoritesContainer || !elements.favoritesEmpty) return;

  const favoriteCars = [...state.favorites]
    .map((id) => getCarById(id))
    .filter(Boolean);

  if (!favoriteCars.length) {
    elements.favoritesContainer.innerHTML = "";
    elements.favoritesEmpty.classList.remove("hidden");
    updateCompareQuickInfo();
    return;
  }

  elements.favoritesEmpty.classList.add("hidden");
  elements.favoritesContainer.innerHTML = favoriteCars.map(favoritesTemplate).join("");
  updateCompareQuickInfo();
}

function openModal(id) {
  const car = getCarById(id);
  if (!car || !elements.modal) return;

  state.currentModalCarId = id;
  elements.modalName.textContent = car.name;
  elements.modalBrand.textContent = car.brand;
  elements.modalMaker.textContent = car.maker;
  elements.modalCountry.textContent = car.country;
  elements.modalHp.textContent = car.hp;
  elements.modalSpeed.textContent = car.speed;
  elements.modalPrice.textContent = car.price;
  elements.modalDesc.textContent = car.description;
  elements.modalCarousel.innerHTML = `<img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-full w-full object-cover">`;

  updateModalButtons();
  elements.modal.classList.remove("hidden");
  elements.modal.classList.add("flex");
}

function closeModal() {
  if (!elements.modal) return;
  elements.modal.classList.add("hidden");
  elements.modal.classList.remove("flex");
}

function updateModalButtons() {
  if (!elements.modalCompare || !elements.modalFav || state.currentModalCarId === null) return;

  const isFav = state.favorites.has(state.currentModalCarId);
  const isCompare = state.compare.has(state.currentModalCarId);

  elements.modalCompare.textContent = isCompare ? "Remove from Compare" : "Add to Compare";
  elements.modalCompare.className = `rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${isCompare ? "bg-slate-500 hover:bg-slate-600" : "bg-blue-500 hover:bg-blue-600"}`;

  elements.modalFav.textContent = isFav ? "Remove from Favorites" : "Add to Favorites";
  elements.modalFav.className = `rounded-xl px-4 py-2 text-sm font-semibold transition ${isFav ? "bg-slate-300 text-black hover:bg-slate-200" : "bg-amber-400 text-black hover:bg-amber-300"}`;
}

function updateThemeIcon() {
  if (!elements.themeIcon) return;
  const isDark = document.documentElement.classList.contains("dark");
  elements.themeIcon.innerHTML = isDark
    ? "<path d='M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414'/><circle cx='12' cy='12' r='4'/>"
    : "<path d='M21 12.79A9 9 0 1 1 11.21 3c0 .3 0 .6.05.9A7 7 0 0 0 20.1 12c.3.05.6.05.9.79z'/>";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (preferDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
  updateThemeIcon();
}

function initEvents() {
  elements.favoritesContainer?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "details") openModal(id);
    if (action === "compare") toggleCompare(id);
    if (action === "favorite") toggleFavorite(id);
  });

  elements.modalClose?.addEventListener("click", closeModal);
  elements.modal?.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  elements.modalCompare?.addEventListener("click", () => {
    if (state.currentModalCarId !== null) toggleCompare(state.currentModalCarId);
  });

  elements.modalFav?.addEventListener("click", () => {
    if (state.currentModalCarId !== null) toggleFavorite(state.currentModalCarId);
  });

  elements.themeToggle?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    updateThemeIcon();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === FAVORITES_KEY) {
      state.favorites = new Set(JSON.parse(event.newValue || "[]"));
      renderFavoritesPage();
      updateModalButtons();
    }

    if (event.key === COMPARE_KEY) {
      state.compare = new Set(JSON.parse(event.newValue || "[]"));
      renderFavoritesPage();
      updateModalButtons();
    }

    if (event.key === THEME_KEY) {
      initTheme();
    }
  });
}

function init() {
  initTheme();
  renderFavoritesPage();
  initEvents();
}

init();
