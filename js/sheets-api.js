/* ===========================================================
   Noor Accessories – Google Sheets API layer
   -----------------------------------------------------------
   All communication with the Apps Script Web App lives here.
   If CONFIG.API_URL is empty the store runs in DEMO MODE using
   the sample catalogue below, so the design can be previewed
   before the sheet is connected.
   =========================================================== */

const API = {

  get connected() { return !!(CONFIG.API_URL && CONFIG.API_URL.indexOf('http') === 0); },

  /* ---------- low level ---------- */

  async get(action, params) {
    if (!this.connected) throw new Error('demo');
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.keys(params || {}).forEach(k => url.searchParams.set(k, params[k]));
    const res  = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'request failed');
    return data;
  },

  async post(payload) {
    if (!this.connected) throw new Error('demo');
    // text/plain keeps this a "simple request" so the browser
    // does not send a CORS preflight (Apps Script cannot answer one).
    const res = await fetch(CONFIG.API_URL, {
      method : 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body   : JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'request failed');
    return data;
  },

  /* ---------- reads ---------- */

  async loadStore() {
    if (!this.connected) {
      return { products: DEMO.products, reviews: DEMO.reviews,
               banners: DEMO.banners, settings: {}, demo: true };
    }
    try {
      const d = await this.get('getAll');
      const payload = { products: d.products || [], reviews: d.reviews || [],
                        banners: (d.banners && d.banners.length) ? d.banners : DEMO.banners,
                        settings: d.settings || {}, demo: false };
      try { localStorage.setItem('noor_cache', JSON.stringify(payload)); } catch (e) {}
      return payload;
    } catch (err) {
      console.warn('[Noor] store load failed, using cache/demo:', err.message);
      try {
        const cached = JSON.parse(localStorage.getItem('noor_cache') || 'null');
        if (cached && cached.products && cached.products.length) return Object.assign(cached, { offline: true });
      } catch (e) {}
      return { products: DEMO.products, reviews: DEMO.reviews, banners: DEMO.banners,
               settings: {}, demo: true, offline: true };
    }
  },

  async ordersFor(phone) {
    if (!this.connected) return [];
    const d = await this.get('getOrders', { phone: phone });
    return d.orders || [];
  },

  /* ---------- writes ---------- */

  async placeOrder(order) {
    if (!this.connected) {
      return { ok: true, orderId: 'DEMO-' + Date.now().toString().slice(-6),
               deliveryDays: CONFIG.DELIVERY_DAYS, demo: true };
    }
    return this.post(Object.assign({ action: 'placeOrder' }, order));
  },

  async addReview(review) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post(Object.assign({ action: 'addReview' }, review));
  },

  async saveUser(user) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post(Object.assign({ action: 'saveUser' }, user));
  },

  /* ---------- admin ---------- */

  async adminLogin(user, pass) {
    const local = () => (user === CONFIG.ADMIN_USER && pass === CONFIG.ADMIN_PASS)
      ? { ok: true, demo: true } : { ok: false, error: 'invalid' };

    if (!this.connected) return local();

    try {
      return await this.post({ action: 'adminLogin', user: user, pass: pass });
    } catch (err) {
      // The sheet answered "no" -> a genuine wrong password.
      if (/invalid|unauthor/i.test(err.message)) return { ok: false, error: 'invalid' };
      // Couldn't reach the sheet at all -> fall back to the config.js credentials
      // so a broken connection never locks the owner out of their own dashboard.
      console.warn('[Noor] admin login offline, using local credentials:', err.message);
      const res = local();
      if (res.ok) res.offline = true;
      return res;
    }
  },

  async adminData(user, pass) {
    if (!this.connected) return DEMO.admin();
    return this.get('adminData', { user: user, pass: pass });
  },

  async addProduct(product, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'addProduct', product: product, user: user, pass: pass });
  },

  async addBanner(banner, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'addBanner', banner: banner, user: user, pass: pass });
  },

  async updateBanner(banner, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'updateBanner', banner: banner, user: user, pass: pass });
  },

  async deleteBanner(id, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'deleteBanner', id: id, user: user, pass: pass });
  },

  /** Push a whole catalogue into the Products sheet in one go. */
  async importProducts(products, user, pass, replace) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'importProducts', products: products,
                       replace: !!replace, user: user, pass: pass });
  },

  async updateProduct(product, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'updateProduct', product: product, user: user, pass: pass });
  },

  async deleteProduct(id, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'deleteProduct', id: id, user: user, pass: pass });
  },

  async updateOrderStatus(orderId, status, user, pass) {
    if (!this.connected) return { ok: true, demo: true };
    return this.post({ action: 'updateOrderStatus', orderId: orderId, status: status, user: user, pass: pass });
  }
};

/* ===========================================================
   DEMO DATA — shown only while CONFIG.API_URL is empty.
   Once your Google Sheet is connected this is never used.
   =========================================================== */
const DEMO = {
  products: [
    { id:'NS01', nameEn:'Ruby Rose Necklace Set', nameUr:'سرخ گلابی ہار سیٹ', category:'Necklace Sets',
      price:1350, original:2000, discount:32,
      image:'assets/products/ns01.jpg',
      descEn:'Ruby flower centre on a two-strand gold chain, with a rose teardrop and matching long earrings. Made for a red or maroon jora.',
      descUr:'دو لڑی گولڈن چین پر سرخ پھول، گلابی آنسو لٹکن اور ملتی جلتی لمبی بالیاں۔ سرخ یا مرون جوڑے کے لیے۔', stock:8, sold:0, created:'2026-08-20' },

    { id:'NS02', nameEn:'Emerald & Ruby Choker Set', nameUr:'سبز و سرخ چوکر سیٹ', category:'Necklace Sets',
      price:1250, original:1900, discount:34,
      image:'assets/products/ns02.jpg',
      descEn:'A close-fitting rhinestone choker studded with emerald and ruby stones, finished with a drop fringe and short danglers.',
      descUr:'سبز اور سرخ نگینوں سے جڑا قریب فٹ ہونے والا چوکر، جھالر اور مختصر بالیوں کے ساتھ۔', stock:6, sold:0, created:'2026-08-21' },

    { id:'NS03', nameEn:'Golden Blossom Necklace Set', nameUr:'گولڈن پھول ہار سیٹ', category:'Necklace Sets',
      price:1450, original:2100, discount:31,
      image:'assets/products/ns03.jpg',
      descEn:'Warm gold filigree flowers on a fine double chain with champagne teardrops, and long flower earrings to match.',
      descUr:'باریک دو لڑی چین پر گولڈن جالی دار پھول، شیمپین آنسو اور ملتی جلتی لمبی بالیاں۔', stock:7, sold:0, created:'2026-08-22' },

    { id:'NS04', nameEn:'Crystal Bridal Necklace Set', nameUr:'کرسٹل دلہن ہار سیٹ', category:'Necklace Sets',
      price:1650, original:2500, discount:34,
      image:'assets/products/ns04.jpg',
      descEn:'Our brightest set — a silver-tone collar dense with clear stones and a fringed pendant, with chandelier earrings.',
      descUr:'ہمارا سب سے چمکدار سیٹ — صاف نگینوں سے بھرا چاندی رنگ ہار، جھالر دار لاکٹ اور فانوس نما بالیاں۔', stock:5, sold:0, created:'2026-08-23' },

    { id:'NS05', nameEn:'Emerald Drop Necklace Set', nameUr:'سبز لٹکن ہار سیٹ', category:'Necklace Sets',
      price:1400, original:2100, discount:33,
      image:'assets/products/ns05.jpg',
      descEn:'Three-strand gold chain with deep green flower stones, a ruby teardrop and emerald drop earrings. A mehndi favourite.',
      descUr:'تین لڑی گولڈن چین، گہرے سبز پھول نگینے، سرخ آنسو اور سبز لٹکن والی بالیاں۔ مہندی کے لیے پسندیدہ۔', stock:7, sold:0, created:'2026-08-24' },

    { id:'ER01', nameEn:'Rainbow Jhumka & Hair Chain Set', nameUr:'رنگ برنگی جھمکا و ماتھا پٹی سیٹ', category:'Earrings',
      price:1550, original:2300, discount:33,
      image:'assets/products/er01.jpg',
      descEn:'Gold-tone jhumkas with a matching five-flower hair chain and a ring, set with coloured stones and hanging beads. Complete mehndi look.',
      descUr:'گولڈن جھمکے، ملتی جلتی پانچ پھولوں والی ماتھا پٹی اور انگوٹھی، رنگین نگینوں اور لٹکتے موتیوں کے ساتھ۔ مکمل مہندی لُک۔', stock:6, sold:0, created:'2026-08-25' },

    /* ---- batch-added 2026-09-26: names, prices & descriptions below are
       placeholders generated from your photo batch — please review and
       edit each one (via Admin > Products) before relying on them ---- */
    { id:'BG01', nameEn:'Bangles Set – Style 1', nameUr:'چوڑیوں کا سیٹ — اسٹائل 1', category:'Bangles & Bracelets',
      price:570, original:825, discount:31,
      image:'assets/products/bg01.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BG02', nameEn:'Bangles Set – Style 2', nameUr:'چوڑیوں کا سیٹ — اسٹائل 2', category:'Bangles & Bracelets',
      price:590, original:850, discount:31,
      image:'assets/products/bg02.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BG03', nameEn:'Bangles Set – Style 3', nameUr:'چوڑیوں کا سیٹ — اسٹائل 3', category:'Bangles & Bracelets',
      price:610, original:875, discount:30,
      image:'assets/products/bg03.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'BG04', nameEn:'Bangles Set – Style 4', nameUr:'چوڑیوں کا سیٹ — اسٹائل 4', category:'Bangles & Bracelets',
      price:630, original:900, discount:30,
      image:'assets/products/bg04.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'BG05', nameEn:'Bangles Set – Style 5', nameUr:'چوڑیوں کا سیٹ — اسٹائل 5', category:'Bangles & Bracelets',
      price:550, original:800, discount:31,
      image:'assets/products/bg05.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'BG06', nameEn:'Bangles Set – Style 6', nameUr:'چوڑیوں کا سیٹ — اسٹائل 6', category:'Bangles & Bracelets',
      price:570, original:825, discount:31,
      image:'assets/products/bg06.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'BG07', nameEn:'Bangles Set – Style 7', nameUr:'چوڑیوں کا سیٹ — اسٹائل 7', category:'Bangles & Bracelets',
      price:590, original:850, discount:31,
      image:'assets/products/bg07.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BG08', nameEn:'Bangles Set – Style 8', nameUr:'چوڑیوں کا سیٹ — اسٹائل 8', category:'Bangles & Bracelets',
      price:610, original:875, discount:30,
      image:'assets/products/bg08.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BG09', nameEn:'Bangles Set – Style 9', nameUr:'چوڑیوں کا سیٹ — اسٹائل 9', category:'Bangles & Bracelets',
      price:630, original:900, discount:30,
      image:'assets/products/bg09.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'BG10', nameEn:'Bangles Set – Style 10', nameUr:'چوڑیوں کا سیٹ — اسٹائل 10', category:'Bangles & Bracelets',
      price:550, original:800, discount:31,
      image:'assets/products/bg10.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'BG11', nameEn:'Bangles Set – Style 11', nameUr:'چوڑیوں کا سیٹ — اسٹائل 11', category:'Bangles & Bracelets',
      price:570, original:825, discount:31,
      image:'assets/products/bg11.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'BG12', nameEn:'Bangles Set – Style 12', nameUr:'چوڑیوں کا سیٹ — اسٹائل 12', category:'Bangles & Bracelets',
      price:590, original:850, discount:31,
      image:'assets/products/bg12.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'BG13', nameEn:'Bangles Set – Style 13', nameUr:'چوڑیوں کا سیٹ — اسٹائل 13', category:'Bangles & Bracelets',
      price:610, original:875, discount:30,
      image:'assets/products/bg13.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BG14', nameEn:'Bangles Set – Style 14', nameUr:'چوڑیوں کا سیٹ — اسٹائل 14', category:'Bangles & Bracelets',
      price:630, original:900, discount:30,
      image:'assets/products/bg14.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BG15', nameEn:'Bangles Set – Style 15', nameUr:'چوڑیوں کا سیٹ — اسٹائل 15', category:'Bangles & Bracelets',
      price:550, original:800, discount:31,
      image:'assets/products/bg15.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'BG16', nameEn:'Bangles Set – Style 16', nameUr:'چوڑیوں کا سیٹ — اسٹائل 16', category:'Bangles & Bracelets',
      price:570, original:825, discount:31,
      image:'assets/products/bg16.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'BG17', nameEn:'Bangles Set – Style 17', nameUr:'چوڑیوں کا سیٹ — اسٹائل 17', category:'Bangles & Bracelets',
      price:590, original:850, discount:31,
      image:'assets/products/bg17.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'BG18', nameEn:'Bangles Set – Style 18', nameUr:'چوڑیوں کا سیٹ — اسٹائل 18', category:'Bangles & Bracelets',
      price:610, original:875, discount:30,
      image:'assets/products/bg18.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'BG19', nameEn:'Bangles Set – Style 19', nameUr:'چوڑیوں کا سیٹ — اسٹائل 19', category:'Bangles & Bracelets',
      price:630, original:900, discount:30,
      image:'assets/products/bg19.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BG20', nameEn:'Bangles Set – Style 20', nameUr:'چوڑیوں کا سیٹ — اسٹائل 20', category:'Bangles & Bracelets',
      price:550, original:800, discount:31,
      image:'assets/products/bg20.jpg',
      descEn:'A colourful bangle/bracelet set, sold as shown, perfect for matching with your outfit.',
      descUr:'رنگ برنگی چوڑیوں یا کنگن کا سیٹ، اپنے لباس کے ساتھ ملانے کے لیے بہترین۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BR01', nameEn:'Brooch – Style 1', nameUr:'بروچ — اسٹائل 1', category:'Brooches & Pins',
      price:320, original:475, discount:33,
      image:'assets/products/br01.jpg',
      descEn:'A decorative brooch/pin, great for pinning on a dupatta, shawl or bag.',
      descUr:'سجاوٹی بروچ/پن، دوپٹے، شال یا بیگ پر لگانے کے لیے بہترین۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BR02', nameEn:'Brooch – Style 2', nameUr:'بروچ — اسٹائل 2', category:'Brooches & Pins',
      price:340, original:500, discount:32,
      image:'assets/products/br02.jpg',
      descEn:'A decorative brooch/pin, great for pinning on a dupatta, shawl or bag.',
      descUr:'سجاوٹی بروچ/پن، دوپٹے، شال یا بیگ پر لگانے کے لیے بہترین۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BR03', nameEn:'Brooch – Style 3', nameUr:'بروچ — اسٹائل 3', category:'Brooches & Pins',
      price:360, original:525, discount:31,
      image:'assets/products/br03.jpg',
      descEn:'A decorative brooch/pin, great for pinning on a dupatta, shawl or bag.',
      descUr:'سجاوٹی بروچ/پن، دوپٹے، شال یا بیگ پر لگانے کے لیے بہترین۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'BR04', nameEn:'Brooch – Style 4', nameUr:'بروچ — اسٹائل 4', category:'Brooches & Pins',
      price:380, original:550, discount:31,
      image:'assets/products/br04.jpg',
      descEn:'A decorative brooch/pin, great for pinning on a dupatta, shawl or bag.',
      descUr:'سجاوٹی بروچ/پن، دوپٹے، شال یا بیگ پر لگانے کے لیے بہترین۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'BR05', nameEn:'Brooch – Style 5', nameUr:'بروچ — اسٹائل 5', category:'Brooches & Pins',
      price:300, original:450, discount:33,
      image:'assets/products/br05.jpg',
      descEn:'A decorative brooch/pin, great for pinning on a dupatta, shawl or bag.',
      descUr:'سجاوٹی بروچ/پن، دوپٹے، شال یا بیگ پر لگانے کے لیے بہترین۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'BR06', nameEn:'Brooch – Style 6', nameUr:'بروچ — اسٹائل 6', category:'Brooches & Pins',
      price:320, original:475, discount:33,
      image:'assets/products/br06.jpg',
      descEn:'A decorative brooch/pin, great for pinning on a dupatta, shawl or bag.',
      descUr:'سجاوٹی بروچ/پن، دوپٹے، شال یا بیگ پر لگانے کے لیے بہترین۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'BT01', nameEn:'Beauty Item – Style 1', nameUr:'بیوٹی آئٹم — اسٹائل 1', category:'Beauty',
      price:220, original:325, discount:32,
      image:'assets/products/bt01.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BT02', nameEn:'Beauty Item – Style 2', nameUr:'بیوٹی آئٹم — اسٹائل 2', category:'Beauty',
      price:240, original:350, discount:31,
      image:'assets/products/bt02.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BT03', nameEn:'Beauty Item – Style 3', nameUr:'بیوٹی آئٹم — اسٹائل 3', category:'Beauty',
      price:260, original:375, discount:31,
      image:'assets/products/bt03.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'BT04', nameEn:'Beauty Item – Style 4', nameUr:'بیوٹی آئٹم — اسٹائل 4', category:'Beauty',
      price:280, original:400, discount:30,
      image:'assets/products/bt04.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'BT05', nameEn:'Beauty Item – Style 5', nameUr:'بیوٹی آئٹم — اسٹائل 5', category:'Beauty',
      price:200, original:300, discount:33,
      image:'assets/products/bt05.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'BT06', nameEn:'Beauty Item – Style 6', nameUr:'بیوٹی آئٹم — اسٹائل 6', category:'Beauty',
      price:220, original:325, discount:32,
      image:'assets/products/bt06.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'BT07', nameEn:'Beauty Item – Style 7', nameUr:'بیوٹی آئٹم — اسٹائل 7', category:'Beauty',
      price:240, original:350, discount:31,
      image:'assets/products/bt07.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BT08', nameEn:'Beauty Item – Style 8', nameUr:'بیوٹی آئٹم — اسٹائل 8', category:'Beauty',
      price:260, original:375, discount:31,
      image:'assets/products/bt08.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BT09', nameEn:'Beauty Item – Style 9', nameUr:'بیوٹی آئٹم — اسٹائل 9', category:'Beauty',
      price:280, original:400, discount:30,
      image:'assets/products/bt09.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'BT10', nameEn:'Beauty Item – Style 10', nameUr:'بیوٹی آئٹم — اسٹائل 10', category:'Beauty',
      price:200, original:300, discount:33,
      image:'assets/products/bt10.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'BT11', nameEn:'Beauty Item – Style 11', nameUr:'بیوٹی آئٹم — اسٹائل 11', category:'Beauty',
      price:220, original:325, discount:32,
      image:'assets/products/bt11.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'BT12', nameEn:'Beauty Item – Style 12', nameUr:'بیوٹی آئٹم — اسٹائل 12', category:'Beauty',
      price:240, original:350, discount:31,
      image:'assets/products/bt12.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'BT13', nameEn:'Beauty Item – Style 13', nameUr:'بیوٹی آئٹم — اسٹائل 13', category:'Beauty',
      price:260, original:375, discount:31,
      image:'assets/products/bt13.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'BT14', nameEn:'Beauty Item – Style 14', nameUr:'بیوٹی آئٹم — اسٹائل 14', category:'Beauty',
      price:280, original:400, discount:30,
      image:'assets/products/bt14.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'BT15', nameEn:'Beauty Item – Style 15', nameUr:'بیوٹی آئٹم — اسٹائل 15', category:'Beauty',
      price:200, original:300, discount:33,
      image:'assets/products/bt15.jpg',
      descEn:'A beauty essential from our collection, as shown in the photo.',
      descUr:'ہماری مصنوعات میں سے ایک بیوٹی آئٹم، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'ER01', nameEn:'Earrings – Style 1', nameUr:'بالیاں — اسٹائل 1', category:'Earrings',
      price:420, original:625, discount:33,
      image:'assets/products/er01.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'ER02', nameEn:'Earrings – Style 2', nameUr:'بالیاں — اسٹائل 2', category:'Earrings',
      price:440, original:650, discount:32,
      image:'assets/products/er02.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'ER03', nameEn:'Earrings – Style 3', nameUr:'بالیاں — اسٹائل 3', category:'Earrings',
      price:460, original:675, discount:32,
      image:'assets/products/er03.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'ER04', nameEn:'Earrings – Style 4', nameUr:'بالیاں — اسٹائل 4', category:'Earrings',
      price:480, original:700, discount:31,
      image:'assets/products/er04.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'ER05', nameEn:'Earrings – Style 5', nameUr:'بالیاں — اسٹائل 5', category:'Earrings',
      price:400, original:600, discount:33,
      image:'assets/products/er05.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'ER06', nameEn:'Earrings – Style 6', nameUr:'بالیاں — اسٹائل 6', category:'Earrings',
      price:420, original:625, discount:33,
      image:'assets/products/er06.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'ER07', nameEn:'Earrings – Style 7', nameUr:'بالیاں — اسٹائل 7', category:'Earrings',
      price:440, original:650, discount:32,
      image:'assets/products/er07.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'ER08', nameEn:'Earrings – Style 8', nameUr:'بالیاں — اسٹائل 8', category:'Earrings',
      price:460, original:675, discount:32,
      image:'assets/products/er08.jpg',
      descEn:'A charming pair (or card) of earrings to complete your look.',
      descUr:'آپ کے لُک کو مکمل کرنے کے لیے خوبصورت بالیاں۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA01', nameEn:'Hair Accessory – Style 1', nameUr:'بالوں کا سامان — اسٹائل 1', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha01.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA02', nameEn:'Hair Accessory – Style 2', nameUr:'بالوں کا سامان — اسٹائل 2', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha02.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA03', nameEn:'Hair Accessory – Style 3', nameUr:'بالوں کا سامان — اسٹائل 3', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha03.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'HA04', nameEn:'Hair Accessory – Style 4', nameUr:'بالوں کا سامان — اسٹائل 4', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha04.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'HA05', nameEn:'Hair Accessory – Style 5', nameUr:'بالوں کا سامان — اسٹائل 5', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha05.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'HA06', nameEn:'Hair Accessory – Style 6', nameUr:'بالوں کا سامان — اسٹائل 6', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha06.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'HA07', nameEn:'Hair Accessory – Style 7', nameUr:'بالوں کا سامان — اسٹائل 7', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha07.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA08', nameEn:'Hair Accessory – Style 8', nameUr:'بالوں کا سامان — اسٹائل 8', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha08.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA09', nameEn:'Hair Accessory – Style 9', nameUr:'بالوں کا سامان — اسٹائل 9', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha09.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'HA10', nameEn:'Hair Accessory – Style 10', nameUr:'بالوں کا سامان — اسٹائل 10', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha10.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'HA11', nameEn:'Hair Accessory – Style 11', nameUr:'بالوں کا سامان — اسٹائل 11', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha11.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'HA12', nameEn:'Hair Accessory – Style 12', nameUr:'بالوں کا سامان — اسٹائل 12', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha12.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'HA13', nameEn:'Hair Accessory – Style 13', nameUr:'بالوں کا سامان — اسٹائل 13', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha13.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA14', nameEn:'Hair Accessory – Style 14', nameUr:'بالوں کا سامان — اسٹائل 14', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha14.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA15', nameEn:'Hair Accessory – Style 15', nameUr:'بالوں کا سامان — اسٹائل 15', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha15.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'HA16', nameEn:'Hair Accessory – Style 16', nameUr:'بالوں کا سامان — اسٹائل 16', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha16.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'HA17', nameEn:'Hair Accessory – Style 17', nameUr:'بالوں کا سامان — اسٹائل 17', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha17.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'HA18', nameEn:'Hair Accessory – Style 18', nameUr:'بالوں کا سامان — اسٹائل 18', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha18.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'HA19', nameEn:'Hair Accessory – Style 19', nameUr:'بالوں کا سامان — اسٹائل 19', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha19.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA20', nameEn:'Hair Accessory – Style 20', nameUr:'بالوں کا سامان — اسٹائل 20', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha20.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA21', nameEn:'Hair Accessory – Style 21', nameUr:'بالوں کا سامان — اسٹائل 21', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha21.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'HA22', nameEn:'Hair Accessory – Style 22', nameUr:'بالوں کا سامان — اسٹائل 22', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha22.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'HA23', nameEn:'Hair Accessory – Style 23', nameUr:'بالوں کا سامان — اسٹائل 23', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha23.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'HA24', nameEn:'Hair Accessory – Style 24', nameUr:'بالوں کا سامان — اسٹائل 24', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha24.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'HA25', nameEn:'Hair Accessory – Style 25', nameUr:'بالوں کا سامان — اسٹائل 25', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha25.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA26', nameEn:'Hair Accessory – Style 26', nameUr:'بالوں کا سامان — اسٹائل 26', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha26.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA27', nameEn:'Hair Accessory – Style 27', nameUr:'بالوں کا سامان — اسٹائل 27', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha27.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'HA28', nameEn:'Hair Accessory – Style 28', nameUr:'بالوں کا سامان — اسٹائل 28', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha28.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'HA29', nameEn:'Hair Accessory – Style 29', nameUr:'بالوں کا سامان — اسٹائل 29', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha29.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'HA30', nameEn:'Hair Accessory – Style 30', nameUr:'بالوں کا سامان — اسٹائل 30', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha30.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'HA31', nameEn:'Hair Accessory – Style 31', nameUr:'بالوں کا سامان — اسٹائل 31', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha31.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA32', nameEn:'Hair Accessory – Style 32', nameUr:'بالوں کا سامان — اسٹائل 32', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha32.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA33', nameEn:'Hair Accessory – Style 33', nameUr:'بالوں کا سامان — اسٹائل 33', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha33.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'HA34', nameEn:'Hair Accessory – Style 34', nameUr:'بالوں کا سامان — اسٹائل 34', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha34.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'HA35', nameEn:'Hair Accessory – Style 35', nameUr:'بالوں کا سامان — اسٹائل 35', category:'Hair Accessories',
      price:250, original:380, discount:34,
      image:'assets/products/ha35.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'HA36', nameEn:'Hair Accessory – Style 36', nameUr:'بالوں کا سامان — اسٹائل 36', category:'Hair Accessories',
      price:270, original:405, discount:33,
      image:'assets/products/ha36.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'HA37', nameEn:'Hair Accessory – Style 37', nameUr:'بالوں کا سامان — اسٹائل 37', category:'Hair Accessories',
      price:290, original:430, discount:33,
      image:'assets/products/ha37.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'HA38', nameEn:'Hair Accessory – Style 38', nameUr:'بالوں کا سامان — اسٹائل 38', category:'Hair Accessories',
      price:310, original:455, discount:32,
      image:'assets/products/ha38.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'HA39', nameEn:'Hair Accessory – Style 39', nameUr:'بالوں کا سامان — اسٹائل 39', category:'Hair Accessories',
      price:330, original:480, discount:31,
      image:'assets/products/ha39.jpg',
      descEn:'A handy hair accessory pack — clips, ties or bands as shown in the photo.',
      descUr:'بالوں کا مفید سامان — کلپس، بینڈز یا ربن، تصویر میں دکھائے گئے مطابق۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'NS01', nameEn:'Necklace Set – Style 1', nameUr:'ہار سیٹ — اسٹائل 1', category:'Necklace Sets',
      price:1420, original:2125, discount:33,
      image:'assets/products/ns01.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'NS02', nameEn:'Necklace Set – Style 2', nameUr:'ہار سیٹ — اسٹائل 2', category:'Necklace Sets',
      price:1440, original:2150, discount:33,
      image:'assets/products/ns02.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'NS03', nameEn:'Necklace Set – Style 3', nameUr:'ہار سیٹ — اسٹائل 3', category:'Necklace Sets',
      price:1460, original:2175, discount:33,
      image:'assets/products/ns03.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'NS04', nameEn:'Necklace Set – Style 4', nameUr:'ہار سیٹ — اسٹائل 4', category:'Necklace Sets',
      price:1480, original:2200, discount:33,
      image:'assets/products/ns04.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'NS05', nameEn:'Necklace Set – Style 5', nameUr:'ہار سیٹ — اسٹائل 5', category:'Necklace Sets',
      price:1400, original:2100, discount:33,
      image:'assets/products/ns05.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'NS06', nameEn:'Necklace Set – Style 6', nameUr:'ہار سیٹ — اسٹائل 6', category:'Necklace Sets',
      price:1420, original:2125, discount:33,
      image:'assets/products/ns06.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'NS07', nameEn:'Necklace Set – Style 7', nameUr:'ہار سیٹ — اسٹائل 7', category:'Necklace Sets',
      price:1440, original:2150, discount:33,
      image:'assets/products/ns07.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'NS08', nameEn:'Necklace Set – Style 8', nameUr:'ہار سیٹ — اسٹائل 8', category:'Necklace Sets',
      price:1460, original:2175, discount:33,
      image:'assets/products/ns08.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'NS09', nameEn:'Necklace Set – Style 9', nameUr:'ہار سیٹ — اسٹائل 9', category:'Necklace Sets',
      price:1480, original:2200, discount:33,
      image:'assets/products/ns09.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'NS10', nameEn:'Necklace Set – Style 10', nameUr:'ہار سیٹ — اسٹائل 10', category:'Necklace Sets',
      price:1400, original:2100, discount:33,
      image:'assets/products/ns10.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'NS11', nameEn:'Necklace Set – Style 11', nameUr:'ہار سیٹ — اسٹائل 11', category:'Necklace Sets',
      price:1420, original:2125, discount:33,
      image:'assets/products/ns11.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:15, sold:0, created:'2026-09-26' },

    { id:'NS12', nameEn:'Necklace Set – Style 12', nameUr:'ہار سیٹ — اسٹائل 12', category:'Necklace Sets',
      price:1440, original:2150, discount:33,
      image:'assets/products/ns12.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:10, sold:0, created:'2026-09-26' },

    { id:'NS13', nameEn:'Necklace Set – Style 13', nameUr:'ہار سیٹ — اسٹائل 13', category:'Necklace Sets',
      price:1460, original:2175, discount:33,
      image:'assets/products/ns13.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'NS14', nameEn:'Necklace Set – Style 14', nameUr:'ہار سیٹ — اسٹائل 14', category:'Necklace Sets',
      price:1480, original:2200, discount:33,
      image:'assets/products/ns14.jpg',
      descEn:'A matching necklace and earring set, ready to wear for parties or everyday elegance.',
      descUr:'ملتا جلتا ہار اور بالیاں سیٹ، تقریبات یا روزمرہ پہننے کے لیے تیار۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'RG01', nameEn:'Ring Set – Style 1', nameUr:'انگوٹھیوں کا سیٹ — اسٹائل 1', category:'Rings',
      price:470, original:675, discount:30,
      image:'assets/products/rg01.jpg',
      descEn:'A set of fashion rings with sparkling stones, great for everyday wear or gifting.',
      descUr:'چمکدار نگینوں والی فیشن انگوٹھیوں کا سیٹ، روزمرہ پہننے یا تحفے کے لیے بہترین۔', stock:11, sold:0, created:'2026-09-26' },

    { id:'RG02', nameEn:'Ring Set – Style 2', nameUr:'انگوٹھیوں کا سیٹ — اسٹائل 2', category:'Rings',
      price:490, original:700, discount:30,
      image:'assets/products/rg02.jpg',
      descEn:'A set of fashion rings with sparkling stones, great for everyday wear or gifting.',
      descUr:'چمکدار نگینوں والی فیشن انگوٹھیوں کا سیٹ، روزمرہ پہننے یا تحفے کے لیے بہترین۔', stock:12, sold:0, created:'2026-09-26' },

    { id:'RG03', nameEn:'Ring Set – Style 3', nameUr:'انگوٹھیوں کا سیٹ — اسٹائل 3', category:'Rings',
      price:510, original:725, discount:30,
      image:'assets/products/rg03.jpg',
      descEn:'A set of fashion rings with sparkling stones, great for everyday wear or gifting.',
      descUr:'چمکدار نگینوں والی فیشن انگوٹھیوں کا سیٹ، روزمرہ پہننے یا تحفے کے لیے بہترین۔', stock:13, sold:0, created:'2026-09-26' },

    { id:'RG04', nameEn:'Ring Set – Style 4', nameUr:'انگوٹھیوں کا سیٹ — اسٹائل 4', category:'Rings',
      price:530, original:750, discount:29,
      image:'assets/products/rg04.jpg',
      descEn:'A set of fashion rings with sparkling stones, great for everyday wear or gifting.',
      descUr:'چمکدار نگینوں والی فیشن انگوٹھیوں کا سیٹ، روزمرہ پہننے یا تحفے کے لیے بہترین۔', stock:14, sold:0, created:'2026-09-26' },

    { id:'RG05', nameEn:'Ring Set – Style 5', nameUr:'انگوٹھیوں کا سیٹ — اسٹائل 5', category:'Rings',
      price:450, original:650, discount:31,
      image:'assets/products/rg05.jpg',
      descEn:'A set of fashion rings with sparkling stones, great for everyday wear or gifting.',
      descUr:'چمکدار نگینوں والی فیشن انگوٹھیوں کا سیٹ، روزمرہ پہننے یا تحفے کے لیے بہترین۔', stock:15, sold:0, created:'2026-09-26' }
  ],

  banners: [
    { id:'B1', type:'image',
      titleEn:'Bridal Season Is Here', titleUr:'شادی کا موسم آ گیا',
      subEn:'Matching necklace and earring sets for every jora',
      subUr:'ہر جوڑے کے لیے ملتے جلتے ہار اور بالیاں',
      media:'assets/banners/banner-bridal.jpg', poster:'', link:'#products',
      btnEn:'View Sets', btnUr:'سیٹ دیکھیں', order:1 },
    { id:'B2', type:'image',
      titleEn:'Up to 34% Off', titleUr:'34% تک رعایت',
      subEn:'Cash on delivery all over Pakistan',
      subUr:'پورے پاکستان میں روپے پر ترسیل',
      media:'assets/banners/banner-offer.jpg', poster:'', link:'#products',
      btnEn:'See Offers', btnUr:'آفرز دیکھیں', order:2 },
    { id:'B3', type:'image',
      titleEn:'The Complete Mehndi Look', titleUr:'مکمل مہندی لُک',
      subEn:'Jhumkas, hair chain and ring in one set',
      subUr:'جھمکے، ماتھا پٹی اور انگوٹھی ایک ہی سیٹ میں',
      media:'assets/banners/banner-mehndi.jpg', poster:'', link:'#products',
      btnEn:'Shop Now', btnUr:'اب خریدیں', order:3 }
  ],

  reviews: [
    { id:'RV1', name:'Ayesha K.', rating:5, date:'2026-08-14',
      textEn:'The pearl earrings are even prettier in person. Delivery was quick and packing was lovely.',
      textUr:'موتی والی بالیاں تصویر سے بھی زیادہ خوبصورت ہیں۔ ترسیل تیز اور پیکنگ بہت اچھی تھی۔' },
    { id:'RV2', name:'Hira S.', rating:5, date:'2026-08-11',
      textEn:'Ordered the kundan set for my sister’s mehndi. Everyone asked where I bought it!',
      textUr:'بہن کی مہندی کے لیے کندن سیٹ منگوایا۔ سب نے پوچھا کہاں سے لیا!' },
    { id:'RV3', name:'Maryam A.', rating:4, date:'2026-08-07',
      textEn:'Good quality watch for the price. WhatsApp support answered all my questions.',
      textUr:'قیمت کے لحاظ سے گھڑی کا معیار اچھا ہے۔ واٹس ایپ پر سب جواب مل گئے۔' },
    { id:'RV4', name:'Sana R.', rating:5, date:'2026-08-02',
      textEn:'Cash on delivery made it easy to trust. Will order again soon.',
      textUr:'روپے پر ترسیل کی وجہ سے اعتماد ہوا۔ دوبارہ ضرور آرڈر کروں گی۔' }
  ],

  admin() {
    const orders = [
      { orderId:'NA-260820-1042', date:'2026-08-20', name:'Ayesha Khan', phone:'03001234567',
        city:'Lahore', items:'Pearl Drop Earrings x1', total:1650, status:'Completed', payment:'COD' },
      { orderId:'NA-260821-2277', date:'2026-08-21', name:'Hira Sadiq', phone:'03119876543',
        city:'Karachi', items:'Kundan Necklace Set x1', total:4999, status:'Shipped', payment:'JazzCash' },
      { orderId:'NA-260823-3390', date:'2026-08-23', name:'Maryam Ali', phone:'03214445566',
        city:'Islamabad', items:'Classic Ladies Watch x1 | Silk Scrunchies x2', total:5297, status:'Pending', payment:'Easypaisa' }
    ];
    const users = [
      { UserID:'U-10231', Name:'Ayesha Khan', Phone:'03001234567', Email:'ayesha@example.com', City:'Lahore', OrdersCount:3 },
      { UserID:'U-10232', Name:'Hira Sadiq',  Phone:'03119876543', Email:'hira@example.com',   City:'Karachi', OrdersCount:1 },
      { UserID:'U-10233', Name:'Maryam Ali',  Phone:'03214445566', Email:'',                   City:'Islamabad', OrdersCount:2 }
    ];
    const reviews = DEMO.reviews;
    return {
      ok: true, demo: true,
      products: DEMO.products, orders: orders, users: users, reviews: reviews,
      banners: DEMO.banners,
      stats: {
        products : DEMO.products.length,
        orders   : orders.length,
        customers: users.length,
        revenue  : orders.reduce((s, o) => s + o.total, 0),
        rating   : 4.8,
        pending  : orders.filter(o => o.status === 'Pending').length
      }
    };
  }
};

window.API = API;
window.DEMO = DEMO;
