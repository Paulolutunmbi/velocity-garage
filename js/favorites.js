// favorites.js

let favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];

function persistFavorites() {
  localStorage.setItem("vg-favorites", JSON.stringify(favorites));
}

function isFavorite(id) {
  return favorites.includes(id);
}

function toggleFavorite(id) {

  if (favorites.includes(id)) {
    favorites = favorites.filter(carId => carId !== id);
    showNotification("Removed from Favorites");
  } else {
    favorites.push(id);
    showNotification("Added to Favorites");
  }

  persistFavorites();

  renderFavorites(); // 🔥 update favorites page

  if (typeof rerenderVisibleCars === "function") {
    rerenderVisibleCars();
  }

  if (typeof updateModalButtons === "function") {
    updateModalButtons();
  }
}


// 🔥 NEW: RENDER FAVORITES

function renderFavorites() {

  const container = document.getElementById("favorites-container");
  const empty = document.getElementById("favorites-empty");

  if (!container || !empty) return;

  const favCars = favorites
    .map(id => getCarById(id))
    .filter(Boolean);

  container.innerHTML = "";

  if (favCars.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  favCars.forEach(car => {

    const isCompared = compareCars.some(c => c.id === car.id);

    const card = document.createElement("div");

    card.className =
    "car-card bg-white rounded-xl shadow-md p-4 hover:shadow-xl hover:scale-105 transition cursor-pointer";

    card.dataset.id = car.id;

    card.innerHTML = `

      <img src="${car.image}"
      class="w-full h-48 object-cover rounded-lg mb-4">

      <h3 class="text-xl font-bold">${car.name}</h3>

      <p>⚡ ${car.hp}</p>
      <p>🏎 ${car.speed}</p>

      <p class="text-blue-600 font-bold">${car.price}</p>

      <div class="flex gap-3 mt-3 flex-wrap">

        <button data-action="details" data-id="${car.id}"
        class="bg-black text-white px-3 py-1 rounded">
        Details
        </button>

        <button data-action="compare" data-id="${car.id}"
        class="px-3 py-1 rounded
        ${isCompared ? "bg-gray-300" : "bg-blue-500 text-white"}">

        ${isCompared ? "Remove from Comparison" : "Add to Compare"}

        </button>

        <button data-action="favorite" data-id="${car.id}"
        class="px-3 py-1 rounded bg-gray-300">
        Remove from Favorites
        </button>

      </div>
    `;

    container.appendChild(card);

  });

} 