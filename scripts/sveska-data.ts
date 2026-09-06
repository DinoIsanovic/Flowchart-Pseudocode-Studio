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
import { parsePseudocode } from '../src/core/flowchart-gen';
import { Interpreter } from '../src/core/interpreter';
import { TaskPack, text } from '../src/exercises/types';
import { blankedText, solutionText, tiles } from '../src/exercises/render';
import linijska from '../src/exercises/linijska.json';

const out = process.argv[2];
if (!out) throw new Error('usage: sveska-data.ts <izlazni.json>');

const pack = linijska as TaskPack;

const data = {
  topic: text(pack.title, 'bs'),
  tasks: pack.tasks.map((task) => {
    const solution = solutionText(task, 'bs');
    const { statements } = parsePseudocode(solution, 'bs');
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
      title: text(task.title, 'bs'),
      prompt: text(task.prompt, 'bs'),
      hint: task.hint ? text(task.hint, 'bs') : null,
      discussion: task.discussion ? text(task.discussion, 'bs') : null,
      solution,
      blanked: blankedText(task, 'bs'),
      tiles: tiles(task, 'bs'),
      interchangeable: task.interchangeable ?? [],
      distractors: (task.distractors ?? []).map((d) => solutionText({ ...task, solution: d }, 'bs')),
      results,
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
