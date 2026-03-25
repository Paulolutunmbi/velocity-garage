import { onAuthChange } from "./auth.js";

const fleetContainer = document.getElementById("landing-fleet");
const scrollPreviewBtn = document.getElementById("scroll-preview");
const fleetPreviewSection = document.getElementById("fleet-preview");

const PREVIEW_LIMIT = 6;

function carImage(car) {
  return car.image || car.images?.[0] || CAR_IMAGE_FALLBACK;
}

function renderFleetPreview() {
  if (!fleetContainer || !Array.isArray(cars)) return;

  const previewCars = cars.slice(0, PREVIEW_LIMIT);

  fleetContainer.innerHTML = previewCars
    .map(
      (car) => `
      <article class="rounded-2xl border border-slate-700/80 bg-slate-800/85 p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl">
        <div class="relative overflow-hidden rounded-xl">
          <img src="${carImage(car)}" alt="${car.name}" onerror="this.onerror=null;this.src='${CAR_IMAGE_FALLBACK}'" class="h-56 w-full object-cover transition duration-500 hover:scale-105">
          <span class="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">${car.brand}</span>
        </div>
        <h3 class="mt-4 text-xl font-bold text-white">${car.name}</h3>
        <p class="mt-2 text-sm text-slate-300">${car.description}</p>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-200">
          <span class="rounded-md bg-slate-900 px-2 py-1">${car.hp}</span>
          <span class="rounded-md bg-slate-900 px-2 py-1">${car.speed}</span>
          <span class="rounded-md bg-slate-900 px-2 py-1">${car.price}</span>
        </div>
      </article>
    `
    )
    .join("");
}

onAuthChange((user) => {
  if (user) {
    window.location.href = "home.html";
  }
});

scrollPreviewBtn?.addEventListener("click", () => {
  fleetPreviewSection?.scrollIntoView({ behavior: "smooth" });
});

renderFleetPreview();
