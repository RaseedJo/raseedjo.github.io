# Raseed — website and app prototype

A bilingual (English / Arabic) site for Raseed: a "Coming Soon" landing page with a
waitlist, and a working **app prototype** at [`/app/`](https://raseedjo.github.io/app/)
that anyone can try. Plain HTML, CSS and JavaScript: no build step, no server.

```
index.html               page structure + inline animated logo
styles.css               colors, fonts, layout, animations
script.js                settings, translations, language switch, waitlist form
favicon.ico              browser tab icon (fallback)
assets/favicon.svg       browser tab icon
assets/apple-touch-icon.png   icon when saved to an iPhone home screen
assets/og-image.png      preview image shown when the link is shared
assets/logo.svg          full logo as a vector file (handy for other uses)
assets/logo-original.png the original logo file (reference only)
assets/app-preview-*.jpg phone screenshots of the demo, shown on the landing page
app/                     the app prototype (see "The app prototype" below)
```

The logo on the page is a vector copy of `assets/logo-original.png`, using the
exact colors sampled from it. The icon is rebuilt as SVG strokes so the
checkmark can "draw" itself. The page doesn't load the original PNG; it's kept
for reference.

**Live site:** <https://raseedjo.github.io/>

---

## Preview it on your computer

Open a terminal in this folder and run:

```bash
python -m http.server 5173
```

Then visit <http://localhost:5173>. Add `?lang=ar` to the address to see the Arabic
version (`?lang=en` for English). The app is at <http://localhost:5173/app/>.

Use `localhost` (not your computer's network address like `192.168.x.x`): the app's
sign-up uses the browser's secure crypto, which only works on `https://` or `localhost`.
To try it on a phone, use the live site.

---

## Change the Formspree endpoint

1. Open `script.js`. The endpoint is the first setting at the top:
   ```js
   const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvkgbjek";
   ```
   Paste your new endpoint between the quotes.
2. Also update the same URL in `index.html`, in the form's `action="..."`.
   It's only used if a visitor has JavaScript turned off, but keep the two the same.

Each signup reaches Formspree with the visitor's `email` and a `language` field
(`en` or `ar`), so you know which version they used. The email subject is set in
`index.html` (`name="_subject"`). A hidden `_gotcha` field quietly blocks spam bots.

If you turn on "allowed domains" in Formspree, add your live site's domain there,
otherwise submissions will fail.

---

## Change the email, Instagram, or any text

**All page text** lives in one object, `TRANSLATIONS`, near the top of `script.js`,
with an `en` and an `ar` version of every line. Edit the text between the quotes.

The English text is also written in `index.html`. That copy is what search engines
and link previews read, so if you change English wording, change it in both places.

**Contact email.** In `index.html`, search for `getraseed@gmail.com`. It appears
twice on one line (the `mailto:` link and the visible text). Change both.

**Instagram.** In `index.html`, search for `instagram.com/getraseed` and change the
link and the visible `@getraseed`. Then update `instagramLabel` in both languages
in `script.js`. That's the label screen readers announce.

**Page title and description** (shown in Google and link previews) are in the
`<head>` of `index.html`: `<title>`, `description`, and the `og:` / `twitter:` tags.
The title also appears as `pageTitle` in `script.js` (both languages), because it
changes when a visitor switches language. Keep the English one in sync with `index.html`.

**Privacy note** under the waitlist form is `privacyNote` in `script.js`. Error and
"loading" messages briefly take its place, then it reappears.

**Colors** are CSS variables at the top of `styles.css` (`--teal`, `--terracotta`,
`--cream`, …). Some colors also appear as `R, G, B` numbers (for example
`--cream-rgb`), used where transparency is needed. If you change a brand color,
update its matching RGB line too.

---

## Language behaviour

- English is the default. Visitors whose browser is set to Arabic get Arabic.
- The EN | ع toggle remembers the visitor's choice on their device.
- To share a link that always opens in Arabic, e.g. in an Arabic Instagram
  bio or story, use <https://raseedjo.github.io/?lang=ar>.

---

## The app prototype (`/app/`)

**It's a static demo, not real software.** Everything runs in the visitor's browser:

- **No server, no database.** Accounts, customers, orders and invoices are saved in
  the browser's `localStorage` (keys starting with `raseed-app.`). They stay on that
  device and browser only. Clearing browser data, or using another browser or phone,
  starts fresh.
- **Nothing is sent anywhere.** The app's `Content-Security-Policy` (in
  `app/index.html`) lets it talk only to its own site and Google Fonts, so even a
  mistake can't send data away. **Don't add the Meta Pixel or other analytics to
  `/app/`** — the policy would block them anyway.
- **Accounts are demo accounts.** Passwords are never stored: only a salted
  PBKDF2-SHA-256 hash. Creating an account does **not** join the waitlist.
- **"Try the demo"** (`/app/#/demo`) opens *Mama Huda's Kitchen* with fresh sample
  data every time: 12 fictional customers, 30 orders over the last six weeks (dated
  from today) and 11 invoices.
- **Payments are only recorded.** Orders note how the customer paid (Cash, CliQ, Card,
  Other) and whether they've paid. Raseed doesn't process payments.
- **Invoices are samples.** Each one says "Sample e-invoice – prototype, not submitted
  to JoFotara". The QR code holds plain text (number, seller, date, total), not
  JoFotara's format. "Download PDF" opens the print window; choose "Save as PDF".

Handy links: `/app/#/demo` (straight into the demo — good for a QR code on a poster),
`/app/#/signup`, and `?lang=ar` to open in Arabic, e.g. `/app/?lang=ar#/demo`.

### Change things in the app

| What | Where |
| --- | --- |
| Any text, both languages | `app/i18n/en.json` and `app/i18n/ar.json` (same keys in both) |
| The sample business and its data | `app/js/demo-data.js` |
| Colours and fonts | `app/css/tokens.css` (copied from the landing page's `styles.css`) |
| Default sales tax for new accounts | `emptyData()` in `app/js/store.js` (people can change it in Settings) |
| Invoice numbers (`RSD-2026-0001`) | `nextInvoiceNumber()` in `app/js/invoice-model.js` |
| Chart colours | `CHART_COLORS` in `app/js/charts.js` |

Pages: `app/js/views/` (one file per area). Routes (`#/orders/123` style, so refreshing
never 404s on GitHub Pages): `app/js/main.js`. Third-party code (Chart.js 4.5.1,
qrcode-generator 2.0.4, both MIT) is copied into `app/vendor/`; see
`app/vendor/LICENSES.md`.

### Test checklist (before the exhibition)

On a phone **and** a laptop, in **English and Arabic** (EN | ع toggle):

1. Landing page: the waitlist form shows first; "Or try the working demo ↓" scrolls
   to "Try Raseed now"; both buttons open the app.
2. **Try the demo** → the dashboard shows sales, orders, unpaid and waiting tiles, three
   charts ("Show as table" under each) and recent orders.
3. Orders: filter by status, search (try a customer name or "kunafa"), sort; tap
   **Start** / **Mark delivered** on an order, then **Undo**.
4. Create an order: pick "+ Add a new customer", add two items (watch the totals),
   save. Edit it, then delete it.
5. Customers: open one, check their order history; add a customer with a phone like
   `0791234567`.
6. Invoices: on an order tap **Create invoice**, check the QR code scans with your
   phone camera, tap **Download PDF** and save it. Edit the order's items and see the
   invoice offer **Issue updated invoice**.
7. Settings: turn sales tax off/on, change the rate; **Reset demo data**; log out.
8. Create your own account (any email, a made-up password), log out, log back in.
9. Switch language on any screen: everything (dates, numbers, charts, invoice) changes
   and the layout mirrors; numbers stay 0–9.

---

## Publishing (GitHub Pages)

The site is published from the `main` branch of
<https://github.com/RaseedJo/raseedjo.github.io> with GitHub Pages
(**Settings → Pages → Deploy from a branch → `main` / `(root)`**).

To update it, commit your changes and push to `main`:

```bash
git add -A
git commit -m "Describe your change"
git push
```

GitHub rebuilds the site within a minute or two. Check progress under the repo's
**Actions** tab. The empty `.nojekyll` file tells GitHub to serve the files as-is.

### Link previews

WhatsApp, Instagram and Facebook need **full** web addresses for the preview.
They're set in the `<head>` of `index.html` (`og:url`, `og:image`,
`twitter:image`) and point at `https://raseedjo.github.io/`. If the site
ever moves (a custom domain, or Netlify), update those three. Then check the
preview with <https://developers.facebook.com/tools/debug/> (use **Scrape Again**
if it shows an old version).

### Moving to Netlify instead

Go to <https://app.netlify.com/drop> and drag this folder onto the page. Then
update the three preview URLs above to your Netlify address.
