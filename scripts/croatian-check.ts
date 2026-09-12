/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Guards the Croatian variant: `npm run check:croatian`.
 *
 * Croatian has no strings of its own — it is the Bosnian text read through a
 * map of the words the two languages spell differently. That only stays true
 * while the map keeps up. This walks everything a student can read, converts
 * it, and fails on any Bosnian form that survived, naming it so it can be
 * added to the map.
 */

import { Language, SourceLang } from '../src/types';
import { BOSNIAN_ONLY, toCroatian } from '../src/i18n/croatian';
import { translations } from '../src/i18n/translations';
import { AUTOCOMPLETE_KEYWORDS, TEMPLATE_CODE, TUTOR_PROMPTS } from '../src/i18n/keywords';
import { TaskPack, text } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { describeFinding, sampleFindings } from '../src/core/diagnose';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';

let problems = 0;
const changed = new Map<string, string>();

/** Every Bosnian form left standing in a string that is supposed to be Croatian. */
function check(where: string, croatian: string) {
  for (const pattern of BOSNIAN_ONLY) {
    for (const hit of croatian.matchAll(pattern)) {
      problems++;
      console.log(`  ✗ ${where}: "${hit[0]}" nije prevedeno — dodaj oblik u WORDS`);
    }
  }
}

/** Records what the map actually did, so the word list can be reviewed. */
function note(bs: string) {
  const hr = toCroatian(bs);
  if (hr === bs) return;
  const a = bs.split(/(\P{L}+)/u);
  const b = hr.split(/(\P{L}+)/u);
  a.forEach((w, i) => {
    if (b[i] && b[i] !== w) changed.set(w, b[i]);
  });
}

function walk(where: string, value: unknown) {
  if (typeof value === 'string') {
    note(value);
    check(where, toCroatian(value));
    return;
  }
  if (Array.isArray(value)) return value.forEach((v, i) => walk(`${where}[${i}]`, v));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(`${where}.${k}`, v);
  }
}

// --- the interface -----------------------------------------------------------
walk('translations', translations.bs);
walk('keywords', AUTOCOMPLETE_KEYWORDS.bs);
walk('templates', TEMPLATE_CODE.bs);
walk('tutor', TUTOR_PROMPTS.bs);

// The Croatian tables must actually differ from the Bosnian ones where the map
// says they should, or the wiring is not reaching them. Compared as values:
// the keys are identifiers — an exercise type is called `tabela` in every
// language — and reading them as prose would flag a word that is not one.
for (const [name, hr, bs] of [
  ['translations', translations.hr, translations.bs],
  ['templates', TEMPLATE_CODE.hr, TEMPLATE_CODE.bs],
  ['keywords', AUTOCOMPLETE_KEYWORDS.hr, AUTOCOMPLETE_KEYWORDS.bs],
] as const) {
  if (JSON.stringify(hr) === JSON.stringify(bs)) {
    problems++;
    console.log(`  ✗ ${name}: hrvatski je identičan bosanskom — varijanta nije uključena`);
  }
  walk(`${name}.hr`, hr);
}

// --- the offline check's messages --------------------------------------------
// Written in the module beside the codes they explain rather than in the table
// of translations, the way the parser's and the simulator's messages are, so
// the walk above does not reach them.
for (const f of sampleFindings()) {
  const bs = describeFinding(f, 'bs');
  note(bs.message);
  note(bs.fix);
  const hr = describeFinding(f, 'hr');
  check(`diagnose.${f.code}`, hr.message);
  check(`diagnose.${f.code}.fix`, hr.fix);
}

// --- the exercises -----------------------------------------------------------
for (const pack of [linijska as TaskPack, grananje as TaskPack]) {
  for (const task of pack.tasks) {
    for (const field of ['title', 'prompt', 'hint', 'discussion'] as const) {
      const t = task[field];
      if (!t) continue;
      note(t.bs);
      check(`${task.id}.${field}`, text(t, 'hr'));
    }
    note(task.solution);
    check(`${task.id}.solution`, solutionText(task, 'hr'));
  }
}

console.log('\nriječi koje varijanta mijenja:');
for (const [bs, hr] of [...changed].sort()) console.log(`  ${bs}  →  ${hr}`);

console.log(`\n${problems ? `${problems} problema` : 'hrvatska varijanta je potpuna'}`);
process.exit(problems ? 1 : 0);
