/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { parsePseudocode } from '../core/flowchart-gen';
import { Interpreter } from '../core/interpreter';
import { Task } from './types';
import { solutionText } from './render';

/**
 * Plants one mistake in a correct algorithm, so a student can be asked to find
 * it. Where `plant.ts` breaks a drawing in ways the program behind it survives,
 * every mistake here is the opposite kind: the text still parses and still
 * runs, and what gives it away is that it now prints the wrong thing.
 *
 * The answer is not stored as a line the author wrote down. A mutation is only
 * used once it has been run against the task's own test inputs and caught
 * printing something the correct solution does not — so the exercise cannot
 * claim a mistake that makes no difference, which is the one way a "find the
 * mistake" task can be unfair.
 */

export type CodeMistake =
  /** An arithmetic operator swapped — plus for minus, times for divided by. */
  | 'operator'
  /** A comparison loosened, tightened or turned around. */
  | 'poredjenje'
  /** The two sides of a subtraction or division swapped. */
  | 'zamjena'
  /** The wrong variable used in a calculation or an output. */
  | 'varijabla'
  /** A number in the algorithm changed. */
  | 'konstanta';

export const CODE_MISTAKES: CodeMistake[] = [
  'poredjenje',
  'operator',
  'zamjena',
  'varijabla',
  'konstanta',
];

export interface PlantedCode {
  /** The whole algorithm, with the one mistake in it, as the student reads it. */
  lines: string[];
  /** 1-based line the mistake sits on — the marking key. */
  line: number;
  kind: CodeMistake;
  /** That line as it should read, shown once the student has found it. */
  correct: string;
  /** That line as it now reads. */
  wrong: string;
  /** The test case that catches it, and what each version prints for it. */
  proof: { inputs: string[]; expected: string[]; got: string[] };
}

/** One candidate edit inside a single line. */
interface Edit {
  kind: CodeMistake;
  line: number;
  start: number;
  end: number;
  replacement: string;
}

/**
 * The stretches of a line that are code rather than message text. A `-` or a
 * `100` inside `"Cijena - 100 KM"` is something the student wrote to be read,
 * not arithmetic, and changing it would make a mistake nobody can reason about.
 */
function codeSpans(line: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let start = 0;
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '"') continue;
    if (!inString) {
      spans.push([start, i]);
      inString = true;
    } else {
      start = i + 1;
      inString = false;
    }
  }
  if (!inString) spans.push([start, line.length]);
  return spans;
}

/** Whether the character at `i` sits outside every string literal. */
function inCode(spans: Array<[number, number]>, i: number): boolean {
  return spans.some(([a, b]) => i >= a && i < b);
}

/**
 * Whether the operator at `i` has a value on its left, rather than being the
 * minus of a negative number. `a = -a` reads as one thing and `a = a - b` as
 * another, and only the second is an operator worth swapping.
 */
function isBinary(line: string, i: number): boolean {
  const before = line.slice(0, i).trimEnd();
  return /[\w)\]"]$/.test(before);
}

const ARITHMETIC: Record<string, string> = { '+': '-', '-': '+', '*': '/', '/': '*' };

/**
 * Longest first, so `>=` is never read as `>` with a stray `=` after it.
 *
 * The boundary comes before the reversal: `>= 50` misread as `> 50` is the
 * mistake these tasks are about, and it shows only on the boundary value the
 * author put in the tests on purpose. Turning the comparison around instead
 * would break every case and teach nothing about the edge. Reversal is the
 * fallback for a comparison whose boundary no test happens to hit.
 */
const COMPARISONS: Array<[string, string[]]> = [
  ['>=', ['>', '<']],
  ['<=', ['<', '>']],
  ['==', ['!=']],
  ['!=', ['==']],
  ['>', ['>=', '<']],
  ['<', ['<=', '>']],
];

function arithmeticEdits(lines: string[]): Edit[] {
  const out: Edit[] = [];
  lines.forEach((line, li) => {
    const spans = codeSpans(line);
    for (let i = 0; i < line.length; i++) {
      const swap = ARITHMETIC[line[i]];
      if (!swap || !inCode(spans, i) || !isBinary(line, i)) continue;
      out.push({ kind: 'operator', line: li + 1, start: i, end: i + 1, replacement: swap });
    }
  });
  return out;
}

function comparisonEdits(lines: string[]): Edit[] {
  // Every site's first choice before anyone's second, so a task with two
  // comparisons still gets the boundary mistake rather than a reversal of
  // the one that happens to come first.
  const rounds: Edit[][] = [[], []];
  lines.forEach((line, li) => {
    const spans = codeSpans(line);
    for (let i = 0; i < line.length; i++) {
      if (!inCode(spans, i)) continue;
      const hit = COMPARISONS.find(([from]) => line.startsWith(from, i));
      if (!hit) continue;
      hit[1].forEach((replacement, rank) => {
        (rounds[rank] ?? rounds[rounds.length - 1]).push({
          kind: 'poredjenje',
          line: li + 1,
          start: i,
          end: i + hit[0].length,
          replacement,
        });
      });
      i += hit[0].length - 1;
    }
  });
  return rounds.flat();
}

/** `a - b` becomes `b - a`. Only for the operations where that is not the same sum. */
const OPERAND = /(\b[A-Za-zČĆŽŠĐčćžšđ_][\w ČĆŽŠĐčćžšđ]*?|\b\d+(?:\.\d+)?)\s*([-/])\s*(\b[A-Za-zČĆŽŠĐčćžšđ_]\w*|\b\d+(?:\.\d+)?)/g;

function swapEdits(lines: string[]): Edit[] {
  const out: Edit[] = [];
  lines.forEach((line, li) => {
    const spans = codeSpans(line);
    for (const m of line.matchAll(OPERAND)) {
      const at = m.index ?? 0;
      if (!inCode(spans, at)) continue;
      const left = m[1].trim();
      // The left side is caught greedily so a keyword cannot end up inside it;
      // what is swapped is the value nearest the operator.
      const value = left.split(/\s+/).pop() ?? left;
      const start = at + m[0].indexOf(value);
      out.push({
        kind: 'zamjena',
        line: li + 1,
        start,
        end: at + m[0].length,
        replacement: `${m[3]} ${m[2]} ${value}`,
      });
    }
  });
  return out;
}

/** Every name the program gives a value to, in the order it first does so. */
function variableNames(lines: string[]): string[] {
  const names: string[] = [];
  for (const line of lines) {
    const code = codeSpans(line)
      .map(([a, b]) => line.slice(a, b))
      .join(' ');
    for (const m of code.matchAll(/\b([A-Za-zČĆŽŠĐčćžšđ_]\w*)\s*=(?!=)/g)) {
      if (!names.includes(m[1])) names.push(m[1]);
    }
    // `INPUT a, b` names two at once, and the keyword in front of them is a
    // word in whichever language the student reads.
    const head = code.trim().split(/\s+/)[0] ?? '';
    if (/^(UNESI|INPUT|EINGABE)$/i.test(head)) {
      for (const m of code.slice(head.length).matchAll(/\b[A-Za-zČĆŽŠĐčćžšđ_]\w*\b/g)) {
        if (!names.includes(m[0])) names.push(m[0]);
      }
    }
  }
  return names;
}

function variableEdits(lines: string[]): Edit[] {
  const names = variableNames(lines);
  if (names.length < 2) return [];
  const out: Edit[] = [];
  lines.forEach((line, li) => {
    const spans = codeSpans(line);
    // Left of the `=` is the name being defined; renaming that makes an
    // undefined variable rather than a wrong answer, which is a different
    // lesson and reads as a crash.
    const defines = line.search(/=(?!=)/);
    for (const m of line.matchAll(/\b[A-Za-zČĆŽŠĐčćžšđ_]\w*\b/g)) {
      const at = m.index ?? 0;
      if (!inCode(spans, at) || !names.includes(m[0])) continue;
      if (defines >= 0 && at < defines) continue;
      for (const other of names) {
        if (other === m[0]) continue;
        out.push({ kind: 'varijabla', line: li + 1, start: at, end: at + m[0].length, replacement: other });
      }
    }
  });
  return out;
}

/**
 * A number becomes a nearby wrong one: a round number loses its last digit,
 * a small one goes up by one. Both are the slip a student actually makes.
 */
function constantEdits(lines: string[]): Edit[] {
  const out: Edit[] = [];
  lines.forEach((line, li) => {
    const spans = codeSpans(line);
    for (const m of line.matchAll(/\b\d+\b/g)) {
      const at = m.index ?? 0;
      if (!inCode(spans, at)) continue;
      const n = Number(m[0]);
      const wrong = n >= 10 ? Math.floor(n / 10) : n + 1;
      out.push({
        kind: 'konstanta',
        line: li + 1,
        start: at,
        end: at + m[0].length,
        replacement: String(wrong),
      });
    }
  });
  return out;
}

/** What an algorithm prints for one set of inputs, or null if it will not run. */
function runOutput(code: string, inputs: string[], lang: Language): string[] | null {
  const { statements, errors } = parsePseudocode(code, lang);
  if (errors.length) return null;
  const machine = new Interpreter(statements);
  const result = machine.runToEnd(inputs);
  if (result.status !== 'done') return null;
  return machine.output;
}

function sameOutput(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

/** Picks the same starting rule for the same task every time. */
function rotation(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

const BUILDERS: Record<CodeMistake, (lines: string[]) => Edit[]> = {
  operator: arithmeticEdits,
  poredjenje: comparisonEdits,
  zamjena: swapEdits,
  varijabla: variableEdits,
  konstanta: constantEdits,
};

function applied(lines: string[], edit: Edit): string[] {
  const out = [...lines];
  const line = out[edit.line - 1];
  out[edit.line - 1] = line.slice(0, edit.start) + edit.replacement + line.slice(edit.end);
  return out;
}

/**
 * Breaks a correct algorithm in exactly one way, and proves the break shows.
 *
 * Rules are tried in an order the task's id decides, so a class works on one
 * version and two neighbouring tasks rarely hide the same kind of mistake.
 * Within a rule the sites are tried in order. Returns null when no single edit
 * changes what the algorithm prints for any of its test inputs — a task the
 * exercise then does not offer, rather than one it marks unfairly.
 */
export function plantCodeMistake(task: Task, lang: Language): PlantedCode | null {
  const solution = solutionText(task, lang);
  const lines = solution.split('\n');
  if (!task.tests.length) return null;

  const expected = task.tests.map((inputs) => runOutput(solution, inputs, lang));
  // A task whose own solution will not run is a bug in the bank, not something
  // to plant a mistake in.
  if (expected.some((out) => out === null)) return null;

  // The author's choice first where there is one, then the rest in an order
  // the id decides, so a topic does not hide the same kind of slip every time.
  const start = rotation(task.id) % CODE_MISTAKES.length;
  const rotated = CODE_MISTAKES.map((_, i) => CODE_MISTAKES[(start + i) % CODE_MISTAKES.length]);
  const named = CODE_MISTAKES.find((k) => k === task.codeMistake);
  const order = named ? [named, ...rotated.filter((k) => k !== named)] : rotated;

  for (const kind of order) {
    for (const edit of BUILDERS[kind](lines)) {
      const broken = applied(lines, edit);
      const text = broken.join('\n');
      if (text === solution) continue;

      for (let i = 0; i < task.tests.length; i++) {
        const got = runOutput(text, task.tests[i], lang);
        if (got === null || sameOutput(got, expected[i]!)) continue;
        return {
          lines: broken,
          line: edit.line,
          kind,
          correct: lines[edit.line - 1].trim(),
          wrong: broken[edit.line - 1].trim(),
          proof: { inputs: task.tests[i], expected: expected[i]!, got },
        };
      }
    }
  }
  return null;
}
