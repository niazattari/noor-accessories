/* ===========================================================
   Noor Accessories – Application bootstrap
   Wires every event listener and starts the store.
   =========================================================== */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  /* -------------------------------------------------------
     THEME (dark mode)
  ------------------------------------------------------- */
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(CONFIG.KEYS.theme); } catch (e) {}
    if (saved === 'dark') document.body.classList.add('dark');

    const btn = $('#themeBtn');
    btn && btn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      try {
        localStorage.setItem(CONFIG.KEYS.theme, document.body.classList.contains('dark') ? 'dark' : 'light');
      } catch (e) {}
    });
  }

  /* -------------------------------------------------------
     SCROLL EFFECTS
  ------------------------------------------------------- */
  function initScroll() {
    const header = $('#siteHeader');
    const links  = $$('.nav-link');
    const sections = ['home', 'products', 'reviews', 'about'].map(id => $('#' + id)).filter(Boolean);

    window.addEventListener('scroll', () => {
      header && header.classList.toggle('scrolled', window.scrollY > 10);

      let current = 'home';
      sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 140) current = sec.id;
      });
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
    }, { passive: true });

    // reveal-on-scroll
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: .12 });
      $$('.reveal').forEach(el => io.observe(el));
    } else {
      $$('.reveal').forEach(el => el.classList.add('in'));
    }
  }

  /* -------------------------------------------------------
     HEADER / NAV
  ------------------------------------------------------- */
  function initHeader() {
    const menuBtn = $('#menuBtn'), mobileNav = $('#mobileNav');
    menuBtn && menuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));
    $$('.mnav-link').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

    // language toggle
    $('#langBtn').addEventListener('click', () => Lang.toggle());

    // search (desktop + mobile stay in sync)
    let timer = null;
    const onSearch = value => {
      clearTimeout(timer);
      timer = setTimeout(() => { UI.filter.search = value; UI.renderProducts(); }, 180);
    };
    const d = $('#searchInput'), m = $('#searchInputMobile');
    d && d.addEventListener('input', e => { if (m) m.value = e.target.value; onSearch(e.target.value); });
    m && m.addEventListener('input', e => { if (d) d.value = e.target.value; onSearch(e.target.value); });

    // profile
    $('#profileBtn').addEventListener('click', () => Profile.open('info'));
    const fp = $('#footProfile');
    fp && fp.addEventListener('click', e => { e.preventDefault(); Profile.open('info'); });

    // cart
    $('#cartBtn').addEventListener('click', () => UI.openCart());
    $('#cartClose').addEventListener('click', () => UI.closeCart());
    $('#overlay').addEventListener('click', () => { UI.closeCart(); UI.closeAllModals(); });
  }

  /* -------------------------------------------------------
     PRODUCT / CART DELEGATED CLICKS
  ------------------------------------------------------- */
  function initDelegates() {
    document.addEventListener('click', e => {

      // category chip
      const chip = e.target.closest('[data-cat]');
      if (chip) {
        UI.filter.category = chip.dataset.cat;
        UI.renderCategories();
        UI.renderProducts();
        return;
      }

      // add to cart
      const add = e.target.closest('[data-add]');
      if (add && !add.disabled) {
        const p = UI.productById(add.dataset.add);
        if (p) {
          Cart.add(p, 1);
          UI.toast(Lang.t('cart.added') + ' · ' + Lang.pick(p, 'name'), 'success');
        }
        return;
      }

      // view details
      const view = e.target.closest('[data-view]');
      if (view) { UI.openProduct(view.dataset.view); return; }

      // wishlist
      const wish = e.target.closest('[data-wish]');
      if (wish) {
        const added = Profile.toggleWish(wish.dataset.wish);
        wish.classList.toggle('on', added);
        UI.renderProducts();
        Profile.renderWishlist();
        return;
      }

      // cart quantity
      const inc = e.target.closest('[data-inc]');
      if (inc) { Cart.increment(inc.dataset.inc, 1); return; }
      const dec = e.target.closest('[data-dec]');
      if (dec) { Cart.increment(dec.dataset.dec, -1); return; }
      const del = e.target.closest('[data-del]');
      if (del) { Cart.remove(del.dataset.del); UI.toast(Lang.t('cart.removed')); return; }

      // close buttons inside modals
      const close = e.target.closest('[data-close]');
      if (close) {
        const modal = close.closest('.modal');
        if (modal) UI.closeModal('#' + modal.id);
        return;
      }

      // clicking the dark part of a modal closes it
      if (e.target.classList.contains('modal')) UI.closeModal('#' + e.target.id);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { UI.closeAllModals(); UI.closeCart(); }
    });

    // cart footer buttons
    $('#checkoutBtn').addEventListener('click', () => UI.openCheckout());
    $('#clearCartBtn').addEventListener('click', () => { Cart.clear(); UI.toast(Lang.t('cart.removed')); });

    // carousel
    const car = $('#carousel');
    if (car) {
      $('#carPrev').addEventListener('click', () => { UI.goSlide(UI.carousel.index - 1); UI.startCarousel(); });
      $('#carNext').addEventListener('click', () => { UI.goSlide(UI.carousel.index + 1); UI.startCarousel(); });

      car.addEventListener('click', e => {
        const dot = e.target.closest('[data-dot]');
        if (dot) { UI.goSlide(Number(dot.dataset.dot)); UI.startCarousel(); return; }
        const play = e.target.closest('[data-play]');
        if (play) { UI.playSlide(Number(play.dataset.play)); }
      });

      car.addEventListener('mouseenter', () => UI.stopCarousel());
      car.addEventListener('mouseleave', () => UI.startCarousel());

      // swipe on touch
      car.addEventListener('touchstart', e => {
        UI.carousel.startX = e.touches[0].clientX;
        UI.stopCarousel();
      }, { passive: true });
      car.addEventListener('touchend', e => {
        const start = UI.carousel.startX;
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 45) {
          const forward = Lang.isUrdu() ? dx > 0 : dx < 0;
          UI.goSlide(UI.carousel.index + (forward ? 1 : -1));
        }
        UI.carousel.startX = null;
        UI.startCarousel();
      });

      // pause the carousel while the tab is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) UI.stopCarousel(); else UI.startCarousel();
      });
    }

    // sorting
    $('#sortSelect').addEventListener('change', e => {
      UI.filter.sort = e.target.value;
      UI.renderProducts();
    });
  }

  /* -------------------------------------------------------
     FORMS
  ------------------------------------------------------- */
  function initForms() {
    // checkout
    const co = $('#checkoutForm');
    co.addEventListener('submit', e => { e.preventDefault(); UI.submitOrder(co); });
    $$('input[name="payment"]').forEach(r => r.addEventListener('change', () => UI.renderPayInfo()));

    // profile
    const pf = $('#profileForm');
    pf.addEventListener('submit', e => { e.preventDefault(); Profile.saveProfileForm(pf); });

    // review
    const rf = $('#reviewForm');
    rf.addEventListener('submit', e => { e.preventDefault(); Profile.submitReview(rf); });

    // stars
    $$('#starPicker span').forEach(s => {
      s.addEventListener('click', () => Profile.setRating(s.dataset.v));
    });

    // tabs
    $$('#profileTabs .tab').forEach(t => {
      t.addEventListener('click', () => Profile.switchTab(t.dataset.tab));
    });

    $('#refreshOrders').addEventListener('click', () => Profile.refreshOrders());
    $('#writeReviewBtn').addEventListener('click', () => Profile.open('reviews'));
  }

  /* -------------------------------------------------------
     GLOBAL EVENTS
  ------------------------------------------------------- */
  function initGlobalEvents() {
    document.addEventListener('cartchange', () => UI.renderCart());
    document.addEventListener('languagechange', () => UI.renderAll());
  }

  /* -------------------------------------------------------
     START
  ------------------------------------------------------- */
  async function start() {
    Lang.init();
    initTheme();
    Cart.load();
    Profile.load();
    if (Profile.data.lang && Profile.data.lang !== Lang.current) Lang.apply(Profile.data.lang, true);

    initHeader();
    initDelegates();
    initForms();
    initGlobalEvents();
    initScroll();

    UI.renderStaticBits();
    UI.refreshWaLinks();
    UI.renderCart();
    UI.showSkeletons();

    const store = await API.loadStore();
    UI.products = store.products || [];
    UI.reviews  = store.reviews  || [];
    UI.banners  = store.banners  || [];
    UI.settings = store.settings || {};

    // let the sheet override config values when they are present
    if (UI.settings.DeliveryDays)      CONFIG.DELIVERY_DAYS = Number(UI.settings.DeliveryDays) || CONFIG.DELIVERY_DAYS;
    if (UI.settings.ShippingCost)      CONFIG.SHIPPING_COST = Number(UI.settings.ShippingCost);
    if (UI.settings.FreeShippingAbove) CONFIG.FREE_SHIPPING_ABOVE = Number(UI.settings.FreeShippingAbove);

    UI.renderAll();
    Lang.translateDOM();

    if (store.demo) {
      showNotice(Lang.t('g.demoMode'));
    } else if (store.offline) {
      UI.toast(Lang.t('g.offline'), 'error');
    }

    // hide the loader
    const loader = $('#pageLoader');
    loader && loader.classList.add('done');
    setTimeout(() => loader && loader.remove(), 600);
  }

  function showNotice(text) {
    if ($('#demoNotice')) return;
    const bar = document.createElement('div');
    bar.id = 'demoNotice';
    bar.className = 'notice-bar';
    bar.textContent = text;
    const header = $('#siteHeader');
    header.parentNode.insertBefore(bar, header.nextSibling);
    document.addEventListener('languagechange', () => { bar.textContent = Lang.t('g.demoMode'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
