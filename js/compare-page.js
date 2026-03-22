const COMPARE_KEY = "vg-compare";
const THEME_KEY = "vg-theme";

const elements = {
  compareCards: document.getElementById("compare-cards"),
  compareHead: document.getElementById("compare-head"),
  compareBody: document.getElementById("compare-body"),
  tableWrapper: document.getElementById("compare-table-wrapper"),
  emptyState: document.getElementById("compare-empty"),
  clearCompare: document.getElementById("clear-compare"),
  notification: document.getElementById("notification"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
};

function showNotification(message) {
  if (!elements.notification) return;
  elements.notification.textContent = message;
  elements.notification.classList.remove("hidden");
  setTimeout(() => elements.notification.classList.add("hidden"), 1500);
}

function getSelectedCars() {
  const ids = JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
  return ids.map((id) => getCarById(id)).filter(Boolean);
}

function saveCompareFromCars(selectedCars) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(selectedCars.map((car) => car.id)));
}

function removeCompare(id) {
  const selectedCars = getSelectedCars().filter((car) => car.id !== id);
  saveCompareFromCars(selectedCars);
  renderComparePage();
  showNotification("Removed from Compare");
}

function clearCompare() {
  localStorage.setItem(COMPARE_KEY, "[]");
  renderComparePage();
  showNotification("Compare list cleared");
}

function carImage(car) {
  return car.image || car.images?.[0] || CAR_IMAGE_FALLBACK;
}

function renderCompareCards(selectedCars) {
  if (!elements.compareCards) return;

  elements.compareCards.innerHTML = selectedCars
    .map(
      (car) => `
      <article class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-md dark:border-slate-700 dark:bg-slate-900/70">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-48 w-full rounded-xl object-cover">
        <h3 class="mt-3 text-lg font-bold">${car.name}</h3>
        <p class="text-sm text-slate-600 dark:text-slate-300">${car.brand} • ${car.country}</p>
        <button data-action="remove" data-id="${car.id}" class="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 active:scale-[0.98]">
          Remove
        </button>
      </article>
      `
    )
    .join("");
}

function renderCompareTable(selectedCars) {
  if (!elements.compareHead || !elements.compareBody) return;

  elements.compareHead.innerHTML = "<th class='border border-slate-300 p-2 font-bold dark:border-slate-700'>Spec</th>";
  elements.compareBody.innerHTML = "";

  selectedCars.forEach((car) => {
    const th = document.createElement("th");
    th.className = "border border-slate-300 p-2 font-bold dark:border-slate-700";
    th.textContent = car.name;
    elements.compareHead.appendChild(th);
  });

  const specs = [
    { label: "Image", key: "image" },
    { label: "Brand", key: "brand" },
    { label: "Maker", key: "maker" },
    { label: "Country", key: "country" },
    { label: "Horsepower", key: "hp" },
    { label: "Top Speed", key: "speed" },
    { label: "Price", key: "price" },
    { label: "Description", key: "description" },
  ];

  specs.forEach((spec) => {
    const row = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.className = "border border-slate-300 p-2 font-bold dark:border-slate-700";
    labelCell.textContent = spec.label;
    row.appendChild(labelCell);

    selectedCars.forEach((car) => {
      const cell = document.createElement("td");
      cell.className = "border border-slate-300 p-2 align-top dark:border-slate-700";

      if (spec.key === "image") {
        cell.innerHTML = `<img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-32 w-full rounded object-cover">`;
      } else {
        cell.textContent = car[spec.key];
      }

      row.appendChild(cell);
    });

    elements.compareBody.appendChild(row);
  });
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

function updateThemeIcon() {
  if (!elements.themeIcon) return;
  const isDark = document.documentElement.classList.contains("dark");
  elements.themeIcon.innerHTML = isDark
    ? "<path d='M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414'/><circle cx='12' cy='12' r='4'/>"
    : "<path d='M21 12.79A9 9 0 1 1 11.21 3c0 .3 0 .6.05.9A7 7 0 0 0 20.1 12c.3.05.6.05.9.79z'/>";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (preferDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  updateThemeIcon();
}

function initEvents() {
  elements.compareCards?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove']");
    if (!button) return;
    removeCompare(Number(button.dataset.id));
  });

  elements.clearCompare?.addEventListener("click", clearCompare);

  elements.themeToggle?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    updateThemeIcon();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === COMPARE_KEY) renderComparePage();
    if (event.key === THEME_KEY) initTheme();
  });
}

initTheme();
renderComparePage();
initEvents();