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
    pageTitle: "Raseed — Elevating home businesses | Coming Soon",
    langGroup: "Language",
    logoLabel: "Raseed",
    headline: "Coming Soon",
    tagline: "Elevating home businesses",
    blurb: "Track your orders, send professional receipts, and record how each customer paid, by cash or CliQ, all in one place. No more chaos in the DMs.",
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
    privacyNote: "We'll only use your email to tell you when Raseed launches. No spam, and you can ask us to remove it anytime.",
    contactLead: "Have an inquiry? Reach us at",
    instagramLabel: "Raseed on Instagram, @getraseed",
    footer: "© 2026 Raseed. All rights reserved.",
    // The "Try Raseed now" section
    demoCue: "Or try the working demo",
    tryEyebrow: "Working prototype",
    tryTitle: "Try Raseed now",
    tryLead: "A working demo that runs in your browser. Nothing you type leaves your device.",
    featOrdersTitle: "Orders",
    featOrdersBody: "Track every order from new to delivered with one tap.",
    featCustomersTitle: "Customers",
    featCustomersBody: "Keep each customer's phone, area and order history.",
    featInvoicesTitle: "Invoices",
    featInvoicesBody: "Create invoices with a QR code and save them as PDF.",
    featDashboardTitle: "Dashboard",
    featDashboardBody: "See sales, unpaid orders and best sellers at a glance.",
    tryDemo: "Try the demo",
    tryCreate: "Create an account",
    tryNote: "A demo account doesn't add you to the waitlist.",
    tryWaitlist: "Join the waitlist",
    tryShotSrc: "assets/app-preview-en.jpg",
    tryShotAlt: "The Raseed demo on a phone: sales, orders, unpaid and waiting totals, and a chart of daily sales.",
  },
  ar: {
    pageTitle: "رصيد — نرتقي بالمشاريع المنزلية | قريباً",
    langGroup: "اللغة",
    logoLabel: "رصيد",
    headline: "قريباً",
    tagline: "نرتقي بالمشاريع المنزلية",
    blurb: "تابع طلباتك، وأرسل فواتير احترافية، وسجّل كيف دفع كل عميل، نقداً أو عبر كليك، كل ذلك في مكان واحد. وداعاً لفوضى الرسائل.",
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
    privacyNote: "سنستخدم بريدك الإلكتروني فقط لإعلامك بإطلاق رصيد. بدون رسائل مزعجة، ويمكنك طلب حذفه في أي وقت.",
    contactLead: "لأي استفسار، تواصل معنا على",
    instagramLabel: "رصيد على إنستغرام، @getraseed",
    footer: "© 2026 رصيد. جميع الحقوق محفوظة.",
    // The "Try Raseed now" section
    demoCue: "أو جرّب النسخة التجريبية",
    tryEyebrow: "نموذج أولي يعمل",
    tryTitle: "جرّب رصيد الآن",
    tryLead: "نسخة تجريبية تعمل في متصفحك. لا يغادر جهازك أي شيء تكتبه.",
    featOrdersTitle: "الطلبات",
    featOrdersBody: "تابع كل طلب من «جديد» حتى «تم التوصيل» بلمسة واحدة.",
    featCustomersTitle: "العملاء",
    featCustomersBody: "احفظ هاتف كل عميل ومنطقته وسجل طلباته.",
    featInvoicesTitle: "الفواتير",
    featInvoicesBody: "أنشئ فواتير برمز QR واحفظها بصيغة PDF.",
    featDashboardTitle: "لوحة التحكم",
    featDashboardBody: "اطّلع على المبيعات والطلبات غير المدفوعة والأصناف الأكثر مبيعاً بنظرة واحدة.",
    tryDemo: "جرّب النسخة التجريبية",
    tryCreate: "أنشئ حساباً",
    tryNote: "الحساب التجريبي لا يضيفك إلى قائمة الانتظار.",
    tryWaitlist: "انضم لقائمة الانتظار",
    tryShotSrc: "assets/app-preview-ar.jpg",
    tryShotAlt: "النسخة التجريبية من رصيد على الهاتف: المبيعات والطلبات والمبالغ غير المدفوعة والطلبات بانتظار التوصيل، ورسم بياني للمبيعات اليومية.",
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
  const formMeta = document.getElementById("form-meta");
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
    formMeta.classList.toggle("has-status", Boolean(key)); // swaps the privacy note out
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
      if (window.fbq) fbq("track", "Lead"); // Meta Pixel: count the signup
    } else {
      setStatus(outcome, true);
    }
  });

  /* ---------- Start ---------- */

  const initialLang = detectLanguage();
  if (initialLang !== "en") applyLanguage(initialLang);
})();
