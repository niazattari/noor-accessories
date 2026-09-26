/* ===========================================================
   Noor Accessories - Store Configuration
   نور ایکسیسریز - اسٹور کی ترتیبات
   -----------------------------------------------------------
   EDIT THIS FILE ONLY. Everything you normally need to change
   lives here. See README.md for step-by-step instructions.
   =========================================================== */

const CONFIG = {

  /* -------------------------------------------------------
     1) GOOGLE SHEETS BACKEND
     Paste the Web App URL you get after deploying
     google-apps-script/Code.gs  (Deploy > New deployment >
     Web app > Execute as: Me > Who has access: Anyone).
     It looks like:
     https://script.google.com/macros/s/AKfycb..../exec

     Leave it empty ('') to run the site in DEMO MODE with
     built-in sample products so you can preview the design.
  ------------------------------------------------------- */
  API_URL: 'https://script.google.com/macros/s/AKfycbxA4mkM6yylr1GeZLtdATP1V5CFZMs6fRNwu2JXYkkp5hdODkauIBPwVoX8d6_4NGU6PA/exec',

  /* -------------------------------------------------------
     2) WHATSAPP  (international format, no + and no spaces)
     Example for Pakistan: 923001234567
     >>> CHANGE THIS NUMBER TO YOUR OWN <<<
  ------------------------------------------------------- */
  WHATSAPP_NUMBER: '923033785404',

  /* -------------------------------------------------------
     3) STORE DETAILS
  ------------------------------------------------------- */
  STORE_NAME_EN: 'Noor Accessories',
  STORE_NAME_UR: 'نور ایکسیسریز',
  TAGLINE_EN: 'Premium accessories for every beautiful moment',
  TAGLINE_UR: 'ہر خوبصورت لمحے کے لیے معیاری سہولیات',

  AD_EMAIL: 'niazattari2641@gmail.com', // advertising / bulk order enquiries shown in the footer

  INSTAGRAM: 'https://instagram.com/',
  FACEBOOK : 'https://facebook.com/',
  TIKTOK   : 'https://tiktok.com/',

  /* -------------------------------------------------------
     4) DELIVERY & PAYMENTS
  ------------------------------------------------------- */
  DELIVERY_DAYS : 3,      // estimated delivery days
  SHIPPING_COST : 200,    // Rs. flat shipping
  FREE_SHIPPING_ABOVE: 3000, // Rs. 0 shipping above this subtotal
  CURRENCY: 'Rs.',

  PAYMENT_ACCOUNTS: {
    jazzcash : { title: 'Noor Accessories', number: '03417632795' },
    easypaisa: { title: 'Noor Accessories', number: '03417632795' }
  },

  /* -------------------------------------------------------
     5) ADMIN LOGIN (fallback when API_URL is empty).
     When the Google Sheet backend is connected, the username
     and password stored in the Settings sheet are used instead.
  ------------------------------------------------------- */
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'noor123',

  /* -------------------------------------------------------
     6) DEFAULT LANGUAGE on a visitor's first visit: 'en' | 'ur'
  ------------------------------------------------------- */
  DEFAULT_LANG: 'en',

  /* localStorage keys - no need to change */
  KEYS: {
    lang   : 'noor_lang',
    cart   : 'noor_cart',
    profile: 'noor_profile',
    orders : 'noor_orders',
    theme  : 'noor_theme',
    wishlist: 'noor_wishlist'
  }
};

// Make available to every script / module
window.CONFIG = CONFIG;
