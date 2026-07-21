/* ================================================================
   APEX — animations.js
   Scroll-reveal vía IntersectionObserver: añade/observa la clase
   .reveal (animations.css) y agrega .is-visible al entrar en el
   viewport. Se re-suscribe a las tarjetas de producto cada vez
   que products.js emite 'products:rendered'. Se registra en
   window.APEX.animations.
================================================================ */

(() => {
  'use strict';

  let observer = null;

  const OBSERVER_OPTIONS = {
    root: null,
    rootMargin: '0px 0px -60px 0px', // revela un poco antes de tocar el borde inferior
    threshold: 0.15,
  };

  function createObserver() {
    return new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target); // se revela una sola vez, no repetidamente
        }
      });
    }, OBSERVER_OPTIONS);
  }

  /**
   * Marca un grupo de elementos como .reveal, les aplica un pequeño
   * desfase escalonado (stagger) según su posición, y los pone bajo
   * observación. Reutilizable para cualquier grid de la página.
   */
  function observeGroup(elements, { stagger = 0 } = {}) {
    elements.forEach((el, index) => {
      el.classList.add('reveal');
      if (stagger > 0) {
        el.style.transitionDelay = `${index * stagger}ms`;
      }
      observer.observe(el);
    });
  }

  function observeStaticSections() {
    const { $, $$ } = window.APEX.utils;

    observeGroup($$('.category-card'), { stagger: 80 });
    observeGroup($$('.value-item'), { stagger: 60 });

    const newsletterInner = $('.newsletter__inner');
    if (newsletterInner) observeGroup([newsletterInner]);
  }

  /**
   * products.js ya añade la clase .reveal a cada tarjeta al crearla;
   * aquí solo hace falta observarlas (con stagger) cada vez que la
   * grid se repinta (cambio de filtro incluido).
   */
  function observeProductCards() {
    const { $$ } = window.APEX.utils;
    const cards = $$('#products-grid [data-product-card]');
    observeGroup(cards, { stagger: 60 });
  }

  function init() {
    // Si el navegador no soporta IntersectionObserver (muy poco
    // probable hoy), no se rompe nada: el CSS deja los elementos
    // visibles por defecto salvo que se añada la clase .reveal,
    // así que simplemente no la añadimos.
    if (!('IntersectionObserver' in window)) return;

    observer = createObserver();
    observeStaticSections();

    window.APEX.events.on('products:rendered', observeProductCards);
  }

  window.APEX = window.APEX || {};
  window.APEX.animations = { init };
})();
