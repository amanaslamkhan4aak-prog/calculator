/**
 * parser.js — Safe recursive-descent expression parser.
 * Replaces eval(). Supports: +, -, *, /, %, ^, parentheses,
 * functions (sin, cos, tan, asin, acos, atan, log, ln, sqrt, abs),
 * and constants (π, e).
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const FUNCTIONS = {
  sin:  x => Math.sin(x * DEG_TO_RAD),
  cos:  x => Math.cos(x * DEG_TO_RAD),
  tan:  x => Math.tan(x * DEG_TO_RAD),
  asin: x => Math.asin(x) * RAD_TO_DEG,
  acos: x => Math.acos(x) * RAD_TO_DEG,
  atan: x => Math.atan(x) * RAD_TO_DEG,
  log:  x => {
    if (x <= 0) throw new Error('log of non-positive');
    return Math.log10(x);
  },
  ln:   x => {
    if (x <= 0) throw new Error('ln of non-positive');
    return Math.log(x);
  },
  sqrt: x => {
    if (x < 0) throw new Error('√ of negative');
    return Math.sqrt(x);
  },
  abs:  x => Math.abs(x),
};

// Sorted longest-first so "asin" matches before "a"
const FUNC_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length);

class Parser {
  constructor(input) {
    this.src = input;
    this.pos = 0;
  }

  /* ── Helpers ── */
  peek()    { return this.src[this.pos]; }
  consume() { return this.src[this.pos++]; }
  skipWS()  { while (this.pos < this.src.length && this.src[this.pos] === ' ') this.pos++; }
  at(str)   { return this.src.startsWith(str, this.pos); }

  /* ── Entry point ── */
  parse() {
    const val = this.parseExpr();
    this.skipWS();
    if (this.pos < this.src.length) {
      throw new Error(`Unexpected '${this.peek()}' at pos ${this.pos}`);
    }
    return val;
  }

  /* expr → addSub */
  parseExpr() { return this.parseAddSub(); }

  /* addSub → mulDiv (('+' | '-') mulDiv)* */
  parseAddSub() {
    let left = this.parseMulDiv();
    this.skipWS();
    while (this.pos < this.src.length) {
      const c = this.peek();
      if (c === '+') { this.consume(); left = left + this.parseMulDiv(); }
      else if (c === '-') { this.consume(); left = left - this.parseMulDiv(); }
      else break;
      this.skipWS();
    }
    return left;
  }

  /* mulDiv → power (('*' | '/' | '%') power)* */
  parseMulDiv() {
    let left = this.parsePower();
    this.skipWS();
    while (this.pos < this.src.length) {
      const c = this.peek();
      if (c === '*') {
        this.consume(); left = left * this.parsePower();
      } else if (c === '/') {
        this.consume();
        const r = this.parsePower();
        if (r === 0) throw new Error('Division by zero');
        left = left / r;
      } else if (c === '%') {
        this.consume();
        const r = this.parsePower();
        if (r === 0) throw new Error('Modulo by zero');
        left = left % r;
      } else break;
      this.skipWS();
    }
    return left;
  }

  /* power → unary ('^' power)?  [right-associative] */
  parsePower() {
    const base = this.parseUnary();
    this.skipWS();
    if (this.pos < this.src.length && this.peek() === '^') {
      this.consume();
      return Math.pow(base, this.parseUnary());
    }
    return base;
  }

  /* unary → ('-' | '+')? primary */
  parseUnary() {
    this.skipWS();
    if (this.pos < this.src.length && this.peek() === '-') { this.consume(); return -this.parsePrimary(); }
    if (this.pos < this.src.length && this.peek() === '+') { this.consume(); }
    return this.parsePrimary();
  }

  /* primary → '(' expr ')' | constant | func '(' expr ')' | number */
  parsePrimary() {
    this.skipWS();

    // Parenthesised expression
    if (this.peek() === '(') {
      this.consume();
      const val = this.parseExpr();
      this.skipWS();
      if (this.peek() !== ')') throw new Error('Missing closing )');
      this.consume();
      return val;
    }

    // Constants
    if (this.at('π')) { this.pos += 'π'.length; return Math.PI; }
    if (this.at('pi')) { this.pos += 2; return Math.PI; }
    if (this.at('e') && !/[0-9]/.test(this.src[this.pos + 1] ?? '')) {
      this.pos += 1; return Math.E;
    }

    // Named functions
    for (const name of FUNC_NAMES) {
      if (this.at(name)) {
        this.pos += name.length;
        this.skipWS();
        if (this.peek() !== '(') throw new Error(`Expected '(' after ${name}`);
        this.consume();
        const arg = this.parseExpr();
        this.skipWS();
        if (this.peek() !== ')') throw new Error(`Missing ) after ${name}(`);
        this.consume();
        return FUNCTIONS[name](arg);
      }
    }

    // Number
    return this.parseNumber();
  }

  parseNumber() {
    this.skipWS();
    const start = this.pos;
    let hasDot = false;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c >= '0' && c <= '9') { this.pos++; }
      else if (c === '.' && !hasDot) { hasDot = true; this.pos++; }
      else break;
    }
    if (this.pos === start) throw new Error(`Unexpected token: '${this.peek() ?? 'EOF'}'`);
    return parseFloat(this.src.slice(start, this.pos));
  }
}

/**
 * Safely evaluate a mathematical expression string.
 * @param {string} expression - the raw expression (may use ×, ÷, π)
 * @returns {number}
 * @throws {Error} on invalid input
 */
export function evaluate(expression) {
  if (!expression || expression.trim() === '') throw new Error('Empty expression');

  const normalized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .trim();

  const result = new Parser(normalized).parse();

  if (!isFinite(result)) throw new Error('Result is not a finite number');
  return result;
}

/**
 * Format a number for display — removes floating point drift,
 * switches to exponential for very large/small numbers.
 * @param {number} num
 * @returns {string}
 */
export function formatResult(num) {
  if (Number.isInteger(num)) return String(num);

  // Remove floating-point drift (e.g., 0.1+0.2 = 0.3)
  const fixed = parseFloat(num.toPrecision(12));
  if (Math.abs(fixed) >= 1e15 || (Math.abs(fixed) < 1e-7 && fixed !== 0)) {
    return fixed.toExponential(6);
  }
  return String(fixed);
}
