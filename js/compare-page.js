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
  compare: new Set(normalizeIds(localState.compare || []).slice(0, MAX_COMPARE)),
  currentModalCarId: null,
  modalCarouselImages: [],
  modalCarouselIndex: 0,
  modalCarouselTimer: null,
};

const elements = {
  compareCards: document.getElementById("compare-cards"),
  compareHead: document.getElementById("compare-head"),
  compareBody: document.getElementById("compare-body"),
  tableWrapper: document.getElementById("compare-table-wrapper"),
  emptyState: document.getElementById("compare-empty"),
  clearCompare: document.getElementById("clear-compare"),
  notification: document.getElementById("notification"),
  notificationText: document.getElementById("notification-text"),
  pageLoading: document.getElementById("page-loading"),
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
};

const BUTTON_PRIMARY = "bg-[#ff535d] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#25060a] transition hover:brightness-110";
const BUTTON_SECONDARY = "border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-[#ff535d] hover:text-white";
const BUTTON_ACTIVE = "border border-[#ff535d] bg-[#2b151a] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb2b4] transition";
const MODAL_PRIMARY = "bg-[#ff535d] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#25060a] transition hover:brightness-110";
const MODAL_SECONDARY = "border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#ff535d] hover:text-white";
const MODAL_ACTIVE = "border border-[#ff535d] bg-[#2b151a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb2b4] transition";

let notificationTimer = null;

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  // Store IDs as unique positive numbers so remote/local sync cannot introduce duplicates.
  return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))];
}

function parseFloatFromText(value = "") {
  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function deriveZeroToSixty(zeroTo100Text = "") {
  const zeroTo100 = parseFloatFromText(zeroTo100Text);
  if (!zeroTo100) return "--";
  return `${(zeroTo100 * 0.6).toFixed(1)} s`;
}

function carImage(car) {
  return car.image || car.images?.[0] || window.CAR_IMAGE_FALLBACK;
}

function getSelectedCars() {
  return [...state.compare]
    .map((id) => getCarById(Number(id)))
    .filter(Boolean)
    .slice(0, MAX_COMPARE);
}

async function persistSets() {
  const payload = {
    favorites: [...state.favorites],
    wishlist: [...state.wishlist],
    compare: [...state.compare].slice(0, MAX_COMPARE),
  };

  await window.vgUserStore?.updateUserState?.(payload);
}

function showNotification(message) {
  if (!elements.notification) return;

  if (elements.notificationText) {
    elements.notificationText.textContent = message;
  } else {
    elements.notification.textContent = message;
  }

  elements.notification.classList.remove("hidden");
  if (notificationTimer) clearTimeout(notificationTimer);

  notificationTimer = setTimeout(() => {
    elements.notification.classList.add("hidden");
  }, 1700);
}

function getButtonLabelState(carId) {
  return {
    isFavorite: state.favorites.has(carId),
    isWishlist: state.wishlist.has(carId),
    isCompare: state.compare.has(carId),
  };
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
  renderComparePage();
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
  renderComparePage();
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

  if (state.currentModalCarId && !state.compare.has(state.currentModalCarId)) {
    closeModal();
  }

  await persistSets();
  renderComparePage();
  updateModalButtons();
}

async function removeCompare(id) {
  if (!state.compare.has(id)) return;
  state.compare.delete(id);

  if (state.currentModalCarId === id) {
    closeModal();
  }

  await persistSets();
  renderComparePage();
  showNotification("Removed from Compare");
}

async function clearCompare() {
  if (!state.compare.size) {
    showNotification("Compare list is already empty");
    return;
  }

  state.compare.clear();
  closeModal();

  await persistSets();
  renderComparePage();
  showNotification("Compare list cleared");
}

function compareCardTemplate(car) {
  const { isFavorite, isWishlist } = getButtonLabelState(car.id);

  return `
    <article class="deck-grid-card group overflow-hidden border border-white/10 bg-[#181a20]">
      <div class="relative aspect-[16/10] overflow-hidden bg-black/30">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full object-cover transition duration-700 group-hover:scale-110">
        <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#11131a] via-black/35 to-transparent"></div>
        <button data-action="remove" data-id="${car.id}" class="absolute right-3 top-3 h-8 w-8 border border-white/20 bg-black/45 text-slate-200 transition hover:border-[#ff535d] hover:text-[#ff535d]" aria-label="Remove from compare">&times;</button>
      </div>

      <div class="space-y-4 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="display-font text-3xl font-bold uppercase leading-none tracking-tight text-white">${car.name}</h3>
            <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">${car.country} | ${car.maker}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="border border-white/10 bg-white/5 px-3 py-2 text-center">
            <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">HP</span>
            <span class="display-font text-2xl font-bold text-slate-100">${car.hp}</span>
          </div>
          <div class="border border-white/10 bg-white/5 px-3 py-2 text-center">
            <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">0-60</span>
            <span class="display-font text-2xl font-bold text-[#ffb2b4]">${deriveZeroToSixty(car.zeroTo100Mph)}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button data-action="details" data-id="${car.id}" class="${BUTTON_PRIMARY}">Details</button>
          <button data-action="favorite" data-id="${car.id}" class="${isFavorite ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isFavorite ? "Favorited" : "Favorite"}</button>
          <button data-action="wishlist" data-id="${car.id}" class="${isWishlist ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isWishlist ? "Wishlisted" : "Wishlist"}</button>
        </div>
      </div>
    </article>
  `;
}

function renderCompareCards(cars) {
  if (!elements.compareCards) return;
  elements.compareCards.innerHTML = cars.map(compareCardTemplate).join("");
}

function createTableRow(label, cars, formatter) {
  const row = document.createElement("tr");
  row.className = "border-t border-white/10 hover:bg-white/5 transition-colors";

  const specCell = document.createElement("td");
  specCell.className = "px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb2b4] sm:px-6";
  specCell.textContent = label;
  row.appendChild(specCell);

  for (const car of cars) {
    const valueCell = document.createElement("td");
    valueCell.className = "px-4 py-4 text-sm text-slate-200 sm:px-6";
    valueCell.textContent = formatter(car);
    row.appendChild(valueCell);
  }

  return row;
}

function renderCompareTable(cars) {
  if (!elements.compareHead || !elements.compareBody) return;

  elements.compareHead.innerHTML = "";
  elements.compareBody.innerHTML = "";

  const titleCell = document.createElement("th");
  titleCell.className = "w-[22%] border-b border-white/10 bg-black/25 px-4 py-5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb2b4] sm:px-6";
  titleCell.textContent = "Specification";
  elements.compareHead.appendChild(titleCell);

  for (const car of cars) {
    const carHeader = document.createElement("th");
    carHeader.className = "border-b border-white/10 bg-black/25 px-4 py-5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100 sm:px-6";
    carHeader.textContent = car.name;
    elements.compareHead.appendChild(carHeader);
  }

  const rows = [
    createTableRow("Maker", cars, (car) => car.maker || "-"),
    createTableRow("Country", cars, (car) => car.country || "-"),
    createTableRow("Horsepower", cars, (car) => car.hp || "-"),
    createTableRow("Top Speed", cars, (car) => car.speed || "-"),
    createTableRow("0-100 MPH", cars, (car) => car.zeroTo100Mph || "-"),
    createTableRow("Price (MSRP)", cars, (car) => car.price || "-"),
  ];

  for (const row of rows) {
    elements.compareBody.appendChild(row);
  }

  const descriptionRow = document.createElement("tr");
  descriptionRow.className = "border-t border-white/10 align-top hover:bg-white/5 transition-colors";

  const descriptionLabelCell = document.createElement("td");
  descriptionLabelCell.className = "px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb2b4] sm:px-6";
  descriptionLabelCell.textContent = "Description";
  descriptionRow.appendChild(descriptionLabelCell);

  for (const car of cars) {
    const descriptionValueCell = document.createElement("td");
    descriptionValueCell.className = "max-w-[290px] px-4 py-4 text-sm leading-relaxed text-slate-300 sm:px-6";
    descriptionValueCell.textContent = car.description || "-";
    descriptionRow.appendChild(descriptionValueCell);
  }

  elements.compareBody.appendChild(descriptionRow);
}

function renderComparePage() {
  const selectedCars = getSelectedCars();

  renderCompareCards(selectedCars);

  if (!selectedCars.length) {
    elements.emptyState?.classList.remove("hidden");
    elements.tableWrapper?.classList.add("hidden");
    return;
  }

  elements.emptyState?.classList.add("hidden");
  elements.tableWrapper?.classList.remove("hidden");
  renderCompareTable(selectedCars);
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
      dot.classList.toggle("bg-[#ff535d]", dotIndex === state.modalCarouselIndex);
      dot.classList.toggle("bg-white/50", dotIndex !== state.modalCarouselIndex);
    });
  }
}

function shiftModalCarousel(step) {
  setModalCarouselSlide(state.modalCarouselIndex + step);
}

function startModalCarouselTimer() {
  stopModalCarouselTimer();
  if (state.modalCarouselImages.length <= 1) return;

  // Auto-advance only when multiple images exist, then reset on any manual navigation.
  state.modalCarouselTimer = setInterval(() => {
    shiftModalCarousel(1);
  }, 3600);
}

function renderModalCarousel(car) {
  if (!elements.modalCarouselTrack || !elements.modalCarouselDots || !elements.modalCarouselPrev || !elements.modalCarouselNext) return;

  state.modalCarouselImages = getModalImages(car);
  state.modalCarouselIndex = 0;

  elements.modalCarouselTrack.innerHTML = state.modalCarouselImages
    .map(
      (imageUrl, imageIndex) => `
      <div class="min-w-full h-full shrink-0 bg-black/50">
        <img src="${imageUrl}" alt="${car.name} image ${imageIndex + 1}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full object-contain">
      </div>`
    )
    .join("");

  elements.modalCarouselDots.innerHTML = state.modalCarouselImages
    .map(
      (_, imageIndex) =>
        `<button data-modal-dot="${imageIndex}" class="h-2.5 w-2.5 rounded-full bg-white/50 transition-all" aria-label="Show image ${imageIndex + 1}"></button>`
    )
    .join("");

  const showControls = state.modalCarouselImages.length > 1;
  elements.modalCarouselPrev.classList.toggle("hidden", !showControls);
  elements.modalCarouselNext.classList.toggle("hidden", !showControls);
  elements.modalCarouselDots.classList.toggle("hidden", !showControls);
  elements.modalCarouselDots.classList.toggle("flex", showControls);

  setModalCarouselSlide(0);
  startModalCarouselTimer();
}

function openModal(id) {
  const car = getCarById(id);
  if (!car || !elements.modal) return;

  state.currentModalCarId = id;
  if (elements.modalName) elements.modalName.textContent = car.name;
  if (elements.modalBrand) elements.modalBrand.textContent = car.brand || "-";
  if (elements.modalMaker) elements.modalMaker.textContent = car.maker || "-";
  if (elements.modalCountry) elements.modalCountry.textContent = car.country || "-";
  if (elements.modalHp) elements.modalHp.textContent = car.hp || "-";
  if (elements.modalSpeed) elements.modalSpeed.textContent = car.speed || "-";
  if (elements.modalWeight) elements.modalWeight.textContent = car.weight || "-";
  if (elements.modalZeroTo100Mph) elements.modalZeroTo100Mph.textContent = car.zeroTo100Mph || "-";
  if (elements.modalPrice) elements.modalPrice.textContent = car.price || "-";
  if (elements.modalDesc) elements.modalDesc.textContent = car.description || "-";

  renderModalCarousel(car);
  updateModalButtons();

  elements.modal.classList.remove("hidden");
  elements.modal.classList.add("flex");
}

function closeModal() {
  if (!elements.modal) return;
  stopModalCarouselTimer();
  state.currentModalCarId = null;
  state.modalCarouselImages = [];
  state.modalCarouselIndex = 0;
  elements.modal.classList.add("hidden");
  elements.modal.classList.remove("flex");
}

function updateModalButtons() {
  if (state.currentModalCarId === null || !elements.modalCompare || !elements.modalFav || !elements.modalWishlist) return;

  const isCompare = state.compare.has(state.currentModalCarId);
  const isFavorite = state.favorites.has(state.currentModalCarId);
  const isWishlist = state.wishlist.has(state.currentModalCarId);

  elements.modalCompare.textContent = isCompare ? "Remove from Compare" : "Add to Compare";
  elements.modalCompare.className = isCompare ? MODAL_ACTIVE : MODAL_PRIMARY;

  elements.modalFav.textContent = isFavorite ? "Remove from Favorites" : "Add to Favorites";
  elements.modalFav.className = isFavorite ? MODAL_ACTIVE : MODAL_SECONDARY;

  elements.modalWishlist.textContent = isWishlist ? "Remove from Wishlist" : "Add to Wishlist";
  elements.modalWishlist.className = isWishlist ? MODAL_ACTIVE : MODAL_SECONDARY;
}

function syncFromRemote(remote) {
  state.favorites = new Set(normalizeIds(remote.favorites || []));
  state.wishlist = new Set(normalizeIds(remote.wishlist || []));
  // Compare is capped server-side and client-side for consistent UX across all pages.
  state.compare = new Set(normalizeIds(remote.compare || []).slice(0, MAX_COMPARE));

  if (state.currentModalCarId && !state.compare.has(state.currentModalCarId)) {
    closeModal();
  }

  renderComparePage();
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
  elements.compareCards?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    if (!Number.isFinite(id)) return;

    const action = button.dataset.action;

    if (action === "remove") await removeCompare(id);
    if (action === "details") openModal(id);
    if (action === "favorite") await toggleFavorite(id);
    if (action === "wishlist") await toggleWishlist(id);
  });

  elements.clearCompare?.addEventListener("click", clearCompare);

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

  window.addEventListener("beforeunload", stopModalCarouselTimer);
}

async function init() {
  await window.vgUserStore?.waitForReady?.();
  await loadUserState();

  renderComparePage();
  initEvents();
  elements.pageLoading?.classList.add("hidden");

  window.vgUserStore?.bindThemeToggle?.();
  window.vgUserStore?.subscribeUserState?.((remote) => {
    syncFromRemote(remote);
  });
}

init().catch((error) => {
  console.error("[UI Init Error] compare page failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});
