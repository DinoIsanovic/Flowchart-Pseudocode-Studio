/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normWord } from './flowchart-gen';

/**
 * The teacher's hand-in form, learnt from a prefilled link.
 *
 * A teacher makes their own form — their account, their spreadsheet, their
 * class — and the app has to find out which box holds which answer. Every form
 * service that offers a "pre-filled link" answers that question for free: the
 * teacher fills the boxes with the words below, copies the link it gives them,
 * and pastes it here once. Each box is then known by the value standing in it,
 * never by a field name, so this works with Google Forms (`entry.123456`) and
 * with anything else that prefills from a query string.
 *
 * The answer itself is put in the link only when it is short (`PREFILL_MAX`);
 * otherwise the student pastes it. Identity is prefilled either way, so a
 * class hands in without typing their names thirty times.
 */

export type FormField = 'first' | 'last' | 'class' | 'group' | 'number' | 'payload' | 'pupil' | 'code' | 'verdict' | 'title';

// `pupil` is tried before `code` on purpose: a box called „Kod učenika" is the
// student's own code, and a box called „Kod zadatka" is the check code, and
// only the order tells them apart.
export const FORM_FIELDS: FormField[] = ['first', 'last', 'class', 'group', 'number', 'payload', 'pupil', 'code', 'verdict', 'title'];

/**
 * What the teacher types into each box of their own form to mark it. Matched
 * without diacritics or case, in every language the app speaks, so nobody has
 * to remember which one the form was made in.
 */
export const FIELD_WORDS: Record<FormField, string[]> = {
  first: ['IME', 'FIRSTNAME', 'FIRST', 'VORNAME'],
  last: ['PREZIME', 'LASTNAME', 'SURNAME', 'NACHNAME'],
  class: ['ODJELJENJE', 'ODJEL', 'RAZRED', 'CLASS', 'KLASSE'],
  group: ['GRUPA', 'GROUP', 'GRUPPE'],
  number: ['BROJ', 'NUMBER', 'NUMMER'],
  payload: ['ZADATAK', 'ODGOVOR', 'TASK', 'ANSWER', 'AUFGABE', 'ANTWORT'],
  // The code the teacher gave this one student, so a name typed by somebody
  // else stands out in the column beside it. A box called simply „Kod" is this
  // one: it is the code a teacher hands out and sorts by, and the other is
  // worked out by the app and named accordingly.
  pupil: ['SIFRA', 'KOD', 'SIFRAUCENIKA', 'KODUCENIKA', 'PIN', 'LOZINKA', 'CODE', 'PUPILCODE', 'SCHUELERCODE'],
  // The check code, which the app computes over the answer. Worth a column
  // only where a teacher wants to eye it beside the work; nothing depends on
  // it being there, since the app recomputes it from the text itself.
  code: ['KODZADATKA', 'KONTROLNIKOD', 'KONTROLNI', 'TASKCODE', 'CHECKCODE', 'PRUEFCODE'],
  // Whether the app marked the answer right when it was handed in, so the
  // spreadsheet can be filtered by it. A convenience for sorting, not a mark:
  // the teacher's list still marks every submission again from the work itself.
  // „Provjera" first: it is the word a form learnt from its own page is built
  // with, and the name the user gave this column.
  verdict: ['PROVJERA', 'TACNO', 'TOCNO', 'ISPRAVNO', 'REZULTAT', 'CHECK', 'CORRECT', 'RESULT', 'PRUEFUNG', 'PRUFUNG', 'RICHTIG', 'ERGEBNIS'],
  // The task's name as a column of its own, so the sheet can be sorted by
  // task: the bank's title, or what the student called work from the canvas.
  // „Naziv zadatka" is matched whole, before „Zadatak" could claim its start.
  title: ['NAZIV', 'NAZIVZADATKA', 'NASLOV', 'TITLE', 'TASKNAME', 'TASKTITLE', 'TITEL', 'AUFGABENNAME'],
};

export interface FormLink {
  /** The form's address, without any query. */
  url: string;
  /** Which query parameter carries which field. */
  fields: Partial<Record<FormField, string>>;
  /** Parameters the form itself needs, carried through untouched. */
  extra: [string, string][];
}

export interface FormLinkResult {
  link: FormLink | null;
  /** Why nothing came of it, for the sentence the teacher reads. */
  reason?: 'no-url' | 'no-fields';
  /** Fields the link did not mark; missing ones are simply not prefilled. */
  missing: FormField[];
}

/**
 * The field a word names.
 *
 * Whole words are matched before beginnings, which is what keeps „Kod" and
 * „Kod zadatka" apart: the first is the student's own code and the second is
 * the one the app works out, and a rule that only looked at beginnings would
 * read them as the same box.
 */
export function fieldOfWord(value: string, prefixes = false): FormField | null {
  const word = normWord(value).replace(/[^A-Z0-9]/g, '');
  if (!word) return null;
  for (const field of FORM_FIELDS) {
    if (FIELD_WORDS[field].includes(word)) return field;
  }
  if (!prefixes) return null;
  for (const field of FORM_FIELDS) {
    if (FIELD_WORDS[field].some((w) => word.startsWith(w))) return field;
  }
  return null;
}

function fieldOf(value: string): FormField | null {
  return fieldOfWord(value);
}

/** Reads a prefilled link and works out which parameter is which box. */
export function parseFormLink(prefilled: string): FormLinkResult {
  let parsed: URL;
  try {
    parsed = new URL(prefilled.trim());
  } catch {
    return { link: null, reason: 'no-url', missing: FORM_FIELDS };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { link: null, reason: 'no-url', missing: FORM_FIELDS };
  }

  const fields: Partial<Record<FormField, string>> = {};
  const extra: [string, string][] = [];
  for (const [name, value] of parsed.searchParams) {
    // Google adds one of these beside a checkbox or a date; it carries no
    // answer and must go back exactly as it came.
    if (name.endsWith('_sentinel')) {
      extra.push([name, value]);
      continue;
    }
    const field = fieldOf(value);
    if (field && !fields[field]) fields[field] = name;
    else extra.push([name, value]);
  }

  const missing = FORM_FIELDS.filter((f) => !fields[f]);
  if (missing.length === FORM_FIELDS.length) return { link: null, reason: 'no-fields', missing };

  return { link: { url: `${parsed.origin}${parsed.pathname}`, fields, extra }, missing };
}

export interface FormValues {
  first?: string;
  last?: string;
  class?: string;
  group?: string;
  number?: number;
  /** The submission itself, when it is short enough to travel in the link. */
  payload?: string;
  /** The code the student was given, where the form has a box for it. */
  pupil?: string;
  /** The check code, which always fits. */
  code?: string;
  /** „tačno" or „netačno" as the app marked it; absent for unmarked work. */
  verdict?: string;
  /** The task's name, from the bank or as the student wrote it. */
  title?: string;
}

/**
 * A remembered form link, brought up to date with what its page says now.
 *
 * A form is learnt once and remembered as a link, and a teacher goes on
 * editing the form afterwards: a „Provjera" question added a week later is
 * nowhere in the link a class set up with, so it stayed empty with nothing to
 * say why. Every box the remembered link already names keeps its place — the
 * teacher marked those — and only boxes it does not know are taken from the
 * page. Returns the remembered link itself when there is nothing to add, so
 * the caller can tell an update from none.
 */
export function mergeFormLink(remembered: string, learned: string): string {
  const old = parseFormLink(remembered).link;
  const fresh = parseFormLink(learned).link;
  if (!old || !fresh || old.url !== fresh.url) return remembered;

  const taken = new Set(Object.values(old.fields));
  const added = FORM_FIELDS.filter((f) => !old.fields[f] && fresh.fields[f] && !taken.has(fresh.fields[f]!));
  if (!added.length) return remembered;

  const url = new URL(remembered.trim());
  for (const field of added) url.searchParams.append(fresh.fields[field]!, FIELD_WORDS[field][0]);
  return url.toString();
}

/** Every box this form wants, with what goes in it. */
export function submitFields(link: FormLink, values: FormValues): [string, string][] {
  const out: [string, string][] = [...link.extra];
  for (const field of FORM_FIELDS) {
    const name = link.fields[field];
    const value = values[field];
    if (!name || value === undefined || value === null || value === '') continue;
    out.push([name, String(value)]);
  }
  return out;
}

/** The address that opens the teacher's form with what is known filled in. */
export function submitUrl(link: FormLink, values: FormValues): string {
  const params = new URLSearchParams();
  for (const [name, value] of submitFields(link, values)) params.set(name, value);
  return `${link.url}?${params.toString()}`;
}

/**
 * Where this form takes its answers, for handing one in without opening it.
 *
 * Null for anything that is not a Google form: the address is the one part of
 * the arrangement that is Google's own, and guessing it for another service
 * would send a class's homework nowhere in particular.
 *
 * Note what changes when the answer is posted rather than carried in a link:
 * nothing is measured against `PREFILL_MAX` any more, because a form field is
 * not a query string. The whole submission goes, drawing and all.
 */
export function responseUrl(link: FormLink): string | null {
  return link.url.endsWith('/viewform') ? `${link.url.slice(0, -'/viewform'.length)}/formResponse` : null;
}

/** The parameter a teacher's own link carries, so a student's app sets itself up. */
export const CONFIG_PARAM = 'predaja';

/** The link the teacher hands out: the app, carrying the form inside it. */
export function configLink(appUrl: string, prefilled: string): string {
  const base = appUrl.split('?')[0].split('#')[0];
  return `${base}?${CONFIG_PARAM}=${encodeURIComponent(prefilled.trim())}`;
}

/** The prefilled form link inside an address the student opened, if any. */
export function configFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get(CONFIG_PARAM);
  return value && value.trim() ? value.trim() : null;
}
