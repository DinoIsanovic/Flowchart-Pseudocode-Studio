/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { translations } from '../i18n/translations';
import { parsePseudocode } from '../core/flowchart-gen';
import { Interpreter } from '../core/interpreter';
import { formatValue } from '../core/expr';
import { Task } from './types';
import { solutionText } from './render';

/**
 * The trace table a student fills in: one row per step that writes a variable
 * or decides a condition, one column per variable plus a column for the
 * condition. The interpreter already reports which variable each step wrote
 * and which way each decision went, so the table is a view over a run rather
 * than a second model of what the program does.
 *
 * A branching program without the condition column reads as a list of values
 * with the branch — the thing being taught — nowhere on the page.
 */

export interface TraceRow {
  /** Step badge of the node this row belongs to. */
  step?: number;
  /** The pseudocode line, so the student sees which step they are on. */
  label: string;
  /** The variable this step writes, or '' when the row is a decision. */
  changed: string;
  /** Which way the decision went; absent on a row that writes a variable. */
  branch?: boolean;
  /** What belongs in the one open cell of this row — the value, or DA / NE. */
  answer: string;
  /** Every variable's value after this step, for the cells already known. */
  values: Record<string, string>;
}

export interface Trace {
  /** Variables in the order they first appear — the column order. */
  columns: string[];
  /** Whether the run met a decision, so the table needs the condition column. */
  hasCondition: boolean;
  rows: TraceRow[];
  /** The inputs this run was traced with. */
  inputs: string[];
  /** Which variable each input answered, for "za a = 12, b = 5". */
  inputVars: string[];
}

/** Runs one test case and records what a trace table would show. */
export function traceTask(task: Task, lang: Language, inputs: string[]): Trace {
  const source = solutionText(task, lang);
  const lines = source.split('\n');
  const { statements } = parsePseudocode(source, lang);
  const machine = new Interpreter(statements);

  const yes = translations[lang].yesLabel.toUpperCase();
  const no = translations[lang].noLabel.toUpperCase();

  const rows: TraceRow[] = [];
  const inputVars: string[] = [];
  let next = 0;

  for (;;) {
    const result = machine.step();
    if (result.status === 'input') {
      if (result.awaiting) inputVars.push(result.awaiting);
      if (next >= inputs.length) break;
      machine.provideInput(inputs[next++]);
      continue;
    }
    if (result.status === 'done' || result.status === 'error') break;
    if (!result.changed && result.branch === undefined) continue;

    const values: Record<string, string> = {};
    machine.vars.forEach((value, name) => {
      values[name] = formatValue(value);
    });
    rows.push({
      step: result.step,
      label: (lines[(result.line ?? 1) - 1] ?? '').trim(),
      changed: result.changed ?? '',
      branch: result.branch,
      answer: result.changed ? values[result.changed] : result.branch ? yes : no,
      values,
    });
  }

  return {
    columns: [...machine.vars.keys()],
    hasCondition: rows.some((row) => row.branch !== undefined),
    rows,
    inputs,
    inputVars,
  };
}

/**
 * Marks the filled cells; a row is right when its open cell matches. A value
 * has to be written exactly, but DA / NE is a word the student says out loud
 * rather than copies, so its case is ignored.
 */
export function gradeTrace(trace: Trace, answers: string[]): { correct: boolean; firstWrong?: number } {
  for (let i = 0; i < trace.rows.length; i++) {
    const row = trace.rows[i];
    const got = (answers[i] ?? '').trim();
    const ok = row.changed ? got === row.answer : got.toLowerCase() === row.answer.toLowerCase();
    if (!ok) return { correct: false, firstWrong: i };
  }
  return { correct: true };
}
