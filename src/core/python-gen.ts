/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang, Statement } from '../types';
import { BinaryOp, Expr, parseExpression } from './expr';
import { localize, sourceLang } from '../i18n/croatian';
import { assignStepNumbers } from './flowchart-gen';
import { counterName } from './counters';

export interface PythonLine {
  /** Source text without indentation. */
  text: string;
  /** Indentation depth, four spaces per level when rendered. */
  depth: number;
  /**
   * Badge of the flowchart node this line came from. Structural lines that
   * draw no node of their own — `else:`, a `break` closing a bottom-checked
   * loop — carry no badge.
   */
  step?: number;
}

const INDENT = '    ';

/** Stands in for the loop's test when the pseudocode never wrote one. */
const MISSING_COND: Record<SourceLang, string> = {
  bs: 'TODO: uslov petlje nedostaje u pseudokodu',
  en: 'TODO: condition missing in the pseudocode',
  de: 'TODO: Bedingung fehlt im Pseudocode',
};

/**
 * Python's precedence for the operators the pseudocode has, loosest first. It
 * is the same order the expression parser uses, so an expression can be
 * printed back without its original brackets and still mean what it meant.
 */
const PY_PREC: Record<BinaryOp, number> = {
  or: 1, and: 2,
  '=': 4, '<>': 4, '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
  '**': 8,
};
const NOT_PREC = 3;
const UNARY_PREC = 7;

const PY_OP: Record<BinaryOp, string> = {
  or: 'or', and: 'and',
  '=': '==', '<>': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=',
  '+': '+', '-': '-', '*': '*', '/': '/', '%': '%', '**': '**',
};

/**
 * Writes one parsed expression as Python, bracketing a part only where Python
 * would otherwise read it differently. `min`, `max`, `abs`, `round`, `int` and
 * `len` are named after their Python equivalents already; `sqrt` is the one
 * that is not, and it becomes `** 0.5` rather than an import the diagram has
 * no block for.
 */
function emit(e: Expr, minPrec: number): string {
  const wrap = (prec: number, text: string) => (prec < minPrec ? `(${text})` : text);

  switch (e.kind) {
    case 'num':
      return String(e.value);
    case 'str':
      return JSON.stringify(e.value);
    case 'bool':
      return e.value ? 'True' : 'False';
    case 'var':
      return e.name;
    case 'unary':
      return e.op === 'not'
        ? wrap(NOT_PREC, `not ${emit(e.operand, NOT_PREC + 1)}`)
        : wrap(UNARY_PREC, `${e.op}${emit(e.operand, UNARY_PREC)}`);
    case 'call': {
      if (e.name === 'sqrt' && e.args.length === 1) {
        return wrap(PY_PREC['**'], `${emit(e.args[0], PY_PREC['**'] + 1)} ** 0.5`);
      }
      return `${e.name}(${e.args.map((a) => emit(a, 0)).join(', ')})`;
    }
    case 'binary': {
      const prec = PY_PREC[e.op];
      // `**` is the one that groups to the right; everything else to the left.
      const left = emit(e.left, e.op === '**' ? prec + 1 : prec);
      const right = emit(e.right, e.op === '**' ? prec : prec + 1);
      return wrap(prec, `${left} ${PY_OP[e.op]} ${right}`);
    }
  }
}

/**
 * Rewrites one pseudocode expression as Python. The words are what make this
 * more than a search and replace: `i` is the connective in `a > 1 i b < 2` and
 * a counter in `i <= 10`, and only a parse tells the two apart. Equality is
 * written `=` here and `==` there, `<>` is `!=`, and `NIJE`, `TAČNO` and
 * `NETAČNO` are `not`, `True` and `False`.
 *
 * Text the parser cannot read — a half-written line in the editor — is handed
 * back with the one substitution that is safe on raw text, so the Python
 * column keeps showing something while the student is still typing.
 */
export function expressionToPython(src: string): string {
  const text = (src || '').trim();
  if (!text) return text;
  try {
    return emit(parseExpression(text), 0);
  } catch {
    return text.replace(/(^|[^=!<>])=(?!=)/g, '$1==');
  }
}

/**
 * `ISPIŠI` takes a list of things to print, and a comma inside a string or a
 * call is not a separator. Reading the list as the arguments of a call is what
 * splits it correctly; text the parser cannot read prints as it stands.
 */
function printList(text: string): Expr[] {
  const list = (text || '').trim();
  if (!list) return [];
  try {
    const parsed = parseExpression(`print(${list})`);
    if (parsed.kind === 'call') return parsed.args;
  } catch {
    /* an unreadable list has no parts to name */
  }
  return [];
}

function printArgs(text: string): string {
  const list = (text || '').trim();
  if (!list) return '';
  const args = printList(list);
  return args.length ? args.map((a) => emit(a, 0)).join(', ') : list;
}

/**
 * `RAČUNAJ zbir = a + b` names what it writes to, and only the right side is
 * an expression: the `=` in front of it is Python's assignment, not equality.
 */
function assignmentToPython(text: string): string {
  const at = text.indexOf('=');
  if (at < 1) return text;
  const target = text.slice(0, at).trim();
  const value = text.slice(at + 1);
  if (!target || /[<>!=]$/.test(target)) return text;
  return `${target} = ${expressionToPython(value)}`;
}

/** `unesi a, b` names two variables and needs one input() call per name. */
function inputTargets(text: string): string[] {
  return (text || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Every name an expression reads. */
function collectVars(e: Expr, into: Set<string>): void {
  switch (e.kind) {
    case 'var':
      into.add(e.name);
      return;
    case 'unary':
      collectVars(e.operand, into);
      return;
    case 'binary':
      collectVars(e.left, into);
      collectVars(e.right, into);
      return;
    case 'call':
      e.args.forEach((a) => collectVars(a, into));
      return;
    default:
  }
}

/**
 * The same, from source. A line the parser trips over — one the student is
 * still typing — is scanned for words instead, so its names still count.
 */
function namesIn(src: string, into: Set<string>): void {
  const text = (src || '').trim();
  if (!text) return;
  try {
    collectVars(parseExpression(text), into);
  } catch {
    text
      .replace(/"[^"]*"/g, ' ')
      .replace(/'[^']*'/g, ' ')
      .split(/[^\p{L}\p{N}_]+/u)
      .forEach((w) => {
        if (w && !/^\d/.test(w)) into.add(w);
      });
  }
}

/**
 * The names the program computes with: what a condition tests, what an
 * assignment reads, how many times a count loop runs, and anything a `print`
 * works out rather than simply passes along — `ISPIŠI a + b` is arithmetic,
 * `ISPIŠI ime` is not. A name that only ever travels to the screen proves
 * nothing about what it is.
 */
function computedNames(stmts: Statement[], into = new Set<string>()): Set<string> {
  stmts.forEach((stmt) => {
    if (stmt.type === 'action') {
      const text = stmt.text ?? '';
      if (stmt.kind === 'postavi' || stmt.kind === 'racunaj') {
        const at = text.indexOf('=');
        namesIn(at < 1 ? text : text.slice(at + 1), into);
        return;
      }
      if (stmt.kind === 'ispisi') {
        printList(text).forEach((arg) => {
          if (arg.kind === 'binary' || arg.kind === 'unary' || arg.kind === 'call') collectVars(arg, into);
        });
      }
      return;
    }
    if (stmt.type === 'if') {
      namesIn(stmt.cond ?? '', into);
      computedNames(stmt.thenBlock ?? [], into);
      computedNames(stmt.elseBlock ?? [], into);
      return;
    }
    if (stmt.type === 'loop') {
      namesIn(stmt.cond ?? '', into);
      computedNames(stmt.body ?? [], into);
      return;
    }
    if (stmt.type === 'count_loop') {
      namesIn(stmt.times ?? '', into);
      computedNames(stmt.body ?? [], into);
    }
  });
  return into;
}

/**
 * How one `UNESI` line is written in Python. A name the program computes with
 * is read as a whole number, the way a school program is written; a name it
 * only prints — someone's own name, a message — is left as the text it is,
 * because `int()` would refuse it.
 *
 * The program does not say whether a number may have a decimal point: nothing
 * in `UNESI a` + `povrsina = a * b` marks `a` as 2.5 rather than 2. Where a
 * task is meant to be run with decimals, its `int` has to become `float` by
 * hand.
 */
function readCall(name: string, computed: Set<string>): string {
  return computed.has(name) ? 'int(input())' : 'input()';
}

function actionLines(stmt: Statement, depth: number, computed: Set<string>, step?: number): PythonLine[] {
  const text = (stmt.text ?? '').trim();

  if (stmt.kind === 'unesi') {
    const targets = inputTargets(text);
    if (!targets.length) return [{ text: 'value = input()', depth, step }];
    return targets.map((v) => ({ text: `${v} = ${readCall(v, computed)}`, depth, step }));
  }

  if (stmt.kind === 'ispisi') {
    return [{ text: `print(${printArgs(text)})`, depth, step }];
  }

  if (stmt.kind === 'postavi' || stmt.kind === 'racunaj') {
    return [{ text: assignmentToPython(text), depth, step }];
  }

  // A line the parser could not classify: keep it visible but inert, so the
  // generated file still runs.
  return [{ text: `# ${text}`, depth, step }];
}

function walk(
  stmts: Statement[],
  depth: number,
  stepOf: Map<Statement, number>,
  lang: Language,
  computed: Set<string>,
  loopDepth = 0
): PythonLine[] {
  const out: PythonLine[] = [];

  stmts.forEach((stmt) => {
    const step = stepOf.get(stmt);

    if (stmt.type === 'action') {
      out.push(...actionLines(stmt, depth, computed, step));
      return;
    }

    if (stmt.type === 'if') {
      out.push({ text: `if ${expressionToPython(stmt.cond ?? '')}:`, depth, step });
      const thenBlock = stmt.thenBlock ?? [];
      out.push(...(thenBlock.length ? walk(thenBlock, depth + 1, stepOf, lang, computed, loopDepth) : [{ text: 'pass', depth: depth + 1 }]));

      const elseBlock = stmt.elseBlock ?? [];
      if (!elseBlock.length) return;

      // ELSE IF parses as an else branch holding a single if, which Python
      // writes as elif rather than a nested block.
      const only = elseBlock.length === 1 ? elseBlock[0] : null;
      if (only && only.type === 'if') {
        const chained = walk(elseBlock, depth, stepOf, lang, computed, loopDepth);
        chained[0] = { ...chained[0], text: chained[0].text.replace(/^if /, 'elif ') };
        out.push(...chained);
        return;
      }

      out.push({ text: 'else:', depth });
      out.push(...walk(elseBlock, depth + 1, stepOf, lang, computed, loopDepth));
      return;
    }

    if (stmt.type === 'count_loop') {
      // The counter is named by the depth of the loop — `i`, then `j` — and
      // the pseudocode may read it: `PONOVI 3 PUTA` with `ISPIŠI i` inside is
      // the same variable here and in the simulator.
      const name = counterName(loopDepth);
      out.push({ text: `for ${name} in range(${stmt.times ?? '3'}):`, depth, step });
      const body = stmt.body ?? [];
      out.push(...(body.length
        ? walk(body, depth + 1, stepOf, lang, computed, loopDepth + 1)
        : [{ text: 'pass', depth: depth + 1 }]));
      return;
    }

    if (stmt.type === 'loop') {
      // The diagram always draws the test at the top of the loop and only
      // swaps the branch labels for the UNTIL form, so the code matches it by
      // negating the condition rather than by moving the test to the bottom.
      // A bare REPEAT with no closing WHILE/UNTIL line parses to an empty
      // condition without raising an error, which would emit `while :`.
      const cond = expressionToPython(stmt.cond ?? '');
      const header = !cond
        ? `while True:  # ${localize(lang, MISSING_COND[sourceLang(lang)])}`
        : stmt.until
        ? `while not (${cond}):`
        : `while ${cond}:`;
      out.push({ text: header, depth, step });
      const body = stmt.body ?? [];
      out.push(...(body.length
        ? walk(body, depth + 1, stepOf, lang, computed, loopDepth)
        : [{ text: 'pass', depth: depth + 1 }]));
      return;
    }
  });

  return out;
}

/**
 * Generates Python equivalent to the parsed pseudocode. Every line carries the
 * badge of the flowchart node it belongs to, so the export can print the three
 * columns side by side without relying on them lining up geometrically.
 *
 * Nothing is emitted above the program: every line answers to a block of the
 * diagram and carries its badge, so the tab in the editor, the printed sheet
 * and the drawing all start at the same step.
 */
export function statementsToPython(statements: Statement[], lang: Language = 'en'): PythonLine[] {
  const stepOf = assignStepNumbers(statements);
  const body = walk(statements, 0, stepOf, lang, computedNames(statements));
  return body.length ? body : [{ text: 'pass', depth: 0 }];
}

/** Flattens the generated lines into a Python source file. */
export function pythonSource(lines: PythonLine[]): string {
  return lines.map((l) => INDENT.repeat(l.depth) + l.text).join('\n');
}
