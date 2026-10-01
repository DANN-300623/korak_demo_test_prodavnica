window.K = window.K || {};

(function (K) {
  K.CATEGORIES = ['Patike', 'Čizme', 'Sandale', 'Cipele', 'Papuče'];
  K.SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

  K.COLOR_HEX = {
    'Crna': '#1f1f1f', 'Bela': '#f7f7f4', 'Bež': '#d9c4a3', 'Braon': '#7b4c2c', 'Siva': '#8e9390',
    'Plava': '#2f4f86', 'Crvena': '#b23a33', 'Zelena': '#5b6b3d', 'Roze': '#e6adbb', 'Srebrna': '#c3c7cb',
    'Žuta': '#e2b33a', 'Narandžasta': '#d9772f', 'Ljubičasta': '#6d4c8a'
  };

  K.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  K.rsd = function (n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' din';
  };

  K.plural = function (n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  /** Pexels slike se traže u širini koja je stvarno potrebna. */
  K.img = function (url, width) {
    if (!url) return '';
    if (url.indexOf('images.pexels.com') === -1) return url;
    try {
      const u = new URL(url);
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', String(width));
      u.searchParams.delete('h');
      return u.toString();
    } catch (e) { return url; }
  };

  K.srcset = function (url, widths) {
    if (!url || url.indexOf('images.pexels.com') === -1) return '';
    return widths.map(function (w) { return K.img(url, w) + ' ' + w + 'w'; }).join(', ');
  };

  /** <img> sa lazy loading-om, srcset-om i rezervnom slikom ako link ne radi. */
  K.imgTag = function (url, alt, opts) {
    opts = opts || {};
    const widths = opts.widths || [320, 480, 720];
    const eager = opts.eager;
    const srcset = K.srcset(url, widths);
    return '<img src="' + K.esc(K.img(url, widths[1] || widths[0])) + '"' +
      (srcset ? ' srcset="' + K.esc(srcset) + '" sizes="' + (opts.sizes || '(max-width: 640px) 50vw, 25vw') + '"' : '') +
      ' alt="' + K.esc(alt) + '"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') +
      (opts.w ? ' width="' + opts.w + '" height="' + opts.h + '"' : '') + '>';
  };

  K.PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#e7e9e3"/>' +
    '<path d="M110 300c30 0 60-10 85-35l20 20c20 20 50 30 85 30h10v30H110z" fill="none" stroke="#9aa19b" stroke-width="6" stroke-linejoin="round"/>' +
    '<text x="200" y="400" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#7b837e">Fotografija nije dostupna</text></svg>'
  );

  // Slika koja ne može da se učita → neutralna zamena umesto polomljene ikone
  document.addEventListener('error', function (e) {
    const el = e.target;
    if (el && el.tagName === 'IMG' && !el.dataset.fallback) {
      el.dataset.fallback = '1';
      el.removeAttribute('srcset');
      el.src = K.PLACEHOLDER;
    }
  }, true);

  K.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
    const a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  };

  K.storage = {
    get: function (key, fallback, area) {
      try {
        const raw = (area || localStorage).getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set: function (key, value, area) {
      try { (area || localStorage).setItem(key, JSON.stringify(value)); } catch (e) { /* pun ili blokiran storage */ }
    },
    remove: function (key, area) {
      try { (area || localStorage).removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  let toastTimer;
  K.toast = function (message, action) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>' + K.esc(message) + '</span>' +
      (action ? '<a href="' + K.esc(action.href) + '">' + K.esc(action.label) + '</a>' : '');
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 3800);
  };
})(window.K);
