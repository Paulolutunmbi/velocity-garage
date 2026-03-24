const COMPARE_KEY = "vg-compare";

const BUTTON_PRIMARY = "rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 transition";

const elements = {
  compareCards: document.getElementById("compare-cards"),
  compareHead: document.getElementById("compare-head"),
  compareBody: document.getElementById("compare-body"),
  tableWrapper: document.getElementById("compare-table-wrapper"),
  emptyState: document.getElementById("compare-empty"),
  clearCompare: document.getElementById("clear-compare"),
  notification: document.getElementById("notification"),
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
      <article class="rounded-2xl border border-slate-700/80 bg-slate-800/85 p-4 shadow-md">
        <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-48 w-full rounded-xl object-cover">
        <h3 class="mt-3 text-lg font-bold text-white">${car.name}</h3>
        <p class="text-sm text-slate-200">${car.brand} • ${car.country}</p>
        <button data-action="remove" data-id="${car.id}" class="mt-3 ${BUTTON_PRIMARY}">
          Remove
        </button>
      </article>
      `
    )
    .join("");
}

function renderCompareTable(selectedCars) {
  if (!elements.compareHead || !elements.compareBody) return;

  elements.compareHead.innerHTML = "<th class='border border-slate-700 p-2 font-bold'>Spec</th>";
  elements.compareBody.innerHTML = "";

  selectedCars.forEach((car) => {
    const th = document.createElement("th");
    th.className = "border border-slate-700 p-2 font-bold";
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
    labelCell.className = "border border-slate-700 p-2 font-bold";
    labelCell.textContent = spec.label;
    row.appendChild(labelCell);

    selectedCars.forEach((car) => {
      const cell = document.createElement("td");
      cell.className = "border border-slate-700 p-2 align-top";

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

function initEvents() {
  elements.compareCards?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove']");
    if (!button) return;
    removeCompare(Number(button.dataset.id));
  });

  elements.clearCompare?.addEventListener("click", clearCompare);

  window.addEventListener("storage", (event) => {
    if (event.key === COMPARE_KEY) renderComparePage();
  });
}

renderComparePage();
initEvents();