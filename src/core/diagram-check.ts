/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEdge, FlowNode, Language, ShapeType } from '../types';
import {
  COMMENT_TYPE,
  KEYWORDS_END,
  KEYWORDS_IF,
  KEYWORDS_INPUT,
  KEYWORDS_OUTPUT,
  KEYWORDS_REPEAT,
  KEYWORDS_START,
  isFlowNode,
  normLabel,
  normWord,
} from './flowchart-gen';

/**
 * Checks a flowchart as a drawing, not as a program.
 *
 * Running a diagram cannot find the mistakes a diagram is graded on:
 * `diagramToPseudocode` reads a node's text and ignores its shape, so an input
 * drawn as a rectangle produces exactly the right output, and a diagram whose
 * arrows are missing quietly converts to `POČETAK / KRAJ` and "runs" fine.
 * Those are the mistakes this module names.
 *
 * It is also the offline half of the diagnostics module: the same findings
 * help a student who is drawing their own diagram with no exercise attached.
 */

export type DiagramIssueCode =
  | 'nema-pocetka'
  | 'vise-pocetaka'
  | 'nema-kraja'
  | 'vise-krajeva'
  | 'nedostupan-cvor'
  | 'bez-izlaza'
  | 'kraj-ima-izlaz'
  | 'vise-izlaza'
  | 'romb-malo-grana'
  | 'romb-vise-grana'
  | 'romb-neoznacene-grane'
  | 'pogresan-oblik'
  | 'prazan-cvor'
  | 'veza-u-prazno';

export interface DiagramIssue {
  code: DiagramIssueCode;
  /** A warning still lets the diagram be used; an error does not. */
  severity: 'greska' | 'upozorenje';
  nodeId?: string;
  edgeId?: string;
  /** The node text or edge label the message quotes. */
  token: string;
  /** The shape the node should have, for 'pogresan-oblik'. */
  expected?: ShapeType;
}

/** First word of a node's text, normalised the way the parser normalises it. */
function firstWord(text: string): string {
  return normWord((text || '').trim().split(/\s+/)[0] ?? '');
}

function isStartText(text: string): boolean {
  return KEYWORDS_START.includes(firstWord(text));
}

function isEndText(text: string): boolean {
  return KEYWORDS_END.includes(firstWord(text));
}

/**
 * The shape a node's own text asks for, or null when the text says nothing
 * either way — a bare `zbir = a + b` is a process, but free prose is not
 * evidence of anything and must not be flagged.
 */
function shapeFromText(node: FlowNode): ShapeType | null {
  const text = (node.text || '').trim();
  if (!text) return null;
  const w = firstWord(text);

  if (KEYWORDS_START.includes(w) || KEYWORDS_END.includes(w)) return 'start_end';
  if (KEYWORDS_INPUT.includes(w) || KEYWORDS_OUTPUT.includes(w)) return 'io';
  if (KEYWORDS_IF.includes(w)) return 'decision';
  if (KEYWORDS_REPEAT.includes(w)) return 'loop';
  // The generator writes a condition as "a > b ?", which is the diamond.
  if (text.endsWith('?')) return 'decision';
  // A plain assignment is the rectangle.
  if (/^[A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ]*\s*=[^=]/.test(text)) return 'process';
  return null;
}

/**
 * Everything wrong with the drawing, most structural first. An empty list
 * means the diagram is well formed — it says nothing about whether the
 * algorithm is right.
 */
export function checkDiagram(nodes: FlowNode[], edges: FlowEdge[]): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  const flow = nodes.filter(isFlowNode);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const add = (code: DiagramIssueCode, token: string, extra: Partial<DiagramIssue> = {}) =>
    issues.push({ code, severity: 'greska', token, ...extra });

  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) {
      add('veza-u-prazno', edge.label || '', { edgeId: edge.id });
    }
  }
  const live = edges.filter((e) => byId.has(e.from) && byId.has(e.to));
  const outOf = new Map<string, FlowEdge[]>();
  for (const edge of live) {
    if (!outOf.has(edge.from)) outOf.set(edge.from, []);
    outOf.get(edge.from)!.push(edge);
  }

  const starts = flow.filter((n) => n.type === 'start_end' && isStartText(n.text));
  const ends = flow.filter((n) => n.type === 'start_end' && isEndText(n.text));
  if (!starts.length) add('nema-pocetka', '');
  if (starts.length > 1) add('vise-pocetaka', String(starts.length));
  if (!ends.length) add('nema-kraja', '');
  if (ends.length > 1) add('vise-krajeva', String(ends.length));

  // Reachability, from the first start so a stray second one does not hide
  // nodes that only it can reach.
  if (starts.length) {
    const seen = new Set<string>([starts[0].id]);
    const queue = [starts[0].id];
    while (queue.length) {
      for (const edge of outOf.get(queue.shift()!) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
    for (const node of flow) {
      if (!seen.has(node.id)) add('nedostupan-cvor', node.text, { nodeId: node.id });
    }
  }

  for (const node of flow) {
    const outs = outOf.get(node.id) ?? [];
    const isEnd = node.type === 'start_end' && isEndText(node.text);

    if (isEnd) {
      if (outs.length) add('kraj-ima-izlaz', node.text, { nodeId: node.id });
    } else if (!outs.length) {
      add('bez-izlaza', node.text, { nodeId: node.id });
    }

    if (node.type === 'decision') {
      if (outs.length < 2) {
        add('romb-malo-grana', node.text, { nodeId: node.id });
      } else if (outs.length > 2) {
        add('romb-vise-grana', node.text, { nodeId: node.id });
      } else {
        // Deliberately not `pickDecisionBranches`: that one falls back to
        // taking the branches in order when the labels are missing, because
        // the converter has to produce something. A checker must not guess —
        // an unlabelled diamond is the mistake it is looking for.
        const labels = outs.map((e) => normLabel(e.label));
        if (!labels.includes('YES') || !labels.includes('NO')) {
          add('romb-neoznacene-grane', node.text, { nodeId: node.id });
        }
      }
    } else if (node.type !== 'loop' && !isEnd && outs.length > 1) {
      // A count loop legitimately leaves by two arrows: the body and the exit.
      add('vise-izlaza', node.text, { nodeId: node.id });
    }

    if (!(node.text || '').trim()) {
      issues.push({ code: 'prazan-cvor', severity: 'upozorenje', token: '', nodeId: node.id });
      continue;
    }

    const wanted = shapeFromText(node);
    if (wanted && wanted !== node.type && node.type !== COMMENT_TYPE) {
      add('pogresan-oblik', node.text, { nodeId: node.id, expected: wanted });
    }
  }

  return issues;
}

/** True when something must be fixed before the diagram can be used. */
export function hasErrors(issues: DiagramIssue[]): boolean {
  return issues.some((i) => i.severity === 'greska');
}

const SHAPE_NAMES: Record<ShapeType, Record<Language, string>> = {
  start_end: { bs: 'elipsa (početak/kraj)', en: 'oval (start/end)', de: 'Ellipse (Start/Ende)' },
  io: { bs: 'paralelogram (unos/ispis)', en: 'parallelogram (input/output)', de: 'Parallelogramm (Eingabe/Ausgabe)' },
  process: { bs: 'pravougaonik (obrada)', en: 'rectangle (process)', de: 'Rechteck (Verarbeitung)' },
  decision: { bs: 'romb (uslov)', en: 'diamond (decision)', de: 'Raute (Bedingung)' },
  loop: { bs: 'šesterokut (petlja)', en: 'hexagon (loop)', de: 'Sechseck (Schleife)' },
  subprocess: { bs: 'potprogram', en: 'subroutine', de: 'Unterprogramm' },
  comment: { bs: 'komentar', en: 'comment', de: 'Kommentar' },
};

/** The student-facing sentence for one finding. */
export function describeDiagramIssue(issue: DiagramIssue, lang: Language): string {
  const q = issue.token;
  const shape = issue.expected ? SHAPE_NAMES[issue.expected][lang] : '';
  const messages: Record<DiagramIssueCode, Record<Language, string>> = {
    'nema-pocetka': {
      bs: 'dijagram nema početak — dodaj elipsu s riječi POČETAK',
      en: 'the diagram has no start — add an oval that says START',
      de: 'das Diagramm hat keinen Start — füge eine Ellipse mit START hinzu',
    },
    'vise-pocetaka': {
      bs: `dijagram ima ${q} početka, a smije imati samo jedan`,
      en: `the diagram has ${q} starts; only one is allowed`,
      de: `das Diagramm hat ${q} Startpunkte; nur einer ist erlaubt`,
    },
    'nema-kraja': {
      bs: 'dijagram nema kraj — dodaj elipsu s riječi KRAJ',
      en: 'the diagram has no end — add an oval that says END',
      de: 'das Diagramm hat kein Ende — füge eine Ellipse mit ENDE hinzu',
    },
    'vise-krajeva': {
      bs: `dijagram ima ${q} kraja; spoji grane u jedan`,
      en: `the diagram has ${q} ends; join the branches into one`,
      de: `das Diagramm hat ${q} Enden; führe die Zweige zusammen`,
    },
    'nedostupan-cvor': {
      bs: `do koraka „${q}" se ne može doći od početka — nedostaje strelica`,
      en: `the step "${q}" cannot be reached from the start — an arrow is missing`,
      de: `der Schritt „${q}" ist vom Start aus nicht erreichbar — es fehlt ein Pfeil`,
    },
    'bez-izlaza': {
      bs: `iz koraka „${q}" ne izlazi nijedna strelica`,
      en: `no arrow leaves the step "${q}"`,
      de: `aus dem Schritt „${q}" führt kein Pfeil heraus`,
    },
    'kraj-ima-izlaz': {
      bs: 'iz KRAJA ne smije izlaziti strelica — tu se algoritam zaustavlja',
      en: 'no arrow may leave END — the algorithm stops there',
      de: 'aus ENDE darf kein Pfeil herausführen — dort hält der Algorithmus an',
    },
    'vise-izlaza': {
      bs: `iz koraka „${q}" izlaze dvije strelice, a samo uslov (romb) smije imati dvije`,
      en: `two arrows leave the step "${q}"; only a decision may have two`,
      de: `aus dem Schritt „${q}" führen zwei Pfeile; nur eine Bedingung darf zwei haben`,
    },
    'romb-malo-grana': {
      bs: `uslov „${q}" mora imati dvije grane — DA i NE`,
      en: `the decision "${q}" needs two branches — YES and NO`,
      de: `die Bedingung „${q}" braucht zwei Zweige — JA und NEIN`,
    },
    'romb-vise-grana': {
      bs: `iz uslova „${q}" izlazi više od dvije strelice`,
      en: `more than two arrows leave the decision "${q}"`,
      de: `aus der Bedingung „${q}" führen mehr als zwei Pfeile`,
    },
    'romb-neoznacene-grane': {
      bs: `grane uslova „${q}" nisu označene s DA i NE`,
      en: `the branches of "${q}" are not labelled YES and NO`,
      de: `die Zweige von „${q}" sind nicht mit JA und NEIN beschriftet`,
    },
    'pogresan-oblik': {
      bs: `korak „${q}" nacrtan je pogrešnim simbolom — treba ${shape}`,
      en: `the step "${q}" uses the wrong symbol — it should be a ${shape}`,
      de: `der Schritt „${q}" hat das falsche Symbol — richtig wäre ${shape}`,
    },
    'prazan-cvor': {
      bs: 'jedan oblik je prazan — upiši šta se u tom koraku radi',
      en: 'one shape is empty — write what happens in that step',
      de: 'ein Symbol ist leer — schreibe hinein, was dort passiert',
    },
    'veza-u-prazno': {
      bs: 'strelica vodi u čvor koji ne postoji',
      en: 'an arrow points at a node that does not exist',
      de: 'ein Pfeil zeigt auf einen Knoten, den es nicht gibt',
    },
  };
  return messages[issue.code][lang];
}
