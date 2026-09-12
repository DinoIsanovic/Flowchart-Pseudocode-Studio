/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the offline diagnostics: `npm run check:diagnose`.
 *
 * Two things have to hold, and the second is the harder one.
 *
 * A broken program must be named correctly: each case below is a mistake a
 * beginner actually makes, and the check asks for the finding that names it.
 *
 * A correct program must be left alone. Every authored solution in the three
 * exercise packs, in all four languages, plus the app's own templates, is put
 * through the same pass and must come out silent — bar the one finding named
 * in `ALLOWED` below, which was read and kept on purpose. A check that cries
 * wolf on the exercises the app itself ships would teach students to ignore
 * it, which is worse than not having it.
 */

import { Language } from '../src/types';
import { TaskPack } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { TEMPLATE_CODE } from '../src/i18n/keywords';
import { Finding, FindingCode, describeFinding, diagnose, sampleFindings } from '../src/core/diagnose';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';
import petlje from '../src/exercises/petlje.json';

let pass = 0;
let fail = 0;

const LANGS: Language[] = ['bs', 'hr', 'en', 'de'];
const PACKS = [linijska, grananje, petlje] as TaskPack[];

function show(findings: Finding[]): string {
  return findings.length ? findings.map((f) => `${f.code}${f.line ? `@${f.line}` : ''}`).join(', ') : '—';
}

/** The program must produce this finding, and it must be the first one. */
function finds(name: string, code: string, expected: FindingCode, lang: Language = 'bs') {
  const found = diagnose(code, lang);
  if (found.length && found[0].code === expected) {
    pass++;
    return found[0];
  }
  fail++;
  console.log(`FAIL  ${name}\n      našlo    ${show(found)}\n      očekivano ${expected}`);
  return null;
}

/** The program must produce this finding somewhere, alone or beside others. */
function mentions(name: string, code: string, expected: FindingCode, lang: Language = 'bs') {
  const found = diagnose(code, lang);
  if (found.some((f) => f.code === expected)) {
    pass++;
    return;
  }
  fail++;
  console.log(`FAIL  ${name}\n      našlo    ${show(found)}\n      očekivano ${expected}`);
}

function silent(name: string, code: string, lang: Language = 'bs') {
  const found = diagnose(code, lang);
  if (!found.length) {
    pass++;
    return;
  }
  fail++;
  console.log(`FAIL  ${name}\n      našlo ${show(found)}\n${found.map((f) => `      · ${describeFinding(f, lang).message}`).join('\n')}`);
}

// --- reading the program ---------------------------------------------------

finds(
  'varijabla bez vrijednosti',
  `POČETAK
ISPIŠI zbir
KRAJ`,
  'nedefinisana'
);

finds(
  'ime promašeno za jedno slovo',
  `POČETAK
UNESI broj
ISPIŠI bruj
KRAJ`,
  'slicno-ime'
);

finds(
  'dva slova zamijenjena mjestima',
  `POČETAK
UNESI zahl
ISPIŠI zhal
KRAJ`,
  'slicno-ime'
);

finds(
  'akumulator koji niko nije postavio',
  `POČETAK
POSTAVI n = 3
PONOVI n PUTA
  RAČUNAJ zbir = zbir + i
ISPIŠI zbir
KRAJ`,
  'nedefinisana'
);

mentions(
  'unos koji se nigdje ne koristi',
  `POČETAK
UNESI a
UNESI b
RAČUNAJ zbir = a + a
ISPIŠI zbir
KRAJ`,
  'neiskoristena'
);

silent(
  'svakodnevni postupak koji ništa ne računa',
  `POČETAK
ISPIŠI "Otvori Gmail"
UNESI primalac
UNESI naslov
ISPIŠI "Klikni Pošalji"
KRAJ`
);

mentions(
  'program koji ništa ne ispisuje',
  `POČETAK
UNESI a
RAČUNAJ b = a * 2
KRAJ`,
  'bez-ispisa'
);

finds(
  'izraz koji se ne može pročitati',
  `POČETAK
UNESI a
POSTAVI b = 2 +
ISPIŠI b
KRAJ`,
  'izraz'
);

finds(
  'red koji ne kaže nad čime radi',
  `POČETAK
POSTAVI zbir
ISPIŠI zbir
KRAJ`,
  'izraz'
);

finds(
  'zatvaranje bloka koje se više ne piše',
  `POČETAK
UNESI a
AKO JE a > 0
  DA
    ISPIŠI a
KRAJ AKO
KRAJ`,
  'sintaksa'
);

// --- conditions and branches -----------------------------------------------

mentions(
  'uslov bez ijedne varijable',
  `POČETAK
AKO JE 5 > 3
  DA
    ISPIŠI "uvijek"
KRAJ`,
  'stalan-uslov'
);

mentions(
  'ljestvica poredana naopako',
  `POČETAK
UNESI bodovi
AKO JE bodovi >= 50
  DA
    ISPIŠI "prolaz"
  INAČE AKO JE bodovi >= 85
    DA
      ISPIŠI "odličan"
    INAČE
      ISPIŠI "pao"
KRAJ`,
  'mrtva-grana'
);

silent(
  'ista ljestvica poredana kako treba',
  `POČETAK
UNESI bodovi
AKO JE bodovi >= 85
  DA
    ISPIŠI "odličan"
  INAČE AKO JE bodovi >= 50
    DA
      ISPIŠI "prolaz"
    INAČE
      ISPIŠI "pao"
KRAJ`
);

silent(
  'granica između dva praga',
  `POČETAK
UNESI ugao
AKO JE ugao < 90
  DA
    ISPIŠI "oštar"
  INAČE AKO JE ugao = 90
    DA
      ISPIŠI "prav"
    INAČE
      ISPIŠI "tup"
KRAJ`
);

// --- loops -----------------------------------------------------------------

finds(
  'petlja kojoj tijelo ne dira brojač',
  `POČETAK
POSTAVI i = 1
PONOVI DOK JE i <= 10
  ISPIŠI i
KRAJ`,
  'petlja-bez-kraja'
);

mentions(
  'brojanje do unesenog broja, ali sa <>',
  `POČETAK
UNESI n
POSTAVI i = 1
PONOVI DOK JE i <> n
  ISPIŠI i
  RAČUNAJ i = i + 1
KRAJ`,
  'petlja-za-ulaz'
);

silent(
  'petlja koju vodi ono što se u njoj upiše',
  `POČETAK
UNESI broj
PONOVI DOK JE broj <= 0
  ISPIŠI "pokušaj ponovo"
  UNESI broj
ISPIŠI "hvala", broj
KRAJ`
);

// --- running it ------------------------------------------------------------

mentions(
  'dijeljenje koje pukne samo za nulu',
  `POČETAK
UNESI a
RAČUNAJ b = 10 / a
ISPIŠI b
KRAJ`,
  'greska-za-ulaz'
);

mentions(
  'množenje teksta, šta god se upiše',
  `POČETAK
UNESI a
RAČUNAJ b = "tekst" * a
ISPIŠI b
KRAJ`,
  'greska-u-radu'
);

// --- correct programs stay silent ------------------------------------------

for (const [name, code] of Object.entries(TEMPLATE_CODE.bs)) {
  silent(`šablon ${name}`, code);
}

/**
 * Findings an authored solution is allowed to carry, decided one by one.
 *
 * `linijska-jednacina` divides by the first number typed, so `a = 0` stops it.
 * That is true of the algorithm as the task asks for it — `0 * x + b = c` is
 * not an equation — and saying so to a student who has just solved it is worth
 * more than silence. It stays, named here, so a second one cannot appear
 * unnoticed.
 */
const ALLOWED: Record<string, FindingCode[]> = {
  'linijska-jednacina': ['greska-za-ulaz'],
};

for (const pack of PACKS) {
  for (const task of pack.tasks) {
    for (const lang of LANGS) {
      const code = solutionText(task, lang);
      const allowed = ALLOWED[task.id] ?? [];
      const found = diagnose(code, lang).filter((f) => !allowed.includes(f.code));
      if (!found.length) {
        pass++;
        continue;
      }
      fail++;
      console.log(`FAIL  ${task.id} (${lang})\n${found.map((f) => `      · ${f.code}${f.line ? ` red ${f.line}` : ''}: ${describeFinding(f, lang).message}`).join('\n')}`);
    }
  }
}

// --- every message, in every language --------------------------------------

console.log('\nporuke:');
for (const f of sampleFindings()) {
  const said = describeFinding(f, 'bs');
  console.log(`  ${f.code.padEnd(18)} ${said.message}\n  ${''.padEnd(18)} → ${said.fix}`);
  for (const lang of ['en', 'de', 'hr'] as Language[]) {
    const other = describeFinding(f, lang);
    if (other.message && other.fix) continue;
    fail++;
    console.log(`FAIL  ${f.code} nema poruku na ${lang}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
