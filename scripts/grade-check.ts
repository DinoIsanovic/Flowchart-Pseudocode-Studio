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

import { Task, TaskPack } from '../src/exercises/types';
import { solutionText, tileLine, tiles } from '../src/exercises/render';
import { describeGrade, gradeAttempt } from '../src/exercises/grade';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';

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

const branching = grananje as TaskPack;

// Every authored solution must mark itself correct.
for (const t of [...pack.tasks, ...branching.tasks]) {
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

// --- branching: indentation is part of the answer ---------------------------

/**
 * A branch is the first place where two attempts made of the very same tiles
 * are different programs. These cases stand in for the grananje pack until it
 * is authored: if the marker stops reading depth, they go red.
 */
const ugao: Task = {
  id: 'probni-ugao',
  topic: 'grananje',
  kind: 'racunski',
  level: 1,
  title: { bs: 'Oštar ugao' },
  prompt: { bs: 'Za uneseni ugao ispiši je li oštar.' },
  solution:
    '@START\n@INPUT alfa\n@IF alfa < 90\n  @YES\n    @OUTPUT "Ugao je oštar"\n  @ELSE\n    @OUTPUT "Ugao je tup ili prav"\n@END',
  tests: [['30'], ['89.9'], ['90'], ['120.5']],
  types: ['kockice'],
};

function expectTask(name: string, t: Task, code: string, correct: boolean) {
  const result = gradeAttempt(t, code, 'bs');
  if (result.correct === correct) {
    pass++;
    if (!correct) console.log(`  ✓ ${name.padEnd(44)} → ${describeGrade(result, 'bs')}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} → očekivano ${correct ? 'tačno' : 'netačno'}, dobiveno ${result.correct ? 'tačno' : 'netačno'} (${describeGrade(result, 'bs')})`);
  }
}

const sastavi = (t: Task) => tiles(t, 'bs').map(tileLine).join('\n');

expectTask('ugao: složene kockice', ugao, sastavi(ugao), true);

// Same tiles, same order — only the depth is wrong, so the branch swallows
// nothing and the message prints for every angle.
expectTask('ugao: ispis izvučen iz grane', ugao,
  `POČETAK
UNESI alfa
AKO JE alfa < 90
  DA
    ISPIŠI "Ugao je oštar"
  INAČE
ISPIŠI "Ugao je tup ili prav"
KRAJ`, false);

// Both branches one level too shallow: the labels stop being labels.
expectTask('ugao: cijela grana neuvučena', ugao,
  `POČETAK
UNESI alfa
AKO JE alfa < 90
DA
ISPIŠI "Ugao je oštar"
INAČE
ISPIŠI "Ugao je tup ili prav"
KRAJ`, false);

// Right shape, wrong branches — the tiles are all there and all at the right
// depth, which is exactly what an order-only marker would wave through.
expectTask('ugao: zamijenjene grane', ugao,
  `POČETAK
UNESI alfa
AKO JE alfa < 90
  DA
    ISPIŠI "Ugao je tup ili prav"
  INAČE
    ISPIŠI "Ugao je oštar"
KRAJ`, false);

// A 'sidra' task hands the frame over already built.
const sidra: Task = { ...ugao, id: 'probni-ugao-sidra', kockice: 'sidra' };
{
  const t = tiles(sidra, 'bs');
  const fixed = t.filter((x) => x.anchor).map((x) => x.text);
  const loose = t.filter((x) => !x.anchor).map((x) => x.text);
  // POČETAK, AKO JE, DA, INAČE, KRAJ are the frame; UNESI and the two ISPIŠI
  // are work, so they stay loose even in a framed task.
  const want = fixed.length === 5 && loose.length === 3;
  if (want) pass++;
  else {
    fail++;
    console.log(`  ✗ sidra: očekivano 5 fiksnih i 3 slobodne, dobiveno ${fixed.length} i ${loose.length}`);
  }
}

// Tiles laid out exactly as authored — depth included — must mark correct on
// every branching task. This is the path that did not exist before tiles
// carried their level, and the one every 'kockice' exercise in the pack uses.
for (const t of branching.tasks) {
  const built = tiles(t, 'bs').map(tileLine).join('\n');
  const r = gradeAttempt(t, built, 'bs');
  if (r.correct) pass++;
  else {
    fail++;
    console.log(`  ✗ ${t.id}: složene kockice nisu tačne — ${describeGrade(r, 'bs')}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
