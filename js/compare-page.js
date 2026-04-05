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
};

const elements = {
  compareCards: document.getElementById("compare-cards"),
  compareHead: document.getElementById("compare-head"),
  compareBody: document.getElementById("compare-body"),
  tableWrapper: document.getElementById("compare-table-wrapper"),
  emptyState: document.getElementById("compare-empty"),
  clearCompare: document.getElementById("clear-compare"),
  notification: document.getElementById("notification"),
  pageLoading: document.getElementById("page-loading"),
};

const BUTTON_PRIMARY = "bg-[#ff535d] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#25060a] transition hover:brightness-110";
const BUTTON_SECONDARY = "border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-[#ff535d] hover:text-white";
const BUTTON_ACTIVE = "border border-[#ff535d] bg-[#2b151a] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb2b4] transition";
const MODAL_PRIMARY = "rounded-md bg-[#f7b2b6] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black transition hover:brightness-110";
const MODAL_SECONDARY = "rounded-md border border-[#2a2b34] bg-[#1a1b22] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d3d7e3] transition hover:border-[#ff5d67] hover:text-white";
const MODAL_ACTIVE = "rounded-lg border border-[#ff5d67] bg-[#2a1216] px-4 py-2 font-semibold text-[#ffb6bb] transition";

const showNotification = window.VGHelpers.createNotifier(elements.notification, {
  duration: 1700,
  textSelector: "#notification-text",
});

let modalController = null;

async function onAfterToggle({ type, id }) {
  if (type === "compare") {
    const activeModalId = modalController?.getCurrentCarId?.();
    if (activeModalId && !state.compare.has(activeModalId)) {
      modalController?.close?.();
    }
  }

  renderComparePage();
  modalController?.updateButtons();
}

const { toggleFavorite, toggleWishlist, toggleCompare, persistCollections } = window.VGFirebase.createCollectionActions({
  state,
  notify: showNotification,
  maxCompare: MAX_COMPARE,
  afterToggle: onAfterToggle,
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
  modalPrimaryClass: MODAL_PRIMARY,
  modalSecondaryClass: MODAL_SECONDARY,
  modalActiveClass: MODAL_ACTIVE,
  dotActiveClass: "bg-amber-500",
  dotIdleClass: "bg-white/70",
  imageFitClass: "object-cover",
  autoAdvanceMs: 3800,
  clearCurrentOnClose: false,
  enableSwipe: false,
});

function parseFloatFromText(value = "") {
  return window.VGHelpers.parseNumericValue(value);
}

function deriveZeroToSixty(zeroTo100Text = "") {
  const zeroTo100 = parseFloatFromText(zeroTo100Text);
  if (!zeroTo100) return "--";
  return `${(zeroTo100 * 0.6).toFixed(1)} s`;
}

function carImage(car) {
  return window.VGHelpers.carImage(car, window.CAR_IMAGE_FALLBACK);
}

function getSelectedCars() {
  return [...state.compare]
    .map((id) => getCarById(Number(id)))
    .filter(Boolean)
    .slice(0, MAX_COMPARE);
}

function getButtonLabelState(carId) {
  return {
    isFavorite: state.favorites.has(carId),
    isWishlist: state.wishlist.has(carId),
    isCompare: state.compare.has(carId),
  };
}

async function removeCompare(id) {
  if (!state.compare.has(id)) return;
  state.compare.delete(id);

  if (modalController?.getCurrentCarId?.() === id) {
    modalController.close();
  }

  await persistCollections();
  renderComparePage();
  modalController.updateButtons();
  showNotification("Removed from Compare");
}

async function clearCompare() {
  if (!state.compare.size) {
    showNotification("Compare list is already empty");
    return;
  }

  state.compare.clear();
  modalController.close();

  await persistCollections();
  renderComparePage();
  modalController.updateButtons();
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

function openModal(id) {
  modalController.open(id);
}

function syncFromRemote(remote) {
  window.VGFirebase.applyRemoteCollections(state, remote, MAX_COMPARE);

  const activeModalId = modalController.getCurrentCarId();
  if (activeModalId && !state.compare.has(activeModalId)) {
    modalController.close();
  }

  renderComparePage();
  modalController.updateButtons();
}

async function loadUserState() {
  const remote = await window.VGFirebase.loadCollectionsForCurrentUser(MAX_COMPARE);
  state.favorites = new Set(remote.favorites);
  state.wishlist = new Set(remote.wishlist);
  state.compare = new Set(remote.compare);
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
}

async function init() {
  await window.VGHelpers.bootstrapPage({
    loadUserState,
    render: renderComparePage,
    initEvents,
    pageLoading: elements.pageLoading,
    syncFromRemote,
  });
}

init().catch((error) => {
  console.error("[UI Init Error] compare page failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});