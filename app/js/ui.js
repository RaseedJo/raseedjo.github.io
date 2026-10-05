// Small UI helpers: safe HTML templates, icons, toasts, confirm dialogs,
// the language toggle, and form helpers.

import { t, getLang } from "./i18n.js";

/* ---------- Safe HTML ---------- */

// Everything interpolated into html`` is escaped unless wrapped in raw(),
// so text people type (names, notes) can never break the page.

class SafeHTML {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function raw(value) {
  return value instanceof SafeHTML ? value : new SafeHTML(String(value));
}

function renderValue(value) {
  if (value == null || value === false) return "";
  if (Array.isArray(value)) return value.map(renderValue).join("");
  if (value instanceof SafeHTML) return value.value;
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += renderValue(value) + strings[i + 1]; });
  return new SafeHTML(out);
}

/* ---------- Icons (24×24, drawn with strokes) ---------- */

const ICONS = {
  home: '<path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9.2v10.3h4.5v-5.5h4v5.5h4.5V9.2"/>',
  orders: '<path d="M5.2 8h13.6l-1 12.5H6.2L5.2 8Z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
  customers: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.8c.4-3.4 2.9-5.6 6.2-5.6s5.8 2.2 6.2 5.6"/><path d="M15.6 4.9a3.2 3.2 0 0 1 0 6.2"/><path d="M17.8 14.5c1.9.8 3.1 2.6 3.4 5.3"/>',
  invoices: '<path d="M6 2.8h8.6L19 7.2v14H6V2.8Z"/><path d="M14.3 3v4.6h4.6"/><path d="M9 12.5h7M9 16.5h4.5"/>',
  settings: '<path d="M4 7h9.2M17.8 7H20M4 17h3.2M11.8 17H20"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="9.5" cy="17" r="2.3"/>',
  logout: '<path d="M10 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h4"/><path d="M15.5 8l4 4-4 4M19.5 12H9.5"/>',
  arrow: '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>',
  sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9L12 3.5Z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
  tools: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z"/>',
};

// Icons that point somewhere and must be mirrored in Arabic
const DIRECTIONAL = new Set(["arrow", "logout"]);

export function icon(name, extraClass = "") {
  const cls = ["icon", DIRECTIONAL.has(name) ? "icon--dir" : "", extraClass].filter(Boolean).join(" ");
  return raw(`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`);
}

/* ---------- Language toggle (same markup as the landing page) ---------- */

export function langToggle() {
  const lang = getLang();
  return html`
    <div class="lang" role="group" dir="ltr" data-active="${lang}" aria-label="${t("lang.group")}">
      <button type="button" class="lang__btn" data-set-lang="en" lang="en" aria-label="English" aria-pressed="${lang === "en"}">EN</button>
      <span class="lang__sep" aria-hidden="true"></span>
      <button type="button" class="lang__btn" data-set-lang="ar" lang="ar" aria-label="العربية" aria-pressed="${lang === "ar"}">ع</button>
      <span class="lang__dot" aria-hidden="true"></span>
    </div>`;
}

/* ---------- Toasts ---------- */

let toastRoot = null;

function ensureToastRoot() {
  if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
  toastRoot = document.createElement("div");
  toastRoot.className = "toasts";
  toastRoot.setAttribute("role", "status");
  toastRoot.setAttribute("aria-live", "polite");
  document.body.appendChild(toastRoot);
  return toastRoot;
}

/** Short message at the bottom of the screen, optionally with an action (e.g. Undo). */
export function toast(message, { action, duration = 4500 } = {}) {
  const root = ensureToastRoot();
  root.classList.toggle("toasts--top", Boolean(document.querySelector(".auth")));
  const el = document.createElement("div");
  el.className = action ? "toast toast--action" : "toast";
  el.innerHTML = html`<span class="toast__text">${message}</span>${action ? html`<button type="button" class="toast__action">${action.label}</button>` : ""}`;
  root.appendChild(el);

  let timer = null;
  const dismiss = () => {
    window.clearTimeout(timer);
    el.classList.add("is-leaving");
    window.setTimeout(() => el.remove(), 200);
  };
  if (action) {
    el.querySelector(".toast__action").addEventListener("click", () => {
      action.onClick();
      dismiss();
    });
  }
  timer = window.setTimeout(dismiss, action ? Math.max(duration, 6000) : duration);
  return dismiss;
}

/* ---------- Confirm dialog ---------- */

/** Resolves to true if the person confirms. Cancel is focused first for risky actions. */
export function confirmDialog({ title, body, confirmLabel, danger = false }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.setAttribute("aria-labelledby", "dialog-title");
    dialog.setAttribute("aria-describedby", "dialog-body");
    dialog.innerHTML = html`
      <div class="dialog__card">
        <h2 class="dialog__title" id="dialog-title">${title}</h2>
        <p class="dialog__body" id="dialog-body">${body}</p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--ghost" data-answer="no">${t("common.cancel")}</button>
          <button type="button" class="btn ${danger ? "btn--danger" : "btn--primary"}" data-answer="yes">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    let answer = false;
    dialog.addEventListener("click", (event) => {
      const button = event.target.closest("[data-answer]");
      if (button) {
        answer = button.dataset.answer === "yes";
        dialog.close();
      } else if (event.target === dialog) {
        dialog.close(); // tap outside the card
      }
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(answer);
    });

    dialog.showModal();
    dialog.querySelector(danger ? '[data-answer="no"]' : '[data-answer="yes"]').focus();
  });
}

/* ---------- Forms ---------- */

/** A labelled text input with optional hint and an error slot. */
export function field({ name, label, type = "text", value = "", hint = "", autocomplete = "", placeholder = "", inputmode = "", ltr = false }) {
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : "", `${id}-error`].filter(Boolean).join(" ");
  return html`
    <div class="field" data-field="${name}">
      <label class="field__label" for="${id}">${label}</label>
      <input class="input" id="${id}" name="${name}" type="${type}" value="${value}"
             ${raw(autocomplete ? `autocomplete="${autocomplete}"` : "")}
             ${raw(placeholder ? `placeholder="${escapeHtml(placeholder)}"` : "")}
             ${raw(inputmode ? `inputmode="${inputmode}"` : "")}
             ${raw(ltr ? "data-ltr" : "")}
             aria-describedby="${describedBy}">
      ${hint ? html`<p class="field__hint" id="${id}-hint">${hint}</p>` : ""}
      <p class="field__error" id="${id}-error" hidden></p>
    </div>`;
}

/** Password input with a show/hide button. */
export function passwordField({ name = "password", label, hint = "", autocomplete = "current-password" }) {
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : "", `${id}-error`].filter(Boolean).join(" ");
  return html`
    <div class="field" data-field="${name}">
      <label class="field__label" for="${id}">${label}</label>
      <div class="input-wrap">
        <input class="input" id="${id}" name="${name}" type="password" autocomplete="${autocomplete}" data-ltr aria-describedby="${describedBy}">
        <button type="button" class="input-wrap__btn" data-toggle-password aria-controls="${id}" aria-pressed="false" aria-label="${t("auth.showPassword")}">${icon("eye")}</button>
      </div>
      ${hint ? html`<p class="field__hint" id="${id}-hint">${hint}</p>` : ""}
      <p class="field__error" id="${id}-error" hidden></p>
    </div>`;
}

export function setFieldError(form, name, message) {
  const wrap = form.querySelector(`[data-field="${name}"]`);
  if (!wrap) return;
  const error = wrap.querySelector(".field__error");
  const control = wrap.querySelector("input, select, textarea");
  const group = wrap.matches("fieldset") ? wrap : null;
  if (message) {
    error.innerHTML = html`${icon("alert")}<span>${message}</span>`;
    error.hidden = false;
    (group || control).setAttribute("aria-invalid", "true");
  } else {
    error.hidden = true;
    error.textContent = "";
    (group || control).removeAttribute("aria-invalid");
  }
}

export function clearFieldErrors(form) {
  form.querySelectorAll("[data-field]").forEach((wrap) => setFieldError(form, wrap.dataset.field, ""));
}

/** Focus the first field that has an error. */
export function focusFirstError(form) {
  const invalid = form.querySelector('[aria-invalid="true"]');
  if (!invalid) return;
  const target = invalid.matches("fieldset") ? invalid.querySelector("input") : invalid;
  target.focus();
}

/** Show a spinner and block repeat clicks while something is running. */
export function setBusy(button, busy, busyLabel) {
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.setAttribute("aria-disabled", "true");
    button.innerHTML = html`<span class="btn__spinner" aria-hidden="true"></span><span>${busyLabel}</span>`.toString();
  } else if (button.dataset.label) {
    button.innerHTML = button.dataset.label;
    button.removeAttribute("aria-disabled");
    delete button.dataset.label;
  }
}

/** Remember what's typed in a view, so switching language doesn't wipe it. */
export function snapshotInputs(root) {
  const values = {};
  root.querySelectorAll("input[name], select[name], textarea[name]").forEach((el) => {
    if (el.type === "radio" || el.type === "checkbox") {
      if (el.checked) values[`${el.name}::${el.value}`] = true;
    } else {
      values[el.name] = el.value;
    }
  });
  return values;
}

export function restoreInputs(root, values) {
  root.querySelectorAll("input[name], select[name], textarea[name]").forEach((el) => {
    if (el.type === "radio" || el.type === "checkbox") {
      el.checked = Boolean(values[`${el.name}::${el.value}`]);
    } else if (el.name in values) {
      el.value = values[el.name];
    }
  });
  updateLtrInputs(root);
}

/* Emails and passwords are typed left-to-right even on the Arabic page,
   while an empty field keeps the page's direction for its placeholder. */
export function updateLtrInputs(root) {
  root.querySelectorAll("input[data-ltr]").forEach((input) => { input.dir = input.value ? "ltr" : ""; });
}

/** Wire up behaviour shared by every view (password toggles, LTR inputs). */
export function enhance(root) {
  root.addEventListener("input", (event) => {
    if (event.target.matches("input[data-ltr]")) event.target.dir = event.target.value ? "ltr" : "";
  });
  root.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-password]");
    if (!toggle) return;
    const input = root.querySelector(`#${toggle.getAttribute("aria-controls")}`);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", t(show ? "auth.hidePassword" : "auth.showPassword"));
    toggle.innerHTML = icon(show ? "eyeOff" : "eye").toString();
  });
  updateLtrInputs(root);
}
