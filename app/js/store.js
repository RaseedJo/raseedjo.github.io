// Everything the app saves lives in this browser's localStorage, under keys
// starting with "raseed-app.". Nothing is ever sent to a server.
//
//   raseed-app.accounts      list of sign-up accounts (password hashes, never passwords)
//   raseed-app.session       which account is logged in
//   raseed-app.data.<id>     one account's customers, orders, invoices and settings
//
// If the browser blocks storage (some private modes do), the app keeps working
// from memory for this tab and shows a notice.

const PREFIX = "raseed-app.";
const ACCOUNTS_KEY = `${PREFIX}accounts`;
const SESSION_KEY = `${PREFIX}session`;
const dataKey = (accountId) => `${PREFIX}data.${accountId}`;

export const DATA_VERSION = 1;

const memory = new Map();
const persistent = probeStorage();

function probeStorage() {
  try {
    const key = `${PREFIX}probe`;
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

/** False when the browser blocks storage and data only lives until the tab closes. */
export function isPersistent() {
  return persistent;
}

export class StorageFullError extends Error {}

function read(key, fallback) {
  try {
    const raw = persistent ? window.localStorage.getItem(key) : memory.get(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback; // unreadable or corrupted — behave as if it isn't there
  }
}

function write(key, value) {
  const raw = JSON.stringify(value);
  if (!persistent) {
    memory.set(key, raw);
    return;
  }
  try {
    window.localStorage.setItem(key, raw);
  } catch (e) {
    throw new StorageFullError(e.message);
  }
}

function remove(key) {
  if (persistent) {
    try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  } else {
    memory.delete(key);
  }
}

/** True when another tab changed the session or accounts (used to stay in sync). */
export function isSessionStorageEvent(event) {
  return event.key === SESSION_KEY || event.key === ACCOUNTS_KEY || event.key === null;
}

/* ---------- Accounts ---------- */

export function getAccounts() {
  const list = read(ACCOUNTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveAccounts(accounts) {
  write(ACCOUNTS_KEY, accounts);
}

/* ---------- Session ---------- */

export function getSession() {
  const session = read(SESSION_KEY, null);
  return session && typeof session.accountId === "string" ? session : null;
}

export function setSession(accountId) {
  write(SESSION_KEY, { accountId, since: new Date().toISOString() });
}

export function clearSession() {
  remove(SESSION_KEY);
}

/* ---------- One account's data ---------- */

export function emptyData() {
  return {
    version: DATA_VERSION,
    settings: { taxEnabled: false, taxRate: 16 },
    customers: [],
    orders: [],
    invoices: [],
    counters: { invoice: {} }, // next invoice number per year, e.g. { "2026": 4 }
  };
}

export function getData(accountId) {
  const data = read(dataKey(accountId), null);
  if (!data || typeof data !== "object") return emptyData();
  // Fill in anything missing from older saves
  const base = emptyData();
  return { ...base, ...data, settings: { ...base.settings, ...data.settings }, counters: { ...base.counters, ...data.counters } };
}

export function saveData(accountId, data) {
  write(dataKey(accountId), { ...data, version: DATA_VERSION });
}

export function deleteData(accountId) {
  remove(dataKey(accountId));
}

/* ---------- IDs ---------- */

export function newId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
