/**
 * POKRETANJE I RUTIRANJE
 * Hash ruter (#/proizvodi, #/proizvod/SH001, #/korpa ...) – radi na svakom statičkom hostingu
 * bez podešavanja servera, i kada se index.html otvori direktno sa diska.
 */
(function (K) {
  const main = document.getElementById('main');
  let current = null;

  const ROUTES = [
    [/^\/?$/, 'home'],
    [/^\/proizvodi$/, 'products'],
    [/^\/proizvod\/([A-Za-z0-9_-]+)$/, 'detail', ['id']],
    [/^\/korpa$/, 'cart'],
    [/^\/porudzbina$/, 'checkout'],
    [/^\/potvrda\/([A-Za-z0-9_-]+)$/, 'confirmation', ['id']]
  ];

  const TITLES = { home: null, cart: 'Korpa', checkout: 'Porudžbina', confirmation: 'Porudžbina primljena', notFound: 'Stranica ne postoji' };

  function parse() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const qIndex = raw.indexOf('?');
    const path = qIndex === -1 ? raw : raw.slice(0, qIndex);
    const query = new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1));
    for (let i = 0; i < ROUTES.length; i++) {
      const m = ROUTES[i][0].exec(path);
      if (m) {
        const params = {};
        (ROUTES[i][2] || []).forEach(function (name, j) { params[name] = m[j + 1]; });
        return { name: ROUTES[i][1], params: params, query: query };
      }
    }
    return { name: 'notFound', params: {}, query: query };
  }

  function navigate() {
    const route = parse();
    const view = K.views[route.name];
    if (current && current.view.unmount) current.view.unmount();

    // Svaka stranica dobija nov kontejner → stari event listeneri nestaju zajedno sa njim
    const root = document.createElement('div');
    root.className = 'view view-' + route.name;
    root.innerHTML = view.render(route.params, route.query);
    main.replaceChildren(root);

    const shop = window.KORAK_CONFIG.SHOP_NAME;
    const t = TITLES[route.name];
    if (route.name === 'home') document.title = shop + ' – obuća za žene i muškarce';
    else if (t) document.title = t + ' – ' + shop;

    current = { name: route.name, view: view, root: root };
    view.mount(root, route.params, route.query);
    highlightNav(route);
    window.scrollTo(0, 0);
    // Fokus na naslov stranice zbog čitača ekrana (bez skrolovanja)
    const h1 = root.querySelector('h1');
    if (h1 && route.name !== 'home') { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  function highlightNav(route) {
    const pol = route.name === 'products' ? route.query.get('pol') : null;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      const key = a.dataset.nav;
      const on = (key === 'home' && route.name === 'home') ||
        (key === 'all' && route.name === 'products' && !pol) ||
        (key === pol);
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function updateBadge() {
    const n = K.cart.count();
    const badge = document.getElementById('cart-count');
    badge.textContent = n;
    badge.hidden = n === 0;
    document.getElementById('cart-link').setAttribute('aria-label', 'Korpa, ' + n + ' ' + K.plural(n, 'artikal', 'artikla', 'artikala'));
  }

  // Nov katalog stigao → osveži samo ono što je na ekranu
  K.catalog.onChange(function () {
    if (current && current.view.update) current.view.update();
  });
  K.cart.onChange(function () {
    updateBadge();
    if (current && (current.name === 'cart' || current.name === 'checkout') && current.view.update) current.view.update();
  });

  window.addEventListener('hashchange', navigate);

  document.getElementById('year').textContent = new Date().getFullYear();
  K.cart.load();
  updateBadge();
  K.catalog.init();  // katalog kreće ODMAH, bez obzira na kojoj stranici je kupac ušao
  navigate();
})(window.K);
