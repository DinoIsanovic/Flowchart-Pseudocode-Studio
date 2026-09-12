/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang, Statement } from '../types';
import { localize, sourceLang } from '../i18n/croatian';
import { editDistance, parsePseudocode } from './flowchart-gen';
import { counterName } from './counters';
import { BinaryOp, Expr, ExprError, evaluate, parseExpression, toBoolean } from './expr';
import { Interpreter, RunError, describeRunError, splitArguments, splitAssignment } from './interpreter';

/**
 * Reads a program the way a teacher looking over a shoulder would, and says
 * what is wrong with it — without a key, without an account and without the
 * network.
 *
 * This is the half of the app a class of thirty can actually use: the AI tutor
 * needs every student to paste their own API key, so it cannot be the thing
 * that answers "why doesn't my program work?". Everything here runs in the
 * browser from the pseudocode alone.
 *
 * Two passes, both over the same parsed statements:
 *
 * - **Reading it.** Names used before anything gives them a value, a name
 *   misspelt one letter away from one that exists, a value read and never
 *   used, a program that computes and never prints, a condition nothing can
 *   satisfy, a branch of a ladder no value can reach, a loop whose condition
 *   the body never touches.
 * - **Running it.** The program is run on a handful of sample inputs and what
 *   happens is reported: a run that never stops, an error that happens
 *   whatever is typed, and one that only happens for a particular value —
 *   which is usually the case the student never thought about.
 *
 * A finding carries a code and the name it quotes, not a sentence, so the
 * message can be written in the student's own language the way the parser's
 * and the simulator's messages are.
 */

export type FindingCode =
  /** The parser refused this line; its own message is carried along. */
  | 'sintaksa'
  /** An expression that cannot be read at all. */
  | 'izraz'
  /** A name is used before anything writes it. */
  | 'nedefinisana'
  /** ...and a name one letter away does exist. */
  | 'slicno-ime'
  /** A value is read in or worked out and then never used. */
  | 'neiskoristena'
  /** The program never prints anything. */
  | 'bez-ispisa'
  /** A condition with no variable in it: the same branch runs every time. */
  | 'stalan-uslov'
  /** A branch of an AKO ladder that no value can reach. */
  | 'mrtva-grana'
  /** A loop nothing inside can ever stop. */
  | 'petlja-bez-kraja'
  /** ...for one of the sample inputs. */
  | 'petlja-za-ulaz'
  /** The program stops with an error whatever is typed. */
  | 'greska-u-radu'
  /** ...only for one of the sample inputs. */
  | 'greska-za-ulaz';

/** Every code, so the Croatian guard can walk all the messages. */
export const FINDING_CODES: FindingCode[] = [
  'sintaksa',
  'izraz',
  'nedefinisana',
  'slicno-ime',
  'neiskoristena',
  'bez-ispisa',
  'stalan-uslov',
  'mrtva-grana',
  'petlja-bez-kraja',
  'petlja-za-ulaz',
  'greska-u-radu',
  'greska-za-ulaz',
];

/**
 * How much a finding is in the way. An error means the program cannot do what
 * it says; a warning means it runs but does something the student did not mean
 * to write; advice is worth reading and nothing more.
 */
export type Severity = 'greska' | 'upozorenje' | 'savjet';

export interface Finding {
  code: FindingCode;
  severity: Severity;
  /** 1-based pseudocode line, when the finding sits on one. */
  line?: number;
  /** The name, condition or input the message quotes. */
  token?: string;
  /** A second one: the spelling meant, or the branch that always runs. */
  other?: string;
  /** A sentence the parser already worded, in the student's language. */
  text?: string;
  /** The failure behind a run finding, rendered by `describeRunError`. */
  run?: RunError;
}

/** Values tried at every UNESI, one run each. */
const PROBES = ['5', '2', '0', '-3', '10'];

/**
 * Statements one probe run may execute. The interpreter's own ceiling is high
 * enough to be worth waiting for once, on purpose; a check that runs while the
 * student types has to give up far sooner. No beginner program reaches this
 * without looping forever.
 */
const BUDGET = 20_000;

// --- Reading the program ---------------------------------------------------

interface Scan {
  /** Names something has written by this point in the walk. */
  defined: Set<string>;
  /** Every name written anywhere, at the line of its first write. */
  writes: Map<string, number>;
  /** Every name read anywhere. */
  reads: Set<string>;
  /** Loop counters, which are normal to leave unused. */
  counters: Set<string>;
  /** Names read in with UNESI, as opposed to ones the program worked out. */
  inputs: Set<string>;
  /** Whether the program computes anything at all, or only reads and prints. */
  computes: boolean;
  /**
   * Whether some loop is steered by a value typed inside it. Feeding such a
   * loop the same answer for ever says nothing about whether it terminates —
   * it is the probe that never stops, not the program.
   */
  inputLoop: boolean;
  /** Names already complained about, so one typo is one finding. */
  reported: Set<string>;
  prints: boolean;
  findings: Finding[];
}

function freshScan(): Scan {
  return {
    defined: new Set(),
    writes: new Map(),
    reads: new Set(),
    counters: new Set(),
    inputs: new Set(),
    computes: false,
    inputLoop: false,
    reported: new Set(),
    prints: false,
    findings: [],
  };
}

const NAME = /^[A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ]*$/;

/** Collects the variables an expression reads; function names are not ones. */
function varsOf(expr: Expr, out: Set<string>): void {
  if (expr.kind === 'var') out.add(expr.name);
  else if (expr.kind === 'unary') varsOf(expr.operand, out);
  else if (expr.kind === 'binary') {
    varsOf(expr.left, out);
    varsOf(expr.right, out);
  } else if (expr.kind === 'call') expr.args.forEach((a) => varsOf(a, out));
}

interface Reading {
  expr: Expr | null;
  names: string[];
}

/** Reads one expression, reporting it and giving up if it cannot be parsed. */
function readExpr(src: string, line: number | undefined, s: Scan): Reading {
  let expr: Expr;
  try {
    expr = parseExpression(src);
  } catch (e) {
    if (e instanceof ExprError) {
      s.findings.push({ code: 'izraz', severity: 'greska', line, run: { code: e.code, token: e.token, line } });
      return { expr: null, names: [] };
    }
    throw e;
  }
  const names = new Set<string>();
  varsOf(expr, names);
  for (const name of names) use(name, line, s);
  return { expr, names: [...names] };
}

/** A name being read: known, or a mistake worth naming. */
function use(name: string, line: number | undefined, s: Scan): void {
  s.reads.add(name);
  if (s.defined.has(name) || s.reported.has(name)) return;
  s.reported.add(name);
  const meant = nearest(name, s.defined);
  s.findings.push(
    meant
      ? { code: 'slicno-ime', severity: 'greska', line, token: name, other: meant }
      : { code: 'nedefinisana', severity: 'greska', line, token: name }
  );
}

/** Whether two names differ only by a pair of neighbouring letters swapped. */
function isSwap(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const at: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i);
  return at.length === 2 && at[1] === at[0] + 1 && a[at[0]] === b[at[1]] && a[at[1]] === b[at[0]];
}

/**
 * A defined name a single slip away from this one — a letter missed, a
 * diacritic dropped, a capital where there was none, or two letters typed in
 * the wrong order. The last one is the commonest typo of all and counts as two
 * edits, so it is asked about separately. Two-letter names are left alone: `a`
 * and `b` are one letter apart and both mean what they say.
 */
function nearest(name: string, defined: Set<string>): string | null {
  const typed = name.toLowerCase();
  let best: string | null = null;
  for (const candidate of defined) {
    if (Math.min(candidate.length, name.length) < 3) continue;
    const other = candidate.toLowerCase();
    if (editDistance(typed, other) > 1 && !isSwap(typed, other)) continue;
    if (!best || candidate.length < best.length) best = candidate;
  }
  return best;
}

function write(name: string, line: number | undefined, s: Scan): void {
  s.defined.add(name);
  if (!s.writes.has(name)) s.writes.set(name, line ?? 0);
}

/** Every name written anywhere inside a block, however deep. */
function writtenIn(stmts: Statement[], depth: number, out: Set<string>): Set<string> {
  for (const stmt of stmts) {
    if (stmt.type === 'action') {
      const text = (stmt.text ?? '').trim();
      if (stmt.kind === 'unesi') splitArguments(text).forEach((n) => out.add(n));
      if (stmt.kind === 'postavi' || stmt.kind === 'racunaj') {
        const split = splitAssignment(text);
        if (split) out.add(split.target);
      }
      continue;
    }
    if (stmt.type === 'if') {
      writtenIn(stmt.thenBlock ?? [], depth, out);
      writtenIn(stmt.elseBlock ?? [], depth, out);
      continue;
    }
    if (stmt.type === 'loop') writtenIn(stmt.body ?? [], depth, out);
    if (stmt.type === 'count_loop') {
      out.add(counterName(depth));
      writtenIn(stmt.body ?? [], depth + 1, out);
    }
  }
  return out;
}

/** Every name a block reads in with UNESI, however deep. */
function readIn(stmts: Statement[], out: Set<string>): Set<string> {
  for (const stmt of stmts) {
    if (stmt.type === 'action') {
      if (stmt.kind === 'unesi') splitArguments((stmt.text ?? '').trim()).forEach((n) => out.add(n));
      continue;
    }
    if (stmt.type === 'if') {
      readIn(stmt.thenBlock ?? [], out);
      readIn(stmt.elseBlock ?? [], out);
      continue;
    }
    readIn(stmt.body ?? [], out);
  }
  return out;
}

function walkBlock(stmts: Statement[], s: Scan, depth: number): void {
  for (const stmt of stmts) walkStatement(stmt, s, depth);
}

function walkStatement(stmt: Statement, s: Scan, depth: number): void {
  const line = stmt.line;

  if (stmt.type === 'action') {
    const text = (stmt.text ?? '').trim();

    if (stmt.kind === 'unesi') {
      const targets = splitArguments(text);
      if (!targets.length) {
        s.findings.push({ code: 'izraz', severity: 'greska', line, run: { code: 'no-target', token: '', line } });
        return;
      }
      for (const name of targets) {
        if (!NAME.test(name)) {
          s.findings.push({ code: 'izraz', severity: 'greska', line, run: { code: 'bad-target', token: name, line } });
          continue;
        }
        s.inputs.add(name);
        write(name, line, s);
      }
      return;
    }

    if (stmt.kind === 'ispisi') {
      s.prints = true;
      for (const arg of splitArguments(text)) readExpr(arg, line, s);
      return;
    }

    if (stmt.kind === 'postavi' || stmt.kind === 'racunaj') {
      const split = splitAssignment(text);
      if (!split) {
        s.findings.push({ code: 'izraz', severity: 'greska', line, run: { code: 'no-target', token: text, line } });
        return;
      }
      if (!NAME.test(split.target)) {
        s.findings.push({ code: 'izraz', severity: 'greska', line, run: { code: 'bad-target', token: split.target, line } });
        return;
      }
      s.computes = true;
      // The value is worked out before the name is written, which is what lets
      // `zbir = zbir + 1` report the `zbir` nothing has set yet.
      readExpr(split.expr, line, s);
      write(split.target, line, s);
      return;
    }

    // Free text the parser could not classify; the Python tab comments it out
    // and there is nothing here to read either.
    return;
  }

  if (stmt.type === 'if') {
    s.computes = true;
    const read = readExpr(stmt.cond ?? '', line, s);
    if (read.expr && !read.names.length) constantCondition(stmt, read.expr, s);
    ladder(stmt, s);

    // A name written in one branch counts as written afterwards. The other
    // reading — only names written in both — is the true one and reports a
    // beginner's half-filled variable as an error it does not understand.
    const before = new Set(s.defined);
    walkBlock(stmt.thenBlock ?? [], s, depth);
    const afterThen = s.defined;
    s.defined = new Set(before);
    walkBlock(stmt.elseBlock ?? [], s, depth);
    for (const name of afterThen) s.defined.add(name);
    return;
  }

  if (stmt.type === 'loop') {
    s.computes = true;
    const read = readExpr(stmt.cond ?? '', line, s);
    const changes = writtenIn(stmt.body ?? [], depth, new Set());
    const typed = readIn(stmt.body ?? [], new Set());
    if (read.names.some((n) => typed.has(n))) s.inputLoop = true;

    if (read.expr && !read.names.length) {
      // Nothing in the condition can ever change, so it is decided here.
      const goes = constantValue(read.expr);
      const carryOn = goes === null ? null : stmt.until ? !goes : goes;
      if (carryOn === true) {
        s.findings.push({ code: 'petlja-bez-kraja', severity: 'greska', line, token: (stmt.cond ?? '').trim() });
      } else if (carryOn === false) {
        s.findings.push({ code: 'stalan-uslov', severity: 'upozorenje', line, token: (stmt.cond ?? '').trim(), other: 'nikad' });
      }
    } else if (read.names.length && !read.names.some((n) => changes.has(n))) {
      s.findings.push({
        code: 'petlja-bez-kraja',
        severity: 'greska',
        line,
        token: (stmt.cond ?? '').trim(),
        other: read.names.join(', '),
      });
    }

    walkBlock(stmt.body ?? [], s, depth);
    return;
  }

  if (stmt.type === 'count_loop') {
    s.computes = true;
    readExpr(stmt.times ?? '0', line, s);
    const name = counterName(depth);
    s.counters.add(name);
    write(name, line, s);
    walkBlock(stmt.body ?? [], s, depth + 1);
  }
}

/** An `AKO` whose condition holds no variable always goes the same way. */
function constantCondition(stmt: Statement, expr: Expr, s: Scan): void {
  const goes = constantValue(expr);
  if (goes === null) return;
  s.findings.push({
    code: 'stalan-uslov',
    severity: 'upozorenje',
    line: stmt.line,
    token: (stmt.cond ?? '').trim(),
    other: goes ? 'da' : 'ne',
  });
}

/** What a condition with no variables in it comes to, or null if it will not run. */
function constantValue(expr: Expr): boolean | null {
  try {
    return toBoolean(evaluate(expr, new Map()));
  } catch {
    return null;
  }
}

// --- Ladders ---------------------------------------------------------------

/**
 * One rung of an `AKO` / `INAČE AKO` ladder, when it is a plain comparison of
 * one variable against a number. That is the shape the grading tasks are
 * written in, and the shape whose rungs can be put in an order no value can
 * get past.
 */
interface Rung {
  name: string;
  op: BinaryOp;
  value: number;
  line?: number;
  text: string;
}

const COMPARISONS: BinaryOp[] = ['=', '<>', '<', '<=', '>', '>='];

function flip(op: BinaryOp): BinaryOp {
  return op === '<' ? '>' : op === '<=' ? '>=' : op === '>' ? '<' : op === '>=' ? '<=' : op;
}

function negate(op: BinaryOp): BinaryOp {
  return op === '<' ? '>=' : op === '<=' ? '>' : op === '>' ? '<=' : op === '>=' ? '<' : op === '=' ? '<>' : '=';
}

/** A number, with the minus sign in front of it folded in. */
function constNumber(expr: Expr): number | null {
  if (expr.kind === 'num') return expr.value;
  if (expr.kind === 'unary' && expr.operand.kind === 'num') {
    if (expr.op === '-') return -expr.operand.value;
    if (expr.op === '+') return expr.operand.value;
  }
  return null;
}

function asRung(expr: Expr, line: number | undefined, text: string): Rung | null {
  if (expr.kind !== 'binary' || !COMPARISONS.includes(expr.op)) return null;
  const right = constNumber(expr.right);
  if (expr.left.kind === 'var' && right !== null) {
    return { name: expr.left.name, op: expr.op, value: right, line, text };
  }
  const left = constNumber(expr.left);
  if (expr.right.kind === 'var' && left !== null) {
    return { name: expr.right.name, op: flip(expr.op), value: left, line, text };
  }
  return null;
}

/**
 * The values still possible for the variable a ladder tests: an interval, plus
 * the points an earlier `<>` cut out of it. Kept over the real numbers rather
 * than the whole ones — a student may well type 87.5, and a check that assumes
 * otherwise would call a live branch dead.
 */
interface Range {
  lo: number;
  loOpen: boolean;
  hi: number;
  hiOpen: boolean;
  holes: number[];
}

function wholeLine(): Range {
  return { lo: -Infinity, loOpen: true, hi: Infinity, hiOpen: true, holes: [] };
}

function restrict(r: Range, op: BinaryOp, v: number): Range {
  const out: Range = { ...r, holes: [...r.holes] };
  const lower = (value: number, open: boolean) => {
    if (value > out.lo || (value === out.lo && open && !out.loOpen)) {
      out.lo = value;
      out.loOpen = open;
    }
  };
  const upper = (value: number, open: boolean) => {
    if (value < out.hi || (value === out.hi && open && !out.hiOpen)) {
      out.hi = value;
      out.hiOpen = open;
    }
  };
  if (op === '<') upper(v, true);
  else if (op === '<=') upper(v, false);
  else if (op === '>') lower(v, true);
  else if (op === '>=') lower(v, false);
  else if (op === '=') {
    lower(v, false);
    upper(v, false);
  } else if (op === '<>') out.holes.push(v);
  return out;
}

function isEmpty(r: Range): boolean {
  if (r.lo > r.hi) return true;
  if (r.lo === r.hi) return r.loOpen || r.hiOpen || r.holes.includes(r.lo);
  return false;
}

/**
 * Reports a rung of an `AKO` ladder that nothing can reach, which is what an
 * ordering like `bodovi >= 50` before `bodovi >= 85` comes to: everything the
 * second one wants has already left by the first.
 */
function ladder(stmt: Statement, s: Scan): void {
  const rungs: Rung[] = [];
  let node: Statement | undefined = stmt;
  while (node && node.type === 'if') {
    let expr: Expr;
    try {
      expr = parseExpression(node.cond ?? '');
    } catch {
      return;
    }
    const rung = asRung(expr, node.line, (node.cond ?? '').trim());
    // One rung that is not a plain comparison, or tests another variable, and
    // the ladder says nothing this can reason about.
    if (!rung || (rungs.length && rung.name !== rungs[0].name)) return;
    rungs.push(rung);
    node = node.elseWord === 'elif' ? node.elseBlock?.[0] : undefined;
  }
  if (rungs.length < 2) return;

  let left = wholeLine();
  for (let i = 0; i < rungs.length; i++) {
    const rung = rungs[i];
    if (i > 0 && isEmpty(restrict(left, rung.op, rung.value))) {
      s.findings.push({
        code: 'mrtva-grana',
        severity: 'upozorenje',
        line: rung.line,
        token: rung.text,
        other: rungs[0].name,
      });
      return;
    }
    left = restrict(left, negate(rung.op), rung.value);
  }
}

// --- Running it ------------------------------------------------------------

interface Probe {
  value: string;
  outcome: 'done' | 'error' | 'endless';
  error?: RunError;
}

/** Runs the program once with this value answering every UNESI. */
function probe(statements: Statement[], value: string): Probe {
  const machine = new Interpreter(statements);
  let steps = 0;
  for (;;) {
    if (machine.status === 'input') machine.provideInput(value);
    const result = machine.step();
    if (result.status === 'done') return { value, outcome: 'done' };
    if (result.status === 'error') return { value, outcome: 'error', error: result.error };
    if (++steps > BUDGET) return { value, outcome: 'endless' };
  }
}

function runPass(statements: Statement[], steered: boolean): Finding[] {
  const runs = PROBES.map((v) => probe(statements, v));
  const findings: Finding[] = [];

  // A loop waiting for a particular value typed into it runs for ever on any
  // answer that is not that value, which is what a probe supplies. Nothing
  // about that is the program's fault, and the reading pass has already said
  // whatever can be said about a loop that truly cannot stop.
  const endless = steered ? [] : runs.filter((r) => r.outcome === 'endless');
  if (endless.length && endless.length === runs.length) {
    findings.push({ code: 'petlja-bez-kraja', severity: 'greska' });
  } else if (endless.length) {
    findings.push({ code: 'petlja-za-ulaz', severity: 'upozorenje', token: endless[0].value, line: endless[0].error?.line });
  }

  const failed = runs.filter((r) => r.outcome === 'error' && r.error);
  if (failed.length === runs.length) {
    const first = failed[0].error as RunError;
    findings.push({ code: 'greska-u-radu', severity: 'greska', line: first.line, run: first });
  } else if (failed.length) {
    const first = failed[0];
    findings.push({
      code: 'greska-za-ulaz',
      severity: 'upozorenje',
      line: first.error?.line,
      token: first.value,
      run: first.error,
    });
  }

  return findings;
}

// --- The pass itself -------------------------------------------------------

const ORDER: Record<Severity, number> = { greska: 0, upozorenje: 1, savjet: 2 };

/**
 * Everything worth telling the student about this program, worst first.
 *
 * A program the parser refuses is reported as nothing but those errors: the
 * statements it managed to build are a guess, and reading them would invent
 * findings that are really about the line it could not read.
 */
export function diagnose(code: string, lang: Language = 'bs'): Finding[] {
  const { statements, errors } = parsePseudocode(code, lang);

  const refused = errors.filter((e) => e.severity !== 'warning');
  if (refused.length) {
    return refused.map((e) => ({ code: 'sintaksa' as const, severity: 'greska' as const, line: e.line, text: e.message }));
  }

  const findings: Finding[] = errors.map((e) => ({
    code: 'sintaksa' as const,
    severity: 'upozorenje' as const,
    line: e.line,
    text: e.message,
  }));

  const s = freshScan();
  walkBlock(statements, s, 0);
  findings.push(...s.findings);

  for (const [name, line] of s.writes) {
    if (s.reads.has(name) || s.counters.has(name)) continue;
    // A procedure that only reads and prints — the everyday tasks the bank
    // opens with — asks for values so the student supplies them, not so the
    // program works with them. Unused is the shape of the task there.
    if (s.inputs.has(name) && !s.computes) continue;
    findings.push({ code: 'neiskoristena', severity: 'savjet', line, token: name });
  }

  if (statements.length && !s.prints) findings.push({ code: 'bez-ispisa', severity: 'upozorenje' });

  // Running a program that is already known to be broken only restates the
  // break, one line later than the reading pass found it.
  if (statements.length && !findings.some((f) => f.severity === 'greska')) {
    findings.push(...runPass(statements, s.inputLoop));
  }

  return findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || (a.line ?? 0) - (b.line ?? 0));
}

// --- What the student reads ------------------------------------------------

type Trio = Record<SourceLang, string>;

/** The sentence for a finding, and what to do about it. */
export function describeFinding(f: Finding, lang: Language): { message: string; fix: string } {
  const src = sourceLang(lang);
  const said = sentences(f, src);
  return { message: localize(lang, said.message), fix: localize(lang, said.fix) };
}

function sentences(f: Finding, lang: SourceLang): { message: string; fix: string } {
  const name = f.token ?? '';
  const run = f.run ? describeRunError(f.run, lang) : '';

  switch (f.code) {
    case 'sintaksa':
      return {
        message: f.text ?? '',
        fix: pick(lang, {
          en: 'Check this line against the keyword list above the editor.',
          de: 'Vergleiche diese Zeile mit der Schlüsselwortliste über dem Editor.',
          bs: 'Uporedi ovaj red sa spiskom ključnih riječi iznad editora.',
        }),
      };

    case 'izraz':
      return {
        message: run,
        fix: pick(lang, {
          en: 'Write the line as NAME = value, with an operator between every two values.',
          de: 'Schreibe die Zeile als NAME = Wert, mit einem Operator zwischen je zwei Werten.',
          bs: 'Napiši red kao IME = vrijednost, s operatorom između svake dvije vrijednosti.',
        }),
      };

    case 'nedefinisana':
      return {
        message: pick(lang, {
          en: `"${name}" is used here, but nothing has given it a value yet`,
          de: `"${name}" wird hier benutzt, hat aber noch keinen Wert bekommen`,
          bs: `"${name}" se ovdje koristi, a ništa mu prije toga nije dalo vrijednost`,
        }),
        fix: pick(lang, {
          en: `Read it in with INPUT ${name} or work it out with SET ${name} = ... before this line.`,
          de: `Lies sie vorher mit EINGABE ${name} ein oder berechne sie mit SETZE ${name} = ...`,
          bs: `Prije ovog reda je unesi sa UNESI ${name} ili izračunaj sa POSTAVI ${name} = ...`,
        }),
      };

    case 'slicno-ime':
      return {
        message: pick(lang, {
          en: `"${name}" has no value — was this meant to be "${f.other}"?`,
          de: `"${name}" hat keinen Wert — sollte das "${f.other}" heißen?`,
          bs: `"${name}" nema vrijednost — je li ovo trebalo biti "${f.other}"?`,
        }),
        fix: pick(lang, {
          en: `Write "${f.other}" here, or use the same spelling everywhere.`,
          de: `Schreibe hier "${f.other}" oder benutze überall dieselbe Schreibweise.`,
          bs: `Upiši ovdje "${f.other}" ili svuda koristi isto napisano ime.`,
        }),
      };

    case 'neiskoristena':
      return {
        message: pick(lang, {
          en: `"${name}" gets a value and is never used`,
          de: `"${name}" bekommt einen Wert und wird nie benutzt`,
          bs: `"${name}" dobije vrijednost i nigdje se ne koristi`,
        }),
        fix: pick(lang, {
          en: 'Either print it, work with it, or drop the line — a value nobody reads changes nothing.',
          de: 'Gib sie aus, rechne mit ihr, oder streiche die Zeile — ein ungelesener Wert ändert nichts.',
          bs: 'Ili je ispiši, ili računaj s njom, ili izbriši red — vrijednost koju niko ne čita ništa ne mijenja.',
        }),
      };

    case 'bez-ispisa':
      return {
        message: pick(lang, {
          en: 'the program never prints anything',
          de: 'das Programm gibt nie etwas aus',
          bs: 'program ništa ne ispisuje',
        }),
        fix: pick(lang, {
          en: 'An algorithm is input → work → output. Add OUTPUT for the result.',
          de: 'Ein Algorithmus ist Eingabe → Verarbeitung → Ausgabe. Ergänze AUSGABE für das Ergebnis.',
          bs: 'Algoritam je unos → obrada → ispis. Dodaj ISPIŠI za rezultat.',
        }),
      };

    case 'stalan-uslov':
      if (f.other === 'nikad') {
        return {
          message: pick(lang, {
            en: `the loop condition "${name}" is false from the start, so the body never runs`,
            de: `die Schleifenbedingung "${name}" ist von Anfang an falsch, der Rumpf läuft nie`,
            bs: `uslov petlje "${name}" je netačan od početka, pa se tijelo nikad ne izvrši`,
          }),
          fix: pick(lang, {
            en: 'Put a variable in the condition — something the body changes.',
            de: 'Nimm eine Variable in die Bedingung auf — eine, die der Rumpf ändert.',
            bs: 'Stavi varijablu u uslov — onu koju tijelo petlje mijenja.',
          }),
        };
      }
      return {
        message: pick(lang, {
          en: `the condition "${name}" holds no variable, so it always goes ${f.other === 'da' ? 'YES' : 'NO'}`,
          de: `die Bedingung "${name}" enthält keine Variable, sie geht immer auf ${f.other === 'da' ? 'JA' : 'NEIN'}`,
          bs: `uslov "${name}" nema nijednu varijablu, pa uvijek ide na ${f.other === 'da' ? 'DA' : 'NE'}`,
        }),
        fix: pick(lang, {
          en: 'A decision compares a value the program worked out; put that variable in it.',
          de: 'Eine Verzweigung vergleicht einen berechneten Wert; setze diese Variable ein.',
          bs: 'Odluka poredi vrijednost do koje je program došao; stavi tu varijablu u uslov.',
        }),
      };

    case 'mrtva-grana':
      return {
        message: pick(lang, {
          en: `no value of "${f.other}" ever reaches "${name}" — an earlier branch has taken them all`,
          de: `kein Wert von "${f.other}" erreicht je "${name}" — ein früherer Zweig hat alle abgefangen`,
          bs: `nijedna vrijednost varijable "${f.other}" ne dođe do "${name}" — ranija grana ih je sve pokupila`,
        }),
        fix: pick(lang, {
          en: 'Order the branches from the narrowest to the widest, the way grades go from 5 down to 1.',
          de: 'Ordne die Zweige vom engsten zum weitesten, wie die Noten von 1 bis 5.',
          bs: 'Poredaj grane od najuže do najšire, kako ocjene idu od 5 naniže.',
        }),
      };

    case 'petlja-bez-kraja':
      return {
        message: name && f.other
          ? pick(lang, {
              en: `nothing in the loop changes ${f.other}, so "${name}" stays true for ever`,
              de: `nichts in der Schleife ändert ${f.other}, "${name}" bleibt für immer wahr`,
              bs: `ništa u petlji ne mijenja ${f.other}, pa "${name}" zauvijek ostaje tačan`,
            })
          : name
          ? pick(lang, {
              en: `the condition "${name}" is true whatever happens, so the loop never stops`,
              de: `die Bedingung "${name}" ist immer wahr, die Schleife hält nie an`,
              bs: `uslov "${name}" je uvijek tačan, pa se petlja nikad ne zaustavi`,
            })
          : pick(lang, {
              en: 'the program does not stop for any of the sample inputs — a loop never ends',
              de: 'das Programm hält bei keiner Probeeingabe an — eine Schleife endet nie',
              bs: 'program se ne zaustavlja ni za jednu probnu vrijednost — neka petlja nikad ne završi',
            }),
        fix: pick(lang, {
          en: 'Change the value the condition tests inside the loop, so it can stop being true.',
          de: 'Ändere den getesteten Wert im Rumpf, damit die Bedingung falsch werden kann.',
          bs: 'Mijenjaj u petlji vrijednost koju uslov ispituje, da uslov jednom postane netačan.',
        }),
      };

    case 'petlja-za-ulaz':
      return {
        message: pick(lang, {
          en: `if every INPUT is answered with ${name}, the program never stops`,
          de: `wenn jede EINGABE mit ${name} beantwortet wird, hält das Programm nie an`,
          bs: `ako se na svaki UNESI upiše ${name}, program se nikad ne zaustavi`,
        }),
        fix: pick(lang, {
          en: 'Think about which typed value ends the loop, and what happens when it never comes.',
          de: 'Überlege, welche Eingabe die Schleife beendet und was passiert, wenn sie ausbleibt.',
          bs: 'Razmisli koja upisana vrijednost zaustavlja petlju i šta ako je niko ne upiše.',
        }),
      };

    case 'greska-u-radu':
      return {
        message: pick(lang, {
          en: `the program stops whatever is typed: ${run}`,
          de: `das Programm bricht bei jeder Eingabe ab: ${run}`,
          bs: `program staje šta god da se upiše: ${run}`,
        }),
        fix: pick(lang, {
          en: 'Run the simulator step by step and watch the line this names.',
          de: 'Lass den Simulator Schritt für Schritt laufen und beobachte die genannte Zeile.',
          bs: 'Pusti simulaciju korak po korak i prati red koji je ovdje naveden.',
        }),
      };

    case 'greska-za-ulaz':
      return {
        message: pick(lang, {
          en: `for the input ${name} the program stops: ${run}`,
          de: `bei der Eingabe ${name} bricht das Programm ab: ${run}`,
          bs: `za unos ${name} program staje: ${run}`,
        }),
        fix: pick(lang, {
          en: 'That value is a case of its own — decide what the algorithm should do with it.',
          de: 'Dieser Wert ist ein eigener Fall — entscheide, was der Algorithmus damit tun soll.',
          bs: 'Ta vrijednost je poseban slučaj — odluči šta algoritam treba s njom.',
        }),
      };
  }
}

function pick(lang: SourceLang, t: Trio): string {
  return t[lang];
}

/** A sample of every finding, for the guards that walk all the messages. */
export function sampleFindings(): Finding[] {
  return [
    { code: 'sintaksa', severity: 'greska', line: 2, text: 'primjer poruke parsera' },
    { code: 'izraz', severity: 'greska', line: 3, run: { code: 'no-target', token: 'zbir' } },
    { code: 'nedefinisana', severity: 'greska', line: 3, token: 'zbir' },
    { code: 'slicno-ime', severity: 'greska', line: 4, token: 'zbir', other: 'zbroj' },
    { code: 'neiskoristena', severity: 'savjet', line: 2, token: 'b' },
    { code: 'bez-ispisa', severity: 'upozorenje' },
    { code: 'stalan-uslov', severity: 'upozorenje', line: 3, token: '5 > 3', other: 'da' },
    { code: 'stalan-uslov', severity: 'upozorenje', line: 3, token: '1 > 2', other: 'nikad' },
    { code: 'mrtva-grana', severity: 'upozorenje', line: 6, token: 'bodovi >= 85', other: 'bodovi' },
    { code: 'petlja-bez-kraja', severity: 'greska', line: 3, token: 'i < 5', other: 'i' },
    { code: 'petlja-bez-kraja', severity: 'greska', line: 3, token: '1 < 2' },
    { code: 'petlja-bez-kraja', severity: 'greska' },
    { code: 'petlja-za-ulaz', severity: 'upozorenje', token: '5' },
    { code: 'greska-u-radu', severity: 'greska', line: 4, run: { code: 'div-zero', token: '' } },
    { code: 'greska-za-ulaz', severity: 'upozorenje', line: 4, token: '0', run: { code: 'div-zero', token: '' } },
  ];
}
