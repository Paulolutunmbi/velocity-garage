// app.js

const container = document.getElementById("cars-container");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalCompareBtn = document.getElementById("modal-compare");
const modalFavBtn = document.getElementById("modal-fav");
const compareBar = document.getElementById("compare-bar");
const notification = document.getElementById("notification");
const compareModal = document.getElementById("compare-modal");
const compareClose = document.getElementById("compare-close");
const compareHead = document.getElementById("compare-head");
const compareBody = document.getElementById("compare-body");

let currentModalCarId = null;
let carouselInterval = null;



function getCarById(id){
  return cars.find(car => car.id === id);
}

function showNotification(message) {
  if (!notification) return;

  notification.textContent = message;
  notification.classList.remove("hidden");

  setTimeout(() => {
    notification.classList.add("hidden");
  }, 1800);
}

function updateModalButtons() {

  if (currentModalCarId === null) return;

  const isFav = isFavorite(currentModalCarId);
  const isCompared = compareCars.some(c => c.id === currentModalCarId);

  // FAVORITE BUTTON
  modalFavBtn.textContent = isFav
    ? "Remove from Favorites"
    : "Add to Favorites";

  modalFavBtn.className = `
    px-4 py-2 rounded
    ${isFav ? "bg-gray-300 text-black" : "bg-yellow-400 text-black"}
  `;

  // COMPARE BUTTON
  modalCompareBtn.textContent = isCompared
    ? "Remove from Comparison"
    : "Add to Compare";

  modalCompareBtn.className = `
    px-4 py-2 rounded text-white
    ${isCompared ? "bg-gray-300 text-black" : "bg-blue-500"}
  `;
}

function openCompareModal() {
  if (!compareModal || !compareHead || !compareBody) return;
  if (compareCars.length === 0) return;

  compareHead.innerHTML = "<th class='border p-2'>Spec</th>";
  compareBody.innerHTML = "";

  compareCars.forEach((car) => {
    const th = document.createElement("th");
    th.className = "border p-2";
    th.textContent = car.name;
    compareHead.appendChild(th);
  });

  const specs = [
    { label: "Image", key: "image" },
    { label: "Brand", key: "brand" },
    { label: "Country", key: "country" },
    { label: "Horsepower", key: "hp" },
    { label: "Top Speed", key: "speed" },
    { label: "Price", key: "price" },
  ];

  specs.forEach((spec) => {
    const row = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.className = "border p-2 font-semibold";
    labelCell.textContent = spec.label;
    row.appendChild(labelCell);

    compareCars.forEach((car) => {
      const cell = document.createElement("td");
      cell.className = "border p-2";

      if (spec.key === "image") {
        cell.innerHTML = `<img src="${car.image}" class="h-24 mx-auto object-cover rounded">`;
      } else {
        cell.textContent = car[spec.key];
      }

      row.appendChild(cell);
    });

    compareBody.appendChild(row);
  });

  compareModal.classList.remove("hidden");
}

function updateCompareBar(){

  if(compareCars.length === 0){
    compareBar.classList.add("hidden");
    compareBar.innerHTML="";
    return;
  }

  compareBar.classList.remove("hidden");

  compareBar.innerHTML = `
  <div class="max-w-7xl mx-auto flex justify-between items-center">

    <div>
      Comparing:
      ${compareCars.map(c=>`<strong class="ml-3">${c.name}</strong>`).join("")}
    </div>

    <button id="open-compare"
    class="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">
    Open Comparison Table
    </button>

  </div>
  `;

  document
  .getElementById("open-compare")
  .addEventListener("click",openCompareModal);

}



function renderCars(list){

  container.innerHTML = "";

  list.forEach(car => {

    const isFav = isFavorite(car.id);
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

        ${isCompared ? "Remove for Comparison" : "Add to Compare"}

        </button>

        <button data-action="favorite" data-id="${car.id}"
        class="px-3 py-1 rounded
        ${isFav ? "bg-gray-300" : "bg-yellow-400"}">

        ${isFav ? "Remove from favorites" : "Add to favorites"}

        </button>

      </div>
    `;

    container.appendChild(card);

  });

}



container.addEventListener("click",(e)=>{

  const button = e.target.closest("button[data-action]");

  if(button){

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if(action === "details") openModal(id);
    if(action === "compare") toggleCompare(id);
    if(action === "favorite") toggleFavorite(id);

    return;
  }

  const card = e.target.closest(".car-card");

  if(card){
    openModal(Number(card.dataset.id));
  }

});



function openModal(id){

  const car = getCarById(id);
  if(!car) return;

  currentModalCarId = id;

  document.getElementById("modal-name").textContent = car.name;
  document.getElementById("modal-desc").textContent = car.description;

  document.getElementById("modal-brand").textContent = car.brand;
  document.getElementById("modal-maker").textContent = car.maker;
  document.getElementById("modal-country").textContent = car.country;
  document.getElementById("modal-hp").textContent = car.hp;
  document.getElementById("modal-speed").textContent = car.speed;
  document.getElementById("modal-price").textContent = car.price;

  const modalCarousel = document.getElementById("modal-carousel");
  modalCarousel.innerHTML =
  `<img src="${car.image}" class="w-full h-full object-cover">`;

  updateModalButtons();

  modal.classList.remove("hidden");

}



modalClose.addEventListener("click",()=>{
  modal.classList.add("hidden");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.add("hidden");
  }
});

if (modalCompareBtn) {
  modalCompareBtn.addEventListener("click", () => {
    if (currentModalCarId !== null) {
      toggleCompare(currentModalCarId);
    }
  });
}

if (modalFavBtn) {
  modalFavBtn.addEventListener("click", () => {
    if (currentModalCarId !== null) {
      toggleFavorite(currentModalCarId);
    }
  });
}

if (compareClose) {
  compareClose.addEventListener("click", () => {
    compareModal.classList.add("hidden");
  });
}

if (compareModal) {
  compareModal.addEventListener("click", (event) => {
    if (event.target === compareModal) {
      compareModal.classList.add("hidden");
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (modal && !modal.classList.contains("hidden")) {
    modal.classList.add("hidden");
  }

  if (compareModal && !compareModal.classList.contains("hidden")) {
    compareModal.classList.add("hidden");
  }
});



function rerenderVisibleCars(){

  const value = document
  .getElementById("search")
  .value
  .trim()
  .toLowerCase();

  const words = value.split(" ").filter(Boolean);

  const filtered = cars.filter(car => {

    if(words.length === 0) return true;

    const text = `${car.name} ${car.brand}`.toLowerCase();

    return words.every(word => text.includes(word));

  });

  renderCars(filtered);

}



document
.getElementById("search")
.addEventListener("input",rerenderVisibleCars);



document
.getElementById("ai-run")
.addEventListener("click",recommendCar);

document
  .getElementById("scroll-recommendation")
  .addEventListener("click", () => {

    document
      .getElementById("recommendation-section")
      .scrollIntoView({ behavior: "smooth" });

});
const backToTopBtn = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {

  if (window.scrollY > 300) {
    backToTopBtn.classList.remove("hidden");
  } else {
    backToTopBtn.classList.add("hidden");
  }

});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
loadCompareCars();
renderCars(cars);
updateCompareBar();
if(document.getElementById("favorites-container")){
  renderFavorites();
}