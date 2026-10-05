// Raseed app — start-up, routes and page layout.

import { initI18n, t, getLang, setLang, onLangChange } from "./i18n.js";
import { addRoute, currentLocation, matchRoute, navigate, onRouteChange } from "./router.js";
import { currentAccount, startDemo, businessNameOf, ownerNameOf, logOut, setDemoDataFactory } from "./auth.js";
import { createDemoData } from "./demo-data.js";
import { isPersistent, isSessionStorageEvent, StorageFullError } from "./store.js";
import {
  html, raw, icon, langToggle, enhance, snapshotInputs, restoreInputs, updateLtrInputs, toast,
} from "./ui.js";
import { logoSvg } from "./logo.js";
import { loginView, signupView } from "./views/auth.js";
import { homeView } from "./views/home.js";
import { notFoundView } from "./views/placeholder.js";
import { settingsView } from "./views/settings.js";
import { ordersListView, orderDetailView, orderFormView } from "./views/orders.js";
import { customersListView, customerDetailView, customerFormView } from "./views/customers.js";
import { invoicesListView, invoiceView } from "./views/invoices.js";

const appRoot = document.getElementById("app");
const WAITLIST_URL = "../#signup";

setDemoDataFactory(createDemoData);

/* ---------- Routes ---------- */

addRoute("/login", { public: true, guestOnly: true, view: loginView });
addRoute("/signup", { public: true, guestOnly: true, view: signupView });
addRoute("/demo", { public: true, action: openDemo });
addRoute("/dashboard", { nav: "dashboard", view: homeView });
// "new" and "edit" are listed before "/:id" so they aren't mistaken for an ID
addRoute("/orders", { nav: "orders", view: ordersListView });
addRoute("/orders/new", { nav: "orders", view: orderFormView });
addRoute("/orders/:id/edit", { nav: "orders", view: orderFormView });
addRoute("/orders/:id", { nav: "orders", view: orderDetailView });
addRoute("/customers", { nav: "customers", view: customersListView });
addRoute("/customers/new", { nav: "customers", view: customerFormView });
addRoute("/customers/:id/edit", { nav: "customers", view: customerFormView });
addRoute("/customers/:id", { nav: "customers", view: customerDetailView });
addRoute("/invoices", { nav: "invoices", view: invoicesListView });
addRoute("/invoices/:id", { nav: "invoices", view: invoiceView });
addRoute("/settings", { nav: "settings", view: settingsView });

const NAV_ITEMS = [
  { key: "dashboard", path: "/dashboard", icon: "home" },
  { key: "orders", path: "/orders", icon: "orders" },
  { key: "customers", path: "/customers", icon: "customers" },
  { key: "invoices", path: "/invoices", icon: "invoices" },
  { key: "settings", path: "/settings", icon: "settings" },
];

/** "Try the demo": a fresh copy of the sample business every time. */
function openDemo() {
  try {
    startDemo();
  } catch (error) {
    toast(error instanceof StorageFullError ? t("errors.storageFull") : t("errors.generic"));
  }
  navigate("/dashboard", { replace: true });
}

/* ---------- Layouts ---------- */

let currentView = null;     // the view on screen, so it can clean up and keep typed input
let shellKey = "";           // rebuild the app frame when the language or account changes
let firstRender = true;

function storageBanner() {
  if (isPersistent()) return "";
  return html`<p class="banner" role="note">${icon("alert")}<span>${t("app.storageBlocked")}</span></p>`;
}

function renderAuthLayout(view) {
  shellKey = "";
  appRoot.innerHTML = html`
    <div class="auth">
      <div class="auth__top">${langToggle()}</div>
      <div class="auth__brand">
        <a class="auth__logo" href="../" aria-label="${t("nav.home")}">${raw(logoSvg(t("app.name")))}</a>
        <span class="badge">${t("app.prototype")}</span>
      </div>
      ${storageBanner()}
      <main class="auth__card" id="main">
        <div class="view" data-view>${view.html}</div>
      </main>
      <p class="auth__foot">${t("auth.footNote")} <a href="${WAITLIST_URL}">${t("app.joinWaitlist")}</a></p>
    </div>`.toString();
  return appRoot.querySelector("[data-view]");
}

function renderShellFrame(account) {
  appRoot.innerHTML = html`
    <div class="shell">
      <header class="appbar">
        <a class="appbar__brand" href="#/dashboard" aria-label="${t("nav.home")}">${raw(logoSvg(t("app.name")))}</a>
        <span class="badge">${t("app.prototype")}</span>
        <div class="appbar__end">${langToggle()}</div>
      </header>

      <nav class="nav" aria-label="${t("nav.label")}">
        ${NAV_ITEMS.map((item) => html`
          <a class="nav__link" href="#${item.path}" data-nav="${item.key}">
            ${icon(item.icon)}<span class="nav__label">${t(`nav.${item.key}`)}</span>
          </a>`)}
        <div class="nav__extra nav__spacer"></div>
        <div class="nav__extra account-card">
          <span class="account-card__business">${businessNameOf(account)}</span>
          <span class="account-card__owner">${account.isDemo ? t("settings.demoAccount") : ownerNameOf(account)}</span>
        </div>
        <p class="nav__extra nav__waitlist"><a href="${WAITLIST_URL}">${t("app.joinWaitlistNudge")}</a></p>
        <button type="button" class="nav__link nav__logout" data-logout>
          ${icon("logout")}<span class="nav__label">${t("nav.logOut")}</span>
        </button>
      </nav>

      <main class="main" id="main">
        ${storageBanner()}
        <div class="view" data-view></div>
      </main>
    </div>`.toString();
}

function renderShellLayout(view, account, navKey) {
  const key = `${getLang()}|${account.id}`;
  if (shellKey !== key || !appRoot.querySelector(".shell")) {
    renderShellFrame(account);
    shellKey = key;
  }

  appRoot.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === navKey) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  // A fresh element each time, so the fade-in plays on every page
  const old = appRoot.querySelector("[data-view]");
  const next = document.createElement("div");
  next.className = "view";
  next.dataset.view = "";
  next.innerHTML = view.html.toString();
  old.replaceWith(next);
  return next;
}

/* ---------- Rendering ---------- */

function render({ keepInputs = false } = {}) {
  const { path, query } = currentLocation();
  const account = currentAccount();

  if (path === "/") {
    navigate(account ? "/dashboard" : "/login", { replace: true });
    return;
  }

  const match = matchRoute(path);
  if (!account && (!match || !match.route.public)) {
    const target = `${path}${query.toString() ? `?${query}` : ""}`;
    navigate(match ? `/login?next=${encodeURIComponent(target)}` : "/login", { replace: true });
    return;
  }
  if (match && match.route.guestOnly && account) {
    navigate("/dashboard", { replace: true });
    return;
  }
  if (match && match.route.action) {
    match.route.action();
    return;
  }

  // When redrawing the same page (language switch, Undo), keep what was typed
  const saved = keepInputs && currentView ? snapshotInputs(currentView.container) : null;
  const draft = keepInputs && currentView && currentView.getDraft ? currentView.getDraft() : null;
  if (currentView && currentView.unmount) currentView.unmount();

  const ctx = {
    params: match ? match.params : {},
    query,
    account,
    draft,
    navigate,
    rerender: () => render({ keepInputs: true }),
  };
  const view = (match ? match.route.view : notFoundView)(ctx);
  const container = match && match.route.public
    ? renderAuthLayout(view)
    : renderShellLayout(view, account, match ? match.route.nav : "");

  if (saved) restoreInputs(container, saved);
  updateLtrInputs(container);
  if (view.mount) view.mount(container, ctx);
  currentView = { ...view, container };

  document.title = `${view.title || t(view.titleKey)} · ${t("app.titleSuffix")}`;

  // Move focus to the new page's heading (helps keyboard and screen-reader users)
  if (!keepInputs) {
    if (!firstRender) {
      window.scrollTo(0, 0);
      const heading = container.querySelector("[data-autofocus]");
      if (heading) heading.focus({ preventScroll: true });
    }
    firstRender = false;
  }
}

function safeRender(options) {
  try {
    render(options);
  } catch (error) {
    console.error(error);
    appRoot.innerHTML = html`
      <div class="boot">
        <div class="boot__error">
          <p>${t("app.loadError")}</p>
          <p class="boot__actions"><button type="button" class="btn btn--accent" data-reload>${t("app.reload")}</button></p>
        </div>
      </div>`.toString();
  }
}

/* ---------- Start ---------- */

async function boot() {
  try {
    await initI18n();
  } catch (error) {
    console.error(error);
    appRoot.innerHTML = '<p class="boot__error">Couldn\'t load Raseed. Check your connection and reload the page.<br><br>تعذّر تحميل رصيد. تحقّق من اتصالك وأعد تحميل الصفحة.</p>';
    return;
  }

  appRoot.classList.remove("boot");
  enhance(appRoot);

  appRoot.addEventListener("click", (event) => {
    const langButton = event.target.closest("[data-set-lang]");
    if (langButton) {
      setLang(langButton.dataset.setLang);
      return;
    }
    if (event.target.closest("[data-logout]")) {
      logOut();
      navigate("/login", { replace: true });
      toast(t("settings.loggedOut"));
      return;
    }
    if (event.target.closest("[data-reload]")) window.location.reload();
  });

  onLangChange(() => safeRender({ keepInputs: true }));
  // Data changed outside the current page (e.g. Undo in a message): redraw it
  window.addEventListener("raseed:data", () => safeRender({ keepInputs: true }));
  onRouteChange(() => safeRender());

  // Logging in or out in another tab updates this one too
  window.addEventListener("storage", (event) => {
    if (isSessionStorageEvent(event)) safeRender();
  });

  safeRender();
}

boot();
