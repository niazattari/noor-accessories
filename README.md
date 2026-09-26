# 🌸 Noor Accessories — Online Store / نور ایکسیسریز

A complete, bilingual (English + اردو) single-page e-commerce store for a ladies'
accessories business, with **Google Sheets as the entire backend** and a separate
admin dashboard.

---

## 1. What you got

```
noor-accessories-store/
├── index.html               ← the storefront (single page app)
├── admin.html               ← admin dashboard (login protected)
├── css/
│   ├── style.css            ← main design system (pink / mauve / gold)
│   ├── responsive.css       ← tablet + mobile layouts
│   ├── rtl.css              ← right-to-left fixes for Urdu
│   └── admin.css            ← dashboard styles
├── js/
│   ├── config.js            ← ⚙️ THE ONLY FILE YOU NORMALLY EDIT
│   ├── languages.js         ← all 200+ English/Urdu translations
│   ├── language-manager.js  ← language toggle, RTL/LTR, localStorage
│   ├── sheets-api.js        ← talks to Google Sheets (+ demo data)
│   ├── cart.js              ← shopping cart logic
│   ├── ui.js                ← product rendering, cart drawer, checkout
│   ├── profile.js           ← customer profile, orders, reviews, wishlist
│   ├── admin.js             ← admin dashboard
│   └── main.js              ← app bootstrap / event wiring
├── assets/noor-logo.svg
└── google-apps-script/Code.gs  ← paste this into your Google Sheet
```

Open `index.html` in any browser and it works right away in **demo mode**
(8 sample products). Connect your Google Sheet to make it real.

---

## 2. Connect Google Sheets (about 5 minutes, one time)

1. Go to **[sheets.new](https://sheets.new)** and name the file
   `Noor Accessories Database`.
2. Menu: **Extensions ▸ Apps Script**. Delete whatever is in `Code.gs`.
3. Open `google-apps-script/Code.gs` from this project, copy **everything**, paste it in, **Save**.
4. In the function dropdown at the top pick **`setupStore`** and press **Run**.
   Approve the Google permission prompt (choose your account ▸ Advanced ▸ Go to … ▸ Allow).
   This creates 6 tabs — `Products`, `Orders`, `Users`, `Reviews`, `Banners`, `Settings` —
   with headers and the starter catalogue.
5. Press **Deploy ▸ New deployment ▸ ⚙️ ▸ Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
   - Press **Deploy** and **copy the URL** (it ends in `/exec`).
6. Open `js/config.js` and paste it:

```js
API_URL: 'https://script.google.com/macros/s/AKfycb....../exec',
```

Refresh the site — the yellow "Demo mode" bar disappears and everything now
reads and writes to your sheet.

> ⚠️ Every time you edit `Code.gs` later, you must redeploy:
> **Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New ▸ Deploy.**
> The URL stays the same.

---

## 3. Things to change in `js/config.js`

| Setting | What it does |
|---|---|
| `API_URL` | Your Apps Script Web App URL (step 2 above) |
| `WHATSAPP_NUMBER` | **Change this!** Format `923001234567` — no `+`, no spaces |
| `STORE_NAME_EN / UR` | Store name in both languages |
| `TAGLINE_EN / UR` | Hero tagline |
| `INSTAGRAM / FACEBOOK / TIKTOK` | Social links in the footer |
| `DELIVERY_DAYS` | Estimated delivery days shown on the order confirmation |
| `SHIPPING_COST` | Flat shipping in Rs. |
| `FREE_SHIPPING_ABOVE` | Order value above which shipping is free |
| `PAYMENT_ACCOUNTS` | Your JazzCash / Easypaisa account title + number |
| `ADMIN_USER / ADMIN_PASS` | Admin login **when no sheet is connected** |
| `DEFAULT_LANG` | `'en'` or `'ur'` for first-time visitors |

Once the sheet is connected, the **Settings** tab of the sheet wins for
`WhatsAppNumber`, `DeliveryDays`, `ShippingCost`, `AdminUser`, `AdminPass`.
**Change `AdminPass` in the Settings sheet before going live.**

---

## 4. Adding products

**From the dashboard (easiest).** Open `admin.html` → **Products** → **Add Product**.
The form shows a live preview of the card as your customers will see it, and the
discount percentage is worked out for you from the price and original price.
Press **Edit** on any card to change it, **Delete** to remove it, or type straight
into the **Stock** box on a card to correct a quantity.

**From the Google Sheet.** Add a row to the `Products` tab:

| Column | Example | Notes |
|---|---|---|
| ID | `NP07` | must be unique |
| NameEN | `Pearl Drop Earrings` | |
| NameUR | `موتی والی بالیاں` | shown when the site is in Urdu |
| Category | `Nose Pins` | becomes a filter chip automatically |
| Price | `450` | numbers only, no "Rs." |
| OriginalPrice | `700` | for the crossed-out price |
| Discount | *(leave blank)* | calculated automatically |
| ImageURL | `assets/products/np07.jpg` | see below |
| DescEN / DescUR | short description | |
| Quantity | `20` | 0 shows "Out of Stock" |
| Sold | `0` | used for "Most Popular" sorting |
| Active | `TRUE` | set `FALSE` to hide without deleting |
| CreatedAt | today's date | used for "Newest First" |

### Product images

The thirteen images in `assets/products/` are **placeholders** — clean illustrations
on a blush studio background, one per item. They are there so the shop looks finished
before your photographs are ready.

To use a real photo, save it as a square JPG in `assets/products/` and put the path
in the ImageURL column, e.g. `assets/products/np01.jpg`. Because the file travels
with the site, it loads fast and never breaks.

Photo tips that make the biggest difference:

- Shoot on a plain white sheet of paper near a window, never under a yellow bulb.
- Fill the frame with the piece; crop square.
- Keep hands, keyboards and cables out of shot.
- One item per photo, always the same distance from the camera.

An external link works too — upload to Google Drive, share as **Anyone with the link**,
and use `https://drive.google.com/uc?export=view&id=THE_FILE_ID`.

---

## 4b. The home page carousel

The wide sliding banner under the hero is driven by the **Banners** tab of your
sheet, and edited from the dashboard under **Carousel**.

Each slide can be a **photo** or a **video**:

| Field | What to put |
|---|---|
| Type | `image` or `video` |
| TitleEN / TitleUR | the big headline |
| SubEN / SubUR | one supporting line |
| MediaURL | `assets/products/ns02.jpg`, a direct `.mp4` link, or a YouTube link |
| PosterURL | for videos only — the still shown before someone presses play |
| ButtonEN / ButtonUR | button text, e.g. `Shop Now` |
| LinkURL | where the button goes, e.g. `#products` |
| SortOrder | 1, 2, 3 — the order slides appear in |
| Active | `FALSE` hides a slide without deleting it |

YouTube links work in any form (`youtu.be/...`, `watch?v=...`, `/shorts/...`).
The carousel rotates every five seconds, pauses when someone hovers or plays a
video, and can be swiped on a phone.

**Banner images look best wide** — around 1600 × 700. A tall product photo still
works: the slide fills the frame with a blurred copy and shows the photo whole on
top, so nothing important gets cropped.

---

## 5. Admin dashboard

Open `admin.html` (linked in the footer and the mobile menu).

- Default login: `admin` / `noor123` — **change it in the Settings sheet.**
- **Overview** — products, orders, customers, revenue, average rating and pending
  orders at a glance, plus the five newest orders and anything running low on stock.
- **Products** — every item as a card with its photo, price, discount and stock.
  Search by name or ID, filter by category, and **add, edit or delete** any product.
  Deleting asks you to confirm first and names the item, so you cannot remove the
  wrong one by accident.
- **Orders** — search by customer, phone or order ID, filter by status, change a
  status from the dropdown (it saves straight to your sheet), and message the
  customer on WhatsApp with their order number already typed in.
- **Customers** — everyone who has ordered, with a WhatsApp button each.
- **Reviews** — what customers wrote, with their star ratings.
- **Carousel** — add, edit and delete home page slides, photo or video, with
  Urdu and English headlines and a position number to order them.
- **Send catalogue to Sheet** (on the Products tab) writes every product you can
  see into your Google Sheet in one click — useful the first time you connect.
- **Export CSV** on every tab, and the whole dashboard works in Urdu and on a phone.

If your sheet is ever unreachable, the dashboard still opens with the password
from `config.js` and shows the built-in catalogue with a "Demo mode" bar, so a
dropped connection never locks you out.

---

## 6. How a customer order flows

1. Customer adds items to the cart (saved in their browser).
2. Checkout form → name, phone, email, address, city, payment method.
3. Order is written to the **Orders** sheet, stock is reduced in **Products**,
   and the customer is added/updated in **Users**.
4. Confirmation screen shows the Order ID and a **Send Order on WhatsApp**
   button with the whole order pre-typed in the customer's language.
5. The customer can see their order history under **My Profile ▸ My Orders**
   (press "Refresh from store" to pull the latest status from your sheet).

---

## 7. Putting it online (free)

Any static host works — no server needed.

- **Netlify Drop:** drag the whole folder onto <https://app.netlify.com/drop>. Done.
- **GitHub Pages:** push the folder to a repo ▸ Settings ▸ Pages ▸ deploy from `main`.
- **Vercel:** `vercel deploy` in the folder.

The Google Sheet keeps working from any of them.

---

## 8. Features checklist

- ✅ Full English / Urdu with a header toggle, saved per visitor
- ✅ Automatic RTL ⇄ LTR direction switching (Nastaliq font for Urdu)
- ✅ Google Sheets backend — products, orders, users, reviews, settings
- ✅ Search, category filter, 4 sort options
- ✅ Cart drawer with quantity controls, discounts, free-shipping rule
- ✅ Checkout with validation, JazzCash / Easypaisa / Cash on Delivery
- ✅ Auto order ID + WhatsApp confirmation message in the customer's language
- ✅ Customer profile: info, order history, reviews with star rating, wishlist
- ✅ Reviews section with average rating
- ✅ Admin dashboard with stats, tables, status updates, CSV export
- ✅ Responsive: 2-column product grid on phones, full-screen sheets and modals
- ✅ Dark mode toggle
- ✅ Works offline-ish: caches the last catalogue it loaded
- ✅ No external libraries — plain HTML, CSS and JavaScript

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| Yellow "Demo mode" bar won't go away | `API_URL` in `js/config.js` is empty or wrong. It must end in `/exec`. |
| Products don't load after connecting | Redeploy the Web App with **Who has access: Anyone**, then hard-refresh (Ctrl+F5). |
| Orders aren't saving | You edited `Code.gs` but didn't redeploy a **New version**. |
| Admin says "Invalid credentials" | Check `AdminUser` / `AdminPass` rows in the **Settings** sheet. |
| Product images are blank | The image link isn't public. Use the Google Drive `uc?export=view&id=` format. |
| Urdu text looks like boxes | The page needs internet the first time to load the Google Font. |

---

Built for **Noor Accessories** 🌸 — نور ایکسیسریز
