/**
 * Komunikacija sa Apps Script backendom.
 * - GET za čitanje kataloga
 * - POST sa Content-Type text/plain (Apps Script ne podržava CORS preflight,
 *   a text/plain ga ne izaziva; telo je i dalje JSON)
 *
 * DEMO REŽIM: ako je API_URL prazan, a stranica je učitala demo-data.js (prodavnica, ne admin),
 * katalog i porudžbine rade lokalno u browseru. Ništa se ne šalje i ništa se ne čuva na serveru.
 */
(function () {
  const C = window.KORAK_CONFIG;
  const DEMO = !C.API_URL && typeof window.KORAK_DEMO === 'function';

  async function request(url, options) {
    if (!C.API_URL) {
      return { ok: false, code: 'NO_API', error: 'Prodavnica još nije povezana sa serverom. Upišite API_URL u assets/js/config.js.' };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, C.REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, Object.assign({ signal: ctrl.signal, redirect: 'follow' }, options));
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return {
          ok: false, code: 'BAD_RESPONSE',
          error: 'Server je vratio neočekivan odgovor. Proverite da li je Web App deploy-ovan sa pristupom „Anyone“.'
        };
      }
    } catch (e) {
      return {
        ok: false, code: 'NETWORK', timeout: e.name === 'AbortError',
        error: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.'
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ------------------------------------------------------------
  // Demo backend (samo u browseru, traje dok je tab otvoren)
  // ------------------------------------------------------------

  const demo = DEMO ? (function () {
    const KEY = 'korak.demoState';
    let state;
    try { state = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || !Array.isArray(state.products)) state = { products: window.KORAK_DEMO(), version: 1, seq: 0, keys: {} };
    const save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    const find = function (id) { return state.products.filter(function (p) { return p.id === id; })[0]; };

    return {
      get: async function (params) {
        await wait(250);
        if (params.action !== 'getProducts') return { ok: false, code: 'NO_API', error: 'Nije dostupno u demo režimu.' };
        const version = 'demo-' + state.version;
        if (params.v === version) return { ok: true, version: version, notModified: true };
        return { ok: true, version: version, products: JSON.parse(JSON.stringify(state.products)), shipping: { price: 450, freeOver: 10000 } };
      },
      post: async function (body) {
        await wait(700);
        if (body.action !== 'createOrder') return { ok: false, code: 'NO_API', error: 'Admin panel ne radi u demo režimu. Upišite API_URL u config.js.' };
        if (state.keys[body.idempotencyKey]) return Object.assign({ ok: true, duplicate: true }, state.keys[body.idempotencyKey]);

        const unavailable = [];
        const lines = (body.items || []).map(function (it) {
          const p = find(it.productId);
          const available = p ? Number(p.stock[it.size] || 0) : 0;
          if (!p || available < it.quantity) unavailable.push({ productId: it.productId, size: it.size, requested: it.quantity, available: available, name: p ? p.name : '' });
          return { p: p, it: it };
        });
        if (unavailable.length) {
          return { ok: false, code: 'SOLD_OUT', error: 'Nažalost, ovaj proizvod/veličina je upravo rasprodat.', unavailable: unavailable };
        }
        const items = lines.map(function (l) {
          l.p.stock[l.it.size] -= l.it.quantity;
          return { productId: l.p.id, name: l.p.name, size: l.it.size, quantity: l.it.quantity, price: l.p.price, subtotal: l.p.price * l.it.quantity };
        });
        const subtotal = items.reduce(function (s, i) { return s + i.subtotal; }, 0);
        const shipping = subtotal >= 10000 ? 0 : 450;
        state.seq += 1;
        state.version += 1;
        const summary = { orderId: 'DEMO-' + (1000 + state.seq), subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
        state.keys[body.idempotencyKey] = summary;
        save();
        return Object.assign({ ok: true, duplicate: false, demo: true, version: 'demo-' + state.version, items: items,
          stockUpdates: items.map(function (i) { return { productId: i.productId, size: i.size, quantity: find(i.productId).stock[i.size] }; })
        }, summary);
      }
    };
  })() : null;

  if (DEMO) {
    document.addEventListener('DOMContentLoaded', function () {
      const pill = document.createElement('p');
      pill.className = 'demo-pill';
      pill.textContent = 'Demo režim – porudžbine se ne šalju';
      document.body.appendChild(pill);
    });
  }

  window.KorakApi = {
    isDemo: DEMO,
    get: function (params) {
      if (DEMO) return demo.get(params);
      const qs = new URLSearchParams(params).toString();
      return request(C.API_URL + (C.API_URL.indexOf('?') === -1 ? '?' : '&') + qs, { method: 'GET' });
    },
    post: function (body) {
      if (DEMO) return demo.post(body);
      return request(C.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
    }
  };
})();
