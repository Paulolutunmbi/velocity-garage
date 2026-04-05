(function () {
  function normalizeIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))];
  }

  function parseNumericValue(raw = "") {
    const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function parsePriceValue(priceText = "") {
    return parseNumericValue(priceText);
  }

  function parseHorsepowerValue(hpText = "") {
    return parseNumericValue(hpText);
  }

  function deriveZeroToSixtyFromZeroTo100(
    zeroTo100Text = "",
    { fallback = "--", uppercaseFallback = false, suffix = " s" } = {}
  ) {
    const numeric = parseNumericValue(zeroTo100Text);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      const textFallback = String(zeroTo100Text || fallback);
      return uppercaseFallback ? textFallback.toUpperCase() : textFallback;
    }

    return `${(numeric * 0.6).toFixed(1)}${suffix}`;
  }

  function carImage(car, fallback = "") {
    return car?.image || car?.images?.[0] || fallback;
  }

  function deriveOptionList({
    catalog = [],
    selectedIds = [],
    getCarById,
    field,
  }) {
    const dedup = new Map();

    for (const car of catalog) {
      const raw = String(car?.[field] || "").trim();
      if (!raw) continue;
      dedup.set(raw.toLowerCase(), raw);
    }

    for (const id of selectedIds) {
      const car = typeof getCarById === "function" ? getCarById(Number(id)) : null;
      const raw = String(car?.[field] || "").trim();
      if (!raw) continue;
      dedup.set(raw.toLowerCase(), raw);
    }

    return [...dedup.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }

  function populateSelectOptions(selectElement, {
    placeholderLabel,
    placeholderValue = "all",
    options = [],
    previousValue = "all",
  }) {
    if (!selectElement) return placeholderValue;

    const optionMarkup = [
      `<option value="${placeholderValue}">${placeholderLabel}</option>`,
      ...options.map((option) => `<option value="${option.value}">${option.label}</option>`),
    ].join("");

    selectElement.innerHTML = optionMarkup;

    const stillExists = previousValue === placeholderValue || options.some((option) => option.value === previousValue);
    const nextValue = stillExists ? previousValue : placeholderValue;
    selectElement.value = nextValue;
    return nextValue;
  }

  function createNotifier(notificationElement, {
    duration = 1700,
    textSelector = "",
  } = {}) {
    let timer = null;

    return function show(message) {
      if (!notificationElement) return;

      if (textSelector) {
        const textElement = notificationElement.querySelector(textSelector);
        if (textElement) {
          textElement.textContent = message;
        } else {
          notificationElement.textContent = message;
        }
      } else {
        notificationElement.textContent = message;
      }

      notificationElement.classList.remove("hidden");

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        notificationElement.classList.add("hidden");
      }, duration);
    };
  }

  async function bootstrapPage({
    loadUserState,
    render,
    initEvents,
    pageLoading,
    syncFromRemote,
  }) {
    await window.vgUserStore?.waitForReady?.();
    await loadUserState?.();

    render?.();
    initEvents?.();
    pageLoading?.classList.add("hidden");

    window.vgUserStore?.bindThemeToggle?.();
    if (typeof syncFromRemote === "function") {
      window.vgUserStore?.subscribeUserState?.((remote) => {
        syncFromRemote(remote || {});
      });
    }
  }

  window.VGHelpers = {
    normalizeIds,
    parseNumericValue,
    parsePriceValue,
    parseHorsepowerValue,
    deriveZeroToSixtyFromZeroTo100,
    carImage,
    deriveOptionList,
    populateSelectOptions,
    createNotifier,
    bootstrapPage,
  };
})();
