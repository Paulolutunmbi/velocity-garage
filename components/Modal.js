(function () {
  function buildModalTemplate({
    showCancel = false,
    zIndexClass = "z-[60]",
  } = {}) {
    const cancelClass = showCancel
      ? "rounded-md border border-[#2a2b34] bg-[#1a1b22] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d3d7e3] transition hover:border-[#ff5d67] hover:text-white"
      : "hidden";

    return `
      <div id="modal" class="fixed inset-0 ${zIndexClass} hidden items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div class="relative w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-[#131313] text-white shadow-2xl lg:overflow-hidden">
          <button id="modal-close" class="absolute left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:scale-105" aria-label="Close details">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <div class="grid max-h-[92vh] grid-cols-1 md:grid-cols-12">
            <section class="px-4 pb-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16 md:col-span-7 md:px-5 md:pb-5 md:pt-9">
              <div id="modal-carousel" class="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <div id="modal-carousel-track" class="flex h-full transition-transform duration-500 ease-out"></div>
                <button id="modal-carousel-prev" class="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-2 text-white transition hover:bg-white/10" aria-label="Previous image">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button id="modal-carousel-next" class="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-2 text-white transition hover:bg-white/10" aria-label="Next image">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <div id="modal-carousel-dots" class="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-2 backdrop-blur"></div>
              </div>
            </section>

            <section class="border-t border-white/10 bg-[#151515] px-4 py-5 sm:px-6 sm:py-6 md:col-span-5 md:border-l md:border-t-0 md:px-5 md:py-5">
              <span class="inline-flex items-center rounded-full border border-[#ff535d]/40 bg-[#ff535d]/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ffb2b4]">Detail Prototype</span>
              <h2 id="modal-name" class="mt-2 text-3xl font-black italic leading-tight sm:text-4xl" style="font-family: 'Space Grotesk', sans-serif;"></h2>
              <p class="mt-2 text-sm text-white/70">The purest expression of performance, engineering, and aerodynamic research.</p>

              <h3 class="mt-5 text-[0.62rem] font-black uppercase tracking-[0.3em] text-[#ff535d]">Technical Specifications</h3>
              <div class="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Brand</p><p id="modal-brand" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Maker</p><p id="modal-maker" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Country</p><p id="modal-country" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Horsepower</p><p id="modal-hp" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Top Speed</p><p id="modal-speed" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Weight</p><p id="modal-weight" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">0-100 MPH</p><p id="modal-zero-to-100-mph" class="text-lg font-semibold"></p></div>
                <div class="bg-black/40 p-3"><p class="text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Price</p><p id="modal-price" class="text-lg font-semibold text-[#f7b2b6]"></p></div>
              </div>

              <div class="mt-5">
                <h4 class="text-[0.62rem] font-black uppercase tracking-[0.3em] text-[#ff535d]">Engineering Narrative</h4>
                <p id="modal-desc" class="mt-2 text-sm leading-relaxed text-white/70"></p>
              </div>

              <div class="mt-5 flex flex-wrap gap-2">
                <button id="modal-compare" style="font-family: 'Space Grotesk', sans-serif;"></button>
                <button id="modal-fav" style="font-family: 'Space Grotesk', sans-serif;"></button>
                <button id="modal-wishlist" style="font-family: 'Space Grotesk', sans-serif;"></button>
                <button id="modal-cancel" class="${cancelClass}" style="font-family: 'Space Grotesk', sans-serif;">Cancel</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function ensureCarModal(options = {}) {
    const existing = document.getElementById("modal");
    if (existing) {
      const cancelButton = existing.querySelector("#modal-cancel");
      if (cancelButton) {
        cancelButton.classList.toggle("hidden", !options.showCancel);
      }
      return existing;
    }

    const mountTarget = document.getElementById(options.mountId || "modal-root") || document.body;
    mountTarget.insertAdjacentHTML("beforeend", buildModalTemplate(options));
    return document.getElementById("modal");
  }

  function createCarModalController({
    getCarById,
    onToggleCompare,
    onToggleFavorite,
    onToggleWishlist,
    getButtonState,
    modalPrimaryClass,
    modalSecondaryClass,
    modalActiveClass,
    dotActiveClass = "bg-amber-500",
    dotIdleClass = "bg-white/70",
    imageFitClass = "object-cover",
    autoAdvanceMs = 3800,
    clearCurrentOnClose = true,
    enableSwipe = false,
  }) {
    const elements = {
      modal: document.getElementById("modal"),
      modalClose: document.getElementById("modal-close"),
      modalName: document.getElementById("modal-name"),
      modalCarousel: document.getElementById("modal-carousel"),
      modalCarouselTrack: document.getElementById("modal-carousel-track"),
      modalCarouselDots: document.getElementById("modal-carousel-dots"),
      modalCarouselPrev: document.getElementById("modal-carousel-prev"),
      modalCarouselNext: document.getElementById("modal-carousel-next"),
      modalBrand: document.getElementById("modal-brand"),
      modalMaker: document.getElementById("modal-maker"),
      modalCountry: document.getElementById("modal-country"),
      modalHp: document.getElementById("modal-hp"),
      modalSpeed: document.getElementById("modal-speed"),
      modalWeight: document.getElementById("modal-weight"),
      modalZeroTo100Mph: document.getElementById("modal-zero-to-100-mph"),
      modalPrice: document.getElementById("modal-price"),
      modalDesc: document.getElementById("modal-desc"),
      modalCompare: document.getElementById("modal-compare"),
      modalFav: document.getElementById("modal-fav"),
      modalWishlist: document.getElementById("modal-wishlist"),
      modalCancel: document.getElementById("modal-cancel"),
    };

    let currentCarId = null;
    let modalCarouselImages = [];
    let modalCarouselIndex = 0;
    let modalCarouselTimer = null;

    function getModalImages(car) {
      const images = Array.isArray(car?.images) ? car.images.filter(Boolean) : [];
      if (images.length) return images;
      return [window.VGHelpers?.carImage(car, window.CAR_IMAGE_FALLBACK) || window.CAR_IMAGE_FALLBACK];
    }

    function stopModalCarouselTimer() {
      if (modalCarouselTimer) {
        clearInterval(modalCarouselTimer);
        modalCarouselTimer = null;
      }
    }

    function setModalCarouselSlide(index) {
      const count = modalCarouselImages.length;
      if (!count || !elements.modalCarouselTrack) return;

      modalCarouselIndex = (index + count) % count;
      elements.modalCarouselTrack.style.transform = `translateX(-${modalCarouselIndex * 100}%)`;

      if (!elements.modalCarouselDots) return;

      const dots = [...elements.modalCarouselDots.querySelectorAll("button[data-modal-dot]")];
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("w-6", dotIndex === modalCarouselIndex);
        dot.classList.toggle(dotActiveClass, dotIndex === modalCarouselIndex);
        dot.classList.toggle(dotIdleClass, dotIndex !== modalCarouselIndex);
      });
    }

    function shiftModalCarousel(step) {
      setModalCarouselSlide(modalCarouselIndex + step);
    }

    function startModalCarouselTimer() {
      stopModalCarouselTimer();
      if (modalCarouselImages.length <= 1) return;

      modalCarouselTimer = setInterval(() => {
        shiftModalCarousel(1);
      }, autoAdvanceMs);
    }

    function renderModalCarousel(car) {
      if (!elements.modalCarouselTrack || !elements.modalCarouselDots || !elements.modalCarouselPrev || !elements.modalCarouselNext) {
        return;
      }

      modalCarouselImages = getModalImages(car);
      modalCarouselIndex = 0;

      elements.modalCarouselTrack.innerHTML = modalCarouselImages
        .map(
          (imageUrl, imageIndex) => `
            <div class="min-w-full h-full shrink-0">
              <img src="${imageUrl}" alt="${car.name} image ${imageIndex + 1}" onerror="this.onerror=null;this.src='${window.CAR_IMAGE_FALLBACK}'" class="h-full w-full ${imageFitClass}">
            </div>`
        )
        .join("");

      elements.modalCarouselDots.innerHTML = modalCarouselImages
        .map(
          (_, imageIndex) =>
            `<button data-modal-dot="${imageIndex}" class="h-2.5 w-2.5 rounded-full ${dotIdleClass} transition" aria-label="Show image ${imageIndex + 1}"></button>`
        )
        .join("");

      const showControls = modalCarouselImages.length > 1;
      elements.modalCarouselPrev.classList.toggle("hidden", !showControls);
      elements.modalCarouselNext.classList.toggle("hidden", !showControls);
      elements.modalCarouselDots.classList.toggle("hidden", !showControls);
      elements.modalCarouselDots.classList.toggle("flex", showControls);

      setModalCarouselSlide(0);
      startModalCarouselTimer();
    }

    function updateButtons() {
      if (currentCarId === null || !elements.modalCompare || !elements.modalFav || !elements.modalWishlist) {
        return;
      }

      const state = getButtonState?.(currentCarId) || {
        isCompare: false,
        isFavorite: false,
        isWishlist: false,
      };

      elements.modalCompare.textContent = state.isCompare ? "Remove from Compare" : "Add to Compare";
      elements.modalCompare.className = `${state.isCompare ? modalActiveClass : modalPrimaryClass} text-sm`;

      elements.modalFav.textContent = state.isFavorite ? "Remove from Favorites" : "Add to Favorites";
      elements.modalFav.className = `${state.isFavorite ? modalActiveClass : modalSecondaryClass} text-sm`;

      elements.modalWishlist.textContent = state.isWishlist ? "Remove from Wishlist" : "Add to Wishlist";
      elements.modalWishlist.className = `${state.isWishlist ? modalActiveClass : modalSecondaryClass} text-sm`;
    }

    function open(id) {
      const car = getCarById?.(Number(id));
      if (!car || !elements.modal) return;

      currentCarId = Number(id);
      if (elements.modalName) elements.modalName.textContent = car.name || "-";
      if (elements.modalBrand) elements.modalBrand.textContent = car.brand || "-";
      if (elements.modalMaker) elements.modalMaker.textContent = car.maker || "-";
      if (elements.modalCountry) elements.modalCountry.textContent = car.country || "-";
      if (elements.modalHp) elements.modalHp.textContent = car.hp || "-";
      if (elements.modalSpeed) elements.modalSpeed.textContent = car.speed || "-";
      if (elements.modalWeight) elements.modalWeight.textContent = car.weight || "-";
      if (elements.modalZeroTo100Mph) elements.modalZeroTo100Mph.textContent = car.zeroTo100Mph || "-";
      if (elements.modalPrice) elements.modalPrice.textContent = car.price || "-";
      if (elements.modalDesc) elements.modalDesc.textContent = car.description || "-";

      renderModalCarousel(car);
      updateButtons();

      elements.modal.classList.remove("hidden");
      elements.modal.classList.add("flex");
    }

    function close() {
      if (!elements.modal) return;
      stopModalCarouselTimer();
      modalCarouselImages = [];
      modalCarouselIndex = 0;
      if (clearCurrentOnClose) {
        currentCarId = null;
      }
      elements.modal.classList.add("hidden");
      elements.modal.classList.remove("flex");
    }

    function wireEvents() {
      elements.modalClose?.addEventListener("click", close);
      elements.modalCancel?.addEventListener("click", close);
      elements.modal?.addEventListener("click", (event) => {
        if (event.target === elements.modal) close();
      });

      elements.modalCarouselPrev?.addEventListener("click", () => {
        shiftModalCarousel(-1);
        startModalCarouselTimer();
      });

      elements.modalCarouselNext?.addEventListener("click", () => {
        shiftModalCarousel(1);
        startModalCarouselTimer();
      });

      elements.modalCarouselDots?.addEventListener("click", (event) => {
        const dot = event.target.closest("button[data-modal-dot]");
        if (!dot) return;
        setModalCarouselSlide(Number(dot.dataset.modalDot));
        startModalCarouselTimer();
      });

      elements.modalCompare?.addEventListener("click", async () => {
        if (currentCarId !== null) {
          await onToggleCompare?.(currentCarId);
        }
      });

      elements.modalFav?.addEventListener("click", async () => {
        if (currentCarId !== null) {
          await onToggleFavorite?.(currentCarId);
        }
      });

      elements.modalWishlist?.addEventListener("click", async () => {
        if (currentCarId !== null) {
          await onToggleWishlist?.(currentCarId);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close();
        if (elements.modal?.classList.contains("hidden")) return;

        if (event.key === "ArrowLeft") {
          shiftModalCarousel(-1);
          startModalCarouselTimer();
        }

        if (event.key === "ArrowRight") {
          shiftModalCarousel(1);
          startModalCarouselTimer();
        }
      });

      if (!enableSwipe) {
        window.addEventListener("beforeunload", stopModalCarouselTimer);
        return;
      }

      const swipeSurface = elements.modalCarousel || elements.modalCarouselTrack;
      let touchStartX = null;
      let touchStartY = null;

      swipeSurface?.addEventListener(
        "touchstart",
        (event) => {
          if (!modalCarouselImages.length) return;
          const touch = event.touches?.[0];
          if (!touch) return;
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        },
        { passive: true }
      );

      swipeSurface?.addEventListener(
        "touchend",
        (event) => {
          if (!modalCarouselImages.length || touchStartX === null || touchStartY === null) return;

          const touch = event.changedTouches?.[0];
          if (!touch) return;

          const deltaX = touch.clientX - touchStartX;
          const deltaY = touch.clientY - touchStartY;
          touchStartX = null;
          touchStartY = null;

          if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

          if (deltaX < 0) {
            shiftModalCarousel(1);
          } else {
            shiftModalCarousel(-1);
          }

          startModalCarouselTimer();
        },
        { passive: true }
      );

      window.addEventListener("beforeunload", stopModalCarouselTimer);
    }

    wireEvents();

    return {
      open,
      close,
      updateButtons,
      getCurrentCarId: () => currentCarId,
      isOpen: () => !!elements.modal && !elements.modal.classList.contains("hidden"),
    };
  }

  window.VGModal = {
    ensureCarModal,
    createCarModalController,
  };
})();
