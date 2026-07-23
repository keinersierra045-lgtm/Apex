/* ================================================================
   LILKER SHOP — menu.js
   Controla el menú móvil off-canvas. La lógica de abrir/cerrar
   (overlay, transición, Escape, bloqueo de scroll, foco) ya no vive
   aquí: se delega en APEX.uiPanel (ui-panel.js), que centraliza ese
   patrón para reutilizarlo también en cart.js y favorites.js.
   Este módulo solo conecta los elementos del DOM propios del menú
   móvil con ese controlador. Se registra en window.APEX.menu.
================================================================ */

(() => {
  'use strict';

  function init() {
    const { $, $$ } = window.APEX.utils;

    const toggleBtn = $('#menu-toggle');
    const menu = $('#mobile-menu');
    const overlay = $('#overlay');

    // Si el HTML no tiene estos elementos, el módulo no hace nada
    // (evita errores en páginas que no incluyan el menú móvil).
    if (!toggleBtn || !menu || !overlay) return;

    const menuPanel = window.APEX.uiPanel.create({
      panel: menu,
      overlay,
      toggleBtn,
      // El menú móvil sí bloquea el scroll de fondo y mueve el foco
      // al abrir/cerrar (comportamiento original conservado).
      lockScroll: true,
      focusManagement: true,
    });

    toggleBtn.addEventListener('click', menuPanel.toggle);

    // Cerrar al pulsar un enlace del menú (navegación por anclas)
    menu.querySelectorAll('.mobile-menu__link').forEach((link) => {
      link.addEventListener('click', menuPanel.close);
    });
  }

  window.APEX = window.APEX || {};
  window.APEX.menu = { init };
})();
