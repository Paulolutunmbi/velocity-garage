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
    vehicleType: "all",
  },
  hoveredCarId: null,
  visibleCars: [],
};

const elements = {
  wishlistContainer: document.getElementById("wishlist-container"),
  wishlistEmpty: document.getElementById("wishlist-empty"),
  wishlistQuickInfo: document.getElementById("wishlist-quick-info"),
  filterBrand: document.getElementById("filter-brand"),
  filterPrice: document.getElementById("filter-price"),
  filterVehicleType: document.getElementById("filter-vehicle-type"),
  compareSelectionButton: document.getElementById("compare-selection-button"),
  statTotalVelocity: document.getElementById("stat-total-velocity"),
  statAvgZeroToSixty: document.getElementById("stat-avg-zero-to-sixty"),
  statGlobalInventory: document.getElementById("stat-global-inventory"),
  statAssetAppreciation: document.getElementById("stat-asset-appreciation"),
  notification: document.getElementById("notification"),
  pageLoading: document.getElementById("page-loading"),
};

const BUTTON_PRIMARY = "rounded-md bg-[#f7b2b6] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black transition hover:brightness-110";
const BUTTON_SECONDARY = "rounded-md border border-[#2a2b34] bg-[#1a1b22] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d3d7e3] transition hover:border-[#ff5d67] hover:text-white";
const BUTTON_ACTIVE = "rounded-md border border-[#ff5d67] bg-[#2a1216] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#ffb6bb] transition";
const MODAL_BUTTON_ACTIVE = "rounded-lg border border-[#ff5d67] bg-[#2a1216] px-4 py-2 font-semibold text-[#ffb6bb] transition";

const showNotification = window.VGHelpers.createNotifier(elements.notification, { duration: 1700 });

let modalController = null;

const { toggleFavorite, toggleWishlist, toggleCompare } = window.VGFirebase.createCollectionActions({
  state,
  notify: showNotification,
  maxCompare: MAX_COMPARE,
  afterToggle: async () => {
    renderWishlistPage();
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
  modalActiveClass: MODAL_BUTTON_ACTIVE,
  dotActiveClass: "bg-amber-500",
  dotIdleClass: "bg-white/70",
  imageFitClass: "object-cover",
  autoAdvanceMs: 3800,
  clearCurrentOnClose: true,
  enableSwipe: false,
});

function getAllCars() {
  return Array.isArray(window.cars) ? window.cars : [];
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function deriveZeroToSixtyFromZeroTo100(zeroTo100Text = "") {
  const numeric = window.VGHelpers.parseNumericValue(zeroTo100Text);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return String(zeroTo100Text || "--").toUpperCase();
  }

  const zeroToSixty = (numeric * 0.6).toFixed(1);
  return `${zeroToSixty} SEC`;
}

function updateCompareButton() {
  if (!elements.compareSelectionButton) return;
  const count = state.compare.size;
  elements.compareSelectionButton.textContent = count ? `Compare Selection (${count})` : "Compare Selection";
}

function updateQuickInfo() {
  if (!elements.wishlistQuickInfo) return;

  const wishlistCars = [...state.wishlist].map((id) => getCarById(Number(id))).filter(Boolean);
  const totalValue = wishlistCars.reduce((sum, car) => sum + window.VGHelpers.parsePriceValue(car.price), 0);

  elements.wishlistQuickInfo.textContent = `${wishlistCars.length} Vehicles | ${formatCurrency(totalValue)}`;
}

function updateStatsStrip() {
  if (!elements.statTotalVelocity || !elements.statAvgZeroToSixty || !elements.statGlobalInventory) return;

  const fallbackCar = state.visibleCars[0] || null;
  const activeCar = state.visibleCars.find((car) => car.id === state.hoveredCarId) || fallbackCar;

  if (activeCar) {
    const hp = window.VGHelpers.parseHorsepowerValue(activeCar.hp);
    elements.statTotalVelocity.textContent = hp ? `${hp.toLocaleString("en-US")} BHP` : String(activeCar.hp || "--").toUpperCase();
    elements.statAvgZeroToSixty.textContent = deriveZeroToSixtyFromZeroTo100(activeCar.zeroTo100Mph || "--");
  } else {
    elements.statTotalVelocity.textContent = "--";
    elements.statAvgZeroToSixty.textContent = "--";
  }

  const inventoryCount = getAllCars().length;
  elements.statGlobalInventory.textContent = `${inventoryCount} UNITS`;
  if (elements.statAssetAppreciation) {
    elements.statAssetAppreciation.textContent = "+12.4%";
  }
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

function matchesVehicleTypeFilter(car) {
  if (state.filters.vehicleType === "all") return true;
  return String(car.vehicleType || "").toLowerCase() === state.filters.vehicleType;
}

function applyWishlistFilters(cars) {
  return cars.filter((car) => matchesBrandFilter(car) && matchesPriceFilter(car) && matchesVehicleTypeFilter(car));
}

function populateBrandDropdown() {
  if (!elements.filterBrand) return;

  const options = window.VGHelpers.deriveOptionList({
    catalog: getAllCars(),
    selectedIds: [...state.wishlist],
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

function populateVehicleTypeDropdown() {
  if (!elements.filterVehicleType) return;

  const options = window.VGHelpers.deriveOptionList({
    catalog: getAllCars(),
    selectedIds: [...state.wishlist],
    getCarById,
    field: "vehicleType",
  });

  state.filters.vehicleType = window.VGHelpers.populateSelectOptions(elements.filterVehicleType, {
    placeholderLabel: "Vehicle Type: All",
    placeholderValue: "all",
    options,
    previousValue: state.filters.vehicleType,
  });
}

function updateFilterControlValues() {
  if (elements.filterBrand) elements.filterBrand.value = state.filters.brand;
  if (elements.filterPrice) elements.filterPrice.value = state.filters.price;
  if (elements.filterVehicleType) elements.filterVehicleType.value = state.filters.vehicleType;
}

function wishlistTemplate(car) {
  return window.VGCard.renderCollectionCard({
    car,
    imageUrl: window.VGHelpers.carImage(car, window.CAR_IMAGE_FALLBACK),
    articleAttributes: `data-car-id="${car.id}"`,
    topAction: {
      action: "wishlist",
      ariaLabel: "Toggle wishlist",
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

function renderWishlistPage() {
  if (!elements.wishlistContainer || !elements.wishlistEmpty) return;

  populateBrandDropdown();
  populateVehicleTypeDropdown();

  const wishlistCars = [...state.wishlist].map((id) => getCarById(Number(id))).filter(Boolean);
  const filteredCars = applyWishlistFilters(wishlistCars);

  state.visibleCars = filteredCars;

  updateQuickInfo();
  updateFilterControlValues();
  updateCompareButton();
  updateStatsStrip();

  if (!wishlistCars.length) {
    elements.wishlistContainer.innerHTML = "";
    elements.wishlistEmpty.classList.remove("hidden");
    elements.wishlistEmpty.querySelector("p")?.replaceChildren("No wishlist items yet. Add dream cars from the showroom.");
    return;
  }

  if (!filteredCars.length) {
    elements.wishlistContainer.innerHTML = "";
    elements.wishlistEmpty.classList.remove("hidden");
    elements.wishlistEmpty.querySelector("p")?.replaceChildren("No wishlist cars match your selected filters. Adjust any dropdown to see more cars.");
    return;
  }

  elements.wishlistEmpty.classList.add("hidden");
  elements.wishlistContainer.innerHTML = filteredCars.map(wishlistTemplate).join("");
}

function openModal(id) {
  modalController.open(id);
}

function syncFromRemote(remote) {
  window.VGFirebase.applyRemoteCollections(state, remote, MAX_COMPARE);
  renderWishlistPage();
  modalController.updateButtons();
}

async function loadUserState() {
  const remote = await window.VGFirebase.loadCollectionsForCurrentUser(MAX_COMPARE);
  state.favorites = new Set(remote.favorites);
  state.wishlist = new Set(remote.wishlist);
  state.compare = new Set(remote.compare);
}

function initEvents() {
  elements.wishlistContainer?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "details") openModal(id);
    if (action === "compare") await toggleCompare(id);
    if (action === "favorite") await toggleFavorite(id);
    if (action === "wishlist") await toggleWishlist(id);
  });

  elements.wishlistContainer?.addEventListener("mouseover", (event) => {
    const card = event.target.closest("article[data-car-id]");
    if (!card) return;

    const id = Number(card.dataset.carId);
    if (!Number.isFinite(id) || state.hoveredCarId === id) return;

    state.hoveredCarId = id;
    updateStatsStrip();
  });

  elements.wishlistContainer?.addEventListener("mouseleave", () => {
    state.hoveredCarId = null;
    updateStatsStrip();
  });

  elements.compareSelectionButton?.addEventListener("click", () => {
    if (!state.compare.size) {
      showNotification("Select at least one car to compare.");
      return;
    }

    window.location.href = "compare.html";
  });

  elements.filterBrand?.addEventListener("change", (event) => {
    state.filters.brand = event.target.value;
    renderWishlistPage();
  });

  elements.filterPrice?.addEventListener("change", (event) => {
    state.filters.price = event.target.value;
    renderWishlistPage();
  });

  elements.filterVehicleType?.addEventListener("change", (event) => {
    state.filters.vehicleType = event.target.value;
    renderWishlistPage();
  });
}

async function init() {
  await window.VGHelpers.bootstrapPage({
    loadUserState,
    render: renderWishlistPage,
    initEvents,
    pageLoading: elements.pageLoading,
    syncFromRemote,
  });
}

init().catch((error) => {
  console.error("[UI Init Error] wishlist page failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});