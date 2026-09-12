/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormField, FIELD_WORDS, fieldOfWord } from './form-link';

/**
 * Reads a published Google form and works out its boxes by itself.
 *
 * A form's page carries its own structure in a script tag — every question,
 * its `entry` id, its kind and whether it is required — which is how a
 * teacher can hand over the plain address of their form instead of going back
 * into it for a pre-filled link. What comes out of here is a pre-filled link
 * all the same, built rather than copied, so everything downstream (the class
 * link, the student's app) sees exactly what it saw before.
 *
 * Only the desktop build can do this: a page on docs.google.com cannot be read
 * from another site in a browser, and this app deliberately has no server to
 * read it for us. In the browser the teacher still pastes the pre-filled link.
 */

export interface FormQuestion {
  /** `entry.123456`, the name this box answers to. */
  entry: string;
  title: string;
  /** Google's own numbering: 0 short answer, 1 paragraph, 2 choice, 9 date. */
  kind: number;
  required: boolean;
  /** Which of the app's fields this box is, when its title says. */
  field: FormField | null;
}

/** Google's kind for a long-answer box — the only one a submission fits in. */
export const PARAGRAPH = 1;

/**
 * The field a question's own title names. Matched on the start of the title so
 * `Broj u dnevniku` is the register number and `Kod zadatka` is the check code,
 * without a teacher having to name their boxes the way we would.
 */
export function fieldOfTitle(title: string): FormField | null {
  return fieldOfWord(title, true);
}

/**
 * The questions of a published form page.
 *
 * The structure is Google's and undocumented, so this reads defensively: a
 * shape it does not recognise yields no questions rather than a wrong answer,
 * and the teacher is told to paste a pre-filled link instead.
 */
export function parseFormPage(html: string): FormQuestion[] {
  // Every occurrence is tried, not just the first: the name appears more than
  // once on a page, and a mention that is not the structure would otherwise
  // stand in for it and report a form with no questions at all.
  for (const match of html.matchAll(/FB_PUBLIC_LOAD_DATA_ = (.*?);<\/script>/gs)) {
    const questions = questionsOf(match[1]);
    if (questions.length) return questions;
  }
  return [];
}

function questionsOf(source: string): FormQuestion[] {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch {
    return [];
  }

  const items = (data as any)?.[1]?.[1];
  if (!Array.isArray(items)) return [];

  const out: FormQuestion[] = [];
  for (const item of items) {
    const title = typeof item?.[1] === 'string' ? item[1].trim() : '';
    const kind = typeof item?.[3] === 'number' ? item[3] : -1;
    const boxes = item?.[4];
    if (!Array.isArray(boxes)) continue;
    for (const box of boxes) {
      const id = box?.[0];
      if (typeof id !== 'number') continue;
      out.push({
        entry: `entry.${id}`,
        title,
        kind,
        required: !!box?.[2],
        field: fieldOfTitle(title),
      });
    }
  }
  return out;
}

export interface LearnedForm {
  /** The pre-filled link this form would have given, built from its own page. */
  prefilled: string | null;
  questions: FormQuestion[];
  /** Required questions the app cannot fill — these refuse a submission. */
  blocking: FormQuestion[];
  /** The answer box is a short one, which is where a submission gets cut. */
  shortAnswerBox: boolean;
}

/**
 * What a form's page says about itself, as a pre-filled link plus the two
 * things worth warning a teacher about before a class uses it.
 */
export function learnForm(pageUrl: string, html: string): LearnedForm {
  const questions = parseFormPage(html);
  const answer = questions.find((q) => q.field === 'payload');
  const blocking = questions.filter((q) => q.required && !q.field);

  const taken = new Set<FormField>();
  const params: string[] = ['usp=pp_url'];
  for (const q of questions) {
    if (!q.field || taken.has(q.field)) continue;
    taken.add(q.field);
    params.push(`${q.entry}=${encodeURIComponent(FIELD_WORDS[q.field][0])}`);
  }

  const base = pageUrl.split('?')[0].split('#')[0];
  return {
    prefilled: taken.size ? `${base}?${params.join('&')}` : null,
    questions,
    blocking,
    shortAnswerBox: !!answer && answer.kind !== PARAGRAPH,
  };
}
