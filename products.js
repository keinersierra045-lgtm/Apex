/* ================================================================
   APEX — products.js
   Carga el catálogo, lo renderiza usando <template id="product-card
   -template"> (sin innerHTML, sin HTML duplicado) y gestiona los
   filtros por categoría. No toca el carrito ni los favoritos
   directamente: emite eventos y deja que cart.js / favorites.js
   respondan. Se registra en window.APEX.products.
================================================================ */

(() => {
  'use strict';

  const DATA_URL = 'data/products.json';

  // Estado en memoria del módulo (no se expone fuera de este archivo)
  let allProducts = [];
  let activeFilter = 'all';

  /**
   * Descarga el catálogo. Hoy lee un JSON estático; el día que exista
   * backend, basta con cambiar esta función por:
   *   return window.APEX.api.get('/products');
   * El resto del módulo no necesita saber de dónde vinieron los datos.
   */
  async function fetchProducts() {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el catálogo (${response.status})`);
    }
    return response.json();
  }

  /**
   * Construye un <article class="product-card"> a partir del template
   * y los datos de un producto, y lo devuelve listo para insertar.
   */
  function buildProductCard(product) {
    const { $ } = window.APEX.utils;
    const { formatPrice } = window.APEX.utils;
    const template = $('#product-card-template');
    const node = template.content.cloneNode(true);

    const card = node.querySelector('[data-product-card]');
    const link = node.querySelector('[data-product-link]');
    const image = node.querySelector('[data-product-image]');
    const category = node.querySelector('[data-product-category]');
    const name = node.querySelector('[data-product-name]');
    const price = node.querySelector('[data-product-price]');
    const favBtn = node.querySelector('[data-favorite-btn]');
    const addBtn = node.querySelector('[data-add-to-cart]');

    // data-* en el propio nodo: permite que cart.js / favorites.js
    // lean el id sin tener que recorrer el array de productos otra vez.
    card.dataset.productId = product.id;
    card.dataset.category = product.category;

    link.href = `#producto-${product.id}`;
    image.src = product.image;
    image.alt = product.name;
    category.textContent = product.category;
    name.textContent = product.name;
    price.textContent = formatPrice(product.price);

    favBtn.setAttribute('aria-label', `Añadir ${product.name} a favoritos`);
    favBtn.addEventListener('click', () => {
      window.APEX.events.emit('product:toggle-favorite', { product });
    });

    addBtn.addEventListener('click', () => {
      window.APEX.events.emit('product:add-to-cart', { product });
    });

    return card;
  }

  /**
   * Pinta en el DOM la lista de productos ya filtrada.
   */
  function renderProducts(products) {
    const { $ } = window.APEX.utils;
    const grid = $('#products-grid');
    if (!grid) return;

    grid.innerHTML = ''; // limpia el "Cargando productos…" u el render anterior

    if (products.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'products__loading';
      emptyState.textContent = 'No hay productos en esta categoría todavía.';
      grid.appendChild(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach((product) => {
      const card = buildProductCard(product);
      card.classList.add('reveal'); // animations.js lo revelará al hacer scroll
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);

    // Le dice a animations.js que observe las tarjetas recién insertadas
    window.APEX.events.emit('products:rendered');
  }

  function applyFilter(filter) {
    activeFilter = filter;
    const filtered = filter === 'all'
      ? allProducts
      : allProducts.filter((product) => product.category === filter);
    renderProducts(filtered);
  }

  /**
   * Activa visualmente el chip de filtro seleccionado y desactiva el resto.
   */
  function setActiveChip(clickedChip) {
    const { $$ } = window.APEX.utils;
    $$('.filter-chip').forEach((chip) => chip.classList.remove('is-active'));
    clickedChip.classList.add('is-active');
  }

  function initFilters() {
    const { $, $$ } = window.APEX.utils;
    const filtersContainer = $('#products-filters');
    if (!filtersContainer) return;

    $$('.filter-chip', filtersContainer).forEach((chip) => {
      chip.addEventListener('click', () => {
        setActiveChip(chip);
        applyFilter(chip.dataset.filter);
      });
    });
  }

  async function init() {
    const { $ } = window.APEX.utils;
    const grid = $('#products-grid');

    initFilters();

    try {
      allProducts = await fetchProducts();
      applyFilter(activeFilter);
    } catch (error) {
      console.error('[APEX.products]', error);
      if (grid) {
        grid.innerHTML = '<p class="products__loading">No se pudo cargar el catálogo. Inténtalo de nuevo más tarde.</p>';
      }
    }
  }

  window.APEX = window.APEX || {};
  window.APEX.products = {
    init,
    // Se expone para que cart.js / favorites.js puedan buscar un
    // producto completo por id sin duplicar el catálogo en otro sitio.
    getById: (id) => allProducts.find((product) => String(product.id) === String(id)),
    // Se expone para que search.js pueda filtrar sobre el catálogo
    // ya cargado, sin volver a pedirlo por su cuenta.
    getAll: () => allProducts,
  };
})();
