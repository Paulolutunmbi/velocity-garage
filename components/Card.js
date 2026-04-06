(function () {
  function renderCardButton(button, fallbackClassName = "") {
    if (!button || !button.action) return "";

    const className = button.className || fallbackClassName;
    const label = button.label || "Action";
    const id = Number.isFinite(Number(button.id)) ? Number(button.id) : "";

    if (window.VGButton?.renderActionButton) {
      return window.VGButton.renderActionButton({
        action: button.action,
        id,
        label,
        className,
        ariaLabel: button.ariaLabel || "",
      });
    }

    const aria = button.ariaLabel ? ` aria-label="${button.ariaLabel}"` : "";
    return `<button type="button" data-action="${button.action}" data-id="${id}" class="${className}"${aria}>${label}</button>`;
  }

  function ensureResponsivePriceStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("vg-card-price-styles")) return;

    const style = document.createElement("style");
    style.id = "vg-card-price-styles";
    style.textContent = `
      .vg-price-value {
        display: inline-flex;
        align-items: baseline;
        max-width: 100%;
        white-space: nowrap;
      }

      .vg-price-value[data-has-compact="true"] .vg-price-compact {
        display: none;
      }

      @media (max-width: 420px) {
        .vg-price-value[data-has-compact="true"] .vg-price-full {
          display: none;
        }

        .vg-price-value[data-has-compact="true"] .vg-price-compact {
          display: inline;
        }
      }

      @media (max-width: 360px) {
        .deck-grid-card .vg-price-value {
          font-size: 1rem !important;
          line-height: 1.25rem !important;
          letter-spacing: 0 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function parseCurrencyValue(raw = "") {
    const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatCompactPrice(rawValue = "") {
    const numeric = parseCurrencyValue(rawValue);
    if (!Number.isFinite(numeric) || numeric < 1_000_000) return "";

    if (numeric >= 1_000_000_000) {
      const billions = numeric / 1_000_000_000;
      const formattedBillions = (billions >= 10 ? billions.toFixed(0) : billions.toFixed(1)).replace(/\.0$/, "");
      return `$${formattedBillions}B`;
    }

    const millions = numeric / 1_000_000;
    const formattedMillions = (millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)).replace(/\.0$/, "");
    return `$${formattedMillions}M`;
  }

  function isPriceSpec(spec = {}) {
    return String(spec.label || "").toLowerCase().includes("price");
  }

  function renderSpecValue(spec = {}) {
    const fallbackClassName = "display-font text-2xl font-bold text-slate-100";
    const valueClassName = spec.valueClassName || fallbackClassName;
    const rawValue = spec.value == null || spec.value === "" ? "-" : String(spec.value);

    if (!isPriceSpec(spec)) {
      return `<span class="${valueClassName}">${rawValue}</span>`;
    }

    const compactValue = formatCompactPrice(rawValue);

    if (!compactValue) {
      return `<span class="${valueClassName} vg-price-value" data-has-compact="false">${rawValue}</span>`;
    }

    return `<span class="${valueClassName} vg-price-value" data-has-compact="true"><span class="vg-price-full">${rawValue}</span><span class="vg-price-compact">${compactValue}</span></span>`;
  }

  function specGridClass(specCount) {
    if (specCount <= 1) return "grid-cols-1";
    if (specCount === 2) return "grid-cols-2";
    if (specCount === 3) return "grid-cols-3";
    return "grid-cols-2 md:grid-cols-3";
  }

  function renderCompareStyleCard({
    car,
    imageUrl,
    articleAttributes = "",
    articleClassName = "",
    articleStyle = "",
    imageFitClass = "object-cover",
    title = "",
    subtitle = "",
    topBadge = "",
    description = "",
    topAction,
    specs = [],
    actions = [],
  }) {
    if (!car) return "";

    const articleAttr = articleAttributes ? ` ${articleAttributes}` : "";
    const styleAttr = articleStyle ? ` style="${articleStyle}"` : "";
    const cardClassName = [
      "deck-grid-card group overflow-hidden border border-white/10 bg-[#181a20]",
      articleClassName,
    ]
      .filter(Boolean)
      .join(" ");

    const safeTitle = title || car.name;
    const safeSubtitle = subtitle || `${car.country || ""} | ${car.maker || car.brand || ""}`;
    const safeTopBadge = topBadge || "";

    const renderedSpecs = (Array.isArray(specs) ? specs : [])
      .filter((item) => item && item.label)
      .map((item) => `
        <div class="${item.itemClassName || "border border-white/10 bg-white/5 px-3 py-2 text-center"}">
          <span class="${item.labelClassName || "block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400"}">${item.label}</span>
          ${renderSpecValue(item)}
        </div>
      `)
      .join("");

    const renderedActions = (Array.isArray(actions) ? actions : [])
      .map((action) => renderCardButton(action))
      .join("");

    let topActionMarkup = "";
    if (topAction?.action) {
      const icon = topAction.iconSvg || "&times;";
      const label = topAction.label || "";
      const aria = topAction.ariaLabel ? ` aria-label="${topAction.ariaLabel}"` : "";
      const className =
        topAction.className ||
        "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-white/20 bg-black/45 text-slate-200 transition hover:border-[#ff535d] hover:text-[#ff535d]";
      topActionMarkup = `<button type="button" data-action="${topAction.action}" data-id="${car.id}" class="${className}"${aria}>${icon || label}</button>`;
    }

    const specSection = renderedSpecs
      ? `<div class="grid ${specGridClass(specs.length)} gap-2">${renderedSpecs}</div>`
      : "";

    const actionSection = renderedActions ? `<div class="flex flex-wrap gap-2">${renderedActions}</div>` : "";
    const descriptionSection = description
      ? `<p class="rounded-md border border-white/10 bg-[#13151c] px-3 py-3 text-sm leading-relaxed text-slate-200">${description}</p>`
      : "";

    const topBadgeMarkup = safeTopBadge
      ? `<span class="absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100">${safeTopBadge}</span>`
      : "";

    return `
      <article${articleAttr} class="${cardClassName}"${styleAttr}>
        <div class="relative aspect-[16/10] overflow-hidden bg-black/30">
          <img src="${imageUrl}" alt="${safeTitle}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full ${imageFitClass} transition duration-700 group-hover:scale-110">
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#11131a] via-black/35 to-transparent"></div>
          ${topBadgeMarkup}
          ${topActionMarkup}
        </div>

        <div class="space-y-4 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="display-font text-3xl font-bold uppercase leading-none tracking-tight text-white">${safeTitle}</h3>
              <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">${safeSubtitle}</p>
            </div>
          </div>

          ${descriptionSection}
          ${specSection}
          ${actionSection}
        </div>
      </article>
    `;
  }

  function renderCollectionCard({
    car,
    imageUrl,
    articleAttributes = "",
    topAction,
    compareButton,
    detailsButton,
  }) {
    const compareClass =
      window.VGButton?.resolveStateClass(compareButton.isActive, compareButton.activeClass, compareButton.idleClass) ||
      compareButton.idleClass;
    const compareLabel = compareButton.isActive ? compareButton.activeLabel : compareButton.idleLabel;

    return renderCompareStyleCard({
      car,
      imageUrl,
      articleAttributes,
      subtitle: car.country,
      topBadge: car.brand,
      topAction,
      specs: [
        { label: "Top Speed", value: car.speed, valueClassName: "display-font text-lg font-bold text-white" },
        { label: "Horsepower", value: car.hp, valueClassName: "display-font text-lg font-bold text-white" },
        { label: "Price", value: car.price, valueClassName: "display-font text-lg font-bold text-white" },
      ],
      actions: [
        {
          action: compareButton.action,
          id: car.id,
          label: compareLabel,
          className: compareClass,
        },
        {
          action: detailsButton.action,
          id: car.id,
          label: detailsButton.label,
          className: detailsButton.className,
        },
      ],
    });
  }

  const HEART_ICON = '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.14-8.13C.85 9.73 2.02 5.5 5.66 4.3c2.23-.74 4.38.14 5.62 1.77 1.24-1.63 3.4-2.51 5.63-1.77 3.63 1.2 4.8 5.43 2.8 8.57C18.7 16.65 12 21 12 21z"/></svg>';

  ensureResponsivePriceStyles();

  window.VGCard = {
    HEART_ICON,
    renderCompareStyleCard,
    renderCollectionCard,
  };
})();
