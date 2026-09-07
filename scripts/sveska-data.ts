/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dumps everything the printable workbook needs into JSON, so the document
 * generator never has to know about keyword tokens, blanks or the interpreter:
 * `npm run sveska` runs this and then builds the .docx from what it wrote.
 */

import { writeFileSync } from 'node:fs';
import { buildFlowchart, parsePseudocode } from '../src/core/flowchart-gen';
import { Interpreter } from '../src/core/interpreter';
import { Language } from '../src/types';
import { CROATIAN_WORDS } from '../src/i18n/croatian';
import { TaskPack, text } from '../src/exercises/types';
import { blankedText, solutionText, tiles } from '../src/exercises/render';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';

const out = process.argv[2];
if (!out) throw new Error('usage: sveska-data.ts <izlazni.json> [tema]');

const PACKS: Record<string, TaskPack> = {
  linijska: linijska as TaskPack,
  grananje: grananje as TaskPack,
};

const topic = process.argv[3] ?? 'linijska';
// The workbook's own prose is written in Bosnian; Croatian reads it through
// the same variant map the app uses, handed over with the data so the two can
// never drift apart.
const lang = (process.argv[4] ?? 'bs') as Language;
if (lang !== 'bs' && lang !== 'hr') throw new Error('sveska postoji na bs i hr');
const pack = PACKS[topic];
if (!pack) throw new Error(`nepoznata tema "${topic}" — postoje: ${Object.keys(PACKS).join(', ')}`);

const data = {
  lang,
  words: lang === 'hr' ? CROATIAN_WORDS : {},
  topic: text(pack.title, lang),
  tasks: pack.tasks.map((task) => {
    const solution = solutionText(task, lang);
    const { statements } = parsePseudocode(solution, lang);
    const results = task.tests.map((inputs) => {
      const machine = new Interpreter(statements);
      machine.runToEnd(inputs);
      return { inputs, output: machine.output };
    });
    return {
      level: task.level,
      id: task.id,
      kind: task.kind,
      types: task.types,
      title: text(task.title, lang),
      prompt: text(task.prompt, lang),
      hint: task.hint ? text(task.hint, lang) : null,
      discussion: task.discussion ? text(task.discussion, lang) : null,
      solution,
      blanked: blankedText(task, lang),
      tiles: tiles(task, lang).map((tile) => ({ text: tile.text, level: tile.level })),
      interchangeable: task.interchangeable ?? [],
      distractors: (task.distractors ?? []).map((d) => solutionText({ ...task, solution: d }, lang)),
      results,
      /**
       * The laid-out diagram, so the workbook can print the solution as a
       * drawing and not only as text. A student working alone has nothing to
       * compare their own drawing against otherwise.
       */
      diagram: (() => {
        const { nodes, edges } = buildFlowchart(statements, lang);
        return {
          nodes: nodes.map((n) => ({ id: n.id, type: n.type, x: n.x, y: n.y, w: n.w, h: n.h, text: n.text })),
          edges: edges.map((e) => ({ from: e.from, to: e.to, label: e.label ?? '' })),
        };
      })(),
      /** Variables the state-table exercise gets columns for. */
      vars: (() => {
        const machine = new Interpreter(statements);
        machine.runToEnd(task.tests[0] ?? []);
        return [...machine.vars.keys()];
      })(),
      /**
       * Which variable each input answers, in order, so the worksheet can say
       * "za a = 12, b = 5" instead of leaving the reader to guess.
       */
      inputVars: (() => {
        const machine = new Interpreter(statements);
        const names: string[] = [];
        const inputs = task.tests[0] ?? [];
        let next = 0;
        for (;;) {
          const step = machine.step();
          if (step.status === 'input') {
            if (step.awaiting) names.push(step.awaiting);
            if (next >= inputs.length) break;
            machine.provideInput(inputs[next++]);
            continue;
          }
          if (step.status === 'done' || step.status === 'error') break;
        }
        return names;
      })(),
    };
  }),
};

writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`zapisano ${data.tasks.length} zadataka u ${out}`);
