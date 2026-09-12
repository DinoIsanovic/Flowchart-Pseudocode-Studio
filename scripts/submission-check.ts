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
import { configFromSearch, configLink, parseFormLink, responseUrl, submitFields, submitUrl } from '../src/core/form-link';
import { fieldOfTitle, learnForm, parseFormPage } from '../src/core/form-page';
import { readFileSync } from 'node:fs';

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

const STUDENT = { first: 'Amina', last: 'Hodžić', class: '7-2', number: 12, code: 'M4K7' };

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

  // The code a student was given travels with the work and is part of what
  // the checksum covers, so a name swapped for another's does not go unnoticed.
  ok('šifra učenika putuje', parseSubmissions(text).found[0].student.code === 'M4K7');
  ok('zamijenjena šifra se vidi', !intact({ ...sub, student: { ...sub.student, code: 'X9Z1' } }));

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
    '&entry.111=IME&entry.222=PREZIME&entry.333=Odjeljenje&entry.444=BROJ&entry.555=ZADATAK&entry.666=Kod zadatka';
  const { link, missing } = parseFormLink(prefilled);
  ok('veza je pročitana', !!link);
  ok('polja su prepoznata', link?.fields.first === 'entry.111' && link?.fields.payload === 'entry.555');
  ok('grupa nedostaje i to se zna', missing.includes('group') && !missing.includes('class'));
  // A column of its own for the check code, named in two words on a real form.
  ok('kod zadatka je svoje polje', link?.fields.code === 'entry.666');

  // Two boxes whose names both begin with „kod": only the order of the fields
  // keeps the student's code and the check code apart.
  const both = parseFormLink(
    'https://docs.google.com/forms/d/e/A/viewform?entry.7=Kod ucenika&entry.8=Kod zadatka'
  ).link;
  ok('šifra i kontrolni kod se ne miješaju',
    both?.fields.pupil === 'entry.7' && both?.fields.code === 'entry.8',
    JSON.stringify(both?.fields));

  const url = new URL(submitUrl(link!, { first: 'Amina', last: 'Hodžić', class: '7-2', number: 12, payload: '{"v":1}', code: 'K7F2' }));
  ok('forma dobija svoje parametre nazad', url.searchParams.get('usp') === 'pp_url');
  ok('ime je upisano', url.searchParams.get('entry.111') === 'Amina');
  ok('prezime s dijakritikom', url.searchParams.get('entry.222') === 'Hodžić');
  ok('paket je upisan', url.searchParams.get('entry.555') === '{"v":1}');
  ok('kod ide u svoju kolonu', url.searchParams.get('entry.666') === 'K7F2');
  ok('nepoznato polje se ne izmišlja', url.searchParams.get('entry.999') === null);

  // The shape a real Google form turned out to have, checked on 2026-09-12
  // against „Zadaća Algoritmi": seven boxes, every one of them recognised.
  const real = parseFormLink(
    'https://docs.google.com/forms/d/e/1FAIpQLSeTYvi_Yj3SbaE0C9nLw-o7Mf5uRBVmXpvRd0tI2HzBwN4E1A/viewform?usp=pp_url' +
      '&entry.1419049343=IME&entry.286611330=PREZIME&entry.1345909731=ODJELJENJE' +
      '&entry.331646779=GRUPA&entry.1033426925=BROJ&entry.117213090=ZADATAK&entry.308089101=KOD'
  );
  // Everything that form has is recognised. It has no box for a pupil's own
  // code — it was made before there was one — and a box the form does not have
  // is not a box the app failed to find.
  ok('prava forma: sva polja prepoznata', real.missing.join(',') === 'pupil', real.missing.join(', '));
  ok('prava forma: odgovor u svoje polje', real.link?.fields.payload === 'entry.117213090');

  // A form made in German, and one box left unmarked.
  const german = parseFormLink('https://forms.example.org/f/1?a=VORNAME&b=NACHNAME&c=AUFGABE');
  ok('njemačka forma', german.link?.fields.last === 'b' && german.link?.fields.payload === 'c');

  ok('nije veza', parseFormLink('ovo nije veza').reason === 'no-url');
  ok('veza bez polja', parseFormLink('https://example.org/form?x=1').reason === 'no-fields');

  const shared = configLink('https://dino.example/studio/?nesto=1', prefilled);
  ok('veza za razred vodi nazad na formu', configFromSearch(new URL(shared).search) === prefilled);
}

// --- posting it instead of opening it ---------------------------------------

{
  const google = parseFormLink(
    'https://docs.google.com/forms/d/e/ABC/viewform?usp=pp_url&entry.1=IME&entry.2=ZADATAK'
  ).link!;
  ok('adresa za slanje', responseUrl(google) === 'https://docs.google.com/forms/d/e/ABC/formResponse');

  const other = parseFormLink('https://forms.example.org/f/1?a=IME&b=ZADATAK').link!;
  ok('tuđa forma se ne pogađa', responseUrl(other) === null);

  // A posted field is not a query string: the whole submission goes, however
  // big, which is the point of posting it.
  const big = 'x'.repeat(PREFILL_MAX * 2);
  const posted = submitFields(google, { first: 'Amina', payload: big });
  ok('cijela predaja ide u POST', posted.some(([, v]) => v === big));
  ok('parametri forme idu s njom', posted.some(([n, v]) => n === 'usp' && v === 'pp_url'));
}

// --- reading a form's own page ----------------------------------------------

{
  const page = readFileSync('scripts/fixtures/google-form.html', 'utf8');
  const questions = parseFormPage(page);
  ok('osam pitanja pročitano', questions.length === 8, `našlo ${questions.length}`);
  ok('brojevi polja', questions[1].entry === 'entry.1419049343' && questions[1].field === 'first');
  ok('obavezno se vidi', questions[1].required && !questions[6].required);
  ok('dugi odgovor se vidi', questions[6].kind === 1 && questions[6].field === 'payload');

  const learned = learnForm('https://docs.google.com/forms/d/e/XYZ/viewform?usp=publish-editor', page);
  ok('naučena veza postoji', !!learned.prefilled);
  ok('ništa ne blokira predaju', learned.blocking.length === 0);
  ok('polje za odgovor je dugo', !learned.shortAnswerBox);

  // What was learnt has to be exactly what a pre-filled link would have said.
  const { missing } = parseFormLink(learned.prefilled!);
  ok('naučena veza pokriva sva polja forme', missing.join(',') === 'pupil', missing.join(', '));

  // A form that does have one: the box is read and the two codes stay apart.
  const withPin = learnForm(
    'https://docs.google.com/forms/d/e/A/viewform',
    '<script>FB_PUBLIC_LOAD_DATA_ = [null,[null,[[1,"Ime",null,0,[[11,null,1]]],[2,"Šifra",null,0,[[12,null,1]]],[3,"Zadatak",null,1,[[13,null,0]]],[4,"Kod zadatka",null,0,[[14,null,0]]]]]];</script>'
  );
  const pinned = parseFormLink(withPin.prefilled!).link;
  ok('forma sa šifrom učenika', pinned?.fields.pupil === 'entry.12' && pinned?.fields.code === 'entry.14',
    JSON.stringify(pinned?.fields));

  // Titles a teacher actually writes.
  ok('naslovi pitanja → polja',
    fieldOfTitle('Broj u dnevniku') === 'number' &&
    fieldOfTitle('Kod zadatka') === 'code' &&
    fieldOfTitle('Zadatak') === 'payload' &&
    fieldOfTitle('Algoritmi') === null);

  // A form that would refuse every submission, and one that would cut it.
  const shaped = (kind: number, required: boolean) =>
    `<script>FB_PUBLIC_LOAD_DATA_ = [null,[null,[[1,"Datum",null,9,[[11,null,${required ? 1 : 0}]]],[2,"Ime",null,0,[[12,null,1]]],[3,"Zadatak",null,${kind},[[13,null,0]]]]]];</script>`;
  const refusing = learnForm('https://docs.google.com/forms/d/e/A/viewform', shaped(1, true));
  ok('obavezno pitanje koje ne umijemo popuniti se prijavljuje',
    refusing.blocking.length === 1 && refusing.blocking[0].title === 'Datum');
  const cutting = learnForm('https://docs.google.com/forms/d/e/A/viewform', shaped(0, false));
  ok('kratko polje za odgovor se prijavljuje', cutting.shortAnswerBox);

  ok('stranica bez podataka ne izmišlja', parseFormPage('<html><body>ništa</body></html>').length === 0);
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
