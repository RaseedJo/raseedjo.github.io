// Business rules and formatting for orders and customers.
// Money is stored as whole fils (1 JD = 1000 fils) so totals never have rounding errors.

import { t, formatNumber, formatDate, localText, allTexts } from "./i18n.js";

export const STATUSES = ["new", "in_progress", "delivered", "cancelled"];
export const PAYMENT_METHODS = ["cash", "cliq", "card", "other"];

/** The one-tap "next step" for an order. Delivered and cancelled orders have none. */
export const NEXT_STATUS = { new: "in_progress", in_progress: "delivered" };

/* ---------- Digits ---------- */

/** People on Arabic keyboards may type ٠١٢٣…; store and show Western digits. */
export function toWesternDigits(value) {
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/* ---------- Money ---------- */

/** "12.5", "12.500", "١٢٫٥" → 12500 fils. NaN if it isn't a valid amount. */
export function parseMoney(input) {
  let text = toWesternDigits(input).trim().replace(/٫/g, ".").replace(/\s+/g, "");
  if (text.includes(",") && !text.includes(".")) text = text.replace(",", ".");
  if (!/^\d{1,6}(\.\d{0,3})?$/.test(text)) return Number.NaN;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 1000 + Number(`${fraction}000`.slice(0, 3));
}

/** 12500 → "12.500 JD" / "12.500 د.أ" */
export function formatMoney(fils) {
  return `${formatNumber(fils / 1000, 3)} ${t("currency.symbol")}`;
}

/** 12500 → "12.500" for form inputs */
export function moneyInput(fils) {
  return (fils / 1000).toFixed(3);
}

/** Whole numbers from 1 to 9999 */
export function parseQty(input) {
  const text = toWesternDigits(input).trim();
  if (!/^\d{1,4}$/.test(text)) return Number.NaN;
  const qty = Number(text);
  return qty >= 1 ? qty : Number.NaN;
}

/* ---------- Phone numbers (Jordan) ---------- */

/**
 * Accepts "079 123 4567", "0791234567", "+962 79 123 4567", "00962791234567", Arabic digits…
 * Returns { ok, value } where value is the 10-digit local form (or 9 digits for landlines).
 */
export function normalizePhone(input) {
  let digits = toWesternDigits(input).replace(/[\s\-().]/g, "");
  if (!digits) return { ok: true, value: "" };
  digits = digits.replace(/^\+/, "00");
  if (digits.startsWith("00962")) digits = `0${digits.slice(5)}`;
  else if (digits.startsWith("962")) digits = `0${digits.slice(3)}`;
  else if (/^7[789]\d{7}$/.test(digits)) digits = `0${digits}`;
  const ok = /^07[789]\d{7}$/.test(digits) || /^0[2-6]\d{7}$/.test(digits);
  return { ok, value: digits };
}

/** "0791234567" → "079 123 4567", "065001234" → "06 500 1234" */
export function formatPhone(value) {
  if (!value) return "";
  if (value.length === 10) return `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`;
  if (value.length === 9) return `${value.slice(0, 2)} ${value.slice(2, 5)} ${value.slice(5)}`;
  return value;
}

export const isMobileNumber = (value) => /^07[789]\d{7}$/.test(value || "");
export const telLink = (value) => `tel:+962${value.slice(1)}`;
export const whatsappLink = (value) => `https://wa.me/962${value.slice(1)}`;

/* ---------- Dates ---------- */

/** Local calendar date as "YYYY-MM-DD" (no time-zone surprises). */
export function isoDay(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayToDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from today: 0 = today, 1 = tomorrow, -1 = yesterday. */
export function daysFromToday(day) {
  const today = dayToDate(isoDay());
  return Math.round((dayToDate(day) - today) / 86400000);
}

/** "Today", "Tomorrow", "Yesterday", or "7 Oct" (with the year if it isn't this year). */
export function formatDay(dayOrDate) {
  if (!dayOrDate) return "";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dayOrDate) ? dayOrDate : isoDay(dayOrDate);
  const diff = daysFromToday(day);
  if (diff === 0) return t("dates.today");
  if (diff === 1) return t("dates.tomorrow");
  if (diff === -1) return t("dates.yesterday");
  const date = dayToDate(day);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return formatDate(date, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- Orders ---------- */

export function orderTotals(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const tax = Math.round((subtotal * (order.taxRate || 0)) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/** "2× Maqluba tray, 1× Kunafa +1 more" */
export function itemsSummary(order, max = 2) {
  const parts = order.items.slice(0, max).map((item) => `${formatNumber(item.qty)}× ${localText(item.name)}`);
  const text = parts.join(t("common.listSeparator"));
  const extra = order.items.length - max;
  return extra > 0 ? `${text} ${t("orders.more", { count: formatNumber(extra) })}` : text;
}

export function customerName(customer) {
  return customer ? localText(customer.name) : t("orders.unknownCustomer");
}

export function findCustomer(data, id) {
  return data.customers.find((c) => c.id === id) || null;
}

export function nextOrderNumber(data) {
  const number = (data.counters.order || 1000) + 1;
  data.counters.order = number;
  return number;
}

/* ---------- Customers ---------- */

/** Orders, total paid ("spent"), amount still owed, and the latest order date. */
export function customerStats(data, customerId) {
  const orders = data.orders.filter((o) => o.customerId === customerId);
  let spent = 0;
  let owed = 0;
  let lastOrderAt = "";
  orders.forEach((order) => {
    if (order.createdAt > lastOrderAt) lastOrderAt = order.createdAt;
    if (order.status === "cancelled") return;
    const { total } = orderTotals(order);
    if (order.paid) spent += total;
    else owed += total;
  });
  return { count: orders.length, spent, owed, lastOrderAt };
}

/* ---------- Search ---------- */

/** Lower-case, Western digits, and Arabic letters folded (أ/إ/آ → ا, ة → ه, ى → ي, no diacritics). */
export function normalizeForSearch(value) {
  return toWesternDigits(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** True if every word of the query appears somewhere in the given values (any language). */
export function matchesQuery(values, query) {
  const words = normalizeForSearch(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeForSearch(values.flatMap(allTexts).join(" "));
  const compact = haystack.replace(/ /g, "");
  return words.every((word) => haystack.includes(word) || compact.includes(word));
}
