/**
 * KATALOG
 * - Pri otvaranju sajta odmah se prikazuje katalog iz localStorage (ako postoji),
 *   a u pozadini se šalje JEDAN zahtev sa verzijom. Ako se ništa nije promenilo,
 *   server vraća samo {notModified:true}.
 * - Filteri, sortiranje i pretraga rade isključivo nad podacima u memoriji.
 * - Nema setInterval-a. Ponovna provera samo kada se korisnik vrati na tab
 *   posle REVALIDATE_AFTER_MS, ili posle porudžbine.
 */
(function (K) {
  const KEY = 'korak.catalog.v1';
  const C = window.KORAK_CONFIG;

  const catalog = {
    products: [],
    byId: {},
    version: null,
    shipping: { price: 450, freeOver: 10000 },
    state: 'idle',      // idle | loading | ready | error
    error: null,
    checkedAt: 0,
    _inflight: null,
    _listeners: [],

    onChange: function (fn) { this._listeners.push(fn); },
    _emit: function () { this._listeners.forEach(function (fn) { fn(); }); },

    init: function () {
      const saved = K.storage.get(KEY, null);
      if (saved && Array.isArray(saved.products)) {
        this._set(saved.products, saved.version, saved.shipping);
        this.checkedAt = saved.checkedAt || 0;
        this.state = 'ready';
      }
      this.refresh();

      const self = this;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && Date.now() - self.checkedAt > C.REVALIDATE_AFTER_MS) self.refresh();
      });
    },

    /** Jedan zahtev u letu – ako se pozove više puta, svi čekaju isti odgovor. */
    refresh: function () {
      if (this._inflight) return this._inflight;
      const self = this;
      if (!this.products.length) { this.state = 'loading'; this._emit(); }

      this._inflight = K_API().get({ action: 'getProducts', v: this.products.length && this.version ? this.version : '' })
        .then(function (res) {
          if (res.ok && res.notModified) {
            self.checkedAt = Date.now();
            self.state = 'ready';
            self._persist();
          } else if (res.ok) {
            self._set(res.products, res.version, res.shipping);
            self.checkedAt = Date.now();
            self.state = 'ready';
            self.error = null;
            self._persist();
            self._emit();
          } else {
            self.error = res;
            if (!self.products.length) { self.state = 'error'; self._emit(); }
          }
          return res;
        })
        .finally(function () { self._inflight = null; });
      return this._inflight;
    },

    _set: function (products, version, shipping) {
      this.products = products || [];
      this.version = version;
      if (shipping) this.shipping = shipping;
      const map = {};
      this.products.forEach(function (p) { map[p.id] = p; });
      this.byId = map;
    },

    _persist: function () {
      K.storage.set(KEY, { products: this.products, version: this.version, shipping: this.shipping, checkedAt: this.checkedAt });
    },

    /**
     * Posle porudžbine (ili odbijene porudžbine) server vraća tačno stanje za te veličine.
     * Upisujemo ga odmah, a verziju poništavamo da bi sledeća provera dovukla ceo svež katalog.
     */
    applyStock: function (updates) {
      const self = this;
      (updates || []).forEach(function (u) {
        const p = self.byId[u.productId];
        if (!p) return;
        p.stock[u.size] = u.quantity;
        if (p.sizes.indexOf(Number(u.size)) === -1) {
          p.sizes.push(Number(u.size));
          p.sizes.sort(function (a, b) { return a - b; });
        }
      });
      this.version = 'stale';
      this._persist();
      this._emit();
    },

    get: function (id) { return this.byId[id] || null; },
    qty: function (p, size) { return p && p.stock ? Number(p.stock[size] || 0) : 0; },
    totalQty: function (p) {
      return p && p.stock ? Object.keys(p.stock).reduce(function (s, k) { return s + Number(p.stock[k] || 0); }, 0) : 0;
    },
    availableSizes: function (p) {
      return p.sizes.filter(function (s) { return Number(p.stock[s] || 0) > 0; });
    },
    colors: function () {
      const set = {};
      this.products.forEach(function (p) { set[p.color] = (set[p.color] || 0) + 1; });
      return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'sr'); });
    },
    shippingFor: function (subtotal) {
      return subtotal >= this.shipping.freeOver || subtotal === 0 ? 0 : this.shipping.price;
    }
  };

  function K_API() { return window.KorakApi; }
  K.catalog = catalog;
})(window.K);
