/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for handing work in: `npm run check:submission`.
 *
 * Three things have to hold.
 *
 * The text survives the journey. A submission is built, written out, pasted
 * back the way a spreadsheet hands a cell over — quotes doubled, a timestamp
 * column beside it, several rows at once — and must come back as what went in.
 *
 * The marking is done again, not believed. Every task in the bank, in every
 * exercise it offers, is handed in twice: once correctly, which must be marked
 * right, and once wrongly, which must not. That is also what keeps the marking
 * here and the marking in the exercises panel from drifting apart — they mark
 * the same answers by the same rules, and this is where that is measured.
 *
 * The teacher's form is understood. A prefilled link is read back into which
 * box holds which answer, and the address built from it carries the form's own
 * parameters through untouched.
 */

import { Language } from '../src/types';
import { Task } from '../src/exercises/types';
import { PACKS } from '../src/exercises/packs';
import { solutionText, blanks, fillBlanks } from '../src/exercises/render';
import { regrade } from '../src/exercises/regrade';
import { traceTask } from '../src/exercises/trace';
import { plantCodeMistake } from '../src/exercises/mutate';
import { MistakeKind, mistakeFor, plantMistake } from '../src/exercises/plant';
import { buildFlowchart, parsePseudocode } from '../src/core/flowchart-gen';
import { Interpreter } from '../src/core/interpreter';
import {
  PREFILL_MAX,
  SIZE_WARN,
  Submission,
  buildSubmission,
  intact,
  parseSubmissions,
  submissionText,
} from '../src/core/submission';
import { configFromSearch, configLink, parseFormLink, submitUrl } from '../src/core/form-link';

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = '') {
  if (condition) {
    pass++;
    return;
  }
  fail++;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
}

const STUDENT = { first: 'Amina', last: 'Hodžić', class: '7-2', number: 12 };

function submissionFor(task: Task, type: string, lang: Language, correct: boolean): Submission {
  const solution = solutionText(task, lang);
  const answer: Submission['answer'] = {};

  if (type === 'prepoznaj') {
    const { statements } = parsePseudocode(solution, lang);
    answer.values = task.tests.map((inputs) => {
      const machine = new Interpreter(statements);
      machine.runToEnd(inputs);
      return correct ? machine.output.join(' / ') : 'ništa';
    });
  } else if (type === 'tabela') {
    const trace = traceTask(task, lang, task.tests[0] ?? []);
    answer.values = trace.rows.map((row) => (correct ? row.answer : 'x'));
  } else if (type === 'greska') {
    const broken = plantCodeMistake(task, lang);
    answer.pick = String(correct ? broken?.line ?? 0 : (broken?.line ?? 0) + 1);
  } else if (type === 'dijagram-greska') {
    const { statements } = parsePseudocode(solution, lang);
    const built = buildFlowchart(statements, lang);
    const planted = plantMistake(built.nodes, built.edges, (task.mistake as MistakeKind) ?? mistakeFor(task.id));
    const other = built.nodes.find((n) => !planted.answerIds.includes(n.id));
    answer.pick = correct ? planted.answerIds[0] : other?.id ?? 'nema';
  } else if (type === 'nacrtaj') {
    const { statements } = parsePseudocode(solution, lang);
    const built = buildFlowchart(statements, lang);
    answer.diagram = correct
      ? built
      : { nodes: built.nodes, edges: built.edges.slice(0, Math.max(0, built.edges.length - 1)) };
  } else if (type === 'dopuni') {
    const wanted = blanks(task, lang).map((b) => b.answer);
    answer.code = fillBlanks(task, lang, correct ? wanted : wanted.map(() => '0'));
  } else {
    // 'kockice' assembles the solution's own lines; 'samostalno' is written out.
    answer.code = correct ? solution : solution.split('\n').reverse().join('\n');
  }

  return buildSubmission({
    app: '0.19.0',
    lang,
    student: STUDENT,
    task: { id: task.id, topic: task.topic, type, title: 'zadatak' },
    answer,
    at: '2026-09-12T10:30Z',
  });
}

// --- the text survives the journey -----------------------------------------

{
  const task = PACKS[0].tasks[0];
  const sub = submissionFor(task, 'samostalno', 'bs', true);
  const text = submissionText(sub);

  ok('jedan red teksta', !text.includes('\n'), JSON.stringify(text.slice(0, 60)));
  ok('čita se nazad', parseSubmissions(text).found.length === 1);
  ok('kontrolni kod se slaže', intact(parseSubmissions(text).found[0]));

  // A cell out of a spreadsheet: quotes doubled, the form's own timestamp in
  // the column before it, and three of them at once.
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const sheet = [
    'Timestamp\tIme\tPrezime\tZadatak',
    `12/09/2026 10:31:02\tAmina\tHodžić\t${cell(text)}`,
    `12/09/2026 10:33:41\tEmir\tBegić\t${cell(submissionText(submissionFor(PACKS[0].tasks[1], 'samostalno', 'bs', true)))}`,
    `12/09/2026 10:35:10\tLejla\tKovač\t${cell(submissionText(submissionFor(PACKS[1].tasks[0], 'kockice', 'hr', true)))}`,
  ].join('\n');
  const fromSheet = parseSubmissions(sheet);
  ok('tri predaje iz tabele', fromSheet.found.length === 3, `našlo ${fromSheet.found.length}`);
  ok('tabela ne kvari sadržaj', fromSheet.found.every(intact));

  // The same student, the same task, handed in twice.
  const again = buildSubmission({
    app: '0.19.0',
    lang: 'bs',
    student: STUDENT,
    task: { id: task.id, topic: task.topic, type: 'samostalno', title: 'zadatak' },
    answer: { code: solutionText(task, 'bs') },
    at: '2026-09-12T11:00Z',
  });
  const twice = parseSubmissions(`${text}\n${submissionText(again)}`);
  ok('novija predaja stoji', twice.found.length === 1 && twice.found[0].at === '2026-09-12T11:00Z');
  ok('ranija je izbrojana', twice.superseded === 1);

  // An answer edited after the fact no longer adds up.
  const tampered = { ...sub, answer: { code: 'POČETAK\nKRAJ' } };
  ok('prepravljen odgovor se vidi', !intact(tampered));

  // Junk around and between submissions is passed over.
  const messy = `predaje za srijedu\n\n${text}\n\n{ "nije": "predaja" }\n{ nije ni JSON \n${submissionText(again)}`;
  ok('smeće okolo ne smeta', parseSubmissions(messy).found.length === 1);
}

// --- the marking is done again ---------------------------------------------

const LANGS: Language[] = ['bs', 'hr', 'en', 'de'];
const IN_APP = ['kockice', 'dopuni', 'prepoznaj', 'greska', 'tabela', 'samostalno', 'nacrtaj', 'dijagram-greska'];

let marked = 0;
for (const pack of PACKS) {
  for (const task of pack.tasks) {
    const lang = LANGS[task.level % LANGS.length];
    const canBreak = plantCodeMistake(task, lang) !== null;
    for (const type of task.types.filter((x) => IN_APP.includes(x) && (x !== 'greska' || canBreak))) {
      const right = regrade(submissionFor(task, type, lang, true));
      ok(`${task.id} ${type} (${lang}) tačno`, right.result?.correct === true,
        right.result ? `${right.result.reason ?? ''} ${right.result.message ?? ''}` : 'bez ocjene');

      const wrong = regrade(submissionFor(task, type, lang, false));
      ok(`${task.id} ${type} (${lang}) netačno`, wrong.result?.correct === false);
      marked += 2;
    }
  }
}

// Work from the canvas has no task behind it and comes back unmarked.
{
  const free = buildSubmission({
    app: '0.19.0',
    lang: 'bs',
    student: STUDENT,
    task: { id: null, title: 'moj dijagram' },
    answer: { code: 'POČETAK\nISPIŠI "zdravo"\nKRAJ' },
  });
  const read = regrade(free);
  ok('slobodan rad nema ocjenu', read.result === null && read.task === null);
}

// --- the teacher's form ----------------------------------------------------

{
  const prefilled =
    'https://docs.google.com/forms/d/e/1FAIpQLSxxxx/viewform?usp=pp_url' +
    '&entry.111=IME&entry.222=PREZIME&entry.333=Odjeljenje&entry.444=BROJ&entry.555=ZADATAK';
  const { link, missing } = parseFormLink(prefilled);
  ok('veza je pročitana', !!link);
  ok('polja su prepoznata', link?.fields.first === 'entry.111' && link?.fields.payload === 'entry.555');
  ok('grupa nedostaje i to se zna', missing.includes('group') && !missing.includes('class'));

  const url = new URL(submitUrl(link!, { first: 'Amina', last: 'Hodžić', class: '7-2', number: 12, payload: '{"v":1}' }));
  ok('forma dobija svoje parametre nazad', url.searchParams.get('usp') === 'pp_url');
  ok('ime je upisano', url.searchParams.get('entry.111') === 'Amina');
  ok('prezime s dijakritikom', url.searchParams.get('entry.222') === 'Hodžić');
  ok('paket je upisan', url.searchParams.get('entry.555') === '{"v":1}');
  ok('nepoznato polje se ne izmišlja', url.searchParams.get('entry.999') === null);

  // A form made in German, and one box left unmarked.
  const german = parseFormLink('https://forms.example.org/f/1?a=VORNAME&b=NACHNAME&c=AUFGABE');
  ok('njemačka forma', german.link?.fields.last === 'b' && german.link?.fields.payload === 'c');

  ok('nije veza', parseFormLink('ovo nije veza').reason === 'no-url');
  ok('veza bez polja', parseFormLink('https://example.org/form?x=1').reason === 'no-fields');

  const shared = configLink('https://dino.example/studio/?nesto=1', prefilled);
  ok('veza za razred vodi nazad na formu', configFromSearch(new URL(shared).search) === prefilled);
}

// --- size ------------------------------------------------------------------

{
  const sizes = PACKS.flatMap((pack) =>
    pack.tasks.map((task) => submissionText(submissionFor(task, 'samostalno', 'bs', true)).length)
  );
  const drawn = PACKS.flatMap((pack) =>
    pack.tasks.filter((t) => t.types.includes('nacrtaj')).map((task) => submissionText(submissionFor(task, 'nacrtaj', 'bs', true)).length)
  );
  const biggest = Math.max(...sizes);
  const biggestDrawn = drawn.length ? Math.max(...drawn) : 0;

  ok(`napisan odgovor staje u vezu (${biggest} < ${PREFILL_MAX})`, biggest < PREFILL_MAX);
  ok(`crtež staje u polje forme (${biggestDrawn} < ${SIZE_WARN})`, biggestDrawn < SIZE_WARN);
  console.log(`\nveličina predaje: napisan odgovor do ${biggest} znakova, s crtežom do ${biggestDrawn}`);
}

console.log(`\n${marked} predaja ocijenjeno ponovo`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
