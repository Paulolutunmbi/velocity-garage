const MAX_COMPARE = window.VGFirebase?.MAX_COMPARE || 3;

window.VGModal?.ensureCarModal({
  showCancel: true,
  zIndexClass: "z-[60]",
});

const localState = window.vgUserStore?.getLocalState?.() || {
  favorites: [],
  wishlist: [],
  compare: [],
  darkMode: true,
};

const state = {
  favorites: new Set(window.VGHelpers?.normalizeIds(localState.favorites || [])),
  wishlist: new Set(window.VGHelpers?.normalizeIds(localState.wishlist || [])),
  compare: new Set(window.VGHelpers?.normalizeIds(localState.compare || []).slice(0, MAX_COMPARE)),
  filters: {
    brand: "all",
    price: "all",
    performance: "all",
  },
};

const elements = {
  favoritesContainer: document.getElementById("favorites-container"),
  favoritesEmpty: document.getElementById("favorites-empty"),
  savedCount: document.getElementById("saved-count"),
  filterBrand: document.getElementById("filter-brand"),
  filterPrice: document.getElementById("filter-price"),
  filterPerformance: document.getElementById("filter-performance"),
  compareQuickInfo: document.getElementById("compare-quick-info"),
  notification: document.getElementById("notification"),
  pageLoading: document.getElementById("page-loading"),
};

const BUTTON_PRIMARY = "rounded-md bg-[#f7b2b6] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black transition hover:brightness-110";
const BUTTON_SECONDARY = "rounded-md border border-[#2a2b34] bg-[#1a1b22] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d3d7e3] transition hover:border-[#ff5d67] hover:text-white";
const BUTTON_ACTIVE = "rounded-lg border border-[#ff5d67] bg-[#2a1216] px-4 py-2 font-semibold text-[#ffb6bb] transition";

const showNotification = window.VGHelpers.createNotifier(elements.notification, { duration: 1700 });

let modalController = null;

const { toggleFavorite, toggleWishlist, toggleCompare } = window.VGFirebase.createCollectionActions({
  state,
  notify: showNotification,
  maxCompare: MAX_COMPARE,
  afterToggle: async () => {
    renderFavoritesPage();
    modalController?.updateButtons();
  },
});

modalController = window.VGModal.createCarModalController({
  getCarById: (id) => getCarById(id),
  onToggleCompare: toggleCompare,
  onToggleFavorite: toggleFavorite,
  onToggleWishlist: toggleWishlist,
  getButtonState: (id) => ({
    isCompare: state.compare.has(id),
    isFavorite: state.favorites.has(id),
    isWishlist: state.wishlist.has(id),
  }),
  modalPrimaryClass: BUTTON_PRIMARY,
  modalSecondaryClass: BUTTON_SECONDARY,
  modalActiveClass: BUTTON_ACTIVE,
  dotActiveClass: "bg-amber-500",
  dotIdleClass: "bg-white/70",
  imageFitClass: "object-cover",
  autoAdvanceMs: 3800,
  clearCurrentOnClose: false,
  enableSwipe: false,
});

function getAllCars() {
  return Array.isArray(window.cars) ? window.cars : [];
}

function updateCompareQuickInfo() {
  if (!elements.compareQuickInfo) return;
  const count = state.compare.size;
  elements.compareQuickInfo.textContent = count ? `Compare list: ${count}/3 ready` : "Compare list: 0/3";
}

function updateSavedCount() {
  if (!elements.savedCount) return;
  elements.savedCount.textContent = `${state.favorites.size} Saved`;
}

function matchesBrandFilter(car) {
  if (state.filters.brand === "all") return true;
  return String(car.brand || "").toLowerCase() === state.filters.brand;
}

function matchesPriceFilter(car) {
  if (state.filters.price === "all") return true;

  const price = window.VGHelpers.parsePriceValue(car.price);
  if (state.filters.price === "under-300k") return price < 300000;
  if (state.filters.price === "300k-1m") return price >= 300000 && price <= 1000000;
  if (state.filters.price === "over-1m") return price > 1000000;
  return true;
}

function matchesPerformanceFilter(car) {
  if (state.filters.performance === "all") return true;

  const hp = window.VGHelpers.parseHorsepowerValue(car.hp);
  if (state.filters.performance === "street") return hp < 700;
  if (state.filters.performance === "track") return hp >= 700 && hp < 1000;
  if (state.filters.performance === "hyper") return hp >= 1000;
  return true;
}

function applyFavoriteFilters(cars) {
  return cars.filter((car) => matchesBrandFilter(car) && matchesPriceFilter(car) && matchesPerformanceFilter(car));
}

function populateBrandDropdown() {
  if (!elements.filterBrand) return;

  const options = window.VGHelpers.deriveOptionList({
    catalog: getAllCars(),
    selectedIds: [...state.favorites],
    getCarById,
    field: "brand",
  });

  state.filters.brand = window.VGHelpers.populateSelectOptions(elements.filterBrand, {
    placeholderLabel: "Brand: All",
    placeholderValue: "all",
    options,
    previousValue: state.filters.brand,
  });
}

function updateFilterValues() {
  if (elements.filterBrand) elements.filterBrand.value = state.filters.brand;
  if (elements.filterPrice) elements.filterPrice.value = state.filters.price;
  if (elements.filterPerformance) elements.filterPerformance.value = state.filters.performance;
}

function favoritesTemplate(car) {
  return window.VGCard.renderCollectionCard({
    car,
    imageUrl: window.VGHelpers.carImage(car, window.CAR_IMAGE_FALLBACK),
    topAction: {
      action: "favorite",
      ariaLabel: "Remove from favorites",
      iconSvg: window.VGCard.HEART_ICON,
    },
    compareButton: {
      action: "compare",
      isActive: state.compare.has(car.id),
      activeClass: BUTTON_ACTIVE,
      idleClass: BUTTON_PRIMARY,
      activeLabel: "Remove Compare",
      idleLabel: "Compare",
    },
    detailsButton: {
      action: "details",
      label: "Details",
      className: BUTTON_SECONDARY,
    },
  });
}

function renderFavoritesPage() {
  if (!elements.favoritesContainer || !elements.favoritesEmpty) return;

  populateBrandDropdown();

  const favoriteCars = [...state.favorites].map((id) => getCarById(id)).filter(Boolean);
  const filteredCars = applyFavoriteFilters(favoriteCars);

  updateSavedCount();
  updateFilterValues();
  updateCompareQuickInfo();

  if (!favoriteCars.length) {
    elements.favoritesContainer.innerHTML = "";
    elements.favoritesEmpty.classList.remove("hidden");
    elements.favoritesEmpty.querySelector("p")?.replaceChildren("No favorites yet. Explore the fleet and add cars you love.");
    return;
  }

  if (!filteredCars.length) {
    elements.favoritesContainer.innerHTML = "";
    elements.favoritesEmpty.classList.remove("hidden");
    elements.favoritesEmpty.querySelector("p")?.replaceChildren("No favorites match your selected filters. Adjust any dropdown to see more cars.");
    return;
  }

  elements.favoritesEmpty.classList.add("hidden");
  elements.favoritesContainer.innerHTML = filteredCars.map(favoritesTemplate).join("");
}

function openModal(id) {
  modalController.open(id);
}

function syncFromRemote(remote) {
  window.VGFirebase.applyRemoteCollections(state, remote, MAX_COMPARE);
  renderFavoritesPage();
  modalController.updateButtons();
}

async function loadUserState() {
  const remote = await window.VGFirebase.loadCollectionsForCurrentUser(MAX_COMPARE);
  state.favorites = new Set(remote.favorites);
  state.wishlist = new Set(remote.wishlist);
  state.compare = new Set(remote.compare);
}

function initEvents() {
  elements.favoritesContainer?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "details") openModal(id);
    if (action === "compare") await toggleCompare(id);
    if (action === "favorite") await toggleFavorite(id);
    if (action === "wishlist") await toggleWishlist(id);
  });

  elements.filterBrand?.addEventListener("change", (event) => {
    state.filters.brand = event.target.value;
    renderFavoritesPage();
  });

  elements.filterPrice?.addEventListener("change", (event) => {
    state.filters.price = event.target.value;
    renderFavoritesPage();
  });

  elements.filterPerformance?.addEventListener("change", (event) => {
    state.filters.performance = event.target.value;
    renderFavoritesPage();
  });
}

async function init() {
  await window.VGHelpers.bootstrapPage({
    loadUserState,
    render: renderFavoritesPage,
    initEvents,
    pageLoading: elements.pageLoading,
    syncFromRemote,
  });
}

init().catch((error) => {
  console.error("[UI Init Error] favorites page failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});