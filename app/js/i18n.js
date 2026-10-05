// Translations and formatting.
// All UI text comes from i18n/en.json and i18n/ar.json. The chosen language is
// saved under the same key as the landing page, so the choice carries over.

const STORAGE_KEY = "raseed-lang";
export const LANGUAGES = ["en", "ar"];

const dictionaries = {};
let current = "en";
const listeners = new Set();

export async function initI18n() {
  const loaded = await Promise.all(
    LANGUAGES.map(async (lang) => {
      const response = await fetch(`i18n/${lang}.json`, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Could not load ${lang}.json (${response.status})`);
      return response.json();
    }),
  );
  LANGUAGES.forEach((lang, i) => { dictionaries[lang] = loaded[i]; });
  current = detectLanguage();
  applyToDocument();
}

function detectLanguage() {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (LANGUAGES.includes(fromUrl)) return fromUrl;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch (e) { /* storage blocked */ }
  const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || "";
  return preferred.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function applyToDocument() {
  document.documentElement.lang = current;
  document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  if (!LANGUAGES.includes(lang) || lang === current) return;
  current = lang;
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage blocked */ }
  applyToDocument();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function lookup(lang, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), dictionaries[lang]);
}

/** Translate a key like "auth.logIn". `{name}` placeholders are filled from `vars`. */
export function t(key, vars) {
  let text = lookup(current, key);
  if (typeof text !== "string") {
    text = lookup("en", key);
    if (typeof text !== "string") {
      console.warn(`Missing translation: ${key}`);
      return key;
    }
  }
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/* ---------- Formatting (Western digits 0–9 in both languages) ---------- */

const dateLocale = () => (current === "ar" ? "ar-JO-u-nu-latn" : "en-GB");

export function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** e.g. 5 Oct 2026 / 5 تشرين الأول 2026 */
export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(dateLocale(), options).format(date);
}
