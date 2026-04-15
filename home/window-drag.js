(() => {
  const stage = document.querySelector(".desktop-stage");
  const windows = Array.from(document.querySelectorAll("[data-window]"));
  const openButtons = Array.from(document.querySelectorAll("[data-open-window]"));
  const closeButtons = Array.from(document.querySelectorAll("[data-close-window]"));
  const iconOpenSound = document.getElementById("icon-open-sound");

  if (!stage || windows.length === 0) return;

  const isMobile = window.matchMedia("(max-width: 900px)");
  let activeWindow = null;
  let activeHandle = null;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let zCounter = 20;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const visibleWindows = () => windows.filter((win) => !win.classList.contains("is-hidden"));


  const isModalWindow = (win) => {
    if (!win) return false;
    return win.dataset.modal === "true";
  };

  const visibleModalWindows = () => visibleWindows().filter((win) => isModalWindow(win));
  const isModalLocked = () => visibleModalWindows().length > 0;
  const isBlockedByModal = (win) => isModalLocked() && !isModalWindow(win);

  const bringToFront = (win) => {
    if (!win || isBlockedByModal(win)) return;
    zCounter += 1;
    win.style.zIndex = String(zCounter);
  };

  const playIconSound = () => {
    if (!iconOpenSound) return;

    try {
      iconOpenSound.currentTime = 0;
      iconOpenSound.play().catch(() => {});
    } catch (error) {
      console.warn("icon sound play failed:", error);
    }
  };

  const updateIconState = () => {
    openButtons.forEach((button) => {
      const targetId = button.dataset.openWindow;
      const target = document.getElementById(targetId);

      if (!target) return;

      const isOpen = !target.classList.contains("is-hidden");
      button.classList.toggle("is-active", isOpen);
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  };

   const syncModalState = () => {
     const locked = isModalLocked();
     stage.classList.toggle("has-modal-lock", locked);


     windows.forEach((win) => {
       if (locked && !isModalWindow(win)) {
      win.setAttribute("aria-hidden", "true");
       } else {
      win.removeAttribute("aria-hidden");
       }
     });
   };
                                      
 const layoutMobileWindows = () => {                                                                                              
    visibleWindows().forEach((win) => {                                                                                            
      win.style.left = "";                                                                                                         
      win.style.top = "";                                                                                                          
    });                                                                                                                            
  };

  const centerWindowIfNeeded = (win) => {
    if (isMobile.matches) return;

    const rect = stage.getBoundingClientRect();
    const winWidth = win.offsetWidth;
    const winHeight = win.offsetHeight;

    const left = Math.max(12, (rect.width - winWidth) / 2);
    const top = Math.max(20, (rect.height - winHeight) / 2);

    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
  };

  const openWindow = (id) => {
    const win = document.getElementById(id);
    if (!win) return false;
    if (isBlockedByModal(win)) return false;

    const wasHidden = win.classList.contains("is-hidden");
    win.classList.remove("is-hidden");

    if (wasHidden && !isMobile.matches) {
      if (win.dataset.modal === "true") {
        centerWindowIfNeeded(win);
      } else {
        const hasInlinePosition = win.style.left || win.style.top;
        if (!hasInlinePosition) {
          centerWindowIfNeeded(win);
        }
      }
    }

    bringToFront(win);
    updateIconState();
    syncModalState();
    return true;
  };

  const closeWindow = (win) => {
    if (!win) return false;

    win.classList.add("is-hidden");
    win.classList.remove("is-dragging");
    document.body.classList.remove("dragging");
    activeWindow = null;
    activeHandle = null;
    pointerId = null;
    updateIconState();
    syncModalState();
    return true;
  };

  windows.forEach((win, index) => {
    win.style.zIndex = String(index + 2);

    if (win.dataset.defaultOpen === "true") {
      win.classList.remove("is-hidden");
    }

    win.addEventListener("pointerdown", () => {
      if (win.classList.contains("is-hidden")) return;
      if (isBlockedByModal(win)) return;
      bringToFront(win);
    });

    const handle = win.querySelector("[data-drag-handle]");
    if (!handle) return;

    handle.addEventListener("pointerdown", (event) => {
      if (isMobile.matches) return;
      if (event.button !== 0) return;
      if (isBlockedByModal(win)) return;

      const clickedButton = event.target.closest("button");
      if (clickedButton) return;

      const stageRect = stage.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();

      activeWindow = win;
      activeHandle = handle;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = winRect.left - stageRect.left;
      originTop = winRect.top - stageRect.top;

      bringToFront(win);
      win.classList.add("is-dragging");
      document.body.classList.add("dragging");

      handle.setPointerCapture(pointerId);
      event.preventDefault();
    });
  });

  window.addEventListener("pointermove", (event) => {
    if (!activeWindow || !activeHandle) return;
    if (event.pointerId !== pointerId) return;
    if (isMobile.matches) return;

    const stageRect = stage.getBoundingClientRect();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    const maxLeft = Math.max(0, stageRect.width - activeWindow.offsetWidth);
    const maxTop = Math.max(0, stageRect.height - activeWindow.offsetHeight);

    const nextLeft = clamp(originLeft + dx, 0, maxLeft);
    const nextTop = clamp(originTop + dy, 0, maxTop);

    activeWindow.style.left = `${nextLeft}px`;
    activeWindow.style.top = `${nextTop}px`;
  });

  const stopDrag = (event) => {
    if (!activeWindow || !activeHandle) return;
    if (event.pointerId !== pointerId) return;

    if (activeHandle.hasPointerCapture(pointerId)) {
      activeHandle.releasePointerCapture(pointerId);
    }

    activeWindow.classList.remove("is-dragging");
    document.body.classList.remove("dragging");
    activeWindow = null;
    activeHandle = null;
    pointerId = null;
  };

  window.addEventListener("pointerup", stopDrag);
  window.addEventListener("pointercancel", stopDrag);

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.openWindow;
      const target = document.getElementById(targetId);

      if (!target) return;
      if (isBlockedByModal(target)) return;

      playIconSound();

      if (target.classList.contains("is-hidden")) {
        openWindow(targetId);
      } else {
        bringToFront(target);
      }
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const win = button.closest("[data-window]");
      closeWindow(win);
    });
  });

    window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const opened = visibleWindows();
    if (opened.length === 0) return;

    const topWindow = opened.reduce((top, current) => {
      const topZ = Number(top.style.zIndex || 0);
      const currentZ = Number(current.style.zIndex || 0);
      return currentZ > topZ ? current : top;
    });

    if (topWindow?.dataset.defaultOpen === "true") return;
    closeWindow(topWindow);
  });

  window.openDesktopWindow = openWindow;
  window.closeDesktopWindow = (id) => closeWindow(document.getElementById(id));

  updateIconState();
  syncModalState();
})();
