// app.js

const container = document.getElementById("cars-container");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalCompareBtn = document.getElementById("modal-compare");
const modalFavBtn = document.getElementById("modal-fav");
const compareBar = document.getElementById("compare-bar");
const notification = document.getElementById("notification");

let currentModalCarId = null;
let carouselInterval = null;



function getCarById(id){
  return cars.find(car => car.id === id);
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
        ${isCompared ? "bg-blue-500 text-white" : "bg-gray-200"}">

        ${isCompared ? "Compared" : "Compare"}

        </button>

        <button data-action="favorite" data-id="${car.id}"
        class="px-3 py-1 rounded
        ${isFav ? "bg-yellow-400" : "bg-gray-200"}">

        ${isFav ? "Favorited" : "Favorite"}

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

  modal.classList.remove("hidden");

}



modalClose.addEventListener("click",()=>{
  modal.classList.add("hidden");
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



loadCompareCars();
renderCars(cars);
updateCompareBar();