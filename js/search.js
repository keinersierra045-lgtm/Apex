/* ================================================================
   LILKER SHOP — search.js
   Panel de búsqueda: filtrado con debounce sobre el catálogo que ya
   cargó products.js, y render de resultados con acceso directo a
   "Añadir al carrito". La apertura/cierre del panel (antes lógica
   propia) ahora se delega en APEX.uiPanel, en su modo "sin overlay":
   el buscador no bloquea el scroll ni oscurece la página, y se
   cierra al hacer clic fuera de él (comportamiento original
   conservado). Se registra en window.APEX.search.
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

  function init() {
    const { $, debounce } = window.APEX.utils;

    const toggleBtn = $('#search-toggle');
    const panel = $('#search-panel');
    const form = $('#search-form');
    const input = $('#search-input');

    if (!toggleBtn || !panel || !form || !input) return;

    const searchPanel = window.APEX.uiPanel.create({
      panel,
      toggleBtn,
      // El buscador no tiene overlay propio ni bloquea el scroll de
      // fondo: es un panel ligero, no un drawer modal.
      lockScroll: false,
      // Sin overlay que capture el clic, el cierre se dispara al
      // detectar un clic fuera del panel y del botón que lo abre.
      closeOnOutsideClick: true,
      // Foco: al abrir se mueve automáticamente al primer elemento
      // interactivo del panel (el input de búsqueda, igual que antes).
      // Al cerrar, el foco vuelve al botón de búsqueda del header —
      // mejora de accesibilidad que antes no existía en este panel.
      focusManagement: true,
    });

    toggleBtn.addEventListener('click', searchPanel.toggle);

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
