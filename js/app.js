// js/app.js
let compareCars = [];
let favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];

const container = document.getElementById("cars-container");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalCompareBtn = document.getElementById("modal-compare");
const modalFavBtn = document.getElementById("modal-fav");
const compareBar = document.getElementById("compare-bar");
const notification = document.getElementById("notification");

let currentModalCarId = null;
let carouselInterval = null;

function getCarById(id) {
  return cars.find((car) => car.id === id);
}

function persistFavorites() {
  localStorage.setItem("vg-favorites", JSON.stringify(favorites));
}

function startCarousel(car) {
  const images = [
    document.getElementById("modal-image-1"),
    document.getElementById("modal-image-2"),
    document.getElementById("modal-image-3"),
  ];

  const imageSources = car.images && car.images.length ? car.images : [car.image];

  images.forEach((img, index) => {
    img.src = imageSources[index] || imageSources[0];
    img.style.opacity = index === 0 ? "1" : "0";
  });

  clearInterval(carouselInterval);
  let current = 0;
  carouselInterval = setInterval(() => {
    images[current].style.opacity = "0";
    current = (current + 1) % images.length;
    images[current].style.opacity = "1";
  }, 3000);
}

function showNotification(message, type) {
  let icon = "";

  if (type === "favorite") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M7.99 0L.98 9.38L7 8.96L2.04 16L15 6l-7.01.47L15 0z"/></svg>`;
  } else if (type === "compare") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 12h7v1.5a.5.5 0 0 1-1 0V13h-5v3.5a2.5 2.5 0 0 0 5 0V15a.5.5 0 0 1 1 0v1.5a3.5 3.5 0 0 1-7 0V12zm-9 0h7v4.5a3.5 3.5 0 0 1-7 0V15a.5.5 0 0 1 1 0v1.5a2.5 2.5 0 0 0 5 0V13H5v.5a.5.5 0 0 1-1 0V12zm9-2V3.5a.5.5 0 0 0-1 0V10H4a1 1 0 0 0-1 1v1h18v-1a1 1 0 0 0-1-1h-8z"/></svg>`;
  }

  notification.innerHTML = `${icon} ${message}`;
  notification.classList.remove("-translate-y-full");
  setTimeout(() => notification.classList.add("-translate-y-full"), 2000);
}

function updateCompareBar() {
  if (compareCars.length === 0) {
    compareBar.classList.add("hidden");
    compareBar.innerHTML = "";
    return;
  }

  compareBar.classList.remove("hidden");
  compareBar.innerHTML = compareCars
    .map(
      (car) => `
      <div class="inline-block mr-6">
        <strong>${car.name}</strong>
        <p>⚡ ${car.hp}</p>
        <p>🏎 ${car.speed}</p>
      </div>
    `,
    )
    .join("");
}

function updateModalButtons() {
  if (currentModalCarId === null) return;

  const isFavorite = favorites.includes(currentModalCarId);
  const isCompared = compareCars.some((car) => car.id === currentModalCarId);

  modalFavBtn.innerHTML = `${isFavorite ? "Added to Favorites" : "Add to Favorites"}`;
  modalFavBtn.className = `px-3 py-1 rounded transition hover:scale-110 ${
    isFavorite ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-800"
  }`;

  modalCompareBtn.innerHTML = `${isCompared ? "Added for Comparison" : "Add to Compare"}`;
  modalCompareBtn.className = `px-3 py-1 rounded transition hover:scale-110 ${
    isCompared ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
  }`;
}

function renderCars(list) {
  container.innerHTML = "";

  list.forEach((car) => {
    const isFavorite = favorites.includes(car.id);
    const isCompared = compareCars.some((selected) => selected.id === car.id);

    const card = document.createElement("div");
    card.className =
      "car-card bg-white rounded shadow p-4 transform transition duration-500 hover:scale-105 hover:shadow-xl opacity-0 cursor-pointer";
    card.dataset.id = String(car.id);

    card.innerHTML = `
      <img src="${car.image}" class="w-full h-48 object-cover rounded mb-4" alt="${car.name}">
      <h3 class="text-xl font-bold">${car.name}</h3>
      <p>⚡ ${car.hp}</p>
      <p>🏎️ ${car.speed}</p>
      <p class="text-blue-600 font-bold">${car.price}</p>

      <div class="flex gap-3 mt-3 flex-wrap">
        <button type="button" data-action="details" data-id="${car.id}" class="bg-gray-900 text-white px-3 py-1 rounded mt-1">
          Details
        </button>

        <button type="button" data-action="compare" data-id="${car.id}" class="px-3 py-1 rounded transition ${
          isCompared ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
        }">
          ${isCompared ? "Added for Comparison" : "Add to Compare"}
        </button>

        <button type="button" data-action="favorite" data-id="${car.id}" class="px-3 py-1 rounded transition ${
          isFavorite ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-800"
        }">
          ${isFavorite ? "Added to Favorites" : "Add to Favorites"}
        </button>
      </div>
    `;

    container.appendChild(card);
    setTimeout(() => card.classList.remove("opacity-0"), 30);
  });
}

function rerenderVisibleCars() {
  const searchInput = document.getElementById("search");
  const value = searchInput.value.trim().toLowerCase();
  const words = value.split(" ").filter(Boolean);

  const filtered = cars.filter((car) => {
    if (words.length === 0) return true;
    const text = `${car.name} ${car.brand}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

  renderCars(filtered);
}

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter((carId) => carId !== id);
    showNotification("Removed from Favorites", "favorite");
  } else {
    favorites.push(id);
    showNotification("Added to Favorites", "favorite");
  }

  persistFavorites();
  updateModalButtons();
  rerenderVisibleCars();
}

function toggleCompare(id) {
  const existing = compareCars.find((car) => car.id === id);

  if (existing) {
    compareCars = compareCars.filter((car) => car.id !== id);
    showNotification("Removed from Comparison", "compare");
  } else {
    if (compareCars.length >= 3) {
      showNotification("Only 3 cars can be compared", "compare");
      return;
    }

    const car = getCarById(id);
    if (!car) return;

    compareCars.push(car);
    showNotification("Added for Comparison", "compare");
  }

  updateCompareBar();
  updateModalButtons();
  rerenderVisibleCars();
}

function openModal(carId) {
  const car = getCarById(carId);
  if (!car) return;

  currentModalCarId = carId;

  document.getElementById("modal-name").textContent = car.name;
  document.getElementById("modal-brand").textContent = car.brand;
  document.getElementById("modal-maker").textContent = car.maker;
  document.getElementById("modal-country").textContent = car.country;
  document.getElementById("modal-hp").textContent = car.hp;
  document.getElementById("modal-speed").textContent = car.speed;
  document.getElementById("modal-price").textContent = car.price;
  document.getElementById("modal-desc").textContent = car.description;

  startCarousel(car);
  updateModalButtons();

  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.firstElementChild.classList.remove("opacity-0", "scale-95");
    modal.firstElementChild.classList.add("opacity-100", "scale-100");
  }, 10);
}

function closeModal() {
  modal.firstElementChild.classList.add("opacity-0", "scale-95");
  modal.firstElementChild.classList.remove("opacity-100", "scale-100");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 250);

  clearInterval(carouselInterval);
}

container.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (button) {
    event.preventDefault();
    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "details") openModal(id);
    if (action === "compare") toggleCompare(id);
    if (action === "favorite") toggleFavorite(id);
    return;
  }

  const card = event.target.closest(".car-card");
  if (!card) return;

  const cardId = Number(card.dataset.id);
  openModal(cardId);
});

modalClose.addEventListener("click", (event) => {
  event.preventDefault();
  closeModal();
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

modalCompareBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (currentModalCarId !== null) toggleCompare(currentModalCarId);
});

modalFavBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (currentModalCarId !== null) toggleFavorite(currentModalCarId);
});

let searchTimeout;
document.getElementById("search").addEventListener("input", (event) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const value = event.target.value.trim().toLowerCase();
    const words = value.split(" ").filter(Boolean);

    const filteredCars = cars.filter((car) => {
      if (words.length === 0) return true;
      const text = `${car.name} ${car.brand}`.toLowerCase();
      return words.every((word) => text.includes(word));
    });

    renderCars(filteredCars);
  }, 200);
});

renderCars(cars);
updateCompareBar();
