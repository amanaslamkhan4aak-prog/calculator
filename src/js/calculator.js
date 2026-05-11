/**
 * calculator.js — Calculator state engine.
 * All input validation, state transitions, and math operations live here.
 * No DOM access — this is pure logic.
 */

import { evaluate, formatResult } from './parser.js';

const OPERATORS = new Set(['+', '-', '*', '/', '%', '^']);

/** Returns true if the last "token" in the expression is an operator */
function endsWithOperator(expr) {
  return /[+\-*/%^(]$/.test(expr.trimEnd());
}

/** Returns true if the last number segment already has a decimal point */
function lastNumberHasDecimal(expr) {
  const match = expr.match(/[0-9.]+$/);
  return match ? match[0].includes('.') : false;
}

/** Count open - close parens */
function countOpenParens(expr) {
  return (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
}

export class CalculatorEngine {
  constructor() {
    this._reset();
  }

  _reset() {
    /** Internal expression string (uses *, /, operators) */
    this.expression = '';
    /** Display expression (uses ×, ÷ for readability) */
    this.displayExpression = '';
    /** What the big result line shows */
    this.currentDisplay = '0';
    /** Whether we just pressed = */
    this.afterEquals = false;
    /** Error state */
    this.hasError = false;
    /** Memory */
    this.memory = 0;
    this.hasMemory = false;
  }

  /* ─── Private helpers ─── */

  _appendRaw(internal, display = internal) {
    this.expression += internal;
    this.displayExpression += display;
    this.currentDisplay = display || internal;
    this.afterEquals = false;
    this.hasError = false;
  }

  _setDisplay(val) {
    this.currentDisplay = val;
  }

  /* ─── Public API ─── */

  /** Append a digit (0-9) */
  appendDigit(digit) {
    if (this.hasError || this.afterEquals) {
      // Start fresh
      this.expression = digit;
      this.displayExpression = digit;
      this.currentDisplay = digit;
      this.afterEquals = false;
      this.hasError = false;
      return this.getState();
    }

    // Prevent leading zeros: "0" + digit → replace if only zero
    if (this.expression === '0' && digit !== '.') {
      this.expression = digit;
      this.displayExpression = digit;
      this.currentDisplay = digit;
      return this.getState();
    }

    this.expression += digit;
    this.displayExpression += digit;
    this.currentDisplay = this._getTrailingNumber() || digit;
    return this.getState();
  }

  /** Append decimal point */
  appendDecimal() {
    if (this.hasError || this.afterEquals) {
      this.expression = '0.';
      this.displayExpression = '0.';
      this.currentDisplay = '0.';
      this.afterEquals = false;
      this.hasError = false;
      return this.getState();
    }

    if (lastNumberHasDecimal(this.expression)) return this.getState(); // ignore

    // If expression is empty or ends with operator, prefix with 0
    if (this.expression === '' || endsWithOperator(this.expression)) {
      this.expression += '0.';
      this.displayExpression += '0.';
      this.currentDisplay = '0.';
    } else {
      this.expression += '.';
      this.displayExpression += '.';
      this.currentDisplay = this._getTrailingNumber() + '.';
    }
    return this.getState();
  }

  /** Append an operator */
  appendOperator(internal, display = internal) {
    if (this.hasError) return this.getState();

    if (this.afterEquals) {
      // Continue from result
      this.expression = this.currentDisplay;
      this.displayExpression = this.currentDisplay;
      this.afterEquals = false;
    }

    if (this.expression === '' && internal !== '-') return this.getState(); // no leading operators except unary minus

    // Replace trailing operator (except opening paren case)
    if (endsWithOperator(this.expression) && internal !== '-') {
      // Remove last char (the operator)
      this.expression = this.expression.slice(0, -1);
      this.displayExpression = this.displayExpression.slice(0, -1);
    }

    this.expression += internal;
    this.displayExpression += display;
    this.currentDisplay = display;
    this.afterEquals = false;
    return this.getState();
  }

  /** Append a scientific function call — e.g., sin( */
  appendFunction(name) {
    if (this.hasError) return this.getState();

    if (this.afterEquals) {
      // Wrap result in function: sin(42)
      this.expression = `${name}(${this.currentDisplay}`;
      this.displayExpression = `${name}(${this.currentDisplay}`;
      this.afterEquals = false;
    } else {
      // If expression ends with a number, auto-insert *
      if (this.expression !== '' && /[0-9)]$/.test(this.expression)) {
        this.expression += '*';
        this.displayExpression += '×';
      }
      this.expression += `${name}(`;
      this.displayExpression += `${name}(`;
    }
    this.currentDisplay = `${name}(`;
    return this.getState();
  }

  /** Append a constant */
  appendConstant(internal, display = internal) {
    if (this.hasError) {
      this.expression = internal;
      this.displayExpression = display;
      this.currentDisplay = display;
      this.hasError = false;
      return this.getState();
    }

    if (this.afterEquals) {
      this.expression = internal;
      this.displayExpression = display;
      this.currentDisplay = display;
      this.afterEquals = false;
      return this.getState();
    }

    if (this.expression !== '' && /[0-9)]$/.test(this.expression)) {
      this.expression += '*';
      this.displayExpression += '×';
    }
    this.expression += internal;
    this.displayExpression += display;
    this.currentDisplay = display;
    return this.getState();
  }

  /** Open parenthesis */
  appendOpenParen() {
    if (this.hasError || this.afterEquals) {
      this.expression = '(';
      this.displayExpression = '(';
      this.currentDisplay = '(';
      this.afterEquals = false;
      this.hasError = false;
      return this.getState();
    }

    if (this.expression !== '' && /[0-9)]$/.test(this.expression)) {
      this.expression += '*(';
      this.displayExpression += '×(';
    } else {
      this.expression += '(';
      this.displayExpression += '(';
    }
    this.currentDisplay = '(';
    return this.getState();
  }

  /** Close parenthesis */
  appendCloseParen() {
    if (countOpenParens(this.expression) <= 0) return this.getState();
    if (endsWithOperator(this.expression)) return this.getState();
    this.expression += ')';
    this.displayExpression += ')';
    this.currentDisplay = ')';
    return this.getState();
  }

  /** Toggle sign (+/-) */
  toggleSign() {
    if (this.hasError) return this.getState();

    const trailing = this._getTrailingNumber();
    if (!trailing) return this.getState();

    const negated = trailing.startsWith('-') ? trailing.slice(1) : '-' + trailing;
    const len = trailing.length;
    this.expression = this.expression.slice(0, -len) + negated;
    this.displayExpression = this.displayExpression.slice(0, -len) + negated;
    this.currentDisplay = negated;
    return this.getState();
  }

  /** Percentage — converts last number to x/100 */
  percentage() {
    if (this.hasError) return this.getState();
    const trailing = this._getTrailingNumber();
    if (!trailing) return this.getState();

    const val = parseFloat(trailing) / 100;
    const valStr = formatResult(val);
    const len = trailing.length;
    this.expression = this.expression.slice(0, -len) + valStr;
    this.displayExpression = this.displayExpression.slice(0, -len) + valStr;
    this.currentDisplay = valStr;
    return this.getState();
  }

  /** Power shortcut: x² appends ^2 */
  square() {
    if (this.afterEquals) {
      this.expression = `(${this.currentDisplay})^2`;
      this.displayExpression = `(${this.currentDisplay})²`;
    } else {
      if (this.expression === '') return this.getState();
      this.expression += '^2';
      this.displayExpression += '²';
    }
    this.afterEquals = false;
    return this.getState();
  }

  /** Append power operator ^  */
  power() {
    return this.appendOperator('^', '^');
  }

  /** Evaluate the expression */
  calculate() {
    if (this.hasError) return this.getState();
    if (!this.expression) return this.getState();

    // Auto-close open parens
    const open = countOpenParens(this.expression);
    const closers = ')'.repeat(Math.max(0, open));
    const fullExpr = this.expression + closers;

    try {
      const result = evaluate(fullExpr);
      const resultStr = formatResult(result);

      // Build expression line: "7 × 8 ="
      const completedExpr = this.displayExpression + closers + ' =';

      this.displayExpression = completedExpr;
      this.expression = resultStr;
      this.currentDisplay = resultStr;
      this.afterEquals = true;
      this.hasError = false;

      return { ...this.getState(), justCalculated: true, expressionForHistory: completedExpr };
    } catch (err) {
      this.hasError = true;
      this.currentDisplay = 'Error';
      this.afterEquals = false;
      return { ...this.getState(), error: err.message };
    }
  }

  /** Clear all */
  clear() {
    this._reset();
    return this.getState();
  }

  /** Delete last character */
  deleteLast() {
    if (this.hasError || this.afterEquals) {
      this._reset();
      return this.getState();
    }
    if (!this.expression) return this.getState();

    // Check if last displayExpression "char" is a multi-char symbol (e.g., "×", "sin(")
    // We just pop one char from each for now
    this.expression = this.expression.slice(0, -1);
    this.displayExpression = this.displayExpression.slice(0, -1);
    this.currentDisplay = this._getTrailingNumber() || this.displayExpression.slice(-1) || '0';
    if (!this.expression) this.currentDisplay = '0';
    return this.getState();
  }

  /* ── Memory ── */
  memoryStore() {
    const val = parseFloat(this.currentDisplay);
    if (!isNaN(val)) { this.memory = val; this.hasMemory = true; }
    return this.getState();
  }
  memoryRecall() {
    if (!this.hasMemory) return this.getState();
    const val = formatResult(this.memory);
    if (this.afterEquals || this.hasError || this.expression === '') {
      this.expression = val;
      this.displayExpression = val;
      this.currentDisplay = val;
      this.afterEquals = false;
      this.hasError = false;
    } else {
      this.expression += val;
      this.displayExpression += val;
      this.currentDisplay = val;
    }
    return this.getState();
  }
  memoryAdd() {
    const val = parseFloat(this.currentDisplay);
    if (!isNaN(val)) { this.memory += val; this.hasMemory = true; }
    return this.getState();
  }
  memorySubtract() {
    const val = parseFloat(this.currentDisplay);
    if (!isNaN(val)) { this.memory -= val; this.hasMemory = true; }
    return this.getState();
  }
  memoryClear() {
    this.memory = 0; this.hasMemory = false;
    return this.getState();
  }

  /* ── Private ── */
  _getTrailingNumber() {
    const match = this.expression.match(/[-]?[0-9]*\.?[0-9]+$/);
    return match ? match[0] : '';
  }

  getState() {
    return {
      expression:        this.expression,
      displayExpression: this.displayExpression,
      currentDisplay:    this.currentDisplay,
      afterEquals:       this.afterEquals,
      hasError:          this.hasError,
      memory:            this.memory,
      hasMemory:         this.hasMemory,
      openParens:        countOpenParens(this.expression),
    };
  }
}
