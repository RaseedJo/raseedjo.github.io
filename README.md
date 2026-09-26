# Raseed — Coming Soon page

A single-page, bilingual (English / Arabic) "Coming Soon" site for Raseed.
Plain HTML, CSS and JavaScript: no build step and no dependencies.

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
version (`?lang=en` for English).

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
