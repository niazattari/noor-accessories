/* ===========================================================
   Noor Accessories - Language Manager
   Handles: EN/UR switching, RTL/LTR direction, persistence
   =========================================================== */

const Lang = {

  current: CONFIG.DEFAULT_LANG || 'en',

  /** Read saved preference (or config default) and apply it. */
  init() {
    let saved = null;
    try { saved = localStorage.getItem(CONFIG.KEYS.lang); } catch (e) { /* private mode */ }
    this.current = (saved === 'ur' || saved === 'en') ? saved : (CONFIG.DEFAULT_LANG || 'en');
    this.apply(this.current, /* silent */ true);
  },

  /** Translate a key. Falls back to English, then to the key itself. */
  t(key) {
    const pack = TRANSLATIONS[this.current] || TRANSLATIONS.en;
    if (pack[key] !== undefined) return pack[key];
    if (TRANSLATIONS.en[key] !== undefined) return TRANSLATIONS.en[key];
    return key;
  },

  /** true when the interface is currently in Urdu */
  isUrdu() { return this.current === 'ur'; },

  /** Pick the right field of a bilingual record: pickField(p,'name') -> nameUr / nameEn */
  pick(obj, base) {
    if (!obj) return '';
    const ur = obj[base + 'Ur'] || obj[base + 'UR'] || obj[base + '_ur'];
    const en = obj[base + 'En'] || obj[base + 'EN'] || obj[base + '_en'] || obj[base];
    return (this.isUrdu() && ur) ? ur : (en || ur || '');
  },

  /** Switch to the other language. */
  toggle() {
    this.apply(this.current === 'en' ? 'ur' : 'en');
  },

  /** Apply a language to the whole document. */
  apply(lang, silent) {
    this.current = (lang === 'ur') ? 'ur' : 'en';
    try { localStorage.setItem(CONFIG.KEYS.lang, this.current); } catch (e) {}

    const meta = TRANSLATIONS[this.current].meta;
    const html = document.documentElement;

    html.setAttribute('lang', this.current);
    html.setAttribute('dir', meta.dir);
    document.body && document.body.classList.toggle('rtl', meta.dir === 'rtl');
    document.body && document.body.classList.toggle('lang-ur', this.current === 'ur');

    this.translateDOM();

    // Let the rest of the app re-render dynamic content (products, cart...)
    if (!silent) {
      document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: this.current } }));
      // small fade so the switch feels smooth
      document.body && document.body.classList.add('lang-switching');
      setTimeout(() => document.body && document.body.classList.remove('lang-switching'), 320);
    }
  },

  /** Walk the DOM and translate every tagged element. */
  translateDOM(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-ph')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      const v = this.t(el.getAttribute('data-i18n-title'));
      el.setAttribute('title', v);
      el.setAttribute('aria-label', v);
    });
    scope.querySelectorAll('[data-i18n-value]').forEach(el => {
      el.value = this.t(el.getAttribute('data-i18n-value'));
    });

    // language toggle button always shows the OTHER language
    const meta = TRANSLATIONS[this.current].meta;
    scope.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.innerHTML = '<span class="flag">' + meta.otherFlag + '</span><span>' + meta.other + '</span>';
      btn.setAttribute('title', meta.other);
    });
  },

  /** Format a price using the active language's currency word. */
  price(amount) {
    const n = Number(amount || 0);
    const formatted = n.toLocaleString('en-US');
    return this.isUrdu() ? (formatted + ' ' + this.t('g.currency')) : (this.t('g.currency') + ' ' + formatted);
  },

  /** Language-aware date formatting. */
  date(value) {
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value || '');
    try {
      return d.toLocaleDateString(this.isUrdu() ? 'ur-PK' : 'en-GB',
        { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  },

  /** Translate an order status coming from the sheet. */
  status(raw) {
    const key = 'st.' + String(raw || 'pending').trim().toLowerCase();
    const val = this.t(key);
    return val === key ? String(raw) : val;
  }
};

window.Lang = Lang;
