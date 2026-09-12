/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { Submission, intact } from '../core/submission';
import { buildFlowchart, diagramToPseudocode, parsePseudocode } from '../core/flowchart-gen';
import { checkDiagram, describeDiagramIssue } from '../core/diagram-check';
import { Interpreter } from '../core/interpreter';
import { Task } from './types';
import { findTask } from './packs';
import { solutionText } from './render';
import { GradeResult, gradeAttempt, gradeWritten } from './grade';
import { gradeTrace, traceTask } from './trace';
import { MistakeKind, mistakeFor, plantMistake } from './plant';
import { plantCodeMistake } from './mutate';

/**
 * Marks a submission by doing the work again, never by believing it.
 *
 * Nothing a student hands in is taken as an answer key: the text carries no
 * verdict, and the task it names is re-solved here from the bank. Every kind
 * of exercise is decided the same way it was in the panel — a program is run
 * against the task's own tests, a drawing is checked as a drawing first, a
 * predicted output is compared with what the solution actually prints, and a
 * planted mistake is planted again, which lands in the same place because it
 * is seeded by the task id.
 *
 * Work done on the canvas rather than in the bank has no task to be marked
 * against; it comes back with no verdict and the teacher reads it.
 */

export interface Regraded {
  submission: Submission;
  task: Task | null;
  /** Null where there is nothing to mark it against. */
  result: GradeResult | null;
  /** Whether the text still matches its own checksum. */
  intact: boolean;
}

/** What the solution prints for each test case — the key for 'prepoznaj'. */
function expectedOutputs(task: Task, lang: Language): string[] {
  const { statements } = parsePseudocode(solutionText(task, lang), lang);
  return task.tests.map((inputs) => {
    const machine = new Interpreter(statements);
    machine.runToEnd(inputs);
    return machine.output.join(' / ');
  });
}

function gradeValues(task: Task, lang: Language, values: string[]): GradeResult {
  const expected = expectedOutputs(task, lang);
  const wrong = expected.findIndex((want, i) => (values[i] ?? '').trim() !== want);
  if (wrong < 0) return { correct: true };
  return {
    correct: false,
    reason: 'ispis',
    mismatch: {
      inputs: task.tests[wrong],
      expected: [expected[wrong]],
      got: [(values[wrong] ?? '').trim() || '—'],
    },
  };
}

function gradeTable(task: Task, lang: Language, values: string[]): GradeResult {
  const trace = traceTask(task, lang, task.tests[0] ?? []);
  const marked = gradeTrace(trace, values);
  if (marked.correct) return { correct: true };
  const row = marked.firstWrong ?? 0;
  return {
    correct: false,
    reason: 'tabela',
    mismatch: {
      inputs: [String(trace.rows[row].step ?? row + 1)],
      expected: [trace.rows[row].answer],
      got: [(values[row] ?? '').trim() || '—'],
    },
  };
}

function gradeDrawing(task: Task, lang: Language, sub: Submission): GradeResult {
  const drawn = sub.answer.diagram;
  if (!drawn?.nodes?.length) {
    return sub.answer.code
      ? gradeWritten(task, sub.answer.code, lang)
      : { correct: false, reason: 'nepotpuno' };
  }
  const issues = checkDiagram(drawn.nodes, drawn.edges);
  if (issues.length) {
    return { correct: false, reason: 'dijagram', message: describeDiagramIssue(issues[0], lang) };
  }
  return gradeWritten(task, diagramToPseudocode(drawn.nodes, drawn.edges, lang), lang);
}

function gradeCodeMistake(task: Task, lang: Language, pick: string | undefined): GradeResult {
  const broken = plantCodeMistake(task, lang);
  if (!broken || !pick) return { correct: false, reason: 'nepotpuno' };
  return Number(pick) === broken.line
    ? { correct: true }
    : { correct: false, reason: 'linija', mismatch: { inputs: [], expected: [String(broken.line)], got: [pick] } };
}

function gradeDiagramMistake(task: Task, lang: Language, pick: string | undefined): GradeResult {
  const { statements } = parsePseudocode(solutionText(task, lang), lang);
  const built = buildFlowchart(statements, lang);
  const planted = plantMistake(built.nodes, built.edges, (task.mistake as MistakeKind) ?? mistakeFor(task.id));
  if (!pick) return { correct: false, reason: 'nepotpuno' };
  return planted.answerIds.includes(pick)
    ? { correct: true }
    : { correct: false, reason: 'dijagram', mismatch: { inputs: [], expected: planted.answerIds, got: [pick] } };
}

export function regrade(sub: Submission): Regraded {
  const task = findTask(sub.task.id);
  const lang = sub.lang;
  const answer = sub.answer;
  const whole = intact(sub);

  if (!task) return { submission: sub, task: null, result: null, intact: whole };

  const values = answer.values ?? [];
  let result: GradeResult;

  switch (sub.task.type) {
    case 'nacrtaj':
      result = gradeDrawing(task, lang, sub);
      break;
    case 'prepoznaj':
      result = gradeValues(task, lang, values);
      break;
    case 'tabela':
      result = gradeTable(task, lang, values);
      break;
    case 'greska':
      result = gradeCodeMistake(task, lang, answer.pick);
      break;
    case 'dijagram-greska':
      result = gradeDiagramMistake(task, lang, answer.pick);
      break;
    case 'samostalno':
      result = answer.code ? gradeWritten(task, answer.code, lang) : { correct: false, reason: 'nepotpuno' };
      break;
    default:
      // 'kockice', 'dopuni', and anything a later version adds whose answer is
      // a whole program: run it against the task's own tests.
      result = answer.code ? gradeAttempt(task, answer.code, lang) : { correct: false, reason: 'nepotpuno' };
  }

  return { submission: sub, task, result, intact: whole };
}
