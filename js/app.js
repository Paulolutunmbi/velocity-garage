const FAVORITES_KEY = "vg-favorites";
const COMPARE_KEY = "vg-compare";
const THEME_KEY = "vg-theme";
const MAX_COMPARE = 3;

const state = {
  favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")),
  compare: new Set(JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]")),
  currentModalCarId: null,
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
  modalBrand: document.getElementById("modal-brand"),
  modalMaker: document.getElementById("modal-maker"),
  modalCountry: document.getElementById("modal-country"),
  modalHp: document.getElementById("modal-hp"),
  modalSpeed: document.getElementById("modal-speed"),
  modalPrice: document.getElementById("modal-price"),
  modalDesc: document.getElementById("modal-desc"),
  modalCompare: document.getElementById("modal-compare"),
  modalFav: document.getElementById("modal-fav"),
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
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
  carouselTrack: document.getElementById("carousel-track"),
  carouselDots: document.getElementById("carousel-dots"),
  carouselPrev: document.getElementById("carousel-prev"),
  carouselNext: document.getElementById("carousel-next"),
};

function persistSets() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  localStorage.setItem(COMPARE_KEY, JSON.stringify([...state.compare]));
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

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    showNotification("Removed from Favorites");
  } else {
    state.favorites.add(id);
    showNotification("Added to Favorites");
  }

  persistSets();
  renderCatalog();
  renderRecommendationCardIfPresent();
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
  const isCompare = state.compare.has(car.id);

  return `
    <article class="card-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/70" style="animation-delay:${delayMs}ms">
      <div class="relative overflow-hidden rounded-xl">
        <img src="${car.image}" alt="${car.name}" class="h-56 w-full object-cover transition duration-500 hover:scale-105">
        <span class="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">${car.brand}</span>
      </div>
      <h3 class="mt-4 text-xl font-bold">${car.name}</h3>
      <div class="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <p class="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">${car.hp}</p>
        <p class="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">${car.speed}</p>
        <p class="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800">${car.price}</p>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button data-action="details" data-id="${car.id}" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black dark:bg-slate-100 dark:text-slate-900">Details</button>
        <button data-action="compare" data-id="${car.id}" class="rounded-lg px-3 py-2 text-xs font-semibold transition ${isCompare ? "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "bg-blue-500 text-white hover:bg-blue-600"}">${isCompare ? "Remove Compare" : "Add Compare"}</button>
        <button data-action="favorite" data-id="${car.id}" class="rounded-lg px-3 py-2 text-xs font-semibold transition ${isFav ? "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "bg-amber-400 text-black hover:bg-amber-300"}">${isFav ? "Unfavorite" : "Favorite"}</button>
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
    elements.carsContainer.innerHTML = "<p class='rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300'>No cars matched your filter. Try broadening your search.</p>";
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
  elements.modalCarousel.innerHTML = `<img src="${car.image}" alt="${car.name}" class="h-full w-full object-cover">`;

  updateModalButtons();
  elements.modal.classList.remove("hidden");
  elements.modal.classList.add("flex");
}

function closeModal() {
  if (!elements.modal) return;
  elements.modal.classList.add("hidden");
  elements.modal.classList.remove("flex");
}

function updateModalButtons() {
  if (!elements.modalCompare || !elements.modalFav) return;
  if (state.currentModalCarId === null) return;

  const isFav = state.favorites.has(state.currentModalCarId);
  const isCompare = state.compare.has(state.currentModalCarId);

  elements.modalCompare.textContent = isCompare ? "Remove from Compare" : "Add to Compare";
  elements.modalCompare.className = `rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${isCompare ? "bg-slate-500 hover:bg-slate-600" : "bg-blue-500 hover:bg-blue-600"}`;

  elements.modalFav.textContent = isFav ? "Remove from Favorites" : "Add to Favorites";
  elements.modalFav.className = `rounded-xl px-4 py-2 text-sm font-semibold transition ${isFav ? "bg-slate-300 text-black hover:bg-slate-200" : "bg-amber-400 text-black hover:bg-amber-300"}`;
}

function runRecommendation() {
  if (!elements.aiResult) return;

  const budget = elements.aiBudget.value;
  const priority = elements.aiPriority.value;
  const region = elements.aiRegion.value;

  elements.aiResult.innerHTML = "<div class='flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70'><div class='h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent'></div>Analyzing your preferences...</div>";

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
      elements.aiResult.innerHTML = "<p class='rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70'>No recommendation available right now.</p>";
      return;
    }

    elements.aiResult.innerHTML = recommendationCard(bestCar);
    elements.aiResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 550);
}

function recommendationCard(car) {
  const isFav = state.favorites.has(car.id);
  const isCompare = state.compare.has(car.id);

  return `
    <article class="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900/70">
      <p class="mb-2 text-xs font-bold uppercase tracking-wide text-orange-500">AI recommendation</p>
      <h3 class="text-2xl font-bold">${car.name}</h3>
      <div class="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <img src="${car.image}" alt="${car.name}" class="h-56 w-full rounded-xl object-cover">
        <div>
          <p class="text-sm text-slate-600 dark:text-slate-300">${car.description}</p>
          <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
            <p class="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">Brand: ${car.brand}</p>
            <p class="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">Country: ${car.country}</p>
            <p class="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">Power: ${car.hp}</p>
            <p class="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">Top speed: ${car.speed}</p>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button data-action="rec-compare" data-id="${car.id}" class="rounded-lg px-3 py-2 text-xs font-semibold transition ${isCompare ? "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "bg-blue-500 text-white hover:bg-blue-600"}">${isCompare ? "Remove Compare" : "Add Compare"}</button>
            <button data-action="rec-favorite" data-id="${car.id}" class="rounded-lg px-3 py-2 text-xs font-semibold transition ${isFav ? "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "bg-amber-400 text-black hover:bg-amber-300"}">${isFav ? "Unfavorite" : "Favorite"}</button>
            <button data-action="rec-details" data-id="${car.id}" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black dark:bg-slate-100 dark:text-slate-900">Open Details</button>
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

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (preferDark ? "dark" : "light");

  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  if (!elements.themeIcon) return;
  const isDark = document.documentElement.classList.contains("dark");
  elements.themeIcon.innerHTML = isDark
    ? "<path d='M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414'/><circle cx='12' cy='12' r='4'/>"
    : "<path d='M21 12.79A9 9 0 1 1 11.21 3c0 .3 0 .6.05.9A7 7 0 0 0 20.1 12c.3.05.6.05.9.79z'/>";
}

function initCarousel() {
  if (!elements.carouselTrack || !elements.carouselDots) return;

  const slides = cars.slice(0, 8);
  elements.carouselTrack.innerHTML = slides
    .map(
      (car) => `
      <article class="min-w-full p-1">
        <div class="overflow-hidden rounded-2xl">
          <img src="${car.image}" alt="${car.name}" class="h-72 w-full object-cover md:h-80">
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

function initEvents() {
  elements.carsContainer?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (action === "details") openModal(id);
    if (action === "favorite") toggleFavorite(id);
    if (action === "compare") toggleCompare(id);
  });

  elements.aiResult?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "rec-favorite") toggleFavorite(id);
    if (button.dataset.action === "rec-compare") toggleCompare(id);
    if (button.dataset.action === "rec-details") openModal(id);
  });

  elements.modalCompare?.addEventListener("click", () => {
    if (state.currentModalCarId !== null) {
      toggleCompare(state.currentModalCarId);
    }
  });

  elements.modalFav?.addEventListener("click", () => {
    if (state.currentModalCarId !== null) {
      toggleFavorite(state.currentModalCarId);
    }
  });

  elements.modalClose?.addEventListener("click", closeModal);
  elements.modal?.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
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

  elements.themeToggle?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    updateThemeIcon();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === FAVORITES_KEY) {
      state.favorites = new Set(JSON.parse(event.newValue || "[]"));
      renderCatalog();
      renderRecommendationCardIfPresent();
      updateModalButtons();
    }
    if (event.key === COMPARE_KEY) {
      state.compare = new Set(JSON.parse(event.newValue || "[]"));
      renderCatalog();
      renderRecommendationCardIfPresent();
      updateModalButtons();
      updateCompareBar();
    }
  });
}

function init() {
  initTheme();
  populateBrandFilter();
  renderCatalog();
  updateCompareBar();
  initCarousel();
  initEvents();
}

init();