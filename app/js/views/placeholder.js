// "Page not found".

import { t } from "../i18n.js";
import { html, icon } from "../ui.js";

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
