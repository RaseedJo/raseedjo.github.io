// Orders: list (filter, search, sort, one-tap status), order page, and the create/edit form.

import { t, tp, getLang, localText, keepIfUnchanged, tList, formatNumber } from "../i18n.js";
import {
  html, icon, toast, confirmDialog, field, textareaField, choiceGroup,
  setFieldError, clearFieldErrors, focusFirstError,
} from "../ui.js";
import { loadData } from "../data.js";
import { newId } from "../store.js";
import { businessNameOf } from "../auth.js";
import {
  STATUSES, PAYMENT_METHODS, NEXT_STATUS, orderTotals, formatMoney, moneyInput, parseMoney, parseQty,
  normalizePhone, formatPhone, formatDay, customerName, findCustomer, nextOrderNumber,
  matchesQuery, normalizeForSearch,
} from "../model.js";
import {
  orderRow, paidPill, setOrderStatus, trySave, emptyState, missingView, backLink, isLate, initials,
} from "./components.js";

const FILTERS = ["all", ...STATUSES, "unpaid"];
const SORTS = ["newest", "oldest", "delivery"];
const NEW_CUSTOMER = "__new";

/* ==========================================================================
   List
   ========================================================================== */

function readListState(query) {
  const status = query.get("status") || "all";
  const sort = query.get("sort") || "newest";
  return {
    status: FILTERS.includes(status) ? status : "all",
    q: query.get("q") || "",
    sort: SORTS.includes(sort) ? sort : "newest",
  };
}

function listHash(state) {
  const params = new URLSearchParams();
  if (state.status !== "all") params.set("status", state.status);
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.sort !== "newest") params.set("sort", state.sort);
  const query = params.toString();
  return `#/orders${query ? `?${query}` : ""}`;
}

const isUnpaid = (order) => !order.paid && order.status !== "cancelled";

function countFor(orders, filter) {
  if (filter === "all") return orders.length;
  if (filter === "unpaid") return orders.filter(isUnpaid).length;
  return orders.filter((o) => o.status === filter).length;
}

function filterLabel(filter) {
  if (filter === "all") return t("orders.all");
  if (filter === "unpaid") return t("orders.unpaid");
  return t(`status.${filter}`);
}

const newestFirst = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function filterAndSort(orders, customers, state) {
  let list = orders.filter((o) => {
    if (state.status === "unpaid") return isUnpaid(o);
    return state.status === "all" || o.status === state.status;
  });

  if (state.q.trim()) {
    list = list.filter((o) => {
      const c = customers.get(o.customerId);
      return matchesQuery(
        [c && c.name, c && c.phone, o.deliveryArea, `#${o.number}`, ...o.items.map((i) => i.name)],
        state.q,
      );
    });
  }

  if (state.sort === "oldest") {
    list.sort((a, b) => newestFirst(b, a));
  } else if (state.sort === "delivery") {
    // Orders still waiting come first (late and soonest at the top), then everything else
    const group = (o) => (NEXT_STATUS[o.status] ? (o.deliveryDate ? 0 : 1) : 2);
    list.sort((a, b) => {
      const g = group(a) - group(b);
      if (g) return g;
      if (group(a) === 0) return compareText(a.deliveryDate, b.deliveryDate) || newestFirst(a, b);
      if (group(a) === 2) return compareText(b.deliveryDate || "", a.deliveryDate || "") || newestFirst(a, b);
      return newestFirst(a, b);
    });
  } else {
    list.sort(newestFirst);
  }
  return list;
}

export function ordersListView({ account, query }) {
  const state = readListState(query);

  return {
    titleKey: "orders.title",
    html: html`
      <div class="page-head">
        <div>
          <h1 class="page-title" tabindex="-1" data-autofocus>${t("orders.title")}</h1>
          <p class="page-sub" data-count></p>
        </div>
        <a class="btn btn--primary page-head__new" href="#/orders/new">${icon("plus")} ${t("orders.new")}</a>
      </div>

      <div class="toolbar">
        <div class="search">
          <label class="visually-hidden" for="orders-q">${t("orders.searchLabel")}</label>
          ${icon("search")}
          <input class="input search__input" id="orders-q" name="q" type="search" value="${state.q}"
                 placeholder="${t("orders.searchPlaceholder")}" autocomplete="off" enterkeyhint="search">
        </div>
        <label class="visually-hidden" for="orders-sort">${t("orders.sortLabel")}</label>
        <select class="input select toolbar__sort" id="orders-sort" name="sort">
          ${SORTS.map((s) => html`<option value="${s}" ${s === state.sort ? "selected" : ""}>${t(`orders.sort.${s}`)}</option>`)}
        </select>
      </div>

      <div class="chips" role="group" aria-label="${t("orders.filterLabel")}" data-chips></div>
      <p class="visually-hidden" role="status" data-announce></p>
      <div data-results></div>

      <a class="fab" href="#/orders/new">${icon("plus")}<span>${t("orders.new")}</span></a>`,

    mount(root) {
      const chips = root.querySelector("[data-chips]");
      const results = root.querySelector("[data-results]");
      const count = root.querySelector("[data-count]");
      const announce = root.querySelector("[data-announce]");
      const search = root.querySelector("#orders-q");
      const sort = root.querySelector("#orders-sort");

      // After a language switch the typed search is restored into the inputs
      state.q = search.value;
      if (SORTS.includes(sort.value)) state.sort = sort.value;

      function draw({ focusOrder = "", focusFilter = "" } = {}) {
        const data = loadData(account);
        const customers = new Map(data.customers.map((c) => [c.id, c]));
        count.textContent = tp("orders.count", data.orders.length);

        chips.innerHTML = html`${FILTERS.map((f) => html`
          <button type="button" class="chip" data-filter="${f}" aria-pressed="${f === state.status}">
            ${filterLabel(f)} <span class="chip__count num">${formatNumber(countFor(data.orders, f))}</span>
          </button>`)}`;

        const list = filterAndSort(data.orders, customers, state);
        if (!data.orders.length) {
          results.innerHTML = emptyState({
            iconName: "orders",
            title: t("orders.emptyTitle"),
            body: t("orders.emptyBody"),
            action: html`<a class="btn btn--primary" href="#/orders/new">${icon("plus")} ${t("orders.new")}</a>`,
          });
        } else if (!list.length) {
          results.innerHTML = emptyState({
            iconName: "search",
            title: t("orders.noResultsTitle"),
            body: t("orders.noResultsBody"),
            action: html`<button type="button" class="btn btn--ghost" data-clear>${t("orders.clearFilters")}</button>`,
          });
        } else {
          results.innerHTML = html`<ul class="order-list">${list.map((o) => orderRow(o, customers.get(o.customerId)))}</ul>`;
        }

        const filtering = state.status !== "all" || state.q.trim();
        announce.textContent = filtering ? tp("orders.count", list.length) : "";

        if (focusOrder) {
          const link = results.querySelector(`[data-order="${focusOrder}"] .order-row__main`);
          if (link) link.focus();
        }
        if (focusFilter) chips.querySelector(`[data-filter="${focusFilter}"]`).focus();
      }

      const syncUrl = () => window.history.replaceState(null, "", listHash(state));

      let timer = 0;
      search.addEventListener("input", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          state.q = search.value;
          syncUrl();
          draw();
        }, 150);
      });

      sort.addEventListener("change", () => {
        state.sort = sort.value;
        syncUrl();
        draw();
      });

      chips.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-filter]");
        if (!chip) return;
        state.status = chip.dataset.filter;
        syncUrl();
        draw({ focusFilter: state.status });
      });

      results.addEventListener("click", (event) => {
        const advance = event.target.closest("[data-advance]");
        if (advance) {
          const row = advance.closest("[data-order]");
          const next = NEXT_STATUS[row.dataset.status];
          setOrderStatus(account, advance.dataset.advance, next, () => draw({ focusOrder: advance.dataset.advance }));
          return;
        }
        if (event.target.closest("[data-clear]")) {
          Object.assign(state, { status: "all", q: "", sort: "newest" });
          search.value = "";
          sort.value = "newest";
          syncUrl();
          draw();
          search.focus();
        }
      });

      draw();
    },
  };
}

/* ==========================================================================
   Order page
   ========================================================================== */

const missingOrder = () => missingView({
  titleKey: "orders.missingTitle", bodyKey: "orders.missingBody", backHref: "#/orders", backKey: "orders.back",
});

export function orderDetailView({ account, params }) {
  const data = loadData(account);
  const order = data.orders.find((o) => o.id === params.id);
  if (!order) return missingOrder();

  const customer = findCustomer(data, order.customerId);
  const { subtotal, tax, total } = orderTotals(order);
  const area = localText(order.deliveryArea);
  const notes = localText(order.notes);
  const late = isLate(order);
  const title = t("orders.orderNumber", { number: order.number });

  return {
    title,
    html: html`
      ${backLink("#/orders", t("orders.back"))}
      <div class="page-head">
        <div>
          <h1 class="page-title" tabindex="-1" data-autofocus>${title}</h1>
          <p class="page-sub">${t("orders.orderedOn", { date: formatDay(order.createdAt) })}</p>
        </div>
        <div class="page-head__actions">
          <a class="btn btn--ghost btn--sm" href="#/orders/${order.id}/edit">${icon("edit")} ${t("orders.edit")}</a>
          <button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete">${icon("trash")} ${t("orders.delete")}</button>
        </div>
      </div>

      <div class="detail">
        <div class="detail__main">
          <section class="card" aria-labelledby="o-status">
            <h2 class="card__title" id="o-status">${t("orders.statusTitle")}</h2>
            <div class="segmented" role="group" aria-labelledby="o-status">
              ${STATUSES.map((s) => html`
                <button type="button" class="segmented__btn segmented__btn--${s}" data-set-status="${s}" aria-pressed="${order.status === s}">
                  ${order.status === s ? icon("check") : ""}${t(`status.${s}`)}
                </button>`)}
            </div>
          </section>

          <section class="card" aria-labelledby="o-items">
            <h2 class="card__title" id="o-items">${t("orders.itemsTitle")}</h2>
            <ul class="lines">
              ${order.items.map((item) => html`
                <li class="lines__row">
                  <span class="lines__name">${localText(item.name)}</span>
                  <span class="lines__calc num">${formatNumber(item.qty)} × ${formatMoney(item.unitPrice)}</span>
                  <span class="lines__total num">${formatMoney(item.qty * item.unitPrice)}</span>
                </li>`)}
            </ul>
            <dl class="totals">
              <dt>${t("orders.subtotal")}</dt><dd class="num">${formatMoney(subtotal)}</dd>
              ${order.taxRate ? html`<dt>${t("orders.tax", { rate: formatNumber(order.taxRate) })}</dt><dd class="num">${formatMoney(tax)}</dd>` : ""}
              <dt class="totals__grand">${t("orders.total")}</dt><dd class="totals__grand num">${formatMoney(total)}</dd>
            </dl>
          </section>

          ${notes ? html`
            <section class="card" aria-labelledby="o-notes">
              <h2 class="card__title" id="o-notes">${t("orders.notesTitle")}</h2>
              <p class="card__text prewrap">${notes}</p>
            </section>` : ""}
        </div>

        <aside class="detail__side">
          <section class="card" aria-labelledby="o-customer">
            <h2 class="card__title" id="o-customer">${t("orders.customerTitle")}</h2>
            ${customer ? html`
              <a class="person" href="#/customers/${customer.id}">
                <span class="avatar" aria-hidden="true">${initials(customer.name)}</span>
                <span class="person__text">
                  <span class="person__name">${customerName(customer)}</span>
                  ${customer.phone ? html`<span class="person__sub"><span class="ltr num">${formatPhone(customer.phone)}</span></span>` : ""}
                </span>
              </a>` : html`<p class="card__text">${t("orders.unknownCustomer")}</p>`}
          </section>

          <section class="card" aria-labelledby="o-delivery">
            <h2 class="card__title" id="o-delivery">${t("orders.deliveryTitle")}</h2>
            <dl class="facts">
              <dt>${icon("calendar")}${t("orders.deliveryDate")}</dt>
              <dd class="${late ? "is-late" : ""}">${order.deliveryDate ? formatDay(order.deliveryDate) : t("orders.notSet")}${late ? html` · ${t("orders.late")}` : ""}</dd>
              <dt>${icon("pin")}${t("orders.deliveryArea")}</dt>
              <dd>${area || t("orders.notSet")}</dd>
            </dl>
          </section>

          <section class="card" aria-labelledby="o-payment">
            <h2 class="card__title" id="o-payment">${t("payment.title")}</h2>
            <dl class="facts">
              <dt>${t("payment.method")}</dt><dd>${t(`payment.${order.paymentMethod}`)}</dd>
            </dl>
            <div class="pay-status">
              ${paidPill(order.paid)}
              <button type="button" class="btn btn--ghost btn--sm" data-action="toggle-paid">${t(order.paid ? "payment.markUnpaid" : "payment.markPaid")}</button>
            </div>
            <p class="fine-print">${t("payment.note")}</p>
          </section>
        </aside>
      </div>`,

    mount(root, ctx) {
      root.addEventListener("click", async (event) => {
        const statusButton = event.target.closest("[data-set-status]");
        if (statusButton) {
          const status = statusButton.dataset.setStatus;
          setOrderStatus(account, order.id, status, () => {
            ctx.rerender();
            const again = document.querySelector(`[data-set-status="${status}"]`);
            if (again) again.focus();
          });
          return;
        }

        const action = event.target.closest("[data-action]");
        if (!action) return;

        if (action.dataset.action === "toggle-paid") {
          const saved = trySave(account, (d) => {
            const o = d.orders.find((x) => x.id === order.id);
            if (!o) return null;
            o.paid = !o.paid;
            o.updatedAt = new Date().toISOString();
            return o.paid;
          });
          if (!saved.ok || saved.result === null) return;
          ctx.rerender();
          const again = document.querySelector('[data-action="toggle-paid"]');
          if (again) again.focus();
          toast(t(saved.result ? "payment.markedPaid" : "payment.markedUnpaid", { number: order.number }));
        }

        if (action.dataset.action === "delete") {
          const ok = await confirmDialog({
            title: t("orders.deleteConfirmTitle", { number: order.number }),
            body: t("orders.deleteConfirmBody", { business: businessNameOf(account) }),
            confirmLabel: t("orders.deleteConfirmBtn"),
            danger: true,
          });
          if (!ok) return;
          const saved = trySave(account, (d) => { d.orders = d.orders.filter((o) => o.id !== order.id); });
          if (!saved.ok) return;
          ctx.navigate("/orders", { replace: true });
          toast(t("orders.deleted", { number: order.number }));
        }
      });
    },
  };
}

/* ==========================================================================
   New / edit order
   ========================================================================== */

/** Items sold before, with their latest price, to suggest while typing. */
function productCatalog(data) {
  const catalog = new Map();
  [...data.orders].sort((a, b) => newestFirst(b, a)).forEach((order) => {
    order.items.forEach((item) => {
      const name = localText(item.name).trim();
      if (name) catalog.set(normalizeForSearch(name), { name, price: item.unitPrice });
    });
  });
  return catalog;
}

function areaSuggestions(data) {
  const areas = [...tList("areas"), ...data.customers.map((c) => localText(c.area))].map((a) => a.trim()).filter(Boolean);
  return [...new Set(areas)];
}

function lineRow(line, index) {
  const k = line.key;
  const describe = (name) => `f-${name}-${k}-error`;
  return html`
    <li class="line-edit" data-line="${k}">
      <div class="field line-edit__name" data-field="name-${k}">
        <label class="field__label" for="f-name-${k}" data-line-label>${t("orders.form.itemN", { n: formatNumber(index + 1) })}</label>
        <input class="input" id="f-name-${k}" name="name-${k}" value="${line.name}" list="dl-products" autocomplete="off"
               placeholder="${t("orders.form.itemPlaceholder")}" aria-describedby="${describe("name")}">
        <p class="field__error" id="${describe("name")}" hidden></p>
      </div>
      <div class="field line-edit__qty" data-field="qty-${k}">
        <label class="field__label" for="f-qty-${k}">${t("orders.form.qty")}</label>
        <input class="input num" id="f-qty-${k}" name="qty-${k}" value="${line.qty}" inputmode="numeric" autocomplete="off" aria-describedby="${describe("qty")}">
        <p class="field__error" id="${describe("qty")}" hidden></p>
      </div>
      <div class="field line-edit__price" data-field="price-${k}">
        <label class="field__label" for="f-price-${k}">${t("orders.form.unitPrice")}</label>
        <input class="input num" id="f-price-${k}" name="price-${k}" value="${line.price}" inputmode="decimal" placeholder="0.000" autocomplete="off" aria-describedby="${describe("price")}">
        <p class="field__error" id="${describe("price")}" hidden></p>
      </div>
      <div class="line-edit__total">
        <span class="field__label">${t("orders.form.lineTotal")}</span>
        <output class="num" data-line-total>—</output>
      </div>
      <button type="button" class="icon-btn line-edit__remove" data-remove-line="${k}"
              aria-label="${t("orders.form.removeItem", { n: formatNumber(index + 1) })}">${icon("trash")}</button>
    </li>`;
}

export function orderFormView(ctx) {
  const { account, params, query, draft } = ctx;
  const data = loadData(account);
  const editing = Boolean(params.id);
  const order = editing ? data.orders.find((o) => o.id === params.id) : null;
  if (editing && !order) return missingOrder();

  const lang = getLang();
  const customers = [...data.customers].sort((a, b) => customerName(a).localeCompare(customerName(b), lang));
  const preset = !editing && findCustomer(data, query.get("customer") || "") ? query.get("customer") : "";
  const customerValue = editing ? order.customerId : preset || (customers.length ? "" : NEW_CUSTOMER);
  const taxRate = editing ? order.taxRate || 0 : data.settings.taxEnabled ? data.settings.taxRate : 0;
  const originalItems = new Map(editing ? order.items.map((item) => [item.id, item]) : []);

  // Rows come from the language-switch draft, the saved order, or one empty row
  let lines;
  if (draft && draft.lineKeys) {
    lines = draft.lineKeys.map((key) => ({ key, name: "", qty: "", price: "" }));
  } else if (editing) {
    lines = order.items.map((item) => ({ key: item.id, name: localText(item.name), qty: String(item.qty), price: moneyInput(item.unitPrice) }));
  } else {
    lines = [{ key: newId(), name: "", qty: "1", price: "" }];
  }

  const title = editing ? t("orders.form.editTitle", { number: order.number }) : t("orders.form.newTitle");
  const cancelHref = editing ? `#/orders/${order.id}` : preset ? `#/customers/${preset}` : "#/orders";
  const catalog = productCatalog(data);
  let linesEl = null;

  return {
    title,
    getDraft: () => ({ lineKeys: linesEl ? [...linesEl.querySelectorAll("[data-line]")].map((li) => li.dataset.line) : [] }),
    html: html`
      ${backLink(cancelHref, editing ? t("orders.orderNumber", { number: order.number }) : t("orders.back"))}
      <div class="page-head">
        <h1 class="page-title" tabindex="-1" data-autofocus>${title}</h1>
      </div>

      <form class="order-form" novalidate data-order-form>
        <section class="card form-card" aria-labelledby="sec-customer">
          <h2 class="card__title" id="sec-customer">${t("orders.form.customerSection")}</h2>
          <div class="field" data-field="customerId">
            <label class="field__label" for="f-customerId">${t("orders.form.customer")}</label>
            <select class="input select" id="f-customerId" name="customerId" aria-describedby="f-customerId-error">
              <option value="">${t("orders.form.chooseCustomer")}</option>
              ${customers.map((c) => html`<option value="${c.id}" ${c.id === customerValue ? "selected" : ""}>${customerName(c)}${c.phone ? ` · ${formatPhone(c.phone)}` : ""}</option>`)}
              <option value="${NEW_CUSTOMER}" ${customerValue === NEW_CUSTOMER ? "selected" : ""}>${t("orders.form.addNewCustomer")}</option>
            </select>
            <p class="field__error" id="f-customerId-error" hidden></p>
          </div>
          <div class="new-customer" data-new-customer hidden>
            ${field({ name: "newName", label: t("orders.form.newCustomerName"), autocomplete: "off" })}
            ${field({ name: "newPhone", label: t("orders.form.newCustomerPhone"), type: "tel", inputmode: "tel", placeholder: "079 123 4567", autocomplete: "off", ltr: true })}
            ${field({ name: "newArea", label: t("orders.form.newCustomerArea"), placeholder: t("orders.form.areaPlaceholder"), autocomplete: "off", list: "dl-areas" })}
          </div>
        </section>

        <section class="card form-card" aria-labelledby="sec-items">
          <h2 class="card__title" id="sec-items">${t("orders.form.itemsSection")}</h2>
          <p class="callout callout--error" data-lines-error role="alert" hidden></p>
          <ol class="line-edits" data-lines>${lines.map((line, i) => lineRow(line, i))}</ol>
          <div><button type="button" class="btn btn--ghost btn--sm" data-add-line>${icon("plus")} ${t("orders.form.addItem")}</button></div>
          <dl class="totals totals--live" data-totals aria-live="polite"></dl>
        </section>

        <section class="card form-card" aria-labelledby="sec-delivery">
          <h2 class="card__title" id="sec-delivery">${t("orders.form.deliverySection")}</h2>
          <div class="field-row field-row--2">
            ${field({ name: "deliveryDate", label: t("orders.form.deliveryDate"), type: "date", value: editing ? order.deliveryDate || "" : "" })}
            ${field({ name: "deliveryArea", label: t("orders.form.deliveryArea"), value: editing ? localText(order.deliveryArea) : "", placeholder: t("orders.form.areaPlaceholder"), autocomplete: "off", list: "dl-areas" })}
          </div>
        </section>

        <section class="card form-card" aria-labelledby="sec-payment">
          <h2 class="card__title" id="sec-payment">${t("orders.form.paymentSection")}</h2>
          ${choiceGroup({
            name: "paymentMethod",
            legend: t("orders.form.paymentMethod"),
            value: editing ? order.paymentMethod : "cash",
            options: PAYMENT_METHODS.map((m) => ({ value: m, label: t(`payment.${m}`) })),
          })}
          ${choiceGroup({
            name: "paid",
            legend: t("orders.form.paidStatus"),
            value: editing && order.paid ? "yes" : "no",
            options: [{ value: "no", label: t("payment.unpaid") }, { value: "yes", label: t("payment.paid") }],
          })}
          <p class="fine-print">${t("payment.note")}</p>
        </section>

        ${editing ? html`
          <section class="card form-card" aria-labelledby="sec-status">
            <h2 class="card__title" id="sec-status">${t("orders.form.statusSection")}</h2>
            ${choiceGroup({
              name: "status",
              legend: t("orders.statusTitle"),
              value: order.status,
              options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
            })}
          </section>` : ""}

        <section class="card form-card">
          ${textareaField({ name: "notes", label: t("orders.form.notes"), value: editing ? localText(order.notes) : "", placeholder: t("orders.form.notesPlaceholder") })}
        </section>

        <div class="form-actions">
          <a class="btn btn--ghost" href="${cancelHref}">${t("orders.form.cancel")}</a>
          <button type="submit" class="btn btn--primary">${editing ? t("orders.form.save") : t("orders.form.create")}</button>
        </div>
      </form>

      <datalist id="dl-products">${[...catalog.values()].map((p) => html`<option value="${p.name}"></option>`)}</datalist>
      <datalist id="dl-areas">${areaSuggestions(data).map((a) => html`<option value="${a}"></option>`)}</datalist>`,

    mount(root) {
      const form = root.querySelector("[data-order-form]");
      linesEl = form.querySelector("[data-lines]");
      const newCustomerBox = form.querySelector("[data-new-customer]");
      const totalsEl = form.querySelector("[data-totals]");
      const linesError = form.querySelector("[data-lines-error]");
      const areaInput = form.elements.deliveryArea;
      let autoArea = "";

      function syncCustomer() {
        const value = form.elements.customerId.value;
        newCustomerBox.hidden = value !== NEW_CUSTOMER;
        // Fill the delivery area from the customer, unless the person typed their own
        const chosen = findCustomer(data, value);
        const area = chosen ? localText(chosen.area) : "";
        if (!editing && (!areaInput.value.trim() || areaInput.value === autoArea)) {
          areaInput.value = area;
          autoArea = area;
        }
      }

      function readLines() {
        return [...linesEl.querySelectorAll("[data-line]")].map((li) => {
          const key = li.dataset.line;
          const name = form.elements[`name-${key}`].value.trim();
          const qtyText = form.elements[`qty-${key}`].value.trim();
          const priceText = form.elements[`price-${key}`].value.trim();
          return {
            key, li, name, qtyText, priceText,
            qty: parseQty(qtyText),
            price: parseMoney(priceText),
            empty: !name && !priceText && (qtyText === "" || qtyText === "1"),
          };
        });
      }

      function updateTotals() {
        let subtotal = 0;
        readLines().forEach((line) => {
          const valid = !Number.isNaN(line.qty) && !Number.isNaN(line.price);
          line.li.querySelector("[data-line-total]").textContent = valid ? formatMoney(line.qty * line.price) : "—";
          if (valid) subtotal += line.qty * line.price;
        });
        const tax = Math.round((subtotal * taxRate) / 100);
        totalsEl.innerHTML = html`
          <dt>${t("orders.subtotal")}</dt><dd class="num">${formatMoney(subtotal)}</dd>
          ${taxRate ? html`<dt>${t("orders.tax", { rate: formatNumber(taxRate) })}</dt><dd class="num">${formatMoney(tax)}</dd>` : ""}
          <dt class="totals__grand">${t("orders.total")}</dt><dd class="totals__grand num">${formatMoney(subtotal + tax)}</dd>`;
      }

      function renumber() {
        linesEl.querySelectorAll("[data-line]").forEach((li, i) => {
          const n = formatNumber(i + 1);
          li.querySelector("[data-line-label]").textContent = t("orders.form.itemN", { n });
          li.querySelector("[data-remove-line]").setAttribute("aria-label", t("orders.form.removeItem", { n }));
        });
      }

      form.addEventListener("change", (event) => {
        if (event.target.name === "customerId") syncCustomer();
        // Picking a known item fills in its last price
        if (event.target.name && event.target.name.startsWith("name-")) {
          const key = event.target.name.slice(5);
          const known = catalog.get(normalizeForSearch(event.target.value));
          const price = form.elements[`price-${key}`];
          if (known && !price.value.trim()) {
            price.value = moneyInput(known.price);
            updateTotals();
          }
        }
      });

      // Tapping into a quantity or price selects it, so typing replaces an auto-filled value
      form.addEventListener("focusin", (event) => {
        const input = event.target;
        if (input.matches('input[inputmode="decimal"], input[inputmode="numeric"]')) {
          window.setTimeout(() => { if (document.activeElement === input) input.select(); }, 0);
        }
      });

      form.addEventListener("input", (event) => {
        const wrap = event.target.closest("[data-field]");
        if (wrap && (wrap.getAttribute("aria-invalid") === "true" || wrap.querySelector('[aria-invalid="true"]'))) {
          setFieldError(form, wrap.dataset.field, "");
        }
        if (event.target.closest("[data-line]")) {
          linesError.hidden = true;
          updateTotals();
        }
      });

      form.addEventListener("click", (event) => {
        if (event.target.closest("[data-add-line]")) {
          const count = linesEl.querySelectorAll("[data-line]").length;
          const key = newId();
          linesEl.insertAdjacentHTML("beforeend", lineRow({ key, name: "", qty: "1", price: "" }, count).toString());
          updateTotals();
          form.elements[`name-${key}`].focus();
          return;
        }
        const remove = event.target.closest("[data-remove-line]");
        if (remove) {
          const rows = [...linesEl.querySelectorAll("[data-line]")];
          const li = remove.closest("[data-line]");
          if (rows.length === 1) {
            const key = li.dataset.line;
            form.elements[`name-${key}`].value = "";
            form.elements[`qty-${key}`].value = "1";
            form.elements[`price-${key}`].value = "";
            form.elements[`name-${key}`].focus();
          } else {
            const next = rows[rows.indexOf(li) + 1] || rows[rows.indexOf(li) - 1];
            li.remove();
            next.querySelector("input").focus();
          }
          renumber();
          updateTotals();
        }
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearFieldErrors(form);
        linesError.hidden = true;

        const customerId = form.elements.customerId.value;
        let newCustomer = null;
        if (!customerId) setFieldError(form, "customerId", t("errors.chooseCustomer"));
        if (customerId === NEW_CUSTOMER) {
          const name = form.elements.newName.value.trim();
          const phone = normalizePhone(form.elements.newPhone.value);
          if (!name) setFieldError(form, "newName", t("errors.required"));
          else if (name.length < 2) setFieldError(form, "newName", t("errors.nameShort"));
          if (!phone.ok) setFieldError(form, "newPhone", t("errors.phone"));
          newCustomer = { name, phone: phone.value, area: form.elements.newArea.value.trim() };
        }

        const filled = readLines().filter((line) => !line.empty);
        filled.forEach((line) => {
          if (!line.name) setFieldError(form, `name-${line.key}`, t("errors.itemName"));
          if (Number.isNaN(line.qty)) setFieldError(form, `qty-${line.key}`, t("errors.qty"));
          if (Number.isNaN(line.price)) setFieldError(form, `price-${line.key}`, t("errors.price"));
        });
        if (!filled.length) {
          linesError.innerHTML = html`${icon("alert")}<span>${t("errors.noItems")}</span>`.toString();
          linesError.hidden = false;
        }

        if (form.querySelector('[aria-invalid="true"]')) {
          focusFirstError(form);
          return;
        }
        if (!filled.length) {
          linesEl.querySelector("input").focus();
          return;
        }

        const now = new Date().toISOString();
        const checked = (name) => form.querySelector(`input[name="${name}"]:checked`).value;
        const values = {
          items: filled.map((line) => ({
            id: line.key,
            name: keepIfUnchanged(originalItems.get(line.key) && originalItems.get(line.key).name, line.name),
            qty: line.qty,
            unitPrice: line.price,
          })),
          deliveryDate: form.elements.deliveryDate.value || "",
          deliveryArea: keepIfUnchanged(order && order.deliveryArea, areaInput.value.trim()) || "",
          notes: keepIfUnchanged(order && order.notes, form.elements.notes.value.trim()) || "",
          paymentMethod: checked("paymentMethod"),
          paid: checked("paid") === "yes",
        };

        const saved = trySave(account, (d) => {
          let id = customerId;
          if (customerId === NEW_CUSTOMER) {
            id = newId();
            d.customers.push({ id, ...newCustomer, notes: "", createdAt: now });
          }
          if (editing) {
            const existing = d.orders.find((o) => o.id === order.id);
            if (!existing) return null;
            Object.assign(existing, values, { customerId: id, status: checked("status"), updatedAt: now });
            return { id: existing.id, number: existing.number };
          }
          const created = {
            id: newId(),
            number: nextOrderNumber(d),
            customerId: id,
            ...values,
            taxRate,
            status: "new",
            createdAt: now,
            updatedAt: now,
          };
          d.orders.push(created);
          return { id: created.id, number: created.number };
        });
        if (!saved.ok) return;
        if (!saved.result) {
          ctx.navigate("/orders", { replace: true });
          return;
        }
        ctx.navigate(`/orders/${saved.result.id}`, { replace: true });
        toast(t(editing ? "orders.saved" : "orders.created", { number: saved.result.number }));
      });

      syncCustomer();
      updateTotals();
    },
  };
}
