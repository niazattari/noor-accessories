# Putting Noor Accessories on GitHub + Vercel

Everything is committed and ready. Pick whichever route suits you.

---

## Route A — Upload the ZIP (no commands, ~3 minutes)

1. Go to **https://github.com/new**
2. Repository name: `noor-accessories` · Visibility: **Public** ·
   **Do not** tick "Add a README" — leave the repo empty.
3. Press **Create repository**.
4. On the next screen click **uploading an existing file**.
5. Unzip `noor-accessories-store.zip` on your computer, then drag the
   **contents** (index.html, admin.html, css, js, assets, google-apps-script,
   README.md, vercel.json, .gitignore) into the browser — not the outer folder.
6. Press **Commit changes**.

## Route B — Push with git (if you have git installed)

Open a terminal in
`C:\Users\Lionheart\OneDrive\Desktop\projects\noor accessories online store`
and run:

```bash
git init
git add .
git commit -m "Noor Accessories: bilingual storefront with Google Sheets backend"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/noor-accessories.git
git push -u origin main
```

GitHub will ask you to sign in the first time (browser popup, or a Personal
Access Token as the password).

---

## Then: connect Vercel (~60 seconds)

1. Go to **https://vercel.com/new**
2. Under **Import Git Repository**, pick `noor-accessories`.
   (First time only: click **Install GitHub App** and grant access to the repo.)
3. Framework Preset: **Other** · Build Command: *leave empty* ·
   Output Directory: *leave empty* · Root Directory: `./`
4. Press **Deploy**.

You get `https://noor-accessories.vercel.app` in under a minute, and from then
on **every push to `main` redeploys the site automatically**.

---

## After it's live — the two things to change

1. `js/config.js` → `WHATSAPP_NUMBER` is still the placeholder `923000000000`.
2. `js/config.js` → `API_URL` is empty, so the site runs in demo mode.
   Follow README.md section 2 to connect your Google Sheet.

Edit those, commit, push — Vercel redeploys on its own.

---

## A note on the repo being public

`js/config.js` will be readable by anyone. Before you put real numbers in it,
know that these become public:

- your WhatsApp number (fine — it's on the site anyway)
- your JazzCash / Easypaisa account numbers (fine — customers need them)
- `ADMIN_USER` / `ADMIN_PASS` (**not fine**)

The admin fallback password only matters when no Google Sheet is connected.
Once you connect the Sheet, the real password lives in the **Settings** tab of
your spreadsheet, which is private. So: connect the Sheet, change `AdminPass`
there, and set `ADMIN_PASS` in config.js to something meaningless like `disabled`.

Either way, the admin page is protected in the browser only — it keeps casual
visitors out, it is not real security. Don't put anything in the Sheet you'd
mind a determined visitor seeing.
