/* ===========================================================
   Noor Accessories – Shopping cart
   Items live in localStorage so the cart survives a refresh.
   =========================================================== */

const Cart = {

  items: [],   // { id, nameEn, nameUr, price, original, image, qty, stock }

  /* ---------- persistence ---------- */
  load() {
    try {
      this.items = JSON.parse(localStorage.getItem(CONFIG.KEYS.cart) || '[]');
      if (!Array.isArray(this.items)) this.items = [];
    } catch (e) { this.items = []; }
    return this.items;
  },

  save() {
    try { localStorage.setItem(CONFIG.KEYS.cart, JSON.stringify(this.items)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('cartchange'));
  },

  /* ---------- mutations ---------- */
  add(product, qty) {
    qty = Math.max(1, Number(qty) || 1);
    const line = this.items.find(i => i.id === product.id);
    const max  = Number(product.stock) > 0 ? Number(product.stock) : 99;

    if (line) {
      line.qty = Math.min(max, line.qty + qty);
    } else {
      this.items.push({
        id      : product.id,
        nameEn  : product.nameEn,
        nameUr  : product.nameUr,
        price   : Number(product.price) || 0,
        original: Number(product.original) || 0,
        image   : product.image,
        stock   : max,
        qty     : Math.min(max, qty)
      });
    }
    this.save();
  },

  setQty(id, qty) {
    const line = this.items.find(i => i.id === id);
    if (!line) return;
    qty = Number(qty) || 0;
    if (qty <= 0) return this.remove(id);
    line.qty = Math.min(line.stock || 99, qty);
    this.save();
  },

  increment(id, delta) {
    const line = this.items.find(i => i.id === id);
    if (line) this.setQty(id, line.qty + delta);
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },

  /* ---------- totals ---------- */
  count() { return this.items.reduce((s, i) => s + i.qty, 0); },

  subtotal() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },

  /** How much the customer saves versus the original prices. */
  discount() {
    return this.items.reduce((s, i) => {
      const orig = i.original && i.original > i.price ? i.original : i.price;
      return s + (orig - i.price) * i.qty;
    }, 0);
  },

  shipping() {
    if (!this.items.length) return 0;
    const free = Number(CONFIG.FREE_SHIPPING_ABOVE) || 0;
    if (free && this.subtotal() >= free) return 0;
    return Number(CONFIG.SHIPPING_COST) || 0;
  },

  total() { return this.subtotal() + this.shipping(); },

  isEmpty() { return this.items.length === 0; },

  /** Payload shape expected by the Google Sheet backend. */
  toOrderItems() {
    return this.items.map(i => ({
      id   : i.id,
      name : i.nameEn || i.nameUr,
      qty  : i.qty,
      price: i.price
    }));
  },

  /** Human readable list used in the WhatsApp message. */
  toText() {
    return this.items.map(i => {
      const name = Lang.pick(i, 'name');
      return '• ' + name + ' × ' + i.qty + ' — ' + Lang.price(i.price * i.qty);
    }).join('\n');
  }
};

window.Cart = Cart;
