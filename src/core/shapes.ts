/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShapeType } from '../types';

/**
 * The outline of each symbol, in node-local coordinates. Shared by the canvas
 * and the small read-only diagrams in the exercises, so a shape a student
 * clicks in a task is the same shape they drew on the canvas.
 */
export function shapePolygonPoints(type: ShapeType, w: number, h: number): [number, number][] | null {
  switch (type) {
    case 'start_end':
      return null;
    case 'io': {
      const skew = w * 0.14;
      return [[skew, 0], [w, 0], [w - skew, h], [0, h]];
    }
    case 'process':
      return [[0, 0], [w, 0], [w, h], [0, h]];
    case 'decision':
      return [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
    case 'loop': {
      const n = h * 0.22;
      return [[n, 0], [w - n, 0], [w, h / 2], [w - n, h], [n, h], [0, h / 2]];
    }
    case 'subprocess':
      return [[0, 0], [w, 0], [w, h], [0, h]];
    default:
      return [[0, 0], [w, 0], [w, h], [0, h]];
  }
}
