/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';

/**
 * Shape of one exercise task.
 *
 * The author writes a correct solution and a few test inputs; the app derives
 * the exercise types from it. Nothing here stores an answer key — the key is
 * whatever the solution does when it runs, which is why a student's different
 * but equivalent answer can be accepted.
 */

export type TaskKind = 'svakodnevni' | 'racunski';

export type ExerciseType =
  /** Predict the output for given inputs. */
  | 'prepoznaj'
  /** Assemble the program from shuffled tiles. */
  | 'kockice'
  /** Fill the blanks marked in the solution. */
  | 'dopuni'
  /** Find the planted mistake. */
  | 'greska'
  /** Complete the state table. */
  | 'tabela'
  /** Write it from scratch. */
  | 'samostalno';

/** Text the student reads. `bs` is required; the rest fall back to it. */
export type Text = { bs: string } & Partial<Record<Language, string>>;

export interface Task {
  id: string;
  /** Topic this belongs to — 'linijska', later 'grananje', 'petlje'. */
  topic: string;
  kind: TaskKind;
  /** Position within the topic, ascending. */
  level: number;
  title: Text;
  prompt: Text;
  /**
   * The solution, with keywords written as tokens (`@INPUT`) so each student
   * reads them in their own language. Parts hidden by the 'dopuni' exercise
   * are wrapped in `{{ }}` — a blank holding a token is a keyword blank, one
   * holding anything else is an expression blank.
   */
  solution: string;
  /** A full translation, when the message text has been translated too. */
  solutionByLang?: Partial<Record<Language, string>>;
  /** One list of INPUT answers per test case. */
  tests: string[][];
  /**
   * Groups of statements whose order does not matter, as 1-based positions
   * between START and END. Without this a task that teaches "these two steps
   * are independent" would mark the swap wrong.
   */
  interchangeable?: number[][];
  /** Wrong tiles offered alongside the real ones, from the middle level up. */
  distractors?: string[];
  /** A fact the student may need but is not expected to know by heart. */
  hint?: Text;
  /** A question for the class; nothing here is machine-graded. */
  discussion?: Text;
  types: ExerciseType[];
  /** Everyday procedures show no Python; code would only be noise there. */
  showPython?: boolean;
}

export interface TaskPack {
  topic: string;
  title: Text;
  tasks: Task[];
}

/** The student-facing text, falling back to Bosnian while a translation is missing. */
export function text(t: Text, lang: Language): string {
  return t[lang] ?? t.bs;
}
