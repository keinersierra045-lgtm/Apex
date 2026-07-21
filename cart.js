/* ================================================================
   APEX — cart.js
   Estado del carrito + interfaz de carrito (drawer lateral).
   El drawer se construye en JS porque index.html no lo incluye
   todavía: así este módulo queda autocontenido y no obliga a
   volver a tocar el HTML base. Se registra en window.APEX.cart.
================================================================ */

(() => {
  'use strict';

  let items = []; // [{ id, name, price, image, quantity }]
  let drawerEl = null;

  /* ----------------------------------------------------------------
     PERSISTENCIA
     Hoy en localStorage; el día del backend, addItem/removeItem/
     updateQuantity pueden llamar a APEX.api.post('/cart', ...) sin
     que el resto del módulo cambie.
  ---------------------------------------------------------------- */
  function loadFromStorage() {
    const { storage, } = window.APEX.utils;
    const { STORAGE_KEYS } = window.APEX.config;
    items = storage.get(STORAGE_KEYS.CART, []);
  }

  function persist() {
    const { storage } = window.APEX.utils;
    const { STORAGE_KEYS } = window.APEX.config;
    storage.set(STORAGE_KEYS.CART, items);
  }

  /* ----------------------------------------------------------------
     OPERACIONES SOBRE EL ESTADO
  ---------------------------------------------------------------- */
  function addItem(product) {
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }
    persist();
    renderDrawerContents();
    notifyChange();
  }

  function removeItem(id) {
    items = items.filter((item) => item.id !== id);
    persist();
    renderDrawerContents();
    notifyChange();
  }

  function updateQuantity(id, quantity) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    item.quantity = quantity;
    persist();
    renderDrawerContents();
    notifyChange();
  }

  function getCount() {
    return items.reduce((total, item) => total + item.quantity, 0);
  }

  function getSubtotal() {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  /* ----------------------------------------------------------------
     NOTIFICACIONES (badge + bus de eventos)
  ---------------------------------------------------------------- */
  function notifyChange() {
    const { $ } = window.APEX.utils;
    const badge = $('#cart-count');
    if (badge) {
      badge.textContent = getCount();
      // Reinicia la animación de "pop" quitando y volviendo a añadir la clase
      badge.classList.remove('is-updated');
      void badge.offsetWidth; // fuerza reflow para poder repetir la animación
      badge.classList.add('is-updated');
    }

    window.APEX.events.emit('cart:updated', {
      count: getCount(),
      subtotal: getSubtotal(),
      items,
    });
  }

  /* ----------------------------------------------------------------
     INTERFAZ: DRAWER LATERAL
     Se construye una única vez y se reutiliza; solo se repinta
     el contenido de la lista cuando cambia el estado.
  ---------------------------------------------------------------- */
  function buildDrawerSkeleton() {
    const drawer = document.createElement('aside');
    drawer.id = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.hidden = true;
    drawer.setAttribute('aria-label', 'Carrito de compras');

    drawer.innerHTML = `
      <div class="cart-drawer__header">
        <h2>Tu carrito</h2>
        <button type="button" class="cart-drawer__close" aria-label="Cerrar carrito">&times;</button>
      </div>
      <div class="cart-drawer__list" data-cart-list></div>
      <div class="cart-drawer__footer">
        <div class="cart-drawer__subtotal">
          <span>Subtotal</span>
          <span data-cart-subtotal>0,00 €</span>
        </div>
        <button type="button" class="btn btn--primary btn--full" data-checkout-btn>
          Finalizar compra
        </button>
      </div>
    `;
    // Nota: el innerHTML de arriba es markup estático controlado por
    // nosotros (no datos de usuario/producto), por lo que no supone
    // riesgo de XSS. El contenido dinámico (nombres, precios) se
    // inserta siempre con textContent, nunca con innerHTML.

    document.body.appendChild(drawer);
    return drawer;
  }

  function buildItemRow(item) {
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

    const quantity = document.createElement('div');
    quantity.className = 'cart-item__quantity';
    quantity.innerHTML = `
      <button type="button" data-action="decrease" aria-label="Reducir cantidad">−</button>
      <span data-quantity-value>${item.quantity}</span>
      <button type="button" data-action="increase" aria-label="Aumentar cantidad">+</button>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cart-item__remove';
    removeBtn.dataset.action = 'remove';
    removeBtn.setAttribute('aria-label', `Quitar ${item.name} del carrito`);
    removeBtn.textContent = 'Quitar';

    info.append(name, price, quantity, removeBtn);
    row.append(image, info);
    return row;
  }

  function renderDrawerContents() {
    if (!drawerEl) return;
    const { formatPrice } = window.APEX.utils;
    const list = drawerEl.querySelector('[data-cart-list]');
    const subtotalEl = drawerEl.querySelector('[data-cart-subtotal]');

    list.innerHTML = '';

    if (items.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'cart-drawer__empty';
      emptyState.textContent = 'Tu carrito está vacío. Añade algo que te encante.';
      list.appendChild(emptyState);
    } else {
      const fragment = document.createDocumentFragment();
      items.forEach((item) => fragment.appendChild(buildItemRow(item)));
      list.appendChild(fragment);
    }

    subtotalEl.textContent = formatPrice(getSubtotal());
  }

  /* ----------------------------------------------------------------
     APERTURA / CIERRE DEL DRAWER
     Mismo patrón que menu.js: quitar [hidden], esperar un frame,
     añadir .is-open para que la transición de animations.css corra.
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

    // Abrir desde el icono del header
    const cartToggle = $('#cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', (event) => {
        event.preventDefault();
        openDrawer();
      });
    }

    // Cerrar con el botón "×" del propio drawer
    drawerEl.querySelector('.cart-drawer__close').addEventListener('click', closeDrawer);

    // Cerrar con Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !drawerEl.hidden) {
        closeDrawer();
      }
    });

    // Delegación de eventos para +/- y "Quitar" dentro de la lista
    drawerEl.querySelector('[data-cart-list]').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const row = button.closest('.cart-item');
      const itemId = row.dataset.itemId;
      const item = items.find((entry) => String(entry.id) === String(itemId));
      if (!item) return;

      switch (button.dataset.action) {
        case 'increase':
          updateQuantity(item.id, item.quantity + 1);
          break;
        case 'decrease':
          updateQuantity(item.id, item.quantity - 1);
          break;
        case 'remove':
          removeItem(item.id);
          break;
      }
    });

    // products.js emite este evento al pulsar "Añadir al carrito"
    window.APEX.events.on('product:add-to-cart', (event) => {
      addItem(event.detail.product);
      openDrawer();
    });
  }

  /* ----------------------------------------------------------------
     INIT
  ---------------------------------------------------------------- */
  function init() {
    loadFromStorage();
    drawerEl = buildDrawerSkeleton();
    renderDrawerContents();
    bindEvents();

    // Refleja en el badge el estado cargado desde localStorage,
    // sin disparar la animación de "pop" en la carga inicial.
    const { $ } = window.APEX.utils;
    const badge = $('#cart-count');
    if (badge) badge.textContent = getCount();
  }

  window.APEX = window.APEX || {};
  window.APEX.cart = { init, addItem, removeItem, updateQuantity, getCount, getSubtotal };
})();
