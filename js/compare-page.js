// compare-page.js

const compareHead = document.getElementById("compare-head");
const compareBody = document.getElementById("compare-body");
const wrapper = document.getElementById("compare-table-wrapper");
const emptyState = document.getElementById("compare-empty");

function loadComparePage(){

  const saved = JSON.parse(localStorage.getItem("vg-compare")) || [];

  const selectedCars = saved
    .map(id => cars.find(car => car.id === id))
    .filter(Boolean);

  if(selectedCars.length === 0){
    emptyState.classList.remove("hidden");
    wrapper.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  wrapper.classList.remove("hidden");

  // HEADER
  compareHead.innerHTML = "<th class='border p-2'>Spec</th>";

  selectedCars.forEach(car => {
    const th = document.createElement("th");
    th.className = "border p-2";
    th.textContent = car.name;
    compareHead.appendChild(th);
    cell.innerHTML += `
<br>
<button onclick="removeCompare(${car.id})"
class="mt-2 bg-red-500 text-white px-2 py-1 rounded">
Remove
</button>
`;

  });
  function removeCompare(id){

  let saved = JSON.parse(localStorage.getItem("vg-compare")) || [];

  saved = saved.filter(carId => carId !== id);

  localStorage.setItem("vg-compare", JSON.stringify(saved));

  location.reload();
}
  

  // SPECS
  const specs = [
    { label: "Image", key: "image" },
    { label: "Brand", key: "brand" },
    { label: "Maker", key: "maker" },
    { label: "Country", key: "country" },
    { label: "Horsepower", key: "hp" },
    { label: "Top Speed", key: "speed" },
    { label: "Price", key: "price" },
    { label: "Description", key: "description" },
  ];

  specs.forEach(spec => {

    const row = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.className = "border p-2 font-bold";
    labelCell.textContent = spec.label;

    row.appendChild(labelCell);

    selectedCars.forEach(car => {

      const cell = document.createElement("td");
      cell.className = "border p-2";

      if(spec.key === "image"){
        cell.innerHTML = `<img src="${car.image}" class="h-32 mx-auto rounded">`;
      } else {
        cell.textContent = car[spec.key];
      }

      row.appendChild(cell);

    });

    compareBody.appendChild(row);

  });

}

loadComparePage();