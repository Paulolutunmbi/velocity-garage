// recommend.js

function recommendCar() {

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
}

function displayRecommendation(car){

  const result = document.getElementById("ai-result");

  result.innerHTML = `
  <div class="bg-gray-100 p-6 rounded-xl shadow-lg">

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

  </div>
  `;
}