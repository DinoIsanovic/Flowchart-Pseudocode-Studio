/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';
import { Task } from './types';

/**
 * Turns an authored solution into pseudocode the student can read, parse and
 * run.
 *
 * Keywords are stored as tokens rather than words so one authored task serves
 * all three languages. The spelling below matches the cheatsheet and the
 * templates the student already sees; `AUTOCOMPLETE_KEYWORDS` holds the same
 * words but keyed for display, not by concept, so the mapping lives here.
 */
const KEYWORDS: Record<string, Record<Language, string>> = {
  '@START': { bs: 'POČETAK', en: 'START', de: 'START' },
  '@END': { bs: 'KRAJ', en: 'END', de: 'ENDE' },
  '@INPUT': { bs: 'UNESI', en: 'INPUT', de: 'EINGABE' },
  '@OUTPUT': { bs: 'ISPIŠI', en: 'OUTPUT', de: 'AUSGABE' },
  '@SET': { bs: 'POSTAVI', en: 'SET', de: 'SETZE' },
  '@CALC': { bs: 'RAČUNAJ', en: 'CALCULATE', de: 'BERECHNE' },
  '@IF': { bs: 'AKO JE', en: 'IF', de: 'WENN' },
  '@YES': { bs: 'DA', en: 'YES', de: 'JA' },
  '@ELSE': { bs: 'INAČE', en: 'ELSE', de: 'SONST' },
  '@REPEAT': { bs: 'PONOVI', en: 'REPEAT', de: 'WIEDERHOLE' },
  '@TIMES': { bs: 'PUTA', en: 'TIMES', de: 'MAL' },
  '@WHILE': { bs: 'DOK JE', en: 'WHILE', de: 'SOLANGE' },
};

const TOKEN = /@[A-Z]+/g;
const BLANK = /\{\{(.*?)\}\}/g;

export interface Blank {
  /** Order of appearance, which is the order the student fills them in. */
  index: number;
  /** The correct content, for a hint — never for grading by string match. */
  answer: string;
  kind: 'izraz' | 'rijec';
  /** 1-based line of the rendered solution the blank sits on. */
  line: number;
}

/** Replaces the keyword tokens with the words of one language. */
export function renderKeywords(source: string, lang: Language): string {
  return source.replace(TOKEN, (tok) => KEYWORDS[tok]?.[lang] ?? tok);
}

/** The complete, runnable solution — blanks filled in, keywords in `lang`. */
export function solutionText(task: Task, lang: Language): string {
  const authored = task.solutionByLang?.[lang] ?? task.solution;
  return renderKeywords(authored.replace(BLANK, '$1'), lang);
}

/** The same solution with the blanks left open, for the 'dopuni' exercise. */
export function blankedText(task: Task, lang: Language, placeholder = '___'): string {
  const authored = task.solutionByLang?.[lang] ?? task.solution;
  return renderKeywords(authored.replace(BLANK, placeholder), lang);
}

/** What each blank expects, in the order the student meets them. */
export function blanks(task: Task, lang: Language): Blank[] {
  const authored = task.solutionByLang?.[lang] ?? task.solution;
  const out: Blank[] = [];
  authored.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(BLANK)) {
      const raw = m[1].trim();
      out.push({
        index: out.length,
        answer: renderKeywords(raw, lang),
        kind: raw.startsWith('@') ? 'rijec' : 'izraz',
        line: i + 1,
      });
    }
  });
  return out;
}

/**
 * The solution with the student's answers dropped into the blanks, in the
 * order the blanks appear — what the marker actually runs.
 */
export function fillBlanks(task: Task, lang: Language, values: string[]): string {
  const authored = task.solutionByLang?.[lang] ?? task.solution;
  let i = 0;
  const filled = authored.replace(BLANK, () => values[i++] ?? '');
  return renderKeywords(filled, lang);
}

/**
 * The tiles of a Parsons exercise: one per statement, in solution order.
 * Shuffling is the caller's job, so a seeded shuffle can make the same task
 * reproducible for a whole class.
 */
export function tiles(task: Task, lang: Language): string[] {
  return solutionText(task, lang)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
