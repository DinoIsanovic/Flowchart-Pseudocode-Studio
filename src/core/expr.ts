/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { normWord } from './flowchart-gen';

/**
 * Expression evaluator for the pseudocode language.
 *
 * `parsePseudocode` classifies a line semantically but leaves its payload as
 * text: `"zbir = a + b"` and `"i <= 10"` are still strings. This module turns
 * that text into a tree and computes its value, which is what a step-by-step
 * simulator, a variable table and the offline diagnostics all need.
 *
 * It deliberately does not use `eval` or `new Function`: the desktop build
 * ships a CSP with `script-src 'self'` and no `unsafe-eval`, so either would
 * work in the browser and then fail silently once packaged.
 */

export type Value = number | string | boolean;

/** Variables in insertion order, which is the order a state table shows them. */
export type Env = Map<string, Value>;

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%' | '**'
  | '=' | '<>' | '<' | '<=' | '>' | '>='
  | 'and' | 'or';

export type Expr =
  | { kind: 'num'; value: number; pos: number }
  | { kind: 'str'; value: string; pos: number }
  | { kind: 'bool'; value: boolean; pos: number }
  | { kind: 'var'; name: string; pos: number }
  | { kind: 'unary'; op: '-' | '+' | 'not'; operand: Expr; pos: number }
  | { kind: 'binary'; op: BinaryOp; left: Expr; right: Expr; pos: number }
  | { kind: 'call'; name: string; args: Expr[]; pos: number };

export type ExprErrorCode =
  | 'empty'
  | 'bad-char'
  | 'unexpected-end'
  | 'unexpected-token'
  | 'missing-paren'
  | 'undefined-var'
  | 'unknown-function'
  | 'bad-arity'
  | 'type-mismatch'
  | 'not-boolean'
  | 'div-zero';

/**
 * Carries a code and a source offset rather than a finished sentence: the core
 * stays language-neutral and the caller renders the text in the student's
 * language with `describeExprError`.
 */
export class ExprError extends Error {
  code: ExprErrorCode;
  pos: number;
  /** The offending name or token, when the message needs to quote one. */
  token: string;

  constructor(code: ExprErrorCode, pos: number, token = '') {
    super(`${code}${token ? ` (${token})` : ''} at ${pos}`);
    this.name = 'ExprError';
    this.code = code;
    this.pos = pos;
    this.token = token;
  }
}

// --- Tokenizer -------------------------------------------------------------

type Token =
  | { type: 'num'; value: number; text: string; pos: number }
  | { type: 'str'; value: string; text: string; pos: number }
  | { type: 'ident'; text: string; pos: number }
  | { type: 'op'; text: string; pos: number }
  | { type: 'eof'; text: string; pos: number };

// Longest first, so `<=` is never read as `<` followed by `=`.
const OPERATORS = ['**', '<=', '>=', '<>', '!=', '==', '+', '-', '*', '/', '%', '^', '(', ')', ','];

// The same identifier shape the Python generator scans for, so a name that is
// legal in one place is legal in the other: letters (including the accented
// ones a student writes here), digits and underscores.
const IDENT_START = /[A-Za-z_À-ɏ]/;
const IDENT_PART = /[A-Za-z0-9_À-ɏ]/;

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const start = i;
      const quote = ch;
      let text = '';
      i++;
      while (i < src.length && src[i] !== quote) {
        // A backslash escapes the quote itself, so a student can write
        // "he said \"hi\"" without the string ending early.
        if (src[i] === '\\' && i + 1 < src.length) i++;
        text += src[i];
        i++;
      }
      if (i >= src.length) throw new ExprError('unexpected-end', start, quote);
      i++;
      out.push({ type: 'str', value: text, text: quote + text + quote, pos: start });
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const start = i;
      while (i < src.length && /[0-9]/.test(src[i])) i++;
      if (src[i] === '.' && /[0-9]/.test(src[i + 1] ?? '')) {
        i++;
        while (i < src.length && /[0-9]/.test(src[i])) i++;
      }
      const text = src.slice(start, i);
      out.push({ type: 'num', value: Number(text), text, pos: start });
      continue;
    }

    if (IDENT_START.test(ch)) {
      const start = i;
      while (i < src.length && IDENT_PART.test(src[i])) i++;
      out.push({ type: 'ident', text: src.slice(start, i), pos: start });
      continue;
    }

    const op = OPERATORS.find((o) => src.startsWith(o, i));
    if (op) {
      out.push({ type: 'op', text: op, pos: i });
      i += op.length;
      continue;
    }

    // A lone `=` is a comparison here: the pseudocode writes equality with one
    // sign, and an assignment has had its `=` split off before it reaches us.
    if (ch === '=') {
      out.push({ type: 'op', text: '=', pos: i });
      i++;
      continue;
    }
    if (ch === '<' || ch === '>') {
      out.push({ type: 'op', text: ch, pos: i });
      i++;
      continue;
    }

    throw new ExprError('bad-char', i, ch);
  }

  out.push({ type: 'eof', text: '', pos: src.length });
  return out;
}

// --- Word operators and literals -------------------------------------------

const AND_WORDS = new Set(['I', 'AND', 'UND']);
const OR_WORDS = new Set(['ILI', 'OR', 'ODER']);
const NOT_WORDS = new Set(['NE', 'NIJE', 'NOT', 'NICHT']);
const TRUE_WORDS = new Set(['TRUE', 'TACNO', 'WAHR']);
const FALSE_WORDS = new Set(['FALSE', 'NETACNO', 'FALSCH']);

/**
 * Bosnian writes logical AND as `i`, which is also the commonest loop counter
 * in the whole app. The two never collide, because position decides: a word in
 * operand position is a variable (`i <= 10`) and the same word in operator
 * position is the connective (`a > 1 i b < 2`). Nothing else is needed — the
 * parser only ever asks this question in one of the two states.
 */
function wordOperator(tok: Token): 'and' | 'or' | null {
  if (tok.type !== 'ident') return null;
  const w = normWord(tok.text);
  if (AND_WORDS.has(w)) return 'and';
  if (OR_WORDS.has(w)) return 'or';
  return null;
}

// --- Parser ----------------------------------------------------------------

interface OpInfo {
  op: BinaryOp;
  bp: number;
}

// Binding powers, loosest first. `**` is absent on purpose: it binds tighter
// than unary minus and is handled in parsePower, so `-2 ** 2` is -(2 ** 2),
// the same as in the Python we generate.
function binaryOp(tok: Token): OpInfo | null {
  const word = wordOperator(tok);
  if (word === 'or') return { op: 'or', bp: 1 };
  if (word === 'and') return { op: 'and', bp: 2 };
  if (tok.type !== 'op') return null;
  switch (tok.text) {
    case '=':
    case '==':
      return { op: '=', bp: 3 };
    case '<>':
    case '!=':
      return { op: '<>', bp: 3 };
    case '<':
      return { op: '<', bp: 3 };
    case '<=':
      return { op: '<=', bp: 3 };
    case '>':
      return { op: '>', bp: 3 };
    case '>=':
      return { op: '>=', bp: 3 };
    case '+':
      return { op: '+', bp: 4 };
    case '-':
      return { op: '-', bp: 4 };
    case '*':
      return { op: '*', bp: 5 };
    case '/':
      return { op: '/', bp: 5 };
    case '%':
      return { op: '%', bp: 5 };
    default:
      return null;
  }
}

/** Parses one expression, throwing `ExprError` on the first thing it cannot read. */
export function parseExpression(src: string): Expr {
  const tokens = tokenize(src);
  if (tokens.length === 1) throw new ExprError('empty', 0);

  let at = 0;
  const peek = (): Token => tokens[at];
  const next = (): Token => tokens[at++];

  function parseBinary(minBp: number): Expr {
    let left = parseUnary();
    for (;;) {
      const info = binaryOp(peek());
      if (!info || info.bp < minBp) return left;
      const tok = next();
      // All of these are left-associative, so the right side must bind
      // strictly tighter: `10 - 3 - 2` is 5, not 9.
      const right = parseBinary(info.bp + 1);
      left = { kind: 'binary', op: info.op, left, right, pos: tok.pos };
    }
  }

  function parseUnary(): Expr {
    const tok = peek();
    if (tok.type === 'op' && (tok.text === '-' || tok.text === '+')) {
      next();
      return { kind: 'unary', op: tok.text as '-' | '+', operand: parseUnary(), pos: tok.pos };
    }
    if (tok.type === 'ident' && NOT_WORDS.has(normWord(tok.text))) {
      next();
      return { kind: 'unary', op: 'not', operand: parseUnary(), pos: tok.pos };
    }
    return parsePower();
  }

  function parsePower(): Expr {
    const base = parsePrimary();
    const tok = peek();
    if (tok.type === 'op' && (tok.text === '**' || tok.text === '^')) {
      next();
      // Right-associative, and through parseUnary so `2 ** -1` reads.
      return { kind: 'binary', op: '**', left: base, right: parseUnary(), pos: tok.pos };
    }
    return base;
  }

  function parsePrimary(): Expr {
    const tok = next();

    if (tok.type === 'num') return { kind: 'num', value: tok.value, pos: tok.pos };
    if (tok.type === 'str') return { kind: 'str', value: tok.value, pos: tok.pos };

    if (tok.type === 'op' && tok.text === '(') {
      const inner = parseBinary(0);
      const close = next();
      if (close.type !== 'op' || close.text !== ')') throw new ExprError('missing-paren', close.pos, close.text);
      return inner;
    }

    if (tok.type === 'ident') {
      const w = normWord(tok.text);
      if (TRUE_WORDS.has(w)) return { kind: 'bool', value: true, pos: tok.pos };
      if (FALSE_WORDS.has(w)) return { kind: 'bool', value: false, pos: tok.pos };

      const after = peek();
      if (after.type === 'op' && after.text === '(') {
        next();
        const args: Expr[] = [];
        if (!(peek().type === 'op' && peek().text === ')')) {
          for (;;) {
            args.push(parseBinary(0));
            const sep = peek();
            if (sep.type === 'op' && sep.text === ',') {
              next();
              continue;
            }
            break;
          }
        }
        const close = next();
        if (close.type !== 'op' || close.text !== ')') throw new ExprError('missing-paren', close.pos, close.text);
        return { kind: 'call', name: tok.text, args, pos: tok.pos };
      }

      return { kind: 'var', name: tok.text, pos: tok.pos };
    }

    if (tok.type === 'eof') throw new ExprError('unexpected-end', tok.pos);
    throw new ExprError('unexpected-token', tok.pos, tok.text);
  }

  const expr = parseBinary(0);
  const rest = peek();
  if (rest.type !== 'eof') throw new ExprError('unexpected-token', rest.pos, rest.text);
  return expr;
}

// --- Built-in functions ----------------------------------------------------

interface Builtin {
  min: number;
  max: number;
  call: (args: Value[], pos: number) => Value;
}

function asNumber(v: Value, pos: number): number {
  if (typeof v !== 'number') throw new ExprError('type-mismatch', pos, formatValue(v));
  return v;
}

// Named after their Python equivalents, so the generated program and the
// simulator agree on what a line does.
const BUILTINS: Record<string, Builtin> = {
  abs: { min: 1, max: 1, call: (a, p) => Math.abs(asNumber(a[0], p)) },
  sqrt: { min: 1, max: 1, call: (a, p) => Math.sqrt(asNumber(a[0], p)) },
  round: {
    min: 1,
    max: 2,
    call: (a, p) => {
      const digits = a.length > 1 ? asNumber(a[1], p) : 0;
      const scale = 10 ** digits;
      return Math.round(asNumber(a[0], p) * scale) / scale;
    },
  },
  int: {
    min: 1,
    max: 1,
    call: (a, p) => {
      const v = a[0];
      // Truncates toward zero like Python's int(), rather than rounding.
      if (typeof v === 'number') return Math.trunc(v);
      if (typeof v === 'string') {
        const n = Number(v.trim());
        if (v.trim() === '' || Number.isNaN(n)) throw new ExprError('type-mismatch', p, v);
        return Math.trunc(n);
      }
      throw new ExprError('type-mismatch', p, formatValue(v));
    },
  },
  len: {
    min: 1,
    max: 1,
    call: (a, p) => {
      if (typeof a[0] !== 'string') throw new ExprError('type-mismatch', p, formatValue(a[0]));
      return a[0].length;
    },
  },
  min: { min: 1, max: Infinity, call: (a, p) => Math.min(...a.map((v) => asNumber(v, p))) },
  max: { min: 1, max: Infinity, call: (a, p) => Math.max(...a.map((v) => asNumber(v, p))) },
};

// --- Evaluation ------------------------------------------------------------

function compare(op: BinaryOp, left: Value, right: Value, pos: number): boolean {
  if (op === '=' || op === '<>') {
    // Comparing a number with a string is a mistake worth seeing as `false`
    // rather than as a crash, the way an equality test behaves everywhere else.
    const equal = left === right;
    return op === '=' ? equal : !equal;
  }
  if (typeof left !== typeof right || typeof left === 'boolean') {
    throw new ExprError('type-mismatch', pos, `${formatValue(left)} ${op} ${formatValue(right)}`);
  }
  const a = left as number | string;
  const b = right as number | string;
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    default:
      return a >= b;
  }
}

function arithmetic(op: BinaryOp, left: Value, right: Value, pos: number): Value {
  // `+` doubles as string concatenation, so `"zbir = " + zbir` reads the way a
  // student expects; every other operator is numbers only.
  if (op === '+' && (typeof left === 'string' || typeof right === 'string')) {
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      throw new ExprError('type-mismatch', pos, `${formatValue(left)} + ${formatValue(right)}`);
    }
    return formatValue(left) + formatValue(right);
  }

  const a = asNumber(left, pos);
  const b = asNumber(right, pos);
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '**':
      return a ** b;
    case '/':
      if (b === 0) throw new ExprError('div-zero', pos);
      return a / b;
    default:
      if (b === 0) throw new ExprError('div-zero', pos);
      // Follows Python's sign rule, so the simulator and the generated code
      // agree on `-7 % 3`.
      return ((a % b) + b) % b;
  }
}

/**
 * Reads a value as a condition. Deliberately strict: a number where a
 * true/false was expected is a beginner mistake the simulator should name,
 * not quietly treat as true.
 */
export function toBoolean(v: Value, pos = 0): boolean {
  if (typeof v !== 'boolean') throw new ExprError('not-boolean', pos, formatValue(v));
  return v;
}

/** Evaluates a parsed expression against the variables currently in scope. */
export function evaluate(expr: Expr, env: Env): Value {
  switch (expr.kind) {
    case 'num':
    case 'str':
    case 'bool':
      return expr.value;

    case 'var': {
      const v = env.get(expr.name);
      if (v === undefined) throw new ExprError('undefined-var', expr.pos, expr.name);
      return v;
    }

    case 'unary': {
      if (expr.op === 'not') return !toBoolean(evaluate(expr.operand, env), expr.pos);
      const n = asNumber(evaluate(expr.operand, env), expr.pos);
      return expr.op === '-' ? -n : n;
    }

    case 'binary': {
      // Short-circuit, so `b <> 0 i a / b > 1` never divides by zero.
      if (expr.op === 'and' || expr.op === 'or') {
        const left = toBoolean(evaluate(expr.left, env), expr.pos);
        if (expr.op === 'and' && !left) return false;
        if (expr.op === 'or' && left) return true;
        return toBoolean(evaluate(expr.right, env), expr.pos);
      }
      const left = evaluate(expr.left, env);
      const right = evaluate(expr.right, env);
      if (expr.op === '=' || expr.op === '<>' || expr.op === '<' || expr.op === '<=' || expr.op === '>' || expr.op === '>=') {
        return compare(expr.op, left, right, expr.pos);
      }
      return arithmetic(expr.op, left, right, expr.pos);
    }

    case 'call': {
      const fn = BUILTINS[expr.name.toLowerCase()];
      if (!fn) throw new ExprError('unknown-function', expr.pos, expr.name);
      if (expr.args.length < fn.min || expr.args.length > fn.max) {
        throw new ExprError('bad-arity', expr.pos, expr.name);
      }
      return fn.call(expr.args.map((a) => evaluate(a, env)), expr.pos);
    }
  }
}

/** Parses and evaluates in one go, for callers with no tree to keep. */
export function evaluateExpression(src: string, env: Env): Value {
  return evaluate(parseExpression(src), env);
}

/**
 * Renders a value the way the console and the variable table show it. Numbers
 * drop a trailing `.0` and booleans stay in the neutral `true`/`false` spelling
 * the generated Python uses; localisation happens in the UI.
 */
export function formatValue(v: Value): string {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    // Long binary-float tails (0.30000000000000004) are noise to a student.
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(10)));
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v;
}

/** The student-facing sentence for a thrown `ExprError`. */
export function describeExprError(err: ExprError, lang: Language): string {
  const q = err.token;
  const messages: Record<ExprErrorCode, Record<Language, string>> = {
    empty: {
      en: 'this line has no expression to evaluate',
      de: 'in dieser Zeile steht kein auswertbarer Ausdruck',
      bs: 'u ovom redu nema izraza za računanje',
    },
    'bad-char': {
      en: `"${q}" is not a character this language uses`,
      de: `"${q}" ist kein Zeichen dieser Sprache`,
      bs: `"${q}" nije znak koji ovaj jezik koristi`,
    },
    'unexpected-end': {
      en: 'the expression ends too early — something is missing at the end',
      de: 'der Ausdruck endet zu früh — am Ende fehlt etwas',
      bs: 'izraz se prekida prerano — na kraju nešto nedostaje',
    },
    'unexpected-token': {
      en: `"${q}" does not belong here`,
      de: `"${q}" gehört hier nicht hin`,
      bs: `"${q}" ne pripada ovdje`,
    },
    'missing-paren': {
      en: 'a closing bracket ")" is missing',
      de: 'eine schließende Klammer ")" fehlt',
      bs: 'nedostaje zatvorena zagrada ")"',
    },
    'undefined-var': {
      en: `"${q}" has no value yet — read it or set it before using it`,
      de: `"${q}" hat noch keinen Wert — vorher einlesen oder setzen`,
      bs: `"${q}" još nema vrijednost — prvo je unesi ili postavi`,
    },
    'unknown-function': {
      en: `there is no function called "${q}"`,
      de: `eine Funktion "${q}" gibt es nicht`,
      bs: `funkcija "${q}" ne postoji`,
    },
    'bad-arity': {
      en: `"${q}" was given the wrong number of values`,
      de: `"${q}" wurde mit der falschen Anzahl an Werten aufgerufen`,
      bs: `"${q}" je dobila pogrešan broj vrijednosti`,
    },
    'type-mismatch': {
      en: `these values cannot be combined this way: ${q}`,
      de: `diese Werte lassen sich so nicht verrechnen: ${q}`,
      bs: `ove vrijednosti se ne mogu ovako spojiti: ${q}`,
    },
    'not-boolean': {
      en: `a condition has to be true or false, but this is "${q}"`,
      de: `eine Bedingung muss wahr oder falsch sein, hier steht aber "${q}"`,
      bs: `uslov mora biti tačan ili netačan, a ovdje stoji "${q}"`,
    },
    'div-zero': {
      en: 'division by zero',
      de: 'Division durch null',
      bs: 'dijeljenje nulom',
    },
  };
  return messages[err.code][lang];
}
