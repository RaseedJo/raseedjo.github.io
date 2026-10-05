// Home dashboard: summary tiles, three charts (each with a table view), recent orders.

import { t, tp, getLang, localText, formatNumber, formatDate } from "../i18n.js";
import { html, icon } from "../ui.js";
import { loadData } from "../data.js";
import { firstNameOf, businessNameOf } from "../auth.js";
import {
  STATUSES, NEXT_STATUS, orderTotals, formatMoney, isoDay, daysFromToday, normalizeForSearch,
} from "../model.js";
import { orderRow, setOrderStatus, isLate } from "./components.js";
import { loadChartLib, salesChart, horizontalBars } from "../charts.js";

const DAYS = 30;

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "dashboard.morning";
  if (hour < 18) return "dashboard.afternoon";
  return "dashboard.evening";
}

/* ---------- Numbers ---------- */

/** Everything the dashboard shows, worked out from the account's data. */
export function dashboardNumbers(data, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DAYS - 1)); // today and the 29 days before it

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const salesByDay = new Map(days.map((d) => [isoDay(d), 0]));
  const recent = data.orders.filter((o) => new Date(o.createdAt) >= start);
  const counted = recent.filter((o) => o.status !== "cancelled");

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  recent.forEach((o) => { statusCounts[o.status] += 1; });

  const products = new Map();
  let sales = 0;
  counted.forEach((order) => {
    const { total } = orderTotals(order);
    sales += total;
    const day = isoDay(new Date(order.createdAt));
    if (salesByDay.has(day)) salesByDay.set(day, salesByDay.get(day) + total);
    order.items.forEach((item) => {
      const name = localText(item.name).trim();
      const key = normalizeForSearch(name);
      const entry = products.get(key) || { name, value: 0 };
      entry.value += item.qty * item.unitPrice;
      products.set(key, entry);
    });
  });

  const open = data.orders.filter((o) => o.status !== "cancelled" && !o.paid);
  const waiting = data.orders.filter((o) => NEXT_STATUS[o.status]);

  return {
    days,
    dailySales: days.map((d) => salesByDay.get(isoDay(d))),
    sales,
    orderCount: counted.length,
    unpaidTotal: open.reduce((sum, o) => sum + orderTotals(o).total, 0),
    unpaidCount: open.length,
    waitingCount: waiting.length,
    lateCount: waiting.filter(isLate).length,
    dueTodayCount: waiting.filter((o) => o.deliveryDate && daysFromToday(o.deliveryDate) === 0).length,
    statusCounts,
    topProducts: [...products.values()].sort((a, b) => b.value - a.value).slice(0, 5),
    recentOrders: [...data.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
  };
}

/* ---------- Pieces ---------- */

function tile({ label, value, sub, warn = false }) {
  return html`
    <div class="kpi">
      <p class="kpi__label">${label}</p>
      <p class="kpi__value ${warn ? "kpi__value--warn" : ""}">${value}</p>
      <p class="kpi__sub">${sub}</p>
    </div>`;
}

function chartCard({ id, title, sub, empty, emptyText, table }) {
  return html`
    <section class="card chart-card" aria-labelledby="${id}-title">
      <h2 class="card__title" id="${id}-title">${title}</h2>
      <p class="chart-card__sub">${sub}</p>
      ${empty
        ? html`<p class="chart-card__empty">${emptyText}</p>`
        : html`
          <div class="chart-box chart-box--${id}"><canvas data-chart="${id}" role="img" aria-label="${title}"></canvas></div>
          <details class="chart-table">
            <summary>${t("dashboard.showTable")}</summary>
            ${table}
          </details>`}
    </section>`;
}

function table(headings, rows) {
  return html`
    <table class="data-table">
      <thead><tr>${headings.map((h, i) => html`<th scope="col" class="${i ? "num-col" : ""}">${h}</th>`)}</tr></thead>
      <tbody>${rows.map((cells) => html`<tr>${cells.map((c, i) => (i ? html`<td class="num-col num">${c}</td>` : html`<th scope="row">${c}</th>`))}</tr>`)}</tbody>
    </table>`;
}

/* ---------- View ---------- */

export function dashboardView({ account }) {
  const data = loadData(account);
  const n = dashboardNumbers(data);
  const shortDay = (d) => formatDate(d, { day: "numeric", month: "short" });
  const longDay = (d) => formatDate(d, { weekday: "long", day: "numeric", month: "long" });
  const waitingSub = n.lateCount
    ? tp("dashboard.late", n.lateCount)
    : n.dueTodayCount ? tp("dashboard.dueToday", n.dueTodayCount) : t("dashboard.nothingDue");
  const noSales = n.dailySales.every((v) => v === 0);
  const noOrders = Object.values(n.statusCounts).every((v) => v === 0);
  let charts = [];

  return {
    titleKey: "dashboard.title",
    html: html`
      <div class="page-head">
        <div>
          <h1 class="page-title" tabindex="-1" data-autofocus>${t(greetingKey(), { name: firstNameOf(account) })}</h1>
          <p class="page-sub">${businessNameOf(account)}</p>
        </div>
        <a class="btn btn--primary" href="#/orders/new">${icon("plus")} ${t("dashboard.newOrder")}</a>
      </div>

      <section class="kpis" aria-label="${t("dashboard.kpiLabel")}">
        ${tile({ label: t("dashboard.sales"), value: formatMoney(n.sales), sub: t("dashboard.salesSub") })}
        ${tile({ label: t("dashboard.orders"), value: formatNumber(n.orderCount), sub: t("dashboard.ordersSub") })}
        ${tile({ label: t("dashboard.unpaid"), value: formatMoney(n.unpaidTotal), sub: tp("dashboard.unpaidSub", n.unpaidCount), warn: n.unpaidTotal > 0 })}
        ${tile({ label: t("dashboard.waiting"), value: formatNumber(n.waitingCount), sub: waitingSub, warn: n.lateCount > 0 })}
      </section>

      <p class="callout callout--info" data-charts-error hidden>${icon("info")}<span>${t("dashboard.chartsUnavailable")}</span></p>

      <div class="dash-grid">
        ${chartCard({
          id: "sales",
          title: t("dashboard.salesChart"),
          sub: t("dashboard.salesChartSub"),
          empty: noSales,
          emptyText: t("dashboard.noSales"),
          table: table([t("dashboard.dateCol"), t("dashboard.salesCol")], n.days.map((d, i) => [shortDay(d), formatMoney(n.dailySales[i])]).reverse()),
        })}
        ${chartCard({
          id: "status",
          title: t("dashboard.statusChart"),
          sub: t("dashboard.statusChartSub"),
          empty: noOrders,
          emptyText: t("dashboard.noSales"),
          table: table([t("dashboard.statusCol"), t("dashboard.countCol")], STATUSES.map((s) => [t(`status.${s}`), formatNumber(n.statusCounts[s])])),
        })}
        ${chartCard({
          id: "products",
          title: t("dashboard.productsChart"),
          sub: t("dashboard.productsChartSub"),
          empty: !n.topProducts.length,
          emptyText: t("dashboard.noSales"),
          table: table([t("dashboard.productCol"), t("dashboard.salesCol")], n.topProducts.map((p) => [p.name, formatMoney(p.value)])),
        })}
      </div>

      <section class="dash-recent" aria-labelledby="recent-title">
        <div class="section-head">
          <h2 class="section-title" id="recent-title">${t("dashboard.recentTitle")}</h2>
          ${n.recentOrders.length ? html`<a class="link" href="#/orders">${t("dashboard.viewAll")}</a>` : ""}
        </div>
        ${n.recentOrders.length
          ? html`<ul class="order-list" data-recent>${n.recentOrders.map((o) => orderRow(o, data.customers.find((c) => c.id === o.customerId)))}</ul>`
          : html`<p class="card card__text">${t("dashboard.noRecent")}</p>`}
      </section>

      <div class="nudge">
        <p class="nudge__text">${t("app.joinWaitlistNudge")}</p>
        <a class="btn btn--accent" href="../#signup">${t("app.joinWaitlist")} ${icon("arrow")}</a>
      </div>`,

    async mount(root, ctx) {
      // One-tap status on recent orders
      const recentList = root.querySelector("[data-recent]");
      if (recentList) {
        recentList.addEventListener("click", (event) => {
          const advance = event.target.closest("[data-advance]");
          if (!advance) return;
          const id = advance.dataset.advance;
          const row = advance.closest("[data-order]");
          setOrderStatus(account, id, NEXT_STATUS[row.dataset.status], () => {
            ctx.rerender();
            const link = document.querySelector(`[data-order="${id}"] .order-row__main`);
            if (link) link.focus();
          });
        });
      }

      const canvases = root.querySelectorAll("canvas[data-chart]");
      if (!canvases.length) return;

      let Chart;
      try {
        [Chart] = await Promise.all([loadChartLib(), document.fonts.ready]);
      } catch (error) {
        console.error(error);
        root.querySelector("[data-charts-error]").hidden = false;
        root.querySelectorAll(".chart-box").forEach((box) => { box.hidden = true; });
        root.querySelectorAll(".chart-table").forEach((details) => { details.open = true; });
        return;
      }
      if (!root.isConnected) return; // the person already left the page

      const rtl = getLang() === "ar";
      const font = getComputedStyle(document.body).fontFamily;
      const canvas = (id) => root.querySelector(`canvas[data-chart="${id}"]`);
      const money = (fils) => formatMoney(fils);

      if (canvas("sales")) {
        charts.push(salesChart(Chart, canvas("sales"), {
          labels: n.days.map(shortDay),
          tooltipTitles: n.days.map(longDay),
          values: n.dailySales,
          rtl,
          font,
          formatValue: money,
          formatTick: (value) => formatNumber(value),
        }));
      }
      if (canvas("status")) {
        charts.push(horizontalBars(Chart, canvas("status"), {
          labels: STATUSES.map((s) => t(`status.${s}`)),
          values: STATUSES.map((s) => n.statusCounts[s]),
          rtl,
          font,
          formatValue: (v) => formatNumber(v),
          room: 36,
        }));
      }
      if (canvas("products")) {
        charts.push(horizontalBars(Chart, canvas("products"), {
          labels: n.topProducts.map((p) => p.name),
          values: n.topProducts.map((p) => p.value),
          rtl,
          font,
          formatValue: money,
          namesAbove: true,
          room: 84,
        }));
      }
    },

    unmount() {
      charts.forEach((chart) => chart.destroy());
      charts = [];
    },
  };
}
