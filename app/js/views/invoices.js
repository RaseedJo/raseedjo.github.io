// Invoices: the list, and a single invoice laid out like a paper document.
// "Download PDF" uses the browser's print window with a print-only stylesheet
// (css/print.css), which keeps Arabic text shaped correctly.

import { t, tp, localText, formatNumber, formatDate } from "../i18n.js";
import { html, raw, icon, toast } from "../ui.js";
import { loadData } from "../data.js";
import { logoSvg } from "../logo.js";
import { formatMoney, formatPhone, formatDay, matchesQuery } from "../model.js";
import {
  invoiceOrder, invoicePayment, isOutdated, issueInvoice, sellerSnapshot, qrText,
} from "../invoice-model.js";
import { paidPill, trySave, emptyState, missingView, backLink } from "./components.js";
import { qrcode } from "../../vendor/qrcode-generator-2.0.4/qrcode.mjs";
import { stringToBytes as utf8Bytes } from "../../vendor/qrcode-generator-2.0.4/qrcode_UTF8.mjs";

// Encode QR text as UTF-8 so Arabic names survive scanning
qrcode.stringToBytes = utf8Bytes;

function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
    .replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
}

const newestFirst = (a, b) => (a.issuedAt < b.issuedAt ? 1 : a.issuedAt > b.issuedAt ? -1 : b.seq - a.seq);

/* ==========================================================================
   List
   ========================================================================== */

function invoiceRow(invoice, order) {
  const payment = invoicePayment(invoice, order);
  return html`
    <li>
      <a class="invoice-row" href="#/invoices/${invoice.id}">
        <span class="invoice-row__main">
          <span class="invoice-row__number"><span class="ltr num">${invoice.number}</span></span>
          <span class="invoice-row__customer">${localText(invoice.customer.name) || t("orders.unknownCustomer")}</span>
          <span class="invoice-row__meta">${icon("calendar")}${formatDay(invoice.issuedAt)}<span aria-hidden="true">·</span><span class="num">${t("orders.orderNumber", { number: invoice.orderNumber })}</span></span>
        </span>
        <span class="invoice-row__side">
          <span class="invoice-row__total num">${formatMoney(invoice.total)}</span>
          ${invoice.replacedBy ? html`<span class="pill pill--cancelled">${t("invoices.replacedPill")}</span>` : paidPill(payment.paid)}
        </span>
      </a>
    </li>`;
}

export function invoicesListView({ account, query }) {
  const state = { q: query.get("q") || "" };

  return {
    titleKey: "invoices.title",
    html: html`
      <div class="page-head">
        <div>
          <h1 class="page-title" tabindex="-1" data-autofocus>${t("invoices.title")}</h1>
          <p class="page-sub" data-count></p>
        </div>
      </div>
      <div class="toolbar">
        <div class="search">
          <label class="visually-hidden" for="invoices-q">${t("invoices.searchLabel")}</label>
          ${icon("search")}
          <input class="input search__input" id="invoices-q" name="q" type="search" value="${state.q}"
                 placeholder="${t("invoices.searchPlaceholder")}" autocomplete="off" enterkeyhint="search">
        </div>
      </div>
      <p class="visually-hidden" role="status" data-announce></p>
      <div data-results></div>`,

    mount(root) {
      const results = root.querySelector("[data-results]");
      const count = root.querySelector("[data-count]");
      const announce = root.querySelector("[data-announce]");
      const search = root.querySelector("#invoices-q");
      state.q = search.value;

      function draw() {
        const data = loadData(account);
        count.textContent = tp("invoices.count", data.invoices.length);
        const orders = new Map(data.orders.map((o) => [o.id, o]));
        const list = data.invoices
          .filter((inv) => matchesQuery([inv.number, inv.customer.name, `#${inv.orderNumber}`], state.q))
          .sort(newestFirst);

        if (!data.invoices.length) {
          results.innerHTML = emptyState({
            iconName: "invoices",
            title: t("invoices.emptyTitle"),
            body: t("invoices.emptyBody"),
            action: html`<a class="btn btn--primary" href="#/orders">${t("invoices.goToOrders")}</a>`,
          });
        } else if (!list.length) {
          results.innerHTML = emptyState({
            iconName: "search",
            title: t("invoices.noResultsTitle"),
            body: t("invoices.noResultsBody"),
            action: html`<button type="button" class="btn btn--ghost" data-clear>${t("invoices.clearSearch")}</button>`,
          });
        } else {
          results.innerHTML = html`<ul class="invoice-list">${list.map((inv) => invoiceRow(inv, orders.get(inv.orderId)))}</ul>`;
        }
        announce.textContent = state.q.trim() ? tp("invoices.count", list.length) : "";
      }

      let timer = 0;
      search.addEventListener("input", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          state.q = search.value;
          window.history.replaceState(null, "", state.q.trim() ? `#/invoices?q=${encodeURIComponent(state.q.trim())}` : "#/invoices");
          draw();
        }, 150);
      });
      results.addEventListener("click", (event) => {
        if (!event.target.closest("[data-clear]")) return;
        state.q = "";
        search.value = "";
        window.history.replaceState(null, "", "#/invoices");
        draw();
        search.focus();
      });

      draw();
    },
  };
}

/* ==========================================================================
   One invoice
   ========================================================================== */

/** Issue an invoice for an order (also used by the order page). Returns { id, number } or null. */
export function createInvoice(account, orderId) {
  const saved = trySave(account, (data) => {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order) return null;
    const invoice = issueInvoice(data, order, sellerSnapshot(account));
    return { id: invoice.id, number: invoice.number };
  });
  return saved.ok ? saved.result : null;
}

export function invoiceView({ account, params }) {
  const data = loadData(account);
  const invoice = data.invoices.find((inv) => inv.id === params.id);
  if (!invoice) {
    return missingView({ titleKey: "invoices.missingTitle", bodyKey: "invoices.missingBody", backHref: "#/invoices", backKey: "invoices.back" });
  }

  const order = invoiceOrder(data, invoice);
  const payment = invoicePayment(invoice, order);
  const outdated = isOutdated(invoice, order);
  const replacement = invoice.replacedBy ? data.invoices.find((inv) => inv.id === invoice.replacedBy) : null;
  const replaced = invoice.replaces ? data.invoices.find((inv) => inv.id === invoice.replaces) : null;
  const seller = invoice.seller;
  const customerName = localText(invoice.customer.name) || t("orders.unknownCustomer");
  const area = localText(invoice.customer.area);
  const qr = qrSvg(qrText(invoice, {
    title: t("invoices.qr.title"),
    invoice: t("invoices.qr.invoice"),
    seller: t("invoices.qr.seller"),
    date: t("invoices.qr.date"),
    total: t("invoices.qr.total"),
  }));

  return {
    // Also the suggested file name when saving as PDF
    title: `${invoice.number} · ${localText(seller.businessName)}`,
    html: html`
      <div class="no-print">
        ${order
          ? backLink(`#/orders/${order.id}`, t("invoices.backToOrder", { number: invoice.orderNumber }))
          : backLink("#/invoices", t("invoices.back"))}
        <div class="page-head">
          <h1 class="page-title" tabindex="-1" data-autofocus>${t("invoices.heading")} <span class="ltr">${invoice.number}</span></h1>
          <div class="page-head__actions">
            <button type="button" class="btn btn--primary" data-action="print">${icon("download")} ${t("invoices.download")}</button>
          </div>
        </div>
        <p class="fine-print invoice-hint">${t("invoices.downloadHint")}</p>

        ${outdated ? html`
          <div class="callout callout--warn" role="status">
            ${icon("alert")}
            <div class="callout__body">
              <p class="callout__title">${t("invoices.changedTitle")}</p>
              <p>${t("invoices.changedBody")}</p>
              <button type="button" class="btn btn--primary btn--sm callout__action" data-action="reissue">${t("invoices.reissue")}</button>
            </div>
          </div>` : ""}
        ${replacement ? html`
          <p class="callout callout--info">${icon("info")}<span>${t("invoices.replacedBy", { number: replacement.number })}
            <a class="link" href="#/invoices/${replacement.id}">${t("invoices.seeNew", { number: replacement.number })}</a></span></p>` : ""}
        ${order ? "" : html`<p class="callout callout--info">${icon("info")}<span>${t("invoices.orderDeleted")}</span></p>`}
      </div>

      <article class="invoice" aria-labelledby="invoice-kind">
        <header class="invoice__head">
          <div class="invoice__brand">${raw(logoSvg(t("app.name")))}</div>
          <div class="invoice__title">
            <p class="invoice__kind" id="invoice-kind">${t("invoices.heading")}</p>
            <p class="invoice__number"><span class="ltr num">${invoice.number}</span></p>
          </div>
        </header>

        <p class="invoice__sample">${icon("info")}<span>${t("invoices.sampleLabel")}</span></p>
        ${replaced ? html`<p class="invoice__replaces">${t("invoices.replaces", { number: replaced.number })}</p>` : ""}

        <div class="invoice__parties">
          <section>
            <h2 class="invoice__label">${t("invoices.seller")}</h2>
            <p class="invoice__strong">${localText(seller.businessName)}</p>
            <p>${localText(seller.ownerName)}</p>
            <p>${t(`auth.businessTypes.${seller.businessType}`)}</p>
            ${seller.email ? html`<p><span class="ltr">${seller.email}</span></p>` : ""}
          </section>
          <section>
            <h2 class="invoice__label">${t("invoices.billTo")}</h2>
            <p class="invoice__strong">${customerName}</p>
            ${invoice.customer.phone ? html`<p><span class="ltr num">${formatPhone(invoice.customer.phone)}</span></p>` : ""}
            ${area ? html`<p>${area}</p>` : ""}
          </section>
        </div>

        <dl class="invoice__meta">
          <div><dt>${t("invoices.number")}</dt><dd><span class="ltr num">${invoice.number}</span></dd></div>
          <div><dt>${t("invoices.date")}</dt><dd>${formatDate(invoice.issuedAt, { day: "numeric", month: "long", year: "numeric" })}</dd></div>
          <div><dt>${t("invoices.order")}</dt><dd class="num">#${invoice.orderNumber}</dd></div>
        </dl>

        <table class="invoice__items">
          <thead>
            <tr>
              <th scope="col">${t("invoices.item")}</th>
              <th scope="col" class="num-col col-qty">${t("invoices.qty")}</th>
              <th scope="col" class="num-col col-unit">${t("invoices.unitPrice")}</th>
              <th scope="col" class="num-col">${t("invoices.amount")}</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item) => html`
              <tr>
                <td>${localText(item.name)}<span class="invoice__unit-inline num">${formatNumber(item.qty)} × ${formatMoney(item.unitPrice)}</span></td>
                <td class="num-col col-qty num">${formatNumber(item.qty)}</td>
                <td class="num-col col-unit num">${formatMoney(item.unitPrice)}</td>
                <td class="num-col num">${formatMoney(item.qty * item.unitPrice)}</td>
              </tr>`)}
          </tbody>
        </table>

        <div class="invoice__bottom">
          <figure class="invoice__qr">
            <div class="invoice__qr-code" role="img" aria-label="${t("invoices.qrLabel")}">${raw(qr)}</div>
            <figcaption>${t("invoices.qrCaption")}</figcaption>
          </figure>
          <dl class="invoice__totals">
            <dt>${t("invoices.subtotal")}</dt><dd class="num">${formatMoney(invoice.subtotal)}</dd>
            ${invoice.taxRate ? html`<dt>${t("invoices.tax", { rate: formatNumber(invoice.taxRate) })}</dt><dd class="num">${formatMoney(invoice.tax)}</dd>` : ""}
            <dt class="grand">${t("invoices.total")}</dt><dd class="grand num">${formatMoney(invoice.total)}</dd>
          </dl>
        </div>

        <dl class="invoice__payment">
          <div><dt>${t("invoices.paymentMethod")}</dt><dd>${t(`payment.${payment.method}`)}</dd></div>
          <div><dt>${t("invoices.paymentStatus")}</dt><dd>${paidPill(payment.paid)}</dd></div>
        </dl>

        <footer class="invoice__foot">
          <p class="invoice__thanks">${t("invoices.thanks")}</p>
          <p class="invoice__made">${t("invoices.madeWith")}</p>
        </footer>
      </article>`,

    mount(root, ctx) {
      root.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-action]");
        if (!action) return;

        if (action.dataset.action === "print") {
          await document.fonts.ready; // make sure the Arabic font is ready before printing
          window.print();
        }

        if (action.dataset.action === "reissue" && order) {
          const created = createInvoice(account, order.id);
          if (!created) return;
          ctx.navigate(`/invoices/${created.id}`, { replace: true });
          toast(t("invoices.reissued", { number: created.number, old: invoice.number }));
        }
      });
    },
  };
}
