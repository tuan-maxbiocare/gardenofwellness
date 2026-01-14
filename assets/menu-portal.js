// menu-portal.js (v10) - faster & smoother close
// - CLOSE_DELAY giảm để bắt đóng sớm hơn
// - Khi đóng: remove 'is-open' để chạy transition; chỉ remove DOM sau transitionend (fallback timeout)
(function() {
  const TOGGLE_SELECTORS = [
    '.menu-list__link[aria-haspopup]',
    '.menu-list__link[data-menu-toggle]',
    '[data-menu-toggle]',
    '.header__icon--menu'
  ].join(',');

  const PANEL_SELECTORS = [
    '.mega-menu__list',
    '.mega-menu__panel',
    '.menu-list__submenu',
    '.menu-list__panel',
    '.menu-list__overlay',
    '.header .sub-menu',
    '.header .dropdown'
  ].join(',');

  // Đã giảm: đóng nhanh hơn khi bỏ hover
  const CLOSE_DELAY = 30; // ms (nhỏ hơn trước)
  const OPEN_DELAY = 0;
  const DESKTOP_MIN = 750;

  let activeClone = null;
  let activeOriginal = null;
  let pendingReposition = false;

  function isDesktop() {
    return window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`).matches;
  }

  function findPanelForToggle(toggle) {
    if (!toggle) return null;
    const menuItem = toggle.closest('li, .menu-list__list-item, .menu-item, [data-menu-item]');
    if (menuItem) {
      const panel = menuItem.querySelector(PANEL_SELECTORS);
      if (panel) return panel;
    }
    const controls = toggle.getAttribute('aria-controls');
    if (controls) {
      const panel = document.getElementById(controls);
      if (panel) return panel;
    }
    const next = toggle.nextElementSibling;
    if (next && next.matches && next.matches(PANEL_SELECTORS)) return next;
    return null;
  }

  function buildCloneFromOriginal(originalPanel) {
    if (!originalPanel) return null;
    const clone = originalPanel.cloneNode(true);
    clone.classList.add('menu-portal-clone');
    if (!clone.id) clone.id = `menu-portal-clone-${Math.random().toString(36).slice(2,9)}`;

    try {
      clone.querySelectorAll(PANEL_SELECTORS).forEach((el) => {
        if (el === clone) return;
        el.remove();
      });
    } catch (e) {
      console.warn('menu-portal: strip submenus failed', e);
    }

    const anchors = clone.querySelectorAll('a[href], button[role="menuitem"]');
    if (!anchors || anchors.length === 0) return null;

    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

    clone.style.position = 'fixed';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.transform = 'translate3d(-9999px, -9999px, 0)';
    clone.style.willChange = 'transform, opacity';
    clone.style.pointerEvents = 'auto';
    clone.style.overflow = 'visible';
    return clone;
  }

  function applyTransformPosition(clone, left, top) {
    clone.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    clone.style.zIndex = getComputedStyle(document.documentElement).getPropertyValue('--layer-header-menu') || '9999';
  }

  function positionClone(clone, toggle) {
    if (!clone || !toggle) return;
    const rect = toggle.getBoundingClientRect();
    const top = Math.round(rect.bottom);
    const left = Math.round(Math.max(8, rect.left));
    applyTransformPosition(clone, left, top);
  }

  function openCloneFor(originalPanel, toggle) {
    if (!originalPanel || !toggle) return;
    if (activeOriginal === originalPanel && activeClone) {
      // Reposition quickly if still same
      if (activeClone._requestReposition) activeClone._requestReposition();
      return;
    }

    // Close existing (but use smooth hide)
    closeAllClones();

    const clone = buildCloneFromOriginal(originalPanel);
    if (!clone) return;

    document.body.appendChild(clone);
    activeClone = clone;
    activeOriginal = originalPanel;

    // Force reflow then set position & open class to trigger smooth transition
    positionClone(clone, toggle);
    // ensure the CSS class triggers opacity transition (defined in CSS)
    // Give small rAF to ensure transform applied before adding is-open (improves animation)
    requestAnimationFrame(() => {
      clone.classList.add('is-open');
    });

    // Sync open to original toggle so level-2/3 (gốc) hiển thị
    const syncOpen = () => {
      try { toggle.setAttribute('aria-expanded', 'true'); } catch (e) {}
      try { toggle.dispatchEvent(new Event('mouseenter', { bubbles: true })); } catch (e) {}
      try { toggle.dispatchEvent(new Event('focusin', { bubbles: true })); } catch (e) {}
    };
    const syncClose = () => {
      try { toggle.setAttribute('aria-expanded', 'false'); } catch (e) {}
      try { toggle.dispatchEvent(new Event('mouseleave', { bubbles: true })); } catch (e) {}
      try { toggle.dispatchEvent(new Event('focusout', { bubbles: true })); } catch (e) {}
    };

    // Hover/leave with small delay; cancel timers if re-enter
    function cancelClose(obj) { if (obj && obj._closeTimer) { clearTimeout(obj._closeTimer); obj._closeTimer = null; } }
    function scheduleClose(obj) { if (!obj) return; cancelClose(obj); obj._closeTimer = setTimeout(() => { smoothCloseClone(clone); }, CLOSE_DELAY); }

    const cloneEnter = () => { cancelClose(clone); cancelClose(toggle); syncOpen(); };
    const cloneLeave = () => { scheduleClose(clone); scheduleClose(toggle); syncClose(); };

    clone.addEventListener('mouseenter', cloneEnter);
    clone.addEventListener('mouseleave', cloneLeave);
    clone.addEventListener('focusin', cloneEnter);
    clone.addEventListener('focusout', cloneLeave);

    // Toggle also opens/closes
    const toggleEnter = () => { cancelClose(clone); cancelClose(toggle); openCloneFor(originalPanel, toggle); syncOpen(); };
    const toggleLeave = () => { scheduleClose(toggle); scheduleClose(clone); syncClose(); };

    toggle.addEventListener('mouseenter', toggleEnter);
    toggle.addEventListener('mouseleave', toggleLeave);
    toggle.addEventListener('focusin', toggleEnter);
    toggle.addEventListener('focusout', toggleLeave);

    clone._portalHandlers = { cloneEnter, cloneLeave, toggleEnter, toggleLeave, toggleRef: toggle };

    // Outside click / escape
    const outsideHandler = (e) => {
      if (e.target.closest('.menu-portal-clone')) return;
      if (e.target.closest(TOGGLE_SELECTORS)) return;
      smoothCloseClone(clone);
    };
    const escHandler = (e) => { if (e.key === 'Escape') smoothCloseClone(clone); };

    document.addEventListener('mousedown', outsideHandler);
    document.addEventListener('touchstart', outsideHandler);
    document.addEventListener('keydown', escHandler);

    clone._outsideHandler = outsideHandler;
    clone._escHandler = escHandler;

    // Reposition on scroll/resize using rAF throttling
    let pending = false;
    function rAFReposition() {
      if (!activeClone || !activeOriginal) return;
      positionClone(activeClone, clone._portalHandlers.toggleRef);
      pending = false;
    }
    const requestReposition = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(rAFReposition);
    };
    window.addEventListener('scroll', requestReposition, { passive: true });
    window.addEventListener('resize', requestReposition);
    clone._requestReposition = requestReposition;
    clone._repositionListeners = true;
  }

  // Smooth close: remove class to trigger transition, then remove node after transitionend (with fallback)
  function smoothCloseClone(clone) {
    if (!clone) return;
    // If already in process of closing, ignore
    if (clone._closing) return;
    clone._closing = true;

    // remove visible class to start CSS transition
    clone.classList.remove('is-open');

    // cleanup handlers (toggle listeners etc.) now to avoid re-opening while hiding
    if (clone._portalHandlers) {
      const handlers = clone._portalHandlers;
      const toggle = handlers.toggleRef;
      try {
        toggle.removeEventListener('mouseenter', handlers.toggleEnter);
        toggle.removeEventListener('mouseleave', handlers.toggleLeave);
        toggle.removeEventListener('focusin', handlers.toggleEnter);
        toggle.removeEventListener('focusout', handlers.toggleLeave);
      } catch (e) {}
      try {
        clone.removeEventListener('mouseenter', handlers.cloneEnter);
        clone.removeEventListener('mouseleave', handlers.cloneLeave);
        clone.removeEventListener('focusin', handlers.cloneEnter);
        clone.removeEventListener('focusout', handlers.cloneLeave);
      } catch (e) {}
      delete clone._portalHandlers;
    }

    // remove outside listeners
    if (clone._outsideHandler) {
      document.removeEventListener('mousedown', clone._outsideHandler);
      document.removeEventListener('touchstart', clone._outsideHandler);
      delete clone._outsideHandler;
    }
    if (clone._escHandler) {
      document.removeEventListener('keydown', clone._escHandler);
      delete clone._escHandler;
    }
    if (clone._repositionListeners) {
      window.removeEventListener('scroll', clone._requestReposition, { passive: true });
      window.removeEventListener('resize', clone._requestReposition);
      delete clone._repositionListeners;
    }

    // Ensure original toggle receives close signal
    const handlers = clone._portalHandlers || {};
    const toggle = handlers.toggleRef || (clone._portalHandlers && clone._portalHandlers.toggleRef);
    try { toggle?.setAttribute('aria-expanded', 'false'); } catch (e) {}
    try { toggle?.dispatchEvent(new Event('mouseleave', { bubbles: true })); } catch (e) {}

    // Remove clone after transitionend; fallback timeout (match CSS transition time)
    const removeNode = () => {
      try { clone.remove(); } catch (e) {}
      if (activeClone === clone) { activeClone = null; activeOriginal = null; }
    };

    const onTransitionEnd = (ev) => {
      if (ev.target !== clone) return;
      clone.removeEventListener('transitionend', onTransitionEnd);
      removeNode();
    };

    clone.addEventListener('transitionend', onTransitionEnd);

    // Fallback: if transitionend doesn't fire, force remove after 160ms
    clone._removeTimer = setTimeout(() => {
      clone.removeEventListener('transitionend', onTransitionEnd);
      removeNode();
    }, 160);
  }

  function closeAllClonesImmediate() {
    // immediate close without animation (not used normally)
    if (!activeClone) return;
    try { activeClone.remove(); } catch (e) {}
    activeClone = null;
    activeOriginal = null;
  }

  // Document-level listeners
  let hoverOpenTimeout = null;

  document.addEventListener('mouseover', (e) => {
    const toggle = e.target.closest(TOGGLE_SELECTORS);
    if (!toggle) return;
    if (!isDesktop()) return;
    const panel = findPanelForToggle(toggle);
    if (!panel) return;
    if (hoverOpenTimeout) clearTimeout(hoverOpenTimeout);
    hoverOpenTimeout = setTimeout(() => openCloneFor(panel, toggle), OPEN_DELAY);
  });

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest(TOGGLE_SELECTORS);
    if (toggle) {
      const panel = findPanelForToggle(toggle);
      if (!panel) return;
      if (activeClone && activeOriginal === panel) {
        smoothCloseClone(activeClone);
      } else {
        openCloneFor(panel, toggle);
      }
      e.stopPropagation();
      return;
    }
    if (!e.target.closest(PANEL_SELECTORS)) smoothCloseClone(activeClone);
  });

  document.addEventListener('focusin', (e) => {
    const toggle = e.target.closest(TOGGLE_SELECTORS);
    if (toggle) {
      const panel = findPanelForToggle(toggle);
      if (panel) openCloneFor(panel, toggle);
    }
  });

  window.addEventListener('beforeunload', () => { closeAllClonesImmediate(); });
  window.addEventListener('pagehide', () => { closeAllClonesImmediate(); });

  // expose
  window.__MenuPortal = { closeAllClones: () => { if (activeClone) smoothCloseClone(activeClone); } };

})();