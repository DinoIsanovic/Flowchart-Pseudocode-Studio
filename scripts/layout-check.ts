/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the generated layout: `npm run check:layout`.
 *
 * A generated flowchart must be readable as drawn, which at a minimum means
 * no two blocks may sit on top of each other. They did: the two branches of a
 * decision are drawn a fixed step apart, and a branch that closed inside a
 * branch put its last block exactly where its cousin already was
 * (`grananje-najveci`, both `najveci = c` and `najveci = b` at 600,685), so
 * one of the two was invisible on the canvas.
 *
 * The lines are measured too: a connector that runs straight through a block
 * it has nothing to do with is just as unreadable, which is what the handover
 * from a branch to whatever follows the decision used to do — it left
 * sideways at its own height and crossed the other branch.
 *
 * Every authored solution is drawn in every language, together with the app's
 * own templates and a few deliberately deep nests; every pair of blocks is
 * measured, and every line against every block it does not touch.
 */

import { FlowEdge, FlowNode, Language } from '../src/types';
import { TaskPack } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import { buildFlowchart, orthogonalRoute, parsePseudocode } from '../src/core/flowchart-gen';
import { TEMPLATE_CODE } from '../src/i18n/keywords';
import linijska from '../src/exercises/linijska.json';
import grananje from '../src/exercises/grananje.json';
import petlje from '../src/exercises/petlje.json';

let pass = 0;
let fail = 0;

const LANGS: Language[] = ['bs', 'hr', 'en', 'de'];
const PACKS = [linijska, grananje, petlje] as TaskPack[];

/** Blocks that share any area, in the order they are drawn. */
function overlaps(nodes: FlowNode[]): [FlowNode, FlowNode][] {
  const hits: [FlowNode, FlowNode][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
        hits.push([a, b]);
      }
    }
  }
  return hits;
}

/**
 * Lines that run through a block that is neither their source nor their
 * target. The box is shrunk a little first: a line is allowed to graze a
 * corner, and the check routes with the plain side points while the canvas
 * meets the drawn outline of a diamond.
 */
function crossings(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const INSET = 8;
  const hits: string[] = [];

  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const pts = orthogonalRoute(a, b, e.waypoints);

    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const segMinX = Math.min(p.x, q.x), segMaxX = Math.max(p.x, q.x);
      const segMinY = Math.min(p.y, q.y), segMaxY = Math.max(p.y, q.y);

      for (const n of nodes) {
        if (n.id === a.id || n.id === b.id) continue;
        const l = n.x - n.w / 2 + INSET, r = n.x + n.w / 2 - INSET;
        const t = n.y - n.h / 2 + INSET, bt = n.y + n.h / 2 - INSET;
        if (segMaxX > l && segMinX < r && segMaxY > t && segMinY < bt) {
          hits.push(`"${a.text}" → "${b.text}" prolazi kroz "${n.text}"`);
        }
      }
    }
  }
  return hits;
}

function check(name: string, code: string, lang: Language) {
  const { statements, errors } = parsePseudocode(code, lang);
  if (errors.length) {
    fail++;
    console.log(`FAIL  ${name} [${lang}] — ne parsira: ${errors[0].message}`);
    return;
  }
  const { nodes, edges } = buildFlowchart(statements, lang);
  const hits = overlaps(nodes);
  const crossed = crossings(nodes, edges);
  if (!hits.length && !crossed.length) {
    pass++;
    return;
  }
  fail++;
  if (hits.length) {
    console.log(`FAIL  ${name} [${lang}] — blokovi se preklapaju:`);
    hits.forEach(([a, b]) =>
      console.log(`        "${a.text}" (${a.x},${a.y}) × "${b.text}" (${b.x},${b.y})`)
    );
  }
  if (crossed.length) {
    console.log(`FAIL  ${name} [${lang}] — veza prolazi kroz blok:`);
    [...new Set(crossed)].forEach((h) => console.log(`        ${h}`));
  }
}

for (const pack of PACKS) {
  for (const task of pack.tasks) {
    for (const lang of LANGS) {
      check(task.id, solutionText(task, lang), lang);
    }
  }
}

for (const lang of LANGS) {
  const templates = TEMPLATE_CODE[lang];
  (Object.keys(templates) as (keyof typeof templates)[]).forEach((key) => {
    check(`šablon ${key}`, templates[key], lang);
  });
}

// --- deep nests, which is where the fixed step between branches runs out ----

const NESTS: Record<string, string> = {
  'grana u obje grane': `POČETAK
UNESI a, b, c
AKO JE a >= b
  DA
    AKO JE a >= c
      DA
        RAČUNAJ najveci = a
      INAČE
        RAČUNAJ najveci = c
  INAČE
    AKO JE b >= c
      DA
        RAČUNAJ najveci = b
      INAČE
        RAČUNAJ najveci = c
ISPIŠI najveci
KRAJ`,
  'tri nivoa duboko': `POČETAK
UNESI a
AKO JE a > 0
  DA
    AKO JE a > 10
      DA
        AKO JE a > 100
          DA
            ISPIŠI "veliko"
          INAČE
            ISPIŠI "srednje"
      INAČE
        ISPIŠI "malo"
  INAČE
    AKO JE a < -10
      DA
        ISPIŠI "jako negativno"
      INAČE
        ISPIŠI "negativno"
KRAJ`,
  'petlja u obje grane': `POČETAK
UNESI n
AKO JE n > 0
  DA
    PONOVI n PUTA
      ISPIŠI "plus"
  INAČE
    PONOVI 3 PUTA
      ISPIŠI "minus"
KRAJ`,
  'grananje u petlji': `POČETAK
UNESI n
PONOVI n PUTA
  AKO JE n > 5
    DA
      AKO JE n > 10
        DA
          ISPIŠI "puno"
        INAČE
          ISPIŠI "srednje"
    INAČE
      ISPIŠI "malo"
KRAJ`,
};

for (const [name, code] of Object.entries(NESTS)) {
  check(name, code, 'bs');
}

const tasks = PACKS.reduce((n, p) => n + p.tasks.length, 0);
console.log(`\n${tasks} zadataka × ${LANGS.length} jezika, šabloni i ${Object.keys(NESTS).length} ugniježđena slučaja`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
