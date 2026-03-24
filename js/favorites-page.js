const FAVORITES_KEY = "vg-favorites";
const COMPARE_KEY = "vg-compare";
const MAX_COMPARE = 3;

const state = {
  favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")),
  compare: new Set(JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]")),
  currentModalCarId: null,
  modalCarouselImages: [],
  modalCarouselIndex: 0,
  modalCarouselTimer: null,
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
};

// Shared action button treatment for all generated controls.
const BUTTON_PRIMARY = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 transition";
const BUTTON_SECONDARY = BUTTON_PRIMARY;
const BUTTON_ACTIVE = `${BUTTON_PRIMARY} ring-2 ring-yellow-300`;

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
        <button data-action="favorite" data-id="${car.id}" class="${BUTTON_ACTIVE}">Unfavorite</button>
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

  // Build a fresh gallery every time to avoid stale image state between cars.
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

  elements.modalCompare.textContent = isCompare ? "Remove from Compare" : "Add to Compare";
  elements.modalCompare.className = `${isCompare ? BUTTON_ACTIVE : BUTTON_PRIMARY} text-sm`;

  elements.modalFav.textContent = isFav ? "Remove from Favorites" : "Add to Favorites";
  elements.modalFav.className = `${isFav ? BUTTON_ACTIVE : BUTTON_SECONDARY} text-sm`;
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

  elements.modalCompare?.addEventListener("click", () => {
    if (state.currentModalCarId !== null) toggleCompare(state.currentModalCarId);
  });

  elements.modalFav?.addEventListener("click", () => {
    if (state.currentModalCarId !== null) toggleFavorite(state.currentModalCarId);
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
  });
}

function init() {
  renderFavoritesPage();
  initEvents();
}

init();
