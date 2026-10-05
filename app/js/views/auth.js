// Log in and sign up screens.

import { t } from "../i18n.js";
import {
  html, icon, field, passwordField, setFieldError, clearFieldErrors, focusFirstError, setBusy,
} from "../ui.js";
import {
  logIn, signUp, AuthError, cryptoAvailable, emailExists,
  BUSINESS_TYPES, EMAIL_PATTERN, MIN_PASSWORD,
} from "../auth.js";
import { StorageFullError } from "../store.js";

function errorMessage(error) {
  if (error instanceof AuthError) return t(`errors.${error.code}`);
  if (error instanceof StorageFullError) return t("errors.storageFull");
  console.error(error);
  return t("errors.generic");
}

function formAlert(form, message) {
  const alert = form.querySelector("[data-form-alert]");
  if (!message) {
    alert.hidden = true;
    return;
  }
  alert.innerHTML = html`${icon("alert")}<span>${message}</span>`.toString();
  alert.hidden = false;
}

/* ---------- Log in ---------- */

export function loginView({ query }) {
  const next = query.get("next") || "";
  const noCrypto = !cryptoAvailable();

  return {
    titleKey: "auth.logIn",
    html: html`
      <h1 class="auth__title" tabindex="-1" data-autofocus>${t("auth.welcomeTitle")}</h1>
      <p class="auth__lead">${t("auth.welcomeBody")}</p>

      <div class="auth__demo">
        <a class="btn btn--accent btn--block" href="#/demo">${t("auth.tryDemo")} ${icon("arrow")}</a>
        <p class="auth__demo-hint">${t("auth.tryDemoHint")}</p>
      </div>

      <p class="divider">${t("auth.orLogIn")}</p>

      <form class="form" novalidate data-login>
        <div class="callout callout--error" data-form-alert role="alert" ${noCrypto ? "" : "hidden"}>
          ${noCrypto ? html`${icon("alert")}<span>${t("errors.noCrypto")}</span>` : ""}
        </div>
        ${field({ name: "email", label: t("auth.email"), type: "email", autocomplete: "username", inputmode: "email", placeholder: t("auth.placeholders.email"), ltr: true })}
        ${passwordField({ label: t("auth.password"), autocomplete: "current-password" })}
        <button class="btn btn--primary btn--block" type="submit">${t("auth.logIn")}</button>
      </form>

      <p class="auth__switch">${t("auth.noAccount")} <a class="link" href="#/signup">${t("auth.createAccount")}</a></p>`,

    mount(root, ctx) {
      const form = root.querySelector("[data-login]");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button.getAttribute("aria-disabled") === "true") return;
        clearFieldErrors(form);
        formAlert(form, "");

        const email = form.email.value.trim();
        const password = form.password.value;
        if (!email) setFieldError(form, "email", t("errors.required"));
        else if (!EMAIL_PATTERN.test(email)) setFieldError(form, "email", t("errors.emailInvalid"));
        if (!password) setFieldError(form, "password", t("errors.required"));
        if (form.querySelector('[aria-invalid="true"]')) {
          focusFirstError(form);
          return;
        }

        setBusy(button, true, t("auth.loggingIn"));
        try {
          await logIn(email, password);
          ctx.navigate(next.startsWith("/") ? next : "/dashboard", { replace: true });
        } catch (error) {
          setBusy(button, false);
          formAlert(form, errorMessage(error));
          if (error instanceof AuthError && error.code === "loginFailed") {
            form.password.value = "";
            form.password.focus();
          }
        }
      });
    },
  };
}

/* ---------- Sign up ---------- */

function validateSignup(values) {
  const errors = {};
  if (!values.fullName) errors.fullName = t("errors.required");
  else if (values.fullName.length < 2) errors.fullName = t("errors.nameShort");
  if (!values.businessName) errors.businessName = t("errors.required");
  else if (values.businessName.length < 2) errors.businessName = t("errors.nameShort");
  if (!BUSINESS_TYPES.includes(values.businessType)) errors.businessType = t("errors.typeRequired");
  if (!values.email) errors.email = t("errors.required");
  else if (!EMAIL_PATTERN.test(values.email)) errors.email = t("errors.emailInvalid");
  else if (emailExists(values.email)) errors.email = t("errors.emailTaken");
  if (!values.password) errors.password = t("errors.required");
  else if (values.password.length < MIN_PASSWORD) errors.password = t("errors.passwordShort");
  return errors;
}

export function signupView() {
  const noCrypto = !cryptoAvailable();

  return {
    titleKey: "auth.signupTitle",
    html: html`
      <h1 class="auth__title" tabindex="-1" data-autofocus>${t("auth.signupTitle")}</h1>
      <p class="auth__lead">${t("auth.signupBody")}</p>

      <form class="form" novalidate data-signup>
        <p class="callout">${icon("lock")}<span>${t("auth.demoNote")}</span></p>
        <div class="callout callout--error" data-form-alert role="alert" ${noCrypto ? "" : "hidden"}>
          ${noCrypto ? html`${icon("alert")}<span>${t("errors.noCrypto")}</span>` : ""}
        </div>

        ${field({ name: "fullName", label: t("auth.fullName"), autocomplete: "name", placeholder: t("auth.placeholders.fullName") })}
        ${field({ name: "businessName", label: t("auth.businessName"), autocomplete: "organization", placeholder: t("auth.placeholders.businessName") })}

        <fieldset class="choices" data-field="businessType" aria-describedby="f-businessType-error">
          <legend class="choices__legend">${t("auth.businessType")}</legend>
          <div class="choices__list">
            ${BUSINESS_TYPES.map((type) => html`
              <label class="choice">
                <input type="radio" name="businessType" value="${type}">
                <span>${t(`auth.businessTypes.${type}`)}</span>
              </label>`)}
          </div>
          <p class="field__error" id="f-businessType-error" hidden></p>
        </fieldset>

        ${field({ name: "email", label: t("auth.email"), type: "email", autocomplete: "email", inputmode: "email", placeholder: t("auth.placeholders.email"), ltr: true })}
        ${passwordField({ label: t("auth.password"), hint: t("auth.passwordHint"), autocomplete: "new-password" })}

        <button class="btn btn--primary btn--block" type="submit">${t("auth.createAccountBtn")}</button>
        <p class="form__note">${t("auth.waitlistNote")} <a class="link" href="../#signup">${t("app.joinWaitlist")}</a></p>
      </form>

      <p class="auth__switch">${t("auth.haveAccount")} <a class="link" href="#/login">${t("auth.logInLink")}</a></p>`,

    mount(root, ctx) {
      const form = root.querySelector("[data-signup]");

      // Clear a field's error as soon as it's fixed
      form.addEventListener("input", (event) => {
        const wrap = event.target.closest("[data-field]");
        if (!wrap) return;
        const invalid = wrap.getAttribute("aria-invalid") === "true" || wrap.querySelector('[aria-invalid="true"]');
        if (invalid) setFieldError(form, wrap.dataset.field, "");
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button.getAttribute("aria-disabled") === "true") return;
        clearFieldErrors(form);
        formAlert(form, "");

        const values = {
          fullName: form.fullName.value.trim(),
          businessName: form.businessName.value.trim(),
          businessType: form.querySelector('input[name="businessType"]:checked')?.value || "",
          email: form.email.value.trim(),
          password: form.password.value,
        };
        const errors = validateSignup(values);
        Object.entries(errors).forEach(([name, message]) => setFieldError(form, name, message));
        if (Object.keys(errors).length) {
          focusFirstError(form);
          return;
        }
        if (!cryptoAvailable()) {
          formAlert(form, t("errors.noCrypto"));
          return;
        }

        setBusy(button, true, t("auth.creating"));
        try {
          await signUp(values);
          ctx.navigate("/dashboard", { replace: true });
        } catch (error) {
          setBusy(button, false);
          if (error instanceof AuthError && error.code === "emailTaken") {
            setFieldError(form, "email", t("errors.emailTaken"));
            focusFirstError(form);
          } else {
            formAlert(form, errorMessage(error));
          }
        }
      });
    },
  };
}
