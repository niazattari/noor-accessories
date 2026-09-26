/* ===========================================================
   Noor Accessories – Customer profile
   Profile info, order history, reviews, wishlist
   (browser storage + Google Sheets when connected)
   =========================================================== */

const Profile = {

  data: { name: '', phone: '', email: '', city: '', address: '', lang: 'en' },
  orders: [],
  rating: 5,

  /* ---------- storage ---------- */
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.KEYS.profile) || 'null');
      if (saved) this.data = Object.assign(this.data, saved);
    } catch (e) {}
    try {
      this.orders = JSON.parse(localStorage.getItem(CONFIG.KEYS.orders) || '[]');
      if (!Array.isArray(this.orders)) this.orders = [];
    } catch (e) { this.orders = []; }
  },

  save() {
    try { localStorage.setItem(CONFIG.KEYS.profile, JSON.stringify(this.data)); } catch (e) {}
  },

  saveOrders() {
    try { localStorage.setItem(CONFIG.KEYS.orders, JSON.stringify(this.orders)); } catch (e) {}
  },

  /* ---------- wishlist ---------- */
  wishlist() {
    try {
      const w = JSON.parse(localStorage.getItem(CONFIG.KEYS.wishlist) || '[]');
      return Array.isArray(w) ? w : [];
    } catch (e) { return []; }
  },

  toggleWish(id) {
    let w = this.wishlist();
    const i = w.indexOf(id);
    if (i === -1) w.push(id); else w.splice(i, 1);
    try { localStorage.setItem(CONFIG.KEYS.wishlist, JSON.stringify(w)); } catch (e) {}
    return i === -1;
  },

  renderWishlist() {
    const box = UI.$('#wishlistList');
    if (!box) return;
    const ids = this.wishlist();
    const items = UI.products.filter(p => ids.indexOf(p.id) !== -1);

    if (!items.length) {
      box.innerHTML = '<div class="empty-state"><div class="empty-ico">💖</div><h3>' +
        UI.esc(Lang.t('pf.emptyWish')) + '</h3></div>';
      return;
    }
    box.innerHTML = items.map(p => '<div class="order-item">' +
      '<div class="order-head">' +
        '<b>' + UI.esc(Lang.pick(p, 'name')) + '</b>' +
        '<span class="order-total">' + UI.esc(Lang.price(p.price)) + '</span>' +
      '</div>' +
      '<div class="order-head" style="margin-top:.4rem">' +
        '<button class="btn btn-primary btn-sm" data-add="' + UI.esc(p.id) + '">' +
          UI.esc(Lang.t('prod.addToCart')) + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-wish="' + UI.esc(p.id) + '">' +
          UI.esc(Lang.t('g.delete')) + '</button>' +
      '</div></div>').join('');
  },

  /* ---------- profile form ---------- */
  fillProfileForm() {
    const f = UI.$('#profileForm');
    if (!f) return;
    f.elements.name.value    = this.data.name || '';
    f.elements.phone.value   = this.data.phone || '';
    f.elements.email.value   = this.data.email || '';
    f.elements.city.value    = this.data.city || '';
    f.elements.address.value = this.data.address || '';
    const radio = f.querySelector('input[name="lang"][value="' + (this.data.lang || Lang.current) + '"]');
    if (radio) radio.checked = true;
  },

  fillCheckoutForm() {
    const f = UI.$('#checkoutForm');
    if (!f) return;
    ['name', 'phone', 'email', 'city', 'address'].forEach(k => {
      if (f.elements[k] && !f.elements[k].value) f.elements[k].value = this.data[k] || '';
    });
  },

  async saveProfileForm(form) {
    this.data.name    = form.elements.name.value.trim();
    this.data.phone   = form.elements.phone.value.trim();
    this.data.email   = form.elements.email.value.trim();
    this.data.city    = form.elements.city.value.trim();
    this.data.address = form.elements.address.value.trim();
    const langEl = form.querySelector('input[name="lang"]:checked');
    this.data.lang = langEl ? langEl.value : Lang.current;
    this.save();

    if (this.data.lang !== Lang.current) Lang.apply(this.data.lang);

    UI.toast(Lang.t('pf.saved'), 'success');
    if (this.data.phone) {
      try { await API.saveUser(this.data); } catch (e) { console.warn('saveUser failed', e.message); }
    }
  },

  /** Remember the details a customer typed at checkout. */
  saveFromOrder(order) {
    this.data.name    = order.name    || this.data.name;
    this.data.phone   = order.phone   || this.data.phone;
    this.data.email   = order.email   || this.data.email;
    this.data.city    = order.city    || this.data.city;
    this.data.address = order.address || this.data.address;
    this.data.lang    = Lang.current;
    this.save();
    this.fillProfileForm();
  },

  rememberOrder(record) {
    this.orders.unshift(record);
    this.orders = this.orders.slice(0, 40);
    this.saveOrders();
    this.renderOrders();
  },

  /* ---------- orders ---------- */
  async refreshOrders() {
    if (!this.data.phone) { UI.toast(Lang.t('co.phone') + ' — ' + Lang.t('g.required'), 'error'); return; }
    if (!API.connected)  { UI.toast(Lang.t('g.demoMode')); return; }
    try {
      const remote = await API.ordersFor(this.data.phone);
      if (remote.length) {
        this.orders = remote.map(o => ({
          orderId: o.orderId, date: o.date, items: o.items,
          total: o.total, status: o.status, payment: o.payment,
          name: o.name, phone: o.phone, city: o.city, address: o.address
        }));
        this.saveOrders();
      }
      this.renderOrders();
      UI.toast(Lang.t('g.success'), 'success');
    } catch (err) {
      UI.toast(Lang.t('g.offline'), 'error');
    }
  },

  renderOrders() {
    const box = UI.$('#ordersList');
    if (!box) return;

    if (!this.orders.length) {
      box.innerHTML = '<div class="empty-state"><div class="empty-ico">📦</div><h3>' +
        UI.esc(Lang.t('pf.noOrders')) + '</h3><p>' + UI.esc(Lang.t('pf.noOrdersSub')) + '</p></div>';
      return;
    }

    box.innerHTML = this.orders.map(o => {
      const cls = String(o.status || 'pending').toLowerCase();
      return '<div class="order-item">' +
        '<div class="order-head">' +
          '<span class="order-code">' + UI.esc(o.orderId) + '</span>' +
          '<span class="pill ' + UI.esc(cls) + '">' + UI.esc(Lang.status(o.status)) + '</span>' +
        '</div>' +
        '<div class="order-line">' + UI.esc(Lang.t('pf.orderDate')) + ': ' + UI.esc(Lang.date(o.date)) + '</div>' +
        '<div class="order-line">' + UI.esc(Lang.t('pf.items')) + ': ' + UI.esc(o.items) + '</div>' +
        '<div class="order-head" style="margin-top:.5rem">' +
          '<span class="order-line">' + UI.esc(o.payment || '') + '</span>' +
          '<span class="order-total">' + UI.esc(Lang.price(o.total)) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  },

  /* ---------- reviews ---------- */
  setRating(n) {
    this.rating = Math.max(1, Math.min(5, Number(n) || 5));
    UI.$$('#starPicker span').forEach(s => {
      s.classList.toggle('on', Number(s.dataset.v) <= this.rating);
    });
  },

  async submitReview(form) {
    const text = form.elements.text.value.trim();
    if (!text) { UI.toast(Lang.t('g.required'), 'error'); return; }

    const review = {
      name  : this.data.name || (Lang.isUrdu() ? 'گاہک' : 'Customer'),
      phone : this.data.phone || '',
      rating: this.rating,
      text  : text,
      lang  : Lang.current
    };

    try {
      await API.addReview(review);
    } catch (err) {
      console.warn('review failed', err.message);
    }

    // show it immediately at the top of the reviews section
    UI.reviews.unshift({
      id: 'local-' + Date.now(), name: review.name, rating: review.rating,
      date: new Date().toISOString().slice(0, 10),
      textEn: Lang.isUrdu() ? '' : text,
      textUr: Lang.isUrdu() ? text : ''
    });
    UI.renderReviews();

    form.reset();
    this.setRating(5);
    UI.toast(Lang.t('pf.thanks'), 'success');
  },

  open(tab) {
    this.fillProfileForm();
    this.renderOrders();
    this.renderWishlist();
    this.setRating(this.rating);
    if (tab) this.switchTab(tab);
    UI.openModal('#profileModal');
  },

  switchTab(name) {
    UI.$$('#profileTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    UI.$$('#profileModal .tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  }
};

window.Profile = Profile;
