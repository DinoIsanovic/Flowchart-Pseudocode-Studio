/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, Statement } from '../types';
import { assignStepNumbers } from './flowchart-gen';
import { counterName, identifiersUsed } from './counters';
import { Env, ExprError, ExprErrorCode, Value, describeExprError, evaluateExpression, formatValue, toBoolean } from './expr';

/**
 * Runs the parsed pseudocode one statement at a time.
 *
 * The simulator, the variable table and the runtime half of the offline
 * diagnostics are all views over this: each `step()` executes exactly one
 * statement and reports what it did, so a caller can drive it from a button,
 * a timer, or a loop that runs to completion.
 *
 * Execution follows the generated Python exactly — 0-based count loops, the
 * same counter names, `until` as a negated pre-test — so a student stepping
 * through the diagram and a student running the exported file see the same
 * numbers.
 */

export type RunStatus =
  /** Nothing executed yet. */
  | 'ready'
  /** Mid-program, waiting for the next `step()`. */
  | 'running'
  /** Blocked on INPUT until `provideInput` supplies a value. */
  | 'input'
  | 'done'
  | 'error';

export type RunErrorCode = ExprErrorCode | 'too-many-steps' | 'no-target' | 'bad-target';

export interface RunError {
  code: RunErrorCode;
  token: string;
  /** 1-based pseudocode line, when the statement carried one. */
  line?: number;
  /** Step badge of the node that failed, so the canvas can mark it. */
  step?: number;
}

/** What a single `step()` did — one row of a trace table. */
export interface StepResult {
  status: RunStatus;
  /** Badge of the node this step belongs to. */
  step?: number;
  line?: number;
  /** Variable this step wrote, so the table can highlight the changed cell. */
  changed?: string;
  /** Line added to the console, if any. */
  printed?: string;
  /** Variable being read while `status` is 'input'. */
  awaiting?: string;
  error?: RunError;
}

/**
 * A program that never stops is the commonest beginner loop bug, and the tab
 * has to stay usable when it happens: at this many statements the run stops
 * and says so.
 */
const MAX_STEPS = 200_000;

interface Ctx {
  vars: Env;
  output: string[];
  stepOf: Map<Statement, number>;
  used: Set<string>;
  count: number;
  /** Statement currently executing, so a thrown error can name its line. */
  at: Statement | null;
}

/** Everything a `yield` can report; the fields mirror `StepResult`. */
interface Tick {
  step?: number;
  line?: number;
  changed?: string;
  printed?: string;
  awaiting?: string;
}

class RunSignal extends Error {
  code: RunErrorCode;
  token: string;
  constructor(code: RunErrorCode, token = '') {
    super(code);
    this.code = code;
    this.token = token;
  }
}

// --- Text helpers ----------------------------------------------------------

/**
 * Splits on commas that are not inside brackets or a string, so
 * `ISPIŠI "a, b", max(x, y)` stays two arguments rather than four.
 */
function splitArguments(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\' && i + 1 < text.length) {
        current += ch + text[++i];
        continue;
      }
      if (ch === quote) quote = '';
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out.filter((s) => s.length > 0);
}

/**
 * Splits `zbir = a + b` at the assignment. The `=` of a comparison is left
 * alone, so `RAČUNAJ veci = a > b` assigns the result of the comparison
 * instead of being read as a chain.
 */
function splitAssignment(text: string): { target: string; expr: string } | null {
  let quote = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch !== '=' || depth !== 0) continue;
    const before = text[i - 1] ?? '';
    const after = text[i + 1] ?? '';
    if (before === '<' || before === '>' || before === '!' || before === '=' || after === '=') continue;
    return { target: text.slice(0, i).trim(), expr: text.slice(i + 1).trim() };
  }
  return null;
}

const NAME = /^[A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ]*$/;

/**
 * Typed the way the generated Python types it: `int(input())` there, a number
 * here whenever the student typed one, and text otherwise so a name still
 * works in the simulator.
 */
function readValue(raw: string): Value {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
}

// --- Execution -------------------------------------------------------------

function evalIn(src: string, ctx: Ctx): Value {
  return evaluateExpression(src, ctx.vars);
}

function* runBlock(stmts: Statement[], ctx: Ctx, loopDepth: number): Generator<Tick, void, string> {
  for (const stmt of stmts) yield* runStatement(stmt, ctx, loopDepth);
}

function* runStatement(stmt: Statement, ctx: Ctx, loopDepth: number): Generator<Tick, void, string> {
  ctx.at = stmt;
  const step = ctx.stepOf.get(stmt);
  const line = stmt.line;
  const here: Tick = { step, line };

  if (++ctx.count > MAX_STEPS) throw new RunSignal('too-many-steps');

  if (stmt.type === 'action') {
    const text = (stmt.text ?? '').trim();

    if (stmt.kind === 'unesi') {
      const targets = splitArguments(text);
      if (!targets.length) throw new RunSignal('no-target');
      for (const name of targets) {
        if (!NAME.test(name)) throw new RunSignal('bad-target', name);
        // Pauses here; `provideInput` hands the typed text back in.
        const raw = yield { ...here, awaiting: name };
        ctx.vars.set(name, readValue(raw));
        ctx.at = stmt;
        yield { ...here, changed: name };
      }
      return;
    }

    if (stmt.kind === 'ispisi') {
      // Several comma-separated values print on one line separated by a
      // space, the way Python's print does it.
      const parts = splitArguments(text).map((src) => formatValue(evalIn(src, ctx)));
      const printed = parts.join(' ');
      ctx.output.push(printed);
      yield { ...here, printed };
      return;
    }

    if (stmt.kind === 'postavi' || stmt.kind === 'racunaj') {
      const split = splitAssignment(text);
      if (!split) throw new RunSignal('no-target', text);
      if (!NAME.test(split.target)) throw new RunSignal('bad-target', split.target);
      ctx.vars.set(split.target, evalIn(split.expr, ctx));
      yield { ...here, changed: split.target };
      return;
    }

    // Free text the parser could not classify. The Python generator comments
    // it out; here it passes by as a step with no effect, so the badge still
    // advances through the diagram.
    yield here;
    return;
  }

  if (stmt.type === 'if') {
    const taken = toBoolean(evalIn(stmt.cond ?? '', ctx));
    yield here;
    yield* runBlock((taken ? stmt.thenBlock : stmt.elseBlock) ?? [], ctx, loopDepth);
    return;
  }

  if (stmt.type === 'loop') {
    for (;;) {
      ctx.at = stmt;
      if (++ctx.count > MAX_STEPS) throw new RunSignal('too-many-steps');
      // The diagram draws the test at the top even for the UNTIL form and
      // only swaps the branch labels, so the condition is negated rather than
      // moved — exactly what the generated `while not (...)` does.
      const cond = toBoolean(evalIn(stmt.cond ?? '', ctx));
      const carryOn = stmt.until ? !cond : cond;
      yield here;
      if (!carryOn) return;
      yield* runBlock(stmt.body ?? [], ctx, loopDepth);
    }
  }

  if (stmt.type === 'count_loop') {
    const name = counterName(ctx.used, loopDepth);
    const times = evalIn(stmt.times ?? '0', ctx);
    if (typeof times !== 'number') throw new ExprError('type-mismatch', 0, formatValue(times));
    // 0-based, like the `range(N)` the Python generator emits.
    for (let k = 0; k < Math.trunc(times); k++) {
      ctx.at = stmt;
      if (++ctx.count > MAX_STEPS) throw new RunSignal('too-many-steps');
      ctx.vars.set(name, k);
      yield { ...here, changed: name };
      yield* runBlock(stmt.body ?? [], ctx, loopDepth + 1);
    }
    return;
  }
}

/**
 * The tick a `next()` produced, or null once the program has finished. The
 * project compiles without `strictNullChecks`, so `IteratorResult` does not
 * narrow on `done` by itself and the check has to be spelled out here.
 */
function yieldedTick(result: IteratorResult<Tick, void>): Tick | null {
  return result.done ? null : (result.value as Tick);
}

/**
 * A run in progress. Create one per run; `reset` starts over from the same
 * statements.
 */
export class Interpreter {
  private statements: Statement[];
  private ctx: Ctx;
  private gen: Generator<Tick, void, string>;
  private pending: string | null = null;
  private last: StepResult = { status: 'ready' };

  status: RunStatus = 'ready';

  constructor(statements: Statement[]) {
    this.statements = statements;
    this.ctx = this.freshCtx();
    this.gen = runBlock(this.statements, this.ctx, 0);
  }

  private freshCtx(): Ctx {
    return {
      vars: new Map<string, Value>(),
      output: [],
      stepOf: assignStepNumbers(this.statements),
      used: identifiersUsed(this.statements),
      count: 0,
      at: null,
    };
  }

  /** Variables in the order they were first written — the table's row order. */
  get vars(): Env {
    return this.ctx.vars;
  }

  /** Console lines printed so far. */
  get output(): string[] {
    return this.ctx.output;
  }

  /** Statements executed so far, for a "still running?" readout. */
  get executed(): number {
    return this.ctx.count;
  }

  reset(): void {
    this.ctx = this.freshCtx();
    this.gen = runBlock(this.statements, this.ctx, 0);
    this.pending = null;
    this.status = 'ready';
    this.last = { status: 'ready' };
  }

  /** Hands INPUT the text the student typed; the next `step()` consumes it. */
  provideInput(raw: string): void {
    if (this.status !== 'input') return;
    this.pending = raw;
  }

  /**
   * Executes one statement. While waiting for input it is a no-op, so a
   * running timer can keep ticking without losing the prompt.
   */
  step(): StepResult {
    if (this.status === 'done' || this.status === 'error') return this.last;
    if (this.status === 'input' && this.pending === null) return this.last;

    const input = this.pending ?? '';
    this.pending = null;

    try {
      const tick = yieldedTick(this.gen.next(input));
      if (!tick) {
        this.status = 'done';
        this.last = { status: 'done' };
        return this.last;
      }
      this.status = tick.awaiting ? 'input' : 'running';
      this.last = { ...tick, status: this.status };
      return this.last;
    } catch (e) {
      this.status = 'error';
      this.last = { status: 'error', error: this.toRunError(e) };
      return this.last;
    }
  }

  /**
   * Runs to the end without a UI. Stops at the first INPUT unless `inputs`
   * supplies the answers, which is what the diagnostics pass will use to try
   * a program on sample data.
   */
  runToEnd(inputs: string[] = []): StepResult {
    let next = 0;
    for (;;) {
      if (this.status === 'input') {
        if (next >= inputs.length) return this.last;
        this.provideInput(inputs[next++]);
      }
      const result = this.step();
      if (result.status === 'done' || result.status === 'error') return result;
    }
  }

  private toRunError(e: unknown): RunError {
    const where = { line: this.ctx.at?.line, step: this.ctx.at ? this.ctx.stepOf.get(this.ctx.at) : undefined };
    if (e instanceof RunSignal) return { code: e.code, token: e.token, ...where };
    if (e instanceof ExprError) return { code: e.code, token: e.token, ...where };
    throw e;
  }
}

/** The student-facing sentence for a run error, in their own language. */
export function describeRunError(err: RunError, lang: Language): string {
  if (err.code === 'too-many-steps') {
    return lang === 'en'
      ? 'the program is still running after very many steps — a loop probably never ends'
      : lang === 'de'
      ? 'das Programm läuft nach sehr vielen Schritten immer noch — vermutlich endet eine Schleife nie'
      : 'program radi i nakon vrlo mnogo koraka — vjerovatno se neka petlja nikad ne zaustavlja';
  }
  if (err.code === 'no-target') {
    return lang === 'en'
      ? 'this line does not say which variable it works on'
      : lang === 'de'
      ? 'in dieser Zeile fehlt die Variable, mit der gearbeitet wird'
      : 'u ovom redu nedostaje varijabla nad kojom se radi';
  }
  if (err.code === 'bad-target') {
    return lang === 'en'
      ? `"${err.token}" cannot be used as a variable name`
      : lang === 'de'
      ? `"${err.token}" ist als Variablenname nicht möglich`
      : `"${err.token}" ne može biti ime varijable`;
  }
  return describeExprError(new ExprError(err.code, 0, err.token), lang);
}
