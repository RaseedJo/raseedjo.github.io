/* ==========================================================================
   SETTINGS — edit these
   ========================================================================== */

// Formspree endpoint that receives waitlist signups.
// To use a different form, paste its endpoint here (and in the form's
// `action` attribute in index.html, which is only used if JavaScript is off).
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvkgbjek";

// All page text, in both languages. Keys match the data-i18n attributes in index.html.
const TRANSLATIONS = {
  en: {
    pageTitle: "Raseed — Coming Soon",
    langGroup: "Language",
    logoLabel: "Raseed",
    headline: "Coming Soon",
    tagline: "Elevating home businesses",
    blurb: "Track your orders, send professional receipts, and get paid easily with CliQ, all in one place. No more chaos in the DMs.",
    emailLabel: "Email address",
    emailPlaceholder: "Your email address",
    submit: "Join the waitlist",
    submitting: "Adding you to the waitlist…",
    successTitle: "You're on the list!",
    successBody: "We'll email you as soon as Raseed launches.",
    errorEmpty: "Please enter your email address.",
    errorInvalid: "Please enter a valid email address.",
    errorServer: "Something went wrong. Please try again in a moment.",
    errorNetwork: "Couldn't connect. Check your internet connection and try again.",
    contactLead: "Have an inquiry? Reach us at",
    instagramLabel: "Raseed on Instagram, @getraseed",
    footer: "© 2026 Raseed. All rights reserved.",
  },
  ar: {
    pageTitle: "رصيد — قريباً",
    langGroup: "اللغة",
    logoLabel: "رصيد",
    headline: "قريباً",
    tagline: "نرتقي بالمشاريع المنزلية",
    blurb: "تابع طلباتك، وأرسل فواتير احترافية، واستلم دفعاتك بسهولة عبر كليك، كل ذلك في مكان واحد. وداعاً لفوضى الرسائل.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "بريدك الإلكتروني",
    submit: "انضم لقائمة الانتظار",
    submitting: "جارٍ إضافتك إلى قائمة الانتظار…",
    successTitle: "تمت إضافتك!",
    successBody: "سنراسلك فور إطلاق رصيد.",
    errorEmpty: "يرجى إدخال بريدك الإلكتروني.",
    errorInvalid: "يرجى إدخال بريد إلكتروني صحيح.",
    errorServer: "حدث خطأ ما. يرجى المحاولة مرة أخرى بعد قليل.",
    errorNetwork: "تعذّر الاتصال. تحقّق من اتصالك بالإنترنت وحاول مجدداً.",
    contactLead: "لأي استفسار، تواصل معنا على",
    instagramLabel: "رصيد على إنستغرام، @getraseed",
    footer: "© 2026 رصيد. جميع الحقوق محفوظة.",
  },
};

/* ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "raseed-lang";
  const FADE_OUT_MS = 220; // keep in sync with .page transition in styles.css
  const REQUEST_TIMEOUT_MS = 15000;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const root = document.documentElement;
  const page = document.getElementById("page");
  const toggle = document.getElementById("lang-toggle");
  const langButtons = toggle.querySelectorAll("[data-lang]");
  const form = document.getElementById("waitlist-form");
  const field = form.querySelector(".field");
  const input = document.getElementById("email");
  const submitBtn = document.getElementById("submit-btn");
  const status = document.getElementById("form-status");
  const languageField = document.getElementById("language-field");
  const signup = document.getElementById("signup");
  const success = document.getElementById("success");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let currentLang = "en";
  let statusKey = null; // which message is showing, so it can be re-translated
  let switchTimer = null;
  let isSubmitting = false;

  /* ---------- Language ---------- */

  function detectLanguage() {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl && TRANSLATIONS[fromUrl]) return fromUrl;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && TRANSLATIONS[saved]) return saved;
    } catch (e) { /* storage blocked — ignore */ }

    const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    return preferred.toLowerCase().startsWith("ar") ? "ar" : "en";
  }

  function applyLanguage(lang) {
    const t = TRANSLATIONS[lang];
    currentLang = lang;

    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = t.pageTitle;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const text = t[el.dataset.i18n];
      if (text !== undefined) el.textContent = text;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (t[key] !== undefined) el.setAttribute(attr, t[key]);
      });
    });

    langButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
    toggle.dataset.active = lang;
    languageField.value = lang;

    if (statusKey) status.textContent = t[statusKey];
  }

  function switchLanguage(lang) {
    if (!TRANSLATIONS[lang] || lang === currentLang) return;

    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }

    if (reducedMotion.matches) {
      applyLanguage(lang);
      return;
    }

    // Crossfade: fade the page out, swap text + direction, fade back in
    window.clearTimeout(switchTimer);
    page.classList.add("is-switching");
    switchTimer = window.setTimeout(() => {
      applyLanguage(lang);
      window.requestAnimationFrame(() => page.classList.remove("is-switching"));
    }, FADE_OUT_MS);
  }

  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchLanguage(btn.dataset.lang));
  });

  /* ---------- Waitlist form ---------- */

  function setStatus(key, isError) {
    statusKey = key;
    status.textContent = key ? TRANSLATIONS[currentLang][key] : "";
    status.classList.toggle("is-error", Boolean(isError));
    field.classList.toggle("is-invalid", Boolean(isError) && key !== "errorServer" && key !== "errorNetwork");
    if (isError && (key === "errorEmpty" || key === "errorInvalid")) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function setLoading(loading) {
    isSubmitting = loading;
    // aria-disabled (not `disabled`) so keyboard focus stays on the button
    submitBtn.setAttribute("aria-disabled", String(loading));
    submitBtn.classList.toggle("is-loading", loading);
    submitBtn.setAttribute("aria-busy", String(loading));
    if (loading) setStatus("submitting", false);
  }

  function showSuccess() {
    setStatus(null);
    signup.classList.add("is-done");
    success.hidden = false;
    success.focus({ preventScroll: true });
    form.reset();
    languageField.value = currentLang;
  }

  // Email addresses read left-to-right, even on the Arabic page
  function updateInputDirection() {
    input.dir = input.value ? "ltr" : "";
  }

  input.addEventListener("input", () => {
    updateInputDirection();
    if (statusKey === "errorEmpty" || statusKey === "errorInvalid") {
      const value = input.value.trim();
      if (value && (statusKey === "errorEmpty" || EMAIL_PATTERN.test(value))) setStatus(null);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const email = input.value.trim();
    if (!email) {
      setStatus("errorEmpty", true);
      input.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setStatus("errorInvalid", true);
      input.focus();
      return;
    }

    const data = new FormData(form);
    data.set("email", email);
    data.set("language", currentLang);

    const controller = "AbortController" in window ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

    setLoading(true);
    let outcome = "errorServer";
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : undefined,
      });

      if (response.ok) {
        outcome = "success";
      } else {
        // Formspree explains what went wrong, e.g. an email address it rejects
        const body = await response.json().catch(() => null);
        const emailRejected = Boolean(body && Array.isArray(body.errors) &&
          body.errors.some((err) => err.field === "email"));
        outcome = emailRejected ? "errorInvalid" : "errorServer";
      }
    } catch (error) {
      outcome = "errorNetwork"; // offline, blocked, or timed out
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }

    setLoading(false);
    if (outcome === "success") {
      showSuccess();
    } else {
      setStatus(outcome, true);
    }
  });

  /* ---------- Start ---------- */

  const initialLang = detectLanguage();
  if (initialLang !== "en") applyLanguage(initialLang);
})();
