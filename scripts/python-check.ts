/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the Python generator: `npm run check:python`.
 *
 * The Python column is the second reward for a računski task — the student
 * copies it into an editor and runs it — so the test is not what the text
 * looks like but what Python does with it. Every authored solution is
 * generated in all four languages and handed to `python3`: first to parse, so
 * nothing generates a program that will not even start, and then to run on the
 * task's own test inputs, where the output has to match what the app's own
 * simulator prints for the same inputs.
 *
 * That is what catches a word the generator forgot to translate: `a > 1 I
 * b < 2` stayed `I` in the file and raised a SyntaxError at the first line the
 * student ran.
 *
 * Values read with `UNESI` become `int(input())`, so a test whose input has a
 * decimal point is counted and named at the end rather than run — the program
 * a student copies would raise ValueError on it. The app's own marking never
 * goes through Python, so nothing else depends on it.
 */

import { execFileSync } from 'node:child_process';
import { Language } from '../src/types';
import { TaskPack } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { parsePseudocode } from '../src/core/flowchart-gen';
import { statementsToPython, pythonSource } from '../src/core/python-gen';
import { Interpreter } from '../src/core/interpreter';
import { TEMPLATE_CODE } from '../src/i18n/keywords';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';
import petlje from '../src/exercises/petlje.json';

let pass = 0;
let fail = 0;

const LANGS: Language[] = ['bs', 'hr', 'en', 'de'];
const PACKS = [linijska, grananje, petlje] as TaskPack[];

const generate = (code: string, lang: Language): string => {
  const { statements, errors } = parsePseudocode(code, lang);
  if (errors.length) throw new Error(`pseudokod ne parsira: ${errors[0].message}`);
  return pythonSource(statementsToPython(statements, lang));
};

// --- nothing stands above the program --------------------------------------

{
  const src = generate(`POČETAK
UNESI a
ISPIŠI a
KRAJ`, 'bs');
  if (src.startsWith('a = ')) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  program ne počinje prvim korakom:\n${src}`);
  }
}

// --- how a read value is written -------------------------------------------

const reads: [string, string, string][] = [
  ['broj koji se računa', `POČETAK
UNESI a
RAČUNAJ b = a * 2
ISPIŠI b
KRAJ`, 'a = int(input())'],
  ['vrijednost koja se samo ispisuje', `POČETAK
UNESI ime
ISPIŠI ime
KRAJ`, 'ime = input()'],
  ['brojač petlje', `POČETAK
UNESI n
PONOVI n PUTA
  ISPIŠI i
KRAJ`, 'n = int(input())'],
  ['dva imena u jednom redu', `POČETAK
UNESI a, b
ISPIŠI a + b
KRAJ`, 'a = int(input())\nb = int(input())'],
  ['tekst poređen s tekstom', `POČETAK
UNESI ime
AKO JE ime = "Amina"
  DA
    ISPIŠI "Zdravo"
KRAJ`, 'ime = input()'],
  ['tekst spojen s tekstom', `POČETAK
UNESI ime
RAČUNAJ pozdrav = "Zdravo, " + ime
ISPIŠI pozdrav
KRAJ`, 'ime = input()'],
  ['tekst koji se mjeri', `POČETAK
UNESI ime
ISPIŠI len(ime)
KRAJ`, 'ime = input()'],
  ['broj zalijepljen na tekst', `POČETAK
UNESI a
RAČUNAJ b = a * 2
ISPIŠI "Dvostruko: " + b
KRAJ`, 'print("Dvostruko: " + str(b))'],
];

for (const [name, code, expected] of reads) {
  const src = generate(code, 'bs');
  if (src.includes(expected)) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${name} — nema "${expected.replace(/\n/g, ' / ')}":\n${src}`);
  }
}

// --- words that Python spells differently ----------------------------------

const rewrites: [string, string, string][] = [
  ['i kao veznik', 'AKO JE a > 1 I b < 2', 'if a > 1 and b < 2:'],
  ['i kao brojač', 'AKO JE i <= 10', 'if i <= 10:'],
  ['ili', 'AKO JE a = 1 ILI a = 2', 'if a == 1 or a == 2:'],
  ['nije', 'AKO JE NIJE a', 'if not a:'],
  ['jednako', 'AKO JE a = b', 'if a == b:'],
  ['različito', 'AKO JE a <> b', 'if a != b:'],
  ['tačno', 'AKO JE TAČNO', 'if True:'],
];

for (const [name, condition, expected] of rewrites) {
  const src = generate(`POČETAK
${condition}
  DA
    ISPIŠI "da"
KRAJ`, 'bs');
  if (src.includes(expected)) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${name} — očekivano "${expected}":\n${src}`);
  }
}

// --- python3 reads every generated program ---------------------------------

interface Program {
  name: string;
  src: string;
}

const programs: Program[] = [];
for (const pack of PACKS) {
  for (const task of pack.tasks) {
    for (const lang of LANGS) {
      programs.push({ name: `${task.id} [${lang}]`, src: generate(solutionText(task, lang), lang) });
    }
  }
}
for (const lang of LANGS) {
  const templates = TEMPLATE_CODE[lang];
  (Object.keys(templates) as (keyof typeof templates)[]).forEach((key) => {
    programs.push({ name: `šablon ${key} [${lang}]`, src: generate(templates[key], lang) });
  });
}

const PARSE_ALL = `
import ast, json, sys
for item in json.load(sys.stdin):
    try:
        ast.parse(item["src"])
    except SyntaxError as e:
        print(item["name"] + " :: " + str(e))
`;

let python = true;
try {
  const bad = execFileSync('python3', ['-c', PARSE_ALL], {
    input: JSON.stringify(programs),
    encoding: 'utf8',
  }).trim();
  if (!bad) {
    pass += programs.length;
  } else {
    bad.split('\n').forEach((line) => {
      fail++;
      console.log(`FAIL  Python ne prihvata program — ${line}`);
    });
  }
} catch {
  python = false;
  console.log('(python3 nije dostupan — programi nisu ni pokrenuti)');
}

// --- and runs them on the task's own inputs --------------------------------

/** `4` and `4.0` are the same number; the app drops a trailing zero, Python keeps it. */
function sameLine(a: string, b: string): boolean {
  if (a === b) return true;
  const x = a.split(/\s+/);
  const y = b.split(/\s+/);
  if (x.length !== y.length) return false;
  return x.every((word, i) => {
    if (word === y[i]) return true;
    const p = Number(word);
    const q = Number(y[i]);
    return Number.isFinite(p) && Number.isFinite(q) && Math.abs(p - q) <= Math.max(1e-6, Math.abs(p) * 1e-6);
  });
}

const decimalTests: string[] = [];

if (python) {
  for (const pack of PACKS) {
    for (const task of pack.tasks) {
      if (task.kind !== 'racunski') continue;
      const { statements } = parsePseudocode(solutionText(task, 'bs'), 'bs');
      const src = pythonSource(statementsToPython(statements, 'bs'));

      for (const test of task.tests) {
        if (test.some((v) => /^-?\d+\.\d+$/.test(v))) {
          decimalTests.push(`${task.id} ${JSON.stringify(test)}`);
          continue;
        }
        const machine = new Interpreter(statements);
        machine.runToEnd([...test]);
        const expected = machine.output;

        let got: string[];
        try {
          const out = execFileSync('python3', ['-c', src], {
            input: test.join('\n') + '\n',
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          got = out.length ? out.replace(/\n$/, '').split('\n') : [];
        } catch (e) {
          fail++;
          const err = String((e as { stderr?: string }).stderr ?? e).trim().split('\n').pop();
          console.log(`FAIL  ${task.id} ${JSON.stringify(test)} — Python pukne: ${err}`);
          continue;
        }

        const same = got.length === expected.length && got.every((line, i) => sameLine(line, expected[i]));
        if (same) {
          pass++;
        } else {
          fail++;
          console.log(`FAIL  ${task.id} ${JSON.stringify(test)} — Python i simulator se ne slažu:`);
          console.log(`        simulator: ${expected.join(' | ')}`);
          console.log(`        python:    ${got.join(' | ')}`);
        }
      }
    }
  }
}

console.log(`\n${programs.length} generisanih programa kroz python3`);
if (decimalTests.length) {
  console.log(`${decimalTests.length} testa s decimalnim unosom nisu pokrenuta — int(input()) ih ne čita:`);
  decimalTests.forEach((t) => console.log(`  ${t}`));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
