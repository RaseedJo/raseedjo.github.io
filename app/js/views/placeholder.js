// "Coming soon" pages for sections that aren't built yet, and "page not found".

import { t } from "../i18n.js";
import { html, icon } from "../ui.js";

export function comingSoonView(titleKey, iconName) {
  return () => ({
    titleKey,
    html: html`
      <div class="page-head">
        <h1 class="page-title" tabindex="-1" data-autofocus>${t(titleKey)}</h1>
      </div>
      <section class="card">
        <div class="empty">
          <span class="empty__icon">${icon(iconName)}</span>
          <h2 class="empty__title">${t("placeholder.title")}</h2>
          <p class="empty__text">${t("placeholder.body")}</p>
        </div>
      </section>`,
  });
}

export function notFoundView() {
  return {
    titleKey: "notFound.title",
    html: html`
      <section class="card">
        <div class="empty">
          <span class="empty__icon">${icon("alert")}</span>
          <h1 class="empty__title" tabindex="-1" data-autofocus>${t("notFound.title")}</h1>
          <p class="empty__text">${t("notFound.body")}</p>
          <a class="btn btn--primary" href="#/dashboard">${t("notFound.home")}</a>
        </div>
      </section>`,
  };
}
