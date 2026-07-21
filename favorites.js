/* ================================================================
   APEX — favorites.js
   Estado de favoritos + panel lateral propio (mismo patrón que
   cart.js). Sincroniza aria-pressed en los botones de corazón de
   las tarjetas de producto. Se registra en window.APEX.favorites.
================================================================ */

(() => {
  'use strict';

  let favorites = []; // [{ id, name, price, image }]
  let drawerEl = null;

  /* ----------------------------------------------------------------
     PERSISTENCIA
  ---------------------------------------------------------------- */
  function loadFromStorage() {
    const { storage } = window.APEX.utils;
    const { STORAGE_KEYS } = window.APEX.config;
    favorites = storage.get(STORAGE_KEYS.FAVORITES, []);
  }

  function persist() {
    const { storage } = window.APEX.utils;
    const { STORAGE_KEYS } = window.APEX.config;
    storage.set(STORAGE_KEYS.FAVORITES, favorites);
  }

  /* ----------------------------------------------------------------
     ESTADO
  ---------------------------------------------------------------- */
  function isFavorite(id) {
    return favorites.some((item) => String(item.id) === String(id));
  }

  function toggleFavorite(product) {
    if (isFavorite(product.id)) {
      favorites = favorites.filter((item) => String(item.id) !== String(product.id));
    } else {
      favorites.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }
    persist();
    renderDrawerContents();
    syncCardButtons();
    notifyChange();
  }

  function removeFavorite(id) {
    favorites = favorites.filter((item) => String(item.id) !== String(id));
    persist();
    renderDrawerContents();
    syncCardButtons();
    notifyChange();
  }

  function getCount() {
    return favorites.length;
  }

  /* ----------------------------------------------------------------
     NOTIFICACIONES (badge + bus de eventos)
  ---------------------------------------------------------------- */
  function notifyChange() {
    const { $ } = window.APEX.utils;
    const badge = $('#favorites-count');
    if (badge) {
      badge.textContent = getCount();
      badge.classList.remove('is-updated');
      void badge.offsetWidth; // fuerza reflow para repetir la animación
      badge.classList.add('is-updated');
    }

    window.APEX.events.emit('favorites:updated', {
      count: getCount(),
      items: favorites,
    });
  }

  /**
   * Recorre las tarjetas de producto visibles en la grid y marca
   * aria-pressed="true" en las que estén en favoritos. Se llama al
   * iniciar y cada vez que products.js vuelve a pintar la grid.
   */
  function syncCardButtons() {
    const { $$ } = window.APEX.utils;
    $$('[data-product-card]').forEach((card) => {
      const favBtn = card.querySelector('[data-favorite-btn]');
      if (!favBtn) return;
      const active = isFavorite(card.dataset.productId);
      favBtn.setAttribute('aria-pressed', String(active));
    });
  }

  /* ----------------------------------------------------------------
     INTERFAZ: DRAWER DE FAVORITOS
     Misma técnica que cart.js: se construye una vez, se repinta
     solo el contenido de la lista cuando cambia el estado.
  ---------------------------------------------------------------- */
  function buildDrawerSkeleton() {
    const drawer = document.createElement('aside');
    drawer.id = 'favorites-drawer';
    drawer.className = 'cart-drawer'; // reutiliza el mismo componente visual que el carrito
    drawer.hidden = true;
    drawer.setAttribute('aria-label', 'Productos favoritos');

    drawer.innerHTML = `
      <div class="cart-drawer__header">
        <h2>Tus favoritos</h2>
        <button type="button" class="cart-drawer__close" aria-label="Cerrar favoritos">&times;</button>
      </div>
      <div class="cart-drawer__list" data-favorites-list></div>
    `;
    // El innerHTML anterior es markup estático propio, sin datos de
    // usuario. Los datos de producto se insertan siempre con
    // textContent en buildFavoriteRow(), nunca aquí.

    document.body.appendChild(drawer);
    return drawer;
  }

  function buildFavoriteRow(item) {
    const { formatPrice } = window.APEX.utils;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.dataset.itemId = item.id;

    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.name;
    image.width = 64;
    image.height = 64;

    const info = document.createElement('div');
    info.className = 'cart-item__info';

    const name = document.createElement('p');
    name.className = 'cart-item__name';
    name.textContent = item.name;

    const price = document.createElement('p');
    price.className = 'cart-item__price';
    price.textContent = formatPrice(item.price);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--secondary';
    addBtn.dataset.action = 'add-to-cart';
    addBtn.textContent = 'Añadir al carrito';
    addBtn.style.marginTop = 'var(--space-2)';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cart-item__remove';
    removeBtn.dataset.action = 'remove';
    removeBtn.setAttribute('aria-label', `Quitar ${item.name} de favoritos`);
    removeBtn.textContent = 'Quitar';

    info.append(name, price, addBtn, removeBtn);
    row.append(image, info);
    return row;
  }

  function renderDrawerContents() {
    if (!drawerEl) return;
    const list = drawerEl.querySelector('[data-favorites-list]');
    list.innerHTML = '';

    if (favorites.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'cart-drawer__empty';
      emptyState.textContent = 'Todavía no has guardado ningún favorito.';
      list.appendChild(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();
    favorites.forEach((item) => fragment.appendChild(buildFavoriteRow(item)));
    list.appendChild(fragment);
  }

  /* ----------------------------------------------------------------
     APERTURA / CIERRE DEL DRAWER (mismo patrón que cart.js)
  ---------------------------------------------------------------- */
  function openDrawer() {
    const { $ } = window.APEX.utils;
    const overlay = $('#overlay');

    drawerEl.hidden = false;
    if (overlay) overlay.hidden = false;

    requestAnimationFrame(() => {
      drawerEl.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
    });

    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const { $ } = window.APEX.utils;
    const overlay = $('#overlay');

    drawerEl.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';

    setTimeout(() => {
      drawerEl.hidden = true;
      if (overlay) overlay.hidden = true;
    }, 250);
  }

  /* ----------------------------------------------------------------
     EVENTOS
  ---------------------------------------------------------------- */
  function bindEvents() {
    const { $ } = window.APEX.utils;

    const favToggle = $('#favorites-toggle');
    if (favToggle) {
      favToggle.addEventListener('click', (event) => {
        event.preventDefault();
        openDrawer();
      });
    }

    drawerEl.querySelector('.cart-drawer__close').addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !drawerEl.hidden) {
        closeDrawer();
      }
    });

    // Delegación de eventos para "Añadir al carrito" y "Quitar"
    drawerEl.querySelector('[data-favorites-list]').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const row = button.closest('.cart-item');
      const itemId = row.dataset.itemId;
      const item = favorites.find((entry) => String(entry.id) === String(itemId));
      if (!item) return;

      if (button.dataset.action === 'remove') {
        removeFavorite(item.id);
      } else if (button.dataset.action === 'add-to-cart') {
        window.APEX.events.emit('product:add-to-cart', { product: item });
      }
    });

    // products.js emite esto al pulsar el corazón de una tarjeta
    window.APEX.events.on('product:toggle-favorite', (event) => {
      toggleFavorite(event.detail.product);
    });

    // products.js emite esto cada vez que repinta la grid (nuevo filtro)
    window.APEX.events.on('products:rendered', syncCardButtons);
  }

  /* ----------------------------------------------------------------
     INIT
  ---------------------------------------------------------------- */
  function init() {
    loadFromStorage();
    drawerEl = buildDrawerSkeleton();
    renderDrawerContents();
    bindEvents();
    syncCardButtons();

    const { $ } = window.APEX.utils;
    const badge = $('#favorites-count');
    if (badge) badge.textContent = getCount();
  }

  window.APEX = window.APEX || {};
  window.APEX.favorites = { init, toggleFavorite, removeFavorite, isFavorite, getCount };
})();
