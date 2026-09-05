/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'de' | 'bs';

export type ShapeType =
  | 'start_end'
  | 'io'
  | 'process'
  | 'decision'
  | 'loop'
  | 'subprocess'
  | 'comment';

export interface FlowNode {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  counter?: string;
}

export interface Waypoint {
  axis: 'x' | 'y';
  v: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  elseWord?: string;
  waypoints?: Waypoint[];
  baseWaypoints?: Waypoint[];
}

export interface AppState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  fontSize: number;
  pseudocode: string;
  language: Language;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ParseError {
  line: number;
  message: string;
  // Warnings are advice, not a refusal: the diagram is still generated.
  // Absent means 'error', so older saved payloads keep blocking behaviour.
  severity?: 'error' | 'warning';
}

export interface Statement {
  type: 'action' | 'if' | 'loop' | 'count_loop';
  kind?: 'unesi' | 'ispisi' | 'postavi' | 'racunaj' | 'generic';
  text?: string;
  cond?: string;
  thenBlock?: Statement[];
  elseBlock?: Statement[];
  elseWord?: string;
  body?: Statement[];
  times?: string;
  until?: boolean;
}

export interface TutorMessage {
  role: 'user' | 'model' | 'error' | 'pending';
  text: string;
}
