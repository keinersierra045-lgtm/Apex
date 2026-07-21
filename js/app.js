/* ================================================================
   APEX — app.js
   Punto de entrada y orquestador. No contiene lógica de negocio:
   expone utilidades, un bus de eventos y un cliente API que el
   resto de módulos (menu, search, favorites, cart, products,
   animations) consumen a través del namespace global `APEX`.
================================================================ */

(() => {
  'use strict';

  /* ----------------------------------------------------------------
     0. NAMESPACE GLOBAL
     Cada módulo se registra aquí como APEX.<nombre> = { init() {} }.
     app.js se carga último y arranca todos los que existan.
  ---------------------------------------------------------------- */
  window.APEX = window.APEX || {};

  /* ----------------------------------------------------------------
     1. CONFIGURACIÓN
     Centraliza valores que cambiarán al conectar el backend real
     (Node + Express + PostgreSQL). Ningún otro archivo debe
     "hardcodear" una URL o una clave de storage: todos leen de aquí.
  ---------------------------------------------------------------- */
  const CONFIG = {
    API_BASE_URL: '/api', // ej. futuro: https://api.apex-store.com/v1
    STORAGE_KEYS: {
      CART: 'apex:cart',
      FAVORITES: 'apex:favorites',
    },
    LOCALE: 'es-ES',
    CURRENCY: 'EUR',
  };

  /* ----------------------------------------------------------------
     2. UTILIDADES DOM
  ---------------------------------------------------------------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /**
   * Retrasa la ejecución de una función hasta que dejen de llegar
   * llamadas durante `wait` ms. Se usará en search.js para no
   * lanzar una búsqueda en cada pulsación de tecla.
   */
  function debounce(fn, wait = 250) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), wait);
    };
  }

  /**
   * Formatea un número como precio localizado (ej. 129.99 → "129,99 €").
   */
  function formatPrice(amount) {
    return new Intl.NumberFormat(CONFIG.LOCALE, {
      style: 'currency',
      currency: CONFIG.CURRENCY,
    }).format(amount);
  }

  /* ----------------------------------------------------------------
     3. STORAGE SEGURO
     Envuelve localStorage con try/catch: si el navegador lo bloquea
     (modo privado, cuotas, etc.) la app no debe romperse, solo
     perder persistencia. cart.js y favorites.js usan esto hoy;
     el día que haya backend, se sustituye por APEX.api sin tocar
     la interfaz pública de estos métodos.
  ---------------------------------------------------------------- */
  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        console.warn(`[APEX.storage] No se pudo leer "${key}":`, error);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`[APEX.storage] No se pudo guardar "${key}":`, error);
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`[APEX.storage] No se pudo eliminar "${key}":`, error);
      }
    },
  };

  /* ----------------------------------------------------------------
     4. BUS DE EVENTOS
     Comunicación desacoplada entre módulos. Ejemplo real:
     cart.js hace `APEX.events.emit('cart:updated', { count })`
     y app.js actualiza el badge del header sin que cart.js
     necesite saber que el header existe.
  ---------------------------------------------------------------- */
  const bus = new EventTarget();

  const events = {
    emit(name, detail) {
      bus.dispatchEvent(new CustomEvent(name, { detail }));
    },
    on(name, callback) {
      bus.addEventListener(name, callback);
    },
    off(name, callback) {
      bus.removeEventListener(name, callback);
    },
  };

  /* ----------------------------------------------------------------
     5. CLIENTE API
     Hoy no hay backend: products.js seguirá leyendo data/products.json
     directamente. Este cliente ya queda listo para el día en que
     Express sirva /api/products, /api/cart, /api/orders, etc. —
     solo habrá que apuntar los módulos aquí en vez de a fetch/json.
  ---------------------------------------------------------------- */
  async function request(path, options = {}) {
    const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // envía cookies de sesión cuando exista auth
      ...options,
    });

    if (!response.ok) {
      throw new Error(`[APEX.api] ${response.status} en ${path}`);
    }

    // Algunas respuestas (204 No Content) no traen body.
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json') ? response.json() : null;
  }

  const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  };

  /* ----------------------------------------------------------------
     6. COMPORTAMIENTO GLOBAL DEL HEADER
     Añade una clase cuando el usuario hace scroll, para reforzar
     la separación del header respecto al contenido (sombra sutil).
     La regla visual vive en CSS; aquí solo se conmuta la clase.
  ---------------------------------------------------------------- */
  function initHeaderScroll() {
    const header = $('#site-header');
    if (!header) return;

    const SCROLL_THRESHOLD = 8;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // estado correcto si la página carga ya desplazada
  }

  /* ----------------------------------------------------------------
     7. EXPOSICIÓN PÚBLICA
     El resto de archivos (menu.js, search.js, cart.js, favorites.js,
     products.js, animations.js) leen de aquí: APEX.utils, APEX.events,
     APEX.api, APEX.config.
  ---------------------------------------------------------------- */
  window.APEX.config = CONFIG;
  window.APEX.utils = { $, $$, debounce, formatPrice, storage };
  window.APEX.events = events;
  window.APEX.api = api;

  /* ----------------------------------------------------------------
     8. ARRANQUE
     Se ejecuta al final porque app.js se carga el último. Cada
     módulo ya se ha registrado en window.APEX antes de llegar aquí.
  ---------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();

    const moduleNames = ['menu', 'search', 'favorites', 'cart', 'products', 'animations'];

    moduleNames.forEach((name) => {
      const mod = window.APEX[name];
      if (mod && typeof mod.init === 'function') {
        mod.init();
      } else {
        console.warn(`[APEX] Módulo "${name}" no encontrado o sin init().`);
      }
    });
  });
})();
