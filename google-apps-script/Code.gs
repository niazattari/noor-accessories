/*************************************************************
 *  NOOR ACCESSORIES – Google Sheets Backend (Apps Script)
 *  نور ایکسیسریز – گوگل شیٹ بیک اینڈ
 *-------------------------------------------------------------
 *  HOW TO INSTALL  (5 minutes, one time)
 *  1. Create a new Google Sheet (sheets.new). Name it
 *     "Noor Accessories Database".
 *  2. Extensions ▸ Apps Script. Delete everything in Code.gs
 *     and paste THIS whole file.
 *  3. Press Save, then choose the function `setupStore` in the
 *     dropdown and press Run. Approve the permissions.
 *     -> This creates all 5 sheets with headers + sample rows.
 *  4. Deploy ▸ New deployment ▸ type "Web app"
 *       Execute as        : Me
 *       Who has access    : Anyone
 *     Press Deploy and COPY the /exec URL.
 *  5. Paste that URL into  js/config.js  ->  API_URL
 *
 *  IMPORTANT: every time you edit this file you must
 *  Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New ▸ Deploy
 *************************************************************/

/* ---------- Sheet definitions ---------- */
var SHEETS = {
  Products: ['ID','NameEN','NameUR','Category','Price','OriginalPrice','Discount',
             'ImageURL','DescEN','DescUR','Quantity','Sold','Active','CreatedAt'],
  Orders  : ['OrderID','Date','CustomerName','Phone','Email','Address','City',
             'Items','Subtotal','Shipping','Total','Status','PaymentMethod','Notes','Language'],
  Users   : ['UserID','Name','Email','Phone','City','Address','RegistrationDate','PreferredLanguage','OrdersCount'],
  Reviews : ['ReviewID','CustomerName','Phone','Rating','ReviewEN','ReviewUR','Date','ProductID','Language','Approved'],
  Banners : ['ID','Type','TitleEN','TitleUR','SubEN','SubUR','MediaURL','PosterURL',
             'LinkURL','ButtonEN','ButtonUR','SortOrder','Active'],
  Settings: ['Key','Value']
};

var DEFAULT_SETTINGS = [
  ['StoreNameEN',   'Noor Accessories'],
  ['StoreNameUR',   'نور ایکسیسریز'],
  ['WhatsAppNumber','923000000000'],
  ['DeliveryDays',  '3'],
  ['ShippingCost',  '200'],
  ['FreeShippingAbove','3000'],
  ['AdminUser',     'admin'],
  ['AdminPass',     'noor123']
];

/* =========================================================
   ONE-TIME SETUP – run this once from the Apps Script editor
   ========================================================= */
function setupStore() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
    }
    // style the header row
    var hdr = sh.getRange(1, 1, 1, SHEETS[name].length);
    hdr.setFontWeight('bold').setBackground('#E74C7C').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });

  // default settings
  var st = ss.getSheetByName('Settings');
  if (st.getLastRow() < 2) {
    DEFAULT_SETTINGS.forEach(function (row) { st.appendRow(row); });
  }

  // sample products so the site is not empty on day one
  var pr = ss.getSheetByName('Products');
  if (pr.getLastRow() < 2) {
    var samples = [
      ['NS01','Ruby Rose Necklace Set','سرخ گلابی ہار سیٹ','Necklace Sets',1350,2000,32,
       'assets/products/ns01.jpg',
       'Ruby flower centre on a two-strand gold chain, with a rose teardrop and matching long earrings. Made for a red or maroon jora.',
       'دو لڑی گولڈن چین پر سرخ پھول، گلابی آنسو لٹکن اور ملتی جلتی لمبی بالیاں۔ سرخ یا مرون جوڑے کے لیے۔',8,0,'TRUE',new Date()],
      ['NS02','Emerald & Ruby Choker Set','سبز و سرخ چوکر سیٹ','Necklace Sets',1250,1900,34,
       'assets/products/ns04.jpg',
       'A close-fitting rhinestone choker studded with emerald and ruby stones, finished with a drop fringe and short danglers.',
       'سبز اور سرخ نگینوں سے جڑا قریب فٹ ہونے والا چوکر، جھالر اور مختصر بالیوں کے ساتھ۔',6,0,'TRUE',new Date()],
      ['NS03','Golden Blossom Necklace Set','گولڈن پھول ہار سیٹ','Necklace Sets',1450,2100,31,
       'assets/products/ns03.jpg',
       'Warm gold filigree flowers on a fine double chain with champagne teardrops, and long flower earrings to match.',
       'باریک دو لڑی چین پر گولڈن جالی دار پھول، شیمپین آنسو اور ملتی جلتی لمبی بالیاں۔',7,0,'TRUE',new Date()],
      ['NS04','Crystal Bridal Necklace Set','کرسٹل دلہن ہار سیٹ','Necklace Sets',1650,2500,34,
       'assets/products/ns04.jpg',
       'Our brightest set — a silver-tone collar dense with clear stones and a fringed pendant, with chandelier earrings.',
       'ہمارا سب سے چمکدار سیٹ — صاف نگینوں سے بھرا چاندی رنگ ہار، جھالر دار لاکٹ اور فانوس نما بالیاں۔',5,0,'TRUE',new Date()],
      ['NS05','Emerald Drop Necklace Set','سبز لٹکن ہار سیٹ','Necklace Sets',1400,2100,33,
       'assets/products/ns05.jpg',
       'Three-strand gold chain with deep green flower stones, a ruby teardrop and emerald drop earrings. A mehndi favourite.',
       'تین لڑی گولڈن چین، گہرے سبز پھول نگینے، سرخ آنسو اور سبز لٹکن والی بالیاں۔ مہندی کے لیے پسندیدہ۔',7,0,'TRUE',new Date()],
      ['ER01','Rainbow Jhumka & Hair Chain Set','رنگ برنگی جھمکا و ماتھا پٹی سیٹ','Earrings',1550,2300,33,
       'assets/products/er01.jpg',
       'Gold-tone jhumkas with a matching five-flower hair chain and a ring, set with coloured stones and hanging beads. Complete mehndi look.',
       'گولڈن جھمکے، ملتی جلتی پانچ پھولوں والی ماتھا پٹی اور انگوٹھی، رنگین نگینوں اور لٹکتے موتیوں کے ساتھ۔ مکمل مہندی لُک۔',6,0,'TRUE',new Date()]
    ];
    samples.forEach(function (r) { pr.appendRow(r); });
  }

  // starter carousel slides
  var bn = ss.getSheetByName('Banners');
  if (bn.getLastRow() < 2) {
    bn.appendRow(['B1','image','Bridal Season Is Here','شادی کا موسم آ گیا',
      'Matching necklace and earring sets for every jora',
      'ہر جوڑے کے لیے ملتے جلتے ہار اور بالیاں',
      'assets/banners/banner-bridal.jpg','','#products','View Sets','سیٹ دیکھیں',1,'TRUE']);
    bn.appendRow(['B2','image','Up to 34% Off','34% تک رعایت',
      'Cash on delivery all over Pakistan',
      'پورے پاکستان میں روپے پر ترسیل',
      'assets/banners/banner-offer.jpg','','#products','See Offers','آفرز دیکھیں',2,'TRUE']);
    bn.appendRow(['B3','image','The Complete Mehndi Look','مکمل مہندی لُک',
      'Jhumkas, hair chain and ring in one set',
      'جھمکے، ماتھا پٹی اور انگوٹھی ایک ہی سیٹ میں',
      'assets/banners/banner-mehndi.jpg','','#products','Shop Now','اب خریدیں',3,'TRUE']);
  }

  SpreadsheetApp.getUi && SpreadsheetApp.flush();
  return 'Setup complete';
}

/* =========================================================
   HTTP ENTRY POINTS
   ========================================================= */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    switch (action) {
      case 'ping'       : return out({ ok: true, message: 'Noor Accessories API is running' });
      case 'getProducts': return out({ ok: true, products: getProducts() });
      case 'getReviews' : return out({ ok: true, reviews : getReviews()  });
      case 'getSettings': return out({ ok: true, settings: getSettings() });
      case 'getBanners' : return out({ ok: true, banners : getBanners()  });
      case 'getAll'     : return out({ ok: true, products: getProducts(),
                                       reviews: getReviews(), settings: getSettings(),
                                       banners: getBanners() });
      case 'getOrders'  : return out({ ok: true, orders: getOrdersByPhone(e.parameter.phone) });
      case 'adminData'  : return adminData(e.parameter.user, e.parameter.pass);
      default           : return out({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = (e && e.parameter) || {}; }
  var action = body.action;

  try {
    switch (action) {
      case 'placeOrder'  : return out(placeOrder(body));
      case 'addReview'   : return out(addReview(body));
      case 'saveUser'    : return out(saveUser(body));
      case 'adminLogin'  : return out(adminLogin(body.user, body.pass));
      case 'addProduct'  : return out(guard(body, function () { return addProduct(body.product); }));
      case 'updateProduct': return out(guard(body, function () { return updateProduct(body.product); }));
      case 'deleteProduct': return out(guard(body, function () { return deleteProduct(body.id); }));
      case 'updateOrderStatus':
        return out(guard(body, function () { return updateOrderStatus(body.orderId, body.status); }));
      case 'addBanner'   : return out(guard(body, function () { return addBanner(body.banner); }));
      case 'updateBanner': return out(guard(body, function () { return updateBanner(body.banner); }));
      case 'deleteBanner': return out(guard(body, function () { return deleteBanner(body.id); }));
      case 'importProducts':
        return out(guard(body, function () { return importProducts(body.products, body.replace); }));
      default: return out({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/* =========================================================
   READ HELPERS
   ========================================================= */
function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { setupStore(); sh = ss.getSheetByName(name); }
  return sh;
}

/** Read a sheet into an array of objects keyed by the header row. */
function rows(name) {
  var sh = sheet(name);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var head = data[0];
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var o = {}, empty = true;
    for (var c = 0; c < head.length; c++) {
      var key = String(head[c]).trim();
      if (!key) continue;
      var v = data[i][c];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      o[key] = v;
      if (v !== '' && v !== null) empty = false;
    }
    o._row = i + 1;
    if (!empty) list.push(o);
  }
  return list;
}

function getProducts() {
  return rows('Products')
    .filter(function (p) {
      return String(p.Active).toUpperCase() !== 'FALSE' && String(p.Active).toUpperCase() !== 'NO';
    })
    .map(function (p) {
      var price = Number(p.Price) || 0;
      var orig  = Number(p.OriginalPrice) || 0;
      var disc  = Number(p.Discount) || (orig > price ? Math.round((orig - price) / orig * 100) : 0);
      return {
        id      : String(p.ID || ''),
        nameEn  : String(p.NameEN || ''),
        nameUr  : String(p.NameUR || p.NameEN || ''),
        category: String(p.Category || ''),
        price   : price,
        original: orig,
        discount: disc,
        image   : String(p.ImageURL || ''),
        descEn  : String(p.DescEN || ''),
        descUr  : String(p.DescUR || p.DescEN || ''),
        stock   : Number(p.Quantity) || 0,
        sold    : Number(p.Sold) || 0,
        created : p.CreatedAt || ''
      };
    });
}

function getReviews() {
  return rows('Reviews')
    .filter(function (r) { return String(r.Approved).toUpperCase() !== 'FALSE'; })
    .map(function (r) {
      return {
        id      : String(r.ReviewID || ''),
        name    : String(r.CustomerName || ''),
        rating  : Number(r.Rating) || 5,
        textEn  : String(r.ReviewEN || ''),
        textUr  : String(r.ReviewUR || r.ReviewEN || ''),
        date    : r.Date || '',
        product : String(r.ProductID || ''),
        lang    : String(r.Language || 'en')
      };
    });
}

function getBanners() {
  return rows('Banners')
    .filter(function (b) { return String(b.Active).toUpperCase() !== 'FALSE'; })
    .sort(function (a, b) { return (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0); })
    .map(function (b) {
      return {
        id      : String(b.ID || ''),
        type    : String(b.Type || 'image').toLowerCase(),
        titleEn : String(b.TitleEN || ''),
        titleUr : String(b.TitleUR || b.TitleEN || ''),
        subEn   : String(b.SubEN || ''),
        subUr   : String(b.SubUR || b.SubEN || ''),
        media   : String(b.MediaURL || ''),
        poster  : String(b.PosterURL || ''),
        link    : String(b.LinkURL || '#products'),
        btnEn   : String(b.ButtonEN || ''),
        btnUr   : String(b.ButtonUR || b.ButtonEN || ''),
        order   : Number(b.SortOrder) || 0
      };
    });
}

function getSettings() {
  var o = {};
  rows('Settings').forEach(function (r) {
    var k = String(r.Key || '').trim();
    if (k && k.toLowerCase() !== 'adminpass') o[k] = r.Value;
  });
  return o;
}

function settingValue(key) {
  var found = '';
  rows('Settings').forEach(function (r) {
    if (String(r.Key).trim().toLowerCase() === String(key).toLowerCase()) found = String(r.Value);
  });
  return found;
}

function getOrdersByPhone(phone) {
  var digits = normalisePhone(phone);
  if (!digits) return [];
  return rows('Orders')
    .filter(function (o) { return normalisePhone(o.Phone) === digits; })
    .map(mapOrder);
}

function mapOrder(o) {
  return {
    orderId : String(o.OrderID || ''),
    date    : o.Date || '',
    name    : String(o.CustomerName || ''),
    phone   : String(o.Phone || ''),
    email   : String(o.Email || ''),
    address : String(o.Address || ''),
    city    : String(o.City || ''),
    items   : String(o.Items || ''),
    subtotal: Number(o.Subtotal) || 0,
    shipping: Number(o.Shipping) || 0,
    total   : Number(o.Total) || 0,
    status  : String(o.Status || 'Pending'),
    payment : String(o.PaymentMethod || ''),
    notes   : String(o.Notes || ''),
    lang    : String(o.Language || 'en')
  };
}

function normalisePhone(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.length > 10) d = d.slice(-10);   // compare last 10 digits
  return d;
}

/* =========================================================
   WRITE ACTIONS
   ========================================================= */
function placeOrder(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet('Orders');
    var orderId = 'NA-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') +
                  '-' + Math.floor(1000 + Math.random() * 9000);

    var itemsText = (b.items || []).map(function (i) {
      return i.name + ' x' + i.qty + ' = ' + i.price * i.qty;
    }).join(' | ');

    sh.appendRow([
      orderId, new Date(), b.name || '', b.phone || '', b.email || '',
      b.address || '', b.city || '', itemsText,
      Number(b.subtotal) || 0, Number(b.shipping) || 0, Number(b.total) || 0,
      'Pending', b.payment || 'COD', b.notes || '', b.lang || 'en'
    ]);

    reduceStock(b.items || []);
    saveUser({ name: b.name, email: b.email, phone: b.phone, city: b.city,
               address: b.address, lang: b.lang });

    return { ok: true, orderId: orderId, deliveryDays: Number(settingValue('DeliveryDays')) || 3 };
  } finally {
    lock.releaseLock();
  }
}

function reduceStock(items) {
  if (!items.length) return;
  var sh = sheet('Products');
  var data = sh.getDataRange().getValues();
  var head = data[0];
  var idCol = head.indexOf('ID'), qCol = head.indexOf('Quantity'), sCol = head.indexOf('Sold');
  if (idCol < 0 || qCol < 0) return;

  items.forEach(function (it) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(it.id)) {
        var left = Math.max(0, (Number(data[i][qCol]) || 0) - (Number(it.qty) || 0));
        sh.getRange(i + 1, qCol + 1).setValue(left);
        if (sCol >= 0) sh.getRange(i + 1, sCol + 1).setValue((Number(data[i][sCol]) || 0) + Number(it.qty || 0));
        break;
      }
    }
  });
}

function addReview(b) {
  var sh = sheet('Reviews');
  var id = 'RV-' + Math.floor(100000 + Math.random() * 900000);
  var isUr = String(b.lang) === 'ur';
  sh.appendRow([
    id, b.name || 'Customer', b.phone || '', Number(b.rating) || 5,
    isUr ? '' : (b.text || ''), isUr ? (b.text || '') : '',
    new Date(), b.productId || '', b.lang || 'en', 'TRUE'
  ]);
  return { ok: true, reviewId: id };
}

function saveUser(b) {
  if (!b || !b.phone) return { ok: false, error: 'phone required' };
  var sh = sheet('Users');
  var data = sh.getDataRange().getValues();
  var head = data[0];
  var pCol = head.indexOf('Phone');
  var target = normalisePhone(b.phone);

  for (var i = 1; i < data.length; i++) {
    if (normalisePhone(data[i][pCol]) === target) {
      // update existing customer
      set(sh, i + 1, head, 'Name', b.name);
      set(sh, i + 1, head, 'Email', b.email);
      set(sh, i + 1, head, 'City', b.city);
      set(sh, i + 1, head, 'Address', b.address);
      set(sh, i + 1, head, 'PreferredLanguage', b.lang);
      var oc = head.indexOf('OrdersCount');
      if (oc >= 0) sh.getRange(i + 1, oc + 1).setValue((Number(data[i][oc]) || 0) + 1);
      return { ok: true, updated: true };
    }
  }
  sh.appendRow(['U-' + Math.floor(10000 + Math.random() * 90000), b.name || '', b.email || '',
                b.phone || '', b.city || '', b.address || '', new Date(), b.lang || 'en', 1]);
  return { ok: true, created: true };
}

function set(sh, row, head, key, value) {
  if (value === undefined || value === null || value === '') return;
  var c = head.indexOf(key);
  if (c >= 0) sh.getRange(row, c + 1).setValue(value);
}

/* =========================================================
   ADMIN
   ========================================================= */
function adminLogin(user, pass) {
  var u = settingValue('AdminUser') || 'admin';
  var p = settingValue('AdminPass') || 'noor123';
  if (String(user) === u && String(pass) === p) {
    return { ok: true, token: Utilities.base64Encode(u + ':' + p) };
  }
  return { ok: false, error: 'invalid' };
}

function guard(body, fn) {
  var res = adminLogin(body.user, body.pass);
  if (!res.ok) return { ok: false, error: 'unauthorised' };
  return fn();
}

function adminData(user, pass) {
  var auth = adminLogin(user, pass);
  if (!auth.ok) return out({ ok: false, error: 'invalid' });

  var products = getProducts();
  var orders   = rows('Orders').map(mapOrder);
  var users    = rows('Users');
  var reviews  = getReviews();

  var revenue = orders.reduce(function (s, o) {
    return String(o.status).toLowerCase() === 'cancelled' ? s : s + (Number(o.total) || 0);
  }, 0);
  var avg = reviews.length
    ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length)
    : 0;

  return out({
    ok: true,
    products: products, orders: orders, users: users, reviews: reviews,
    banners: getBanners(),
    stats: {
      products : products.length,
      orders   : orders.length,
      customers: users.length,
      revenue  : revenue,
      rating   : Math.round(avg * 10) / 10,
      pending  : orders.filter(function (o) { return String(o.status).toLowerCase() === 'pending'; }).length
    }
  });
}

function addProduct(p) {
  var sh = sheet('Products');
  var id = p.id || ('P' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HHmmss'));
  var price = Number(p.price) || 0, orig = Number(p.original) || 0;
  var disc  = orig > price ? Math.round((orig - price) / orig * 100) : 0;
  sh.appendRow([id, p.nameEn || '', p.nameUr || '', p.category || '', price, orig, disc,
                p.image || '', p.descEn || '', p.descUr || '', Number(p.stock) || 0, 0, 'TRUE', new Date()]);
  return { ok: true, id: id };
}

function updateProduct(p) {
  var sh = sheet('Products');
  var data = sh.getDataRange().getValues(), head = data[0];
  var idCol = head.indexOf('ID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(p.id)) {
      set(sh, i + 1, head, 'NameEN', p.nameEn);
      set(sh, i + 1, head, 'NameUR', p.nameUr);
      set(sh, i + 1, head, 'Category', p.category);
      set(sh, i + 1, head, 'Price', p.price);
      set(sh, i + 1, head, 'OriginalPrice', p.original);
      set(sh, i + 1, head, 'ImageURL', p.image);
      set(sh, i + 1, head, 'DescEN', p.descEn);
      set(sh, i + 1, head, 'DescUR', p.descUr);
      set(sh, i + 1, head, 'Quantity', p.stock);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

function deleteProduct(id) {
  var sh = sheet('Products');
  var data = sh.getDataRange().getValues(), head = data[0];
  var idCol = head.indexOf('ID');
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not found' };
}

/* ---------- carousel slides ---------- */
function addBanner(b) {
  var sh = sheet('Banners');
  var id = b.id || ('B' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HHmmss'));
  sh.appendRow([id, (b.type || 'image').toLowerCase(), b.titleEn || '', b.titleUr || '',
                b.subEn || '', b.subUr || '', b.media || '', b.poster || '',
                b.link || '#products', b.btnEn || '', b.btnUr || '',
                Number(b.order) || (sh.getLastRow()), 'TRUE']);
  return { ok: true, id: id };
}

function updateBanner(b) {
  var sh = sheet('Banners');
  var data = sh.getDataRange().getValues(), head = data[0];
  var idCol = head.indexOf('ID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(b.id)) {
      set(sh, i + 1, head, 'Type', b.type);
      set(sh, i + 1, head, 'TitleEN', b.titleEn);
      set(sh, i + 1, head, 'TitleUR', b.titleUr);
      set(sh, i + 1, head, 'SubEN', b.subEn);
      set(sh, i + 1, head, 'SubUR', b.subUr);
      set(sh, i + 1, head, 'MediaURL', b.media);
      set(sh, i + 1, head, 'PosterURL', b.poster);
      set(sh, i + 1, head, 'LinkURL', b.link);
      set(sh, i + 1, head, 'ButtonEN', b.btnEn);
      set(sh, i + 1, head, 'ButtonUR', b.btnUr);
      set(sh, i + 1, head, 'SortOrder', b.order);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

function deleteBanner(id) {
  var sh = sheet('Banners');
  var data = sh.getDataRange().getValues(), head = data[0];
  var idCol = head.indexOf('ID');
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not found' };
}

/* ---------- bulk import (used by the dashboard's "send catalogue to sheet") ---------- */
function importProducts(list, replace) {
  if (!list || !list.length) return { ok: false, error: 'nothing to import' };
  var sh = sheet('Products');

  var removed = 0;
  if (replace === true || String(replace) === 'true') {
    // wipe every product row, keeping the header, so the sheet ends up matching
    // the catalogue exactly instead of accumulating old items
    var last = sh.getLastRow();
    if (last > 1) { sh.deleteRows(2, last - 1); removed = last - 1; }
  }

  var data = sh.getDataRange().getValues(), head = data[0];
  var idCol = head.indexOf('ID');
  var existing = {};
  for (var i = 1; i < data.length; i++) existing[String(data[i][idCol])] = i + 1;

  var added = 0, updated = 0;
  list.forEach(function (p) {
    if (existing[String(p.id)]) {
      updateProduct(p);
      updated++;
    } else {
      addProduct(p);
      added++;
    }
  });
  return { ok: true, added: added, updated: updated, removed: removed };
}

function updateOrderStatus(orderId, status) {
  var sh = sheet('Orders');
  var data = sh.getDataRange().getValues(), head = data[0];
  var idCol = head.indexOf('OrderID'), sCol = head.indexOf('Status');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(orderId)) {
      sh.getRange(i + 1, sCol + 1).setValue(status);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

/* =========================================================
   JSON response helper
   ========================================================= */
function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
