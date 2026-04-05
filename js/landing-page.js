import { onAuthChange } from "./auth.js";

const fleetContainer = document.getElementById("landing-fleet");
const scrollPreviewBtn = document.getElementById("scroll-preview");
const fleetPreviewSection = document.getElementById("fleet-preview");

const PREVIEW_LIMIT = 6;

function carImage(car) {
  return car.image || car.images?.[0] || CAR_IMAGE_FALLBACK;
}

function randomInt(maxExclusive) {
  if (maxExclusive <= 0) return 0;

  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function shuffledCars(source) {
  const list = [...source];

  // Fisher-Yates shuffle ensures a fresh order on each reload.
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list;
}

function renderFleetPreview() {
  if (!fleetContainer || !Array.isArray(cars)) return;

  // Random subset means different users/reloads see different cars and specs.
  const previewCars = shuffledCars(cars).slice(0, PREVIEW_LIMIT);

  fleetContainer.innerHTML = previewCars
    .map((car) => {
      if (!window.VGCard?.renderCompareStyleCard) return "";

      return window.VGCard.renderCompareStyleCard({
        car,
        imageUrl: carImage(car),
        articleClassName: "shadow-lg transition hover:-translate-y-1 hover:shadow-2xl",
        subtitle: `${car.country} | ${car.maker || car.brand}`,
        topBadge: car.brand,
        description: car.description,
        specs: [
          {
            label: "HP",
            value: car.hp,
            valueClassName: "display-font text-2xl font-bold text-slate-100",
          },
          {
            label: "Top Speed",
            value: car.speed,
            valueClassName: "display-font text-2xl font-bold text-[#ffb2b4]",
          },
          {
            label: "Price",
            value: car.price,
            valueClassName: "display-font text-xl font-bold text-slate-100",
          },
        ],
      });
    })
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
