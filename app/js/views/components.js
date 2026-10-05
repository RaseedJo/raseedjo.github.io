// Pieces shared by the orders and customers screens.

import { t, localText } from "../i18n.js";
import { html, icon, toast } from "../ui.js";
import { updateData } from "../data.js";
import { StorageFullError } from "../store.js";
import {
  orderTotals, itemsSummary, customerName, formatMoney, formatDay, daysFromToday, NEXT_STATUS,
} from "../model.js";

/* ---------- Labels ---------- */

export function statusPill(status) {
  return html`<span class="pill pill--${status}">${t(`status.${status}`)}</span>`;
}

export function paidPill(paid) {
  return html`<span class="pill ${paid ? "pill--paid" : "pill--unpaid"}">${icon(paid ? "check" : "alert")}${t(paid ? "payment.paid" : "payment.unpaid")}</span>`;
}

/** An order is late if it's still waiting and its delivery date has passed. */
export function isLate(order) {
  return Boolean(order.deliveryDate) && NEXT_STATUS[order.status] && daysFromToday(order.deliveryDate) < 0;
}

/* ---------- One-tap "next step" button ---------- */

export function nextStepButton(order) {
  const next = NEXT_STATUS[order.status];
  if (!next) return "";
  const label = t(next === "in_progress" ? "statusAction.start" : "statusAction.deliver");
  return html`
    <button type="button" class="btn btn--soft btn--sm" data-advance="${order.id}"
            aria-label="${t("statusAction.aria", { number: order.number, status: t(`status.${next}`) })}">
      ${label}
    </button>`;
}

/* ---------- Order row (used in the orders list and on customer pages) ---------- */

export function orderRow(order, customer, { showCustomer = true } = {}) {
  const { total } = orderTotals(order);
  const area = localText(order.deliveryArea);
  const late = isLate(order);
  return html`
    <li class="order-row" data-order="${order.id}" data-status="${order.status}">
      <a class="order-row__main" href="#/orders/${order.id}">
        <span class="order-row__top">
          <span class="order-row__title">${showCustomer ? customerName(customer) : t("orders.orderNumber", { number: order.number })}</span>
          <span class="order-row__total num">${formatMoney(total)}</span>
        </span>
        <span class="order-row__items">${itemsSummary(order)}</span>
        <span class="order-row__meta">
          ${showCustomer ? html`<span class="num">#${order.number}</span>` : ""}
          <span class="order-row__when ${late ? "is-late" : ""}">${icon("calendar")}${order.deliveryDate ? formatDay(order.deliveryDate) : t("orders.noDeliveryDate")}${late ? html` · ${t("orders.late")}` : ""}</span>
          ${area ? html`<span class="order-row__where">${icon("pin")}${area}</span>` : ""}
        </span>
      </a>
      <div class="order-row__foot">
        <span class="order-row__pills">${statusPill(order.status)}${paidPill(order.paid)}</span>
        ${nextStepButton(order)}
      </div>
    </li>`;
}

/* ---------- Saving with friendly errors ---------- */

/** Run updateData; on failure show a message and return { ok: false }. */
export function trySave(account, change) {
  try {
    return { ok: true, result: updateData(account, change) };
  } catch (error) {
    console.error(error);
    toast(error instanceof StorageFullError ? t("errors.storageFull") : t("errors.generic"));
    return { ok: false };
  }
}

/** Ask the app to redraw the current page with the latest data. */
export function refreshPage() {
  window.dispatchEvent(new CustomEvent("raseed:data"));
}

/**
 * Change an order's status and offer Undo.
 * `afterChange` redraws whatever is on screen.
 */
export function setOrderStatus(account, orderId, status, afterChange) {
  let previous = null;
  let number = 0;
  const saved = trySave(account, (data) => {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order || order.status === status) return;
    previous = { status: order.status, updatedAt: order.updatedAt };
    number = order.number;
    order.status = status;
    order.updatedAt = new Date().toISOString();
  });
  if (!saved.ok || !previous) return;
  afterChange();
  toast(t("statusAction.changed", { number, status: t(`status.${status}`) }), {
    action: {
      label: t("common.undo"),
      onClick: () => {
        trySave(account, (data) => {
          const order = data.orders.find((o) => o.id === orderId);
          if (order) Object.assign(order, previous);
        });
        refreshPage();
      },
    },
  });
}

/* ---------- Empty and missing states ---------- */

export function emptyState({ iconName, title, body, action = "" }) {
  return html`
    <div class="card">
      <div class="empty">
        <span class="empty__icon">${icon(iconName)}</span>
        <h2 class="empty__title">${title}</h2>
        ${body ? html`<p class="empty__text">${body}</p>` : ""}
        ${action}
      </div>
    </div>`;
}

/** Shown when an order or customer in the address no longer exists. */
export function missingView({ titleKey, bodyKey, backHref, backKey }) {
  return {
    titleKey,
    html: html`
      <section class="card">
        <div class="empty">
          <span class="empty__icon">${icon("alert")}</span>
          <h1 class="empty__title" tabindex="-1" data-autofocus>${t(titleKey)}</h1>
          <p class="empty__text">${t(bodyKey)}</p>
          <a class="btn btn--primary" href="${backHref}">${t(backKey)}</a>
        </div>
      </section>`,
  };
}

export function backLink(href, label) {
  return html`<a class="back-link" href="${href}">${icon("back")}<span>${label}</span></a>`;
}

/** First letter(s) of a name for the round avatar. Arabic letters join, so use one. */
export function initials(name) {
  const text = localText(name).trim();
  if (!text) return "?";
  if (/[؀-ۿ]/.test(text[0])) return text[0];
  const parts = text.split(/\s+/);
  return `${parts[0][0]}${parts[1] ? parts[1][0] : ""}`.toUpperCase();
}
