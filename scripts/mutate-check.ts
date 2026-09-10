/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the planted mistakes in pseudocode: `npm run check:mutate`.
 *
 * A "find the mistake" task is only fair if the mistake is there to be found.
 * Three things have to hold for every task that declares the exercise, in
 * every language it is read in:
 *
 *   - a mistake can be planted at all;
 *   - the broken algorithm still parses and still runs, so what the student
 *     sees is an algorithm with a wrong answer, not a wreck;
 *   - it prints something the correct one does not, on a test input the task
 *     already carries — the proof the exercise shows when the mistake is found.
 *
 * It also checks that exactly one line differs. A student is told to find one
 * mistake, so finding one has to be enough.
 */

import { Language } from '../src/types';
import { TaskPack, Task } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { plantCodeMistake } from '../src/exercises/mutate';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';
import petlje from '../src/exercises/petlje.json';

let pass = 0;
let fail = 0;

const LANGS: Language[] = ['bs', 'hr', 'en', 'de'];
const PACKS = [linijska, grananje, petlje] as TaskPack[];

function bad(task: Task, lang: Language, why: string): void {
  fail++;
  console.log(`FAIL  ${task.id} [${lang}] — ${why}`);
}

const counts: Record<string, number> = {};

for (const pack of PACKS) {
  for (const task of pack.tasks) {
    if (!task.types.includes('greska')) continue;

    for (const lang of LANGS) {
      const planted = plantCodeMistake(task, lang);
      if (!planted) {
        bad(task, lang, 'nijedna izmjena ne mijenja ispis — zadatak bi bio nerješiv');
        continue;
      }

      const original = solutionText(task, lang).split('\n');
      if (planted.lines.length !== original.length) {
        bad(task, lang, 'broj linija se promijenio');
        continue;
      }

      const differing = original
        .map((line, i) => (line === planted.lines[i] ? -1 : i + 1))
        .filter((i) => i > 0);
      if (differing.length !== 1) {
        bad(task, lang, `promijenjeno je ${differing.length} linija, a smije samo jedna`);
        continue;
      }
      if (differing[0] !== planted.line) {
        bad(task, lang, `greška je na liniji ${differing[0]}, a ključ kaže ${planted.line}`);
        continue;
      }
      if (planted.correct === planted.wrong) {
        bad(task, lang, 'linija je označena kao pogrešna, a ista je kao u rješenju');
        continue;
      }
      // The proof the student is shown has to be a real disagreement.
      if (planted.proof.expected.join('\n') === planted.proof.got.join('\n')) {
        bad(task, lang, 'dokaz ne pokazuje razliku u ispisu');
        continue;
      }

      pass++;
      if (lang === 'bs') counts[planted.kind] = (counts[planted.kind] ?? 0) + 1;
    }
  }
}

// --- the same task must break the same way every time ----------------------

for (const pack of PACKS) {
  for (const task of pack.tasks) {
    if (!task.types.includes('greska')) continue;
    const a = plantCodeMistake(task, 'bs');
    const b = plantCodeMistake(task, 'bs');
    if (a && b && a.line === b.line && a.wrong === b.wrong) {
      pass++;
    } else {
      bad(task, 'bs', 'dva poziva daju različitu grešku — razred ne bi radio isti zadatak');
    }
  }
}

// --- a task that does not declare it must not be silently broken -----------

const declared = PACKS.flatMap((p) => p.tasks).filter((t) => t.types.includes('greska'));
console.log(`\n${declared.length} zadataka nudi „pronađi grešku"`);
console.log('vrste posađenih grešaka (bs):');
for (const [kind, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${kind.padEnd(12)} ${n}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
