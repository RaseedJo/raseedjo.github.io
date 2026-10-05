// Customers: list (search, sort), customer page with order history, and the add/edit form.

import { t, tp, getLang, localText, keepIfUnchanged, tList } from "../i18n.js";
import {
  html, icon, toast, confirmDialog, field, textareaField,
  setFieldError, clearFieldErrors, focusFirstError,
} from "../ui.js";
import { loadData } from "../data.js";
import { newId } from "../store.js";
import {
  NEXT_STATUS, customerStats, customerName, findCustomer, formatMoney, formatPhone, formatDay,
  normalizePhone, isMobileNumber, telLink, whatsappLink, matchesQuery,
} from "../model.js";
import {
  orderRow, setOrderStatus, trySave, emptyState, missingView, backLink, initials,
} from "./components.js";

const SORTS = ["name", "spent", "recent"];

/* ==========================================================================
   List
   ========================================================================== */

function listHash(state) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.sort !== "name") params.set("sort", state.sort);
  const query = params.toString();
  return `#/customers${query ? `?${query}` : ""}`;
}

function customerRow(customer, stats) {
  const area = localText(customer.area);
  const notes = localText(customer.notes);
  return html`
    <li>
      <a class="customer-row" href="#/customers/${customer.id}" data-customer="${customer.id}">
        <span class="avatar" aria-hidden="true">${initials(customer.name)}</span>
        <span class="customer-row__body">
          <span class="customer-row__name">${customerName(customer)}</span>
          <span class="customer-row__meta">
            ${customer.phone ? html`<span><span class="ltr num">${formatPhone(customer.phone)}</span></span>` : ""}
            ${area ? html`<span>${icon("pin")}${area}</span>` : ""}
          </span>
          ${notes ? html`<span class="customer-row__notes">${notes}</span>` : ""}
        </span>
        <span class="customer-row__stats">
          <span class="customer-row__spent num">${formatMoney(stats.spent)}</span>
          <span class="customer-row__count">${tp("orders.count", stats.count)}</span>
          ${stats.owed ? html`<span class="customer-row__owed num">${t("customers.owes")}: ${formatMoney(stats.owed)}</span>` : ""}
        </span>
      </a>
    </li>`;
}

export function customersListView({ account, query }) {
  const state = {
    q: query.get("q") || "",
    sort: SORTS.includes(query.get("sort")) ? query.get("sort") : "name",
  };

  return {
    titleKey: "customers.title",
    html: html`
      <div class="page-head">
        <div>
          <h1 class="page-title" tabindex="-1" data-autofocus>${t("customers.title")}</h1>
          <p class="page-sub" data-count></p>
        </div>
        <a class="btn btn--primary" href="#/customers/new">${icon("plus")} ${t("customers.add")}</a>
      </div>

      <div class="toolbar">
        <div class="search">
          <label class="visually-hidden" for="customers-q">${t("customers.searchLabel")}</label>
          ${icon("search")}
          <input class="input search__input" id="customers-q" name="q" type="search" value="${state.q}"
                 placeholder="${t("customers.searchPlaceholder")}" autocomplete="off" enterkeyhint="search">
        </div>
        <label class="visually-hidden" for="customers-sort">${t("customers.sortLabel")}</label>
        <select class="input select toolbar__sort" id="customers-sort" name="sort">
          ${SORTS.map((s) => html`<option value="${s}" ${s === state.sort ? "selected" : ""}>${t(`customers.sort.${s}`)}</option>`)}
        </select>
      </div>

      <p class="visually-hidden" role="status" data-announce></p>
      <div data-results></div>`,

    mount(root) {
      const results = root.querySelector("[data-results]");
      const count = root.querySelector("[data-count]");
      const announce = root.querySelector("[data-announce]");
      const search = root.querySelector("#customers-q");
      const sort = root.querySelector("#customers-sort");
      state.q = search.value;
      if (SORTS.includes(sort.value)) state.sort = sort.value;

      function draw() {
        const data = loadData(account);
        const lang = getLang();
        count.textContent = tp("customers.count", data.customers.length);

        let list = data.customers.map((customer) => ({ customer, stats: customerStats(data, customer.id) }));
        if (state.q.trim()) {
          list = list.filter(({ customer }) => matchesQuery([customer.name, customer.phone, customer.area, customer.notes], state.q));
        }
        const byName = (a, b) => customerName(a.customer).localeCompare(customerName(b.customer), lang);
        if (state.sort === "spent") list.sort((a, b) => b.stats.spent - a.stats.spent || byName(a, b));
        else if (state.sort === "recent") list.sort((a, b) => (b.stats.lastOrderAt > a.stats.lastOrderAt ? 1 : b.stats.lastOrderAt < a.stats.lastOrderAt ? -1 : 0) || byName(a, b));
        else list.sort(byName);

        if (!data.customers.length) {
          results.innerHTML = emptyState({
            iconName: "customers",
            title: t("customers.emptyTitle"),
            body: t("customers.emptyBody"),
            action: html`<a class="btn btn--primary" href="#/customers/new">${icon("plus")} ${t("customers.add")}</a>`,
          });
        } else if (!list.length) {
          results.innerHTML = emptyState({
            iconName: "search",
            title: t("customers.noResultsTitle"),
            body: t("customers.noResultsBody"),
            action: html`<button type="button" class="btn btn--ghost" data-clear>${t("customers.clearSearch")}</button>`,
          });
        } else {
          results.innerHTML = html`<ul class="customer-list">${list.map(({ customer, stats }) => customerRow(customer, stats))}</ul>`;
        }
        announce.textContent = state.q.trim() ? tp("customers.count", list.length) : "";
      }

      const syncUrl = () => window.history.replaceState(null, "", listHash(state));
      let timer = 0;
      search.addEventListener("input", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => { state.q = search.value; syncUrl(); draw(); }, 150);
      });
      sort.addEventListener("change", () => { state.sort = sort.value; syncUrl(); draw(); });
      results.addEventListener("click", (event) => {
        if (!event.target.closest("[data-clear]")) return;
        state.q = "";
        search.value = "";
        syncUrl();
        draw();
        search.focus();
      });

      draw();
    },
  };
}

/* ==========================================================================
   Customer page
   ========================================================================== */

const missingCustomer = () => missingView({
  titleKey: "customers.missingTitle", bodyKey: "customers.missingBody", backHref: "#/customers", backKey: "customers.back",
});

function contactActions(customer, account) {
  if (!customer.phone) return "";
  // The sample customers' numbers are made up, so don't let visitors call or message them
  if (account.isDemo) return html`<p class="fine-print">${t("customers.demoContact")}</p>`;
  return html`
    <div class="contact-actions">
      <a class="btn btn--ghost btn--sm" href="${telLink(customer.phone)}">${icon("phone")} ${t("customers.call")}</a>
      ${isMobileNumber(customer.phone) ? html`
        <a class="btn btn--ghost btn--sm" href="${whatsappLink(customer.phone)}" target="_blank" rel="noopener noreferrer">${icon("message")} ${t("customers.whatsapp")}</a>` : ""}
    </div>`;
}

export function customerDetailView({ account, params }) {
  const data = loadData(account);
  const customer = findCustomer(data, params.id);
  if (!customer) return missingCustomer();

  const name = customerName(customer);
  const area = localText(customer.area);
  const notes = localText(customer.notes);
  const stats = customerStats(data, customer.id);
  const orders = data.orders
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    title: name,
    html: html`
      ${backLink("#/customers", t("customers.back"))}
      <div class="page-head">
        <div class="page-head__person">
          <span class="avatar avatar--lg" aria-hidden="true">${initials(customer.name)}</span>
          <div>
            <h1 class="page-title" tabindex="-1" data-autofocus>${name}</h1>
            ${stats.lastOrderAt ? html`<p class="page-sub">${t("customers.lastOrder", { date: formatDay(stats.lastOrderAt) })}</p>` : ""}
          </div>
        </div>
        <div class="page-head__actions">
          <a class="btn btn--primary btn--sm" href="#/orders/new?customer=${customer.id}">${icon("plus")} ${t("customers.newOrder")}</a>
          <a class="btn btn--ghost btn--sm" href="#/customers/${customer.id}/edit">${icon("edit")} ${t("customers.edit")}</a>
          ${stats.count ? "" : html`<button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete">${icon("trash")} ${t("customers.delete")}</button>`}
        </div>
      </div>

      <div class="stats">
        <div class="stat"><p class="stat__label">${t("customers.ordersStat")}</p><p class="stat__value num">${stats.count}</p></div>
        <div class="stat"><p class="stat__label">${t("customers.spent")}</p><p class="stat__value num">${formatMoney(stats.spent)}</p></div>
        <div class="stat"><p class="stat__label">${t("customers.owes")}</p><p class="stat__value num ${stats.owed ? "stat__value--warn" : ""}">${formatMoney(stats.owed)}</p></div>
      </div>

      <div class="detail">
        <div class="detail__main">
          <section aria-labelledby="c-history">
            <h2 class="section-title" id="c-history">${t("customers.historyTitle")}</h2>
            ${orders.length
              ? html`<ul class="order-list" data-orders>${orders.map((o) => orderRow(o, customer, { showCustomer: false }))}</ul>`
              : html`<p class="card card__text">${t("customers.noOrders")}</p>`}
          </section>
        </div>

        <aside class="detail__side">
          <section class="card" aria-labelledby="c-contact">
            <h2 class="card__title" id="c-contact">${t("customers.contactTitle")}</h2>
            <dl class="facts">
              <dt>${icon("phone")}${t("customers.phone")}</dt>
              <dd>${customer.phone ? html`<span class="ltr num">${formatPhone(customer.phone)}</span>` : t("customers.noPhone")}</dd>
              <dt>${icon("pin")}${t("customers.area")}</dt>
              <dd>${area || t("orders.notSet")}</dd>
            </dl>
            ${contactActions(customer, account)}
          </section>
          ${notes ? html`
            <section class="card" aria-labelledby="c-notes">
              <h2 class="card__title" id="c-notes">${t("customers.notes")}</h2>
              <p class="card__text prewrap">${notes}</p>
            </section>` : ""}
        </aside>
      </div>`,

    mount(root, ctx) {
      root.addEventListener("click", async (event) => {
        const advance = event.target.closest("[data-advance]");
        if (advance) {
          const row = advance.closest("[data-order]");
          const id = advance.dataset.advance;
          setOrderStatus(account, id, NEXT_STATUS[row.dataset.status], () => {
            ctx.rerender();
            const link = document.querySelector(`[data-order="${id}"] .order-row__main`);
            if (link) link.focus();
          });
          return;
        }
        if (!event.target.closest('[data-action="delete"]')) return;
        const ok = await confirmDialog({
          title: t("customers.deleteConfirmTitle", { name }),
          body: t("customers.deleteConfirmBody"),
          confirmLabel: t("customers.deleteConfirmBtn"),
          danger: true,
        });
        if (!ok) return;
        const saved = trySave(account, (d) => {
          if (d.orders.some((o) => o.customerId === customer.id)) return false; // gained orders meanwhile
          d.customers = d.customers.filter((c) => c.id !== customer.id);
          return true;
        });
        if (!saved.ok) return;
        if (!saved.result) {
          toast(t("customers.cantDelete"));
          return;
        }
        ctx.navigate("/customers", { replace: true });
        toast(t("customers.deleted", { name }));
      });
    },
  };
}

/* ==========================================================================
   New / edit customer
   ========================================================================== */

export function customerFormView(ctx) {
  const { account, params } = ctx;
  const data = loadData(account);
  const editing = Boolean(params.id);
  const customer = editing ? findCustomer(data, params.id) : null;
  if (editing && !customer) return missingCustomer();

  const title = editing ? t("customers.form.editTitle") : t("customers.form.newTitle");
  const cancelHref = editing ? `#/customers/${customer.id}` : "#/customers";
  const areas = [...new Set([...tList("areas"), ...data.customers.map((c) => localText(c.area))].filter(Boolean))];

  return {
    title,
    html: html`
      ${backLink(cancelHref, editing ? customerName(customer) : t("customers.back"))}
      <div class="page-head">
        <h1 class="page-title" tabindex="-1" data-autofocus>${title}</h1>
      </div>

      <form class="card form-card customer-form" novalidate data-customer-form>
        ${field({ name: "name", label: t("customers.form.name"), value: editing ? customerName(customer) : "", autocomplete: "off" })}
        ${field({ name: "phone", label: t("customers.form.phone"), type: "tel", inputmode: "tel", value: editing ? formatPhone(customer.phone) : "", placeholder: "079 123 4567", hint: t("customers.form.phoneHint"), autocomplete: "off", ltr: true })}
        ${field({ name: "area", label: t("customers.form.area"), value: editing ? localText(customer.area) : "", placeholder: t("customers.form.areaPlaceholder"), autocomplete: "off", list: "dl-customer-areas" })}
        ${textareaField({ name: "notes", label: t("customers.form.notes"), value: editing ? localText(customer.notes) : "", placeholder: t("customers.form.notesPlaceholder") })}
        <div class="form-actions">
          <a class="btn btn--ghost" href="${cancelHref}">${t("orders.form.cancel")}</a>
          <button type="submit" class="btn btn--primary">${editing ? t("customers.form.save") : t("customers.form.create")}</button>
        </div>
      </form>
      <datalist id="dl-customer-areas">${areas.map((a) => html`<option value="${a}"></option>`)}</datalist>`,

    mount(root) {
      const form = root.querySelector("[data-customer-form]");

      form.addEventListener("input", (event) => {
        const wrap = event.target.closest("[data-field]");
        if (wrap && wrap.querySelector('[aria-invalid="true"]')) setFieldError(form, wrap.dataset.field, "");
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearFieldErrors(form);
        const name = form.elements.name.value.trim();
        const phone = normalizePhone(form.elements.phone.value);
        if (!name) setFieldError(form, "name", t("errors.required"));
        else if (name.length < 2) setFieldError(form, "name", t("errors.nameShort"));
        if (!phone.ok) setFieldError(form, "phone", t("errors.phone"));
        if (form.querySelector('[aria-invalid="true"]')) {
          focusFirstError(form);
          return;
        }

        const values = {
          name: keepIfUnchanged(customer && customer.name, name),
          phone: phone.value,
          area: keepIfUnchanged(customer && customer.area, form.elements.area.value.trim()) || "",
          notes: keepIfUnchanged(customer && customer.notes, form.elements.notes.value.trim()) || "",
        };
        const saved = trySave(account, (d) => {
          if (editing) {
            const existing = d.customers.find((c) => c.id === customer.id);
            if (!existing) return null;
            Object.assign(existing, values);
            return existing.id;
          }
          const id = newId();
          d.customers.push({ id, ...values, createdAt: new Date().toISOString() });
          return id;
        });
        if (!saved.ok) return;
        if (!saved.result) {
          ctx.navigate("/customers", { replace: true });
          return;
        }
        ctx.navigate(`/customers/${saved.result}`, { replace: true });
        toast(t(editing ? "customers.saved" : "customers.created", { name }));
      });
    },
  };
}
