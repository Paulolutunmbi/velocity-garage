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
    showNotification("Removed from Favorites", "favorite");
  } else {
    favorites.push(id);
    showNotification("Added to Favorites", "favorite");
  }

  persistFavorites();

  if (typeof rerenderVisibleCars === "function") {
    rerenderVisibleCars();
  }

  if (typeof updateModalButtons === "function") {
    updateModalButtons();
  }
}