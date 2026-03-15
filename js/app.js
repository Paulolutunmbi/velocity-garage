// js/app.js
let compareCars = [];
const container = document.getElementById("cars-container");

// Function to render cars
function displayCars(list) {
  container.innerHTML = ""; // clear previous

  list.forEach((car) => {
    const favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];
    const isFavorite = favorites.includes(car.id);
    const card = document.createElement("div");
    card.className =
      "bg-white rounded shadow p-4 transform transition duration-500 hover:scale-105 hover:shadow-xl opacity-0";

    card.innerHTML = `
      <img src="${car.image}" class="w-full h-48 object-cover rounded mb-4">

      <h3 class="text-xl font-bold">${car.name}</h3>

      <p>⚡ ${car.hp}</p>
      <p>🏎️ ${car.speed}</p>

      <p class="text-blue-600 font-bold">${car.price}</p>

      <div class="flex justify-between items-center mt-3">

      <button onclick="openModal(${car.id})"
      class="bg-gray-900 text-white px-3 py-1 rounded">
      Details
      </button>

      <button onclick="addToFavorites(${car.id})"
      class="${isFavorite ? "text-yellow-500" : "text-gray-400"} hover:scale-125 transition">

      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
      <path fill="currentColor" d="M7.99 0L.98 9.38L7 8.96L2.04 16L15 6l-7.01.47L15 0z"/>
      </svg>

      </button>

      </div>
      `;

    container.appendChild(card);

    // Slide/fade animation
    setTimeout(() => {
      card.classList.remove("opacity-0");
    }, 50);
  });
}

// Initial render
displayCars(cars);

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

// Search function
function searchCars() {
  const input = document.getElementById("search").value.toLowerCase();
  const filtered = cars.filter((car) => car.name.toLowerCase().includes(input));
  displayCars(filtered);
}

// Favorites (localStorage)
function addToFavorites(id) {
  let favorites = JSON.parse(localStorage.getItem("vg-favorites")) || [];

  if (favorites.includes(id)) {
    favorites = favorites.filter((carId) => carId !== id);
    showNotification("Removed from favorites");
  } else {
    favorites.push(id);
    showNotification("⚡ Added to favorites");
  }

  localStorage.setItem("vg-favorites", JSON.stringify(favorites));

  displayCars(cars); // refresh UI
}

function showNotification(message) {
  const note = document.getElementById("notification");

  note.textContent = message;
  note.classList.remove("opacity-0");

  setTimeout(() => {
    note.classList.add("opacity-0");
  }, 2000);
}
