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
  carouselIndex: 0,
  carouselTimer: null,
};

const elements = {
  carsContainer: document.getElementById("cars-container"),
  compareBar: document.getElementById("compare-bar"),
  notification: document.getElementById("notification"),
  backToTop: document.getElementById("back-to-top"),
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
  modalWishlist: document.getElementById("modal-wishlist"),
  searchInput: document.getElementById("search"),
  brandFilter: document.getElementById("filter-brand"),
  regionFilter: document.getElementById("filter-region"),
  sortBy: document.getElementById("sort-by"),
  clearFilters: document.getElementById("clear-filters"),
  aiBudget: document.getElementById("ai-budget"),
  aiPriority: document.getElementById("ai-priority"),
  aiRegion: document.getElementById("ai-region"),
  aiRun: document.getElementById("ai-run"),
  aiResult: document.getElementById("ai-result"),
  heroScroll: document.getElementById("hero-scroll"),
  scrollCatalog: document.getElementById("scroll-catalog"),
  scrollRecommendation: document.getElementById("scroll-recommendation"),
  catalogSection: document.getElementById("catalog-section"),
  recommendationSection: document.getElementById("recommendation-section"),
  carouselTrack: document.getElementById("carousel-track"),
  carouselDots: document.getElementById("carousel-dots"),
  carouselPrev: document.getElementById("carousel-prev"),
  carouselNext: document.getElementById("carousel-next"),
  pageLoading: document.getElementById("page-loading"),
  leaderboardCars: document.getElementById("home-leaderboard-cars"),
  leaderboardCarsEmpty: document.getElementById("home-leaderboard-cars-empty"),
  leaderboardUsers: document.getElementById("home-leaderboard-users"),
  leaderboardUsersEmpty: document.getElementById("home-leaderboard-users-empty"),
};

const BUTTON_PRIMARY = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 transition";
const BUTTON_SECONDARY = BUTTON_PRIMARY;
const BUTTON_ACTIVE = `${BUTTON_PRIMARY} ring-2 ring-yellow-300`;
const MODAL_BUTTON_ACTIVE = "rounded-lg bg-slate-500 text-white font-semibold px-4 py-2 transition";

function medal(rank) {
  if (rank === 0) return "🥇";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return `#${rank + 1}`;
}

function shortUid(uid = "") {
  return uid ? `${uid.slice(0, 6)}...` : "Driver";
}

function normalizeTopCars(carsMap = {}) {
  return Object.entries(carsMap)
    .map(([carId, count]) => ({ carId, count: Math.max(0, Number(count || 0)) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function normalizeTopUsers(usersMap = {}) {
  return Object.entries(usersMap)
    .map(([uid, value]) => ({
      uid,
      count: Math.max(0, Number(value?.count || 0)),
      firstName: String(value?.name || "").trim().split(/\s+/)[0] || shortUid(uid),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function renderHomeTopCars(topCars = []) {
  if (!elements.leaderboardCars || !elements.leaderboardCarsEmpty) return;

  if (!topCars.length) {
    elements.leaderboardCars.innerHTML = "";
    elements.leaderboardCarsEmpty.classList.remove("hidden");
    return;
  }

  elements.leaderboardCarsEmpty.classList.add("hidden");
  elements.leaderboardCars.innerHTML = topCars
    .map((item, index) => {
      const car = getCarById(Number(item.carId));
      if (!car) return "";

      return `
      <article class="card-reveal rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 text-sm transition hover:-translate-y-0.5 hover:border-orange-400/50 hover:shadow-lg">
        <div class="flex items-center gap-3">
          <img src="${car.image}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-12 w-16 rounded object-cover">
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-white">${medal(index)} ${car.name}</p>
            <p class="text-xs text-slate-300">${car.brand}</p>
          </div>
          <span class="rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">${item.count} ❤️</span>
        </div>
      </article>`;
    })
    .join("");
}

function renderHomeTopUsers(topUsers = []) {
  if (!elements.leaderboardUsers || !elements.leaderboardUsersEmpty) return;

  if (!topUsers.length) {
    elements.leaderboardUsers.innerHTML = "";
    elements.leaderboardUsersEmpty.classList.remove("hidden");
    return;
  }

  elements.leaderboardUsersEmpty.classList.add("hidden");
  elements.leaderboardUsers.innerHTML = topUsers
    .map(
      (item, index) => `
      <article class="card-reveal flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm transition hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-lg">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">${medal(index)}</span>
          <span class="font-semibold text-white">${item.firstName}</span>
        </div>
        <span class="rounded-full border border-blue-300/40 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">${item.count} ❤️</span>
      </article>`
    )
    .join("");
}

function initLeaderboard() {
  window.vgUserStore?.subscribeLeaderboard?.((stats) => {
    renderHomeTopCars(normalizeTopCars(stats?.cars || {}));
    renderHomeTopUsers(normalizeTopUsers(stats?.users || {}));
  });
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
  setTimeout(() => elements.notification.classList.add("hidden"), 1800);
}

function parsePrice(car) {
  return typeof car.priceValue === "number" ? car.priceValue : Number(String(car.price).replace(/[^0-9]/g, ""));
}

function parseSpeed(car) {
  return typeof car.speedValue === "number" ? car.speedValue : Number(String(car.speed).replace(/[^0-9]/g, ""));
}

function parseHp(car) {
  return typeof car.hpValue === "number" ? car.hpValue : Number(String(car.hp).replace(/[^0-9]/g, ""));
}

function getCompareCars() {
  return [...state.compare].map((id) => getCarById(id)).filter(Boolean);
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
  renderCatalog();
  renderRecommendationCardIfPresent();
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
  renderCatalog();
  renderRecommendationCardIfPresent();
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
  updateCompareBar();
  renderCatalog();
  renderRecommendationCardIfPresent();
  updateModalButtons();
}

function updateCompareBar() {
  if (!elements.compareBar) return;

  if (!state.compare.size) {
    elements.compareBar.classList.add("hidden");
    elements.compareBar.innerHTML = "";
    return;
  }

  const names = getCompareCars().map((car) => car.name).join(" • ");
  elements.compareBar.classList.remove("hidden");
  elements.compareBar.innerHTML = `Comparing ${state.compare.size}/3: ${names} <a href="compare.html" class="ml-2 underline underline-offset-2">Open Compare</a>`;
}

function carCardTemplate(car, delayMs) {
  const isFav = state.favorites.has(car.id);
  const isWishlist = state.wishlist.has(car.id);
  const isCompare = state.compare.has(car.id);

  return `
    <article class="card-reveal rounded-2xl border border-slate-700/80 bg-slate-800/85 p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl" style="animation-delay:${delayMs}ms">
      <div class="relative overflow-hidden rounded-xl">
        <img src="${car.image}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-56 w-full object-cover transition duration-500 hover:scale-105">
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
        <button data-action="wishlist" data-id="${car.id}" class="${isWishlist ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isWishlist ? "Remove Wishlist" : "Wishlist"}</button>
      </div>
    </article>
  `;
}

function renderCatalog() {
  if (!elements.carsContainer) return;

  const searchValue = (elements.searchInput?.value || "").trim().toLowerCase();
  const selectedBrand = elements.brandFilter?.value || "";
  const selectedRegion = elements.regionFilter?.value || "";
  const selectedSort = elements.sortBy?.value || "";

  let filtered = cars.filter((car) => {
    const text = `${car.name} ${car.brand}`.toLowerCase();
    const searchMatch = !searchValue || text.includes(searchValue);
    const brandMatch = !selectedBrand || car.brand === selectedBrand;
    const regionMatch = !selectedRegion || car.country.includes(selectedRegion);
    return searchMatch && brandMatch && regionMatch;
  });

  if (selectedSort === "price-low") filtered.sort((a, b) => parsePrice(a) - parsePrice(b));
  if (selectedSort === "price-high") filtered.sort((a, b) => parsePrice(b) - parsePrice(a));
  if (selectedSort === "speed") filtered.sort((a, b) => parseSpeed(b) - parseSpeed(a));
  if (selectedSort === "hp") filtered.sort((a, b) => parseHp(b) - parseHp(a));

  if (!filtered.length) {
    elements.carsContainer.innerHTML = "<p class='rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-sm text-slate-200'>No cars matched your filter. Try broadening your search.</p>";
    return;
  }

  elements.carsContainer.innerHTML = filtered.map((car, index) => carCardTemplate(car, Math.min(index * 40, 240))).join("");
}

function populateBrandFilter() {
  if (!elements.brandFilter) return;

  const brands = [...new Set(cars.map((car) => car.brand))].sort();
  for (const brand of brands) {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    elements.brandFilter.append(option);
  }
}

function getModalImages(car) {
  const images = Array.isArray(car.images) ? car.images.filter(Boolean) : [];
  if (images.length) return images;
  return [car.image || CAR_IMAGE_FALLBACK];
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

function runRecommendation() {
  if (!elements.aiResult) return;

  const budget = elements.aiBudget.value;
  const priority = elements.aiPriority.value;
  const region = elements.aiRegion.value;

  elements.aiResult.innerHTML = "<div class='flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200'><div class='h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent'></div>Analyzing your preferences...</div>";

  setTimeout(() => {
    let bestCar = null;
    let bestScore = -Infinity;

    for (const car of cars) {
      let score = 0;

      const price = parsePrice(car);
      const speed = parseSpeed(car);
      const hp = parseHp(car);

      if (budget === "500k" && price <= 500000) score += 4;
      if (budget === "1m" && price <= 1000000) score += 4;
      if (budget === "3m" && price > 1000000) score += 4;

      if (priority === "speed") score += speed;
      if (priority === "power") score += hp;
      if (priority === "balanced") score += speed * 0.5 + hp * 0.5;

      if (region === "europe" && ["Italy", "Germany", "United Kingdom", "France", "Sweden"].some((token) => car.country.includes(token))) score += 3;
      if (region === "usa" && car.country.includes("USA")) score += 3;
      if (region === "asia" && ["Japan", "China", "Korea"].some((token) => car.country.includes(token))) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestCar = car;
      }
    }

    if (!bestCar) {
      elements.aiResult.innerHTML = "<p class='rounded-xl border border-dashed border-slate-600 bg-slate-900/70 p-4 text-sm text-slate-200'>No recommendation available right now.</p>";
      return;
    }

    elements.aiResult.innerHTML = recommendationCard(bestCar);
    elements.aiResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 550);
}

function recommendationCard(car) {
  const isFav = state.favorites.has(car.id);
  const isWishlist = state.wishlist.has(car.id);
  const isCompare = state.compare.has(car.id);

  return `
    <article class="rounded-2xl border border-slate-700/80 bg-slate-800/85 p-5 shadow-xl">
      <p class="mb-2 text-xs font-bold uppercase tracking-wide text-orange-500">AI recommendation</p>
      <h3 class="text-2xl font-bold text-white">${car.name}</h3>
      <div class="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <img src="${car.image}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-56 w-full rounded-xl object-cover">
        <div>
          <p class="text-sm text-slate-200">${car.description}</p>
          <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-100">
            <p class="rounded-lg bg-slate-900 p-2">Brand: ${car.brand}</p>
            <p class="rounded-lg bg-slate-900 p-2">Country: ${car.country}</p>
            <p class="rounded-lg bg-slate-900 p-2">Power: ${car.hp}</p>
            <p class="rounded-lg bg-slate-900 p-2">Top speed: ${car.speed}</p>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button data-action="rec-compare" data-id="${car.id}" class="${isCompare ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isCompare ? "Remove Compare" : "Add Compare"}</button>
            <button data-action="rec-favorite" data-id="${car.id}" class="${isFav ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isFav ? "Unfavorite" : "Favorite"}</button>
            <button data-action="rec-wishlist" data-id="${car.id}" class="${isWishlist ? BUTTON_ACTIVE : BUTTON_SECONDARY}">${isWishlist ? "Remove Wishlist" : "Wishlist"}</button>
            <button data-action="rec-details" data-id="${car.id}" class="${BUTTON_PRIMARY}">Open Details</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderRecommendationCardIfPresent() {
  const recCardButton = elements.aiResult?.querySelector("[data-action='rec-details']");
  if (!recCardButton) return;
  const carId = Number(recCardButton.dataset.id);
  const car = getCarById(carId);
  if (car) {
    elements.aiResult.innerHTML = recommendationCard(car);
  }
}

function initCarousel() {
  if (!elements.carouselTrack || !elements.carouselDots) return;

  const slides = cars.slice(0, 8);
  elements.carouselTrack.innerHTML = slides
    .map(
      (car) => `
      <article class="relative min-w-full p-1">
        <div class="overflow-hidden rounded-2xl">
          <img src="${car.image}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-72 w-full object-cover md:h-80">
        </div>
        <div class="absolute bottom-10 left-4 rounded-xl bg-black/70 px-3 py-2 text-white">
          <p class="text-xs uppercase tracking-wide text-orange-300">${car.brand}</p>
          <h3 class="text-lg font-bold">${car.name}</h3>
        </div>
      </article>`
    )
    .join("");

  elements.carouselDots.innerHTML = slides
    .map((_, index) => `<button data-dot="${index}" class="h-2.5 w-2.5 rounded-full bg-white/65 transition ${index === 0 ? "w-6 bg-orange-500" : ""}" aria-label="Go to slide ${index + 1}"></button>`)
    .join("");

  let touchStartX = 0;

  const setSlide = (index) => {
    state.carouselIndex = (index + slides.length) % slides.length;
    elements.carouselTrack.style.transform = `translateX(-${state.carouselIndex * 100}%)`;
    const dots = [...elements.carouselDots.querySelectorAll("button")];
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("w-6", dotIndex === state.carouselIndex);
      dot.classList.toggle("bg-orange-500", dotIndex === state.carouselIndex);
      dot.classList.toggle("bg-white/65", dotIndex !== state.carouselIndex);
    });
  };

  const next = () => setSlide(state.carouselIndex + 1);
  const prev = () => setSlide(state.carouselIndex - 1);

  elements.carouselNext?.addEventListener("click", next);
  elements.carouselPrev?.addEventListener("click", prev);
  elements.carouselDots.addEventListener("click", (event) => {
    const dot = event.target.closest("button[data-dot]");
    if (!dot) return;
    setSlide(Number(dot.dataset.dot));
  });

  elements.carouselTrack.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  });

  elements.carouselTrack.addEventListener("touchend", (event) => {
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (delta > 35) prev();
    if (delta < -35) next();
  });

  state.carouselTimer = setInterval(next, 4500);
  setSlide(0);
}

function syncFromRemote(remote) {
  state.favorites = new Set(remote.favorites || []);
  state.wishlist = new Set(remote.wishlist || []);
  state.compare = new Set(remote.compare || []);
  renderCatalog();
  updateCompareBar();
  renderRecommendationCardIfPresent();
  updateModalButtons();
}

async function loadFavorites(uid) {
  const remote = await window.vgUserStore?.loadUserData?.(uid);
  console.log("[UI Read] loadFavorites for uid:", uid, remote?.favorites || []);
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
  elements.carsContainer?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (action === "details") openModal(id);
    if (action === "favorite") await toggleFavorite(id);
    if (action === "wishlist") await toggleWishlist(id);
    if (action === "compare") await toggleCompare(id);
  });

  elements.aiResult?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "rec-favorite") await toggleFavorite(id);
    if (button.dataset.action === "rec-wishlist") await toggleWishlist(id);
    if (button.dataset.action === "rec-compare") await toggleCompare(id);
    if (button.dataset.action === "rec-details") openModal(id);
  });

  elements.modalCompare?.addEventListener("click", async () => {
    if (state.currentModalCarId !== null) {
      await toggleCompare(state.currentModalCarId);
    }
  });

  elements.modalFav?.addEventListener("click", async () => {
    if (state.currentModalCarId !== null) {
      await toggleFavorite(state.currentModalCarId);
    }
  });

  elements.modalWishlist?.addEventListener("click", async () => {
    if (state.currentModalCarId !== null) {
      await toggleWishlist(state.currentModalCarId);
    }
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

  [elements.searchInput, elements.brandFilter, elements.regionFilter].forEach((input) => {
    input?.addEventListener("input", renderCatalog);
    input?.addEventListener("change", renderCatalog);
  });

  elements.sortBy?.addEventListener("change", renderCatalog);

  elements.clearFilters?.addEventListener("click", () => {
    if (elements.searchInput) elements.searchInput.value = "";
    if (elements.brandFilter) elements.brandFilter.value = "";
    if (elements.regionFilter) elements.regionFilter.value = "";
    if (elements.sortBy) elements.sortBy.value = "";
    renderCatalog();
  });

  elements.aiRun?.addEventListener("click", runRecommendation);

  elements.heroScroll?.addEventListener("click", () => {
    elements.catalogSection?.scrollIntoView({ behavior: "smooth" });
  });

  elements.scrollCatalog?.addEventListener("click", () => {
    elements.catalogSection?.scrollIntoView({ behavior: "smooth" });
  });

  elements.scrollRecommendation?.addEventListener("click", () => {
    elements.recommendationSection?.scrollIntoView({ behavior: "smooth" });
  });

  if (elements.backToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 420) elements.backToTop.classList.remove("hidden");
      else elements.backToTop.classList.add("hidden");
    });

    elements.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

}

async function init() {
  await window.vgUserStore?.waitForReady?.();
  await loadUserState();

  populateBrandFilter();
  renderCatalog();
  updateCompareBar();
  initCarousel();
  initLeaderboard();
  initEvents();
  elements.pageLoading?.classList.add("hidden");

  window.vgUserStore?.bindThemeToggle?.();
  window.vgUserStore?.subscribeUserState?.((remote) => {
    syncFromRemote(remote);
  });
}

init().catch((error) => {
  console.error("[UI Init Error] home app failed to initialize", error);
  elements.pageLoading?.classList.add("hidden");
});
