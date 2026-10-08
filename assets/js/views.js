/**
 * STRANICE PRODAVNICE
 * Svaka stranica ima render() (HTML) i mount() (povezivanje događaja).
 * update() se poziva kada stigne nov katalog – osvežava samo ono što zavisi od podataka.
 */
(function (K) {
  const esc = K.esc;
  const cat = K.catalog;
  const cart = K.cart;

  // Fotografije za kategorije na početnoj (Pexels, vidi izvori-slika.txt)
  const CATEGORY_IMAGES = {
    'Patike': 'https://images.pexels.com/photos/9660927/pexels-photo-9660927.jpeg',
    'Čizme': 'https://images.pexels.com/photos/9930085/pexels-photo-9930085.jpeg',
    'Sandale': 'https://images.pexels.com/photos/26965808/pexels-photo-26965808.jpeg',
    'Cipele': 'https://images.pexels.com/photos/175689/pexels-photo-175689.jpeg',
    'Papuče': 'https://images.pexels.com/photos/1444417/pexels-photo-1444417.jpeg'
  };
  const HERO_IMAGE = 'https://images.pexels.com/photos/20224157/pexels-photo-20224157.jpeg';

  // ------------------------------------------------------------
  // Zajednički delovi
  // ------------------------------------------------------------

  function stockLabel(p) {
    const total = cat.totalQty(p);
    if (total === 0) return { text: 'Rasprodato', cls: 'is-out' };
    if (total <= 3) return { text: 'Još malo na stanju', cls: 'is-low' };
    return { text: 'Na stanju', cls: 'is-in' };
  }

  function swatch(color) {
    return '<span class="swatch" style="--c:' + (K.COLOR_HEX[color] || '#999') + '"></span>';
  }

  const NEW_DAYS = 14;
  function isNew(p) {
    const t = Date.parse(p.createdAt);
    return !isNaN(t) && Date.now() - t < NEW_DAYS * 86400000;
  }

  function productCard(p, opts) {
    opts = opts || {};
    const s = stockLabel(p);
    const avail = cat.availableSizes(p);
    let flag = '';
    if (s.cls === 'is-out') flag = '<span class="card-flag flag-out">Rasprodato</span>';
    else if (isNew(p)) flag = '<span class="card-flag flag-new">Novo</span>';
    else if (s.cls === 'is-low') flag = '<span class="card-flag flag-low">Još malo</span>';
    return '<article class="card' + (s.cls === 'is-out' ? ' is-soldout' : '') + '">' +
      '<a class="card-link" href="#/proizvod/' + esc(p.id) + '">' +
        '<div class="card-media">' +
          K.imgTag(p.image, p.name, { widths: [300, 450, 640], sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw', eager: opts.eager, w: 400, h: 500 }) +
          flag +
          (avail.length ? '<div class="card-sizes" aria-hidden="true"><span>Na stanju</span>' +
            avail.map(function (x) { return '<b>' + x + '</b>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-row"><h3 class="card-title">' + esc(p.name) + '</h3>' +
            '<span class="card-price">' + K.rsd(p.price) + '</span></div>' +
          '<p class="card-meta">' + swatch(p.color) + esc(p.color) + '<span class="dot" aria-hidden="true"></span>' +
            '<span class="card-cat">' + esc(p.category) + ', ' + esc(p.gender.toLowerCase()) + '</span></p>' +
          (s.cls !== 'is-in' ? '<p class="card-stock ' + s.cls + '">' + s.text + '</p>' : '') +
        '</div>' +
      '</a></article>';
  }

  function skeletonCards(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += '<div class="card is-skeleton" aria-hidden="true"><div class="card-media"></div>' +
        '<div class="card-body"><span class="sk sk-s"></span><span class="sk sk-l"></span><span class="sk sk-m"></span></div></div>';
    }
    return out;
  }

  function loadError() {
    const e = cat.error || {};
    return '<div class="notice notice-error"><p>' + esc(e.error || 'Proizvodi trenutno ne mogu da se učitaju.') + '</p>' +
      (e.code === 'NO_API' ? '' : '<button class="btn btn-secondary" data-action="retry-catalog">Pokušaj ponovo</button>') + '</div>';
  }

  function bindRetry(root) {
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="retry-catalog"]')) cat.refresh();
    });
  }

  // ------------------------------------------------------------
  // POČETNA
  // ------------------------------------------------------------

  // Na koliko se modela odnosi veličina – koristi traka u hero-u
  function modelsWord(n) { return n + ' ' + K.plural(n, 'model', 'modela', 'modela'); }

  // Otkrivanje sekcija pri skrolovanju (bez biblioteke). Bez IntersectionObserver-a sve je odmah vidljivo.
  function reveal(root) {
    const els = root.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  const home = {
    render: function () {
      const sizes = K.SIZES.map(function (s) {
        return '<a class="size-tab" href="#/proizvodi?vel=' + s + '" data-size="' + s + '">' +
          '<span class="size-num">' + s + '</span><span class="size-count" data-size-count="' + s + '">&nbsp;</span></a>';
      }).join('');

      const cats = K.CATEGORIES.map(function (c, i) {
        return '<a class="bento-tile' + (i === 0 ? ' is-big' : '') + '" href="#/proizvodi?kat=' + encodeURIComponent(c) + '">' +
          K.imgTag(CATEGORY_IMAGES[c], c, { widths: [400, 700, 1000], sizes: i === 0 ? '(max-width: 760px) 100vw, 45vw' : '(max-width: 760px) 50vw, 27vw', w: 600, h: 600 }) +
          '<span class="bento-text"><span class="bento-name">' + c + '</span>' +
          '<span class="bento-count" data-cat-count="' + c + '">&nbsp;</span></span>' +
          '<span class="bento-arrow" aria-hidden="true">→</span></a>';
      }).join('');

      return '' +
        '<section class="hero bleed">' +
          '<div class="hero-bg">' +
            K.imgTag(HERO_IMAGE, 'Kožne čizme na stazi prekrivenoj jesenjim lišćem', { widths: [800, 1400, 2000], sizes: '100vw', eager: true, w: 1600, h: 1000 }) +
          '</div>' +
          '<div class="hero-inner">' +
            '<div class="hero-copy">' +
              '<p class="hero-kicker">Obuća za žene i muškarce</p>' +
              '<h1 class="hero-title">Nađi svoj <em>broj.</em></h1>' +
              '<p class="hero-lead">Patike, čizme, sandale, cipele i papuče. Plaćate kuriru tek kad vam donese paket.</p>' +
              '<div class="hero-actions">' +
                '<a class="btn btn-accent btn-lg" href="#/proizvodi">Pogledaj ponudu</a>' +
                '<a class="btn btn-glass btn-lg" href="#/proizvodi?pol=%C5%BDenske">Ženske</a>' +
                '<a class="btn btn-glass btn-lg" href="#/proizvodi?pol=Mu%C5%A1ke">Muške</a>' +
              '</div>' +
            '</div>' +
            '<div class="sizebar">' +
              '<p class="sizebar-label" id="size-strip-label"><strong>Tvoj broj</strong><span>Prikazaćemo samo modele koji su na stanju u njemu.</span></p>' +
              '<nav class="size-strip-row" aria-labelledby="size-strip-label">' + sizes + '</nav>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section reveal">' +
          '<div class="section-head"><h2>Kategorije</h2><a href="#/proizvodi" class="link-more">Sve kategorije</a></div>' +
          '<div class="bento">' + cats + '</div>' +
        '</section>' +

        '<section class="section reveal">' +
          '<div class="section-head"><div><p class="eyebrow">Tek stiglo</p><h2>Novo u ponudi</h2></div><a href="#/proizvodi?sort=novo" class="link-more">Svi noviteti</a></div>' +
          '<div class="grid grid-4" id="home-new">' + skeletonCards(4) + '</div>' +
        '</section>' +

        '<section class="band bleed reveal">' +
          '<div class="band-inner">' +
            '<div class="section-head"><div><p class="eyebrow">Izdvajamo</p><h2>Preporučujemo</h2></div><a href="#/proizvodi" class="link-more">Svi proizvodi</a></div>' +
            '<div class="grid grid-4" id="home-picks">' + skeletonCards(4) + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section howto reveal">' +
          '<div class="howto-intro"><p class="eyebrow">Kupovina bez naloga</p><h2>Poručivanje traje dva minuta.</h2>' +
            '<p class="muted">Dostava je ' + K.rsd(cat.shipping.price) + ', a besplatna od ' + K.rsd(cat.shipping.freeOver) + '. Ako broj ne odgovara, menjamo ga u roku od 14 dana.</p></div>' +
          '<ol class="steps">' +
            '<li><span class="step-n" aria-hidden="true">01</span><h3>Izaberite model i veličinu</h3><p>Nedostupne veličine su precrtane, pa odmah vidite šta može da se poruči.</p></li>' +
            '<li><span class="step-n" aria-hidden="true">02</span><h3>Upišite adresu</h3><p>Bez registracije. Potvrdu porudžbine dobijate na email.</p></li>' +
            '<li><span class="step-n" aria-hidden="true">03</span><h3>Platite kuriru</h3><p>Pouzećem, gotovinom ili karticom, kad paket stigne za 2–4 radna dana.</p></li>' +
          '</ol>' +
        '</section>';
    },

    mount: function (root) { bindRetry(root); reveal(root); this.update(); },

    update: function () {
      const newEl = document.getElementById('home-new');
      const picksEl = document.getElementById('home-picks');
      if (!newEl) return;

      if (!cat.products.length) {
        if (cat.state === 'error') { newEl.innerHTML = loadError(); picksEl.innerHTML = ''; }
        return;
      }

      const inStock = cat.products.filter(function (p) { return cat.totalQty(p) > 0; });
      const newest = inStock.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 4);
      newEl.innerHTML = newest.map(function (p) { return productCard(p); }).join('');

      // Preporuka: po jedan model iz različitih kategorija, naizmenično žensko/muško, onaj sa najviše komada
      const picks = [];
      const used = {};
      ['Ženske', 'Muške', 'Ženske', 'Muške'].forEach(function (g) {
        const best = inStock
          .filter(function (p) { return p.gender === g && !used[p.category] && newest.indexOf(p) === -1; })
          .sort(function (a, b) { return cat.totalQty(b) - cat.totalQty(a); })[0];
        if (best) { picks.push(best); used[best.category] = true; }
      });
      picksEl.innerHTML = picks.map(function (p) { return productCard(p); }).join('');

      K.SIZES.forEach(function (s) {
        const n = cat.products.filter(function (p) { return Number(p.stock[s] || 0) > 0; }).length;
        const el = document.querySelector('[data-size-count="' + s + '"]');
        if (!el) return;
        el.textContent = n;
        el.parentNode.setAttribute('aria-label', 'Veličina ' + s + ', ' + modelsWord(n) + ' na stanju');
      });
      K.CATEGORIES.forEach(function (c) {
        const n = cat.products.filter(function (p) { return p.category === c; }).length;
        const el = document.querySelector('[data-cat-count="' + c + '"]');
        if (el) el.textContent = modelsWord(n);
      });
    }
  };

  // Traka ispod zaglavlja – iznosi dolaze iz kataloga (backend), ne iz koda
  function updateRibbon() {
    const el = document.getElementById('ribbon-shipping');
    if (el) el.textContent = 'Besplatna dostava od ' + K.rsd(cat.shipping.freeOver);
  }
  cat.onChange(updateRibbon);
  updateRibbon();

  // ------------------------------------------------------------
  // PROIZVODI (filteri i sortiranje – sve lokalno)
  // ------------------------------------------------------------

  const SORTS = [
    ['novo', 'Najnovije'],
    ['cena-rastuce', 'Cena: od najniže'],
    ['cena-opadajuce', 'Cena: od najviše'],
    ['naziv', 'Naziv A–Š']
  ];

  function readFilters(query) {
    const list = function (k) { return (query.get(k) || '').split(',').filter(Boolean); };
    return {
      pol: query.get('pol') || '',
      kat: query.get('kat') || '',
      vel: list('vel').map(Number).filter(function (n) { return n > 0; }),
      boja: list('boja'),
      sort: SORTS.some(function (s) { return s[0] === query.get('sort'); }) ? query.get('sort') : 'novo'
    };
  }

  function filtersToQuery(f) {
    const q = new URLSearchParams();
    if (f.pol) q.set('pol', f.pol);
    if (f.kat) q.set('kat', f.kat);
    if (f.vel.length) q.set('vel', f.vel.join(','));
    if (f.boja.length) q.set('boja', f.boja.join(','));
    if (f.sort !== 'novo') q.set('sort', f.sort);
    const s = q.toString();
    return s ? '?' + s : '';
  }

  function matches(p, f, skip) {
    if (skip !== 'pol' && f.pol && p.gender !== f.pol) return false;
    if (skip !== 'kat' && f.kat && p.category !== f.kat) return false;
    if (skip !== 'vel' && f.vel.length && !f.vel.some(function (s) { return Number(p.stock[s] || 0) > 0; })) return false;
    if (skip !== 'boja' && f.boja.length && f.boja.indexOf(p.color) === -1) return false;
    return true;
  }

  function sortProducts(list, sort) {
    const by = {
      'novo': function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); },
      'cena-rastuce': function (a, b) { return a.price - b.price; },
      'cena-opadajuce': function (a, b) { return b.price - a.price; },
      'naziv': function (a, b) { return a.name.localeCompare(b.name, 'sr'); }
    }[sort];
    // Rasprodati modeli uvek na kraju
    return list.slice().sort(function (a, b) {
      const oa = cat.totalQty(a) > 0 ? 0 : 1, ob = cat.totalQty(b) > 0 ? 0 : 1;
      return oa - ob || by(a, b);
    });
  }

  const products = {
    f: null,

    render: function (params, query) {
      this.f = readFilters(query);
      return '' +
        '<div class="page-head"><h1 id="products-title">Proizvodi</h1><p class="muted" id="result-count" aria-live="polite"></p></div>' +
        '<div class="shop-layout">' +
          '<aside class="filters" id="filters" aria-label="Filteri">' +
            '<div class="filters-top"><h2>Filteri</h2><button class="icon-btn" data-action="close-filters" aria-label="Zatvori filtere">✕</button></div>' +
            '<div id="filters-body"></div>' +
            '<div class="filters-bottom"><button class="btn btn-primary btn-block" data-action="close-filters" id="filters-apply">Prikaži proizvode</button></div>' +
          '</aside>' +
          '<div class="filters-backdrop" data-action="close-filters"></div>' +
          '<div class="results">' +
            '<div class="toolbar">' +
              '<button class="btn btn-secondary filters-open" data-action="open-filters">Filteri <span id="filters-badge"></span></button>' +
              '<div class="chips" id="active-chips"></div>' +
              '<label class="sort"><span>Sortiraj</span><select id="sort-select">' +
                SORTS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') +
              '</select></label>' +
            '</div>' +
            '<div class="grid grid-3" id="grid"></div>' +
          '</div>' +
        '</div>';
    },

    mount: function (root) {
      const self = this;
      bindRetry(root);
      document.getElementById('sort-select').value = this.f.sort;

      root.addEventListener('change', function (e) {
        const t = e.target;
        if (t.id === 'sort-select') { self.f.sort = t.value; return self.apply(); }
        const key = t.dataset.filter;
        if (!key) return;
        if (key === 'pol' || key === 'kat') self.f[key] = t.value;
        else {
          const val = key === 'vel' ? Number(t.value) : t.value;
          const arr = self.f[key];
          const i = arr.indexOf(val);
          if (t.checked && i === -1) arr.push(val);
          if (!t.checked && i !== -1) arr.splice(i, 1);
          if (key === 'vel') arr.sort(function (a, b) { return a - b; });
        }
        self.apply(t.id);
      });

      root.addEventListener('click', function (e) {
        const a = e.target.closest('[data-action]');
        if (!a) return;
        const action = a.dataset.action;
        if (action === 'open-filters') toggleDrawer(true);
        if (action === 'close-filters') toggleDrawer(false);
        if (action === 'reset-filters') {
          self.f = { pol: '', kat: '', vel: [], boja: [], sort: self.f.sort };
          self.apply();
        }
        if (action === 'remove-chip') {
          const k = a.dataset.key, v = a.dataset.value;
          if (k === 'pol' || k === 'kat') self.f[k] = '';
          else self.f[k] = self.f[k].filter(function (x) { return String(x) !== v; });
          self.apply();
        }
      });

      document.addEventListener('keydown', escClose);
      this.update();
    },

    unmount: function () {
      document.removeEventListener('keydown', escClose);
      document.body.classList.remove('no-scroll');
    },

    apply: function (focusId) {
      const hash = '#/proizvodi' + filtersToQuery(this.f);
      history.replaceState(null, '', hash);
      this.update(focusId);
    },

    update: function (focusId) {
      const grid = document.getElementById('grid');
      if (!grid) return;
      const f = this.f;
      const titleEl = document.getElementById('products-title');
      titleEl.textContent = f.kat ? (f.pol ? f.pol + ' ' + f.kat.toLowerCase() : f.kat) : (f.pol ? (f.pol === 'Ženske' ? 'Ženska' : 'Muška') + ' obuća' : 'Svi proizvodi');
      document.title = titleEl.textContent + ' – ' + window.KORAK_CONFIG.SHOP_NAME;

      if (!cat.products.length) {
        grid.innerHTML = cat.state === 'error' ? loadError() : skeletonCards(6);
        document.getElementById('filters-body').innerHTML = '';
        return;
      }

      const list = sortProducts(cat.products.filter(function (p) { return matches(p, f); }), f.sort);
      document.getElementById('result-count').textContent = list.length + ' ' + K.plural(list.length, 'model', 'modela', 'modela');
      document.getElementById('filters-apply').textContent = 'Prikaži ' + list.length + ' ' + K.plural(list.length, 'model', 'modela', 'modela');

      grid.innerHTML = list.length
        ? list.map(function (p, i) { return productCard(p, { eager: i < 3 }); }).join('')
        : '<div class="empty"><h2>Nema modela za ove filtere</h2><p>Uklonite neki od filtera ili izaberite drugu veličinu.</p>' +
          '<button class="btn btn-secondary" data-action="reset-filters">Poništi sve filtere</button></div>';

      this.renderFilters();
      this.renderChips();
      if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
    },

    renderFilters: function () {
      const f = this.f;
      const count = function (skip, test) {
        return cat.products.filter(function (p) { return matches(p, f, skip) && test(p); }).length;
      };
      const radio = function (key, value, label, n) {
        const id = 'f-' + key + '-' + (value || 'sve');
        return '<label class="opt' + (n === 0 ? ' is-empty' : '') + '" for="' + id + '">' +
          '<input type="radio" name="f-' + key + '" id="' + id + '" value="' + esc(value) + '" data-filter="' + key + '"' + (f[key] === value ? ' checked' : '') + '>' +
          '<span>' + esc(label) + '</span>' + (n === undefined ? '' : '<span class="opt-n">' + n + '</span>') + '</label>';
      };

      const genders = [['', 'Svi'], ['Ženske', 'Ženske'], ['Muške', 'Muške']];
      const polHtml = '<div class="seg">' + genders.map(function (g) {
        const id = 'f-pol-' + (g[0] || 'svi');
        return '<input type="radio" name="f-pol" id="' + id + '" value="' + g[0] + '" data-filter="pol"' + (f.pol === g[0] ? ' checked' : '') + '>' +
          '<label for="' + id + '">' + g[1] + '</label>';
      }).join('') + '</div>';

      const katHtml = radio('kat', '', 'Sve kategorije', count('kat', function () { return true; })) +
        K.CATEGORIES.map(function (c) { return radio('kat', c, c, count('kat', function (p) { return p.category === c; })); }).join('');

      const velHtml = '<div class="size-grid">' + K.SIZES.map(function (s) {
        const n = count('vel', function (p) { return Number(p.stock[s] || 0) > 0; });
        const id = 'f-vel-' + s;
        return '<input type="checkbox" id="' + id + '" value="' + s + '" data-filter="vel"' + (f.vel.indexOf(s) !== -1 ? ' checked' : '') + '>' +
          '<label for="' + id + '"' + (n === 0 ? ' class="is-empty"' : '') + ' title="' + n + ' ' + K.plural(n, 'model', 'modela', 'modela') + '">' + s + '</label>';
      }).join('') + '</div>';

      const bojaHtml = '<div class="color-list">' + cat.colors().map(function (c) {
        const n = count('boja', function (p) { return p.color === c; });
        const id = 'f-boja-' + c;
        return '<label class="opt' + (n === 0 ? ' is-empty' : '') + '" for="' + esc(id) + '">' +
          '<input type="checkbox" id="' + esc(id) + '" value="' + esc(c) + '" data-filter="boja"' + (f.boja.indexOf(c) !== -1 ? ' checked' : '') + '>' +
          swatch(c) + '<span>' + esc(c) + '</span><span class="opt-n">' + n + '</span></label>';
      }).join('') + '</div>';

      const active = (f.pol ? 1 : 0) + (f.kat ? 1 : 0) + f.vel.length + f.boja.length;
      document.getElementById('filters-badge').textContent = active ? '(' + active + ')' : '';

      document.getElementById('filters-body').innerHTML =
        '<fieldset><legend>Pol</legend>' + polHtml + '</fieldset>' +
        '<fieldset><legend>Kategorija</legend>' + katHtml + '</fieldset>' +
        '<fieldset><legend>Veličina</legend><p class="hint">Prikazuju se modeli koji imaju izabranu veličinu na stanju.</p>' + velHtml + '</fieldset>' +
        '<fieldset><legend>Boja</legend>' + bojaHtml + '</fieldset>' +
        (active ? '<button class="btn btn-link" data-action="reset-filters">Poništi sve filtere</button>' : '');
    },

    renderChips: function () {
      const f = this.f;
      const chip = function (key, value, label) {
        return '<button class="chip" data-action="remove-chip" data-key="' + key + '" data-value="' + esc(value) + '" aria-label="Ukloni filter ' + esc(label) + '">' +
          esc(label) + ' <span aria-hidden="true">✕</span></button>';
      };
      let html = '';
      if (f.pol) html += chip('pol', f.pol, f.pol);
      if (f.kat) html += chip('kat', f.kat, f.kat);
      f.vel.forEach(function (v) { html += chip('vel', v, 'Veličina ' + v); });
      f.boja.forEach(function (b) { html += chip('boja', b, b); });
      document.getElementById('active-chips').innerHTML = html;
    }
  };

  function toggleDrawer(open) {
    const el = document.getElementById('filters');
    if (!el) return;
    el.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
    if (open) { const first = el.querySelector('input, button'); if (first) first.focus(); }
    else { const btn = document.querySelector('.filters-open'); if (btn && getComputedStyle(btn).display !== 'none') btn.focus(); }
  }
  function escClose(e) { if (e.key === 'Escape') toggleDrawer(false); }

  // ------------------------------------------------------------
  // DETALJ PROIZVODA
  // ------------------------------------------------------------

  const detail = {
    id: null,
    size: null,

    render: function (params) {
      if (this.id !== params.id) this.size = null;
      this.id = params.id;
      return '<div id="detail"></div>';
    },

    mount: function (root) {
      const self = this;
      bindRetry(root);
      root.addEventListener('click', function (e) {
        const sizeBtn = e.target.closest('[data-size-pick]');
        if (sizeBtn && !sizeBtn.disabled) {
          self.size = Number(sizeBtn.dataset.sizePick);
          self.update();
          const again = document.querySelector('[data-size-pick="' + self.size + '"]');
          if (again) again.focus();
          return;
        }
        if (e.target.closest('[data-action="add-to-cart"]')) self.add();
      });
      this.update();
    },

    add: function () {
      const p = cat.get(this.id);
      const msg = document.getElementById('size-msg');
      if (!this.size) {
        msg.textContent = 'Izaberite veličinu.';
        msg.className = 'field-msg is-error';
        document.querySelector('.size-picker').classList.add('shake');
        setTimeout(function () { const el = document.querySelector('.size-picker'); if (el) el.classList.remove('shake'); }, 400);
        return;
      }
      const r = cart.add(p, this.size);
      if (!r.ok) {
        msg.textContent = r.reason;
        msg.className = 'field-msg is-error';
        return;
      }
      msg.textContent = 'Dodato u korpu: veličina ' + this.size + '.';
      msg.className = 'field-msg is-ok';
      K.toast(p.name + ', veličina ' + this.size + ' je u korpi.', { href: '#/korpa', label: 'Otvori korpu' });
    },

    update: function () {
      const el = document.getElementById('detail');
      if (!el) return;
      const p = cat.get(this.id);

      if (!p) {
        if (cat.state === 'error' && !cat.products.length) { el.innerHTML = loadError(); return; }
        if (!cat.products.length || cat.state === 'loading') {
          el.innerHTML = '<div class="detail is-skeleton"><div class="detail-media"></div><div class="detail-info"><span class="sk sk-l"></span><span class="sk sk-m"></span></div></div>';
          return;
        }
        el.innerHTML = '<div class="empty"><h1>Proizvod nije pronađen</h1><p>Moguće je da je uklonjen iz ponude.</p><a class="btn btn-primary" href="#/proizvodi">Pogledaj proizvode</a></div>';
        document.title = 'Proizvod nije pronađen – ' + window.KORAK_CONFIG.SHOP_NAME;
        return;
      }

      document.title = p.name + ' – ' + window.KORAK_CONFIG.SHOP_NAME;
      if (this.size && cat.qty(p, this.size) === 0) this.size = null;
      const self = this;
      const inCartAll = function (s) { const i = cart.find(p.id, s); return i ? i.qty : 0; };
      const selectedQty = this.size ? cat.qty(p, this.size) : 0;

      const sizes = p.sizes.map(function (s) {
        const q = cat.qty(p, s);
        return '<button type="button" class="size-btn" data-size-pick="' + s + '" aria-pressed="' + (self.size === s) + '"' +
          (q === 0 ? ' disabled aria-label="Veličina ' + s + ', rasprodato"' : ' aria-label="Veličina ' + s + '"') + '>' + s + '</button>';
      }).join('');

      let sizeNote = '';
      if (this.size) {
        const inCart = inCartAll(this.size);
        sizeNote = selectedQty <= 2 ? 'Poslednj' + (selectedQty === 1 ? 'i komad' : 'a 2 komada') + ' u veličini ' + this.size + '.' : 'Veličina ' + this.size + ' je na stanju.';
        if (inCart) sizeNote += ' U korpi: ' + inCart + ' kom.';
      }

      const related = cat.products
        .filter(function (x) { return x.id !== p.id && x.category === p.category && x.gender === p.gender && cat.totalQty(x) > 0; })
        .slice(0, 4);

      el.innerHTML =
        '<nav class="crumbs" aria-label="Putanja"><a href="#/proizvodi">Proizvodi</a><span aria-hidden="true">/</span>' +
          '<a href="#/proizvodi?pol=' + encodeURIComponent(p.gender) + '&kat=' + encodeURIComponent(p.category) + '">' + esc(p.gender) + ' ' + esc(p.category.toLowerCase()) + '</a></nav>' +
        '<div class="detail">' +
          '<figure class="detail-media">' + K.imgTag(p.image, p.name, { widths: [600, 900, 1200], sizes: '(max-width: 900px) 100vw, 55vw', eager: true, w: 900, h: 1100 }) + '</figure>' +
          '<div class="detail-info">' +
            '<p class="detail-cat">' + esc(p.category) + ', ' + esc(p.gender.toLowerCase()) + '</p>' +
            '<h1 class="detail-title">' + esc(p.name) + '</h1>' +
            '<p class="detail-price">' + K.rsd(p.price) + '</p>' +
            '<div class="size-picker">' +
              '<div class="size-picker-head"><h2 id="size-label">Veličina</h2><span class="muted">EU brojevi</span></div>' +
              '<div class="size-row" role="group" aria-labelledby="size-label">' + sizes + '</div>' +
              '<p id="size-msg" class="field-msg' + (sizeNote ? ' is-note' : '') + '" aria-live="polite">' + esc(sizeNote) + '</p>' +
            '</div>' +
            (cat.totalQty(p) === 0
              ? '<p class="notice">Ovaj model je trenutno rasprodat u svim veličinama.</p>'
              : '<button class="btn btn-primary btn-block btn-lg" data-action="add-to-cart">Dodaj u korpu</button>') +
            '<p class="detail-desc">' + esc(p.description) + '</p>' +
            '<dl class="specs">' +
              '<div><dt>Boja</dt><dd>' + swatch(p.color) + esc(p.color) + '</dd></div>' +
              '<div><dt>Kategorija</dt><dd>' + esc(p.category) + '</dd></div>' +
              '<div><dt>Pol</dt><dd>' + esc(p.gender) + '</dd></div>' +
              '<div><dt>Šifra</dt><dd>' + esc(p.id) + '</dd></div>' +
            '</dl>' +
            '<p class="muted small">Dostava 2–4 radna dana, plaćanje pouzećem. Zamena veličine u roku od 14 dana.</p>' +
          '</div>' +
        '</div>' +
        (related.length ? '<section class="section"><div class="section-head"><h2>Još iz iste kategorije</h2></div>' +
          '<div class="grid grid-4">' + related.map(function (x) { return productCard(x); }).join('') + '</div></section>' : '');
    }
  };

  // ------------------------------------------------------------
  // KORPA
  // ------------------------------------------------------------

  function summaryHtml(t, opts) {
    opts = opts || {};
    const left = t.freeOver - t.subtotal;
    return '<dl class="totals">' +
      '<div><dt>Međuzbir</dt><dd>' + K.rsd(t.subtotal) + '</dd></div>' +
      '<div><dt>Dostava</dt><dd>' + (t.shipping ? K.rsd(t.shipping) : 'Besplatna') + '</dd></div>' +
      '<div class="totals-sum"><dt>Ukupno</dt><dd>' + K.rsd(t.total) + '</dd></div>' +
      '</dl>' +
      (opts.hint && t.shipping && left > 0 ? '<p class="small muted">Još ' + K.rsd(left) + ' do besplatne dostave.</p>' : '');
  }

  const cartView = {
    render: function () { return '<div class="page-head"><h1>Korpa</h1></div><div id="cart"></div>'; },

    mount: function (root) {
      const self = this;
      root.addEventListener('click', function (e) {
        const b = e.target.closest('[data-cart]');
        if (!b) return;
        const id = b.dataset.id, size = Number(b.dataset.size);
        const item = cart.find(id, size);
        if (!item) return;
        if (b.dataset.cart === 'inc') cart.setQty(id, size, item.qty + 1);
        if (b.dataset.cart === 'dec') cart.setQty(id, size, item.qty - 1);
        if (b.dataset.cart === 'remove') cart.remove(id, size);
        if (b.dataset.cart === 'fix') {
          const p = cat.get(id);
          const avail = p ? cat.qty(p, size) : 0;
          if (avail > 0) cart.setQty(id, size, avail); else cart.remove(id, size);
        }
        self.update();
        const again = document.querySelector('[data-cart="' + b.dataset.cart + '"][data-id="' + id + '"][data-size="' + size + '"]');
        if (again) again.focus();
      });
      this.update();
    },

    update: function () {
      const el = document.getElementById('cart');
      if (!el) return;
      if (!cart.items.length) {
        el.innerHTML = '<div class="empty"><h2>Korpa je prazna</h2><p>Dodajte model iz ponude, izaberite veličinu i vratite se ovde.</p>' +
          '<a class="btn btn-primary" href="#/proizvodi">Pogledaj proizvode</a></div>';
        return;
      }
      const lines = cart.lines();
      const t = cart.totals();
      const problems = lines.some(function (l) { return l.problem; });

      el.innerHTML = '<div class="cart-layout">' +
        '<ul class="cart-lines">' + lines.map(function (l) {
          const max = l.product ? Math.min(10, l.available) : l.item.qty;
          return '<li class="cart-line' + (l.problem ? ' has-problem' : '') + '">' +
            '<a class="cart-img" href="#/proizvod/' + esc(l.item.productId) + '">' + K.imgTag(l.image, l.name, { widths: [160, 240], sizes: '96px', w: 96, h: 120 }) + '</a>' +
            '<div class="cart-info">' +
              '<a class="cart-name" href="#/proizvod/' + esc(l.item.productId) + '">' + esc(l.name) + '</a>' +
              '<p class="muted small">Veličina ' + l.item.size + (l.product ? ', ' + esc(l.product.color.toLowerCase()) : '') + '</p>' +
              '<p class="small">' + K.rsd(l.price) + ' po paru</p>' +
              (l.problem ? '<p class="field-msg is-error">' + esc(l.problem) + ' <button class="btn-inline" data-cart="fix" data-id="' + esc(l.item.productId) + '" data-size="' + l.item.size + '">' +
                (l.available > 0 ? 'Smanji na ' + l.available : 'Ukloni') + '</button></p>' : '') +
            '</div>' +
            '<div class="cart-qty">' +
              '<div class="stepper" role="group" aria-label="Količina">' +
                '<button data-cart="dec" data-id="' + esc(l.item.productId) + '" data-size="' + l.item.size + '" aria-label="Smanji količinu"' + (l.item.qty <= 1 ? ' disabled' : '') + '>−</button>' +
                '<span aria-live="polite">' + l.item.qty + '</span>' +
                '<button data-cart="inc" data-id="' + esc(l.item.productId) + '" data-size="' + l.item.size + '" aria-label="Povećaj količinu"' + (l.item.qty >= max ? ' disabled' : '') + '>+</button>' +
              '</div>' +
              '<button class="btn-inline" data-cart="remove" data-id="' + esc(l.item.productId) + '" data-size="' + l.item.size + '">Ukloni</button>' +
            '</div>' +
            '<p class="cart-sub">' + K.rsd(l.subtotal) + '</p>' +
          '</li>';
        }).join('') + '</ul>' +
        '<aside class="summary"><h2>Pregled</h2>' + summaryHtml(t, { hint: true }) +
          (problems ? '<p class="field-msg is-error">Neke stavke više nisu dostupne u traženoj količini. Ispravite ih pre poručivanja.</p>' : '') +
          '<a class="btn btn-primary btn-block btn-lg' + (problems ? ' is-disabled' : '') + '" href="#/porudzbina"' + (problems ? ' aria-disabled="true" tabindex="-1"' : '') + '>Poruči</a>' +
          '<a class="btn btn-link btn-block" href="#/proizvodi">Nastavi kupovinu</a>' +
        '</aside></div>';
    }
  };

  // ------------------------------------------------------------
  // PORUDŽBINA (CHECKOUT)
  // ------------------------------------------------------------

  const FIELDS = [
    { name: 'name', label: 'Ime i prezime', auto: 'name', required: true },
    { name: 'phone', label: 'Telefon', auto: 'tel', type: 'tel', inputmode: 'tel', hint: 'Demo prikaz — nije obavezno.' },
    { name: 'email', label: 'Email', auto: 'email', type: 'email', required: true, hint: 'Na ovu adresu stiže test potvrda.' },
    { name: 'address', label: 'Ulica i broj', auto: 'street-address' },
    { name: 'city', label: 'Grad', auto: 'address-level2', half: true },
    { name: 'postalCode', label: 'Poštanski broj', auto: 'postal-code', inputmode: 'numeric', half: true },
    { name: 'note', label: 'Napomena', textarea: true, hint: 'Npr. sprat, interfon ili vreme kada ste kod kuće.' }
  ];
  const DRAFT_KEY = 'korak.checkoutDraft';

  function validateField(name, v) {
    v = String(v || '').trim();
    // Demo: polja koja nisu obavezna smeju da ostanu prazna (proverava se samo ako je nešto upisano)
    const def = FIELDS.filter(function (x) { return x.name === name; })[0];
    if (!v && def && !def.required) return '';
    switch (name) {
      case 'name': return v.length >= 3 && v.indexOf(' ') !== -1 ? '' : 'Unesite ime i prezime.';
      case 'phone': return /^\+?\d{8,15}$/.test(v.replace(/[\s\-/()]/g, '')) ? '' : 'Unesite ispravan broj telefona.';
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Unesite ispravnu email adresu.';
      case 'address': return v.length >= 4 ? '' : 'Unesite ulicu i broj.';
      case 'city': return v.length >= 2 ? '' : 'Unesite grad.';
      case 'postalCode': return /^\d{5}$/.test(v.replace(/\s/g, '')) ? '' : 'Poštanski broj ima 5 cifara.';
      default: return '';
    }
  }

  const checkout = {
    step: 'form',
    sending: false,

    render: function () {
      this.step = 'form';
      const draft = K.storage.get(DRAFT_KEY, {}, sessionStorage);
      const fields = FIELDS.map(function (f) {
        const val = esc(draft[f.name] || '');
        const attrs = ' id="c-' + f.name + '" name="' + f.name + '"' + (f.auto ? ' autocomplete="' + f.auto + '"' : '') +
          (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + (f.required ? ' required aria-required="true"' : '') +
          ' aria-describedby="m-' + f.name + '"';
        return '<div class="field' + (f.half ? ' field-half' : '') + '">' +
          '<label for="c-' + f.name + '">' + f.label + (f.required ? '' : ' <span class="muted">(nije obavezno)</span>') + '</label>' +
          (f.textarea ? '<textarea rows="3"' + attrs + ' maxlength="500">' + val + '</textarea>'
            : '<input type="' + (f.type || 'text') + '"' + attrs + ' value="' + val + '">') +
          '<p class="field-msg" id="m-' + f.name + '">' + (f.hint ? esc(f.hint) : '') + '</p></div>';
      }).join('');

      return '<div class="page-head"><h1>Porudžbina</h1></div>' +
        '<div class="demo-notice">Ovo je demo prikaz — test verzija kupovine. Porudžbina se stvarno ne šalje, pa nije potrebno da unosite tačne podatke o dostavi. Samo upišite ime i email na koji možemo da Vam odgovorimo, da vidite kako sistem radi.</div>' +
        '<div class="checkout-layout">' +
          '<div class="checkout-main">' +
            '<div id="checkout-alert"></div>' +
            '<form id="checkout-form" novalidate>' +
              '<h2 class="step-title">Podaci za dostavu</h2>' +
              '<div class="field-grid">' + fields + '</div>' +
              '<div class="pay-note"><h3>Plaćanje pouzećem</h3><p>Plaćate kuriru pri preuzimanju paketa, gotovinom ili karticom.</p></div>' +
              '<button type="submit" class="btn btn-primary btn-lg">Nastavi na pregled porudžbine</button>' +
            '</form>' +
            '<section id="review" hidden></section>' +
          '</div>' +
          '<aside class="summary" id="checkout-summary"></aside>' +
        '</div>';
    },

    mount: function (root) {
      const self = this;
      if (!cart.items.length) { location.hash = '#/korpa'; return; }
      const form = document.getElementById('checkout-form');

      form.addEventListener('input', function (e) {
        const draft = K.storage.get(DRAFT_KEY, {}, sessionStorage);
        draft[e.target.name] = e.target.value;
        K.storage.set(DRAFT_KEY, draft, sessionStorage);
        if (e.target.getAttribute('aria-invalid') === 'true') self.checkField(e.target.name);
      });
      form.addEventListener('focusout', function (e) {
        if (e.target.name && e.target.value) self.checkField(e.target.name);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (self.validateAll()) self.showReview();
      });
      root.addEventListener('click', function (e) {
        const a = e.target.closest('[data-action]');
        if (!a) return;
        if (a.dataset.action === 'edit-details') self.showForm();
        if (a.dataset.action === 'confirm-order') self.submit(a);
      });
      this.update();
    },

    checkField: function (name) {
      const input = document.getElementById('c-' + name);
      const msg = document.getElementById('m-' + name);
      const f = FIELDS.filter(function (x) { return x.name === name; })[0];
      const err = validateField(name, input.value);
      input.setAttribute('aria-invalid', err ? 'true' : 'false');
      msg.textContent = err || (f.hint || '');
      msg.className = 'field-msg' + (err ? ' is-error' : '');
      return !err;
    },

    validateAll: function () {
      const self = this;
      let firstBad = null;
      FIELDS.forEach(function (f) {
        if (!self.checkField(f.name) && !firstBad) firstBad = f.name;
      });
      if (firstBad) { document.getElementById('c-' + firstBad).focus(); return false; }
      return true;
    },

    data: function () {
      const out = {};
      FIELDS.forEach(function (f) { out[f.name] = document.getElementById('c-' + f.name).value.trim(); });
      return out;
    },

    showForm: function (focusField) {
      this.step = 'form';
      document.getElementById('checkout-form').hidden = false;
      document.getElementById('review').hidden = true;
      const el = document.getElementById('c-' + (focusField || 'name'));
      if (el) el.focus();
    },

    showReview: function () {
      if (cart.hasProblems()) {
        this.alert('Neke stavke u korpi više nisu dostupne. <a href="#/korpa">Ispravite korpu</a> pa nastavite.');
        return;
      }
      this.step = 'review';
      const d = this.data();
      const lines = cart.lines();
      const t = cart.totals();
      const review = document.getElementById('review');
      review.innerHTML =
        '<h2 class="step-title" tabindex="-1" id="review-title">Proverite porudžbinu</h2>' +
        '<div class="review-block"><h3>Dostava na adresu</h3>' +
          '<p>' + esc(d.name) + '<br>' + esc(d.address) + '<br>' + esc(d.postalCode) + ' ' + esc(d.city) + '</p>' +
          '<p>' + esc(d.phone) + '<br>' + esc(d.email) + '</p>' +
          (d.note ? '<p class="muted">Napomena: ' + esc(d.note) + '</p>' : '') +
          '<button class="btn-inline" data-action="edit-details">Izmeni podatke</button></div>' +
        '<div class="review-block"><h3>Artikli</h3><ul class="review-lines">' + lines.map(function (l) {
          return '<li><span>' + esc(l.name) + ', vel. ' + l.item.size + (l.item.qty > 1 ? ' × ' + l.item.qty : '') + '</span><span>' + K.rsd(l.subtotal) + '</span></li>';
        }).join('') + '</ul>' + summaryHtml(t) + '<p class="small muted">Plaćanje pouzećem, kuriru pri preuzimanju.</p></div>' +
        '<label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;font-weight:400;margin-bottom:14px;">' +
          '<input type="checkbox" id="privacyConsent" required style="margin-top:3px;flex-shrink:0;width:auto;">' +
          '<span>Slažem se sa <a href="demo-privatnost.html" target="_blank">Politikom privatnosti</a> — email/podaci se koriste isključivo za obradu ove test-porudžbine, ni u koje druge svrhe.</span>' +
        '</label>' +
        '<button class="btn btn-primary btn-lg btn-block" data-action="confirm-order" id="confirm-btn">Potvrdi porudžbinu</button>' +
        '<p class="small muted center">Potvrdom prihvatate da vas kontaktiramo radi isporuke.</p>';
      document.getElementById('checkout-form').hidden = true;
      review.hidden = false;
      document.getElementById('checkout-alert').innerHTML = '';
      document.getElementById('review-title').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    alert: function (html, kind) {
      const el = document.getElementById('checkout-alert');
      el.innerHTML = '<div class="notice ' + (kind === 'info' ? '' : 'notice-error') + '" role="alert">' + html + '</div>';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    submit: async function (btn) {
      if (this.sending) return; // dupli klik
      const consentEl = document.getElementById('privacyConsent');
      if (consentEl && !consentEl.checked) {
        this.alert('Molimo prihvatite Politiku privatnosti da biste nastavili.');
        return;
      }
      if (cart.hasProblems()) {
        this.alert('Neke stavke u korpi više nisu dostupne. <a href="#/korpa">Ispravite korpu</a> pa nastavite.');
        return;
      }
      this.sending = true;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = 'Šaljem porudžbinu…';

      const customer = this.data();
      customer.phone = customer.phone.replace(/[\s\-/()]/g, '');
      const res = await window.KorakApi.post({
        action: 'createOrder',
        idempotencyKey: cart.orderKey(),
        customer: customer,
        items: cart.payload()
      });

      this.sending = false;
      if (!document.getElementById('confirm-btn')) return; // korisnik je u međuvremenu otišao sa stranice

      if (res.ok) {
        const lines = cart.lines();
        K.storage.set('korak.lastOrder', {
          orderId: res.orderId, total: res.total, shipping: res.shipping, subtotal: res.subtotal, email: customer.email,
          items: (res.items || []).map(function (i) { return { name: i.name, size: i.size, quantity: i.quantity, subtotal: i.subtotal }; }),
          image: lines[0] && lines[0].image
        }, sessionStorage);
        if (res.stockUpdates) cat.applyStock(res.stockUpdates);
        cart.clear();
        K.storage.remove(DRAFT_KEY, sessionStorage);
        location.hash = '#/potvrda/' + encodeURIComponent(res.orderId);
        cat.refresh(); // svež katalog u pozadini (i tuđe kupovine u međuvremenu)
        return;
      }

      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = 'Potvrdi porudžbinu';

      if (res.code === 'SOLD_OUT') {
        cat.applyStock((res.unavailable || []).map(function (u) { return { productId: u.productId, size: u.size, quantity: u.available }; }));
        const list = (res.unavailable || []).map(function (u) {
          const p = cat.get(u.productId);
          return '<li>' + esc(p ? p.name : u.name || u.productId) + ', veličina ' + u.size +
            (u.available > 0 ? ' – na stanju još ' + u.available + ' kom.' : ' – više nema na stanju') + '</li>';
        }).join('');
        this.alert('<p><strong>' + esc(res.error) + '</strong></p><ul>' + list + '</ul>' +
          '<p>Porudžbina nije poslata i ništa nije naplaćeno. Izmenite korpu i pokušajte ponovo.</p>' +
          '<a class="btn btn-primary" href="#/korpa">Izmeni korpu</a>');
        // Stari pregled više nije tačan – sklanja se, da kupac ne bi ponovo slao istu korpu
        const review = document.getElementById('review');
        if (review) { review.hidden = true; review.innerHTML = ''; }
        this.update();
        return;
      }
      if (res.code === 'VALIDATION' && res.field) {
        this.showForm(res.field);
        const msg = document.getElementById('m-' + res.field);
        if (msg) { msg.textContent = res.error; msg.className = 'field-msg is-error'; }
        document.getElementById('c-' + res.field).setAttribute('aria-invalid', 'true');
        return;
      }
      if (res.code === 'NETWORK') {
        this.alert(res.timeout
          ? 'Server nije odgovorio na vreme. Pritisnite „Potvrdi porudžbinu“ ponovo – ista porudžbina neće biti poslata dvaput.'
          : esc(res.error) + ' Kada se veza vrati, pritisnite ponovo – porudžbina neće biti duplirana.');
        return;
      }
      this.alert(esc(res.error || 'Porudžbina nije poslata. Pokušajte ponovo.'));
    },

    update: function () {
      const el = document.getElementById('checkout-summary');
      if (!el) return;
      if (!cart.items.length && !this.sending) return;
      const lines = cart.lines();
      el.innerHTML = '<h2>Vaša korpa</h2><ul class="mini-lines">' + lines.map(function (l) {
        return '<li' + (l.problem ? ' class="has-problem"' : '') + '>' + K.imgTag(l.image, '', { widths: [120, 160], sizes: '56px', w: 56, h: 70 }) +
          '<div><p>' + esc(l.name) + '</p><p class="muted small">Vel. ' + l.item.size + (l.item.qty > 1 ? ', ' + l.item.qty + ' kom.' : '') + '</p>' +
          (l.problem ? '<p class="field-msg is-error">' + esc(l.problem) + '</p>' : '') + '</div>' +
          '<span>' + K.rsd(l.subtotal) + '</span></li>';
      }).join('') + '</ul>' + summaryHtml(cart.totals(), { hint: true }) + '<a class="btn btn-link" href="#/korpa">Izmeni korpu</a>';
    }
  };

  // ------------------------------------------------------------
  // POTVRDA
  // ------------------------------------------------------------

  const confirmation = {
    render: function (params) {
      const o = K.storage.get('korak.lastOrder', null, sessionStorage);
      const id = params.id;
      const known = o && o.orderId === id;
      return '<div class="confirm">' +
        '<p class="confirm-kicker">Porudžbina je primljena</p>' +
        '<h1 class="confirm-number">' + esc(id) + '</h1>' +
        (/^DEMO-/.test(id)
          ? '<p class="notice">Ovo je demo porudžbina. Prodavnica još nije povezana sa serverom, pa porudžbina nije sačuvana i mejl nije poslat.</p>'
          : '<p class="confirm-lead">Sačuvajte ovaj broj. ' + (known ? 'Potvrdu smo poslali na ' + esc(o.email) + '. ' : '') +
            'Javićemo vam se telefonom pre slanja paketa.</p>') +
        (known ? '<div class="review-block"><ul class="review-lines">' + o.items.map(function (i) {
          return '<li><span>' + esc(i.name) + ', vel. ' + i.size + (i.quantity > 1 ? ' × ' + i.quantity : '') + '</span><span>' + K.rsd(i.subtotal) + '</span></li>';
        }).join('') + '</ul>' + summaryHtml({ subtotal: o.subtotal, shipping: o.shipping, total: o.total, freeOver: 0 }) +
          '<p class="small muted">Iznos plaćate kuriru pri preuzimanju.</p></div>' : '') +
        '<a class="btn btn-primary" href="#/proizvodi">Nastavi kupovinu</a></div>';
    },
    mount: function () {}
  };

  const notFound = {
    render: function () {
      return '<div class="empty"><h1>Stranica ne postoji</h1><p>Link je možda zastareo.</p><a class="btn btn-primary" href="#/">Na početnu</a></div>';
    },
    mount: function () {}
  };

  K.views = { home: home, products: products, detail: detail, cart: cartView, checkout: checkout, confirmation: confirmation, notFound: notFound };
})(window.K);
