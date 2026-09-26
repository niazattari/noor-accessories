/* ===========================================================
   Noor Accessories – Admin dashboard
   Full product control: add, edit, delete, quick stock edit.
   Orders, customers, reviews, CSV export. Bilingual EN/UR.
   =========================================================== */

(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  var FALLBACK = "this.onerror=null;this.src='assets/noor-logo.svg';this.style.objectFit='contain';this.style.padding='22%'";
  var SESSION_KEY = 'noor_admin_session';
  var STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Completed', 'Cancelled'];

  var Admin = {

    creds : { user: '', pass: '' },
    data  : { products: [], orders: [], users: [], reviews: [], banners: [], stats: {} },
    filter: { prodText: '', prodCat: 'all', orderText: '', orderStatus: 'all', custText: '' },
    editingId: null,
    editingBanner: null,
    pendingDelete: null,
    pendingKind: 'product',

    /* =======================================================
       small helpers
       ======================================================= */
    toast: function (msg, type) {
      var el = document.createElement('div');
      el.className = 'toast ' + (type || '');
      el.textContent = msg;
      $('#toastWrap').appendChild(el);
      setTimeout(function () {
        el.classList.add('out');
        setTimeout(function () { el.remove(); }, 300);
      }, 2600);
    },

    openModal: function (sel) {
      var m = $(sel);
      m.classList.add('open');
      m.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    },

    closeModal: function (sel) {
      var m = $(sel);
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
      if (!$('.modal.open')) document.body.classList.remove('no-scroll');
    },

    waLink: function (phone, text) {
      var n = String(phone || '').replace(/\D/g, '');
      if (n.length === 11 && n.charAt(0) === '0') n = '92' + n.slice(1);
      return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
    },

    /* =======================================================
       session + login
       ======================================================= */
    saveSession: function () {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.creds)); } catch (e) {}
    },
    loadSession: function () {
      try {
        var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (s && s.user) { this.creds = s; return true; }
      } catch (e) {}
      return false;
    },

    login: function (user, pass) {
      var self = this;
      var err = $('#loginErr');
      err.textContent = '';
      return API.adminLogin(user, pass).then(function (res) {
        if (!res.ok) { err.textContent = Lang.t('ad.invalid'); return; }
        self.creds = { user: user, pass: pass };
        self.saveSession();
        self.enterDashboard();
        if (res.offline) self.toast(Lang.t('g.offline'), 'error');
      }).catch(function () { err.textContent = Lang.t('ad.invalid'); });
    },

    logout: function () {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      $('#adminShell').classList.add('hidden');
      $('#loginScreen').classList.remove('hidden');
      $('#loginForm').reset();
    },

    enterDashboard: function () {
      $('#loginScreen').classList.add('hidden');
      $('#adminShell').classList.remove('hidden');
      $('#demoBar').classList.toggle('hidden', API.connected);
      return this.refresh();
    },

    /* =======================================================
       data
       ======================================================= */
    refresh: function () {
      var self = this;
      return Promise.resolve(API.adminData(this.creds.user, this.creds.pass))
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || 'failed');
          self.load(d);
        })
        .catch(function () {
          // The sheet is unreachable. Show the built-in catalogue rather than an
          // empty dashboard, and make it obvious nothing here is live.
          self.toast(Lang.t('g.offline'), 'error');
          $('#demoBar').classList.remove('hidden');
          if (window.DEMO) self.load(DEMO.admin());
        });
    },

    load: function (d) {
      this.data = {
        products: d.products || [], orders: d.orders || [],
        users   : d.users    || [], reviews: d.reviews || [],
        banners : d.banners  || [],
        stats   : d.stats    || {}
      };
      this.renderAll();
    },

    renderAll: function () {
      this.renderCounts();
      this.renderStats();
      this.renderOverview();
      this.renderProducts();
      this.renderBanners();
      this.renderOrders();
      this.renderCustomers();
      this.renderReviews();
      this.fillSelects();
      Lang.translateDOM();
    },

    renderCounts: function () {
      $('#cProducts').textContent  = this.data.products.length;
      $('#cOrders').textContent    = this.data.orders.length;
      $('#cCustomers').textContent = this.data.users.length;
      $('#cReviews').textContent   = this.data.reviews.length;
      $('#cBanners').textContent   = this.data.banners.length;
    },

    renderStats: function () {
      var s = this.data.stats || {};
      $('#statProducts').textContent  = s.products  || 0;
      $('#statOrders').textContent    = s.orders    || 0;
      $('#statCustomers').textContent = s.customers || 0;
      $('#statRevenue').textContent   = Lang.price(s.revenue || 0);
      $('#statRating').textContent    = (s.rating || 0) + ' ★';
      $('#statPending').textContent   = s.pending   || 0;
    },

    empty: function (icon, text) {
      return '<div class="empty-block"><div class="empty-ico">' + icon + '</div>' + esc(text) + '</div>';
    },

    /* =======================================================
       overview
       ======================================================= */
    renderOverview: function () {
      var self = this;

      var recent = this.data.orders.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      }).slice(0, 5);

      $('#recentOrders').innerHTML = recent.length ? recent.map(function (o) {
        var cls = String(o.status || 'pending').toLowerCase();
        return '<div class="mini-row">' +
          '<div class="mini-main"><b>' + esc(o.name) + '</b>' +
            '<span>' + esc(o.orderId) + ' · ' + esc(Lang.date(o.date)) + '</span></div>' +
          '<div class="mini-end"><b>' + esc(Lang.price(o.total)) + '</b><br>' +
            '<span class="pill ' + esc(cls) + '">' + esc(Lang.status(o.status)) + '</span></div>' +
        '</div>';
      }).join('') : this.empty('📦', Lang.t('ad.noData'));

      var low = this.data.products.filter(function (p) { return Number(p.stock) <= 5; })
        .sort(function (a, b) { return a.stock - b.stock; }).slice(0, 5);

      $('#lowStock').innerHTML = low.length ? low.map(function (p) {
        return '<div class="mini-row">' +
          '<img src="' + esc(p.image) + '" alt="" onerror="' + FALLBACK + '">' +
          '<div class="mini-main"><b>' + esc(Lang.pick(p, 'name')) + '</b>' +
            '<span>' + esc(p.category) + '</span></div>' +
          '<div class="mini-end"><b style="color:' + (p.stock <= 0 ? '#d93025' : '#8a6100') + '">' +
            esc(p.stock) + ' ' + esc(Lang.t('ad.left')) + '</b></div>' +
        '</div>';
      }).join('') : this.empty('✅', Lang.t('ad.allGood'));
    },

    /* =======================================================
       products
       ======================================================= */
    visibleProducts: function () {
      var q = this.filter.prodText.toLowerCase();
      var cat = this.filter.prodCat;
      return this.data.products.filter(function (p) {
        if (cat !== 'all' && p.category !== cat) return false;
        if (!q) return true;
        return [p.id, p.nameEn, p.nameUr, p.category].some(function (v) {
          return String(v || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    },

    renderProducts: function () {
      var list = this.visibleProducts();
      var grid = $('#productsGrid');

      if (!list.length) {
        grid.innerHTML = this.empty('🔍', this.data.products.length ? Lang.t('ad.noResults') : Lang.t('ad.noData'));
        return;
      }

      grid.innerHTML = list.map(function (p) {
        var stock = Number(p.stock) || 0;
        var scls  = stock <= 0 ? 'out' : (stock <= 5 ? 'low' : '');
        var slabel = stock <= 0 ? Lang.t('prod.outOfStock') : (stock + ' ' + Lang.t('ad.left'));
        return '<article class="pcard">' +
          '<div class="pcard-media">' +
            '<img src="' + esc(p.image) + '" alt="" loading="lazy" onerror="' + FALLBACK + '">' +
            (p.discount ? '<span class="pcard-disc">-' + esc(p.discount) + '%</span>' : '') +
            '<span class="pcard-stock ' + scls + '">' + esc(slabel) + '</span>' +
          '</div>' +
          '<div class="pcard-body">' +
            '<span class="pcard-cat">' + esc(p.category) + '</span>' +
            '<h4 class="pcard-name">' + esc(Lang.pick(p, 'name')) + '</h4>' +
            '<span class="pcard-id">' + esc(p.id) + '</span>' +
            '<div class="pcard-price"><b>' + esc(Lang.price(p.price)) + '</b>' +
              (p.original > p.price ? '<s>' + esc(Lang.price(p.original)) + '</s>' : '') + '</div>' +
            '<div class="stock-row">' + esc(Lang.t('ad.quickStock')) +
              '<input type="number" min="0" value="' + esc(stock) + '" data-stock="' + esc(p.id) + '">' +
              '<span>· ' + esc(p.sold || 0) + ' ' + esc(Lang.t('ad.sold')) + '</span>' +
            '</div>' +
            '<div class="pcard-actions">' +
              '<button class="btn btn-outline" data-edit="' + esc(p.id) + '">' + esc(Lang.t('g.edit')) + '</button>' +
              '<button class="btn btn-ghost" data-del="' + esc(p.id) + '">' + esc(Lang.t('g.delete')) + '</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    },

    fillSelects: function () {
      var cats = [];
      this.data.products.forEach(function (p) {
        if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
      });

      var sel = $('#prodCat');
      sel.innerHTML = '<option value="all">' + esc(Lang.t('ad.allCats')) + '</option>' +
        cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
      sel.value = this.filter.prodCat;

      $('#catList').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');

      var os = $('#orderStatus');
      os.innerHTML = '<option value="all">' + esc(Lang.t('ad.allStatus')) + '</option>' +
        STATUSES.map(function (s) {
          return '<option value="' + s + '">' + esc(Lang.status(s)) + '</option>';
        }).join('');
      os.value = this.filter.orderStatus;
    },

    /* =======================================================
       carousel slides
       ======================================================= */
    renderBanners: function () {
      var list = this.data.banners || [];
      var grid = $('#bannersGrid');
      if (!grid) return;

      if (!list.length) {
        grid.innerHTML = this.empty('🖼️', Lang.t('ad.noBanners'));
        return;
      }

      grid.innerHTML = list.map(function (b, i) {
        var isVideo = String(b.type).toLowerCase() === 'video';
        var still   = b.poster || (isVideo ? '' : b.media);
        return '<article class="pcard">' +
          '<div class="bcard-media">' +
            (still ? '<img src="' + esc(still) + '" alt="" onerror="' + FALLBACK + '">' : '') +
            '<span class="bcard-type">' + (isVideo ? '🎬 ' : '🖼️ ') +
              esc(Lang.t(isVideo ? 'ad.typeVideo' : 'ad.typeImage')) + '</span>' +
            '<span class="bcard-pos">' + esc(b.order || i + 1) + '</span>' +
          '</div>' +
          '<div class="pcard-body">' +
            '<h4 class="pcard-name">' + esc(Lang.pick(b, 'title')) + '</h4>' +
            '<p class="bcard-sub">' + esc(Lang.pick(b, 'sub')) + '</p>' +
            '<span class="pcard-id">' + esc(b.id) + '</span>' +
            '<div class="pcard-actions">' +
              '<button class="btn btn-outline" data-bedit="' + esc(b.id) + '">' +
                esc(Lang.t('g.edit')) + '</button>' +
              '<button class="btn btn-ghost" data-bdel="' + esc(b.id) + '">' +
                esc(Lang.t('g.delete')) + '</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    },

    openBannerForm: function (id) {
      var f = $('#bannerForm');
      f.reset();
      f.elements.id.value = '';        // hidden inputs survive reset()
      this.editingBanner = id || null;

      $('#bfTitle').textContent = Lang.t(id ? 'ad.editBanner' : 'ad.newBanner');
      $('#bfHint').textContent  = API.connected ? '' : Lang.t('ad.demoNote');

      if (id) {
        var b = this.data.banners.filter(function (x) { return String(x.id) === String(id); })[0];
        if (b) {
          f.elements.id.value      = b.id;
          f.elements.titleEn.value = b.titleEn || '';
          f.elements.titleUr.value = b.titleUr || '';
          f.elements.subEn.value   = b.subEn || '';
          f.elements.subUr.value   = b.subUr || '';
          f.elements.media.value   = b.media || '';
          f.elements.poster.value  = b.poster || '';
          f.elements.btnEn.value   = b.btnEn || '';
          f.elements.btnUr.value   = b.btnUr || '';
          f.elements.link.value    = b.link || '#products';
          f.elements.order.value   = b.order || 1;
          var radio = f.querySelector('input[name="type"][value="' +
            (String(b.type).toLowerCase() === 'video' ? 'video' : 'image') + '"]');
          if (radio) radio.checked = true;
        }
      } else {
        f.elements.order.value = (this.data.banners.length || 0) + 1;
      }
      this.togglePoster();
      this.openModal('#bannerFormModal');
    },

    togglePoster: function () {
      var f = $('#bannerForm');
      var t = f.querySelector('input[name="type"]:checked');
      $('#posterField').classList.toggle('hidden', !t || t.value !== 'video');
    },

    saveBanner: function (form) {
      var self = this;
      var t = form.querySelector('input[name="type"]:checked');
      var b = {
        id     : this.editingBanner || undefined,
        type   : t ? t.value : 'image',
        titleEn: form.elements.titleEn.value.trim(),
        titleUr: form.elements.titleUr.value.trim(),
        subEn  : form.elements.subEn.value.trim(),
        subUr  : form.elements.subUr.value.trim(),
        media  : form.elements.media.value.trim(),
        poster : form.elements.poster.value.trim(),
        btnEn  : form.elements.btnEn.value.trim(),
        btnUr  : form.elements.btnUr.value.trim(),
        link   : form.elements.link.value.trim() || '#products',
        order  : Number(form.elements.order.value) || 1
      };
      if (!b.titleEn || !b.media) { this.toast(Lang.t('ad.required'), 'error'); return; }

      var btn = $('#bfSave'), label = btn.textContent;
      btn.disabled = true; btn.textContent = Lang.t('ad.saving');

      var editing = !!this.editingBanner;
      var call = editing
        ? API.updateBanner(b, this.creds.user, this.creds.pass)
        : API.addBanner(b, this.creds.user, this.creds.pass);

      Promise.resolve(call).then(function (res) {
        if (res && res.demo) {
          if (editing) {
            self.data.banners = self.data.banners.map(function (x) {
              return String(x.id) === String(b.id) ? Object.assign({}, x, b) : x;
            });
          } else {
            var taken = self.data.banners.map(function (x) { return String(x.id); });
            var n = 1;
            while (!b.id || taken.indexOf(String(b.id)) !== -1) { b.id = 'B' + String(Date.now()).slice(-4) + n; n++; }
            self.data.banners.push(b);
          }
          self.data.banners.sort(function (x, y) { return (x.order || 0) - (y.order || 0); });
          self.renderAll();
          self.toast(Lang.t('ad.demoNote'));
        } else {
          self.toast(Lang.t('ad.bannerSaved'), 'success');
          return self.refresh();
        }
      }).catch(function (e) {
        self.toast(Lang.t('g.error') + ': ' + e.message, 'error');
      }).then(function () {
        btn.disabled = false; btn.textContent = label;
        self.closeModal('#bannerFormModal');
      });
    },

    /* =======================================================
       push the catalogue into the Google Sheet
       ======================================================= */
    askPush: function () {
      if (!API.connected) { this.toast(Lang.t('ad.pushNeedsSheet'), 'error'); return; }
      this.pendingDelete = 'catalogue';
      this.pendingKind = 'push';
      $('#confirmTitle').textContent = Lang.t('ad.confirmPush');
      $('#confirmName').textContent  = (window.DEMO ? DEMO.products.length : 0) + ' ' +
                                       Lang.t('ad.tabProducts');
      $('#confirmYes').textContent   = Lang.t('ad.yesReplace');
      this.openModal('#confirmModal');
    },

    pushCatalogue: function () {
      var self = this;
      var btn = $('#pushSheetBtn'), label = btn.textContent;
      btn.disabled = true; btn.textContent = Lang.t('ad.pushing');

      var list = window.DEMO ? DEMO.products : [];

      Promise.resolve(API.importProducts(list, this.creds.user, this.creds.pass, true))
        .then(function (res) {
          var n = res && res.added ? ' (' + res.added + ')' : '';
          self.toast(Lang.t('ad.pushDone') + n, 'success');
          return self.refresh();
        })
        .catch(function (e) { self.toast(Lang.t('g.error') + ': ' + e.message, 'error'); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    },

    /* =======================================================
       orders
       ======================================================= */
    renderOrders: function () {
      var self = this;
      var q = this.filter.orderText.toLowerCase();
      var st = this.filter.orderStatus;

      var list = this.data.orders.filter(function (o) {
        if (st !== 'all' && String(o.status).toLowerCase() !== st.toLowerCase()) return false;
        if (!q) return true;
        return [o.orderId, o.name, o.phone, o.city].some(function (v) {
          return String(v || '').toLowerCase().indexOf(q) !== -1;
        });
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

      if (!list.length) {
        $('#ordersList').innerHTML = this.empty('📦', this.data.orders.length ? Lang.t('ad.noResults') : Lang.t('ad.noData'));
        return;
      }

      $('#ordersList').innerHTML = list.map(function (o) {
        var cls = String(o.status || 'pending').toLowerCase();
        var msg = Lang.isUrdu()
          ? 'السلام علیکم ' + o.name + '! نور ایکسیسریز سے آپ کے آرڈر ' + o.orderId + ' کے بارے میں۔'
          : 'Hello ' + o.name + '! Regarding your Noor Accessories order ' + o.orderId + '.';
        return '<article class="order-card">' +
          '<div class="oc-top">' +
            '<span class="oc-id">' + esc(o.orderId) + '</span>' +
            '<span class="pill ' + esc(cls) + '">' + esc(Lang.status(o.status)) + '</span>' +
            '<span class="oc-date">' + esc(Lang.date(o.date)) + '</span>' +
          '</div>' +
          '<div class="oc-grid">' +
            '<div>' +
              '<div class="oc-line"><b>' + esc(o.name) + '</b></div>' +
              '<div class="oc-line oc-phone">' + esc(o.phone) + '</div>' +
              '<div class="oc-line"><span>' + esc(o.city || '') + '</span></div>' +
            '</div>' +
            '<div>' +
              '<div class="oc-line">' + esc(o.items) + '</div>' +
              '<div class="oc-line"><span>' + esc(o.payment || '') + '</span></div>' +
            '</div>' +
            '<div class="oc-end">' +
              '<span class="oc-total">' + esc(Lang.price(o.total)) + '</span>' +
              '<select class="status-select" data-status="' + esc(o.orderId) + '">' +
                STATUSES.map(function (s) {
                  return '<option value="' + s + '"' +
                    (String(o.status).toLowerCase() === s.toLowerCase() ? ' selected' : '') + '>' +
                    esc(Lang.status(s)) + '</option>';
                }).join('') +
              '</select>' +
              '<a class="wa-mini" target="_blank" rel="noopener" href="' + esc(self.waLink(o.phone, msg)) + '">' +
                '<svg viewBox="0 0 24 24"><path d="M20 3.9A10 10 0 0 0 3.5 16.2L2 22l6-1.5A10 10 0 1 0 20 3.9zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-3.4.9.9-3.3-.2-.3A8 8 0 1 1 12 20z"/></svg>' +
                esc(Lang.t('ad.waCustomer')) + '</a>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    },

    /* =======================================================
       customers + reviews
       ======================================================= */
    renderCustomers: function () {
      var q = this.filter.custText.toLowerCase();
      var list = this.data.users.filter(function (u) {
        if (!q) return true;
        return [u.Name || u.name, u.Phone || u.phone, u.Email || u.email, u.City || u.city]
          .some(function (v) { return String(v || '').toLowerCase().indexOf(q) !== -1; });
      });

      var head = [Lang.t('pf.name'), Lang.t('pf.phone'), Lang.t('pf.email'),
                  Lang.t('pf.city'), Lang.t('ad.totalOrders'), ''];

      var body = list.length ? list.map(function (u) {
        var phone = u.Phone || u.phone || '';
        return '<tr>' +
          '<td><b>' + esc(u.Name || u.name || '') + '</b></td>' +
          '<td class="num">' + esc(phone) + '</td>' +
          '<td class="num">' + esc(u.Email || u.email || '—') + '</td>' +
          '<td>' + esc(u.City || u.city || '—') + '</td>' +
          '<td class="num">' + esc(u.OrdersCount || u.orders || 0) + '</td>' +
          '<td><a class="wa-mini" target="_blank" rel="noopener" href="' +
            esc(Admin.waLink(phone, '')) + '">WhatsApp</a></td>' +
        '</tr>';
      }).join('')
        : '<tr><td colspan="6"><div class="table-empty">' + esc(Lang.t('ad.noResults')) + '</div></td></tr>';

      $('#customersTable').innerHTML =
        '<thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + body + '</tbody>';
    },

    renderReviews: function () {
      var list = this.data.reviews;
      $('#reviewsList').innerHTML = list.length ? list.map(function (r) {
        var n = Math.max(0, Math.min(5, Number(r.rating) || 0));
        var name = String(r.name || 'Customer');
        return '<article class="rv-card">' +
          '<div class="rv-top">' +
            '<div class="avatar">' + esc(name.trim().charAt(0).toUpperCase()) + '</div>' +
            '<div><div class="rv-name">' + esc(name) + '</div>' +
            '<div class="rv-date">' + esc(Lang.date(r.date)) + '</div></div>' +
          '</div>' +
          '<div class="stars">' + '★★★★★'.slice(0, n) + '</div>' +
          '<p class="review-text">' + esc(r.textEn || r.textUr || '') + '</p>' +
        '</article>';
      }).join('') : this.empty('💬', Lang.t('ad.noData'));
    },

    /* =======================================================
       add / edit product
       ======================================================= */
    openProductForm: function (id) {
      var f = $('#productForm');
      f.reset();
      f.elements.id.value = '';   // hidden inputs keep their value through reset()
      this.editingId = id || null;

      $('#pfTitle').textContent = Lang.t(id ? 'ad.editProduct' : 'ad.newProduct');
      $('#pfHint').textContent  = API.connected ? '' : Lang.t('ad.demoNote');

      if (id) {
        var p = this.data.products.filter(function (x) { return String(x.id) === String(id); })[0];
        if (p) {
          f.elements.id.value       = p.id;
          f.elements.nameEn.value   = p.nameEn || '';
          f.elements.nameUr.value   = p.nameUr || '';
          f.elements.category.value = p.category || '';
          f.elements.stock.value    = p.stock || 0;
          f.elements.price.value    = p.price || 0;
          f.elements.original.value = p.original || '';
          f.elements.image.value    = p.image || '';
          f.elements.descEn.value   = p.descEn || '';
          f.elements.descUr.value   = p.descUr || '';
        }
      }
      this.updatePreview();
      this.openModal('#productFormModal');
    },

    updatePreview: function () {
      var f = $('#productForm');
      var price = Number(f.elements.price.value) || 0;
      var orig  = Number(f.elements.original.value) || 0;
      var disc  = orig > price ? Math.round((orig - price) / orig * 100) : 0;

      $('#pvName').textContent  = f.elements.nameEn.value || '—';
      $('#pvCat').textContent   = f.elements.category.value || '—';
      $('#pvPrice').textContent = Lang.price(price);
      $('#pvOrig').textContent  = orig > price ? Lang.price(orig) : '';
      $('#pvImg').src           = f.elements.image.value || 'assets/noor-logo.svg';

      var badge = $('#pvDisc');
      badge.textContent = '-' + disc + '%';
      badge.classList.toggle('hidden', disc <= 0);

      $('#discHint').textContent = disc > 0
        ? '−' + disc + '%'
        : Lang.t('ad.discountAuto');
    },

    saveProduct: function (form) {
      var self = this;
      var p = {
        id      : this.editingId || undefined,
        nameEn  : form.elements.nameEn.value.trim(),
        nameUr  : form.elements.nameUr.value.trim(),
        category: form.elements.category.value.trim(),
        price   : Number(form.elements.price.value) || 0,
        original: Number(form.elements.original.value) || 0,
        image   : form.elements.image.value.trim(),
        descEn  : form.elements.descEn.value.trim(),
        descUr  : form.elements.descUr.value.trim(),
        stock   : Number(form.elements.stock.value) || 0
      };

      if (!p.nameEn || !p.price) { this.toast(Lang.t('ad.required'), 'error'); return; }

      var btn = $('#pfSave');
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = Lang.t('ad.saving');

      var editing = !!this.editingId;
      var call = editing
        ? API.updateProduct(p, this.creds.user, this.creds.pass)
        : API.addProduct(p, this.creds.user, this.creds.pass);

      Promise.resolve(call).then(function (res) {
        if (res && res.demo) {
          // demo mode: keep the change in memory so the screen stays honest
          if (editing) {
            self.data.products = self.data.products.map(function (x) {
              return String(x.id) === String(p.id) ? Object.assign({}, x, p, {
                discount: p.original > p.price ? Math.round((p.original - p.price) / p.original * 100) : 0
              }) : x;
            });
          } else {
            var taken = self.data.products.map(function (x) { return String(x.id); });
            var n = 1;
            while (!p.id || taken.indexOf(String(p.id)) !== -1) {
              p.id = 'P' + String(Date.now()).slice(-4) + n;
              n++;
            }
            p.discount = p.original > p.price ? Math.round((p.original - p.price) / p.original * 100) : 0;
            p.sold = 0;
            self.data.products.push(p);
          }
          self.renderAll();
          self.toast(Lang.t('ad.demoNote'));
        } else {
          self.toast(Lang.t(editing ? 'ad.updated' : 'ad.added'), 'success');
          return self.refresh();
        }
      }).catch(function (e) {
        self.toast(Lang.t('g.error') + ': ' + e.message, 'error');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = label;
        self.closeModal('#productFormModal');
      });
    },

    askDelete: function (id, kind) {
      kind = kind || 'product';
      this.pendingDelete = id;
      this.pendingKind = kind;

      var list = kind === 'banner' ? this.data.banners : this.data.products;
      var item = list.filter(function (x) { return String(x.id) === String(id); })[0];
      var name = item ? Lang.pick(item, kind === 'banner' ? 'title' : 'name') : '';

      $('#confirmTitle').textContent = Lang.t(kind === 'banner' ? 'ad.confirmSlide' : 'ad.confirmTitle');
      $('#confirmName').textContent  = item ? name + ' (' + item.id + ')' : id;
      $('#confirmYes').textContent   = Lang.t('ad.yesDelete');
      this.openModal('#confirmModal');
    },

    doDelete: function () {
      var self = this;
      var id = this.pendingDelete;
      var kind = this.pendingKind;
      this.pendingDelete = null;
      this.closeModal('#confirmModal');
      if (!id) return;

      if (kind === 'push') { this.pushCatalogue(); return; }

      var call = kind === 'banner'
        ? API.deleteBanner(id, this.creds.user, this.creds.pass)
        : API.deleteProduct(id, this.creds.user, this.creds.pass);

      Promise.resolve(call).then(function (res) {
        if (res && res.demo) {
          if (kind === 'banner') {
            self.data.banners = self.data.banners.filter(function (x) { return String(x.id) !== String(id); });
          } else {
            self.data.products = self.data.products.filter(function (x) { return String(x.id) !== String(id); });
          }
          self.renderAll();
          self.toast(Lang.t('ad.demoNote'));
        } else {
          self.toast(Lang.t(kind === 'banner' ? 'ad.bannerDeleted' : 'ad.deleted'), 'success');
          return self.refresh();
        }
      }).catch(function () { self.toast(Lang.t('g.error'), 'error'); });
    },

    quickStock: function (id, value) {
      var self = this;
      var p = this.data.products.filter(function (x) { return String(x.id) === String(id); })[0];
      if (!p) return;
      p.stock = Number(value) || 0;

      Promise.resolve(API.updateProduct(
        { id: p.id, stock: p.stock }, this.creds.user, this.creds.pass
      )).then(function (res) {
        self.toast(res && res.demo ? Lang.t('ad.demoNote') : Lang.t('ad.updated'),
                   res && res.demo ? '' : 'success');
        self.renderOverview();
      }).catch(function () { self.toast(Lang.t('g.error'), 'error'); });
    },

    setOrderStatus: function (orderId, status) {
      var self = this;
      var o = this.data.orders.filter(function (x) { return x.orderId === orderId; })[0];
      if (o) o.status = status;
      this.renderOverview();

      Promise.resolve(API.updateOrderStatus(orderId, status, this.creds.user, this.creds.pass))
        .then(function (res) {
          self.toast(res && res.demo ? Lang.t('ad.demoNote') : Lang.t('ad.statusSaved'),
                     res && res.demo ? '' : 'success');
        })
        .catch(function () { self.toast(Lang.t('g.error'), 'error'); });
    },

    /* =======================================================
       CSV export
       ======================================================= */
    exportCsv: function (which) {
      var map = {
        products : this.data.products,
        orders   : this.data.orders,
        customers: this.data.users,
        reviews  : this.data.reviews
      };
      var rows = map[which] || [];
      if (!rows.length) { this.toast(Lang.t('ad.noData')); return; }

      var cols = Object.keys(rows[0]).filter(function (k) { return k !== '_row'; });
      var csv = [cols.join(',')].concat(rows.map(function (r) {
        return cols.map(function (c) {
          return '"' + String(r[c] == null ? '' : r[c]).replace(/"/g, '""') + '"';
        }).join(',');
      })).join('\n');

      var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'noor-' + which + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },

    /* =======================================================
       navigation
       ======================================================= */
    goTo: function (tab) {
      $$('.anav').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
      $$('.panel').forEach(function (p) { p.classList.toggle('active', p.dataset.panel === tab); });
      $('#adminNav').classList.remove('open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /* =======================================================
       wiring
       ======================================================= */
    init: function () {
      var self = this;
      Lang.init();

      $('#loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        self.login(e.target.elements.user.value.trim(), e.target.elements.pass.value);
      });

      $('#logoutBtn').addEventListener('click', function () { self.logout(); });
      $('#refreshBtn').addEventListener('click', function () { self.refresh(); });
      $('#navToggle').addEventListener('click', function () { $('#adminNav').classList.toggle('open'); });
      $('#addProductBtn').addEventListener('click', function () { self.openProductForm(null); });
      $('#addBannerBtn').addEventListener('click', function () { self.openBannerForm(null); });
      $('#pushSheetBtn').addEventListener('click', function () { self.askPush(); });

      $$('[data-lang-toggle]').forEach(function (b) {
        b.addEventListener('click', function () { Lang.toggle(); });
      });
      document.addEventListener('languagechange', function () { self.renderAll(); });

      $$('.anav').forEach(function (b) {
        b.addEventListener('click', function () { self.goTo(b.dataset.tab); });
      });

      /* filters */
      var debounce = null;
      function onFilter(key, value, render) {
        clearTimeout(debounce);
        debounce = setTimeout(function () { self.filter[key] = value; render.call(self); }, 160);
      }
      $('#prodSearch').addEventListener('input', function (e) {
        onFilter('prodText', e.target.value, self.renderProducts);
      });
      $('#prodCat').addEventListener('change', function (e) {
        self.filter.prodCat = e.target.value; self.renderProducts();
      });
      $('#orderSearch').addEventListener('input', function (e) {
        onFilter('orderText', e.target.value, self.renderOrders);
      });
      $('#orderStatus').addEventListener('change', function (e) {
        self.filter.orderStatus = e.target.value; self.renderOrders();
      });
      $('#custSearch').addEventListener('input', function (e) {
        onFilter('custText', e.target.value, self.renderCustomers);
      });

      /* product form */
      var pf = $('#productForm');
      pf.addEventListener('submit', function (e) { e.preventDefault(); self.saveProduct(pf); });
      pf.addEventListener('input', function () { self.updatePreview(); });
      var bf = $('#bannerForm');
      bf.addEventListener('submit', function (e) { e.preventDefault(); self.saveBanner(bf); });
      bf.addEventListener('change', function () { self.togglePoster(); });

      $('#confirmYes').addEventListener('click', function () { self.doDelete(); });

      /* delegated clicks */
      document.addEventListener('click', function (e) {
        var close = e.target.closest('[data-close]');
        if (close) { self.closeModal('#' + close.closest('.modal').id); return; }
        if (e.target.classList.contains('modal')) { self.closeModal('#' + e.target.id); return; }

        var edit = e.target.closest('[data-edit]');
        if (edit) { self.openProductForm(edit.dataset.edit); return; }

        var del = e.target.closest('[data-del]');
        if (del) { self.askDelete(del.dataset.del, 'product'); return; }

        var bedit = e.target.closest('[data-bedit]');
        if (bedit) { self.openBannerForm(bedit.dataset.bedit); return; }

        var bdel = e.target.closest('[data-bdel]');
        if (bdel) { self.askDelete(bdel.dataset.bdel, 'banner'); return; }

        var goto = e.target.closest('[data-goto]');
        if (goto) { self.goTo(goto.dataset.goto); return; }

        var exp = e.target.closest('[data-export]');
        if (exp) { self.exportCsv(exp.dataset.export); return; }
      });

      document.addEventListener('change', function (e) {
        var st = e.target.closest('[data-status]');
        if (st) { self.setOrderStatus(st.dataset.status, st.value); return; }

        var sk = e.target.closest('[data-stock]');
        if (sk) { self.quickStock(sk.dataset.stock, sk.value); return; }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          $$('.modal.open').forEach(function (m) { self.closeModal('#' + m.id); });
          $('#adminNav').classList.remove('open');
        }
      });

      if (this.loadSession()) this.enterDashboard();
    }
  };

  window.Admin = Admin;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Admin.init(); });
  } else {
    Admin.init();
  }
})();
