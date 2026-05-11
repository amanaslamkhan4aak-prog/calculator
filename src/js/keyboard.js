/**
 * keyboard.js — Maps keyboard events to calculator actions.
 * @param {Object} actions - object of named action functions
 */

export function initKeyboard(actions) {
  document.addEventListener('keydown', e => {
    // Don't capture if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key;

    // Digits
    if (key >= '0' && key <= '9') {
      e.preventDefault();
      actions.digit(key);
    }
    // Decimal
    else if (key === '.') {
      e.preventDefault();
      actions.decimal();
    }
    // Operators
    else if (key === '+') { e.preventDefault(); actions.operator('+', '+'); }
    else if (key === '-') { e.preventDefault(); actions.operator('-', '−'); }
    else if (key === '*') { e.preventDefault(); actions.operator('*', '×'); }
    else if (key === '/') { e.preventDefault(); actions.operator('/', '÷'); }
    else if (key === '%') { e.preventDefault(); actions.percent(); }
    else if (key === '^') { e.preventDefault(); actions.power(); }
    // Parentheses
    else if (key === '(') { e.preventDefault(); actions.openParen(); }
    else if (key === ')') { e.preventDefault(); actions.closeParen(); }
    // Commands
    else if (key === 'Enter' || key === '=') { e.preventDefault(); actions.equals(); }
    else if (key === 'Backspace')            { e.preventDefault(); actions.delete(); }
    else if (key === 'Escape' || key === 'c'|| key === 'C') {
      if (key === 'Escape' || e.ctrlKey) { e.preventDefault(); actions.clear(); }
    }
    // Copy result
    else if (key === 'c' && (e.ctrlKey || e.metaKey)) {
      // Let default copy behavior work, but also copy the result
      actions.copy();
    }
  });
}
