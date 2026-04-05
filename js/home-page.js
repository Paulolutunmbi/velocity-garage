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
  carouselIndex: 0,
  carouselTimer: null,
};

const elements = {
  carsContainer: document.getElementById("cars-container"),
  compareBar: document.getElementById("compare-bar"),
  notification: document.getElementById("notification"),
  backToTop: document.getElementById("back-to-top"),
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

let modalController = null;

const BUTTON_PRIMARY = "bg-[#ff535d] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#25060a] transition hover:brightness-110";
const BUTTON_SECONDARY = "border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-[#ff535d] hover:text-white";
const BUTTON_ACTIVE = "border border-[#ff535d] bg-[#2b151a] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb2b4] transition";
const MODAL_PRIMARY = "rounded-md bg-[#f7b2b6] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black transition hover:brightness-110";
const MODAL_SECONDARY = "rounded-md border border-[#2a2b34] bg-[#1a1b22] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d3d7e3] transition hover:border-[#ff5d67] hover:text-white";
const MODAL_ACTIVE = "rounded-lg border border-[#ff5d67] bg-[#2a1216] px-4 py-2 font-semibold text-[#ffb6bb] transition";

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
      count: Math.max(0, Number(value?.favoritesCount ?? value?.favoriteCount ?? value?.count ?? 0)),
      firstName: String(value?.name || "").trim().split(/\s+/)[0] || shortUid(uid),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getTopCarsFromUsers(users = []) {
  const cars = {};
  users.forEach((user) => {
    window.VGHelpers.normalizeIds(user.favorites).forEach((carId) => {
      const key = String(carId);
      cars[key] = (cars[key] || 0) + 1;
    });
  });

  return normalizeTopCars(cars);
}

function getTopUsersFromUsers(users = []) {
  const usersMap = {};
  users.forEach((user) => {
    const uid = String(user.id || "");
    if (!uid) return;
    const favoritesCount = Math.max(
      0,
      Number(
        user.favoritesCount ??
          user.favoriteCount ??
          window.VGHelpers.normalizeIds(user.favorites).length
      )
    );

    usersMap[uid] = {
      favoritesCount,
      name: String(user.firstName || user.name || user.email || "").split(/\s|@/)[0] || shortUid(uid),
    };
  });

  return normalizeTopUsers(usersMap);
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
  // Live users snapshot avoids stale leaderboard/stats docs and updates immediately.
  window.vgUserStore?.subscribeUsers?.((users) => {
    renderHomeTopCars(getTopCarsFromUsers(users));
    renderHomeTopUsers(getTopUsersFromUsers(users));
  });
}

const showNotification = window.VGHelpers.createNotifier(elements.notification, { duration: 1800 });

function parsePrice(car) {
  return typeof car.priceValue === "number" ? car.priceValue : Number(String(car.price).replace(/[^0-9]/g, ""));
}

function parseSpeed(car) {
  return typeof car.speedValue === "number" ? car.speedValue : Number(String(car.speed).replace(/[^0-9]/g, ""));
}

function parseHp(car) {
  return typeof car.hpValue === "number" ? car.hpValue : Number(String(car.hp).replace(/[^0-9]/g, ""));
}

function cardImage(car) {
  return window.VGHelpers.carImage(car, window.CAR_IMAGE_FALLBACK);
}

function getCompareCars() {
  return [...state.compare].map((id) => getCarById(id)).filter(Boolean);
}

const { toggleFavorite, toggleWishlist, toggleCompare } = window.VGFirebase.createCollectionActions({
  state,
  notify: showNotification,
  maxCompare: MAX_COMPARE,
  afterToggle: async () => {
    updateCompareBar();
    renderCatalog();
    renderRecommendationCardIfPresent();
    modalController?.updateButtons();
  },
});

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

  return window.VGCard.renderCompareStyleCard({
    car,
    imageUrl: cardImage(car),
    articleClassName: "card-reveal shadow-lg transition hover:-translate-y-1 hover:shadow-2xl",
    articleStyle: `animation-delay:${delayMs}ms`,
    subtitle: car.country,
    topBadge: car.brand,
    topAction: {
      action: "favorite",
      ariaLabel: isFav ? "Remove from favorites" : "Add to favorites",
      iconSvg: window.VGCard.HEART_ICON,
    },
    specs: [
      {
        label: "Top Speed",
        value: car.speed,
        valueClassName: "display-font text-lg font-bold text-white",
      },
      {
        label: "Horsepower",
        value: car.hp,
        valueClassName: "display-font text-lg font-bold text-white",
      },
      {
        label: "Price",
        value: car.price,
        valueClassName: "display-font text-lg font-bold text-white",
      },
    ],
    actions: [
      { action: "details", id: car.id, label: "Details", className: BUTTON_PRIMARY },
      {
        action: "compare",
        id: car.id,
        label: isCompare ? "Remove Compare" : "Add Compare",
        className: isCompare ? BUTTON_ACTIVE : BUTTON_SECONDARY,
      },
      {
        action: "favorite",
        id: car.id,
        label: isFav ? "Unfavorite" : "Favorite",
        className: isFav ? BUTTON_ACTIVE : BUTTON_SECONDARY,
      },
      {
        action: "wishlist",
        id: car.id,
        label: isWishlist ? "Remove Wishlist" : "Wishlist",
        className: isWishlist ? BUTTON_ACTIVE : BUTTON_SECONDARY,
      },
    ],
  });
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
  imageFitClass: "object-contain",
  autoAdvanceMs: 3800,
  clearCurrentOnClose: false,
  enableSwipe: false,
});

function openModal(id) {
  modalController.open(id);
}

function closeModal() {
  modalController.close();
}

function updateModalButtons() {
  modalController.updateButtons();
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
    <div class="space-y-3">
      <p class="text-[10px] font-bold uppercase tracking-[0.26em] text-[#ffb2b4]">AI recommendation</p>
      ${window.VGCard.renderCompareStyleCard({
        car,
        imageUrl: cardImage(car),
        subtitle: car.country,
        topBadge: car.brand,
        topAction: {
          action: "rec-favorite",
          ariaLabel: isFav ? "Remove from favorites" : "Add to favorites",
          iconSvg: window.VGCard.HEART_ICON,
        },
        description: car.description,
        specs: [
          {
            label: "Top Speed",
            value: car.speed,
            valueClassName: "display-font text-lg font-bold text-white",
          },
          {
            label: "Horsepower",
            value: car.hp,
            valueClassName: "display-font text-lg font-bold text-white",
          },
          {
            label: "Price",
            value: car.price,
            valueClassName: "display-font text-lg font-bold text-white",
          },
        ],
        actions: [
          {
            action: "rec-compare",
            id: car.id,
            label: isCompare ? "Remove Compare" : "Add Compare",
            className: isCompare ? BUTTON_ACTIVE : BUTTON_SECONDARY,
          },
          {
            action: "rec-favorite",
            id: car.id,
            label: isFav ? "Unfavorite" : "Favorite",
            className: isFav ? BUTTON_ACTIVE : BUTTON_SECONDARY,
          },
          {
            action: "rec-wishlist",
            id: car.id,
            label: isWishlist ? "Remove Wishlist" : "Wishlist",
            className: isWishlist ? BUTTON_ACTIVE : BUTTON_SECONDARY,
          },
          {
            action: "rec-details",
            id: car.id,
            label: "Open Details",
            className: BUTTON_PRIMARY,
          },
        ],
      })}
    </div>
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
      <article class="relative h-full min-w-full">
        <div class="h-full overflow-hidden">
          <img src="${cardImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-full w-full object-cover object-center">
        </div>
        <div class="absolute bottom-20 left-4 right-4 max-w-sm rounded-xl bg-black/65 px-3 py-2 text-white backdrop-blur-sm sm:bottom-10 sm:left-8 sm:right-auto">
          <p class="text-[11px] uppercase tracking-wide text-orange-300">${car.brand}</p>
          <h3 class="text-base font-bold leading-tight sm:text-lg">${car.name}</h3>
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

  // Keep the active slide aligned on viewport size changes.
  window.addEventListener("resize", () => {
    setSlide(state.carouselIndex);
  });

  state.carouselTimer = setInterval(next, 4500);
  setSlide(0);
}

function syncFromRemote(remote) {
  window.VGFirebase.applyRemoteCollections(state, remote, MAX_COMPARE);
  renderCatalog();
  updateCompareBar();
  renderRecommendationCardIfPresent();
  updateModalButtons();
}

async function loadUserState() {
  const remote = await window.VGFirebase.loadCollectionsForCurrentUser(MAX_COMPARE);
  state.favorites = new Set(remote.favorites);
  state.wishlist = new Set(remote.wishlist);
  state.compare = new Set(remote.compare);
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
      const shouldShow = window.scrollY > 420;
      elements.backToTop.classList.toggle("opacity-0", !shouldShow);
      elements.backToTop.classList.toggle("pointer-events-none", !shouldShow);
      elements.backToTop.classList.toggle("translate-y-3", !shouldShow);
      elements.backToTop.classList.toggle("opacity-100", shouldShow);
      elements.backToTop.classList.toggle("translate-y-0", shouldShow);
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
