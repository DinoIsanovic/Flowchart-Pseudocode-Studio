/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEdge, FlowNode, Language } from '../types';

/**
 * What a student hands in, as one line of text.
 *
 * The app never sends anything anywhere. A submission is built here, copied to
 * the clipboard and pasted into a form the teacher made and owns — or saved as
 * a file when there is no network. Nothing leaves the computer until the
 * student presses Send themselves, which is also what makes this usable in a
 * school: no account, no key, no server of ours in the middle.
 *
 * One form takes every task of every class, so the text has to say what it is:
 * which task, which kind of exercise, in which language, by whom. The teacher's
 * spreadsheet then holds one row per submission, and the app reads a pasted
 * column of them back (`parseSubmissions`) and marks them by running them.
 *
 * Keys are short because the whole thing has to fit in a form field, and the
 * answer is whatever that kind of exercise produces: a program, a drawing, the
 * values of a table, or the line a student pointed at.
 */

export const SUBMISSION_VERSION = 1;

export interface SubmissionStudent {
  first: string;
  last: string;
  /** Class or form — `7-2`, `IV-3`. */
  class?: string;
  group?: string;
  /** Number in the register, where the school keeps one. */
  number?: number;
  /**
   * The code this student was given by their teacher, and nobody else was.
   *
   * A name in a box is worth nothing on its own — anyone can type anyone's —
   * and this is what makes a wrong one show. It is a slip of paper, not a
   * password: it makes an impersonation visible rather than impossible, which
   * in a classroom is the part that matters.
   */
  code?: string;
}

export interface SubmissionTask {
  /** Task id from the bank, or null for work done on the canvas. */
  id: string | null;
  topic?: string;
  /** Which of the exercise kinds this answer came from. */
  type?: string;
  title: string;
}

export interface SubmissionAnswer {
  /** The program, for every exercise whose answer is one. */
  code?: string;
  /** The drawing, where the drawing is the answer. */
  diagram?: { nodes: FlowNode[]; edges: FlowEdge[] };
  /** Predicted output, or the cells of a state table. */
  values?: string[];
  /** The line or the shape the student pointed at. */
  pick?: string;
}

export interface Submission {
  v: number;
  /** App version that built it, so an old format can be recognised. */
  app: string;
  lang: Language;
  /** ISO, to the minute — the second says nothing and costs characters. */
  at: string;
  student: SubmissionStudent;
  task: SubmissionTask;
  answer: SubmissionAnswer;
  /** Four characters over everything above; see `checksum`. */
  sum: string;
}

/**
 * Beyond this many characters the payload is copied to the clipboard and
 * pasted by hand rather than put in the link. A form service is free to cut a
 * query value short without saying so, and a truncated answer that looks
 * submitted is the worst outcome there is.
 */
export const PREFILL_MAX = 1500;

/**
 * Beyond this, warn: a form's own answer limit is nowhere documented and long
 * answers are where it gives way. The file is the way out.
 */
export const SIZE_WARN = 4000;

/**
 * Four characters over the answer, the task and the name.
 *
 * This is not a signature and cannot be one: everything needed to recompute it
 * is in the text, so a determined student can edit both. It is there to catch
 * a paste that lost its tail — a form field that silently cut the answer, a
 * spreadsheet cell that wrapped — which is the failure that otherwise passes
 * for a wrong answer and costs a student marks they earned.
 */
export function checksum(sub: Omit<Submission, 'sum'>): string {
  const canonical = [
    sub.v,
    sub.lang,
    sub.student.first.trim(),
    sub.student.last.trim(),
    sub.student.code ?? '',
    sub.task.id ?? '',
    sub.answer.code ?? '',
    (sub.answer.values ?? []).join('\x01'),
    sub.answer.pick ?? '',
    sub.answer.diagram ? JSON.stringify(sub.answer.diagram) : '',
  ].join('\0');

  // FNV-1a, 32-bit. Short, stable across browsers, and nothing to import.
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(7, '0').slice(-4);
}

/** Whether the text still adds up to the code written into it. */
export function intact(sub: Submission): boolean {
  const { sum, ...rest } = sub;
  return checksum(rest) === sum;
}

export interface SubmissionInput {
  app: string;
  lang: Language;
  student: SubmissionStudent;
  task: SubmissionTask;
  answer: SubmissionAnswer;
  /** Overridable so a check can build the same submission twice. */
  at?: string;
}

/** Fills in the version, the time and the checksum. */
export function buildSubmission(input: SubmissionInput): Submission {
  const student: SubmissionStudent = {
    first: input.student.first.trim(),
    last: input.student.last.trim(),
  };
  if (input.student.class?.trim()) student.class = input.student.class.trim();
  if (input.student.group?.trim()) student.group = input.student.group.trim();
  if (input.student.code?.trim()) student.code = input.student.code.trim();
  if (typeof input.student.number === 'number' && !Number.isNaN(input.student.number)) {
    student.number = input.student.number;
  }

  const body: Omit<Submission, 'sum'> = {
    v: SUBMISSION_VERSION,
    app: input.app,
    lang: input.lang,
    at: input.at ?? new Date().toISOString().slice(0, 16) + 'Z',
    student,
    task: input.task,
    answer: input.answer,
  };
  return { ...body, sum: checksum(body) };
}

/** One line of text, which is what a form field and a spreadsheet cell take. */
export function submissionText(sub: Submission): string {
  return JSON.stringify(sub);
}

/**
 * A code as it counts for comparison: trimmed and in one case.
 *
 * It is written by hand, on a phone, by a twelve-year-old copying it off a
 * slip of paper — `k1`, `K1 ` and `k1 ` are the same code, and treating them
 * as three would accuse three honest students of using each other's.
 */
export function sameCode(code?: string): string {
  return (code ?? '').trim().toLocaleUpperCase();
}

/** A submission's own name for lists and file names. */
export function studentName(sub: Submission): string {
  return `${sub.student.last} ${sub.student.first}`.trim();
}

/** How many handed-in answers one device keeps a record of, newest last. */
export const SENT_REMEMBERED = 60;

/**
 * The answers this device has already handed in, newest last.
 *
 * A checksum covers the whole submission except the moment it was made, so
 * pressing Send twice on untouched work produces the same one, and a corrected
 * answer produces a different one. That is the entire difference between a
 * duplicate and an honest second attempt, and it is what lets the app hold back
 * the first without ever standing in the way of the second.
 *
 * A record kept per device and not per student: these are school computers, and
 * the point is to catch the press that repeats, not to know who is pressing.
 */
export function rememberSent(sent: string[], sum: string): string[] {
  return [...sent.filter((s) => s !== sum), sum].slice(-SENT_REMEMBERED);
}

/**
 * A name as it counts for comparison: trimmed, spaces collapsed, in one case.
 *
 * The same reason as `sameCode`, and the same hand. A student types their name
 * afresh every time they hand in, and over one morning it comes out `Horvat
 * Ivan`, `horvat ivan` and `Horvat  Ivan`. Reading those as three students
 * leaves the older attempts standing next to the newest instead of being
 * replaced by it, and the teacher marks the same work three times.
 */
export function sameName(sub: Submission): string {
  return studentName(sub).replace(/\s+/g, ' ').toLocaleLowerCase();
}

// --- Reading them back -----------------------------------------------------

function looksLikeSubmission(value: unknown): value is Submission {
  if (!value || typeof value !== 'object') return false;
  const sub = value as Submission;
  return (
    typeof sub.v === 'number' &&
    typeof sub.sum === 'string' &&
    !!sub.student &&
    typeof sub.student.first === 'string' &&
    typeof sub.student.last === 'string' &&
    !!sub.task &&
    !!sub.answer
  );
}

/**
 * A spreadsheet hands a cell over with its quotes doubled and the whole cell
 * wrapped in one more pair, so a submission copied out of one arrives as
 * `"{""v"":1,…}"`. Reading the braces of that directly cannot work — every
 * escaped quote inside the answer flips the reader in and out of a string —
 * so the cells are unwrapped first and read as themselves.
 */
function quotedCells(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '"') continue;
    const before = i === 0 ? '' : text[i - 1];
    if (i !== 0 && before !== '\t' && before !== '\n' && before !== '\r' && before !== ',' && before !== ';') continue;

    let body = '';
    let j = i + 1;
    for (; j < text.length; j++) {
      if (text[j] !== '"') {
        body += text[j];
        continue;
      }
      if (text[j + 1] === '"') {
        body += '"';
        j++;
        continue;
      }
      break;
    }
    if (j >= text.length) continue;
    out.push(body);
    i = j;
  }
  return out;
}

/** Every `{...}` in a piece of text, balanced and with strings respected. */
function jsonObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch !== '}' || depth === 0) continue;
    depth--;
    if (depth === 0) out.push(text.slice(start, i + 1));
  }
  return out;
}

/**
 * Every submission in a pasted blob, whatever shape the paste is.
 *
 * A teacher copies what is to hand: one cell, one column, several columns with
 * the form's own timestamp beside them, or the whole sheet. Rather than
 * guessing at rows and separators, this reads the text both as it stands and
 * as a table of quoted cells, and tries every `{...}` in either — so anything
 * a submission was pasted inside of is simply passed over.
 *
 * Where the same student has handed the same task in twice, the later one
 * stands and the earlier ones are counted.
 */
export function parseSubmissions(text: string): { found: Submission[]; skipped: number; superseded: number } {
  const found: Submission[] = [];
  const taken = new Set<string>();
  const broken = new Set<string>();

  for (const source of [text, ...quotedCells(text)]) {
    for (const candidate of jsonObjects(source)) {
      const parsed = tryParse(candidate);
      if (!parsed) {
        // Something that meant to be a submission and is not one is worth
        // counting; anything else in the paste is not.
        if (/"v"|""v""|"sum"|""sum""/.test(candidate)) broken.add(candidate.replace(/\s+/g, ''));
        continue;
      }
      const key = submissionText(parsed);
      if (taken.has(key)) continue;
      taken.add(key);
      found.push(parsed);
    }
  }

  return { ...newestPerTask(found), skipped: broken.size };
}

function tryParse(candidate: string): Submission | null {
  for (const text of [candidate, candidate.includes('""') ? candidate.replace(/""/g, '"') : null]) {
    if (!text) continue;
    try {
      const value = JSON.parse(text);
      if (looksLikeSubmission(value)) return value;
    } catch {
      // Not a submission, or not JSON at all: the next candidate may be.
    }
  }
  return null;
}

function newestPerTask(all: Submission[]): { found: Submission[]; superseded: number } {
  const newest = new Map<string, Submission>();
  let superseded = 0;
  for (const sub of all) {
    // The code is part of who this claims to be: two submissions carrying
    // different ones are two claims, not one student handing in twice, and a
    // borrowed name must not quietly replace the work of the name it borrowed.
    const key = [
      sameName(sub),
      sameCode(sub.student.code),
      sub.task.id ?? sub.task.title,
      sub.task.type ?? '',
    ].join('|');
    const seen = newest.get(key);
    if (!seen) {
      newest.set(key, sub);
      continue;
    }
    superseded++;
    if (sub.at >= seen.at) newest.set(key, sub);
  }
  return { found: [...newest.values()], superseded };
}
