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

import { Language } from '../src/types';
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

const tasks = PACKS.reduce((n, p) => n + p.tasks.length, 0);
console.log(`\n${tasks} zadataka × ${LANGS.length} jezika kroz dijagram i nazad`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
