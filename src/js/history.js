/**
 * history.js — Calculation history module.
 * Stores entries in localStorage, max 50 items.
 */

const STORAGE_KEY = 'calc_history_v1';
const MAX_ITEMS   = 50;

/**
 * @typedef {Object} HistoryEntry
 * @property {string} expression
 * @property {string} result
 * @property {number} timestamp
 */

/** Load history from localStorage */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save history array to localStorage */
function saveHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* storage quota exceeded — silently fail */ }
}

/**
 * Add a new entry. Returns the updated history array.
 * @param {string} expression
 * @param {string} result
 * @returns {HistoryEntry[]}
 */
export function addHistoryEntry(expression, result) {
  const items = loadHistory();
  items.unshift({ expression, result, timestamp: Date.now() });
  if (items.length > MAX_ITEMS) items.pop();
  saveHistory(items);
  return items;
}

/** Clear all history. Returns empty array. */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}

/** Remove a single entry by index. Returns updated array. */
export function removeHistoryEntry(index) {
  const items = loadHistory();
  items.splice(index, 1);
  saveHistory(items);
  return items;
}

/**
 * Format a timestamp to a relative string: "just now", "5m ago", etc.
 * @param {number} ts
 * @returns {string}
 */
export function formatRelativeTime(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}
