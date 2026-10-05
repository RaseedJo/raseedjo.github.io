// Home screen. For now: a greeting and a note that the dashboard is coming.
// The full dashboard (summary cards, charts, recent orders) replaces this later.

import { t } from "../i18n.js";
import { html, icon } from "../ui.js";
import { firstNameOf, businessNameOf } from "../auth.js";

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "dashboard.morning";
  if (hour < 18) return "dashboard.afternoon";
  return "dashboard.evening";
}

export function homeView({ account }) {
  return {
    titleKey: "dashboard.title",
    html: html`
      <div class="page-head">
        <div>
          <h1 class="page-title" tabindex="-1" data-autofocus>${t(greetingKey(), { name: firstNameOf(account) })}</h1>
          <p class="page-sub">${businessNameOf(account)}</p>
        </div>
      </div>

      <section class="card">
        <div class="empty">
          <span class="empty__icon">${icon("sparkle")}</span>
          <h2 class="empty__title">${t("dashboard.comingTitle")}</h2>
          <p class="empty__text">${t("dashboard.comingBody")}</p>
        </div>
      </section>

      <div class="nudge">
        <p class="nudge__text">${t("app.joinWaitlistNudge")}</p>
        <a class="btn btn--accent" href="../#signup">${t("app.joinWaitlist")} ${icon("arrow")}</a>
      </div>`,
  };
}
