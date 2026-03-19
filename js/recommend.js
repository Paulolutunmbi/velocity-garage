// recommend.js

function recommendCar() {

  const result = document.getElementById("ai-result");

  // 🔥 SHOW LOADING
  result.innerHTML = `
    <div class="flex justify-center items-center py-10">
      <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-600"></div>
    </div>
  `;

  setTimeout(() => {

    const budget = document.getElementById("ai-budget").value;
    const priority = document.getElementById("ai-priority").value;
    const region = document.getElementById("ai-region").value;

    let bestCar = null;
    let bestScore = -Infinity;

    cars.forEach(car => {

      let score = 0;

      const price = parseInt(car.price.replace(/[^0-9]/g,""));

      if(budget === "500k" && price <= 500000) score += 3;
      if(budget === "1m" && price <= 1000000) score += 3;
      if(budget === "3m" && price > 1000000) score += 3;

      if(priority === "speed") score += parseInt(car.speed);
      if(priority === "power") score += parseInt(car.hp);

      if(priority === "balanced"){
        score += parseInt(car.hp) * 0.5;
        score += parseInt(car.speed) * 0.5;
      }

      if(region === "europe" && car.country === "Italy") score += 2;
      if(region === "usa" && car.country === "USA") score += 2;

      if(score > bestScore){
        bestScore = score;
        bestCar = car;
      }

    });

    displayRecommendation(bestCar);

    document
    .getElementById("ai-result")
    .scrollIntoView({ behavior: "smooth" });

  }, 800); // fake AI delay

}

function displayRecommendation(car){

  const isFav = isFavorite(car.id);
  const isCompared = compareCars.some(c => c.id === car.id);

  const result = document.getElementById("ai-result");

  result.innerHTML = `
  <div class="bg-gray-100 p-6 rounded-xl shadow-lg opacity-0 translate-y-6 transition-all duration-500" id="ai-card">

    <h3 class="text-2xl font-bold mb-4">
    Recommended Car: ${car.name}
    </h3>

    <img src="${car.image}"
    class="w-full h-56 object-cover rounded mb-4">

    <div class="grid grid-cols-2 gap-4 text-sm">
      <p>⚡ Horsepower: ${car.hp}</p>
      <p>🏎 Speed: ${car.speed}</p>
      <p>💰 Price: ${car.price}</p>
      <p>🌍 Country: ${car.country}</p>
    </div>

    <p class="mt-4 text-gray-700">${car.description}</p>

    <!-- ACTION BUTTONS -->
    <div class="flex gap-3 mt-4">

      <button
      onclick="toggleCompare(${car.id})"
      class="px-4 py-2 rounded ${isCompared ? "bg-gray-300" : "bg-blue-500 text-white"}">
      ${isCompared ? "Remove from Comparison" : "Add to Compare"}
      </button>

      <button
      onclick="toggleFavorite(${car.id})"
      class="px-4 py-2 rounded ${isFav ? "bg-gray-300" : "bg-yellow-400"}">
      ${isFav ? "Remove from Favorites" : "Add to Favorites"}
      </button>

    </div>

  </div>
  `;

  // 🔥 TRIGGER ANIMATION
  setTimeout(() => {
    const card = document.getElementById("ai-card");
    card.classList.remove("opacity-0", "translate-y-6");
  }, 50);

}