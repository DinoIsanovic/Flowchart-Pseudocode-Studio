/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { parsePseudocode } from '../core/flowchart-gen';
import { Interpreter } from '../core/interpreter';
import { formatValue } from '../core/expr';
import { Task } from './types';
import { solutionText } from './render';

/**
 * The trace table a student fills in: one row per step that writes a variable,
 * one column per variable. The interpreter already reports which variable each
 * step wrote, so the table is a view over a run rather than a second model of
 * what the program does.
 */

export interface TraceRow {
  /** Step badge of the node this row belongs to. */
  step?: number;
  /** The pseudocode line, so the student sees which step they are on. */
  label: string;
  /** The variable this step writes — the only cell the student fills. */
  changed: string;
  /** Every variable's value after this step, for the cells already known. */
  values: Record<string, string>;
}

export interface Trace {
  /** Variables in the order they first appear — the column order. */
  columns: string[];
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
    if (!result.changed) continue;

    const values: Record<string, string> = {};
    machine.vars.forEach((value, name) => {
      values[name] = formatValue(value);
    });
    rows.push({
      step: result.step,
      label: (lines[(result.line ?? 1) - 1] ?? '').trim(),
      changed: result.changed,
      values,
    });
  }

  return { columns: [...machine.vars.keys()], rows, inputs, inputVars };
}

/** Marks the filled cells; a row is right when its changed value matches. */
export function gradeTrace(trace: Trace, answers: string[]): { correct: boolean; firstWrong?: number } {
  for (let i = 0; i < trace.rows.length; i++) {
    const want = trace.rows[i].values[trace.rows[i].changed];
    if ((answers[i] ?? '').trim() !== want) return { correct: false, firstWrong: i };
  }
  return { correct: true };
}
