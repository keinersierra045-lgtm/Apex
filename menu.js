/* ================================================================
   APEX — menu.js
   Controla el menú móvil off-canvas: abrir/cerrar, overlay,
   cierre con Escape y bloqueo de scroll del body mientras está
   abierto. Se registra en window.APEX.menu para que app.js lo
   arranque automáticamente.
================================================================ */

(() => {
  'use strict';

  function createMenuController() {
    const { $ } = window.APEX.utils;

    const toggleBtn = $('#menu-toggle');
    const menu = $('#mobile-menu');
    const overlay = $('#overlay');

    // Si el HTML no tiene estos elementos, el módulo no hace nada
    // (evita errores en páginas que no incluyan el menú móvil).
    if (!toggleBtn || !menu || !overlay) return null;

    let isOpen = false;

    function open() {
      isOpen = true;
      menu.hidden = false;
      overlay.hidden = false;

      // Se retira [hidden] primero y, en el frame siguiente, se añade
      // la clase que dispara la transición (definida en animations.css).
      // Si se añadiera todo en el mismo frame, el navegador no anima
      // el cambio porque el elemento aún es display:none.
      requestAnimationFrame(() => {
        menu.classList.add('is-open');
        overlay.classList.add('is-open');
      });

      toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; // evita scroll de fondo
      menu.querySelector('a')?.focus(); // mueve el foco dentro del menú
    }

    function close() {
      isOpen = false;
      menu.classList.remove('is-open');
      overlay.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggleBtn.focus(); // devuelve el foco al botón que abrió el menú

      // Espera a que termine la transición antes de ocultar de verdad
      // (evita que el contenido "salte" antes de tiempo).
      const TRANSITION_MS = 250;
      setTimeout(() => {
        if (!isOpen) {
          menu.hidden = true;
          overlay.hidden = true;
        }
      }, TRANSITION_MS);
    }

    function toggle() {
      isOpen ? close() : open();
    }

    return { open, close, toggle, isOpenState: () => isOpen };
  }

  function init() {
    const controller = createMenuController();
    if (!controller) return;

    const { $ } = window.APEX.utils;
    const toggleBtn = $('#menu-toggle');
    const overlay = $('#overlay');
    const menu = $('#mobile-menu');

    toggleBtn.addEventListener('click', controller.toggle);
    overlay.addEventListener('click', controller.close);

    // Cerrar al pulsar un enlace del menú (navegación por anclas)
    menu.querySelectorAll('.mobile-menu__link').forEach((link) => {
      link.addEventListener('click', controller.close);
    });

    // Cerrar con la tecla Escape, solo si el menú está abierto
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && controller.isOpenState()) {
        controller.close();
      }
    });
  }

  window.APEX = window.APEX || {};
  window.APEX.menu = { init };
})();
