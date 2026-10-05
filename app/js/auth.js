// Demo accounts, stored only in this browser.
// Passwords are never stored. We keep a random salt and a PBKDF2-SHA-256 hash
// (Web Crypto API), so even someone reading localStorage can't see the password.

import { t } from "./i18n.js";
import {
  getAccounts, saveAccounts, getSession, setSession, clearSession,
  saveData, deleteData, emptyData, newId,
} from "./store.js";

export const DEMO_ID = "demo";
const ITERATIONS = 100000;
export const BUSINESS_TYPES = ["food", "fashion", "handmade", "beauty", "other"];
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // same check as the landing page
export const MIN_PASSWORD = 6;

/** The built-in demo seller. Names come from the translation files. */
const DEMO_ACCOUNT = Object.freeze({
  id: DEMO_ID,
  isDemo: true,
  fullNameKey: "demo.ownerName",
  businessNameKey: "demo.businessName",
  businessType: "food",
  email: null,
});

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** Web Crypto only exists on https:// pages (and localhost). */
export function cryptoAvailable() {
  return Boolean(window.isSecureContext && window.crypto && window.crypto.subtle);
}

/* ---------- Hashing ---------- */

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return window.btoa(binary);
}

function fromBase64(text) {
  return Uint8Array.from(window.atob(text), (c) => c.charCodeAt(0));
}

async function hashPassword(password, salt, iterations) {
  const key = await window.crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256,
  );
  return toBase64(new Uint8Array(bits));
}

const normalizeEmail = (email) => email.trim().toLowerCase();

/* ---------- Who is logged in ---------- */

export function currentAccount() {
  const session = getSession();
  if (!session) return null;
  if (session.accountId === DEMO_ID) return DEMO_ACCOUNT;
  const account = getAccounts().find((a) => a.id === session.accountId);
  if (!account) {
    clearSession(); // the account was deleted (e.g. in another tab)
    return null;
  }
  return account;
}

/* ---------- Names to show (the demo's names are translated) ---------- */

export function businessNameOf(account) {
  return account.isDemo ? t(account.businessNameKey) : account.businessName;
}

export function ownerNameOf(account) {
  return account.isDemo ? t(account.fullNameKey) : account.fullName;
}

export function firstNameOf(account) {
  return ownerNameOf(account).split(/\s+/)[0];
}

export function emailExists(email) {
  const wanted = normalizeEmail(email);
  return getAccounts().some((a) => a.email === wanted);
}

/* ---------- Sign up, log in, log out ---------- */

export async function signUp({ fullName, businessName, businessType, email, password }) {
  if (!cryptoAvailable()) throw new AuthError("noCrypto");
  if (emailExists(email)) throw new AuthError("emailTaken");

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt, ITERATIONS);
  const account = {
    id: newId(),
    fullName: fullName.trim(),
    businessName: businessName.trim(),
    businessType,
    email: normalizeEmail(email),
    password: { algorithm: "PBKDF2-SHA-256", iterations: ITERATIONS, salt: toBase64(salt), hash },
    createdAt: new Date().toISOString(),
  };

  saveData(account.id, emptyData());
  saveAccounts([...getAccounts(), account]);
  setSession(account.id);
  return account;
}

export async function logIn(email, password) {
  if (!cryptoAvailable()) throw new AuthError("noCrypto");
  const account = getAccounts().find((a) => a.email === normalizeEmail(email));
  if (!account || !account.password) throw new AuthError("loginFailed");

  const { salt, iterations, hash } = account.password;
  const attempt = await hashPassword(password, fromBase64(salt), iterations);
  if (attempt !== hash) throw new AuthError("loginFailed");

  setSession(account.id);
  return account;
}

export function logOut() {
  clearSession();
}

/* ---------- Demo account ---------- */

// Replaced in a later phase with realistic sample customers, orders and invoices.
let createDemoData = () => ({ ...emptyData(), settings: { taxEnabled: true, taxRate: 16 } });

export function setDemoDataFactory(factory) {
  createDemoData = factory;
}

/** "Try the demo": always starts from fresh sample data. */
export function startDemo() {
  saveData(DEMO_ID, createDemoData());
  setSession(DEMO_ID);
}

export function resetDemoData() {
  saveData(DEMO_ID, createDemoData());
}

/* ---------- Delete account ---------- */

export function deleteAccount(accountId) {
  saveAccounts(getAccounts().filter((a) => a.id !== accountId));
  deleteData(accountId);
  clearSession();
}
