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
  favoritesContainer: document.getElementById("favorites-container"),
  favoritesEmpty: document.getElementById("favorites-empty"),
  savedCount: document.getElementById("saved-count"),
  compareQuickInfo: document.getElementById("compare-quick-info"),
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

// Stitch integration: dynamic card and modal actions now use the same visual tokens as the provided Stitch layout.
const BUTTON_PRIMARY = "flex-1 bg-primary text-on-primary py-3 text-xs font-black tracking-widest uppercase hover:brightness-110 transition-all active:scale-95";
const BUTTON_SECONDARY = "px-4 bg-surface-container-high text-secondary hover:text-white transition-colors";
const BUTTON_ACTIVE = "flex-1 bg-primary-container text-white py-3 text-xs font-black tracking-widest uppercase transition-all active:scale-95";
const MODAL_BUTTON_ACTIVE = "rounded-lg bg-surface-container-high text-white font-semibold px-4 py-2 transition";

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

function updateCompareQuickInfo() {
  if (!elements.compareQuickInfo) return;
  elements.compareQuickInfo.textContent = "Verified Assets";
}

function updateSavedCount() {
  if (!elements.savedCount) return;
  elements.savedCount.textContent = `${state.favorites.size} Saved`;
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
  renderFavoritesPage();
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
  renderFavoritesPage();
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
  updateCompareQuickInfo();
  renderFavoritesPage();
  updateModalButtons();
}

function favoritesTemplate(car) {
  const isCompare = state.compare.has(car.id);
  const isWishlist = state.wishlist.has(car.id);
  const classTag =
    car.vehicleType === "Hybrid"
      ? "Hybrid Class"
      : car.speed.includes("420") || car.speed.includes("480") || car.speed.includes("383")
        ? "Hypercar Class"
        : "Circuit Ready";

  return `
    <article class="group bg-surface-container-low overflow-hidden transition-all duration-500 hover:bg-surface-variant hover:scale-[1.02]">
      <div class="relative aspect-[16/10] overflow-hidden">
        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" />
        <div class="absolute top-4 right-4 flex gap-2">
          <button data-action="favorite" data-id="${car.id}" class="w-10 h-10 glass-card rounded-full flex items-center justify-center text-white hover:text-primary-container transition-colors" aria-label="Toggle favorite">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">heart_minus</span>
          </button>
        </div>
        <div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
          <span class="text-primary-container text-[10px] font-black tracking-[0.3em] uppercase">${classTag}</span>
        </div>
      </div>
      <div class="p-8">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h3 class="text-2xl font-headline font-bold text-white tracking-tight uppercase">${car.name}</h3>
            <p class="text-secondary text-xs font-label tracking-[0.1em] mt-1 uppercase">${car.maker}</p>
          </div>
          <span class="text-white font-headline font-light text-xl">${car.price}</span>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-surface-container-lowest p-3 border-l-2 border-primary-container/30">
            <span class="block text-[10px] text-secondary font-label tracking-widest uppercase mb-1">Top Speed</span>
            <span class="text-white font-headline font-bold">${car.speed}</span>
          </div>
          <div class="bg-surface-container-lowest p-3 border-l-2 border-primary-container/30">
            <span class="block text-[10px] text-secondary font-label tracking-widest uppercase mb-1">0-60 MPH</span>
            <span class="text-white font-headline font-bold">${car.zeroTo100Mph || car.hp}</span>
          </div>
        </div>
        <div class="flex gap-4">
          <button data-action="compare" data-id="${car.id}" class="${isCompare ? BUTTON_ACTIVE : BUTTON_PRIMARY}">${isCompare ? "Remove Compare" : "Compare"}</button>
          <button data-action="details" data-id="${car.id}" class="${BUTTON_SECONDARY}" aria-label="Open details">
            <span class="material-symbols-outlined">share</span>
          </button>
          <button data-action="wishlist" data-id="${car.id}" class="hidden">${isWishlist ? "Remove Wishlist" : "Wishlist"}</button>
        </button>
      </div>
    </article>
  `;
}

function renderFavoritesPage() {
  if (!elements.favoritesContainer || !elements.favoritesEmpty) return;

  const favoriteCars = [...state.favorites].map((id) => getCarById(id)).filter(Boolean);

  if (!favoriteCars.length) {
    elements.favoritesContainer.innerHTML = "";
    elements.favoritesEmpty.classList.remove("hidden");
    updateSavedCount();
    updateCompareQuickInfo();
    return;
  }

  elements.favoritesEmpty.classList.add("hidden");
  elements.favoritesContainer.innerHTML = favoriteCars.map(favoritesTemplate).join("");
  updateSavedCount();
  updateCompareQuickInfo();
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
  renderFavoritesPage();
  updateModalButtons();
}

async function loadFavorites(uid) {
  const remote = await window.vgUserStore?.loadUserData?.(uid);
  console.log("[UI Read] favorites page loadFavorites for uid:", uid, remote?.favorites || []);
  return new Set(remote?.favorites || []);
}

async function loadUserState() {
  const user = window.vgUserStore?.getCurrentUser?.();
  const uid = user?.uid || "unknown";
  const remote = await window.vgUserStore?.loadUserData?.(uid);
  state.favorites = await loadFavorites(uid);
  state.wishlist = new Set(remote.wishlist || []);
  state.compare = new Set(remote.compare || []);
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
  await window.vgUserStore?.waitForReady?.();
  await loadUserState();

  renderFavoritesPage();
  initEvents();
  elements.pageLoading?.classList.add("hidden");

  window.vgUserStore?.bindThemeToggle?.();
  window.vgUserStore?.subscribeUserState?.((remote) => {
    syncFromRemote(remote);
  });
}

init().catch((error) => {
  console.error("[UI Init Error] favorites page failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});
