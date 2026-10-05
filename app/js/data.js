// Read and change the logged-in account's data (customers, orders, invoices).
// Always reads fresh from storage, so a reset or another tab is never out of date.

import { getData, saveData } from "./store.js";

export function loadData(account) {
  return getData(account.id);
}

/** Load, change, save. `change` edits the data in place and may return a value. */
export function updateData(account, change) {
  const data = getData(account.id);
  const result = change(data);
  saveData(account.id, data);
  return result;
}
