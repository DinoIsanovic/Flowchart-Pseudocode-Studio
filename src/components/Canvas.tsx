/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { FlowEdge, FlowNode, Language, ShapeType, ViewBox, Waypoint } from '../types';
import { shapePolygonPoints } from '../core/shapes';
import { layoutNodeText } from '../core/node-text';
import {
  COMMENT_TYPE,
  cleanRoute,
  edgeLabelBox,
  isFlowNode,
  orthogonalRoute,
  segmentHandles,
  zoomViewBox,
  pickSide,
  Side,
} from '../core/flowchart-gen';
import { translations } from '../i18n/translations';

interface CanvasProps {
  language: Language;
  nodes: FlowNode[];
  edges: FlowEdge[];
  mode: 'move' | 'connect';
  fontSize: number;
  selectedId: string | null;
  selectedKind: 'node' | 'edge' | null;
  pendingConnectFrom: string | null;
  onSetPendingConnectFrom: (id: string | null) => void;
  tutorHighlightId: string | null;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onClearSelection: () => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onEdgeSegmentMove: (edgeId: string, axis: 'x' | 'y', seg: number, value: number) => void;
  onConnectNodes: (fromId: string, toId: string) => void;
  onUpdateNodeText: (id: string, text: string) => void;
  onUpdateEdgeLabel: (id: string, label: string) => void;
  viewBox: ViewBox;
  onViewBoxChange: (vb: ViewBox) => void;
  snapGuides?: { x?: number; y?: number } | null;
  onClearSnapGuides?: () => void;
}

const SHAPE_DEFS: Record<ShapeType, { fill: string; stroke: string }> = {
  start_end: { fill: '#152422', stroke: '#2DD4BF' },
  io: { fill: '#132238', stroke: '#60A5FA' },
  process: { fill: '#18181B', stroke: '#FFFFFF' },
  decision: { fill: '#291B08', stroke: '#FBBF24' },
  loop: { fill: '#1F1A2E', stroke: '#C084FC' },
  subprocess: { fill: '#18181B', stroke: '#FFFFFF' },
  comment: { fill: '#242218', stroke: '#FDE047' },
};

function commentSvgPath(w: number, h: number): string {
  const tailH = 16;
  const bh = h - tailH;
  const r = 12;
  const tx = Math.min(w * 0.22, 44);
  return `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r} V${bh - r} A${r},${r} 0 0 1 ${w - r},${bh} H${tx + 22} L${tx},${h} L${tx + 4},${bh} H${r} A${r},${r} 0 0 1 0,${bh - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`;
}

function outlineSidePoint(node: FlowNode, side: Side): { x: number; y: number } {
  const dx = side === 'left' ? -1 : side === 'right' ? 1 : 0;
  const dy = side === 'top' ? -1 : side === 'bottom' ? 1 : 0;
  let reach = dx !== 0 ? node.w / 2 : node.h / 2;
  const poly = shapePolygonPoints(node.type, node.w, node.h);
  if (poly) {
    const cx = node.w / 2;
    const cy = node.h / 2;
    let best: number | null = null;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      if (dx !== 0) {
        if ((p1[1] - cy) * (p2[1] - cy) <= 0 && Math.abs(p2[1] - p1[1]) > 1e-9) {
          const x = p1[0] + ((cy - p1[1]) / (p2[1] - p1[1])) * (p2[0] - p1[0]);
          const tx = (x - cx) * dx;
          if (tx > 0 && (best === null || tx > best)) best = tx;
        }
      } else {
        if ((p1[0] - cx) * (p2[0] - cx) <= 0 && Math.abs(p2[0] - p1[0]) > 1e-9) {
          const y = p1[1] + ((cx - p1[0]) / (p2[0] - p1[0])) * (p2[1] - p1[1]);
          const ty = (y - cy) * dy;
          if (ty > 0 && (best === null || ty > best)) best = ty;
        }
      }
    }
    if (best !== null) reach = best;
  }
  return { x: node.x + dx * reach, y: node.y + dy * reach };
}

// Text measurement canvas
export const Canvas: React.FC<CanvasProps> = ({
  language,
  nodes,
  edges,
  mode,
  fontSize,
  selectedId,
  selectedKind,
  pendingConnectFrom,
  onSetPendingConnectFrom,
  tutorHighlightId,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  onNodeMove,
  onEdgeSegmentMove,
  onConnectNodes,
  onUpdateNodeText,
  onUpdateEdgeLabel,
  viewBox,
  onViewBoxChange,
  snapGuides,
  onClearSnapGuides,
}) => {
  const t = translations[language];
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction refs
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragInfo = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const edgeDragInfo = useRef<{ edgeId: string; axis: 'x' | 'y'; seg: number } | null>(null);
  const isConnectingDrag = useRef<boolean>(false);
  const panInfo = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startVB: ViewBox;
    pxToSvg: number;
  } | null>(null);
  const pinchInfo = useRef<{ lastDist: number } | null>(null);

  // Connecting preview state
  const [connectPreviewPos, setConnectPreviewPos] = useState<{ x: number; y: number } | null>(null);

  // Keyboard escape handler to cancel pending connection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingConnectFrom) {
        onSetPendingConnectFrom(null);
        setConnectPreviewPos(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingConnectFrom, onSetPendingConnectFrom]);

  // Inline text editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editorPos, setEditorPos] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getSvgCoordinates = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const res = pt.matrixTransform(ctm);
    return { x: res.x, y: res.y };
  }, []);

  // Computed during render, not in an effect: the edges layer below reads this
  // while rendering, so an effect would leave it a frame behind and drop every
  // edge whose endpoints are new.
  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Handle Zoom
  const applyZoom = useCallback((factor: number, center?: { x: number; y: number }) => {
    const newVb = zoomViewBox(viewBox, factor, center);
    onViewBoxChange(newVb);
  }, [viewBox, onViewBoxChange]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const center = getSvgCoordinates(e.clientX, e.clientY);
    applyZoom(factor, center);
  };

  // Double click handling
  const handleNodeDoubleClick = (node: FlowNode) => {
    if (!containerRef.current || !svgRef.current) return;
    const gEl = svgRef.current.querySelector(`[data-node-id="${node.id}"]`);
    if (!gEl) return;
    const rect = gEl.getBoundingClientRect();
    const wrapRect = containerRef.current.getBoundingClientRect();

    setEditingNodeId(node.id);
    setEditingText(node.text);
    setEditorPos({
      left: rect.left - wrapRect.left,
      top: rect.top - wrapRect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const handleFinishEditing = (commit: boolean) => {
    if (editingNodeId && commit) {
      onUpdateNodeText(editingNodeId, editingText);
    }
    setEditingNodeId(null);
    setEditorPos(null);
  };

  const handleEdgeDoubleClick = (edge: FlowEdge) => {
    const promptMsg = t.edgeLabelPrompt;
    const val = window.prompt(promptMsg, edge.label || '');
    if (val !== null && val.trim() !== edge.label) {
      onUpdateEdgeLabel(edge.id, val.trim());
    }
  };

  // Pointer events on SVG
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}

    // Two finger pinch
    if (activePointers.current.size === 2) {
      dragInfo.current = null;
      edgeDragInfo.current = null;
      panInfo.current = null;
      const pts: { x: number; y: number }[] = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchInfo.current = { lastDist: dist };
      e.preventDefault();
      return;
    }
    if (activePointers.current.size > 2 || pinchInfo.current) {
      e.preventDefault();
      return;
    }

    // Handle edge handle drag
    const target = e.target as HTMLElement | SVGElement;
    const handleEl = target.closest('.edge-handle') as HTMLElement | null;
    if (handleEl) {
      const edgeGroup = handleEl.closest('[data-edge-id]') as HTMLElement | null;
      if (edgeGroup) {
        edgeDragInfo.current = {
          edgeId: edgeGroup.dataset.edgeId!,
          axis: handleEl.dataset.axis as 'x' | 'y',
          seg: parseInt(handleEl.dataset.seg!, 10),
        };
        e.preventDefault();
        return;
      }
    }

    // Handle node interaction
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
    const edgeEl = target.closest('[data-edge-id]') as HTMLElement | null;
    const nodeId = nodeEl ? nodeEl.dataset.nodeId : null;

    if (nodeId) {
      const n = nodeMap.get(nodeId);
      if (mode === 'connect') {
        if (n?.type === COMMENT_TYPE) {
          // Cannot connect comments
          return;
        }
        if (!pendingConnectFrom) {
          onSetPendingConnectFrom(nodeId);
          onSelectNode(nodeId);
          const p = getSvgCoordinates(e.clientX, e.clientY);
          setConnectPreviewPos(p);
          isConnectingDrag.current = true;
        } else if (pendingConnectFrom === nodeId) {
          onSetPendingConnectFrom(null);
          setConnectPreviewPos(null);
          onClearSelection();
        } else {
          onConnectNodes(pendingConnectFrom, nodeId);
          onSetPendingConnectFrom(null);
          setConnectPreviewPos(null);
        }
        e.preventDefault();
        return;
      } else {
        onSelectNode(nodeId);
        const p = getSvgCoordinates(e.clientX, e.clientY);
        if (n) {
          dragInfo.current = {
            nodeId,
            offsetX: p.x - n.x,
            offsetY: p.y - n.y,
          };
        }
      }
      e.preventDefault();
      return;
    }

    if (edgeEl && mode === 'move') {
      onSelectEdge(edgeEl.dataset.edgeId!);
      return;
    }

    // Canvas pan
    if (mode === 'connect' && pendingConnectFrom) {
      onSetPendingConnectFrom(null);
      setConnectPreviewPos(null);
    }
    onClearSelection();
    const ctm = svgRef.current?.getScreenCTM();
    panInfo.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startVB: { ...viewBox },
      pxToSvg: ctm && ctm.a ? 1 / ctm.a : 1,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Connect preview update
    if (mode === 'connect' && pendingConnectFrom) {
      const p = getSvgCoordinates(e.clientX, e.clientY);
      setConnectPreviewPos(p);
    }

    // Pinch zoom
    if (pinchInfo.current) {
      const pts: { x: number; y: number }[] = Array.from(activePointers.current.values());
      if (pts.length >= 2) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchInfo.current.lastDist > 0) {
          applyZoom(dist / pinchInfo.current.lastDist);
        }
        pinchInfo.current.lastDist = dist;
      }
      return;
    }

    // Canvas pan
    if (panInfo.current && panInfo.current.pointerId === e.pointerId) {
      const dx = (e.clientX - panInfo.current.startClientX) * panInfo.current.pxToSvg;
      const dy = (e.clientY - panInfo.current.startClientY) * panInfo.current.pxToSvg;
      const pvb = panInfo.current.startVB;
      onViewBoxChange({
        x: pvb.x - dx,
        y: pvb.y - dy,
        w: pvb.w,
        h: pvb.h,
      });
      return;
    }

    // Edge segment drag
    if (edgeDragInfo.current) {
      const p = getSvgCoordinates(e.clientX, e.clientY);
      const val = edgeDragInfo.current.axis === 'x' ? p.x : p.y;
      onEdgeSegmentMove(
        edgeDragInfo.current.edgeId,
        edgeDragInfo.current.axis,
        edgeDragInfo.current.seg,
        val
      );
      return;
    }

    // Node drag
    if (dragInfo.current) {
      const p = getSvgCoordinates(e.clientX, e.clientY);
      const newX = p.x - dragInfo.current.offsetX;
      const newY = p.y - dragInfo.current.offsetY;
      onNodeMove(dragInfo.current.nodeId, newX, newY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId);
    if (pinchInfo.current && activePointers.current.size < 2) {
      pinchInfo.current = null;
    }
    if (panInfo.current && panInfo.current.pointerId === e.pointerId) {
      panInfo.current = null;
    }
    dragInfo.current = null;
    edgeDragInfo.current = null;
    onClearSnapGuides?.();

    // Handle drag-to-connect release
    if (mode === 'connect' && isConnectingDrag.current && pendingConnectFrom) {
      isConnectingDrag.current = false;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node-id]') as HTMLElement | null;
      const targetId = el?.dataset.nodeId;
      if (targetId && targetId !== pendingConnectFrom) {
        const targetNode = nodeMap.get(targetId);
        if (targetNode && targetNode.type !== COMMENT_TYPE) {
          onConnectNodes(pendingConnectFrom, targetId);
          onSetPendingConnectFrom(null);
          setConnectPreviewPos(null);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-[#050505] overflow-hidden select-none"
      onWheel={handleWheel}
    >
      <svg
        id="flowchart-canvas-svg"
        ref={svgRef}
        className={`w-full h-full block touch-none ${mode === 'connect' ? 'cursor-crosshair' : 'cursor-default'}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="14"
            markerHeight="14"
            markerUnits="userSpaceOnUse"
            orient="auto"
            overflow="visible"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 Z" fill="#FFFFFF" />
          </marker>
          <marker
            id="arrowhead-selected"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="14"
            markerHeight="14"
            markerUnits="userSpaceOnUse"
            orient="auto"
            overflow="visible"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 Z" fill="#06B6D4" />
          </marker>
          <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.2" fill="rgba(255,255,255,0.12)" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect id="canvas-bg-fill" x="-8000" y="-8000" width="16000" height="16000" fill="#050505" />
        <rect id="canvas-bg-grid" x="-8000" y="-8000" width="16000" height="16000" fill="url(#grid-pattern)" />

        {/* Dynamic Snap & Alignment Guides Layer */}
        {snapGuides && (
          <g id="snap-guides-layer" pointerEvents="none">
            {snapGuides.x !== undefined && (
              <g>
                <line
                  x1={snapGuides.x}
                  y1="-8000"
                  x2={snapGuides.x}
                  y2="8000"
                  stroke="#06B6D4"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.9"
                />
              </g>
            )}
            {snapGuides.y !== undefined && (
              <g>
                <line
                  x1="-8000"
                  y1={snapGuides.y}
                  x2="8000"
                  y2={snapGuides.y}
                  stroke="#06B6D4"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.9"
                />
              </g>
            )}
          </g>
        )}

        {/* Edges Layer */}
        <g id="edges-layer">
          {edges.map((edge) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;

            const pts = orthogonalRoute(a, b, edge.waypoints, outlineSidePoint);
            if (!pts || pts.length < 2) return null;

            const pathD = `M${pts.map((p) => `${p.x},${p.y}`).join(' L')}`;
            const isSelected = selectedKind === 'edge' && selectedId === edge.id;
            const labelBox = edge.label ? edgeLabelBox(pts, a, edge.label) : null;
            const handles = isSelected ? segmentHandles(pts) : [];

            return (
              <g
                key={edge.id}
                data-edge-id={edge.id}
                onDoubleClick={() => handleEdgeDoubleClick(edge)}
              >
                {/* Thick Invisible Hit Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  className="cursor-pointer"
                />

                {/* Visible Edge Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? '#06B6D4' : '#FFFFFF'}
                  strokeWidth={isSelected ? '3.5' : '2.5'}
                  markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                  className="transition-colors"
                />

                {/* Edge Label Badge */}
                {labelBox && (
                  <g>
                    <rect
                      x={labelBox.x - labelBox.w / 2}
                      y={labelBox.y - labelBox.h / 2}
                      width={labelBox.w}
                      height={labelBox.h}
                      rx="6"
                      fill="#121212"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x={labelBox.x}
                      y={labelBox.y + 4.5}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fill="#FFFFFF"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}

                {/* Segment Draggable Handles */}
                {handles.map((h, i) => (
                  <rect
                    key={`h-${i}`}
                    x={h.x - 7}
                    y={h.y - 7}
                    width={14}
                    height={14}
                    rx="3"
                    fill="#FFFFFF"
                    stroke="#06B6D4"
                    strokeWidth="2.5"
                    className="edge-handle cursor-move shadow"
                    data-axis={h.axis}
                    data-seg={h.seg}
                  />
                ))}
              </g>
            );
          })}
        </g>

        {/* Dynamic Connect Preview Layer */}
        {mode === 'connect' && pendingConnectFrom && connectPreviewPos && (() => {
          const fromNode = nodeMap.get(pendingConnectFrom);
          if (!fromNode) return null;
          return (
            <g id="connect-preview-line-layer" pointerEvents="none">
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={connectPreviewPos.x}
                y2={connectPreviewPos.y}
                stroke="#06B6D4"
                strokeWidth="3.5"
                strokeDasharray="7 5"
                markerEnd="url(#arrowhead-selected)"
              />
              <circle
                cx={connectPreviewPos.x}
                cy={connectPreviewPos.y}
                r="4.5"
                fill="#06B6D4"
              />
            </g>
          );
        })()}

        {/* Nodes Layer */}
        <g id="nodes-layer">
          {nodes.map((node) => {
            const isSelected = selectedKind === 'node' && selectedId === node.id;
            const isPending = pendingConnectFrom === node.id;
            const isTutorTarget = tutorHighlightId === node.id;
            const def = SHAPE_DEFS[node.type];
            const poly = shapePolygonPoints(node.type, node.w, node.h);
            const { lines: wrappedLines, size: textSize } = layoutNodeText(node, fontSize);

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${node.x},${node.y})`}
                className={`node-shape cursor-grab transition-transform active:cursor-grabbing ${
                  isSelected ? 'selected' : ''
                } ${isPending ? 'pending' : ''} ${isTutorTarget ? 'tutor-flag' : ''}`}
                onDoubleClick={() => handleNodeDoubleClick(node)}
              >
                {/* Shape Outline & Fill */}
                {node.type === 'start_end' ? (
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={node.w / 2}
                    ry={node.h / 2}
                    fill={def.fill}
                    stroke={
                      isTutorTarget
                        ? '#EF4444'
                        : isPending
                        ? '#06B6D4'
                        : isSelected
                        ? '#06B6D4'
                        : def.stroke
                    }
                    strokeWidth={isSelected || isTutorTarget || isPending ? '4' : '2.5'}
                    strokeDasharray={isPending ? '6 4' : undefined}
                    className={isTutorTarget || isPending ? 'animate-pulse' : ''}
                  />
                ) : node.type === COMMENT_TYPE ? (
                  <path
                    d={commentSvgPath(node.w, node.h)}
                    transform={`translate(${-node.w / 2},${-node.h / 2})`}
                    fill={def.fill}
                    stroke={isSelected ? '#06B6D4' : def.stroke}
                    strokeWidth={isSelected ? '3.5' : '2'}
                    strokeDasharray={isSelected ? undefined : '8 5'}
                  />
                ) : (
                  <polygon
                    points={poly!.map((p) => `${p[0] - node.w / 2},${p[1] - node.h / 2}`).join(' ')}
                    fill={def.fill}
                    stroke={
                      isTutorTarget
                        ? '#EF4444'
                        : isPending
                        ? '#06B6D4'
                        : isSelected
                        ? '#06B6D4'
                        : def.stroke
                    }
                    strokeWidth={isSelected || isTutorTarget || isPending ? '4' : '2.5'}
                    strokeDasharray={isPending ? '6 4' : undefined}
                    className={isTutorTarget || isPending ? 'animate-pulse' : ''}
                  />
                )}

                {/* Source Badge when in Connect Mode */}
                {isPending && (
                  <g transform={`translate(0, ${-node.h / 2 - 14})`} pointerEvents="none">
                    <rect
                      x="-36"
                      y="-11"
                      width="72"
                      height="20"
                      rx="10"
                      fill="#06B6D4"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="900"
                      fill="#000000"
                      letterSpacing="0.05em"
                    >
                      {language === 'en' ? 'START' : language === 'de' ? 'START' : 'POČETAK'}
                    </text>
                  </g>
                )}

                {/* Subprocess extra lines */}
                {node.type === 'subprocess' && (
                  <>
                    <line
                      x1={node.w * 0.08 - node.w / 2}
                      y1={-node.h / 2}
                      x2={node.w * 0.08 - node.w / 2}
                      y2={node.h / 2}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <line
                      x1={node.w - node.w * 0.08 - node.w / 2}
                      y1={-node.h / 2}
                      x2={node.w - node.w * 0.08 - node.w / 2}
                      y2={node.h / 2}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </>
                )}

                {/* Text Lines */}
                <text
                  textAnchor="middle"
                  fontSize={textSize}
                  fill="#FFFFFF"
                  fontWeight="700"
                  className="pointer-events-none select-none font-sans tracking-tight"
                  transform={node.type === COMMENT_TYPE ? 'translate(0,-8)' : undefined}
                >
                  {wrappedLines.map((line, idx) => {
                    const startY = -(wrappedLines.length - 1) * (textSize * 0.6);
                    return (
                      <tspan
                        key={idx}
                        x="0"
                        y={startY + idx * textSize * 1.2}
                      >
                        {line}
                      </tspan>
                    );
                  })}
                </text>

                {/* Step badge: the same number labels this step in the
                    pseudocode and Python columns and in the exported image. */}
                {node.step !== undefined && (
                  <g className="pointer-events-none select-none step-badge">
                    <circle
                      cx={-node.w / 2 - 12}
                      cy={-node.h / 2 + 8}
                      r="9.5"
                      fill="#06B6D4"
                      fillOpacity="0.9"
                    />
                    <text
                      x={-node.w / 2 - 12}
                      y={-node.h / 2 + 11.5}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="900"
                      fill="#000000"
                    >
                      {node.step}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Mode Hint */}
      <div
        className={`absolute top-3 left-3 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full pointer-events-none shadow-xl border max-w-[calc(100vw-40px)] truncate flex items-center gap-2 ${
          mode === 'connect' && pendingConnectFrom
            ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#22D3EE] animate-pulse'
            : 'bg-[#121212]/95 border-white/20'
        }`}
      >
        {mode === 'move'
          ? t.hintMove
          : pendingConnectFrom
          ? language === 'en'
            ? '⚡ Connect: Click target shape to create arrow (or Esc to cancel)'
            : language === 'de'
            ? '⚡ Verbinden: Zielsymbol für Pfeil anklicken (oder Esc zum Abbrechen)'
            : '⚡ Povezivanje: Klikni na ciljni blok za strelicu (ili Esc za prekid)'
          : t.hintConnect}
      </div>

      {/* Overlay Text Editor on Double Click */}
      {editingNodeId && editorPos && (
        <textarea
          ref={textareaRef}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={() => handleFinishEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleFinishEditing(false);
            if (e.key === 'Enter' && !e.shiftKey) {
              const editingNode = nodeMap.get(editingNodeId);
              if (editingNode?.type !== COMMENT_TYPE) {
                e.preventDefault();
                handleFinishEditing(true);
              }
            }
          }}
          autoFocus
          className="absolute z-30 bg-[#121212] text-white font-black text-center rounded-lg border-2 border-white shadow-2xl outline-none p-1.5 resize-none tracking-tight"
          style={{
            left: `${editorPos.left}px`,
            top: `${editorPos.top}px`,
            width: `${editorPos.width}px`,
            minHeight: `${editorPos.height}px`,
            fontSize: `${fontSize}px`,
            lineHeight: 1.25,
          }}
        />
      )}
    </div>
  );
};
