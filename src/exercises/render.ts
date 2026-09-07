/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang } from '../types';
import { sourceLang, toCroatian } from '../i18n/croatian';
import { indentWidth } from '../core/flowchart-gen';
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
const KEYWORDS: Record<string, Record<SourceLang, string>> = {
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
  // Word operators: a condition that joins two tests reads as words in every
  // language the parser accepts, so it belongs here rather than in the text.
  '@AND': { bs: 'I', en: 'AND', de: 'UND' },
  '@OR': { bs: 'ILI', en: 'OR', de: 'ODER' },
  '@NOT': { bs: 'NIJE', en: 'NOT', de: 'NICHT' },
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

/**
 * The authored source for one language, before keywords are rendered.
 *
 * Croatian has no solutions of its own: the Bosnian one is read through the
 * variant map, which carries the message text and the variable names together
 * — `zbir` becomes `zbroj` in the calculation and in what it prints, so the two
 * still agree.
 */
function authored(task: Task, lang: Language): string {
  const own = task.solutionByLang?.[lang];
  if (own) return own;
  return lang === 'hr' ? toCroatian(task.solution) : task.solution;
}

/** Replaces the keyword tokens with the words of one language. */
export function renderKeywords(source: string, lang: Language): string {
  const base = sourceLang(lang);
  return source.replace(TOKEN, (tok) => KEYWORDS[tok]?.[base] ?? tok);
}

/** The complete, runnable solution — blanks filled in, keywords in `lang`. */
export function solutionText(task: Task, lang: Language): string {
  const source = authored(task, lang);
  return renderKeywords(source.replace(BLANK, '$1'), lang);
}

/** The same solution with the blanks left open, for the 'dopuni' exercise. */
export function blankedText(task: Task, lang: Language, placeholder = '___'): string {
  const source = authored(task, lang);
  return renderKeywords(source.replace(BLANK, placeholder), lang);
}

/** What each blank expects, in the order the student meets them. */
export function blanks(task: Task, lang: Language): Blank[] {
  const source = authored(task, lang);
  const out: Blank[] = [];
  source.split('\n').forEach((line, i) => {
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
  const source = authored(task, lang);
  let i = 0;
  const filled = source.replace(BLANK, () => values[i++] ?? '');
  return renderKeywords(filled, lang);
}

/** One tile of a Parsons exercise. */
export interface Tile {
  /** The statement itself, with no leading spaces. */
  text: string;
  /**
   * How deep the statement sits, in levels of two spaces. In a branching task
   * this is half the answer: the same tiles at different depths are different
   * programs, so a tile that carried only its text would be unmarkable.
   */
  level: number;
  /**
   * Part of the frame the task hands over already built. A 'sidra' task fixes
   * `AKO` and its branch labels so the student places only the steps inside
   * them; everywhere else nothing is fixed and the depth is theirs to choose.
   */
  anchor: boolean;
}

/** The keywords that draw the shape of a branch rather than do any work. */
const FRAME = new Set(['@START', '@END', '@IF', '@YES', '@ELSE', '@WHILE', '@REPEAT']);

/** Two spaces per level — the indentation the authored solutions are written in. */
export const STEP = '  ';

/**
 * The tiles of a Parsons exercise: one per statement, in solution order.
 * Shuffling is the caller's job, so a seeded shuffle can make the same task
 * reproducible for a whole class.
 */
export function tiles(task: Task, lang: Language): Tile[] {
  const source = authored(task, lang).replace(BLANK, '$1');
  const framed = task.kockice === 'sidra';
  return source
    .split('\n')
    .filter((l) => l.trim())
    .map((raw) => ({
      text: renderKeywords(raw.trim(), lang),
      level: Math.round(indentWidth(raw) / STEP.length),
      // Read before the keywords are rendered: '@IF' is one token in every
      // language, 'AKO JE' / 'ELSE IF' would each need their own test.
      anchor: framed && FRAME.has(raw.trim().split(/\s+/)[0]),
    }));
}

/** A tile as one line of pseudocode, indentation included. */
export function tileLine(tile: Tile): string {
  return STEP.repeat(tile.level) + tile.text;
}
