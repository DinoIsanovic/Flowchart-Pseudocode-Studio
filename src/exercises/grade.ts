/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { parsePseudocode } from '../core/flowchart-gen';
import { Interpreter, describeRunError } from '../core/interpreter';
import { Task } from './types';
import { solutionText, tiles } from './render';

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
  | 'ispis';

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
  { output?: string[]; message?: string; reason?: GradeReason } {
  const { statements, errors } = parsePseudocode(code, lang);
  if (errors.length) return { reason: 'ne-parsira', message: `${errors[0].line}: ${errors[0].message}` };
  const machine = new Interpreter(statements);
  const result = machine.runToEnd(inputs);
  if (result.status === 'error' && result.error) {
    return { reason: 'greska-u-radu', message: describeRunError(result.error, lang) };
  }
  return { output: machine.output };
}

/** The lines of a solution, without the wrapper, in the order they must run. */
function bodyLines(task: Task, lang: Language): string[] {
  return tiles(task, lang).slice(1, -1);
}

/**
 * Whether an assembled order counts as correct on order alone. Steps the
 * author declared independent may appear in any order among themselves —
 * without this, a task that teaches "these two do not depend on each other"
 * would mark the swap wrong.
 */
export function orderMatches(task: Task, attempt: string[], lang: Language): boolean {
  const wanted = bodyLines(task, lang);
  const got = attempt.map((l) => l.trim()).filter(Boolean).slice(1, -1);
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

/** The sentence shown under a wrong attempt. */
export function describeGrade(result: GradeResult, lang: Language): string {
  if (result.correct) {
    return lang === 'en' ? 'Correct!' : lang === 'de' ? 'Richtig!' : 'Tačno!';
  }
  // Already a finished sentence from the caller, not a run result.
  if (result.reason === 'nepotpuno') return result.message ?? '';
  if (result.reason === 'ne-parsira') {
    const head = lang === 'en' ? 'this cannot be read as an algorithm' : lang === 'de' ? 'das lässt sich nicht als Algorithmus lesen' : 'ovo se ne može pročitati kao algoritam';
    return `${head} — ${result.message ?? ''}`;
  }
  if (result.reason === 'greska-u-radu') {
    const head = lang === 'en' ? 'it stops with an error' : lang === 'de' ? 'es bricht mit einem Fehler ab' : 'prekida se greškom';
    return `${head}: ${result.message ?? ''}`;
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
