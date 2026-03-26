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

const BUTTON_PRIMARY = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 transition";
const BUTTON_SECONDARY = BUTTON_PRIMARY;
const BUTTON_ACTIVE = `${BUTTON_PRIMARY} ring-2 ring-yellow-300`;
const MODAL_BUTTON_ACTIVE = "rounded-lg bg-slate-500 text-white font-semibold px-4 py-2 transition";

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

function updateQuickInfo() {
  if (!elements.wishlistQuickInfo) return;
  elements.wishlistQuickInfo.textContent = `Wishlist: ${state.wishlist.size} cars`;
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

  return `
    <article class="rounded-2xl border border-slate-700/80 bg-slate-800/85 p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl">
      <div class="relative overflow-hidden rounded-xl">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-56 w-full object-cover transition duration-500 hover:scale-105">
        <span class="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">${car.brand}</span>
      </div>
      <h3 class="mt-4 text-xl font-bold text-white">${car.name}</h3>
      <div class="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-100">
        <p class="rounded-lg bg-slate-900 p-2 text-center">${car.hp}</p>
        <p class="rounded-lg bg-slate-900 p-2 text-center">${car.speed}</p>
        <p class="rounded-lg bg-slate-900 p-2 text-center">${car.price}</p>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button data-action="details" data-id="${car.id}" class="${BUTTON_PRIMARY}">Details</button>
        <button data-action="compare" data-id="${car.id}" class="${isCompare ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isCompare ? "Remove Compare" : "Add Compare"}</button>
        <button data-action="favorite" data-id="${car.id}" class="${isFav ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isFav ? "Unfavorite" : "Favorite"}</button>
        <button data-action="wishlist" data-id="${car.id}" class="${BUTTON_ACTIVE}">Remove Wishlist</button>
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
  const remote = window.vgUserStore?.getLocalState?.() || { favorites: [], wishlist: [], compare: [] };
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
