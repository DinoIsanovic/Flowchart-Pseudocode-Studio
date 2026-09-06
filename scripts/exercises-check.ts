/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authoring safety net for the exercise packs: `npm run check:exercises`.
 *
 * Every solution is parsed and run in all three languages, so a task cannot
 * reach a student with a typo, a missing test input, or a blank that does not
 * line up. It also prints the outputs each task produces, which is the answer
 * key for the 'prepoznaj' exercises.
 */

import { parsePseudocode } from '../src/core/flowchart-gen';
import { Interpreter } from '../src/core/interpreter';
import { Language } from '../src/types';
import { Task, TaskPack, text } from '../src/exercises/types';
import { blankedText, blanks, renderKeywords, solutionText, tiles } from '../src/exercises/render';
import linijska from '../src/exercises/linijska.json';

const packs = [linijska as TaskPack];
const LANGS: Language[] = ['bs', 'en', 'de'];

let problems = 0;
const fail = (task: Task, msg: string) => {
  problems++;
  console.log(`  ✗ ${task.id}: ${msg}`);
};

for (const pack of packs) {
  console.log(`\n=== ${text(pack.title, 'bs')} — ${pack.tasks.length} zadataka ===`);

  const seen = new Set<string>();
  const levels = new Set<number>();

  for (const task of pack.tasks) {
    if (seen.has(task.id)) fail(task, 'id se ponavlja');
    seen.add(task.id);
    if (levels.has(task.level)) fail(task, `nivo ${task.level} već zauzet`);
    levels.add(task.level);
    // Inserting a task in the middle is routine, so a gap in the numbering is
    // almost always a renumbering that was left half done.
    if (/-\d+-/.test(task.id)) fail(task, 'id nosi redni broj — poredak pripada polju level');
    if (task.topic !== pack.topic) fail(task, `topic "${task.topic}" ne odgovara paketu`);

    // Every language has to be complete: a missing translation silently falls
    // back to Bosnian, which is invisible until a German student opens it.
    for (const lang of LANGS) {
      if (!task.title[lang]) fail(task, `naslov nije preveden na ${lang}`);
      if (!task.prompt[lang]) fail(task, `tekst zadatka nije preveden na ${lang}`);
      if (task.discussion && !task.discussion[lang]) fail(task, `pitanje za razmišljanje nije prevedeno na ${lang}`);
    }

    // The solution has to parse, run and blank identically in every language.
    const holesBs = blanks(task, 'bs');
    for (const lang of LANGS) {
      const rendered = solutionText(task, lang);
      const { statements: perLang, errors } = parsePseudocode(rendered, lang);
      if (errors.length) {
        fail(task, `[${lang}] ${errors[0].line}: ${errors[0].message}`);
        continue;
      }
      for (const inputs of task.tests) {
        const machine = new Interpreter(perLang);
        const result = machine.runToEnd(inputs);
        if (result.status !== 'done') {
          fail(task, `[${lang}] ulaz [${inputs.join(', ')}] → ${result.status} ${result.error?.code ?? ''}`);
        }
      }
      const holes = blanks(task, lang);
      if (holes.length !== holesBs.length) {
        fail(task, `[${lang}] ima ${holes.length} praznina, a bosanski ${holesBs.length}`);
      } else if (holes.some((h, i) => h.kind !== holesBs[i].kind)) {
        fail(task, `[${lang}] praznine nisu iste vrste kao u bosanskom`);
      }
    }

    const { statements } = parsePseudocode(solutionText(task, 'bs'), 'bs');

    if (!task.tests.length) fail(task, 'nema nijednog test ulaza');
    const outputs: string[] = [];
    for (const inputs of task.tests) {
      const machine = new Interpreter(statements);
      const result = machine.runToEnd(inputs);
      if (result.status !== 'done') {
        fail(task, `ulaz [${inputs.join(', ')}] → ${result.status} ${result.error?.code ?? ''} ${result.error?.token ?? ''}`);
        continue;
      }
      outputs.push(`[${inputs.join(', ')}] → ${machine.output.join(' / ')}`);

      // Every listed input must actually be consumed, or the test data has a
      // leftover the author will trip over later.
      if (inputs.length) {
        const short = new Interpreter(statements);
        if (short.runToEnd(inputs.slice(0, -1)).status === 'done') {
          fail(task, `ulaz [${inputs.join(', ')}] ima višak — program završi i bez zadnje vrijednosti`);
        }
      }
    }

    const holes = blanks(task, 'bs');
    if (task.types.includes('dopuni') && !holes.length) fail(task, "tip 'dopuni' bez ijedne praznine {{ }}");
    if (holes.length && !task.types.includes('dopuni')) fail(task, "praznine {{ }} bez tipa 'dopuni'");
    if (holes.length) {
      const shown = blankedText(task, 'bs');
      if (!shown.includes('___')) fail(task, 'praznine se ne vide u prikazu');
      if (holes.some((h) => !h.answer)) fail(task, 'prazna praznina');
    }

    const body = tiles(task, 'bs').length - 2; // without POČETAK and KRAJ
    for (const group of task.interchangeable ?? []) {
      if (group.length < 2) fail(task, 'grupa zamjenjivih koraka ima manje od dva člana');
      for (const pos of group) {
        if (pos < 1 || pos > body) fail(task, `zamjenjivi korak ${pos} je izvan raspona 1..${body}`);
      }
    }

    const real = new Set(tiles(task, 'bs'));
    for (const d of task.distractors ?? []) {
      if (real.has(renderKeywords(d, 'bs'))) fail(task, `distraktor je zapravo tačna kockica: ${d}`);
    }

    console.log(`\n  ${task.level}. ${text(task.title, 'bs')}  [${task.kind}, ${task.types.join('/')}]`);
    outputs.forEach((o) => console.log(`     ${o}`));
    if (holes.length) console.log(`     praznine: ${holes.map((h) => `${h.kind}:${h.answer}`).join(', ')}`);
    if (task.interchangeable) console.log(`     zamjenjivi koraci: ${task.interchangeable.map((g) => g.join('↔')).join(', ')}`);
  }

  const sorted = [...levels].sort((a, b) => a - b);
  sorted.forEach((lvl, i) => {
    if (lvl !== i + 1) {
      problems++;
      console.log(`  ✗ ${pack.topic}: nivoi imaju rupu — očekivano ${i + 1}, nađeno ${lvl}`);
    }
  });
}

console.log(problems ? `\n${problems} problema` : '\nsvi zadaci ispravni');
process.exit(problems ? 1 : 0);
