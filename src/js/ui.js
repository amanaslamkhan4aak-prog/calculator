/**
 * ui.js — All DOM interactions, display updates, animations, and panel toggles.
 * Imports nothing from calculator.js — receives plain state objects.
 */

import { loadHistory, clearHistory, removeHistoryEntry, formatRelativeTime } from './history.js';

/* ── DOM references ── */
const $ = id => document.getElementById(id);

export const els = {
  displayExpr:    $('display-expr'),
  displayResult:  $('display-result'),
  memIndicator:   $('mem-indicator'),
  copyBtn:        $('copy-btn'),
  themeBtn:       $('theme-btn'),
  historyBtn:     $('history-btn'),
  shortcutsBtn:   $('shortcuts-btn'),
  historyPanel:   $('history-panel'),
  historyList:    $('history-list'),
  clearHistBtn:   $('clear-hist-btn'),
  backdrop:       document.getElementById('app-backdrop'),
  sciSection:     $('sci-section'),
  shortcutsPanel: $('shortcuts-panel'),
  modeTabs:       document.querySelectorAll('.mode-tab'),
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DISPLAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let _lastDisplay = '';

export function updateDisplay(state) {
  const { displayExpression, currentDisplay, hasError, hasMemory, afterEquals } = state;

  // Expression line
  els.displayExpr.textContent = afterEquals ? displayExpression : (displayExpression || '');

  // Result line — animate only if value changed
  if (currentDisplay !== _lastDisplay) {
    const el = els.displayResult;
    el.textContent = currentDisplay;
    el.classList.remove('slide-up');
    void el.offsetWidth; // reflow
    el.classList.add('slide-up');
    _lastDisplay = currentDisplay;
  }

  // Adjust font size for long numbers
  const len = currentDisplay.length;
  els.displayResult.className = 'display-result slide-up' +
    (len > 16 ? ' xsmall' : len > 11 ? ' small' : '');

  // Error state
  els.displayResult.style.color = hasError ? 'var(--text-clear)' : '';

  // Memory indicator
  els.memIndicator.classList.toggle('visible', hasMemory);
}

export function flashError(displayArea) {
  displayArea.classList.remove('shake', 'error-flash');
  void displayArea.offsetWidth;
  displayArea.classList.add('shake', 'error-flash');
  setTimeout(() => displayArea.classList.remove('shake', 'error-flash'), 600);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RIPPLE EFFECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function createRipple(btn, event) {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = (event.clientX - rect.left) - size / 2;
  const y = (event.clientY - rect.top)  - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   THEME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const THEME_KEY = 'calc_theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  els.themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  els.themeBtn.innerHTML = theme === 'dark' ? svgSun() : svgMoon();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HISTORY PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let _historyOpen = false;

export function toggleHistory() {
  _historyOpen = !_historyOpen;
  els.historyPanel.classList.toggle('open', _historyOpen);
  els.backdrop.classList.toggle('visible', _historyOpen);
  els.historyBtn.classList.toggle('active', _historyOpen);
  if (_historyOpen) renderHistory();
}

export function closeHistory() {
  _historyOpen = false;
  els.historyPanel.classList.remove('open');
  els.backdrop.classList.remove('visible');
  els.historyBtn.classList.remove('active');
}

/** Render the history list and return the items array */
export function renderHistory(onItemClick) {
  const items = loadHistory();
  const list = els.historyList;
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = `
      <div class="history-empty">
        ${svgClock()}
        <p>No calculations yet.<br>Your history will appear here.</p>
      </div>`;
    return items;
  }

  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${item.expression} equals ${item.result}`);
    el.innerHTML = `
      <div class="history-expr">${escapeHtml(item.expression)}</div>
      <div class="history-result">${escapeHtml(item.result)}</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:0.65rem;color:var(--text-muted)">${formatRelativeTime(item.timestamp)}</span>
      </div>`;
    el.addEventListener('click', () => {
      if (typeof onItemClick === 'function') onItemClick(item.result);
      closeHistory();
    });
    list.appendChild(el);
  });
  return items;
}

export function handleClearHistory() {
  clearHistory();
  renderHistory();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SCIENTIFIC MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let _sciMode = false;

export function setMode(mode) {
  _sciMode = mode === 'scientific';
  els.sciSection.classList.toggle('visible', _sciMode);
  els.modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COPY TO CLIPBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    els.copyBtn.textContent = 'Copied!';
    els.copyBtn.classList.add('copied', 'pop');
    setTimeout(() => {
      els.copyBtn.textContent = 'Copy';
      els.copyBtn.classList.remove('copied', 'pop');
    }, 1800);
  } catch {
    els.copyBtn.textContent = 'Failed';
    setTimeout(() => { els.copyBtn.textContent = 'Copy'; }, 1500);
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   KEYBOARD SHORTCUTS PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let _shortcutsOpen = false;

export function toggleShortcuts() {
  _shortcutsOpen = !_shortcutsOpen;
  els.shortcutsPanel.classList.toggle('visible', _shortcutsOpen);
  els.shortcutsBtn.classList.toggle('active', _shortcutsOpen);
}

export function closeShortcuts() {
  _shortcutsOpen = false;
  els.shortcutsPanel.classList.remove('visible');
  els.shortcutsBtn.classList.remove('active');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Inline SVGs ── */
function svgSun() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
}
function svgMoon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}
function svgClock() {
  return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
}
export { svgSun, svgMoon };
