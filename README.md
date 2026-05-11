# Calc Pro — Modern Calculator App

> A feature-rich, industry-standard calculator built with **Vanilla HTML, CSS, and JavaScript** using ES Modules architecture. Zero dependencies, zero frameworks, zero `eval()`.

![Calc Pro Preview](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square) ![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square) ![CSS](https://img.shields.io/badge/CSS-Custom%20Properties-blueviolet?style=flat-square)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Architecture & Design Decisions](#-architecture--design-decisions)
- [Module Breakdown](#-module-breakdown)
- [Design System](#-design-system)
- [Security](#-security)
- [Accessibility](#-accessibility)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [How to Run](#-how-to-run)
- [What Was Improved (Before vs After)](#-what-was-improved-before-vs-after)
- [Interview Talking Points](#-interview-talking-points)

---

## 🧮 Overview

**Calc Pro** is a professional-grade calculator app rebuilt from scratch following industry-standard practices. It started as a 282-line single-file app using `eval()` and was transformed into a modular, secure, accessible, and feature-rich application.

**Key highlights:**
- **No `eval()`** — custom recursive-descent expression parser
- **ES Modules** — proper separation of concerns across 6 JS files
- **Design system** — 40+ CSS custom properties, two themes, responsive
- **Feature-rich** — history, scientific mode, memory, keyboard, accessibility

---

## ✨ Features

### Core Calculator
- ✅ Basic arithmetic: `+`, `−`, `×`, `÷`
- ✅ **Two-line display** — expression line (top) + result line (bottom)
- ✅ Input validation — blocks double operators, double decimals
- ✅ Auto-close open parentheses on `=`
- ✅ Error recovery — auto-clears state on next input after error
- ✅ Shake + glow animation on errors

### Scientific Mode
- ✅ Toggle between **Standard** and **Scientific** modes
- ✅ Trigonometry: `sin`, `cos`, `tan`, `asin`, `acos`, `atan` (degrees)
- ✅ Logarithms: `log` (base 10), `ln` (natural)
- ✅ `√` (square root), `x²` (square), `xⁿ` (power)
- ✅ `|x|` (absolute value)
- ✅ Constants: `π` (Pi), `e` (Euler's number)
- ✅ Parentheses: `( )`

### Memory Functions
- ✅ `MC` — Memory Clear
- ✅ `MR` — Memory Recall
- ✅ `M+` — Memory Add
- ✅ `M−` — Memory Subtract
- ✅ Visual `M` indicator on display when memory is active

### History Panel
- ✅ Slide-in history panel showing all past calculations
- ✅ Click any history item to load its result
- ✅ Persisted in **localStorage** (survives page refresh)
- ✅ Max 50 entries (oldest auto-removed)
- ✅ Relative timestamps ("just now", "5m ago")
- ✅ Clear all history button

### UI/UX
- ✅ **Dark / Light theme** toggle (persisted in localStorage)
- ✅ **Ripple animation** on every button press
- ✅ Responsive layout — works on mobile (down to 360px)
- ✅ **Copy to clipboard** button on display
- ✅ `+/−` toggle (negate current number)
- ✅ Keyboard shortcuts panel (hover the keyboard icon)
- ✅ Glassmorphism card design with backdrop-filter blur
- ✅ Smooth transitions and micro-animations throughout

### Keyboard Support
- ✅ Full keyboard input (digits, operators, Enter, Backspace, Escape)
- ✅ `^` for power, `( )` for parentheses
- ✅ `Ctrl+C` to copy result

---

## 📁 Project Structure

```
calculator-app/
│
├── index.html                  ← Semantic markup only, no logic
│
├── src/
│   ├── css/
│   │   ├── base.css            ← Design tokens (CSS vars), reset, typography
│   │   ├── calculator.css      ← Component layout & styles
│   │   └── animations.css      ← All keyframes & micro-interactions
│   │
│   └── js/
│       ├── parser.js           ← Safe recursive-descent expression parser
│       ├── calculator.js       ← State engine & all math/input logic
│       ├── history.js          ← History CRUD with localStorage
│       ├── ui.js               ← DOM updates, animations, panel toggles
│       ├── keyboard.js         ← Keyboard event mapping
│       └── app.js              ← Entry point — wires all modules together
│
└── README.md
```

---

## 🏗️ Architecture & Design Decisions

### 1. ES Module Architecture
```html
<script type="module" src="src/js/app.js"></script>
```
Each file is a proper ES module with `import`/`export`. This gives us:
- **Tree-shakeable** code (only what's imported is used)
- **No global scope pollution** — no `window.calculate()` etc.
- **Clear dependency graph** — easy to trace what depends on what

### 2. Separation of Concerns

| Layer | File | Responsibility |
|---|---|---|
| **Parsing** | `parser.js` | Converts string → number. Pure functions only. |
| **Business Logic** | `calculator.js` | State, input validation, all operations. No DOM. |
| **Persistence** | `history.js` | localStorage read/write. No DOM, no state. |
| **Presentation** | `ui.js` | All DOM access. Receives state objects. |
| **Input** | `keyboard.js` | Keyboard events → action names. No state. |
| **Wiring** | `app.js` | Imports all modules, connects them. |

### 3. Event Delegation
Instead of `onclick="appendValue('7')"` on every button, **one listener** handles all button clicks:
```javascript
document.getElementById('btn-grid').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  dispatch(btn.dataset.action, btn.dataset.value, btn.dataset.display);
});
```
Benefits: fewer event listeners, dynamic buttons work automatically.

### 4. Data Attributes Drive Behavior
All button configuration lives in HTML as `data-*` attributes:
```html
<button class="btn btn-operator"
  data-action="operator"
  data-value="/"
  data-display="÷"
  aria-label="Divide">÷</button>
```
The JS just reads `btn.dataset.action` — no giant switch/case in HTML.

### 5. Central Dispatch Function
```javascript
function dispatch(action, ...args) {
  switch (action) {
    case 'digit':    state = engine.appendDigit(args[0]); break;
    case 'operator': state = engine.appendOperator(...args); break;
    case 'equals':   handleEquals(); return;
    // ...
  }
  updateDisplay(state);
}
```
Single entry point for all state changes → easy to debug, easy to extend.

---

## 📦 Module Breakdown

### `parser.js` — Safe Expression Parser
A hand-written **recursive-descent parser** implementing the grammar:

```
expr    → addSub
addSub  → mulDiv ( ('+' | '-') mulDiv )*
mulDiv  → power  ( ('*' | '/' | '%') power )*
power   → unary  ( '^' unary )?
unary   → ('-')? primary
primary → '(' expr ')' | constant | func '(' expr ')' | number
```

Supports:
- All arithmetic operators with correct precedence
- Right-associative exponentiation (`2^3^2 = 2^(3^2) = 512`)
- Unary minus (`-5 * 3`)
- Named functions: `sin(`, `cos(`, `sqrt(`, etc.
- Constants: `π`, `e`

### `calculator.js` — State Engine
Maintains state as a plain object:
```javascript
{
  expression:        string,   // Internal expr (uses *, /)
  displayExpression: string,   // Pretty expr (uses ×, ÷)
  currentDisplay:    string,   // What the big number shows
  afterEquals:       boolean,  // Just pressed =?
  hasError:          boolean,
  memory:            number,
  hasMemory:         boolean,
  openParens:        number,   // Unclosed ( count
}
```
Every method returns a **new state snapshot** — no side effects.

### `history.js` — Persistence Layer
```javascript
export function addHistoryEntry(expression, result) { ... }
export function loadHistory() { ... }
export function clearHistory() { ... }
export function formatRelativeTime(timestamp) { ... }
```
Pure functions. No DOM. No state. Easily testable.

### `ui.js` — Presentation Layer
Handles **all** DOM interaction. Receives state objects from calculator engine:
```javascript
export function updateDisplay(state) {
  els.displayExpr.textContent = state.displayExpression;
  els.displayResult.textContent = state.currentDisplay;
  // ... font size adjustment, memory indicator, error color
}
```

### `keyboard.js` — Input Module
Maps `KeyboardEvent.key` strings to action names. Completely decoupled:
```javascript
export function initKeyboard(actions) {
  document.addEventListener('keydown', e => {
    if (e.key >= '0' && e.key <= '9') actions.digit(e.key);
    if (e.key === 'Enter') actions.equals();
    // ...
  });
}
```

---

## 🎨 Design System

Built entirely with **CSS Custom Properties** (design tokens):

```css
:root {
  /* Colors */
  --bg-page:          #09090f;
  --bg-card:          rgba(255, 255, 255, 0.045);
  --text-primary:     #f1f5f9;
  --text-operator:    #a78bfa;   /* violet */
  --text-clear:       #f87171;   /* red */
  --text-memory:      #34d399;   /* emerald */
  --text-sci:         #fbbf24;   /* amber */
  --accent:           #7c3aed;

  /* Spacing */
  --card-width:       360px;
  --btn-radius:       14px;
  --btn-height:       62px;
  --gap:              10px;

  /* Transitions */
  --t-fast:  0.12s cubic-bezier(0.4, 0, 0.2, 1);
  --t-base:  0.2s  cubic-bezier(0.4, 0, 0.2, 1);
  --t-slow:  0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Light theme** overrides every token via `[data-theme="light"]` selector — zero duplication.

### Typography
- **Font**: [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- Result display: `2.6rem`, `font-weight: 300` (elegant, spacious)
- Auto-scaling: switches to `.small` or `.xsmall` class for long numbers

### Animations
| Animation | Trigger | Effect |
|---|---|---|
| `ripple` | Button click | Expanding circle from click point |
| `shake` + `errorGlow` | Error result | Horizontal shake + red border glow |
| `slideUp` | Result change | Number slides up into view |
| `slideInRight` | History item added | Card slides in from right |
| `pop` | Copy success | Brief scale bounce |
| `slideDown` | Scientific mode on | Panel slides down from above |
| `numFlip` | Display update | Subtle vertical flip |

---

## 🔐 Security

### Before: `eval()` — Critical Vulnerability
```javascript
// ❌ OLD: Executes ANY JavaScript code
display.value = eval(display.value);

// Malicious input: "alert(document.cookie)" → runs JS code
```

### After: Custom Parser — Completely Safe
```javascript
// ✅ NEW: Only evaluates mathematical expressions
// Input is tokenized → parsed → evaluated mathematically
// "alert(1)" → throws "Unexpected token: 'a'" (not executed)
const result = new Parser(normalizedInput).parse();
```

The parser **only understands numbers, operators, and whitelisted function names**. Any other input throws a parse error — it cannot execute code.

---

## ♿ Accessibility

Every interactive element has proper ARIA attributes:

```html
<!-- Semantic roles -->
<main role="main">
<aside role="complementary" aria-label="Calculation history">
<div role="application" aria-label="Calculator">
<div role="tablist" aria-label="Calculator mode">
<div role="list" aria-label="Past calculations">

<!-- Live region for screen readers -->
<section aria-live="polite" aria-label="Calculator display">

<!-- Every button labeled -->
<button aria-label="Divide">÷</button>
<button aria-label="Calculate result">=</button>
<button aria-label="Memory store">MS</button>
```

- **Focus management**: all buttons reachable via Tab
- **Focus ring**: visible `:focus-visible` outline using accent color
- **No color-only information**: text/icons always accompany color cues

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `0` – `9` | Input digit |
| `.` | Decimal point |
| `+`, `-`, `*`, `/` | Operators |
| `%` | Percentage |
| `^` | Power |
| `(`, `)` | Parentheses |
| `Enter` or `=` | Calculate |
| `Backspace` | Delete last character |
| `Escape` | Clear all |
| `Ctrl+C` | Copy result |

---

## 🚀 How to Run

This is a **pure static app** — no build step, no npm install, no server required.

### Option 1: Direct open (limited — modules may be blocked)
Double-click `index.html` in File Explorer.

> **Note:** ES Modules require a server due to browser CORS policy on `file://` protocol.

### Option 2: VS Code Live Server (recommended)
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. App opens at `http://127.0.0.1:5500`

### Option 3: Python HTTP server
```bash
cd "calculator aap"
python -m http.server 5500
# Open http://localhost:5500
```

### Option 4: Node.js
```bash
npx serve .
# or
npx http-server .
```

---

## 📊 What Was Improved (Before vs After)

| Aspect | Before ❌ | After ✅ |
|---|---|---|
| **File structure** | 1 file (282 lines) | 10 files across `src/css/` + `src/js/` |
| **Security** | `eval()` executes arbitrary JS | Custom recursive-descent parser |
| **Architecture** | Inline `onclick` on every button | ES Modules + event delegation |
| **State** | `<input>` element IS the state | Dedicated `CalculatorEngine` class |
| **Global scope** | All functions on `window` | Zero global variables |
| **Display** | Single line | Two-line (expression + result) |
| **Font** | `Arial` (system default) | Inter (Google Fonts) |
| **Design tokens** | Hardcoded hex values | 40+ CSS custom properties |
| **Themes** | Dark only | Dark + Light (persisted) |
| **Responsive** | Fixed `340px` | Fluid, works at 360px+ |
| **Input validation** | None (double operators allowed) | Full guards + auto-correction |
| **Error recovery** | Appends to "Error" string | Auto-clears on next input |
| **% operator** | Broken (`eval("50%")` throws) | Correctly computes `50 → 0.5` |
| **Scientific** | None | sin, cos, tan, log, ln, √, x², xⁿ, π, e |
| **Memory** | None | MC, MR, M+, M− |
| **History** | None | localStorage panel, 50 items, timestamps |
| **Keyboard** | Partial (buggy comparison) | Full, properly typed |
| **Accessibility** | None | `aria-label`, `role`, `aria-live` |
| **Animations** | Basic hover only | Ripple, shake, slide, flip, glow |
| **Copy result** | None | Clipboard API button |
| **Score** | 12/50 | ~48/50 |

---

## 🎤 Interview Talking Points

### "Why no framework?"
> "This project deliberately uses **Vanilla JS with ES Modules** to demonstrate that clean architecture isn't about tools — it's about discipline. The same patterns (separation of concerns, single responsibility, state management) apply whether you're using React or plain JS. Using no framework also meant zero build tooling, instant load, and full control over every byte."

### "How did you handle security?"
> "The original app used `eval()`, which is a critical security hole — it executes any JavaScript string. I replaced it with a hand-written **recursive-descent parser** that only understands mathematical grammar. Even if someone inputs `alert(1)`, the parser throws a parse error because `alert` isn't a valid token in our grammar. No code ever gets executed."

### "Explain your architecture."
> "I split the app into 6 JavaScript modules by **layer of responsibility**: parser (math), calculator (state/logic), history (persistence), ui (DOM), keyboard (input), and app (wiring). Each layer only knows about its own concern — for example, `calculator.js` has zero DOM access and `ui.js` has zero math logic. This makes each piece independently testable and replaceable."

### "How does state management work?"
> "The `CalculatorEngine` class maintains a state object with fields like `expression`, `currentDisplay`, `afterEquals`, and `memory`. Every method — `appendDigit`, `appendOperator`, `calculate` — returns a fresh state snapshot. The UI module receives this snapshot and updates the DOM. This is a simplified version of the same unidirectional data flow used by Redux or Vuex."

### "How did you handle the two-line display?"
> "The display has two layers: an `expression` line (small, shows what you're building — `7 × 8`) and a `result` line (large, shows current number). I maintain two parallel strings: an internal expression using `*`, `/` for the parser, and a display expression using `×`, `÷` for readability. They're always in sync but serve different purposes."

### "What design patterns did you use?"
> - **Module Pattern** — ES modules for encapsulation
> - **Facade Pattern** — `app.js` is the facade coordinating all modules
> - **Observer-like** — state changes flow one-way: engine → ui
> - **Command Pattern** — `dispatch(action, ...args)` centralizes all operations
> - **Event Delegation** — one listener handles all button clicks via `data-action`

### "How is the CSS organized?"
> "Three files with a clear hierarchy: `base.css` defines the entire design token system as CSS custom properties (colors, spacing, transitions, typography). `calculator.css` uses those tokens for all component styles. `animations.css` contains all keyframes. Light theme works by overriding the token values in `[data-theme='light']` — zero component CSS needs to change."

### "What would you add next?"
> "Unit tests for `parser.js` and `calculator.js` using Jest (they're pure functions, perfect for testing). A service worker for offline support. A unit converter tab. Possibly migrate to a build tool like Vite to enable TypeScript types for the state objects."

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Built with ❤️ — from a 282-line single file to a professional, modular app.*
#   c a l c u l a t o r  
 