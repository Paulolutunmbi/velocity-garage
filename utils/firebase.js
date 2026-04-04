(function () {
  const MAX_COMPARE = 3;

  const MESSAGES = {
    favorites: {
      add: "Added to Favorites",
      remove: "Removed from Favorites",
    },
    wishlist: {
      add: "Added to Wishlist",
      remove: "Removed from Wishlist",
    },
    compare: {
      add: "Added to Compare",
      remove: "Removed from Compare",
      limit: "You can compare up to 3 cars only",
    },
  };

  function normalizeIds(value) {
    if (window.VGHelpers?.normalizeIds) {
      return window.VGHelpers.normalizeIds(value);
    }

    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))];
  }

  function serializeCollections(state, maxCompare = MAX_COMPARE) {
    return {
      favorites: normalizeIds([...state.favorites]),
      wishlist: normalizeIds([...state.wishlist]),
      compare: normalizeIds([...state.compare]).slice(0, maxCompare),
    };
  }

  async function persistCollections(state, maxCompare = MAX_COMPARE) {
    const payload = serializeCollections(state, maxCompare);
    await window.vgUserStore?.updateUserState?.(payload);
    return payload;
  }

  function applyRemoteCollections(state, remote = {}, maxCompare = MAX_COMPARE) {
    state.favorites = new Set(normalizeIds(remote.favorites || []));
    state.wishlist = new Set(normalizeIds(remote.wishlist || []));
    state.compare = new Set(normalizeIds(remote.compare || []).slice(0, maxCompare));
  }

  async function loadCollectionsForCurrentUser(maxCompare = MAX_COMPARE) {
    const user = window.vgUserStore?.getCurrentUser?.();
    const uid = user?.uid || "unknown";
    const remote = await window.vgUserStore?.loadUserData?.(uid);

    return {
      uid,
      favorites: normalizeIds(remote?.favorites || []),
      wishlist: normalizeIds(remote?.wishlist || []),
      compare: normalizeIds(remote?.compare || []).slice(0, maxCompare),
    };
  }

  function createCollectionActions({
    state,
    notify,
    afterToggle,
    maxCompare = MAX_COMPARE,
    messages = MESSAGES,
  }) {
    async function runAfter(type, id) {
      if (typeof afterToggle === "function") {
        await afterToggle({ type, id });
      }
    }

    async function toggleFavorite(id) {
      if (state.favorites.has(id)) {
        state.favorites.delete(id);
        notify?.(messages.favorites.remove);
      } else {
        state.favorites.add(id);
        notify?.(messages.favorites.add);
      }

      await persistCollections(state, maxCompare);
      await runAfter("favorite", id);
    }

    async function toggleWishlist(id) {
      if (state.wishlist.has(id)) {
        state.wishlist.delete(id);
        notify?.(messages.wishlist.remove);
      } else {
        state.wishlist.add(id);
        notify?.(messages.wishlist.add);
      }

      await persistCollections(state, maxCompare);
      await runAfter("wishlist", id);
    }

    async function toggleCompare(id) {
      if (state.compare.has(id)) {
        state.compare.delete(id);
        notify?.(messages.compare.remove);
      } else {
        if (state.compare.size >= maxCompare) {
          notify?.(messages.compare.limit);
          return false;
        }

        state.compare.add(id);
        notify?.(messages.compare.add);
      }

      await persistCollections(state, maxCompare);
      await runAfter("compare", id);
      return true;
    }

    return {
      toggleFavorite,
      toggleWishlist,
      toggleCompare,
      persistCollections: () => persistCollections(state, maxCompare),
    };
  }

  window.VGFirebase = {
    MAX_COMPARE,
    MESSAGES,
    serializeCollections,
    persistCollections,
    applyRemoteCollections,
    loadCollectionsForCurrentUser,
    createCollectionActions,
  };
})();
