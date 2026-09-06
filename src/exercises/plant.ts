/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEdge, FlowNode } from '../types';
import { DiagramIssue, checkDiagram } from '../core/diagram-check';

/**
 * Plants one mistake in a correct diagram, so a student can be asked to find
 * it. Every mistake here is one a drawing can have and a program cannot: the
 * pseudocode behind these diagrams is unchanged and would still run.
 *
 * The answer is not stored — it is whatever `checkDiagram` reports about the
 * result, which keeps the exercise and the checker from ever disagreeing.
 */

export type MistakeKind =
  /** An input or output drawn as a rectangle. */
  | 'oblik'
  /** One arrow rubbed out. */
  | 'strelica'
  /** An arrow leaving END, so the algorithm never stops. */
  | 'kraj'
  /** A shape left blank. */
  | 'prazan';

export const MISTAKE_KINDS: MistakeKind[] = ['oblik', 'strelica', 'kraj', 'prazan'];

export interface PlantedDiagram {
  nodes: FlowNode[];
  edges: FlowEdge[];
  kind: MistakeKind;
  /** What the checker says is wrong — the marking key. */
  issues: DiagramIssue[];
  /** Shapes that count as the right answer when tapped. */
  answerIds: string[];
}

/**
 * Picks the same mistake for the same task every time, for tasks that do not
 * name one themselves.
 */
export function mistakeFor(seed: string): MistakeKind {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return MISTAKE_KINDS[h % MISTAKE_KINDS.length];
}

function isEnd(node: FlowNode): boolean {
  return node.type === 'start_end' && /^(kraj|end|ende)/i.test(node.text.trim());
}

/** Breaks a correct diagram in exactly one way. */
export function plantMistake(nodes: FlowNode[], edges: FlowEdge[], kind: MistakeKind): PlantedDiagram {
  let next = { nodes: [...nodes], edges: [...edges] };

  if (kind === 'oblik') {
    // The first input or output becomes a rectangle. The generated pseudocode
    // is identical, so only the drawing gives it away.
    const target = nodes.find((n) => n.type === 'io');
    if (target) {
      next.nodes = nodes.map((n) => (n.id === target.id ? { ...n, type: 'process' as const } : n));
    }
  } else if (kind === 'strelica') {
    // An arrow from the middle of the run, so the tail becomes unreachable.
    const cut = edges[Math.max(1, Math.floor(edges.length / 2))];
    if (cut) next.edges = edges.filter((e) => e.id !== cut.id);
  } else if (kind === 'kraj') {
    const end = nodes.find(isEnd);
    const first = nodes.find((n) => n.type !== 'start_end');
    if (end && first) {
      next.edges = [...edges, { id: `planted-${end.id}`, from: end.id, to: first.id, label: '' }];
    }
  } else {
    const target = nodes.find((n) => n.type === 'process') ?? nodes.find((n) => n.type === 'io');
    if (target) next.nodes = nodes.map((n) => (n.id === target.id ? { ...n, text: '' } : n));
  }

  const issues = checkDiagram(next.nodes, next.edges);
  // A rubbed-out arrow leaves a trail of unreachable steps behind it. The
  // answer is the shape the arrow should leave, not every step that lost its
  // way because of it.
  const anchored = issues.filter((i) => (kind === 'strelica' ? i.code === 'bez-izlaza' : true));
  const relevant = anchored.length ? anchored : issues;
  return {
    ...next,
    kind,
    issues: relevant,
    answerIds: [...new Set(relevant.map((i) => i.nodeId).filter((id): id is string => !!id))],
  };
}
