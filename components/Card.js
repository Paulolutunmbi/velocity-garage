(function () {
  function renderCollectionCard({
    car,
    imageUrl,
    articleAttributes = "",
    topAction,
    compareButton,
    detailsButton,
  }) {
    const articleAttr = articleAttributes ? ` ${articleAttributes}` : "";
    const compareClass = window.VGButton?.resolveStateClass(compareButton.isActive, compareButton.activeClass, compareButton.idleClass) || compareButton.idleClass;
    const compareLabel = compareButton.isActive ? compareButton.activeLabel : compareButton.idleLabel;

    return `
      <article${articleAttr} class="group flex h-full flex-col overflow-hidden border border-[#2a2b34] bg-[#121217] transition duration-300 hover:-translate-y-1 hover:border-[#ff5d67]/70">
        <div class="relative aspect-[16/10] overflow-hidden bg-black/40">
          <img src="${imageUrl}" alt="${car.name}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full object-cover transition duration-700 group-hover:scale-105">
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent"></div>
          <span class="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#ff5d67]">${car.brand}</span>
          <button data-action="${topAction.action}" data-id="${car.id}" class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white transition hover:border-[#ff5d67] hover:text-[#ff5d67]" aria-label="${topAction.ariaLabel}">
            ${topAction.iconSvg}
          </button>
        </div>

        <div class="flex h-full flex-col p-4">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-h-[62px]">
              <h3 class="display-font text-2xl font-bold uppercase leading-tight text-white">${car.name}</h3>
              <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#aeb3c0]">${car.country}</p>
            </div>
            <span class="display-font text-lg font-medium text-[#f8fafc]">${car.price}</span>
          </div>

          <div class="mt-auto space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div class="border border-[#2a2b34] bg-[#0f1015] px-3 py-2">
                <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f95a4]">Top Speed</span>
                <span class="display-font text-lg font-bold text-white">${car.speed}</span>
              </div>
              <div class="border border-[#2a2b34] bg-[#0f1015] px-3 py-2">
                <span class="block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f95a4]">Horsepower</span>
                <span class="display-font text-lg font-bold text-white">${car.hp}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              ${window.VGButton?.renderActionButton({
                action: compareButton.action,
                id: car.id,
                label: compareLabel,
                className: compareClass,
              })}
              ${window.VGButton?.renderActionButton({
                action: detailsButton.action,
                id: car.id,
                label: detailsButton.label,
                className: detailsButton.className,
              })}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  const HEART_ICON = '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.14-8.13C.85 9.73 2.02 5.5 5.66 4.3c2.23-.74 4.38.14 5.62 1.77 1.24-1.63 3.4-2.51 5.63-1.77 3.63 1.2 4.8 5.43 2.8 8.57C18.7 16.65 12 21 12 21z"/></svg>';

  window.VGCard = {
    HEART_ICON,
    renderCollectionCard,
  };
})();
