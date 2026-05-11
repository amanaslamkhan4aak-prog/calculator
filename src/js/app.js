/**
 * app.js — Entry point. Wires all modules together.
 */

import { CalculatorEngine } from './calculator.js';
import { addHistoryEntry }  from './history.js';
import {
  els, updateDisplay, flashError, createRipple,
  initTheme, toggleTheme, toggleHistory, closeHistory,
  renderHistory, handleClearHistory,
  setMode, copyToClipboard, toggleShortcuts, closeShortcuts,
} from './ui.js';
import { initKeyboard } from './keyboard.js';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const engine = new CalculatorEngine();
const displayArea = document.getElementById('display-area');

initTheme();
updateDisplay(engine.getState());

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CORE ACTION DISPATCHER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function dispatch(action, ...args) {
  let state;
  switch (action) {
    case 'digit':      state = engine.appendDigit(args[0]); break;
    case 'decimal':    state = engine.appendDecimal(); break;
    case 'operator':   state = engine.appendOperator(args[0], args[1]); break;
    case 'openParen':  state = engine.appendOpenParen(); break;
    case 'closeParen': state = engine.appendCloseParen(); break;
    case 'function':   state = engine.appendFunction(args[0]); break;
    case 'constant':   state = engine.appendConstant(args[0], args[1]); break;
    case 'percent':    state = engine.percentage(); break;
    case 'power':      state = engine.power(); break;
    case 'square':     state = engine.square(); break;
    case 'toggleSign': state = engine.toggleSign(); break;
    case 'delete':     state = engine.deleteLast(); break;
    case 'clear':      state = engine.clear(); break;
    case 'equals':     state = handleEquals(); return; // handled separately
    case 'memStore':   state = engine.memoryStore(); break;
    case 'memRecall':  state = engine.memoryRecall(); break;
    case 'memAdd':     state = engine.memoryAdd(); break;
    case 'memSub':     state = engine.memorySubtract(); break;
    case 'memClear':   state = engine.memoryClear(); break;
    case 'copy':       copyToClipboard(engine.currentDisplay); return;
    default: return;
  }
  updateDisplay(state);
}

function handleEquals() {
  const result = engine.calculate();
  updateDisplay(result);

  if (result.hasError) {
    flashError(displayArea);
  } else if (result.justCalculated) {
    // Add to history (strip trailing " =" from expression)
    const expr = result.displayExpression.replace(/ =$/, '').trim();
    addHistoryEntry(expr, result.currentDisplay);
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BUTTON CLICK HANDLER (event delegation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
document.getElementById('btn-grid').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  createRipple(btn, e);

  const { action, value, display } = btn.dataset;
  dispatch(action, value, display);
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HEADER CONTROLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
els.themeBtn.addEventListener('click', toggleTheme);

els.historyBtn.addEventListener('click', toggleHistory);

els.clearHistBtn.addEventListener('click', () => {
  handleClearHistory();
});

els.backdrop.addEventListener('click', () => {
  closeHistory();
  closeShortcuts();
});

els.shortcutsBtn.addEventListener('click', e => {
  e.stopPropagation();
  toggleShortcuts();
});

/* ── Copy button ── */
els.copyBtn.addEventListener('click', () => {
  copyToClipboard(engine.currentDisplay);
});

/* ── Mode tabs ── */
els.modeTabs.forEach(tab => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

/* ── History item click → load result ── */
function onHistoryItemClick(result) {
  engine.expression = result;
  engine.displayExpression = result;
  engine.currentDisplay = result;
  engine.afterEquals = true;
  updateDisplay(engine.getState());
  closeHistory();
}

// Render history whenever the panel is opened
els.historyBtn.addEventListener('click', () => {
  renderHistory(onHistoryItemClick);
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   KEYBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
initKeyboard({
  digit:     d  => dispatch('digit', d),
  decimal:   () => dispatch('decimal'),
  operator:  (i, d) => dispatch('operator', i, d),
  percent:   () => dispatch('percent'),
  power:     () => dispatch('power'),
  openParen: () => dispatch('openParen'),
  closeParen:() => dispatch('closeParen'),
  equals:    () => dispatch('equals'),
  delete:    () => dispatch('delete'),
  clear:     () => dispatch('clear'),
  copy:      () => dispatch('copy'),
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CLOSE PANELS ON OUTSIDE CLICK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
document.addEventListener('click', e => {
  if (!e.target.closest('#shortcuts-panel') && !e.target.closest('#shortcuts-btn')) {
    closeShortcuts();
  }
});
