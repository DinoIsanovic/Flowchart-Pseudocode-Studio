/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-check for the diagram checker: `npm run check:diagram`.
 *
 * Two halves: every authored solution must draw a clean diagram, and every
 * mistake the checker claims to find must actually be found when it is planted
 * on purpose.
 */

import { buildFlowchart, parsePseudocode } from '../src/core/flowchart-gen';
import { checkDiagram, describeDiagramIssue, DiagramIssueCode } from '../src/core/diagram-check';
import { FlowEdge, FlowNode } from '../src/types';
import { TaskPack } from '../src/exercises/types';
import { solutionText } from '../src/exercises/render';
import linijska from '../src/exercises/linijska.json';

let pass = 0;
let fail = 0;

const draw = (code: string): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const { statements, errors } = parsePseudocode(code, 'bs');
  if (errors.length) throw new Error(`pseudokod ne parsira: ${errors[0].message}`);
  return buildFlowchart(statements, 'bs');
};

// --- every authored task draws a clean diagram -----------------------------

const pack = linijska as TaskPack;
for (const task of pack.tasks) {
  const { nodes, edges } = draw(solutionText(task, 'bs'));
  const issues = checkDiagram(nodes, edges);
  if (!issues.length) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${task.id} — dijagram rješenja nije čist:`);
    issues.forEach((i) => console.log(`        ${i.code}: ${describeDiagramIssue(i, 'bs')}`));
  }
}

// --- planted mistakes have to be found -------------------------------------

const SEKVENCA = `POČETAK
UNESI a, b
RAČUNAJ zbir = a + b
ISPIŠI zbir
KRAJ`;

const GRANANJE = `POČETAK
UNESI a, b
AKO JE a > b
  DA
    ISPIŠI a
  INAČE
    ISPIŠI b
KRAJ`;

function planted(
  name: string,
  source: string,
  expected: DiagramIssueCode,
  breakIt: (d: { nodes: FlowNode[]; edges: FlowEdge[] }) => { nodes: FlowNode[]; edges: FlowEdge[] }
) {
  const broken = breakIt(draw(source));
  const issues = checkDiagram(broken.nodes, broken.edges);
  const found = issues.find((i) => i.code === expected);
  if (found) {
    pass++;
    console.log(`  ✓ ${name.padEnd(38)} → ${describeDiagramIssue(found, 'bs')}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} → očekivano "${expected}", nađeno: ${issues.map((i) => i.code).join(', ') || 'ništa'}`);
  }
}

console.log('\nzasađene greške:');

planted('unos nacrtan kao pravougaonik', SEKVENCA, 'pogresan-oblik', (d) => ({
  ...d,
  nodes: d.nodes.map((n) => (n.type === 'io' ? { ...n, type: 'process' as const } : n)),
}));

planted('uslov nacrtan kao pravougaonik', GRANANJE, 'pogresan-oblik', (d) => ({
  ...d,
  nodes: d.nodes.map((n) => (n.type === 'decision' ? { ...n, type: 'process' as const } : n)),
}));

planted('obrisana strelica usred dijagrama', SEKVENCA, 'nedostupan-cvor', (d) => ({
  ...d,
  edges: d.edges.filter((e, i) => i !== 1),
}));

planted('korak bez izlazne strelice', SEKVENCA, 'bez-izlaza', (d) => {
  const last = d.nodes[d.nodes.length - 2];
  return { ...d, edges: d.edges.filter((e) => e.from !== last.id) };
});

planted('strelica izlazi iz KRAJA', SEKVENCA, 'kraj-ima-izlaz', (d) => {
  const kraj = d.nodes.find((n) => n.text.startsWith('kraj'))!;
  const prvi = d.nodes[1];
  return { ...d, edges: [...d.edges, { id: 'x1', from: kraj.id, to: prvi.id, label: '' }] };
});

planted('dva početka', SEKVENCA, 'vise-pocetaka', (d) => ({
  ...d,
  nodes: [...d.nodes, { ...d.nodes[0], id: 'dupli' }],
}));

planted('nema kraja', SEKVENCA, 'nema-kraja', (d) => {
  const kraj = d.nodes.find((n) => n.text.startsWith('kraj'))!;
  return { nodes: d.nodes.filter((n) => n.id !== kraj.id), edges: d.edges.filter((e) => e.to !== kraj.id) };
});

planted('romb ima samo jednu granu', GRANANJE, 'romb-malo-grana', (d) => {
  const romb = d.nodes.find((n) => n.type === 'decision')!;
  const izlazi = d.edges.filter((e) => e.from === romb.id);
  return { ...d, edges: d.edges.filter((e) => e.id !== izlazi[1].id) };
});

planted('grane romba nisu označene', GRANANJE, 'romb-neoznacene-grane', (d) => {
  const romb = d.nodes.find((n) => n.type === 'decision')!;
  return {
    ...d,
    edges: d.edges.map((e) => (e.from === romb.id ? { ...e, label: '', elseWord: undefined } : e)),
  };
});

planted('dvije strelice iz obrade', SEKVENCA, 'vise-izlaza', (d) => {
  const obrada = d.nodes.find((n) => n.type === 'process')!;
  const kraj = d.nodes.find((n) => n.text.startsWith('kraj'))!;
  return { ...d, edges: [...d.edges, { id: 'x2', from: obrada.id, to: kraj.id, label: '' }] };
});

planted('prazan oblik', SEKVENCA, 'prazan-cvor', (d) => ({
  ...d,
  nodes: d.nodes.map((n) => (n.type === 'process' ? { ...n, text: '' } : n)),
}));

planted('strelica u nepostojeći čvor', SEKVENCA, 'veza-u-prazno', (d) => ({
  ...d,
  edges: [...d.edges, { id: 'x3', from: d.nodes[0].id, to: 'nema-me', label: '' }],
}));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
