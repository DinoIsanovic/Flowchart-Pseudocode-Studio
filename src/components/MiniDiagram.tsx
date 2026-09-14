/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { FlowEdge, FlowNode } from '../types';
import { shapePolygonPoints } from '../core/shapes';
import { layoutNodeText } from '../core/node-text';
import { RoutePoint, orthogonalRoute } from '../core/flowchart-gen';

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

/**
 * A flowchart to look at and tap, not to edit.
 *
 * It draws the same symbols and breaks the labels in the same places as the
 * canvas — a shape a student judges here has to look like the one they would
 * have drawn themselves. The arrows take the canvas's own routes too. They
 * used to be straight lines, and in a diagram that is one column of shapes a
 * straight arrow back up — a loop's return, or the arrow out of END that the
 * „kraj" mistake plants — ran behind every shape in between and could not be
 * seen at all, while the marking said it was there.
 */
export const MiniDiagram: React.FC<MiniDiagramProps> = ({
  nodes,
  edges,
  selectedId,
  onSelect,
  markedIds = [],
  maxHeight = 460,
}) => {
  const routes = useMemo(() => {
    const byId = new Map<string, FlowNode>(nodes.map((n) => [n.id, n]));
    return edges
      .map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        return from && to ? { edge, pts: orthogonalRoute(from, to, edge.waypoints) } : null;
      })
      .filter((r): r is { edge: FlowEdge; pts: RoutePoint[] } => !!r && r.pts.length >= 2);
  }, [nodes, edges]);

  // The picture holds the arrows as well as the shapes: a loop's return lane
  // runs outside the column, and cropping it would hide the very arrow asked about.
  const box = useMemo(() => {
    if (!nodes.length) return { x: 0, y: 0, w: 100, h: 100 };
    const xs = [...nodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2]), ...routes.flatMap((r) => r.pts.map((p) => p.x))];
    const ys = [...nodes.flatMap((n) => [n.y - n.h / 2, n.y + n.h / 2]), ...routes.flatMap((r) => r.pts.map((p) => p.y))];
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX - PAD, y: minY - PAD, w: Math.max(...xs) - minX + PAD * 2, h: Math.max(...ys) - minY + PAD * 2 };
  }, [nodes, routes]);

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

      {routes.map(({ edge, pts }) => {
        // The label sits by the first stretch of the arrow, next to the shape
        // it leaves, which is where a YES or NO is read.
        const [p, q] = pts;
        return (
          <g key={edge.id}>
            <path
              d={`M${pts.map((pt) => `${pt.x},${pt.y}`).join(' L')}`}
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              markerEnd="url(#mini-arrow)"
            />
            {edge.label && (
              <text x={(p.x + q.x) / 2 + 10} y={(p.y + q.y) / 2} fontSize="13" fontWeight="800" fill="#94A3B8">
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
