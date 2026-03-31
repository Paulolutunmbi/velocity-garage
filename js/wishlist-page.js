const MAX_COMPARE = 3;

const localState = window.vgUserStore?.getLocalState?.() || {
  favorites: [],
  wishlist: [],
  compare: [],
  darkMode: true,
};

const state = {
  favorites: new Set(normalizeIds(localState.favorites || [])),
  wishlist: new Set(normalizeIds(localState.wishlist || [])),
  compare: new Set(normalizeIds(localState.compare || [])),
  filters: {
    brand: "all",
    price: "all",
    vehicleType: "all",
  },
  currentModalCarId: null,
  modalCarouselImages: [],
  modalCarouselIndex: 0,
  modalCarouselTimer: null,
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
  modal: document.getElementById("modal"),
  modalClose: document.getElementById("modal-close"),
  modalName: document.getElementById("modal-name"),
  modalCarouselTrack: document.getElementById("modal-carousel-track"),
  modalCarouselDots: document.getElementById("modal-carousel-dots"),
  modalCarouselPrev: document.getElementById("modal-carousel-prev"),
  modalCarouselNext: document.getElementById("modal-carousel-next"),
  modalBrand: document.getElementById("modal-brand"),
  modalMaker: document.getElementById("modal-maker"),
  modalCountry: document.getElementById("modal-country"),
  modalHp: document.getElementById("modal-hp"),
  modalSpeed: document.getElementById("modal-speed"),
  modalWeight: document.getElementById("modal-weight"),
  modalZeroTo100Mph: document.getElementById("modal-zero-to-100-mph"),
  modalPrice: document.getElementById("modal-price"),
  modalDesc: document.getElementById("modal-desc"),
  modalCompare: document.getElementById("modal-compare"),
  modalFav: document.getElementById("modal-fav"),
  modalWishlist: document.getElementById("modal-wishlist"),
  pageLoading: document.getElementById("page-loading"),
};

const BUTTON_PRIMARY = "rounded-md bg-[#f7b2b6] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black transition hover:brightness-110";
const BUTTON_SECONDARY = "rounded-md border border-[#2a2b34] bg-[#1a1b22] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d3d7e3] transition hover:border-[#ff5d67] hover:text-white";
const BUTTON_ACTIVE = "rounded-md border border-[#ff5d67] bg-[#2a1216] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#ffb6bb] transition";
const MODAL_BUTTON_ACTIVE = "rounded-lg border border-[#ff5d67] bg-[#2a1216] px-4 py-2 font-semibold text-[#ffb6bb] transition";

let notificationTimer = null;

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))];
}

function parsePriceValue(priceText = "") {
  const numeric = Number(String(priceText).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseHorsepowerValue(hpText = "") {
  const numeric = Number(String(hpText).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function deriveZeroToSixtyFromZeroTo100(zeroTo100Text = "") {
  const numeric = Number(String(zeroTo100Text).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return String(zeroTo100Text || "--").toUpperCase();
  }

  const zeroToSixty = (numeric * 0.6).toFixed(1);
  return `${zeroToSixty} SEC`;
}

function carImage(car) {
  return car.image || car.images?.[0] || window.CAR_IMAGE_FALLBACK;
}

async function persistSets() {
  const payload = {
    favorites: [...state.favorites],
    wishlist: [...state.wishlist],
    compare: [...state.compare],
  };

  await window.vgUserStore?.updateUserState?.(payload);
}

function showNotification(message) {
  if (!elements.notification) return;
  elements.notification.textContent = message;
  elements.notification.classList.remove("hidden");

  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    elements.notification.classList.add("hidden");
  }, 1700);
}

function updateCompareButton() {
  if (!elements.compareSelectionButton) return;
  const count = state.compare.size;
  elements.compareSelectionButton.textContent = count ? `Compare Selection (${count})` : "Compare Selection";
}

function updateQuickInfo() {
  if (!elements.wishlistQuickInfo) return;

  const wishlistCars = [...state.wishlist].map((id) => getCarById(Number(id))).filter(Boolean);
  const totalValue = wishlistCars.reduce((sum, car) => sum + parsePriceValue(car.price), 0);

  elements.wishlistQuickInfo.textContent = `${wishlistCars.length} Vehicles | ${formatCurrency(totalValue)}`;
}

function updateStatsStrip() {
  if (!elements.statTotalVelocity || !elements.statAvgZeroToSixty || !elements.statGlobalInventory) return;

  const fallbackCar = state.visibleCars[0] || null;
  const activeCar = state.visibleCars.find((car) => car.id === state.hoveredCarId) || fallbackCar;

  if (activeCar) {
    const hp = parseHorsepowerValue(activeCar.hp);
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

  const price = parsePriceValue(car.price);
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

function getAllCars() {
  return Array.isArray(window.cars) ? window.cars : [];
}

function getBrandOptionsFromCarsAndState() {
  const dedup = new Map();

  for (const car of getAllCars()) {
    const rawBrand = String(car?.brand || "").trim();
    if (!rawBrand) continue;
    dedup.set(rawBrand.toLowerCase(), rawBrand);
  }

  for (const id of state.wishlist) {
    const car = getCarById(Number(id));
    const rawBrand = String(car?.brand || "").trim();
    if (!rawBrand) continue;
    dedup.set(rawBrand.toLowerCase(), rawBrand);
  }

  return [...dedup.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}

function getVehicleTypeOptionsFromCarsAndState() {
  const dedup = new Map();

  for (const car of getAllCars()) {
    const rawType = String(car?.vehicleType || "").trim();
    if (!rawType) continue;
    dedup.set(rawType.toLowerCase(), rawType);
  }

  for (const id of state.wishlist) {
    const car = getCarById(Number(id));
    const rawType = String(car?.vehicleType || "").trim();
    if (!rawType) continue;
    dedup.set(rawType.toLowerCase(), rawType);
  }

  return [...dedup.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}

function populateBrandDropdown() {
  if (!elements.filterBrand) return;

  const previousValue = state.filters.brand;
  const options = getBrandOptionsFromCarsAndState();
  const optionMarkup = [
    '<option value="all">Brand: All</option>',
    ...options.map((option) => `<option value="${option.value}">${option.label}</option>`),
  ].join("");

  elements.filterBrand.innerHTML = optionMarkup;

  const stillExists = previousValue === "all" || options.some((option) => option.value === previousValue);
  state.filters.brand = stillExists ? previousValue : "all";
  elements.filterBrand.value = state.filters.brand;
}

function populateVehicleTypeDropdown() {
  if (!elements.filterVehicleType) return;

  const previousValue = state.filters.vehicleType;
  const options = getVehicleTypeOptionsFromCarsAndState();
  const optionMarkup = [
    '<option value="all">Vehicle Type: All</option>',
    ...options.map((option) => `<option value="${option.value}">${option.label}</option>`),
  ].join("");

  elements.filterVehicleType.innerHTML = optionMarkup;

  const stillExists = previousValue === "all" || options.some((option) => option.value === previousValue);
  state.filters.vehicleType = stillExists ? previousValue : "all";
  elements.filterVehicleType.value = state.filters.vehicleType;
}

function updateFilterControlValues() {
  if (elements.filterBrand) {
    elements.filterBrand.value = state.filters.brand;
  }
  if (elements.filterPrice) {
    elements.filterPrice.value = state.filters.price;
  }
  if (elements.filterVehicleType) {
    elements.filterVehicleType.value = state.filters.vehicleType;
  }
}

async function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    showNotification("Removed from Favorites");
  } else {
    state.favorites.add(id);
    showNotification("Added to Favorites");
  }

  await persistSets();
  renderWishlistPage();
  updateModalButtons();
}

async function toggleWishlist(id) {
  if (state.wishlist.has(id)) {
    state.wishlist.delete(id);
    showNotification("Removed from Wishlist");
  } else {
    state.wishlist.add(id);
    showNotification("Added to Wishlist");
  }

  await persistSets();
  renderWishlistPage();
  updateModalButtons();
}

async function toggleCompare(id) {
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

  await persistSets();
  renderWishlistPage();
  updateModalButtons();
}

async function removeWishlistItem(id) {
  if (!state.wishlist.has(id)) return;

  state.wishlist.delete(id);
  await persistSets();

  if (state.currentModalCarId === id) {
    closeModal();
  }

  renderWishlistPage();
  showNotification("Item removed from your wishlist.");
}

function wishlistTemplate(car) {
  const isCompare = state.compare.has(car.id);

  return `
    <article data-car-id="${car.id}" class="group flex h-full flex-col overflow-hidden border border-[#2a2b34] bg-[#121217] transition duration-300 hover:-translate-y-1 hover:border-[#ff5d67]/70">
      <div class="relative aspect-[16/10] overflow-hidden bg-black/40">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full object-cover transition duration-700 group-hover:scale-105">
        <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent"></div>
        <span class="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#ff5d67]">${car.brand}</span>
        <button data-action="wishlist" data-id="${car.id}" class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white transition hover:border-[#ff5d67] hover:text-[#ff5d67]" aria-label="Toggle wishlist">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.14-8.13C.85 9.73 2.02 5.5 5.66 4.3c2.23-.74 4.38.14 5.62 1.77 1.24-1.63 3.4-2.51 5.63-1.77 3.63 1.2 4.8 5.43 2.8 8.57C18.7 16.65 12 21 12 21z"/></svg>
        </button>
      </div>

      <div class="flex h-full flex-col p-4">
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="min-h-[62px]">
            <h3 class="display-font text-2xl font-bold uppercase leading-tight text-white">${car.name}</h3>
            <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#aeb3c0]">${car.country}</p>
          </div>
          <span class="display-font text-lg font-medium text-[#f8fafc]">${car.price}</span>
        </div>

        <div class="mt-auto space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="border border-[#2a2b34] bg-[#0f1015] px-3 py-2">
              <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f95a4]">Top Speed</span>
              <span class="display-font text-lg font-bold text-white">${car.speed}</span>
            </div>
            <div class="border border-[#2a2b34] bg-[#0f1015] px-3 py-2">
              <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f95a4]">Horsepower</span>
              <span class="display-font text-lg font-bold text-white">${car.hp}</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button data-action="compare" data-id="${car.id}" class="${isCompare ? BUTTON_ACTIVE : BUTTON_PRIMARY}">${isCompare ? "Remove Compare" : "Compare"}</button>
            <button data-action="details" data-id="${car.id}" class="${BUTTON_SECONDARY}">Details</button>
          </div>
        </div>
      </div>
    </article>
  `;
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

function getModalImages(car) {
  const images = Array.isArray(car.images) ? car.images.filter(Boolean) : [];
  if (images.length) return images;
  return [carImage(car)];
}

function stopModalCarouselTimer() {
  if (state.modalCarouselTimer) {
    clearInterval(state.modalCarouselTimer);
    state.modalCarouselTimer = null;
  }
}

function setModalCarouselSlide(index) {
  const count = state.modalCarouselImages.length;
  if (!count || !elements.modalCarouselTrack) return;

  state.modalCarouselIndex = (index + count) % count;
  elements.modalCarouselTrack.style.transform = `translateX(-${state.modalCarouselIndex * 100}%)`;

  if (elements.modalCarouselDots) {
    const dots = [...elements.modalCarouselDots.querySelectorAll("button[data-modal-dot]")];
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("w-6", dotIndex === state.modalCarouselIndex);
      dot.classList.toggle("bg-amber-500", dotIndex === state.modalCarouselIndex);
      dot.classList.toggle("bg-white/70", dotIndex !== state.modalCarouselIndex);
    });
  }
}

function shiftModalCarousel(step) {
  setModalCarouselSlide(state.modalCarouselIndex + step);
}

function startModalCarouselTimer() {
  stopModalCarouselTimer();
  if (state.modalCarouselImages.length <= 1) return;
  state.modalCarouselTimer = setInterval(() => {
    shiftModalCarousel(1);
  }, 3800);
}

function renderModalCarousel(car) {
  if (!elements.modalCarouselTrack || !elements.modalCarouselDots || !elements.modalCarouselPrev || !elements.modalCarouselNext) return;

  state.modalCarouselImages = getModalImages(car);
  state.modalCarouselIndex = 0;

  elements.modalCarouselTrack.innerHTML = state.modalCarouselImages
    .map(
      (imageUrl, imageIndex) => `
      <div class="min-w-full h-full shrink-0">
        <img src="${imageUrl}" alt="${car.name} image ${imageIndex + 1}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full object-contain">
      </div>`
    )
    .join("");

  elements.modalCarouselDots.innerHTML = state.modalCarouselImages
    .map(
      (_, imageIndex) =>
        `<button data-modal-dot="${imageIndex}" class="h-2.5 w-2.5 rounded-full bg-white/70 transition" aria-label="Show car image ${imageIndex + 1}"></button>`
    )
    .join("");

  const showControls = state.modalCarouselImages.length > 1;
  elements.modalCarouselPrev.classList.toggle("hidden", !showControls);
  elements.modalCarouselNext.classList.toggle("hidden", !showControls);
  elements.modalCarouselDots.classList.toggle("hidden", !showControls);

  setModalCarouselSlide(0);
  startModalCarouselTimer();
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
  elements.modalWeight.textContent = car.weight || "-";
  elements.modalZeroTo100Mph.textContent = car.zeroTo100Mph || "-";
  elements.modalPrice.textContent = car.price;
  elements.modalDesc.textContent = car.description;

  renderModalCarousel(car);

  updateModalButtons();
  elements.modal.classList.remove("hidden");
  elements.modal.classList.add("flex");
}

function closeModal() {
  if (!elements.modal) return;
  stopModalCarouselTimer();
  state.modalCarouselImages = [];
  state.modalCarouselIndex = 0;
  state.currentModalCarId = null;
  elements.modal.classList.add("hidden");
  elements.modal.classList.remove("flex");
}

function updateModalButtons() {
  if (!elements.modalCompare || !elements.modalFav || state.currentModalCarId === null) return;

  const isFav = state.favorites.has(state.currentModalCarId);
  const isCompare = state.compare.has(state.currentModalCarId);
  const isWishlist = state.wishlist.has(state.currentModalCarId);

  elements.modalCompare.textContent = isCompare ? "Remove from Compare" : "Add to Compare";
  elements.modalCompare.className = `${isCompare ? MODAL_BUTTON_ACTIVE : BUTTON_PRIMARY} text-sm`;

  elements.modalFav.textContent = isFav ? "Remove from Favorites" : "Add to Favorites";
  elements.modalFav.className = `${isFav ? MODAL_BUTTON_ACTIVE : BUTTON_SECONDARY} text-sm`;

  if (elements.modalWishlist) {
    elements.modalWishlist.textContent = isWishlist ? "Remove from Wishlist" : "Add to Wishlist";
    elements.modalWishlist.className = `${isWishlist ? MODAL_BUTTON_ACTIVE : BUTTON_SECONDARY} text-sm`;
  }
}

function syncFromRemote(remote) {
  state.favorites = new Set(normalizeIds(remote.favorites || []));
  state.wishlist = new Set(normalizeIds(remote.wishlist || []));
  state.compare = new Set(normalizeIds(remote.compare || []).slice(0, MAX_COMPARE));
  renderWishlistPage();
  updateModalButtons();
}

async function loadUserState() {
  const user = window.vgUserStore?.getCurrentUser?.();
  const uid = user?.uid || "unknown";
  const remote = await window.vgUserStore?.loadUserData?.(uid);

  state.favorites = new Set(normalizeIds(remote?.favorites || []));
  state.wishlist = new Set(normalizeIds(remote?.wishlist || []));
  state.compare = new Set(normalizeIds(remote?.compare || []).slice(0, MAX_COMPARE));
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

  elements.modalClose?.addEventListener("click", closeModal);
  elements.modal?.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeModal();
  });

  elements.modalCarouselPrev?.addEventListener("click", () => {
    shiftModalCarousel(-1);
    startModalCarouselTimer();
  });

  elements.modalCarouselNext?.addEventListener("click", () => {
    shiftModalCarousel(1);
    startModalCarouselTimer();
  });

  elements.modalCarouselDots?.addEventListener("click", (event) => {
    const dot = event.target.closest("button[data-modal-dot]");
    if (!dot) return;
    setModalCarouselSlide(Number(dot.dataset.modalDot));
    startModalCarouselTimer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
    if (elements.modal?.classList.contains("hidden")) return;
    if (event.key === "ArrowLeft") {
      shiftModalCarousel(-1);
      startModalCarouselTimer();
    }
    if (event.key === "ArrowRight") {
      shiftModalCarousel(1);
      startModalCarouselTimer();
    }
  });

  elements.modalCompare?.addEventListener("click", async () => {
    if (state.currentModalCarId !== null) await toggleCompare(state.currentModalCarId);
  });

  elements.modalFav?.addEventListener("click", async () => {
    if (state.currentModalCarId !== null) await toggleFavorite(state.currentModalCarId);
  });

  elements.modalWishlist?.addEventListener("click", async () => {
    if (state.currentModalCarId !== null) await toggleWishlist(state.currentModalCarId);
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
  await window.vgUserStore?.waitForReady?.();
  await loadUserState();

  renderWishlistPage();
  initEvents();
  elements.pageLoading?.classList.add("hidden");

  window.vgUserStore?.bindThemeToggle?.();
  window.vgUserStore?.subscribeUserState?.((remote) => {
    syncFromRemote(remote);
  });
}

init().catch((error) => {
  console.error("[UI Init Error] wishlist page failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});
