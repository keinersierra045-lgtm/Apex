/* ================================================================
   LILKER SHOP — ui-panel.js
   Fábrica de controladores para paneles deslizantes (drawers,
   menú móvil, buscador). Antes de este módulo, menu.js, search.js,
   cart.js y favorites.js reimplementaban cada uno la misma lógica
   de abrir/cerrar con pequeñas variaciones. Este módulo la
   centraliza en un único contrato reutilizable.

   Cubre los dos patrones presentes en el proyecto:
   1) "drawer + overlay"  → menú móvil, carrito, favoritos
      (overlay de fondo, bloqueo de scroll, cierre con Escape)
   2) "panel sin overlay" → buscador
      (cierre al hacer clic fuera del panel/botón, sin bloquear scroll)

   Se registra en window.APEX.uiPanel para que el resto de módulos
   lo consuman: const panel = APEX.uiPanel.create({ ... }).
================================================================ */

(() => {
  'use strict';

  const TRANSITION_MS_DEFAULT = 250;

  /**
   * Crea un controlador de panel deslizante.
   *
   * @param {Object} config
   * @param {HTMLElement} config.panel - Elemento del panel/drawer (obligatorio).
   * @param {HTMLElement} [config.overlay] - Overlay de fondo. Si se omite,
   *        el panel funciona en modo "sin overlay" (ej. buscador).
   * @param {HTMLElement} [config.toggleBtn] - Botón que abre/cierra el panel.
   *        Si se provee, se sincroniza su aria-expanded y recibe el foco
   *        de vuelta al cerrar.
   * @param {string} [config.openClass='is-open'] - Clase que dispara la
   *        transición CSS (definida en animations.css).
   * @param {number} [config.transitionMs=250] - Debe coincidir con la
   *        duración de la transición CSS del panel, para ocultar con
   *        [hidden] solo cuando la animación de cierre haya terminado.
   * @param {boolean} [config.lockScroll=true] - Bloquea el scroll del
   *        body mientras el panel está abierto (drawers sí, buscador no).
   * @param {boolean} [config.closeOnEscape=true] - Cierra con la tecla Escape.
   * @param {boolean} [config.closeOnOutsideClick=false] - Cierra al hacer
   *        clic fuera del panel y del toggleBtn (modo "sin overlay").
   * @param {boolean} [config.focusManagement=true] - Mueve el foco al
   *        primer elemento interactivo del panel al abrir, y lo devuelve
   *        al toggleBtn al cerrar. Mejora de accesibilidad para teclado
   *        y lectores de pantalla.
   * @param {Function} [config.onOpen] - Callback tras abrir.
   * @param {Function} [config.onClose] - Callback tras cerrar.
   * @returns {{open: Function, close: Function, toggle: Function, isOpen: Function}}
   */
  function create(config) {
    const {
      panel,
      overlay = null,
      toggleBtn = null,
      openClass = 'is-open',
      transitionMs = TRANSITION_MS_DEFAULT,
      lockScroll = true,
      closeOnEscape = true,
      closeOnOutsideClick = false,
      focusManagement = true,
      onOpen,
      onClose,
    } = config;

    if (!panel) {
      console.warn('[APEX.uiPanel] Se requiere "panel" para crear el controlador.');
      return null;
    }

    let hideTimeoutId = null;

    /**
     * El estado real de apertura se lee del DOM (clase openClass),
     * no de una variable aparte: evita desincronizaciones entre el
     * controlador y lo que el usuario realmente ve en pantalla.
     */
    function isOpen() {
      return panel.classList.contains(openClass);
    }

    function open() {
      if (isOpen()) return;

      // Cancela cualquier ocultación pendiente de un cierre anterior
      // interrumpido por una apertura rápida (evita parpadeos).
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }

      panel.hidden = false;
      if (overlay) overlay.hidden = false;

      // Se retira [hidden] primero y, en el frame siguiente, se añade
      // la clase que dispara la transición. Si se añadiera todo en el
      // mismo frame, el navegador no anima el cambio porque el
      // elemento aún es display:none.
      requestAnimationFrame(() => {
        panel.classList.add(openClass);
        if (overlay) overlay.classList.add(openClass);
      });

      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
      if (lockScroll) document.body.style.overflow = 'hidden';

      if (focusManagement) {
        const firstFocusable = panel.querySelector('a, button, input, [tabindex]');
        firstFocusable?.focus();
      }

      onOpen?.();
    }

    function close() {
      if (!isOpen()) return;

      panel.classList.remove(openClass);
      if (overlay) overlay.classList.remove(openClass);

      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
      if (lockScroll) document.body.style.overflow = '';
      if (focusManagement) toggleBtn?.focus();

      // Espera a que termine la transición antes de ocultar de verdad
      // (evita que el contenido "salte" antes de tiempo).
      hideTimeoutId = setTimeout(() => {
        if (!isOpen()) {
          panel.hidden = true;
          if (overlay) overlay.hidden = true;
        }
        hideTimeoutId = null;
      }, transitionMs);

      onClose?.();
    }

    function toggle() {
      isOpen() ? close() : open();
    }

    /* ----------------------------------------------------------------
       LISTENERS COMUNES
       Se registran una sola vez, en la creación del controlador.
    ---------------------------------------------------------------- */
    if (closeOnEscape) {
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) close();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', close);
    }

    if (closeOnOutsideClick) {
      document.addEventListener('click', (event) => {
        if (!isOpen()) return;
        const clickedInside = panel.contains(event.target) || toggleBtn?.contains(event.target);
        if (!clickedInside) close();
      });
    }

    return { open, close, toggle, isOpen };
  }

  window.APEX = window.APEX || {};
  window.APEX.uiPanel = { create };
})();
