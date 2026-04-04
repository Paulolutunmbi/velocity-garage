(function () {
  function resolveStateClass(isActive, activeClass, idleClass) {
    return isActive ? activeClass : idleClass;
  }

  function renderActionButton({
    action,
    id,
    label,
    className,
    type = "button",
    ariaLabel = "",
  }) {
    const aria = ariaLabel ? ` aria-label="${ariaLabel}"` : "";
    return `<button type="${type}" data-action="${action}" data-id="${id}" class="${className}"${aria}>${label}</button>`;
  }

  window.VGButton = {
    resolveStateClass,
    renderActionButton,
  };
})();
