/**
 * KORAK – ADMIN PANEL
 * - Pri prijavi (i na dugme "Osveži") jedan poziv: adminGetData → proizvodi, zalihe, porudžbine.
 * - Posle svake izmene server vraća izmenjeni podatak i ažurira se samo on – bez ponovnog učitavanja svega.
 * - Klikovi na +/− u stanju se skupljaju 0,7 s i šalju kao jedna relativna izmena (delta),
 *   pa se ne poništava komad koji je kupac upravo kupio.
 */
(function () {
  const API = window.KorakApi;
  const TOKEN_KEY = 'korak.adminToken';
  const STATUSES = ['Nova', 'Prihvaćena', 'U obradi', 'Poslata', 'Završena', 'Otkazana'];
  const CATEGORIES = ['Patike', 'Čizme', 'Sandale', 'Cipele', 'Papuče'];
  const GENDERS = ['Ženske', 'Muške'];
  const NEW_SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
  const ALL_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48];

  const S = {
    token: sessionStorage.getItem(TOKEN_KEY),
    products: [],
    orders: [],
    tab: 'orders',
    orderStatus: 'Aktivne',
    orderQuery: '',
    prodQuery: '', prodCat: '', prodGender: '', prodStatus: 'prodaja',
    stockQuery: '', stockOnlyOut: false, stockCat: '',
    pending: {},   // productId → { size: delta }
    timers: {}
  };

  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const rsd = function (n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' din'; };
  const date = function (iso) {
    const d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    const z = function (n) { return ('0' + n).slice(-2); };
    return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear() + '. ' + z(d.getHours()) + ':' + z(d.getMinutes());
  };
  const thumb = function (url) {
    if (!url) return '';
    return url.indexOf('images.pexels.com') !== -1 ? url.replace(/([?&])w=\d+/, '$1w=160') : url;
  };
  const totalQty = function (p) { return Object.keys(p.stock || {}).reduce(function (s, k) { return s + Number(p.stock[k] || 0); }, 0); };
  const soldOutSizes = function (p) { return (p.sizes || []).filter(function (s) { return Number(p.stock[s] || 0) === 0; }); };
  const productById = function (id) { return S.products.filter(function (p) { return p.id === id; })[0]; };

  let toastTimer;
  function toast(msg, isError) {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast is-visible' + (isError ? ' is-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, isError ? 6000 : 3000);
  }

  // Slika koja ne radi → neutralna zamena
  document.addEventListener('error', function (e) {
    const el = e.target;
    if (el.tagName === 'IMG' && !el.dataset.fb) { el.dataset.fb = '1'; el.removeAttribute('src'); el.classList.add('img-missing'); }
  }, true);

  // ------------------------------------------------------------
  // API + prijava
  // ------------------------------------------------------------

  async function call(action, data) {
    const res = await API.post(Object.assign({ action: action, token: S.token }, data || {}));
    if (!res.ok && res.code === 'AUTH') {
      showLogin('Sesija je istekla. Prijavite se ponovo.');
    }
    return res;
  }

  function showLogin(msg) {
    S.token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    $('app').hidden = true;
    $('login-screen').hidden = false;
    $('login-msg').textContent = msg || '';
    closeDialog();
    setTimeout(function () { $('password').focus(); }, 0);
  }

  $('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = $('login-btn');
    const pw = $('password').value;
    if (!pw) { $('login-msg').textContent = 'Unesite lozinku.'; return; }
    btn.disabled = true; btn.textContent = 'Prijavljujem…';
    const res = await API.post({ action: 'adminLogin', password: pw });
    btn.disabled = false; btn.textContent = 'Prijavi se';
    if (!res.ok) { $('login-msg').textContent = res.error; $('password').select(); return; }
    S.token = res.token;
    sessionStorage.setItem(TOKEN_KEY, res.token);
    $('password').value = '';
    load();
  });

  $('logout-btn').addEventListener('click', async function () {
    call('adminLogout');
    showLogin('Odjavljeni ste.');
  });

  $('reload-btn').addEventListener('click', function () { load(true); });

  async function load(manual) {
    $('login-screen').hidden = true;
    $('app').hidden = false;
    if (!S.products.length) $('panel').innerHTML = '<p class="loading">Učitavam podatke…</p>';
    const btn = $('reload-btn');
    btn.disabled = true;
    const res = await call('adminGetData');
    btn.disabled = false;
    if (!res.ok) {
      if (res.code !== 'AUTH') $('panel').innerHTML = '<div class="notice notice-error"><p>' + esc(res.error) + '</p><button class="btn" id="retry">Pokušaj ponovo</button></div>';
      const r = $('retry'); if (r) r.onclick = function () { load(); };
      return;
    }
    S.products = res.products;
    S.orders = res.orders;
    render();
    if (manual) toast('Podaci su osveženi.');
  }

  // ------------------------------------------------------------
  // Tabovi
  // ------------------------------------------------------------

  document.querySelector('.tabs').addEventListener('click', function (e) {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    S.tab = b.dataset.tab;
    render();
  });

  function render() {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      const on = b.dataset.tab === S.tab;
      b.setAttribute('aria-selected', on);
      b.classList.toggle('is-active', on);
    });
    const newCount = S.orders.filter(function (o) { return o.status === 'Nova'; }).length;
    $('n-orders').textContent = newCount ? newCount + ' nov' + (newCount === 1 ? 'a' : 'e') : '';
    const outCount = S.products.filter(function (p) { return p.status !== 'obrisan' && soldOutSizes(p).length; }).length;
    $('n-stock').textContent = outCount ? outCount : '';
    $('n-stock').title = outCount + ' modela ima bar jednu rasprodatu veličinu';

    if (S.tab === 'orders') renderOrders();
    if (S.tab === 'products') renderProducts();
    if (S.tab === 'stock') renderStock();
  }

  // ------------------------------------------------------------
  // PORUDŽBINE
  // ------------------------------------------------------------

  function orderMatches(o) {
    if (S.orderStatus === 'Aktivne' && (o.status === 'Završena' || o.status === 'Otkazana')) return false;
    if (S.orderStatus !== 'Aktivne' && S.orderStatus !== 'Sve' && o.status !== S.orderStatus) return false;
    const q = S.orderQuery.trim().toLowerCase();
    if (!q) return true;
    return [o.orderId, o.customer.name, o.customer.phone, o.customer.email, o.customer.city].join(' ').toLowerCase().indexOf(q) !== -1;
  }

  function badge(status) {
    const cls = { 'Nova': 'b-new', 'Prihvaćena': 'b-acc', 'U obradi': 'b-proc', 'Poslata': 'b-sent', 'Završena': 'b-done', 'Otkazana': 'b-cancel' }[status] || '';
    return '<span class="badge ' + cls + '">' + esc(status) + '</span>';
  }

  function renderOrders() {
    const filters = ['Aktivne', 'Sve'].concat(STATUSES);
    const countFor = function (f) {
      return S.orders.filter(function (o) {
        if (f === 'Sve') return true;
        if (f === 'Aktivne') return o.status !== 'Završena' && o.status !== 'Otkazana';
        return o.status === f;
      }).length;
    };
    const list = S.orders.filter(orderMatches);

    $('panel').innerHTML =
      '<div class="head"><h1>Porudžbine</h1><p class="muted">' + S.orders.length + ' ukupno</p></div>' +
      '<div class="toolbar">' +
        '<div class="seg-chips" role="group" aria-label="Filter po statusu">' + filters.map(function (f) {
          return '<button class="fchip' + (S.orderStatus === f ? ' is-on' : '') + '" data-ostatus="' + esc(f) + '" aria-pressed="' + (S.orderStatus === f) + '">' +
            esc(f) + ' <span>' + countFor(f) + '</span></button>';
        }).join('') + '</div>' +
        '<input type="search" id="order-q" class="search" placeholder="Broj, ime, telefon, grad…" value="' + esc(S.orderQuery) + '" aria-label="Pretraga porudžbina">' +
      '</div>' +
      (list.length ? '<div class="table orders-table" role="table" aria-label="Porudžbine">' +
        '<div class="tr th" role="row"><span role="columnheader">Broj</span><span role="columnheader">Datum</span><span role="columnheader">Kupac</span><span role="columnheader">Artikli</span><span role="columnheader" class="num">Ukupno</span><span role="columnheader">Status</span></div>' +
        list.map(function (o) {
          const pcs = o.items.reduce(function (s, i) { return s + i.quantity; }, 0);
          return '<button class="tr row-btn" role="row" data-order="' + esc(o.orderId) + '">' +
            '<span class="strong">' + esc(o.orderId) + '</span>' +
            '<span class="muted">' + date(o.date) + '</span>' +
            '<span>' + esc(o.customer.name) + '<br><span class="muted small">' + esc(o.customer.city) + '</span></span>' +
            '<span class="muted">' + pcs + ' kom.</span>' +
            '<span class="num strong">' + rsd(o.total) + '</span>' +
            '<span>' + badge(o.status) + '</span></button>';
        }).join('') + '</div>'
        : '<div class="empty"><p>' + (S.orders.length ? 'Nema porudžbina za ovaj filter.' : 'Još nema porudžbina. Kada kupac poruči, pojaviće se ovde posle klika na „Osveži”.') + '</p></div>');

    $('panel').querySelectorAll('[data-ostatus]').forEach(function (b) {
      b.onclick = function () { S.orderStatus = b.dataset.ostatus; renderOrders(); };
    });
    const q = $('order-q');
    q.oninput = function () {
      S.orderQuery = q.value;
      const pos = q.selectionStart;
      renderOrders();
      const nq = $('order-q'); nq.focus(); nq.setSelectionRange(pos, pos);
    };
    $('panel').querySelectorAll('[data-order]').forEach(function (b) {
      b.onclick = function () { openOrder(b.dataset.order); };
    });
  }

  function openOrder(id) {
    const o = S.orders.filter(function (x) { return x.orderId === id; })[0];
    if (!o) return;
    const c = o.customer;
    const final = o.status === 'Otkazana';
    openDialog(
      '<div class="dlg-head"><h2 id="dlg-title">Porudžbina ' + esc(o.orderId) + '</h2>' + badge(o.status) + '</div>' +
      '<p class="muted">' + date(o.date) + '</p>' +
      '<div class="dlg-cols">' +
        '<section><h3>Kupac</h3><p>' + esc(c.name) + '<br><a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a><br>' +
          '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></p></section>' +
        '<section><h3>Adresa za dostavu</h3><p>' + esc(c.address) + '<br>' + esc(c.postalCode) + ' ' + esc(c.city) + '</p></section>' +
      '</div>' +
      (c.note ? '<section class="note"><h3>Napomena kupca</h3><p>' + esc(c.note) + '</p></section>' : '') +
      '<section><h3>Artikli</h3><table class="items"><thead><tr><th>Proizvod</th><th>Vel.</th><th class="num">Kom.</th><th class="num">Iznos</th></tr></thead><tbody>' +
        o.items.map(function (i) {
          return '<tr><td>' + esc(i.name) + ' <span class="muted small">' + esc(i.productId) + '</span></td><td>' + i.size + '</td><td class="num">' + i.quantity + '</td><td class="num">' + rsd(i.subtotal) + '</td></tr>';
        }).join('') +
        '</tbody><tfoot><tr><td colspan="3">Dostava</td><td class="num">' + (o.shipping ? rsd(o.shipping) : 'Besplatna') + '</td></tr>' +
        '<tr class="sum"><td colspan="3">Ukupno (pouzećem)</td><td class="num">' + rsd(o.total) + '</td></tr></tfoot></table></section>' +
      '<section class="status-box">' +
        (final
          ? '<p><strong>Porudžbina je otkazana.</strong> ' + (o.stockRestored ? 'Artikli su vraćeni na stanje.' : '') + ' Otkazana porudžbina se više ne menja.</p>'
          : '<label for="status-select"><strong>Status</strong></label>' +
            '<div class="status-row"><select id="status-select">' + STATUSES.map(function (s) {
              return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>';
            }).join('') + '</select><button class="btn btn-primary" id="status-save">Sačuvaj status</button></div>' +
            '<p class="muted small" id="status-hint">Otkazivanje vraća artikle na stanje i ne može se poništiti.</p>') +
      '</section>' +
      '<div class="dlg-foot"><button class="btn" data-close>Zatvori</button></div>'
    );
    const save = $('status-save');
    if (save) save.onclick = function () { saveStatus(o, $('status-select').value, save); };
  }

  async function saveStatus(o, status, btn) {
    if (status === o.status) { closeDialog(); return; }
    if (status === 'Otkazana' && !confirm('Otkazati porudžbinu ' + o.orderId + '?\n\nArtikli se vraćaju na stanje, a otkazivanje se ne može poništiti.')) return;
    btn.disabled = true; btn.textContent = 'Čuvam…';
    const res = await call('updateOrderStatus', { orderId: o.orderId, status: status });
    btn.disabled = false; btn.textContent = 'Sačuvaj status';
    if (!res.ok) { if (res.code !== 'AUTH') toast(res.error, true); return; }
    o.status = res.status;
    if (res.stockRestored) o.stockRestored = true;
    applyStockUpdates(res.stockUpdates);
    closeDialog();
    render();
    toast('Porudžbina ' + o.orderId + ': ' + res.status + (res.stockUpdates && res.stockUpdates.length ? '. Artikli su vraćeni na stanje.' : '.'));
  }

  function applyStockUpdates(updates) {
    (updates || []).forEach(function (u) {
      const p = productById(u.productId);
      if (!p) return;
      p.stock[u.size] = u.quantity;
      if (p.sizes.indexOf(Number(u.size)) === -1) { p.sizes.push(Number(u.size)); p.sizes.sort(function (a, b) { return a - b; }); }
    });
  }

  // ------------------------------------------------------------
  // PROIZVODI
  // ------------------------------------------------------------

  function productMatches(p) {
    if (S.prodStatus === 'prodaja' && p.status === 'obrisan') return false;
    if (S.prodStatus !== 'prodaja' && S.prodStatus !== 'svi' && p.status !== S.prodStatus) return false;
    if (S.prodCat && p.category !== S.prodCat) return false;
    if (S.prodGender && p.gender !== S.prodGender) return false;
    const q = S.prodQuery.trim().toLowerCase();
    return !q || (p.id + ' ' + p.name + ' ' + p.color).toLowerCase().indexOf(q) !== -1;
  }

  function select(id, value, options, label) {
    return '<select id="' + id + '" aria-label="' + esc(label) + '">' + options.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }

  function renderProducts() {
    const list = S.products.filter(productMatches);
    const pbadge = function (s) { return '<span class="badge ' + (s === 'aktivan' ? 'b-done' : s === 'neaktivan' ? 'b-proc' : 'b-cancel') + '">' + s + '</span>'; };

    $('panel').innerHTML =
      '<div class="head"><h1>Proizvodi</h1><p class="muted">' + S.products.filter(function (p) { return p.status === 'aktivan'; }).length + ' u prodaji</p>' +
        '<button class="btn btn-primary head-action" id="add-product">Dodaj proizvod</button></div>' +
      '<div class="toolbar">' +
        '<input type="search" id="prod-q" class="search" placeholder="Naziv, šifra ili boja…" value="' + esc(S.prodQuery) + '" aria-label="Pretraga proizvoda">' +
        select('prod-cat', S.prodCat, [['', 'Sve kategorije']].concat(CATEGORIES.map(function (c) { return [c, c]; })), 'Kategorija') +
        select('prod-gender', S.prodGender, [['', 'Oba pola'], ['Ženske', 'Ženske'], ['Muške', 'Muške']], 'Pol') +
        select('prod-status', S.prodStatus, [['prodaja', 'Aktivni i neaktivni'], ['aktivan', 'Samo aktivni'], ['neaktivan', 'Samo neaktivni'], ['obrisan', 'Obrisani'], ['svi', 'Svi']], 'Status') +
      '</div>' +
      (list.length ? '<div class="table products-table" role="table" aria-label="Proizvodi">' +
        '<div class="tr th" role="row"><span></span><span>Proizvod</span><span>Kategorija</span><span class="num">Cena</span><span class="num">Stanje</span><span>Status</span><span></span></div>' +
        list.map(function (p) {
          const t = totalQty(p);
          return '<div class="tr" role="row">' +
            '<span><img class="thumb" src="' + esc(thumb(p.image)) + '" alt="" loading="lazy"></span>' +
            '<span><span class="strong">' + esc(p.name) + '</span><br><span class="muted small">' + esc(p.id) + ', ' + esc(p.color) + '</span></span>' +
            '<span>' + esc(p.category) + '<br><span class="muted small">' + esc(p.gender) + '</span></span>' +
            '<span class="num strong">' + rsd(p.price) + '</span>' +
            '<span class="num' + (t === 0 ? ' text-danger' : '') + '">' + t + ' kom.</span>' +
            '<span>' + pbadge(p.status) + '</span>' +
            '<span class="actions">' +
              (p.status === 'obrisan'
                ? '<button class="btn btn-sm" data-restore="' + esc(p.id) + '">Vrati u ponudu</button>'
                : '<button class="btn btn-sm" data-edit="' + esc(p.id) + '">Izmeni</button><button class="btn btn-sm btn-danger-ghost" data-del="' + esc(p.id) + '">Obriši</button>') +
            '</span></div>';
        }).join('') + '</div>'
        : '<div class="empty"><p>Nema proizvoda za ove filtere.</p></div>');

    const q = $('prod-q');
    q.oninput = function () {
      S.prodQuery = q.value; const pos = q.selectionStart;
      renderProducts(); const nq = $('prod-q'); nq.focus(); nq.setSelectionRange(pos, pos);
    };
    $('prod-cat').onchange = function (e) { S.prodCat = e.target.value; renderProducts(); };
    $('prod-gender').onchange = function (e) { S.prodGender = e.target.value; renderProducts(); };
    $('prod-status').onchange = function (e) { S.prodStatus = e.target.value; renderProducts(); };
    $('add-product').onclick = function () { openProductForm(null); };
    $('panel').querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openProductForm(productById(b.dataset.edit)); }; });
    $('panel').querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { deleteProduct(productById(b.dataset.del), b); }; });
    $('panel').querySelectorAll('[data-restore]').forEach(function (b) { b.onclick = function () { restoreProduct(productById(b.dataset.restore), b); }; });
  }

  function openProductForm(p) {
    const isNew = !p;
    p = p || { name: '', gender: 'Ženske', category: 'Patike', price: '', color: '', description: '', image: '', status: 'aktivan' };
    const colors = {};
    S.products.forEach(function (x) { colors[x.color] = 1; });
    const opt = function (list, val) { return list.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };

    openDialog(
      '<form id="product-form" novalidate>' +
      '<div class="dlg-head"><h2 id="dlg-title">' + (isNew ? 'Nov proizvod' : 'Izmena: ' + esc(p.name)) + '</h2>' + (isNew ? '' : '<span class="muted">' + esc(p.id) + '</span>') + '</div>' +
      '<div class="form-grid">' +
        '<label class="f f-wide">Naziv<input name="name" required maxlength="80" value="' + esc(p.name) + '"></label>' +
        '<label class="f">Pol<select name="gender">' + opt(GENDERS, p.gender) + '</select></label>' +
        '<label class="f">Kategorija<select name="category">' + opt(CATEGORIES, p.category) + '</select></label>' +
        '<label class="f">Cena (din)<input name="price" type="number" min="1" step="1" inputmode="numeric" required value="' + esc(p.price) + '"></label>' +
        '<label class="f">Boja<input name="color" list="colors" required maxlength="30" value="' + esc(p.color) + '"></label>' +
        '<datalist id="colors">' + Object.keys(colors).sort().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
        '<label class="f f-wide">Link slike (https://…)<input name="image" type="url" maxlength="600" value="' + esc(p.image) + '"></label>' +
        '<div class="f-wide img-preview" id="img-preview">' + (p.image ? '<img src="' + esc(thumb(p.image)) + '" alt="Pregled slike">' : '') + '</div>' +
        '<label class="f f-wide">Opis<textarea name="description" rows="4" maxlength="1000">' + esc(p.description) + '</textarea></label>' +
        '<label class="f">Status<select name="status">' +
          '<option value="aktivan"' + (p.status !== 'neaktivan' ? ' selected' : '') + '>Aktivan (vidi se u prodavnici)</option>' +
          '<option value="neaktivan"' + (p.status === 'neaktivan' ? ' selected' : '') + '>Neaktivan (sakriven)</option></select></label>' +
      '</div>' +
      (isNew
        ? '<fieldset class="new-stock"><legend>Početno stanje po veličini</legend><p class="muted small">Ostavite prazno za veličine koje model nema. 0 znači da veličina postoji, ali je rasprodata.</p>' +
          '<div class="new-stock-grid">' + NEW_SIZES.map(function (s) {
            return '<label>' + s + '<input name="size-' + s + '" type="number" min="0" step="1" inputmode="numeric"></label>';
          }).join('') + '</div></fieldset>'
        : '<p class="muted small">Količine po veličini menjate u sekciji Stanje.</p>') +
      '<p class="msg" id="form-msg" role="alert"></p>' +
      '<div class="dlg-foot"><button type="button" class="btn" data-close>Otkaži</button><button type="submit" class="btn btn-primary" id="product-save">' + (isNew ? 'Dodaj proizvod' : 'Sačuvaj izmene') + '</button></div>' +
      '</form>'
    );

    const form = $('product-form');
    form.image.oninput = function () {
      const v = form.image.value.trim();
      $('img-preview').innerHTML = /^https:\/\//.test(v) ? '<img src="' + esc(thumb(v)) + '" alt="Pregled slike">' : '';
    };
    form.onsubmit = async function (e) {
      e.preventDefault();
      const data = {
        name: form.name.value.trim(), gender: form.gender.value, category: form.category.value,
        price: Number(form.price.value), color: form.color.value.trim(), image: form.image.value.trim(),
        description: form.description.value.trim(), status: form.status.value
      };
      const err =
        data.name.length < 2 ? 'Naziv mora imati bar 2 znaka.' :
        !Number.isInteger(data.price) || data.price < 1 ? 'Cena mora biti ceo broj u dinarima.' :
        data.color.length < 2 ? 'Unesite boju.' :
        data.image && !/^https:\/\/\S+$/.test(data.image) ? 'Link slike mora počinjati sa https://' : '';
      if (err) { $('form-msg').textContent = err; return; }

      if (isNew) {
        data.stock = {};
        NEW_SIZES.forEach(function (s) {
          const v = form['size-' + s].value;
          if (v !== '') data.stock[s] = Number(v);
        });
        if (!Object.keys(data.stock).length) { $('form-msg').textContent = 'Unesite količinu bar za jednu veličinu.'; return; }
        if (Object.keys(data.stock).some(function (k) { return !Number.isInteger(data.stock[k]) || data.stock[k] < 0; })) {
          $('form-msg').textContent = 'Količine moraju biti celi brojevi od 0 naviše.'; return;
        }
      } else {
        data.id = p.id;
      }

      const btn = $('product-save');
      btn.disabled = true; btn.textContent = 'Čuvam…';
      const res = await call(isNew ? 'addProduct' : 'updateProduct', { product: data });
      btn.disabled = false; btn.textContent = isNew ? 'Dodaj proizvod' : 'Sačuvaj izmene';
      if (!res.ok) { if (res.code !== 'AUTH') $('form-msg').textContent = res.error; return; }

      if (isNew) S.products.push(res.product);
      else S.products[S.products.indexOf(p)] = res.product;
      closeDialog();
      render();
      toast(isNew ? 'Dodat proizvod ' + res.product.name + ' (' + res.product.id + ').' : 'Sačuvano: ' + res.product.name + '.');
    };
  }

  async function deleteProduct(p, btn) {
    const inOrders = S.orders.some(function (o) { return o.items.some(function (i) { return i.productId === p.id; }); });
    const msg = inOrders
      ? 'Obrisati „' + p.name + '”?\n\nProizvod postoji u porudžbinama, pa se samo sakriva iz prodavnice (status „obrisan”) da istorija porudžbina ostane tačna. Može se vratiti.'
      : 'Trajno obrisati „' + p.name + '” i sve njegove zalihe?\n\nOvo se ne može poništiti.';
    if (!confirm(msg)) return;
    btn.disabled = true;
    const res = await call('deleteProduct', { id: p.id });
    btn.disabled = false;
    if (!res.ok) { if (res.code !== 'AUTH') toast(res.error, true); return; }
    if (res.mode === 'soft') p.status = 'obrisan';
    else S.products.splice(S.products.indexOf(p), 1);
    render();
    toast(res.mode === 'soft' ? p.name + ' je sakriven (status „obrisan”).' : p.name + ' je trajno obrisan.');
  }

  async function restoreProduct(p, btn) {
    btn.disabled = true;
    const res = await call('updateProduct', { product: Object.assign({}, p, { status: 'aktivan' }) });
    btn.disabled = false;
    if (!res.ok) { if (res.code !== 'AUTH') toast(res.error, true); return; }
    S.products[S.products.indexOf(p)] = res.product;
    render();
    toast(res.product.name + ' je ponovo u ponudi.');
  }

  // ------------------------------------------------------------
  // STANJE
  // ------------------------------------------------------------

  function stockMatches(p) {
    if (p.status === 'obrisan') return false;
    if (S.stockOnlyOut && !soldOutSizes(p).length) return false;
    if (S.stockCat && p.category !== S.stockCat) return false;
    const q = S.stockQuery.trim().toLowerCase();
    return !q || (p.id + ' ' + p.name).toLowerCase().indexOf(q) !== -1;
  }

  function renderStock() {
    const list = S.products.filter(stockMatches);
    const outSizes = S.products.filter(function (p) { return p.status !== 'obrisan'; })
      .reduce(function (s, p) { return s + soldOutSizes(p).length; }, 0);

    $('panel').innerHTML =
      '<div class="head"><h1>Stanje</h1><p class="muted">' + outSizes + ' rasprodatih veličina</p></div>' +
      '<div class="toolbar">' +
        '<input type="search" id="stock-q" class="search" placeholder="Naziv ili šifra…" value="' + esc(S.stockQuery) + '" aria-label="Pretraga">' +
        select('stock-cat', S.stockCat, [['', 'Sve kategorije']].concat(CATEGORIES.map(function (c) { return [c, c]; })), 'Kategorija') +
        '<label class="check"><input type="checkbox" id="stock-out"' + (S.stockOnlyOut ? ' checked' : '') + '> Samo modeli sa rasprodatim veličinama</label>' +
      '</div>' +
      '<p class="muted small help">Dugmad − i + menjaju stanje relativno (npr. „+2”), pa se ne gubi komad koji kupac kupi u istom trenutku. ' +
        'Upis broja u polje postavlja tačnu vrednost – ako se stanje u međuvremenu promenilo, izmena se odbija i prikazuje se novo stanje.</p>' +
      (list.length ? '<div class="stock-list" id="stock-list">' + list.map(stockRow).join('') + '</div>'
        : '<div class="empty"><p>' + (S.stockOnlyOut ? 'Nijedan model nema rasprodatu veličinu.' : 'Nema proizvoda za ove filtere.') + '</p></div>');

    const q = $('stock-q');
    q.oninput = function () {
      S.stockQuery = q.value; const pos = q.selectionStart;
      renderStock(); const nq = $('stock-q'); nq.focus(); nq.setSelectionRange(pos, pos);
    };
    $('stock-cat').onchange = function (e) { S.stockCat = e.target.value; renderStock(); };
    $('stock-out').onchange = function (e) { S.stockOnlyOut = e.target.checked; renderStock(); };
    bindStockList();
  }

  function stockRow(p) {
    const pend = S.pending[p.id] || {};
    const missing = ALL_SIZES.filter(function (s) { return p.sizes.indexOf(s) === -1; });
    return '<div class="stock-row" data-pid="' + esc(p.id) + '">' +
      '<div class="stock-prod"><img class="thumb" src="' + esc(thumb(p.image)) + '" alt="" loading="lazy">' +
        '<div><p class="strong">' + esc(p.name) + (p.status === 'neaktivan' ? ' <span class="badge b-proc">neaktivan</span>' : '') + '</p>' +
        '<p class="muted small">' + esc(p.id) + ', ' + esc(p.category) + ', ' + esc(p.gender.toLowerCase()) + '</p>' +
        '<p class="small">Ukupno: <strong>' + (totalQty(p) + Object.keys(pend).reduce(function (s, k) { return s + pend[k]; }, 0)) + '</strong> kom.</p></div></div>' +
      '<div class="sizes">' + p.sizes.map(function (s) {
        const base = Number(p.stock[s] || 0);
        const d = pend[s] || 0;
        const shown = base + d;
        return '<div class="size-cell' + (shown === 0 ? ' is-out' : '') + (d ? ' is-pending' : '') + '">' +
          '<span class="size-label">' + s + '</span>' +
          '<div class="qty">' +
            '<button data-delta="-1" data-size="' + s + '" aria-label="Veličina ' + s + ': jedan manje"' + (shown <= 0 ? ' disabled' : '') + '>−</button>' +
            '<input type="number" min="0" step="1" inputmode="numeric" value="' + shown + '" data-set="' + s + '" data-base="' + base + '" aria-label="Veličina ' + s + ', količina">' +
            '<button data-delta="1" data-size="' + s + '" aria-label="Veličina ' + s + ': jedan više">+</button>' +
          '</div></div>';
      }).join('') +
      (missing.length ? '<div class="size-cell add-size"><span class="size-label">Nova</span><div class="qty">' +
        '<select data-addsize aria-label="Dodaj veličinu"><option value="">vel.</option>' + missing.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
        '<button data-addbtn aria-label="Dodaj veličinu">Dodaj</button></div></div>' : '') +
      '</div></div>';
  }

  function refreshStockRow(pid) {
    const el = document.querySelector('.stock-row[data-pid="' + pid + '"]');
    const p = productById(pid);
    if (!el || !p) return;
    const active = document.activeElement;
    const focusKey = active && el.contains(active) ? (active.dataset.set ? 'set:' + active.dataset.set : active.dataset.delta ? 'd:' + active.dataset.delta + ':' + active.dataset.size : '') : '';
    const tmp = document.createElement('div');
    tmp.innerHTML = stockRow(p);
    el.replaceWith(tmp.firstChild);
    bindStockList();
    if (focusKey) {
      const parts = focusKey.split(':');
      const row = document.querySelector('.stock-row[data-pid="' + pid + '"]');
      const target = parts[0] === 'set' ? row.querySelector('[data-set="' + parts[1] + '"]')
        : row.querySelector('[data-delta="' + parts[1] + '"][data-size="' + parts[2] + '"]');
      if (target && !target.disabled) target.focus();
    }
    // brojač rasprodatih u tabu
    const outCount = S.products.filter(function (x) { return x.status !== 'obrisan' && soldOutSizes(x).length; }).length;
    $('n-stock').textContent = outCount ? outCount : '';
  }

  function bindStockList() {
    const list = $('stock-list');
    if (!list || list.dataset.bound) return;
    list.dataset.bound = '1';

    list.addEventListener('click', function (e) {
      const row = e.target.closest('.stock-row');
      if (!row) return;
      const pid = row.dataset.pid;
      const b = e.target.closest('[data-delta]');
      if (b) {
        const size = Number(b.dataset.size);
        const p = productById(pid);
        const pend = S.pending[pid] = S.pending[pid] || {};
        const next = (pend[size] || 0) + Number(b.dataset.delta);
        if (Number(p.stock[size] || 0) + next < 0) return;
        pend[size] = next;
        if (!pend[size]) delete pend[size];
        refreshStockRow(pid);
        scheduleFlush(pid);
        return;
      }
      if (e.target.closest('[data-addbtn]')) {
        const sel = row.querySelector('[data-addsize]');
        if (!sel.value) { sel.focus(); return; }
        sendStock(pid, [{ size: Number(sel.value), set: 0 }], 'Dodata veličina ' + sel.value + '. Upišite količinu.');
      }
    });

    list.addEventListener('change', function (e) {
      const input = e.target.closest('[data-set]');
      if (!input) return;
      const row = input.closest('.stock-row');
      const pid = row.dataset.pid;
      const size = Number(input.dataset.set);
      const val = Number(input.value);
      if (input.value === '' || !Number.isInteger(val) || val < 0) {
        toast('Količina mora biti ceo broj od 0 naviše.', true);
        refreshStockRow(pid);
        return;
      }
      // Tačna vrednost poništava +/− koji još nisu poslati za tu veličinu
      if (S.pending[pid]) delete S.pending[pid][size];
      sendStock(pid, [{ size: size, set: val, expected: Number(input.dataset.base) }]);
    });

    list.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('[data-set]')) e.target.blur();
    });
  }

  function scheduleFlush(pid) {
    clearTimeout(S.timers[pid]);
    S.timers[pid] = setTimeout(function () { flush(pid); }, 700);
  }

  function flush(pid) {
    const pend = S.pending[pid];
    if (!pend || !Object.keys(pend).length) return;
    const changes = Object.keys(pend).map(function (s) { return { size: Number(s), delta: pend[s] }; });
    delete S.pending[pid];
    sendStock(pid, changes, null, changes);
  }

  async function sendStock(pid, changes, okMsg, sentDeltas) {
    const row = document.querySelector('.stock-row[data-pid="' + pid + '"]');
    if (row) row.classList.add('is-saving');
    const res = await call('updateStock', { productId: pid, changes: changes });
    const p = productById(pid);
    if (res.stock && p) {
      Object.keys(res.stock).forEach(function (s) { p.stock[s] = Number(res.stock[s]); });
      p.sizes = Object.keys(p.stock).map(Number).sort(function (a, b) { return a - b; });
    }
    if (!res.ok) {
      if (res.code !== 'AUTH') toast(res.error, true);
    } else if (okMsg) {
      toast(okMsg);
    }
    const r2 = document.querySelector('.stock-row[data-pid="' + pid + '"]');
    if (r2) { refreshStockRow(pid); }
    // Ako je u međuvremenu kliknuto još +/−, to ide u sledećem slanju
    if (S.pending[pid] && Object.keys(S.pending[pid]).length) scheduleFlush(pid);
  }

  window.addEventListener('beforeunload', function (e) {
    if (Object.keys(S.pending).some(function (k) { return Object.keys(S.pending[k]).length; })) {
      e.preventDefault(); e.returnValue = '';
    }
  });

  // ------------------------------------------------------------
  // Dijalog
  // ------------------------------------------------------------

  function openDialog(html) {
    const d = $('dlg');
    d.innerHTML = '<div class="dlg-body">' + html + '</div>';
    d.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeDialog; });
    if (!d.open) d.showModal();
    const first = d.querySelector('input, select, textarea');
    if (first) first.focus();
  }
  function closeDialog() {
    const d = $('dlg');
    if (d.open) d.close();
  }
  $('dlg').addEventListener('click', function (e) { if (e.target === this) closeDialog(); });

  // ------------------------------------------------------------
  // Start
  // ------------------------------------------------------------

  if (!window.KORAK_CONFIG.API_URL) {
    $('login-screen').hidden = false;
    $('login-msg').textContent = 'Admin panel još nije povezan sa serverom. Upišite API_URL u assets/js/config.js.';
    $('login-btn').disabled = true;
  } else if (S.token) {
    load();
  } else {
    showLogin();
  }
})();
