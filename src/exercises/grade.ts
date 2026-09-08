/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang } from '../types';
import { parsePseudocode } from '../core/flowchart-gen';
import { Interpreter, describeRunError } from '../core/interpreter';
import { indentWidth } from '../core/flowchart-gen';
import { localize, sourceLang } from '../i18n/croatian';
import { Task } from './types';
import { STEP, Tile, solutionText, tiles } from './render';

/**
 * Marks a student's attempt by running it, not by comparing it to the text of
 * the solution. A different but equivalent answer — `a + a + a + a` for
 * `4 * a`, or two independent steps swapped — is still right, and saying so is
 * most of what makes the exercise worth doing.
 */

export type GradeReason =
  /** Something is still missing — the attempt was not even run. */
  | 'nepotpuno'
  /** The pseudocode could not be read at all. */
  | 'ne-parsira'
  /** It ran but stopped with an error. */
  | 'greska-u-radu'
  /** It ran to the end and printed something else. */
  | 'ispis'
  /** It asked for more data than the task hands it. */
  | 'previse-unosa'
  /** Two test cases came out the same where they must differ, or the reverse. */
  | 'grane'
  /** A cell of the state table holds the wrong value. */
  | 'tabela'
  /** The wrong shape was picked in a diagram. */
  | 'dijagram';

export interface Mismatch {
  inputs: string[];
  expected: string[];
  got: string[];
}

export interface GradeResult {
  correct: boolean;
  reason?: GradeReason;
  /** The first test case that came out wrong, for a hint. */
  mismatch?: Mismatch;
  /** Student-facing sentence for a parse or run error. */
  message?: string;
}

function outputsFor(code: string, inputs: string[], lang: Language):
  { output?: string[]; values?: string[]; message?: string; reason?: GradeReason } {
  const { statements, errors } = parsePseudocode(code, lang);
  if (errors.length) return { reason: 'ne-parsira', message: `${errors[0].line}: ${errors[0].message}` };
  const machine = new Interpreter(statements);
  const result = machine.runToEnd(inputs);
  if (result.status === 'error' && result.error) {
    return { reason: 'greska-u-radu', message: describeRunError(result.error, lang) };
  }
  // A program written from scratch can read more variables than the task has
  // values for; it then waits forever, which is not "wrong output" but a
  // different mistake and has to be said differently.
  if (result.status === 'input') return { reason: 'previse-unosa' };
  return { output: machine.output, values: machine.printedValues };
}

/**
 * A tile as the one string an ordering is compared on. Depth is part of the
 * key, not decoration: `ISPIŠI a` inside a branch and the same line after it
 * are different programs, and a key of text alone would call them equal.
 */
function key(text: string, level: number): string {
  return `${level}|${text}`;
}

function tileKey(tile: Tile): string {
  return key(tile.text, tile.level);
}

/** The lines of a solution, without the wrapper, in the order they must run. */
function bodyLines(task: Task, lang: Language): string[] {
  return tiles(task, lang).slice(1, -1).map(tileKey);
}

/**
 * Whether an assembled order counts as correct on order alone. Steps the
 * author declared independent may appear in any order among themselves —
 * without this, a task that teaches "these two do not depend on each other"
 * would mark the swap wrong.
 */
export function orderMatches(task: Task, attempt: string[], lang: Language): boolean {
  const wanted = bodyLines(task, lang);
  const got = attempt
    .filter((l) => l.trim())
    .map((l) => key(l.trim(), Math.round(indentWidth(l) / STEP.length)))
    .slice(1, -1);
  if (got.length !== wanted.length) return false;

  // Positions are 1-based in the authored data.
  const freeWith = new Map<number, number>();
  (task.interchangeable ?? []).forEach((group, gi) => group.forEach((pos) => freeWith.set(pos - 1, gi)));

  for (let i = 0; i < wanted.length; i++) {
    if (got[i] === wanted[i]) continue;
    const group = freeWith.get(i);
    if (group === undefined) return false;
    // The line standing here must belong to the same free group, and it must
    // be one of the lines that group is made of.
    const members = (task.interchangeable ?? [])[group].map((pos) => wanted[pos - 1]);
    if (!members.includes(got[i])) return false;
  }
  return true;
}

/** Marks one attempt at a task. `code` is the whole pseudocode the student built. */
export function gradeAttempt(task: Task, code: string, lang: Language): GradeResult {
  const attemptLines = code.split('\n');
  if (orderMatches(task, attemptLines, lang)) return { correct: true };

  const solution = solutionText(task, lang);
  for (const inputs of task.tests) {
    const expected = outputsFor(solution, inputs, lang).output ?? [];
    const got = outputsFor(code, inputs, lang);
    if (got.reason) return { correct: false, reason: got.reason, message: got.message };
    const same =
      got.output!.length === expected.length && got.output!.every((line, i) => line === expected[i]);
    if (!same) {
      return {
        correct: false,
        reason: 'ispis',
        mismatch: { inputs, expected, got: got.output! },
      };
    }
  }
  return { correct: true };
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * Marks an algorithm the student wrote from nothing.
 *
 * Here the wording is theirs: nobody told them to print "Prosjek je", so the
 * text of the output cannot be the answer key. Two things can be:
 *
 * - the values the program works out and prints. The author's values have to
 *   come out at the end of the student's — anything printed before them is
 *   the student echoing the input back, which is not an error.
 * - where a task prints only words, which test cases print the same thing.
 *   A pass/fail task has no numbers to compare, but 49 and 50 must still come
 *   out different, and 50 and 100 the same.
 */
export function gradeWritten(task: Task, code: string, lang: Language): GradeResult {
  const solution = solutionText(task, lang);
  const wanted = task.tests.map((inputs) => ({ inputs, run: outputsFor(solution, inputs, lang) }));
  const byValue = wanted.some((w) => (w.run.values ?? []).length > 0);
  const mine: string[][] = [];

  for (const { inputs, run } of wanted) {
    const got = outputsFor(code, inputs, lang);
    if (got.reason) return { correct: false, reason: got.reason, message: got.message };
    mine.push(got.output!);

    const want = run.values ?? [];
    // A test whose own branch prints only words carries nothing to compare,
    // even in a task that prints values elsewhere; it still has to print.
    if (byValue && want.length) {
      if (!sameList(got.values!.slice(-want.length), want)) {
        return {
          correct: false,
          reason: 'ispis',
          mismatch: { inputs, expected: want, got: got.values! },
        };
      }
    } else {
      // No value to compare on this case. Silence is an answer of its own —
      // "the larger of two numbers" prints nothing when they are equal — so
      // what has to match is whether the program says anything at all.
      const said = (lines: string[]) => lines.join('').trim() !== '';
      if (said(run.output ?? []) !== said(got.output!)) {
        return { correct: false, reason: 'ispis', mismatch: { inputs, expected: run.output ?? [], got: got.output! } };
      }
    }
  }

  if (!byValue) {
    for (let i = 0; i < wanted.length; i++) {
      for (let j = i + 1; j < wanted.length; j++) {
        const shouldMatch = sameList(wanted[i].run.output ?? [], wanted[j].run.output ?? []);
        if (shouldMatch === sameList(mine[i], mine[j])) continue;
        return {
          correct: false,
          reason: 'grane',
          mismatch: {
            inputs: [wanted[i].inputs.join(', '), wanted[j].inputs.join(', ')],
            // The sentence needs to know which way round it went; the caller
            // has nowhere else to put it, the way 'tabela' carries its step.
            expected: [shouldMatch ? 'isto' : 'razlicito'],
            got: [],
          },
        };
      }
    }
  }

  return { correct: true };
}

/** The sentence shown under a wrong attempt. */
export function describeGrade(result: GradeResult, lang: Language): string {
  return localize(lang, describeGradeIn(result, sourceLang(lang)));
}

function describeGradeIn(result: GradeResult, lang: SourceLang): string {
  if (result.correct) {
    return lang === 'en' ? 'Correct!' : lang === 'de' ? 'Richtig!' : 'Tačno!';
  }
  // Already a finished sentence from the caller, not a run result.
  if (result.reason === 'nepotpuno' || result.reason === 'dijagram') return result.message ?? '';
  if (result.reason === 'ne-parsira') {
    const head = lang === 'en' ? 'this cannot be read as an algorithm' : lang === 'de' ? 'das lässt sich nicht als Algorithmus lesen' : 'ovo se ne može pročitati kao algoritam';
    return `${head} — ${result.message ?? ''}`;
  }
  if (result.reason === 'greska-u-radu') {
    const head = lang === 'en' ? 'it stops with an error' : lang === 'de' ? 'es bricht mit einem Fehler ab' : 'prekida se greškom';
    return `${head}: ${result.message ?? ''}`;
  }
  if (result.reason === 'previse-unosa') {
    return lang === 'en'
      ? 'it asks for more data than the task gives it'
      : lang === 'de'
      ? 'es verlangt mehr Daten, als die Aufgabe hergibt'
      : 'traži više podataka nego što mu zadatak daje';
  }
  if (result.reason === 'grane' && result.mismatch) {
    const [a, b] = result.mismatch.inputs;
    const shouldMatch = result.mismatch.expected[0] === 'isto';
    if (lang === 'en') {
      return shouldMatch
        ? `for ${a} and for ${b} it should print the same, but yours prints something different`
        : `for ${a} and for ${b} it should print something different, but yours prints the same`;
    }
    if (lang === 'de') {
      return shouldMatch
        ? `für ${a} und für ${b} muss dasselbe herauskommen, bei dir kommt Verschiedenes`
        : `für ${a} und für ${b} muss Verschiedenes herauskommen, bei dir kommt dasselbe`;
    }
    return shouldMatch
      ? `za ${a} i za ${b} treba ispisati isto, a tvoj ispisuje različito`
      : `za ${a} i za ${b} treba ispisati različito, a tvoj ispisuje isto`;
  }
  const cell = result.mismatch;
  if (result.reason === 'tabela' && cell) {
    // The caller passes the bare step number: each language puts it in its own
    // case, and "u korak 4" would be wrong in Bosnian.
    const step = cell.inputs[0] ?? '';
    const got = cell.got.join('') || '—';
    const want = cell.expected.join('');
    if (lang === 'en') return `at step ${step} you wrote ${got}, but it should be ${want}`;
    if (lang === 'de') return `bei Schritt ${step} steht ${got}, richtig wäre ${want}`;
    return `u koraku ${step} si upisao ${got}, a treba ${want}`;
  }
  const m = result.mismatch;
  if (!m) return lang === 'en' ? 'not right yet' : lang === 'de' ? 'noch nicht richtig' : 'još nije tačno';
  const inputs = m.inputs.length ? m.inputs.join(', ') : '—';
  const got = m.got.join(' / ') || '—';
  const expected = m.expected.join(' / ') || '—';
  if (lang === 'en') return `for ${inputs} yours prints ${got}, but it should print ${expected}`;
  if (lang === 'de') return `für ${inputs} gibt deiner ${got} aus, richtig wäre ${expected}`;
  return `za ${inputs} tvoj ispisuje ${got}, a treba ${expected}`;
}
