/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowNode, Language, ShapeType } from '../types';
import { translations } from '../i18n/translations';

/**
 * The shape a student gets when they reach for a symbol.
 *
 * Each type has a size the words it usually holds fit into — a decision needs
 * room across the diamond's waist, a comment two lines — and a placeholder in
 * the student's own language. This lives apart from the canvas because the
 * exercises hand out the same symbols, and a shape that arrived a different
 * size or with a different word in it depending on which screen it came from
 * would be a different shape.
 */
const SIZES: Record<ShapeType, { w: number; h: number }> = {
  start_end: { w: 170, h: 74 },
  io: { w: 180, h: 74 },
  process: { w: 180, h: 74 },
  decision: { w: 200, h: 116 },
  loop: { w: 200, h: 84 },
  subprocess: { w: 190, h: 74 },
  comment: { w: 210, h: 88 },
};

/** The placeholder each symbol arrives carrying. */
export function defaultShapeText(type: ShapeType, language: Language): string {
  const d = translations[language].shapeDefaults;
  switch (type) {
    case 'start_end':
      return d.start_end_start;
    case 'io':
      return d.io;
    case 'decision':
      return d.decision;
    case 'loop':
      return d.loop;
    case 'subprocess':
      return d.subprocess;
    case 'comment':
      return d.comment;
    default:
      return d.process;
  }
}

/**
 * A new shape of `type`, centred on `at`, nudged by `nth` so a run of them
 * does not land in one stack.
 */
export function newShape(
  type: ShapeType,
  language: Language,
  id: string,
  at: { x: number; y: number },
  nth = 0
): FlowNode {
  const { w, h } = SIZES[type] ?? SIZES.process;
  return {
    id,
    type,
    x: at.x - 80 + (nth % 5) * 25,
    y: at.y - 50 + (nth % 5) * 25,
    w,
    h,
    text: defaultShapeText(type, language),
  };
}
