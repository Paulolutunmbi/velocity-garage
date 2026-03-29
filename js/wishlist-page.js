const MAX_COMPARE = 3;

const localState = window.vgUserStore?.getLocalState?.() || {
  favorites: [],
  wishlist: [],
  compare: [],
  darkMode: true,
};

const state = {
  favorites: new Set(localState.favorites || []),
  wishlist: new Set(localState.wishlist || []),
  compare: new Set(localState.compare || []),
  currentModalCarId: null,
  modalCarouselImages: [],
  modalCarouselIndex: 0,
  modalCarouselTimer: null,
};

const elements = {
  wishlistContainer: document.getElementById("wishlist-container"),
  wishlistEmpty: document.getElementById("wishlist-empty"),
  wishlistQuickInfo: document.getElementById("wishlist-quick-info"),
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
  modalPrice: document.getElementById("modal-price"),
  modalDesc: document.getElementById("modal-desc"),
  modalCompare: document.getElementById("modal-compare"),
  modalFav: document.getElementById("modal-fav"),
  modalWishlist: document.getElementById("modal-wishlist"),
  pageLoading: document.getElementById("page-loading"),
};

// UI Refresh: button styles aligned with Stitch-inspired wishlist shell.
const BUTTON_PRIMARY = "border border-outline-variant/30 bg-primary px-4 py-2 font-label text-xs uppercase tracking-[0.14em] text-on-primary transition hover:bg-white";
const BUTTON_SECONDARY = "border border-outline-variant/30 bg-surface-container px-4 py-2 font-label text-xs uppercase tracking-[0.14em] text-on-surface transition hover:bg-surface-container-high";
const BUTTON_ACTIVE = "border border-tertiary/50 bg-tertiary-container px-4 py-2 font-label text-xs uppercase tracking-[0.14em] text-tertiary transition hover:bg-tertiary hover:text-on-tertiary";
const MODAL_BUTTON_ACTIVE = "border border-tertiary/50 bg-tertiary-container px-4 py-2 font-label text-xs uppercase tracking-[0.14em] text-tertiary transition";

function carImage(car) {
  return car.image || car.images?.[0] || CAR_IMAGE_FALLBACK;
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
  setTimeout(() => elements.notification.classList.add("hidden"), 1700);
}

function parseMoneyValue(priceText) {
  if (typeof priceText !== "string") return 0;
  const numeric = Number(priceText.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCompactDollars(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function updateQuickInfo() {
  if (!elements.wishlistQuickInfo) return;
  const wishlistCars = [...state.wishlist].map((id) => getCarById(id)).filter(Boolean);
  const totalValue = wishlistCars.reduce((sum, car) => sum + parseMoneyValue(car.price), 0);
  elements.wishlistQuickInfo.innerHTML = `<span class="inline-flex items-center gap-2"><span class="inline-block h-1.5 w-1.5 rounded-full bg-tertiary"></span>${wishlistCars.length} Vehicles Found</span><span>Est. Value: ${formatCompactDollars(totalValue)}</span>`;
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

function wishlistTemplate(car) {
  const isCompare = state.compare.has(car.id);
  const isFav = state.favorites.has(car.id);

  // UI Refresh: card markup matches the new editorial grid while preserving data-action hooks.
  return `
    <article class="group relative flex flex-col overflow-hidden border border-outline-variant/20 bg-surface-container-low transition duration-500 hover:shadow-2xl hover:shadow-black/40">
      <div class="relative aspect-[16/10] overflow-hidden">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-full w-full object-cover grayscale-[0.18] transition-all duration-700 ease-out group-hover:scale-110 group-hover:grayscale-0">
        <button data-action="wishlist" data-id="${car.id}" class="absolute right-3 top-3 border border-outline-variant/30 bg-[#131313]/85 p-2 text-on-surface transition hover:border-tertiary/50 hover:text-tertiary" aria-label="Remove from wishlist">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div class="flex flex-1 flex-col p-5 sm:p-6">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <p class="mb-1 font-label text-[10px] uppercase tracking-[0.3em] text-tertiary">${car.brand}</p>
            <h3 class="font-headline text-[2rem] italic leading-[1.04] text-on-surface">${car.name}</h3>
          </div>
          <div class="text-right">
            <p class="font-headline text-3xl leading-none tracking-tight text-on-surface">${car.price}</p>
            <p class="mt-1 font-label text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">${isFav ? "Saved" : "Market Value"}</p>
          </div>
        </div>

        <div class="mb-6 grid grid-cols-2 gap-px bg-outline-variant/10">
          <div class="bg-surface-container-low py-2">
            <p class="mb-1 font-label text-[9px] uppercase tracking-[0.14em] text-on-surface-variant">0-60 MPH</p>
            <p class="font-body text-2xl font-bold leading-none tracking-tight text-on-surface">${car.zeroTo100Mph || "N/A"}</p>
          </div>
          <div class="bg-surface-container-low py-2 pl-4">
            <p class="mb-1 font-label text-[9px] uppercase tracking-[0.14em] text-on-surface-variant">Top Speed</p>
            <p class="font-body text-2xl font-bold leading-none tracking-tight text-on-surface">${car.speed || "N/A"}</p>
          </div>
        </div>

        <div class="mt-auto grid grid-cols-[1fr_auto_auto] gap-2">
          <button data-action="details" data-id="${car.id}" class="${BUTTON_PRIMARY}">View Details</button>
          <button data-action="compare" data-id="${car.id}" class="${isCompare ? BUTTON_ACTIVE : BUTTON_SECONDARY}" aria-label="${isCompare ? "Remove from compare" : "Add to compare"}">
            <span class="material-symbols-outlined text-[18px]">compare_arrows</span>
          </button>
          <button data-action="favorite" data-id="${car.id}" class="${isFav ? BUTTON_ACTIVE : BUTTON_SECONDARY}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}">
            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' ${isFav ? 1 : 0};">favorite</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderWishlistPage() {
  if (!elements.wishlistContainer || !elements.wishlistEmpty) return;

  const wishlistCars = [...state.wishlist].map((id) => getCarById(id)).filter(Boolean);

  if (!wishlistCars.length) {
    elements.wishlistContainer.innerHTML = "";
    elements.wishlistEmpty.classList.remove("hidden");
    updateQuickInfo();
    return;
  }

  elements.wishlistEmpty.classList.add("hidden");
  elements.wishlistContainer.innerHTML = wishlistCars.map(wishlistTemplate).join("");
  updateQuickInfo();
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
      <div class="min-w-full">
        <img src="${imageUrl}" alt="${car.name} image ${imageIndex + 1}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-64 w-full object-cover">
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
  state.favorites = new Set(remote.favorites || []);
  state.wishlist = new Set(remote.wishlist || []);
  state.compare = new Set(remote.compare || []);
  renderWishlistPage();
  updateModalButtons();
}

async function loadUserState() {
  await window.vgUserStore?.waitForReady?.();
  const uid = window.vgUserStore?.getCurrentUser?.()?.uid || "unknown";
  const remote = await window.vgUserStore?.loadUserData?.(uid) || { favorites: [], wishlist: [], compare: [] };
  console.log("[UI Read] wishlist page loaded state", remote);
  state.favorites = new Set(remote.favorites || []);
  state.wishlist = new Set(remote.wishlist || []);
  state.compare = new Set(remote.compare || []);
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

}

async function init() {
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
