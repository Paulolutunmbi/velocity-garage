// js/app.js
let compareCars = [];
let favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];
const container = document.getElementById("cars-container");

// Function to render cars
function displayCars(list) {
  container.innerHTML = "";

  list.forEach((car) => {
    const isFavorite = favorites.includes(car.id);
    const isCompared = compareCars.some((c) => c.id === car.id);

    const card = document.createElement("div");
    card.className =
      "bg-white rounded shadow p-4 transform transition duration-500 hover:scale-105 hover:shadow-xl opacity-0 relative z-10";

    card.innerHTML = `
      <img src="${car.image}" class="w-full h-48 object-cover rounded mb-4">

      <h3 class="text-xl font-bold">${car.name}</h3>

      <p>⚡ ${car.hp}</p>
      <p>🏎️ ${car.speed}</p>

      <p class="text-blue-600 font-bold">${car.price}</p>

      <button onclick="openModal(${car.id})"
              class="bg-gray-900 text-white px-3 py-1 rounded mt-2">
        Details
      </button>

      <div class="flex gap-3 mt-3 flex-wrap">

        <!-- Compare Button -->
        <button onclick="toggleCompare(${car.id})"
          class="flex items-center gap-2 px-3 py-1 rounded transition 
                 ${isCompared ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"} hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 12h7v1.5a.5.5 0 0 1-1 0V13h-5v3.5a2.5 2.5 0 0 0 5 0V15a.5.5 0 0 1 1 0v1.5a3.5 3.5 0 0 1-7 0V12zm-9 0h7v4.5a3.5 3.5 0 0 1-7 0V15a.5.5 0 0 1 1 0v1.5a2.5 2.5 0 0 0 5 0V13H5v.5a.5.5 0 0 1-1 0V12zm9-2V3.5a.5.5 0 0 0-1 0V10H4a1 1 0 0 0-1 1v1h18v-1a1 1 0 0 0-1-1h-8z"/>
          </svg>
          ${isCompared ? "Added for Comparison" : "Add to Compare"}
        </button>

        <!-- Favorite Button -->
        <button onclick="toggleFavorite(${car.id})"
          class="flex items-center gap-2 px-3 py-1 rounded transition
                 ${isFavorite ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-800"} hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.99 0L.98 9.38L7 8.96L2.04 16L15 6l-7.01.47L15 0z"/>
          </svg>
          ${isFavorite ? "Added to Favorites" : "Add to Favorite"}
        </button>

      </div>
    `;

    container.appendChild(card);

    setTimeout(() => card.classList.remove("opacity-0"), 50);
  });
}

// Modal Elements
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalCompareBtn = document.getElementById("modal-compare");
const modalFavBtn = document.getElementById("modal-fav");

// Keep track of currently opened car in modal
let currentModalCarId = null;

// Open Modal
function openModal(carId) {
  const car = cars.find((c) => c.id === carId);
  currentModalCarId = carId;

  document.getElementById("modal-image").src = car.image;
  document.getElementById("modal-name").textContent = car.name;
  document.getElementById("modal-brand").textContent = car.brand;
  document.getElementById("modal-maker").textContent = car.maker;
  document.getElementById("modal-country").textContent = car.country;
  document.getElementById("modal-hp").textContent = car.hp;
  document.getElementById("modal-speed").textContent = car.speed;
  document.getElementById("modal-price").textContent = car.price;
  document.getElementById("modal-desc").textContent = car.description;

  updateModalButtons();

  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.firstElementChild.classList.remove("opacity-0", "scale-95");
    modal.firstElementChild.classList.add("opacity-100", "scale-100");
  }, 50);
}

// Close Modal
function closeModal() {
  modal.firstElementChild.classList.add("opacity-0", "scale-95");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

// Update modal button colors/text based on state
function updateModalButtons() {
  const favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];
  const isFavorite = favorites.includes(currentModalCarId);
  const isCompared = compareCars.some((c) => c.id === currentModalCarId);

  modalFavBtn.textContent = isFavorite
    ? "Remove from Favorites"
    : "Add to Favorites";
  modalFavBtn.className = `bg-gray-200 px-3 py-1 rounded hover:scale-110 transition flex items-center gap-1 ${isFavorite ? "bg-yellow-400 text-white" : "text-gray-700"}`;

  modalCompareBtn.textContent = isCompared
    ? "Remove from Compare"
    : "Add to Compare";
  modalCompareBtn.className = `bg-gray-200 px-3 py-1 rounded hover:scale-110 transition flex items-center gap-1 ${isCompared ? "bg-blue-400 text-white" : "text-gray-700"}`;
}

// Handle buttons inside modal
modalCompareBtn.addEventListener("click", () => {
  toggleCompare(currentModalCarId);
  updateModalButtons();
});

modalFavBtn.addEventListener("click", () => {
  addToFavorites(currentModalCarId);
  updateModalButtons();
});

// Close modal on clicking close button
modalClose.addEventListener("click", closeModal);

// Open modal when clicking a card
container.addEventListener("click", (e) => {
  const card = e.target.closest(".car-card");
  if (!card) return;
  const carId = parseInt(card.dataset.id);
  openModal(carId);
});

// Update displayCars function to add data-id and class for cards
function displayCars(list) {
  container.innerHTML = ""; // clear previous

  list.forEach((car) => {
    const favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];
    const isFavorite = favorites.includes(car.id);
    const isCompared = compareCars.some((c) => c.id === car.id);

    const card = document.createElement("div");
    card.className =
      "car-card bg-white rounded shadow p-4 transform transition duration-500 hover:scale-105 hover:shadow-xl opacity-0 cursor-pointer";
    card.dataset.id = car.id;

    card.innerHTML = `
      <img src="${car.image}" class="w-full h-48 object-cover rounded mb-4">
      <h3 class="text-xl font-bold">${car.name}</h3>
      <p>⚡ ${car.hp}</p>
      <p>🏎️ ${car.speed}</p>
      <p class="text-blue-600 font-bold">${car.price}</p>

      <div class="flex gap-3 mt-3">
        <button onclick="toggleCompare(${car.id})" class="bg-gray-200 ${isCompared ? "bg-blue-400 text-white" : "text-gray-700"} px-3 py-1 rounded hover:scale-110 transition flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path fill="currentColor" d="M13 12h7v1.5a.5.5 0 0 1-1 0V13h-5v3.5a2.5 2.5 0 0 0 5 0V15a.5.5 0 0 1 1 0v1.5a3.5 3.5 0 0 1-7 0V12zm-9 0h7v4.5a3.5 3.5 0 0 1-7 0V15a.5.5 0 0 1 1 0v1.5a2.5 2.5 0 0 0 5 0V13H5v.5a.5.5 0 0 1-1 0V12zm9-2V3.5a.5.5 0 0 0-1 0V10H4a1 1 0 0 0-1 1v1h18v-1a1 1 0 0 0-1-1h-8z"/>
          </svg>
          Add to Compare
        </button>

        <button onclick="addToFavorites(${car.id})" class="bg-gray-200 ${isFavorite ? "bg-yellow-400 text-white" : "text-gray-700"} px-3 py-1 rounded hover:scale-110 transition flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
            <path fill="currentColor" d="M7.99 0L.98 9.38L7 8.96L2.04 16L15 6l-7.01.47L15 0z"/>
          </svg>
          Add to Favorites
        </button>
      </div>
    `;

    container.appendChild(card);

    setTimeout(() => {
      card.classList.remove("opacity-0");
    }, 50);
  });
}
// Initial render
displayCars(cars);

// Search
let searchTimeout;
document.getElementById("search").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const value = e.target.value.trim().toLowerCase();
    const words = value.split(" ");
    const filtered = cars.filter((car) => {
      const text = (car.name + " " + car.brand).toLowerCase();
      return words.every((word) => text.includes(word));
    });
    displayCars(filtered);
  }, 300);
});

// Favorites
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter((carId) => carId !== id);
    showNotification("Removed from Favorites", "favorite");
  } else {
    favorites.push(id);
    showNotification("Added to Favorites", "favorite");
  }

  localStorage.setItem("vg-favorites", JSON.stringify(favorites));
  displayCars(cars);
}

// Compare
function toggleCompare(id) {
  const car = cars.find((c) => c.id === id);

  if (compareCars.find((c) => c.id === id)) {
    compareCars = compareCars.filter((c) => c.id !== id);
    showNotification("Removed from Comparison", "compare");
  } else {
    if (compareCars.length >= 3) {
      showNotification("Only 3 cars can be compared", "compare");
      return;
    }
    compareCars.push(car);
    showNotification("Added for Comparison", "compare");
  }

  updateCompareBar();
  displayCars(cars);
}

// Compare Bar
function updateCompareBar() {
  const bar = document.getElementById("compare-bar");

  if (compareCars.length === 0) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  bar.innerHTML = compareCars
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

// Notification
function showNotification(message, type) {
  const note = document.getElementById("notification");

  let icon = "";
  if (type === "favorite") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.99 0L.98 9.38L7 8.96L2.04 16L15 6l-7.01.47L15 0z"/>
            </svg>`;
  } else if (type === "compare") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 12h7v1.5a.5.5 0 0 1-1 0V13h-5v3.5a2.5 2.5 0 0 0 5 0V15a.5.5 0 0 1 1 0v1.5a3.5 3.5 0 0 1-7 0V12zm-9 0h7v4.5a3.5 3.5 0 0 1-7 0V15a.5.5 0 0 1 1 0v1.5a2.5 2.5 0 0 0 5 0V13H5v.5a.5.5 0 0 1-1 0V12zm9-2V3.5a.5.5 0 0 0-1 0V10H4a1 1 0 0 0-1 1v1h18v-1a1 1 0 0 0-1-1h-8z"/>
            </svg>`;
  }

  note.innerHTML = `${icon} ${message}`;
  note.classList.remove("-translate-y-full");

  setTimeout(() => note.classList.add("-translate-y-full"), 2000);
}
