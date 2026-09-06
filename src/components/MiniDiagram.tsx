/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { FlowEdge, FlowNode } from '../types';
import { shapePolygonPoints } from '../core/shapes';
import { layoutNodeText } from '../core/node-text';

interface MiniDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** The shape the student has picked, if any. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Marks the shapes a finished exercise says were wrong. */
  markedIds?: string[];
  maxHeight?: number;
}

const PAD = 40;

/** Where an arrow should leave a shape on its way to another one. */
function anchor(from: FlowNode, to: FlowNode): { x1: number; y1: number; x2: number; y2: number } {
  const vertical = Math.abs(to.y - from.y) >= Math.abs(to.x - from.x);
  if (vertical) {
    const down = to.y > from.y;
    return {
      x1: from.x,
      y1: from.y + (down ? from.h / 2 : -from.h / 2),
      x2: to.x,
      y2: to.y + (down ? -to.h / 2 : to.h / 2),
    };
  }
  const right = to.x > from.x;
  return {
    x1: from.x + (right ? from.w / 2 : -from.w / 2),
    y1: from.y,
    x2: to.x + (right ? -to.w / 2 : to.w / 2),
    y2: to.y,
  };
}

/**
 * A flowchart to look at and tap, not to edit.
 *
 * It draws the same symbols and breaks the labels in the same places as the
 * canvas — a shape a student judges here has to look like the one they would
 * have drawn themselves. Arrows are straight rather than routed, which is
 * enough for the diagrams these exercises use and keeps the picture quiet.
 */
export const MiniDiagram: React.FC<MiniDiagramProps> = ({
  nodes,
  edges,
  selectedId,
  onSelect,
  markedIds = [],
  maxHeight = 460,
}) => {
  const box = useMemo(() => {
    if (!nodes.length) return { x: 0, y: 0, w: 100, h: 100 };
    const minX = Math.min(...nodes.map((n) => n.x - n.w / 2));
    const maxX = Math.max(...nodes.map((n) => n.x + n.w / 2));
    const minY = Math.min(...nodes.map((n) => n.y - n.h / 2));
    const maxY = Math.max(...nodes.map((n) => n.y + n.h / 2));
    return { x: minX - PAD, y: minY - PAD, w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };
  }, [nodes]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      style={{ maxHeight }}
      className="w-full rounded-xl border border-white/10 bg-[#050505]"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id="mini-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#64748B" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;
        const a = anchor(from, to);
        return (
          <g key={edge.id}>
            <line
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke="#64748B"
              strokeWidth="2"
              markerEnd="url(#mini-arrow)"
            />
            {edge.label && (
              <text
                x={(a.x1 + a.x2) / 2 + 10}
                y={(a.y1 + a.y2) / 2}
                fontSize="13"
                fontWeight="800"
                fill="#94A3B8"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((node) => {
        const picked = selectedId === node.id;
        const marked = markedIds.includes(node.id);
        const stroke = marked ? '#F87171' : picked ? '#06B6D4' : '#334155';
        const fill = marked ? '#2A1416' : picked ? '#0B2E36' : '#111827';
        const poly = shapePolygonPoints(node.type, node.w, node.h);
        const { lines, size } = layoutNodeText(node, 16);

        return (
          <g
            key={node.id}
            data-mini-node={node.id}
            transform={`translate(${node.x - node.w / 2},${node.y - node.h / 2})`}
            onClick={() => onSelect?.(node.id)}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            {poly ? (
              <polygon
                points={poly.map(([px, py]) => `${px},${py}`).join(' ')}
                fill={fill}
                stroke={stroke}
                strokeWidth={picked || marked ? 3 : 2}
              />
            ) : (
              <ellipse
                cx={node.w / 2}
                cy={node.h / 2}
                rx={node.w / 2}
                ry={node.h / 2}
                fill={fill}
                stroke={stroke}
                strokeWidth={picked || marked ? 3 : 2}
              />
            )}
            <text
              x={node.w / 2}
              y={node.h / 2}
              textAnchor="middle"
              fontSize={size}
              fontWeight="700"
              fill="#E2E8F0"
              className="pointer-events-none select-none"
            >
              {lines.map((line, i) => (
                <tspan key={i} x={node.w / 2} y={node.h / 2 - (lines.length - 1) * size * 0.6 + i * size * 1.2}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
