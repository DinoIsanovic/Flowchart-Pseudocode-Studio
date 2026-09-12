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

export type FormField = 'first' | 'last' | 'class' | 'group' | 'number' | 'payload' | 'pupil' | 'code';

// `pupil` is tried before `code` on purpose: a box called „Kod učenika" is the
// student's own code, and a box called „Kod zadatka" is the check code, and
// only the order tells them apart.
export const FORM_FIELDS: FormField[] = ['first', 'last', 'class', 'group', 'number', 'payload', 'pupil', 'code'];

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
