// Settings: business details, demo reset, log out, delete account.

import { t } from "../i18n.js";
import { html, icon, confirmDialog, toast } from "../ui.js";
import {
  businessNameOf, ownerNameOf, logOut, resetDemoData, deleteAccount,
} from "../auth.js";
import { StorageFullError } from "../store.js";
import { loadData } from "../data.js";
import { formatNumber } from "../i18n.js";
import { toWesternDigits } from "../model.js";
import { trySave } from "./components.js";

/** "16", "7.5", "١٦" → number from 0 to 100, or NaN */
function parseRate(text) {
  const value = toWesternDigits(text).trim().replace(/[٫,]/, ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return Number.NaN;
  const rate = Number(value);
  return rate >= 0 && rate <= 100 ? rate : Number.NaN;
}

export function settingsView({ account }) {
  const business = businessNameOf(account);
  const { settings } = loadData(account);

  return {
    titleKey: "settings.title",
    html: html`
      <div class="page-head">
        <h1 class="page-title" tabindex="-1" data-autofocus>${t("settings.title")}</h1>
      </div>

      <section class="settings-group" aria-labelledby="set-business">
        <h2 class="settings-group__title" id="set-business">${t("settings.business")}</h2>
        <div class="card settings-card">
          <dl class="details">
            <dt>${t("settings.businessName")}</dt><dd>${business}</dd>
            <dt>${t("settings.owner")}</dt><dd>${ownerNameOf(account)}</dd>
            <dt>${t("settings.type")}</dt><dd>${t(`auth.businessTypes.${account.businessType}`)}</dd>
            <dt>${t("settings.email")}</dt>
            <dd>${account.isDemo ? t("settings.demoAccount") : html`<span class="ltr">${account.email}</span>`}</dd>
          </dl>
        </div>
      </section>

      <section class="settings-group" aria-labelledby="set-tax">
        <h2 class="settings-group__title" id="set-tax">${t("settings.invoicesTitle")}</h2>
        <div class="card settings-card">
          <div class="row">
            <div class="row__text">
              <label class="row__label" for="tax-enabled">${t("settings.taxLabel")}</label>
              <p class="row__hint" id="tax-hint">${t("settings.taxHint")}</p>
            </div>
            <input type="checkbox" class="switch" role="switch" id="tax-enabled" aria-describedby="tax-hint" ${settings.taxEnabled ? "checked" : ""}>
          </div>
          <div class="row" data-field="taxRate">
            <div class="row__text">
              <label class="row__label" for="tax-rate">${t("settings.taxRate")}</label>
              <p class="field__error" id="tax-rate-error" hidden></p>
            </div>
            <input class="input input--rate num" id="tax-rate" name="taxRate" inputmode="decimal" autocomplete="off"
                   value="${formatNumber(settings.taxRate, settings.taxRate % 1 ? 2 : 0)}" aria-describedby="tax-rate-error" ${settings.taxEnabled ? "" : "disabled"}>
          </div>
        </div>
      </section>

      ${account.isDemo ? html`
        <section class="settings-group" aria-labelledby="set-demo">
          <h2 class="settings-group__title" id="set-demo">${t("settings.demoTitle")}</h2>
          <div class="card settings-card">
            <div class="row">
              <div class="row__text">
                <p class="row__label">${t("settings.resetDemo")}</p>
                <p class="row__hint">${t("settings.resetDemoHint")}</p>
              </div>
              <button type="button" class="btn btn--ghost btn--sm" data-action="reset-demo">${t("settings.resetDemo")}</button>
            </div>
          </div>
        </section>` : ""}

      <section class="settings-group" aria-labelledby="set-account">
        <h2 class="settings-group__title" id="set-account">${t("settings.accountTitle")}</h2>
        <div class="card settings-card">
          <div class="row">
            <div class="row__text">
              <p class="row__label">${t("settings.logOut")}</p>
              <p class="row__hint">${t("settings.logOutHint")}</p>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" data-action="log-out">${icon("logout")} ${t("settings.logOut")}</button>
          </div>
          ${account.isDemo ? "" : html`
            <div class="row">
              <div class="row__text">
                <p class="row__label">${t("settings.deleteAccount")}</p>
                <p class="row__hint">${t("settings.deleteHint")}</p>
              </div>
              <button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete-account">${t("settings.deleteAccount")}</button>
            </div>`}
        </div>
      </section>

      <section class="settings-group" aria-labelledby="set-about">
        <h2 class="settings-group__title" id="set-about">${t("settings.aboutTitle")}</h2>
        <div class="card">
          <p class="card__text">${t("settings.aboutBody")}</p>
          <p class="card__actions"><a class="link" href="../#signup">${t("app.joinWaitlistNudge")}</a></p>
        </div>
      </section>`,

    mount(root, ctx) {
      const taxSwitch = root.querySelector("#tax-enabled");
      const rateInput = root.querySelector("#tax-rate");
      const rateError = root.querySelector("#tax-rate-error");

      taxSwitch.addEventListener("change", () => {
        const on = taxSwitch.checked;
        const saved = trySave(account, (data) => { data.settings.taxEnabled = on; });
        if (!saved.ok) {
          taxSwitch.checked = !on;
          return;
        }
        rateInput.disabled = !on;
        toast(t(on ? "settings.taxOn" : "settings.taxOff"));
      });

      rateInput.addEventListener("input", () => {
        rateError.hidden = true;
        rateInput.removeAttribute("aria-invalid");
      });

      rateInput.addEventListener("change", () => {
        const rate = parseRate(rateInput.value);
        if (Number.isNaN(rate)) {
          rateError.innerHTML = html`${icon("alert")}<span>${t("settings.taxRateError")}</span>`.toString();
          rateError.hidden = false;
          rateInput.setAttribute("aria-invalid", "true");
          return;
        }
        const saved = trySave(account, (data) => { data.settings.taxRate = rate; });
        if (!saved.ok) return;
        rateInput.value = formatNumber(rate, rate % 1 ? 2 : 0);
        toast(t("settings.taxRateSaved", { rate: rateInput.value }));
      });
      
      root.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const action = button.dataset.action;

        if (action === "log-out") {
          logOut();
          ctx.navigate("/login", { replace: true });
          toast(t("settings.loggedOut"));
        }

        if (action === "reset-demo") {
          const ok = await confirmDialog({
            title: t("settings.resetConfirmTitle"),
            body: t("settings.resetConfirmBody"),
            confirmLabel: t("settings.resetConfirmBtn"),
          });
          if (!ok) return;
          try {
            resetDemoData();
            window.dispatchEvent(new CustomEvent("raseed:data"));
            toast(t("settings.resetDone"));
          } catch (error) {
            toast(error instanceof StorageFullError ? t("errors.storageFull") : t("errors.generic"));
          }
        }

        if (action === "delete-account") {
          const ok = await confirmDialog({
            title: t("settings.deleteConfirmTitle"),
            body: t("settings.deleteConfirmBody", { business }),
            confirmLabel: t("settings.deleteConfirmBtn"),
            danger: true,
          });
          if (!ok) return;
          deleteAccount(account.id);
          ctx.navigate("/login", { replace: true });
          toast(t("settings.deleted"));
        }
      });
    },
  };
}
