/* ===========================================================
   Noor Accessories – UI layer
   Product rendering, filters, cart drawer, checkout, toasts
   =========================================================== */

const UI = {

  /* ---------- state ---------- */
  products : [],
  reviews  : [],
  banners  : [],
  settings : {},
  carousel : { index: 0, timer: null, startX: null },
  filter   : { category: 'all', search: '', sort: 'newest' },
  lastOrder: null,

  /* ---------- tiny helpers ---------- */
  $ (sel, root) { return (root || document).querySelector(sel); },
  $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

  /** Escape user / sheet supplied text before putting it in innerHTML. */
  esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  toast(message, type) {
    const wrap = this.$('#toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, 2800);
  },

  /* =========================================================
     WHATSAPP
     ========================================================= */
  waNumber() {
    return String(this.settings.WhatsAppNumber || CONFIG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  },

  waLink(text) {
    const base = 'https://wa.me/' + this.waNumber();
    return text ? base + '?text=' + encodeURIComponent(text) : base;
  },

  prettyNumber() {
    const n = this.waNumber();
    return n ? '+' + n.replace(/^(\d{2})(\d{3})(\d+)$/, '$1 $2 $3') : '';
  },

  refreshWaLinks() {
    const greeting = Lang.isUrdu()
      ? 'السلام علیکم! میں نور ایکسیسریز سے کچھ خریدنا چاہتی ہوں۔'
      : 'Hello! I would like to order from Noor Accessories.';
    const link = this.waLink(greeting);
    ['#headerWa', '#heroWa', '#footerWa', '#floatWa'].forEach(sel => {
      const el = this.$(sel);
      if (el) el.href = link;
    });
    const num = this.$('#footWaNumber');
    if (num) num.textContent = this.prettyNumber();
  },

  /* =========================================================
     PRODUCTS
     ========================================================= */
  visibleProducts() {
    const q = this.filter.search.trim().toLowerCase();
    let list = this.products.filter(p => {
      const catOk = this.filter.category === 'all' || p.category === this.filter.category;
      if (!catOk) return false;
      if (!q) return true;
      return [p.nameEn, p.nameUr, p.category, p.descEn, p.descUr]
        .some(v => String(v || '').toLowerCase().indexOf(q) !== -1);
    });

    switch (this.filter.sort) {
      case 'lowhigh': list.sort((a, b) => a.price - b.price); break;
      case 'highlow': list.sort((a, b) => b.price - a.price); break;
      case 'popular': list.sort((a, b) => (b.sold || 0) - (a.sold || 0)); break;
      default:        list.sort((a, b) => String(b.created || '').localeCompare(String(a.created || ''))); break;
    }
    return list;
  },

  renderCategories() {
    const wrap = this.$('#categoryChips');
    if (!wrap) return;
    const cats = [];
    this.products.forEach(p => {
      if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });

    let html = '<button class="chip ' + (this.filter.category === 'all' ? 'active' : '') +
               '" data-cat="all">' + this.esc(Lang.t('prod.allCategories')) + '</button>';
    cats.forEach(c => {
      html += '<button class="chip ' + (this.filter.category === c ? 'active' : '') +
              '" data-cat="' + this.esc(c) + '">' + this.esc(c) + '</button>';
    });
    wrap.innerHTML = html;
  },

  renderProducts() {
    const grid  = this.$('#productGrid');
    const empty = this.$('#productEmpty');
    if (!grid) return;

    const list = this.visibleProducts();
    const count = this.$('#resultCount');
    if (count) count.textContent = list.length;

    if (!list.length) {
      grid.innerHTML = '';
      empty && empty.classList.remove('hidden');
      return;
    }
    empty && empty.classList.add('hidden');

    const wish = Profile.wishlist();
    grid.innerHTML = list.map((p, i) => {
      const name  = this.esc(Lang.pick(p, 'name'));
      const desc  = this.esc(Lang.pick(p, 'desc'));
      const out   = Number(p.stock) <= 0;
      const disc  = Number(p.discount) || 0;
      const liked = wish.indexOf(p.id) !== -1;

      return '' +
      '<article class="card" style="animation-delay:' + Math.min(i * 45, 400) + 'ms">' +
        '<div class="card-media">' +
          '<img src="' + this.esc(p.image) + '" alt="' + name + '" loading="lazy" ' +
               'onerror="this.src=\'assets/noor-logo.svg\';this.style.objectFit=\'contain\';this.style.padding=\'22%\'">' +
          (disc > 0 ? '<span class="badge-disc">-' + disc + '% ' + this.esc(Lang.t('prod.off')) + '</span>' : '') +
          '<span class="badge-stock' + (out ? ' out' : '') + '">' +
            (out ? this.esc(Lang.t('prod.outOfStock'))
                 : (p.stock + ' ' + this.esc(Lang.t('prod.available')))) +
          '</span>' +
          '<button class="wish-btn' + (liked ? ' on' : '') + '" data-wish="' + this.esc(p.id) + '" ' +
                  'title="' + this.esc(Lang.t('prod.wishAdd')) + '">' +
            '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.7-9.5-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.5 12c-2 4.3-9.5 9-9.5 9z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="card-body">' +
          '<span class="card-cat">' + this.esc(p.category) + '</span>' +
          '<h3 class="card-name">' + name + '</h3>' +
          '<p class="card-desc">' + desc + '</p>' +
          '<div class="card-price">' +
            '<span class="price-now">' + this.esc(Lang.price(p.price)) + '</span>' +
            (p.original > p.price ? '<span class="price-old">' + this.esc(Lang.price(p.original)) + '</span>' : '') +
            (p.original > p.price ? '<span class="price-save">' + this.esc(Lang.t('prod.youSave')) + ' ' +
              this.esc(Lang.price(p.original - p.price)) + '</span>' : '') +
          '</div>' +
          '<div class="card-actions">' +
            '<button class="btn btn-outline" data-view="' + this.esc(p.id) + '">' +
              this.esc(Lang.t('prod.viewDetails')) + '</button>' +
            '<button class="btn btn-primary" data-add="' + this.esc(p.id) + '"' + (out ? ' disabled' : '') + '>' +
              this.esc(out ? Lang.t('prod.outOfStock') : Lang.t('prod.addToCart')) + '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  },

  showSkeletons() {
    const grid = this.$('#productGrid');
    if (grid) grid.innerHTML = new Array(8).fill('<div class="skeleton"></div>').join('');
  },

  productById(id) { return this.products.find(p => String(p.id) === String(id)); },

  openProduct(id) {
    const p = this.productById(id);
    if (!p) return;
    const out = Number(p.stock) <= 0;
    this.$('#productModalBody').innerHTML = '' +
      '<div class="pm-grid">' +
        '<div class="pm-media"><img src="' + this.esc(p.image) + '" alt="' + this.esc(Lang.pick(p, 'name')) + '" ' +
          'onerror="this.src=\'assets/noor-logo.svg\';this.style.objectFit=\'contain\';this.style.padding=\'22%\'"></div>' +
        '<div class="pm-body">' +
          '<span class="card-cat">' + this.esc(p.category) + '</span>' +
          '<h3>' + this.esc(Lang.pick(p, 'name')) + '</h3>' +
          '<div class="pm-price">' +
            '<span class="price-now" style="font-size:1.5rem">' + this.esc(Lang.price(p.price)) + '</span>' +
            (p.original > p.price ? '<span class="price-old">' + this.esc(Lang.price(p.original)) + '</span>' : '') +
            (p.discount ? '<span class="badge-disc" style="position:static">-' + p.discount + '%</span>' : '') +
          '</div>' +
          '<p class="pm-meta">' + this.esc(Lang.t('prod.description')) + '</p>' +
          '<p>' + this.esc(Lang.pick(p, 'desc')) + '</p>' +
          '<p class="pm-meta">' + this.esc(Lang.t('prod.quantity')) + ': <b>' + p.stock + '</b> ' +
            this.esc(out ? Lang.t('prod.outOfStock') : Lang.t('prod.inStock')) + '</p>' +
          '<div class="pm-actions">' +
            '<button class="btn btn-primary" data-add="' + this.esc(p.id) + '"' + (out ? ' disabled' : '') + '>' +
              this.esc(Lang.t('prod.addToCart')) + '</button>' +
            '<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="' +
              this.esc(this.waLink((Lang.isUrdu() ? 'السلام علیکم! مجھے یہ چاہیے: ' : 'Hello! I am interested in: ') +
                Lang.pick(p, 'name') + ' (' + Lang.price(p.price) + ')')) + '">' +
              this.esc(Lang.t('nav.whatsapp')) + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    this.openModal('#productModal');
  },

  /* =========================================================
     PROMO CAROUSEL
     ========================================================= */

  /** Turn a YouTube watch/share link into an embeddable one. */
  youtubeEmbed(url) {
    const m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/);
    return m ? 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1&rel=0&playsinline=1' : null;
  },

  isVideo(b) {
    if (String(b.type).toLowerCase() === 'video') return true;
    return /\.(mp4|webm|ogg)(\?|$)/i.test(String(b.media)) || /youtu/i.test(String(b.media));
  },

  renderCarousel() {
    const track = this.$('#carTrack');
    const dots  = this.$('#carDots');
    const wrap  = this.$('#carousel');
    if (!track) return;

    const list = this.banners || [];
    if (!list.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');

    track.innerHTML = list.map((b, i) => {
      const title = this.esc(Lang.pick(b, 'title'));
      const sub   = this.esc(Lang.pick(b, 'sub'));
      const btn   = this.esc(Lang.pick(b, 'btn'));
      const video = this.isVideo(b);
      const yt    = video ? this.youtubeEmbed(b.media) : null;
      const cover = this.esc(b.poster || (video ? '' : b.media));

      // A blurred copy fills the frame, the real media sits on top uncropped,
      // so a tall product photo and a wide banner both look right.
      const still = video ? cover : this.esc(b.media);
      const lazy  = i > 2 ? 'loading="lazy" ' : 'decoding="async" ';
      const hide  = 'onerror="this.style.display=\'none\'"';
      let media = still
        ? '<img class="car-bg" src="' + still + '" alt="" aria-hidden="true" ' + lazy + hide + '>'
        : '';

      if (video && yt) {
        media += still ? '<img class="car-fg" src="' + still + '" alt="' + title + '" ' + lazy + hide + '>' : '';
      } else if (video) {
        media += '<video class="car-fg" src="' + this.esc(b.media) + '" poster="' + cover + '" ' +
                 'muted playsinline preload="metadata"></video>';
      } else {
        media += '<img class="car-fg" src="' + this.esc(b.media) + '" alt="' + title + '" ' +
                 lazy + hide + '>';
      }

      return '<article class="car-slide' + (video ? ' is-video' : '') + '" ' +
               'data-slide="' + i + '"' +
               (yt ? ' data-yt="' + this.esc(yt) + '"' : '') + '>' +
          media +
          '<div class="car-copy">' +
            (title ? '<h3>' + title + '</h3>' : '') +
            (sub ? '<p>' + sub + '</p>' : '') +
            (btn ? '<a class="btn btn-primary" href="' + this.esc(b.link || '#products') + '">' +
                   btn + '</a>' : '') +
          '</div>' +
          (video ? '<button class="car-play" data-play="' + i + '" ' +
                   'title="' + this.esc(Lang.t('car.play')) + '">' +
                   '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' : '') +
        '</article>';
    }).join('');

    dots.innerHTML = list.map((_, i) =>
      '<button class="car-dot' + (i === 0 ? ' on' : '') + '" data-dot="' + i + '"></button>'
    ).join('');

    this.carousel.index = 0;
    this.goSlide(0);
    this.startCarousel();
  },

  goSlide(i) {
    const list = this.banners || [];
    if (!list.length) return;
    const n = list.length;
    this.carousel.index = ((i % n) + n) % n;

    const track = this.$('#carTrack');
    const dir   = Lang.isUrdu() ? 1 : -1;
    track.style.transform = 'translateX(' + (dir * this.carousel.index * 100) + '%)';

    this.$$('#carDots .car-dot').forEach((d, k) =>
      d.classList.toggle('on', k === this.carousel.index));

    // stop any video that was playing on the slide we left
    this.$$('.car-slide').forEach((sl, k) => {
      if (k === this.carousel.index) return;
      sl.classList.remove('playing');
      const v = sl.querySelector('video');
      if (v) { v.pause(); v.currentTime = 0; }
      const f = sl.querySelector('iframe');
      if (f) f.remove();
    });
  },

  startCarousel() {
    this.stopCarousel();
    if ((this.banners || []).length < 2) return;
    this.carousel.timer = setInterval(() => {
      if (this.$('.car-slide.playing')) return;   // never interrupt a video
      this.goSlide(this.carousel.index + 1);
    }, 5200);
  },

  stopCarousel() {
    if (this.carousel.timer) clearInterval(this.carousel.timer);
    this.carousel.timer = null;
  },

  playSlide(i) {
    const slide = this.$('.car-slide[data-slide="' + i + '"]');
    if (!slide) return;
    slide.classList.add('playing');
    this.stopCarousel();

    const yt = slide.dataset.yt;
    if (yt) {
      const f = document.createElement('iframe');
      f.src = yt;
      f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      f.allowFullscreen = true;
      slide.insertBefore(f, slide.firstChild);
      return;
    }
    const v = slide.querySelector('video');
    if (v) { v.muted = false; v.controls = true; v.play().catch(() => {}); }
  },

  /* =========================================================
     REVIEWS
     ========================================================= */
  renderReviews() {
    const grid = this.$('#reviewGrid');
    if (!grid) return;

    if (!this.reviews.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' +
        '<div class="empty-ico">💬</div><h3>' + this.esc(Lang.t('rv.none')) + '</h3>' +
        '<p>' + this.esc(Lang.t('rv.noneSub')) + '</p></div>';
    } else {
      grid.innerHTML = this.reviews.slice(0, 8).map(r => {
        const text = Lang.pick(r, 'text') || r.textEn || r.textUr;
        const name = String(r.name || 'Customer');
        return '<article class="review-card">' +
          '<div class="review-top">' +
            '<div class="avatar">' + this.esc(name.trim().charAt(0).toUpperCase()) + '</div>' +
            '<div><div class="review-name">' + this.esc(name) + '</div>' +
            '<div class="review-date">' + this.esc(Lang.date(r.date)) + '</div></div>' +
          '</div>' +
          '<div class="stars">' + this.starString(r.rating) + '</div>' +
          '<p class="review-text">' + this.esc(text) + '</p>' +
        '</article>';
      }).join('');
    }

    const avg = this.reviews.length
      ? this.reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / this.reviews.length : 0;
    const av = this.$('#avgValue'), st = this.$('#avgStars');
    if (av) av.textContent = avg ? avg.toFixed(1) : '—';
    if (st) st.textContent = this.starString(Math.round(avg));
  },

  starString(n) {
    n = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  },

  /* =========================================================
     CART DRAWER
     ========================================================= */
  renderCart() {
    const body = this.$('#cartItems');
    const foot = this.$('#cartFoot');
    if (!body) return;

    const badge = this.$('#cartBadge');
    if (badge) {
      const c = Cart.count();
      badge.textContent = c;
      badge.style.display = c ? 'grid' : 'none';
      badge.classList.remove('pop');
      void badge.offsetWidth;
      if (c) badge.classList.add('pop');
    }

    if (Cart.isEmpty()) {
      body.innerHTML = '<div class="cart-empty"><div class="empty-ico">🛍️</div>' +
        '<h3>' + this.esc(Lang.t('cart.empty')) + '</h3>' +
        '<p>' + this.esc(Lang.t('cart.emptySub')) + '</p></div>';
      foot && foot.classList.add('hidden');
      return;
    }
    foot && foot.classList.remove('hidden');

    body.innerHTML = Cart.items.map(i => '' +
      '<div class="cart-item">' +
        '<img class="cart-thumb" src="' + this.esc(i.image) + '" alt="" ' +
          'onerror="this.src=\'assets/noor-logo.svg\'">' +
        '<div class="cart-info">' +
          '<div class="cart-name">' + this.esc(Lang.pick(i, 'name')) + '</div>' +
          '<div class="cart-price">' + this.esc(Lang.price(i.price * i.qty)) + '</div>' +
          '<div class="qty">' +
            '<button data-dec="' + this.esc(i.id) + '" aria-label="-">−</button>' +
            '<span>' + i.qty + '</span>' +
            '<button data-inc="' + this.esc(i.id) + '" aria-label="+">+</button>' +
          '</div>' +
          '<a class="remove-btn" data-del="' + this.esc(i.id) + '">' + this.esc(Lang.t('cart.remove')) + '</a>' +
        '</div>' +
      '</div>').join('');

    this.$('#sumSubtotal').textContent = Lang.price(Cart.subtotal());
    this.$('#sumDiscount').textContent = '− ' + Lang.price(Cart.discount());
    this.$('#sumShipping').textContent = Cart.shipping() ? Lang.price(Cart.shipping()) : Lang.t('cart.free');
    this.$('#sumTotal').textContent    = Lang.price(Cart.total());
  },

  openCart()  { this.$('#cartDrawer').classList.add('open'); this.$('#overlay').classList.add('show'); document.body.classList.add('no-scroll'); },
  closeCart() { this.$('#cartDrawer').classList.remove('open'); this.maybeHideOverlay(); },

  /* =========================================================
     MODALS
     ========================================================= */
  openModal(sel) {
    const m = this.$(sel);
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  },

  closeModal(sel) {
    const m = this.$(sel);
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    this.maybeHideOverlay();
  },

  closeAllModals() {
    this.$$('.modal.open').forEach(m => {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
    this.maybeHideOverlay();
  },

  maybeHideOverlay() {
    const anyOpen = this.$('.modal.open') || this.$('#cartDrawer').classList.contains('open');
    if (!anyOpen) {
      this.$('#overlay').classList.remove('show');
      document.body.classList.remove('no-scroll');
    }
  },

  /* =========================================================
     CHECKOUT
     ========================================================= */
  openCheckout() {
    if (Cart.isEmpty()) { this.toast(Lang.t('cart.empty'), 'error'); return; }
    this.closeCart();
    Profile.fillCheckoutForm();
    this.renderCheckoutSummary();
    this.renderPayInfo();
    this.openModal('#checkoutModal');
  },

  renderCheckoutSummary() {
    const box = this.$('#checkoutSummary');
    if (!box) return;
    box.innerHTML =
      Cart.items.map(i => '<div class="osum-row"><span>' + this.esc(Lang.pick(i, 'name')) +
        ' × ' + i.qty + '</span><b>' + this.esc(Lang.price(i.price * i.qty)) + '</b></div>').join('') +
      '<div class="osum-row"><span>' + this.esc(Lang.t('cart.subtotal')) + '</span><b>' +
        this.esc(Lang.price(Cart.subtotal())) + '</b></div>' +
      '<div class="osum-row"><span>' + this.esc(Lang.t('cart.shipping')) + '</span><b>' +
        this.esc(Cart.shipping() ? Lang.price(Cart.shipping()) : Lang.t('cart.free')) + '</b></div>' +
      '<div class="osum-row total"><span>' + this.esc(Lang.t('cart.total')) + '</span><b>' +
        this.esc(Lang.price(Cart.total())) + '</b></div>';
  },

  selectedPayment() {
    const el = this.$('input[name="payment"]:checked');
    return el ? el.value : 'COD';
  },

  renderPayInfo() {
    const box = this.$('#payInfo');
    if (!box) return;
    const method = this.selectedPayment();

    if (method === 'COD') {
      box.innerHTML = '<b>💵 ' + this.esc(Lang.t('co.cod')) + '</b><br>' + this.esc(Lang.t('co.codNote'));
      return;
    }
    const acc = CONFIG.PAYMENT_ACCOUNTS[method.toLowerCase()] || { title: '—', number: '—' };
    box.innerHTML =
      '<b>' + this.esc(Lang.t('co.instructions')) + '</b><br>' +
      this.esc(Lang.t('co.sendTo')) + '<br>' +
      this.esc(Lang.t('co.accountTitle')) + ': <b>' + this.esc(acc.title) + '</b><br>' +
      this.esc(Lang.t('co.accountNumber')) + ': <b>' + this.esc(acc.number) + '</b><br>' +
      this.esc(Lang.t('cart.total')) + ': <b>' + this.esc(Lang.price(Cart.total())) + '</b>';
  },

  validateCheckout(form) {
    let ok = true;
    const fail = (field, msg) => {
      const wrap = field.closest('.field');
      wrap.classList.add('invalid');
      const err = wrap.querySelector('.err');
      if (err) err.textContent = msg;
      ok = false;
    };
    this.$$('.field', form).forEach(f => {
      f.classList.remove('invalid');
      const e = f.querySelector('.err');
      if (e) e.textContent = '';
    });

    ['name', 'city', 'address'].forEach(n => {
      const f = form.elements[n];
      if (!f.value.trim()) fail(f, Lang.t('g.required'));
    });

    const phone = form.elements.phone;
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) fail(phone, Lang.t('g.badPhone'));

    const email = form.elements.email;
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
      fail(email, Lang.t('g.badEmail'));

    return ok;
  },

  async submitOrder(form) {
    if (!this.validateCheckout(form)) return;

    const btn = this.$('#placeOrderBtn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = Lang.t('co.placing');

    const order = {
      name    : form.elements.name.value.trim(),
      phone   : form.elements.phone.value.trim(),
      email   : form.elements.email.value.trim(),
      city    : form.elements.city.value.trim(),
      address : form.elements.address.value.trim(),
      notes   : form.elements.notes.value.trim(),
      payment : this.selectedPayment(),
      items   : Cart.toOrderItems(),
      subtotal: Cart.subtotal(),
      shipping: Cart.shipping(),
      total   : Cart.total(),
      lang    : Lang.current
    };

    let res;
    try {
      res = await API.placeOrder(order);
    } catch (err) {
      console.error(err);
      this.toast(Lang.t('g.error') + ': ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = original;
      return;
    }

    const days = res.deliveryDays || this.settings.DeliveryDays || CONFIG.DELIVERY_DAYS;
    const record = Object.assign({}, order, {
      orderId: res.orderId,
      date   : new Date().toISOString().slice(0, 10),
      status : 'Pending',
      items  : Cart.toText()
    });

    Profile.saveFromOrder(order);
    Profile.rememberOrder(record);
    this.lastOrder = record;

    // confirmation screen
    this.$('#orderIdOut').textContent = res.orderId;
    this.$('#deliveryDaysOut').textContent = days;
    this.$('#orderWaBtn').href = this.waLink(this.orderMessage(record, days));

    Cart.clear();
    btn.disabled = false;
    btn.textContent = original;
    this.closeModal('#checkoutModal');
    this.openModal('#successModal');
    this.toast(Lang.isUrdu() ? 'آرڈر کامیابی سے دیا گیا' : 'Order placed successfully', 'success');
  },

  orderMessage(o, days) {
    if (Lang.isUrdu()) {
      return 'السلام علیکم نور ایکسیسریز!\n' +
        'آرڈر نمبر: ' + o.orderId + '\n' +
        'نام: ' + o.name + '\nفون: ' + o.phone + '\n' +
        'پتہ: ' + o.address + ', ' + o.city + '\n\n' +
        'اشیاء:\n' + o.items + '\n\n' +
        'کل: ' + Lang.price(o.total) + '\n' +
        'ادائیگی: ' + o.payment + '\n' +
        'ترسیل: ' + days + ' دن میں\nشکریہ!';
    }
    return 'Hello Noor Accessories!\n' +
      'Order ID: ' + o.orderId + '\n' +
      'Name: ' + o.name + '\nPhone: ' + o.phone + '\n' +
      'Address: ' + o.address + ', ' + o.city + '\n\n' +
      'Items:\n' + o.items + '\n\n' +
      'Total: ' + Lang.price(o.total) + '\n' +
      'Payment: ' + o.payment + '\n' +
      'Delivery: within ' + days + ' days\nThank you!';
  },

  /* =========================================================
     RE-RENDER EVERYTHING (used after a language switch)
     ========================================================= */
  renderAll() {
    this.renderCarousel();
    this.renderCategories();
    this.renderProducts();
    this.renderReviews();
    this.renderCart();
    this.refreshWaLinks();
    this.renderStaticBits();
    if (this.$('#checkoutModal').classList.contains('open')) {
      this.renderCheckoutSummary();
      this.renderPayInfo();
    }
    Profile.renderOrders();
    Profile.renderWishlist();
  },

  renderStaticBits() {
    const ur = Lang.isUrdu();
    const name = ur ? (this.settings.StoreNameUR || CONFIG.STORE_NAME_UR)
                    : (this.settings.StoreNameEN || CONFIG.STORE_NAME_EN);
    const parts = String(name).split(' ');

    const bn = this.$('#brandName'), bs = this.$('#brandSub');
    if (bn) bn.textContent = parts[0] || name;
    if (bs) bs.textContent = parts.slice(1).join(' ') || '';

    const ht = this.$('#heroTitle');
    if (ht) ht.textContent = name;
    const hg = this.$('#heroTagline');
    if (hg) hg.textContent = ur ? CONFIG.TAGLINE_UR : CONFIG.TAGLINE_EN;

    const fb = this.$('#footBrand');
    if (fb) fb.textContent = parts[0] || name;
    const cb = this.$('#copyBrand');
    if (cb) cb.textContent = name;

    const hpc = this.$('#heroProductCount');
    if (hpc) hpc.textContent = this.products.length ? this.products.length + '+' : '50+';
    const hd = this.$('#heroDays');
    if (hd) hd.textContent = this.settings.DeliveryDays || CONFIG.DELIVERY_DAYS;

    const y = this.$('#year');
    if (y) y.textContent = new Date().getFullYear();

    ['#soIg::INSTAGRAM', '#soFb::FACEBOOK', '#soTt::TIKTOK'].forEach(pair => {
      const bits = pair.split('::');
      const el = this.$(bits[0]);
      if (el) el.href = CONFIG[bits[1]] || '#';
    });

    const adEmail = this.$('#footAdEmail');
    if (adEmail && CONFIG.AD_EMAIL) {
      adEmail.textContent = CONFIG.AD_EMAIL;
      adEmail.href = 'mailto:' + CONFIG.AD_EMAIL;
    }
  }
};

window.UI = UI;
