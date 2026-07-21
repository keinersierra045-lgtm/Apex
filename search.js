/* ================================================================
   APEX — search.js
   Panel de búsqueda: abrir/cerrar, filtrado con debounce sobre el
   catálogo que ya cargó products.js, y render de resultados con
   acceso directo a "Añadir al carrito". Se registra en
   window.APEX.search.
================================================================ */

(() => {
  'use strict';

  const MIN_QUERY_LENGTH = 2;

  /**
   * Normaliza texto para comparar sin distinguir mayúsculas ni acentos
   * ("Zapatilla" y "zapatilla" deben encontrar lo mismo).
   */
  function normalize(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function matchesQuery(product, query) {
    const haystack = normalize(`${product.name} ${product.category}`);
    return haystack.includes(normalize(query));
  }

  function buildResultRow(product) {
    const { formatPrice } = window.APEX.utils;
    const row = document.createElement('div');
    row.className = 'search-result';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    image.width = 48;
    image.height = 48;

    const info = document.createElement('div');
    info.className = 'search-result__info';

    const name = document.createElement('p');
    name.className = 'search-result__name';
    name.textContent = product.name;

    const price = document.createElement('p');
    price.className = 'search-result__price';
    price.textContent = formatPrice(product.price);

    info.append(name, price);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--secondary';
    addBtn.textContent = 'Añadir';
    addBtn.addEventListener('click', () => {
      window.APEX.events.emit('product:add-to-cart', { product });
    });

    row.append(image, info, addBtn);
    return row;
  }

  function renderResults(results, query) {
    const { $ } = window.APEX.utils;
    const container = $('#search-results');
    if (!container) return;

    container.innerHTML = '';

    if (query.length < MIN_QUERY_LENGTH) {
      return; // sin mensaje: aún no hay intención de búsqueda clara
    }

    if (results.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'search-result__empty';
      emptyState.textContent = `Sin resultados para "${query}".`;
      container.appendChild(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach((product) => fragment.appendChild(buildResultRow(product)));
    container.appendChild(fragment);
  }

  function performSearch(rawQuery) {
    const query = rawQuery.trim();
    const catalog = window.APEX.products?.getAll?.() ?? [];
    const results = query.length >= MIN_QUERY_LENGTH
      ? catalog.filter((product) => matchesQuery(product, query))
      : [];
    renderResults(results, query);
  }

  /* ----------------------------------------------------------------
     APERTURA / CIERRE DEL PANEL
  ---------------------------------------------------------------- */
  function openPanel(panel, toggleBtn, input) {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    toggleBtn.setAttribute('aria-expanded', 'true');
    input.focus();
  }

  function closePanel(panel, toggleBtn) {
    panel.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!panel.classList.contains('is-open')) panel.hidden = true;
    }, 250);
  }

  function init() {
    const { $, debounce } = window.APEX.utils;

    const toggleBtn = $('#search-toggle');
    const panel = $('#search-panel');
    const form = $('#search-form');
    const input = $('#search-input');

    if (!toggleBtn || !panel || !form || !input) return;

    const isPanelOpen = () => !panel.hidden;

    toggleBtn.addEventListener('click', () => {
      isPanelOpen() ? closePanel(panel, toggleBtn) : openPanel(panel, toggleBtn, input);
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isPanelOpen()) {
        closePanel(panel, toggleBtn);
      }
    });

    // Cerrar al hacer clic fuera del panel y del botón que lo abre
    document.addEventListener('click', (event) => {
      if (!isPanelOpen()) return;
      const clickedInside = panel.contains(event.target) || toggleBtn.contains(event.target);
      if (!clickedInside) closePanel(panel, toggleBtn);
    });

    // Evita que el submit recargue la página (búsqueda es 100% en vivo)
    form.addEventListener('submit', (event) => event.preventDefault());

    // Búsqueda en vivo con debounce
    input.addEventListener('input', debounce((event) => {
      performSearch(event.target.value);
    }, 200));
  }

  window.APEX = window.APEX || {};
  window.APEX.search = { init };
})();
