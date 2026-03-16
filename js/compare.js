// compare.js

let compareCars = [];

function loadCompareCars() {

  const saved = JSON.parse(localStorage.getItem("vg-compare")) || [];

  compareCars = saved
    .map(id => getCarById(id))
    .filter(Boolean);

}

function persistCompareCars() {
  localStorage.setItem(
    "vg-compare",
    JSON.stringify(compareCars.map(car => car.id))
  );
}

function toggleCompare(id) {

  const existing = compareCars.find(car => car.id === id);

  if (existing) {

    compareCars = compareCars.filter(car => car.id !== id);
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

  persistCompareCars();

  updateCompareBar();
  rerenderVisibleCars();
  updateModalButtons();
}