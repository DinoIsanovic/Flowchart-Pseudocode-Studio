/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COMMENT_TYPE } from './flowchart-gen';
import { FlowNode, ShapeType } from '../types';

/**
 * Fitting a node's label inside its symbol. Lives here rather than in the
 * canvas because the exercises draw the same nodes in their own small,
 * read-only diagrams, and the text has to break in the same places.
 */

/** One canvas is enough to measure every label in the app. */
let canvasMeasureCtx: CanvasRenderingContext2D | null = null;

export function getMeasureCtx(): CanvasRenderingContext2D {
  if (!canvasMeasureCtx) {
    const canvas = document.createElement('canvas');
    canvasMeasureCtx = canvas.getContext('2d')!;
  }
  return canvasMeasureCtx;
}

export function wrapNodeText(text: string, fontSize: number, maxW: number): string[] {
  const ctx = getMeasureCtx();
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const manualLines = String(text ?? '').split('\n');
  const out: string[] = [];
  manualLines.forEach((ml) => {
    const words = ml.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      return;
    }
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const trial = `${cur} ${words[i]}`;
      if (ctx.measureText(trial).width <= maxW) {
        cur = trial;
      } else {
        out.push(cur);
        cur = words[i];
      }
    }
    out.push(cur);
  });
  return out.length ? out : [''];
}

/**
 * How wide the text may be inside a shape. Wrapping to the full node width
 * puts the longest line straight through the slanted sides of a parallelogram
 * or the corners of a diamond, which is what made labels poke out of their
 * blocks.
 */
export function textBoxWidth(type: ShapeType, w: number, h: number): number {
  const pad = 12;
  switch (type) {
    case 'io':
      // The skew eats the same amount off both ends of a centred line.
      return w - 2 * (w * 0.14) - pad;
    case 'decision':
      // A diamond narrows quickly above and below its middle.
      return w * 0.55;
    case 'loop':
      return w - 2 * (h * 0.22) - pad;
    case 'start_end':
      return w * 0.82 - pad;
    case COMMENT_TYPE:
      return w - 2 * pad;
    default:
      return w - 2 * pad;
  }
}

/**
 * Wraps a node's label to the room its shape actually offers, shrinking the
 * text a step at a time when the wrapped lines would run past the bottom.
 * Node sizes come from the layout and cannot grow here, so the text yields.
 */
export function layoutNodeText(node: FlowNode, fontSize: number): { lines: string[]; size: number } {
  const maxW = textBoxWidth(node.type, node.w, node.h);
  const maxH = node.h - (node.type === COMMENT_TYPE ? 30 : 14);
  let size = fontSize;
  for (;;) {
    const lines = wrapNodeText(node.text, size, maxW);
    const height = (lines.length - 1) * size * 1.2 + size;
    if (height <= maxH || size <= 10) return { lines, size };
    size -= 1;
  }
}
