/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link2, Maximize2, Minimize2, Move, Trash2 } from 'lucide-react';
import { FlowEdge, FlowNode, Language, ShapeType, ViewBox } from '../types';
import { translations } from '../i18n/translations';
import { COMMENT_TYPE, autoLabelDecisionEdges } from '../core/flowchart-gen';
import { newShape } from '../core/new-node';
import { Canvas } from './Canvas';

/**
 * A canvas a student draws an answer on.
 *
 * The same `Canvas` the app is built around, with the smallest set of tools an
 * algorithm needs: the five symbols, moving them, drawing an arrow, and
 * deleting. Everything the main screen adds — undo, snapping, auto-layout,
 * bend handles — is deliberately absent. A student who is drawing their first
 * flowchart is answering a question, not editing a document, and each extra
 * control is one more thing to explain before they can start.
 *
 * The drawing itself is the caller's state, so an exercise can clear it,
 * restore it, and read it back to mark it.
 */

interface DrawingBoardProps {
  language: Language;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onChange: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  /** Height of the drawing area: pixels, or any CSS length. */
  height?: number | string;
}

/** The symbols an exercise hands out — the five an algorithm is built from. */
const PALETTE: ShapeType[] = ['start_end', 'io', 'process', 'decision', 'loop'];

export const DrawingBoard: React.FC<DrawingBoardProps> = ({
  language,
  nodes,
  edges,
  onChange,
  height = 380,
}) => {
  const t = translations[language];
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);
  const [pendingConnectFrom, setPendingConnectFrom] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 900, h: 700 });
  const [expanded, setExpanded] = useState(false);
  const uid = useRef(1);
  const nextId = (prefix: string) => `${prefix}${uid.current++}`;

  /**
   * The view follows the board's own size. A fixed 900 × 700 drew a symbol at
   * three quarters of its size in the narrow panel and letterboxed it in a wide
   * one; the view starts at one unit a pixel instead and keeps whatever zoom the
   * student has chosen since when the board grows or shrinks.
   */
  const box = useRef<HTMLDivElement>(null);
  const boxWidth = useRef(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const { width, height: h } = el.getBoundingClientRect();
      if (!width || !h) return;
      // Read before the update runs: React calls the updater later, by which
      // time the new width would already be in the ref.
      const before = boxWidth.current;
      boxWidth.current = width;
      setViewBox((vb) => {
        const unitsPerPx = before ? vb.w / before : 1;
        const w = width * unitsPerPx;
        const hh = h * unitsPerPx;
        // Grow around the middle, so what was in view stays in view.
        return { x: vb.x + (vb.w - w) / 2, y: vb.y + (vb.h - hh) / 2, w, h: hh };
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Esc leaves the enlarged board, the way it leaves every other full view.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [expanded]);

  const addShape = (type: ShapeType) => {
    const node = newShape(
      type,
      language,
      nextId('n'),
      { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 },
      nodes.length
    );
    onChange([...nodes, node], edges);
    setSelectedKind('node');
    setSelectedId(node.id);
  };

  const connect = (fromId: string, toId: string) => {
    setPendingConnectFrom(null);
    if (fromId === toId) return;
    const from = nodes.find((n) => n.id === fromId);
    const to = nodes.find((n) => n.id === toId);
    if (!from || !to) return;
    if (from.type === COMMENT_TYPE || to.type === COMMENT_TYPE) return;
    if (edges.some((e) => e.from === fromId && e.to === toId)) return;

    const edge: FlowEdge = { id: nextId('e'), from: fromId, to: toId, label: '' };
    const next = [...edges, edge];
    // A second arrow out of a diamond is the NO branch; the labels are what
    // make the drawing readable as a branch rather than as two arrows.
    autoLabelDecisionEdges(nodes, next, language);
    onChange(nodes, next);
    setSelectedKind('edge');
    setSelectedId(edge.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (selectedKind === 'node') {
      onChange(
        nodes.filter((n) => n.id !== selectedId),
        edges.filter((e) => e.from !== selectedId && e.to !== selectedId)
      );
    } else {
      onChange(nodes, edges.filter((e) => e.id !== selectedId));
    }
    setSelectedId(null);
    setSelectedKind(null);
  };

  const tool =
    'flex items-center justify-center gap-1 h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors';

  return (
    // Enlarged, the board covers the whole window — the tablet case, where
    // the panel around it leaves a finger too little room — and the drawing
    // is the same state either way, so nothing is lost going in or out.
    <div
      className={
        expanded
          ? 'fixed inset-0 z-[70] bg-[#050505] flex flex-col gap-1.5 px-3 py-3'
          : 'space-y-1.5'
      }
    >
      {/* Symbols */}
      <div className="flex flex-wrap gap-1">
        {PALETTE.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addShape(type)}
            title={t.shapes[`${type}_desc` as keyof typeof t.shapes]}
            className="flex-1 min-w-0 truncate px-1.5 h-8 rounded-lg bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 hover:border-white/25 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            + {t.shapes[type]}
          </button>
        ))}
      </div>

      {/* Move, connect, delete, enlarge */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            setMode('move');
            setPendingConnectFrom(null);
          }}
          className={`${tool} flex-1 ${
            mode === 'move'
              ? 'bg-white text-black border-white'
              : 'bg-[#141414] text-white/65 border-white/10 hover:text-white'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          {t.modeMove}
        </button>
        <button
          type="button"
          onClick={() => setMode('connect')}
          className={`${tool} flex-1 ${
            mode === 'connect'
              ? 'bg-[#06B6D4] text-black border-[#06B6D4]'
              : 'bg-[#141414] text-white/65 border-white/10 hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          {t.modeConnect}
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!selectedId}
          className={`${tool} px-2.5 bg-[#141414] text-white/65 border-white/10 hover:text-[#F87171] disabled:opacity-30 disabled:hover:text-white/65`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? t.boardShrink : t.boardEnlarge}
          className={`${tool} px-2.5 bg-[#141414] text-white/65 border-white/10 hover:text-white`}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{expanded ? t.boardShrink : t.boardEnlarge}</span>
        </button>
      </div>

      <div
        ref={box}
        className={`rounded-xl border border-white/10 overflow-hidden ${expanded ? 'flex-1 min-h-0' : ''}`}
        style={expanded ? undefined : { height }}
      >
        <Canvas
          language={language}
          nodes={nodes}
          edges={edges}
          mode={mode}
          fontSize={16}
          selectedId={selectedId}
          selectedKind={selectedKind}
          pendingConnectFrom={pendingConnectFrom}
          onSetPendingConnectFrom={setPendingConnectFrom}
          tutorHighlightId={null}
          onSelectNode={(id) => {
            setSelectedId(id);
            setSelectedKind('node');
          }}
          onSelectEdge={(id) => {
            setSelectedId(id);
            setSelectedKind('edge');
          }}
          onClearSelection={() => {
            setSelectedId(null);
            setSelectedKind(null);
          }}
          onNodeMove={(id, x, y) =>
            onChange(nodes.map((n) => (n.id === id ? { ...n, x, y } : n)), edges)
          }
          // Bending an arrow changes where it is drawn and nothing about what
          // the algorithm does, so the exercise leaves the routing alone.
          onEdgeSegmentMove={() => {}}
          onConnectNodes={connect}
          onUpdateNodeText={(id, text) =>
            onChange(nodes.map((n) => (n.id === id ? { ...n, text } : n)), edges)
          }
          onUpdateEdgeLabel={(id, label) =>
            onChange(nodes, edges.map((e) => (e.id === id ? { ...e, label } : e)))
          }
          viewBox={viewBox}
          onViewBoxChange={setViewBox}
          hint="connecting"
        />
      </div>
    </div>
  );
};
