/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the way back out of a diagram: `npm run check:roundtrip`.
 *
 * The app generates a flowchart from pseudocode and pseudocode from a
 * flowchart, and the two have to agree. Draw a correct algorithm and read it
 * back, and what comes out must still be that algorithm — otherwise
 * `Generiši pseudokod` quietly rewrites the student's work, and any exercise
 * that marks a drawing marks it against a text the student never wrote.
 *
 * Every authored solution is taken through the full circle in every language:
 *
 *   pseudocode -> statements -> diagram -> pseudocode -> run
 *
 * and the program that comes out the far end must pass the same marking the
 * student's own answer would. Line-for-line equality is deliberately not the
 * test: the generator is free to spell a step differently as long as the
 * algorithm still does what it did.
 */

import { FlowNode, Language } from '../src/types';
import { TaskPack } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { buildFlowchart, diagramToPseudocode, parsePseudocode } from '../src/core/flowchart-gen';
import { checkDiagram, describeDiagramIssue } from '../src/core/diagram-check';
import { gradeWritten, describeGrade } from '../src/exercises/grade';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';
import petlje from '../src/exercises/petlje.json';

let pass = 0;
let fail = 0;

const LANGS: Language[] = ['bs', 'hr', 'en', 'de'];
const PACKS = [linijska, grananje, petlje] as TaskPack[];

for (const pack of PACKS) {
  for (const task of pack.tasks) {
    for (const lang of LANGS) {
      const solution = solutionText(task, lang);
      const { statements, errors } = parsePseudocode(solution, lang);
      if (errors.length) {
        fail++;
        console.log(`FAIL  ${task.id} [${lang}] — rješenje ne parsira: ${errors[0].message}`);
        continue;
      }

      const { nodes, edges } = buildFlowchart(statements, lang);
      const issues = checkDiagram(nodes, edges);
      if (issues.length) {
        fail++;
        console.log(`FAIL  ${task.id} [${lang}] — dijagram rješenja nije čist: ${describeDiagramIssue(issues[0], lang)}`);
        continue;
      }

      const back = diagramToPseudocode(nodes, edges, lang);

      // A loop the generator cannot close comes back as the body repeated
      // until its guard runs out, which reads as a plausible program and is
      // caught here only because it is far too long.
      const grew = back.split('\n').length > solution.split('\n').length * 2 + 4;
      if (grew) {
        fail++;
        console.log(
          `FAIL  ${task.id} [${lang}] — povratak narastao s ${solution.split('\n').length} na ${back.split('\n').length} linija (petlja se ne zatvara?)`
        );
        continue;
      }

      const result = gradeWritten(task, back, lang);
      if (result.correct) {
        pass++;
      } else {
        fail++;
        console.log(`FAIL  ${task.id} [${lang}] — pročitan nazad, ne prolazi: ${describeGrade(result, lang)}`);
        console.log(`      dobiveno:\n${back.split('\n').map((l) => '        ' + l).join('\n')}`);
      }
    }
  }
}

// --- a drawing carries less than a generated diagram -----------------------

/**
 * What a student's own drawing would not have. `buildFlowchart` stamps every
 * shape with the step badge it wears in the pseudocode, and gives a count loop
 * a hidden counter name. A student dragging shapes out of a palette produces
 * neither, so a marker that leaned on them would pass the reference diagram
 * and fail every real answer.
 */
function asDrawn(node: FlowNode): FlowNode {
  const copy = { ...(node as FlowNode & { step?: number; counter?: string }) };
  delete copy.step;
  delete copy.counter;
  return copy as FlowNode;
}

let drawable = 0;
for (const pack of PACKS) {
  for (const task of pack.tasks) {
    if (!task.types.includes('nacrtaj')) continue;
    drawable++;
    for (const lang of LANGS) {
      const { statements } = parsePseudocode(solutionText(task, lang), lang);
      const built = buildFlowchart(statements, lang);
      const nodes = built.nodes.map(asDrawn);

      const issues = checkDiagram(nodes, built.edges);
      if (issues.length) {
        fail++;
        console.log(`FAIL  ${task.id} [${lang}] — crtež bez oznaka pada na strukturi: ${describeDiagramIssue(issues[0], lang)}`);
        continue;
      }
      const result = gradeWritten(task, diagramToPseudocode(nodes, built.edges, lang), lang);
      if (result.correct) {
        pass++;
      } else {
        fail++;
        console.log(`FAIL  ${task.id} [${lang}] — crtež bez oznaka ne prolazi: ${describeGrade(result, lang)}`);
      }
    }
  }
}

// --- which word the rectangle carries --------------------------------------

/**
 * POSTAVI and RAČUNAJ are one block, and the word follows what stands on the
 * right of the `=`: a value that is simply put into a variable against one
 * that has to be worked out. The block says it, and reading the block back
 * says the same — including when the student typed the other word.
 */
const words: [Language, string, string, string][] = [
  ['bs', 'POSTAVI a = 5', 'postavi a = 5', 'POSTAVI a = 5'],
  ['bs', 'RAČUNAJ a = 5', 'postavi a = 5', 'POSTAVI a = 5'],
  ['bs', 'POSTAVI a = najveći', 'postavi a = najveći', 'POSTAVI a = najveći'],
  ['bs', 'POSTAVI ime = "Ana"', 'postavi ime = "Ana"', 'POSTAVI ime = "Ana"'],
  ['bs', 'POSTAVI a = -5', 'postavi a = -5', 'POSTAVI a = -5'],
  ['bs', 'POSTAVI a = b + c', 'računaj a = b + c', 'RAČUNAJ a = b + c'],
  ['bs', 'RAČUNAJ a = 3 + 5', 'računaj a = 3 + 5', 'RAČUNAJ a = 3 + 5'],
  ['bs', 'RAČUNAJ d = int(n / 10)', 'računaj d = int(n / 10)', 'RAČUNAJ d = int(n / 10)'],
  ['en', 'SET a = 5', 'set a = 5', 'SET a = 5'],
  ['en', 'SET total = a + b', 'calculate total = a + b', 'CALCULATE total = a + b'],
  ['de', 'BERECHNE a = 5', 'setze a = 5', 'SETZE a = 5'],
  ['de', 'SETZE summe = a + b', 'berechne summe = a + b', 'BERECHNE summe = a + b'],
];

for (const [lang, line, block, back] of words) {
  const start = lang === 'bs' ? 'POČETAK' : 'START';
  const end = lang === 'de' ? 'ENDE' : lang === 'bs' ? 'KRAJ' : 'END';
  const { statements, errors } = parsePseudocode(`${start}\n${line}\n${end}`, lang);
  if (errors.length) {
    fail++;
    console.log(`FAIL  ${line} [${lang}] — ne parsira: ${errors[0].message}`);
    continue;
  }
  const built = buildFlowchart(statements, lang);
  const drawn = built.nodes.find((n: FlowNode) => n.type === 'process')?.text ?? '';
  const read = diagramToPseudocode(built.nodes, built.edges, lang).split('\n')[1]?.trim() ?? '';
  if (drawn === block && read === back) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${line} [${lang}] — blok "${drawn}" (očekivano "${block}"), nazad "${read}" (očekivano "${back}")`);
  }
}

const tasks = PACKS.reduce((n, p) => n + p.tasks.length, 0);
console.log(`\n${tasks} zadataka × ${LANGS.length} jezika kroz dijagram i nazad`);
console.log(`${drawable} zadataka nudi „nacrtaj sam" — provjereni i bez oznaka koje crtež nema`);
console.log(`${words.length} pravougaonika provjereno na riječ koju nose`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
