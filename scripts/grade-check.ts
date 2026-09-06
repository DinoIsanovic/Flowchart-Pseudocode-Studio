/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the marker: `npm run check:grade`.
 *
 * The cases that matter are the two kinds of "different but still right" —
 * an equivalent expression, and two independent steps swapped — and the ones
 * that look close but are wrong.
 */

import { TaskPack } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { describeGrade, gradeAttempt } from '../src/exercises/grade';
import linijska from '../src/exercises/linijska.json';

const pack = linijska as TaskPack;
const task = (id: string) => pack.tasks.find((t) => t.id === id)!;
let pass = 0;
let fail = 0;

function expect(name: string, id: string, code: string, correct: boolean) {
  const result = gradeAttempt(task(id), code, 'bs');
  if (result.correct === correct) {
    pass++;
    if (!correct) console.log(`  ✓ ${name.padEnd(44)} → ${describeGrade(result, 'bs')}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} → očekivano ${correct ? 'tačno' : 'netačno'}, dobiveno ${result.correct ? 'tačno' : 'netačno'} (${describeGrade(result, 'bs')})`);
  }
}

// Every authored solution must mark itself correct.
for (const t of pack.tasks) {
  const r = gradeAttempt(t, solutionText(t, 'bs'), 'bs');
  if (r.correct) pass++;
  else {
    fail++;
    console.log(`  ✗ ${t.id}: vlastito rješenje ocijenjeno netačnim — ${describeGrade(r, 'bs')}`);
  }
}

console.log('\nrazličito, ali tačno:');

const jutro = solutionText(task('linijska-jutro'), 'bs').split('\n');
const zamijenjeni = [...jutro];
[zamijenjeni[3], zamijenjeni[4]] = [zamijenjeni[4], zamijenjeni[3]];
expect('jutro: koraci 3 i 4 zamijenjeni', 'linijska-jutro', zamijenjeni.join('\n'), true);

expect('kvadrat: a + a + a + a umjesto 4 * a', 'linijska-kvadrat',
  `POČETAK
UNESI a
RAČUNAJ O = a + a + a + a
RAČUNAJ P = a * a
ISPIŠI O
ISPIŠI P
KRAJ`, true);

expect('zbir: druga imena varijabli', 'linijska-zbir-razlika',
  `POČETAK
UNESI a, b
RAČUNAJ s = a + b
RAČUNAJ r = a - b
ISPIŠI "Zbir je", s
ISPIŠI "Razlika je", r
KRAJ`, true);

console.log('\nnetačno:');

const jutroKrivo = [...jutro];
jutroKrivo.splice(1, 0, jutroKrivo.splice(5, 1)[0]); // torba na prvo mjesto
expect('jutro: torba prije svega', 'linijska-jutro', jutroKrivo.join('\n'), false);

expect('kvadrat: P = 4 * a', 'linijska-kvadrat',
  `POČETAK
UNESI a
RAČUNAJ O = 4 * a
RAČUNAJ P = 4 * a
ISPIŠI O
ISPIŠI P
KRAJ`, false);

expect('zbir: razlika naopako', 'linijska-zbir-razlika',
  `POČETAK
UNESI a, b
RAČUNAJ zbir = a + b
RAČUNAJ razlika = b - a
ISPIŠI "Zbir je", zbir
ISPIŠI "Razlika je", razlika
KRAJ`, false);

expect('jednačina: bez zagrada', 'linijska-jednacina',
  `POČETAK
ISPIŠI "Rješavamo jednačinu a * x + b = c"
UNESI a, b, c
RAČUNAJ x = c - b / a
ISPIŠI "x =", x
KRAJ`, false);

expect('kvadrat: čita varijablu koje nema', 'linijska-kvadrat',
  `POČETAK
UNESI a
RAČUNAJ O = 4 * b
RAČUNAJ P = a * a
ISPIŠI O
ISPIŠI P
KRAJ`, false);

expect('kvadrat: nije pseudokod', 'linijska-kvadrat', 'POČETAK\nUNESI a\nRAČUNAJ O = 4a\nKRAJ', false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
