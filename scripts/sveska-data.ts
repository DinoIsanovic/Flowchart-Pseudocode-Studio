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
import { pythonSource, statementsToPython } from '../src/core/python-gen';
import { Interpreter } from '../src/core/interpreter';
import { TaskPack, text } from '../src/exercises/types';
import { blankedText, solutionText, tiles } from '../src/exercises/render';
import { traceTask } from '../src/exercises/trace';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';
import petlje from '../src/exercises/petlje.json';

const out = process.argv[2];
if (!out) throw new Error('usage: sveska-data.ts <izlazni.json>');

// Every pack, in teaching order: the workbook is one book with a part for each
// topic, not three books.
const PACKS: TaskPack[] = [linijska as TaskPack, grananje as TaskPack, petlje as TaskPack];

const dump = (pack: TaskPack) => ({
  topic: pack.topic,
  title: text(pack.title, 'bs'),
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
      tiles: tiles(task, 'bs').map((tile) => ({ text: tile.text, level: tile.level })),
      interchangeable: task.interchangeable ?? [],
      distractors: (task.distractors ?? []).map((d) => solutionText({ ...task, solution: d }, 'bs')),
      results,
      /**
       * The same algorithm as Python, for the solutions at the back: a student
       * who has drawn the diagram should see what the program they drew looks
       * like in a language a computer runs.
       */
      python: pythonSource(statementsToPython(statements, 'bs')),
      /**
       * The laid-out diagram, so the workbook can print the solution as a
       * drawing and not only as text. A student working alone has nothing to
       * compare their own drawing against otherwise.
       */
      diagram: (() => {
        const { nodes, edges } = buildFlowchart(statements, 'bs');
        return {
          nodes: nodes.map((n) => ({ id: n.id, type: n.type, x: n.x, y: n.y, w: n.w, h: n.h, text: n.text })),
          edges: edges.map((e) => ({ from: e.from, to: e.to, label: e.label ?? '' })),
        };
      })(),
      /**
       * The grid the state-table exercise is printed as: a column per variable,
       * a column for the condition when the program branches, and a row per
       * step the student fills in. It comes from the same trace the app grades,
       * so the printed table and the screen cannot disagree about the shape of
       * the answer.
       */
      trace: (() => {
        const traced = traceTask(task, 'bs', task.tests[0] ?? []);
        return {
          columns: traced.columns,
          hasCondition: traced.hasCondition,
          rows: traced.rows.length,
        };
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
});

const data = { parts: PACKS.map(dump) };
const total = data.parts.reduce((n, part) => n + part.tasks.length, 0);

writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`zapisano ${total} zadataka u ${data.parts.length} dijela u ${out}`);
