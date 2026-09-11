/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the interpreter: `npm run check:interpreter`.
 *
 * Runs whole pseudocode programs and compares what the console printed, which
 * is the level a regression would actually be noticed at.
 */

import { parsePseudocode } from '../src/core/flowchart-gen';
import { Interpreter, describeRunError } from '../src/core/interpreter';
import { formatValue } from '../src/core/expr';
import { statementsToPython, pythonSource } from '../src/core/python-gen';
import { Language } from '../src/types';

let pass = 0;
let fail = 0;

function run(code: string, inputs: string[] = [], lang: Language = 'bs') {
  const { statements } = parsePseudocode(code, lang);
  const machine = new Interpreter(statements);
  const result = machine.runToEnd(inputs);
  return { machine, result };
}

function prints(name: string, code: string, expected: string[], inputs: string[] = []) {
  const { machine, result } = run(code, inputs);
  const got = machine.output;
  const same = got.length === expected.length && got.every((v, i) => v === expected[i]);
  if (same && result.status === 'done') {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${name}\n      output   ${JSON.stringify(got)}\n      expected ${JSON.stringify(expected)}\n      status   ${result.status}${result.error ? ` ${result.error.code} (${result.error.token}) line ${result.error.line}` : ''}`);
  }
}

function counts(name: string, code: string, expected: Record<string, number>, inputs: string[] = []) {
  const { machine, result } = run(code, inputs);
  const wrong = Object.entries(expected).filter(([k, v]) => machine.vars.get(k) !== v);
  if (!wrong.length && result.status === 'done') {
    pass++;
  } else {
    fail++;
    const got = [...machine.vars].map(([k, v]) => `${k}=${formatValue(v)}`).join(' ');
    console.log(`FAIL  ${name}\n      vars     ${got}\n      expected ${JSON.stringify(expected)}\n      status   ${result.status}${result.error ? ` ${result.error.code}` : ''}`);
  }
}

/**
 * The way each decision went, in order, as the state table's condition column
 * writes it: `DA` when the condition held. A loop reports one per test, an
 * `AKO` one per decision reached.
 */
function branches(name: string, code: string, expected: string, inputs: string[] = []) {
  const { statements } = parsePseudocode(code, 'bs');
  const machine = new Interpreter(statements);
  const seen: string[] = [];
  let next = 0;
  for (;;) {
    if (machine.status === 'input') {
      if (next >= inputs.length) break;
      machine.provideInput(inputs[next++]);
    }
    const step = machine.step();
    if (step.branch !== undefined) seen.push(step.branch ? 'DA' : 'NE');
    if (step.status === 'done' || step.status === 'error') break;
  }
  if (seen.join(',') === expected) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${name}\n      grane    ${seen.join(',')}\n      očekivano ${expected}`);
  }
}

function errors(name: string, code: string, expectedCode: string, inputs: string[] = []) {
  const { result } = run(code, inputs);
  if (result.status === 'error' && result.error?.code === expectedCode) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${name} => ${result.status} ${result.error?.code ?? ''} (expected ${expectedCode})`);
  }
}

// --- sequence, input, output ----------------------------------------------

prints('zbir dva broja', `POČETAK
UNESI a, b
RAČUNAJ zbir = a + b
ISPIŠI zbir
KRAJ`, ['10'], ['4', '6']);

prints('ispis više vrijednosti', `POČETAK
POSTAVI a = 3
ISPIŠI "a =", a
KRAJ`, ['a = 3']);

prints('zarez u stringu ostaje jedan argument', `POČETAK
ISPIŠI "zdravo, svijete"
KRAJ`, ['zdravo, svijete']);

prints('dodjela poređenja', `POČETAK
POSTAVI a = 5
POSTAVI veci = a > 3
ISPIŠI veci
KRAJ`, ['true']);

// --- branching -------------------------------------------------------------

prints('veći od dva broja', `POČETAK
UNESI a, b
AKO JE a > b
  DA
    ISPIŠI a
  INAČE
    ISPIŠI b
KRAJ`, ['9'], ['9', '2']);

prints('inače ako', `POČETAK
POSTAVI x = 0
AKO JE x > 0
  DA
    ISPIŠI "pozitivan"
  INAČE AKO JE x < 0
    DA
      ISPIŠI "negativan"
    INAČE
      ISPIŠI "nula"
KRAJ`, ['nula']);

// --- loops -----------------------------------------------------------------

prints('while petlja', `POČETAK
POSTAVI i = 1
PONOVI DOK JE i <= 3
  ISPIŠI i
  RAČUNAJ i = i + 1
KRAJ`, ['1', '2', '3']);

prints('brojačka petlja je 0-bazna', `POČETAK
PONOVI 3 PUTA
  ISPIŠI "korak"
KRAJ`, ['korak', 'korak', 'korak']);

// The counter a count loop keeps implicit is a real variable at run time, so
// the state table can show it stepping — but the pseudocode has no name for it
// and cannot read it back. Referring to `i` there is an undefined variable,
// which is also what the generated Python does with it.
counts('brojač broji od nule', `POČETAK
PONOVI 3 PUTA
  ISPIŠI "korak"
KRAJ`, { i: 2 });

counts('ugniježdene petlje ne dijele brojač', `POČETAK
PONOVI 2 PUTA
  PONOVI 2 PUTA
    ISPIŠI "x"
KRAJ`, { i: 1, j: 1 });

// A bottom-tested loop is drawn with its test at the top, and the Python is
// generated the same way, so the body can run zero times here where a true
// do-while would run once. The simulator agrees with the other two views on
// purpose — the three must never disagree in front of a student.
prints('petlja pisana odozdo testira se odozgo', `POČETAK
POSTAVI i = 1
PONAVLJAJ
  ISPIŠI i
  RAČUNAJ i = i + 1
DOK JE i <= 3`, ['1', '2', '3']);

prints('isti oblik, uslov odmah netačan, tijelo se ne izvršava', `POČETAK
POSTAVI i = 1
PONAVLJAJ
  ISPIŠI i
  RAČUNAJ i = i + 1
DOK JE i > 3`, []);

// --- the counter of a count loop -------------------------------------------

// The counter is a variable the pseudocode may read: its name follows the
// depth of the loop, so `i` is `i` no matter what else the program holds.

prints('brojač se može ispisati', `POČETAK
PONOVI 3 PUTA
  ISPIŠI i
KRAJ`, ['0', '1', '2']);

prints('ugniježđene petlje broje u i pa u j', `POČETAK
PONOVI 2 PUTA
  PONOVI 2 PUTA
    ISPIŠI i, j
KRAJ`, ['0 0', '0 1', '1 0', '1 1']);

// Python does the same with `for i in range(n)`, and the two must not differ.
prints('petlja preuzima varijablu istog imena', `POČETAK
POSTAVI i = 100
PONOVI 2 PUTA
  ISPIŠI i
ISPIŠI i
KRAJ`, ['0', '1', '1']);

counts('brojač ostaje na zadnjoj vrijednosti', `POČETAK
PONOVI 5 PUTA
  ISPIŠI i
KRAJ`, { i: 4 });

// How many times is an expression, not only a written number: past the first
// exercise the count comes from the input.
prints('broj ponavljanja iz varijable', `POČETAK
UNESI n
PONOVI n PUTA
  ISPIŠI i
KRAJ`, ['0', '1', '2'], ['3']);

prints('broj ponavljanja kao izraz', `POČETAK
UNESI koliko
PONOVI koliko - 1 PUTA
  ISPIŠI "x"
KRAJ`, ['x', 'x'], ['3']);

// --- which branch was taken ------------------------------------------------

// The state table has a column for the condition, and it is filled from the
// same report the canvas highlights the diagram with: `true` is always the DA
// edge, including in the UNTIL form, where the labels are swapped rather than
// the test.

branches('AKO — grana DA', `POČETAK
UNESI a
AKO JE a > 10
  DA
    ISPIŠI "veliko"
  INAČE
    ISPIŠI "malo"
KRAJ`, 'DA', ['12']);

branches('AKO — grana NE', `POČETAK
UNESI a
AKO JE a > 10
  DA
    ISPIŠI "veliko"
  INAČE
    ISPIŠI "malo"
KRAJ`, 'NE', ['7']);

// Only the decisions actually reached leave a row: the inner AKO of the branch
// that was not taken never runs.
branches('ugniježđeni AKO — samo dosegnute odluke', `POČETAK
UNESI a, b
AKO JE a >= b
  DA
    AKO JE a >= 10
      DA
        ISPIŠI "a, veliko"
      INAČE
        ISPIŠI "a, malo"
  INAČE
    AKO JE b >= 10
      DA
        ISPIŠI "b, veliko"
KRAJ`, 'DA,NE', ['8', '3']);

branches('petlja — jedna odluka po prolazu', `POČETAK
POSTAVI i = 1
PONOVI DOK JE i <= 3
  RAČUNAJ i = i + 1
KRAJ`, 'DA,DA,DA,NE');

branches('petlja pisana odozdo — DA i dalje znači da uslov vrijedi', `POČETAK
POSTAVI i = 1
PONAVLJAJ
  RAČUNAJ i = i + 1
DOK JE i <= 3`, 'DA,DA,DA,NE');

// --- errors ----------------------------------------------------------------

errors('nedefinisana varijabla', `POČETAK
ISPIŠI zbir
KRAJ`, 'undefined-var');

errors('dijeljenje nulom', `POČETAK
POSTAVI a = 1
RAČUNAJ b = a / 0
KRAJ`, 'div-zero');

errors('uslov nije logički', `POČETAK
POSTAVI x = 5
AKO JE x
  DA
    ISPIŠI x
KRAJ`, 'not-boolean');

errors('petlja koja se ne zaustavlja', `POČETAK
POSTAVI i = 1
PONOVI DOK JE i > 0
  RAČUNAJ i = i + 1
KRAJ`, 'too-many-steps');

// --- stepping and pausing --------------------------------------------------

{
  const { statements } = parsePseudocode(`POČETAK
UNESI a
ISPIŠI a
KRAJ`, 'bs');
  const m = new Interpreter(statements);
  const first = m.step();
  const paused = first.status === 'input' && first.awaiting === 'a';
  // Stepping while blocked must not advance past the prompt.
  const stillPaused = m.step().status === 'input';
  m.provideInput('7');
  const wrote = m.step();
  const landed = wrote.changed === 'a' && m.vars.get('a') === 7;
  const printed = m.step().printed === '7';
  if (paused && stillPaused && landed && printed) pass++;
  else {
    fail++;
    console.log(`FAIL  koračanje: paused=${paused} stillPaused=${stillPaused} landed=${landed} printed=${printed}`);
  }
}

{
  // A step carries the badge of the node it belongs to, which is what lets the
  // canvas highlight the shape that is running.
  const { statements } = parsePseudocode(`POČETAK
POSTAVI a = 1
ISPIŠI a
KRAJ`, 'bs');
  const m = new Interpreter(statements);
  const badges = [m.step().step, m.step().step];
  if (badges[0] === 2 && badges[1] === 3) pass++;
  else {
    fail++;
    console.log(`FAIL  oznake koraka => ${JSON.stringify(badges)}`);
  }
}

{
  // Reset has to clear the console and the variables, not just rewind.
  const { statements } = parsePseudocode(`POČETAK
POSTAVI a = 1
ISPIŠI a
KRAJ`, 'bs');
  const m = new Interpreter(statements);
  m.runToEnd();
  m.reset();
  if (m.output.length === 0 && m.vars.size === 0 && m.status === 'ready') pass++;
  else {
    fail++;
    console.log(`FAIL  reset => output=${m.output.length} vars=${m.vars.size} status=${m.status}`);
  }
}

// --- what a read value turned out to be ------------------------------------

{
  const { statements } = parsePseudocode(`POČETAK
UNESI a, ime
ISPIŠI a, ime
KRAJ`, 'bs');

  const kindsFor = (inputs: string[], m = new Interpreter(statements)) => {
    m.runToEnd(inputs);
    return m;
  };

  const whole = kindsFor(['5', 'Amina']);
  if (whole.readKinds.get('a') === 'cijeli' && whole.readKinds.get('ime') === 'tekst') pass++;
  else {
    fail++;
    console.log(`FAIL  vrste unosa: ${JSON.stringify([...whole.readKinds])}`);
  }

  // A second run with a decimal widens what the first run saw, and reset does
  // not throw the answer away — the Python tab would go back to guessing.
  whole.reset();
  whole.runToEnd(['2.5', 'Tarik']);
  if (whole.readKinds.get('a') === 'decimalni') pass++;
  else {
    fail++;
    console.log(`FAIL  decimalni unos ne prevlada: ${JSON.stringify([...whole.readKinds])}`);
  }

  whole.reset();
  whole.runToEnd(['7', 'Tarik']);
  if (whole.readKinds.get('a') === 'decimalni') pass++;
  else {
    fail++;
    console.log(`FAIL  cijeli unos suzio vrstu nazad: ${JSON.stringify([...whole.readKinds])}`);
  }
}

// --- agreement with the generated Python -----------------------------------

{
  // The two views must count the same way; this is the shape that would drift.
  const { statements } = parsePseudocode(`POČETAK
PONOVI 3 PUTA
  ISPIŠI "x"
KRAJ`, 'bs');
  const py = pythonSource(statementsToPython(statements));
  const usesRange = py.includes('for i in range(3):');
  {
    // Nesting, and a variable of the counter's own name in the way: the
    // generated file has to name the same variables the simulator sets.
    const nested = parsePseudocode(`POČETAK
POSTAVI i = 100
PONOVI 2 PUTA
  PONOVI 2 PUTA
    ISPIŠI i, j
KRAJ`, 'bs').statements;
    const code = pythonSource(statementsToPython(nested));
    if (code.includes('for i in range(2):') && code.includes('for j in range(2):')) pass++;
    else {
      fail++;
      console.log(`FAIL  imena brojača u Pythonu\n${code}`);
    }
  }
  const m = new Interpreter(statements);
  m.runToEnd();
  // range(3) leaves the counter at 2, and so must the simulator.
  const same = m.vars.get('i') === 2 && m.output.length === 3;
  if (usesRange && same) pass++;
  else {
    fail++;
    console.log(`FAIL  slaganje s Pythonom\n${py}\n${m.output.join(',')}`);
  }
}

// --- localised messages ----------------------------------------------------

{
  const { result } = run(`POČETAK
ISPIŠI zbir
KRAJ`);
  if (result.error) {
    console.log('bs:', describeRunError(result.error, 'bs'));
    console.log('de:', describeRunError(result.error, 'de'));
    console.log('en:', describeRunError(result.error, 'en'), `(red ${result.error.line}, korak ${result.error.step})`);
  }
}

console.log('\nprimjer tabele stanja:');
{
  const { machine } = run(`POČETAK
UNESI a
POSTAVI b = a * 2
ISPIŠI b
KRAJ`, ['5']);
  console.log('  ', [...machine.vars].map(([k, v]) => `${k}=${formatValue(v)}`).join(' '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
