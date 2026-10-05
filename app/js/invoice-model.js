// Invoices. An invoice is a snapshot of an order at the moment it's issued:
// editing the order later never changes an issued invoice. If the order
// changes, the person can issue an updated invoice with a new number.

import { tAll, localText, formatNumber } from "./i18n.js";
import { newId } from "./store.js";
import { findCustomer, orderTotals, isoDay } from "./model.js";

/** Who the invoice is from. The demo's names are kept in both languages. */
export function sellerSnapshot(account) {
  if (account.isDemo) {
    return {
      businessName: tAll(account.businessNameKey),
      ownerName: tAll(account.fullNameKey),
      businessType: account.businessType,
      email: "",
    };
  }
  return {
    businessName: account.businessName,
    ownerName: account.fullName,
    businessType: account.businessType,
    email: account.email,
  };
}

/** What the invoice depends on. If this changes, the invoice is out of date. */
export function orderFingerprint(order) {
  return JSON.stringify([
    order.customerId,
    order.taxRate || 0,
    order.items.map((item) => [item.name, item.qty, item.unitPrice]),
  ]);
}

/** RSD-2026-0001, RSD-2026-0002, … counting again from 0001 each year. */
function nextInvoiceNumber(data, date) {
  const year = date.getFullYear();
  const seq = (data.counters.invoice[year] || 0) + 1;
  data.counters.invoice[year] = seq;
  return { year, seq, number: `RSD-${year}-${String(seq).padStart(4, "0")}` };
}

/** Create an invoice for the order (replacing its previous one, if any). */
export function issueInvoice(data, order, seller, { date = new Date(), id = newId() } = {}) {
  const customer = findCustomer(data, order.customerId);
  const { subtotal, tax, total } = orderTotals(order);
  const { year, seq, number } = nextInvoiceNumber(data, date);
  const previous = order.invoiceId ? data.invoices.find((inv) => inv.id === order.invoiceId) : null;

  const invoice = {
    id,
    number,
    year,
    seq,
    orderId: order.id,
    orderNumber: order.number,
    issuedAt: date.toISOString(),
    seller,
    customer: {
      name: customer ? customer.name : "",
      phone: customer ? customer.phone || "" : "",
      area: customer ? customer.area || "" : "",
    },
    items: order.items.map((item) => ({ name: item.name, qty: item.qty, unitPrice: item.unitPrice })),
    taxRate: order.taxRate || 0,
    subtotal,
    tax,
    total,
    paymentMethod: order.paymentMethod,
    paid: order.paid,
    fingerprint: orderFingerprint(order),
    replaces: previous ? previous.id : null,
    replacedBy: null,
  };

  if (previous) previous.replacedBy = invoice.id;
  data.invoices.push(invoice);
  order.invoiceId = invoice.id;
  return invoice;
}

/** The order an invoice belongs to, if it still exists. */
export function invoiceOrder(data, invoice) {
  return data.orders.find((o) => o.id === invoice.orderId) || null;
}

/** Payment is shown as it is now (an order can be paid after it's invoiced). */
export function invoicePayment(invoice, order) {
  return order
    ? { method: order.paymentMethod, paid: order.paid }
    : { method: invoice.paymentMethod, paid: invoice.paid };
}

/** True when the order was edited after this (current) invoice was issued. */
export function isOutdated(invoice, order) {
  return Boolean(order) && !invoice.replacedBy && order.invoiceId === invoice.id && orderFingerprint(order) !== invoice.fingerprint;
}

/**
 * Plain text inside the QR code, readable by any phone camera.
 * Deliberately not JoFotara's format: this is a sample, not a real e-invoice.
 */
export function qrText(invoice, labels) {
  return [
    labels.title,
    `${labels.invoice}: ${invoice.number}`,
    `${labels.seller}: ${localText(invoice.seller.businessName)}`,
    `${labels.date}: ${isoDay(new Date(invoice.issuedAt))}`, // local date, not UTC
    `${labels.total}: ${formatNumber(invoice.total / 1000, 3)} JOD`,
  ].join("\n");
}
