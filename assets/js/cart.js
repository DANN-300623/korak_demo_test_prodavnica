/**
 * KORPA
 * Čuva se u localStorage (preživi refresh). Čuvaju se samo ID, veličina i količina,
 * plus kopija naziva/cene/slike samo za prikaz dok se katalog ne učita.
 * Cene u obračunu uvek dolaze iz kataloga, a konačnu cenu računa server.
 */
(function (K) {
  const KEY = 'korak.cart.v1';
  const ORDER_KEY = 'korak.orderKey';
  const MAX_PER_LINE = 10;

  const cart = {
    items: [],
    _listeners: [],

    onChange: function (fn) { this._listeners.push(fn); },
    _emit: function () { this._listeners.forEach(function (fn) { fn(); }); },

    load: function () {
      const saved = K.storage.get(KEY, []);
      this.items = Array.isArray(saved) ? saved.filter(function (i) { return i && i.productId && i.size && i.qty > 0; }) : [];
      const self = this;
      // Korpa otvorena u dva taba ostaje ista
      window.addEventListener('storage', function (e) {
        if (e.key === KEY) { self.items = K.storage.get(KEY, []); self._emit(); }
      });
    },

    save: function () { K.storage.set(KEY, this.items); this._emit(); },

    count: function () { return this.items.reduce(function (s, i) { return s + i.qty; }, 0); },

    find: function (productId, size) {
      return this.items.filter(function (i) { return i.productId === productId && i.size === Number(size); })[0];
    },

    maxFor: function (product, size) {
      return Math.min(MAX_PER_LINE, K.catalog.qty(product, size));
    },

    /** Isti proizvod + ista veličina → povećava količinu (ako stanje dozvoljava), ne pravi duplikat. */
    add: function (product, size) {
      size = Number(size);
      const max = this.maxFor(product, size);
      if (max < 1) return { ok: false, reason: 'Ova veličina je rasprodata.' };
      const existing = this.find(product.id, size);
      if (existing) {
        if (existing.qty >= max) {
          return { ok: false, reason: 'U korpi je već sva dostupna količina za veličinu ' + size + '.' };
        }
        existing.qty += 1;
      } else {
        this.items.push({ productId: product.id, size: size, qty: 1, name: product.name, price: product.price, image: product.image });
      }
      this.save();
      return { ok: true };
    },

    setQty: function (productId, size, qty) {
      const item = this.find(productId, size);
      if (!item) return;
      const product = K.catalog.get(productId);
      const max = product ? this.maxFor(product, size) : item.qty;
      item.qty = Math.max(1, Math.min(qty, Math.max(1, max)));
      this.save();
    },

    remove: function (productId, size) {
      this.items = this.items.filter(function (i) { return !(i.productId === productId && i.size === Number(size)); });
      this.save();
    },

    clear: function () {
      this.items = [];
      this.save();
      K.storage.remove(ORDER_KEY, sessionStorage);
    },

    /**
     * Stavke spojene sa katalogom. "problem" označava stavku koja više nije dostupna
     * ili je tražena veća količina od stanja.
     */
    lines: function () {
      const ready = K.catalog.state === 'ready' || K.catalog.products.length > 0;
      return this.items.map(function (item) {
        const product = K.catalog.get(item.productId);
        const available = product ? K.catalog.qty(product, item.size) : 0;
        const price = product ? product.price : item.price;
        let problem = null;
        if (ready && !product) problem = 'Proizvod više nije u ponudi.';
        else if (ready && available === 0) problem = 'Veličina ' + item.size + ' je rasprodata.';
        else if (ready && available < item.qty) problem = 'Na stanju je još samo ' + available + ' kom.';
        return {
          item: item,
          product: product,
          name: product ? product.name : item.name,
          image: product ? product.image : item.image,
          price: price,
          available: available,
          subtotal: price * item.qty,
          problem: problem
        };
      });
    },

    totals: function () {
      const lines = this.lines().filter(function (l) { return !l.problem; });
      const subtotal = lines.reduce(function (s, l) { return s + l.subtotal; }, 0);
      const shipping = K.catalog.shippingFor(subtotal);
      return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping, freeOver: K.catalog.shipping.freeOver };
    },

    hasProblems: function () {
      return this.lines().some(function (l) { return l.problem; });
    },

    /** Stavke koje se šalju serveru – bez cena (server ih ne prihvata od klijenta). */
    payload: function () {
      return this.items.map(function (i) { return { productId: i.productId, size: i.size, quantity: i.qty }; });
    },

    /**
     * Idempotency ključ: isti dok se sadržaj korpe ne promeni.
     * Dupli klik ili ponovni pokušaj posle prekinute veze → server vraća istu porudžbinu.
     */
    orderKey: function () {
      const sig = this.items.map(function (i) { return i.productId + ':' + i.size + ':' + i.qty; }).sort().join('|');
      const saved = K.storage.get(ORDER_KEY, null, sessionStorage);
      if (saved && saved.sig === sig) return saved.key;
      const key = K.uuid();
      K.storage.set(ORDER_KEY, { key: key, sig: sig }, sessionStorage);
      return key;
    }
  };

  K.cart = cart;
})(window.K);
