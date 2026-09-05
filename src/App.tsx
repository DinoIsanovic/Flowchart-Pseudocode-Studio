/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlowEdge, FlowNode, Language, ParseError, ShapeType, ViewBox } from './types';
import { translations } from './i18n/translations';
import { TEMPLATE_CODE } from './i18n/keywords';
import {
  autoLabelDecisionEdges,
  buildFlowchart,
  COMMENT_TYPE,
  diagramToPseudocode,
  isFlowNode,
  parsePseudocode,
  stepsByPseudocodeLine,
} from './core/flowchart-gen';
import { statementsToPython } from './core/python-gen';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { autoLayoutFlowchart, centerNodesOnCanvas } from './core/auto-layout';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { PseudocodePanel } from './components/PseudocodePanel';
import { AITutorPanel } from './components/AITutorPanel';
import { AndroidBuildModal } from './components/AndroidBuildModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ConfirmModal, ConfirmDialogState } from './components/ConfirmModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { MobileNavBar } from './components/MobileNavBar';

// Warnings describe the diagram that was drawn; only real errors withhold it.
const isBlocking = (e: ParseError) => e.severity !== 'warning';

const STORAGE_KEY = 'flowchart_studio_state_v2';
const LANG_STORAGE_KEY = 'flowchart_studio_lang_v2';
const SNAP_STORAGE_KEY = 'flowchart_studio_snap_v2';

interface HistoryState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}


/**
 * The desktop webview silently discards a download the page starts itself: the
 * <a download> click returns normally and no file is ever written. Inside Tauri
 * the bytes go through a native save dialog instead; the anchor stays for the
 * browser build.
 */

/**
 * Print palette for the exported sheet. The app itself is dark, but an export
 * is meant for paper and a handout: ink on white, keeping each shape's hue so
 * the two still read as the same diagram, and staying legible photocopied in
 * grey.
 */
const PRINT_INK = '#1F2937';
const PRINT_ACCENT = '#0E7490';
const PRINT_RULE = '#CBD5E1';
const PRINT_SHAPES: Record<string, { fill: string; stroke: string }> = {
  start_end: { fill: '#E6FAF6', stroke: '#0F766E' },
  io: { fill: '#E8F1FE', stroke: '#1D4ED8' },
  process: { fill: '#F4F4F5', stroke: '#334155' },
  decision: { fill: '#FEF6E3', stroke: '#B45309' },
  loop: { fill: '#F3EDFD', stroke: '#7E22CE' },
  subprocess: { fill: '#F4F4F5', stroke: '#334155' },
  comment: { fill: '#FEFCE8', stroke: '#A16207' },
};

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function saveBytes(
  filename: string,
  bytes: Uint8Array,
  mime: string,
  filters: { name: string; extensions: string[] }[]
): Promise<'saved' | 'cancelled'> {
  if (isTauri()) {
    const path = await save({ defaultPath: filename, filters });
    if (!path) return 'cancelled';
    await writeFile(path, bytes);
    return 'saved';
  }

  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  return 'saved';
}

export default function App() {
  // Language initialization
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'de' || saved === 'bs') return saved;
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    if (browserLang === 'de') return 'de';
    if (browserLang === 'bs' || browserLang === 'hr' || browserLang === 'sr') return 'bs';
    return 'en';
  });

  const t = translations[language];

  // Core Flowchart State
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [fontSize, setFontSize] = useState<number>(18);
  const [pseudocode, setPseudocode] = useState<string>('');
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 1600, h: 1000 });

  // Selection & Mode
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);
  const [pendingConnectFrom, setPendingConnectFrom] = useState<string | null>(null);
  const [tutorHighlightId, setTutorHighlightId] = useState<string | null>(null);

  // UI Panels & Modals
  const [viewMode, setViewMode] = useState<'split' | 'canvas' | 'code'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'canvas';
    }
    return 'split';
  });
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isMobileToolbarOpen, setIsMobileToolbarOpen] = useState(false);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Snap to Grid & Alignment State
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    const saved = localStorage.getItem(SNAP_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number } | null>(null);

  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid((prev) => {
      const next = !prev;
      localStorage.setItem(SNAP_STORAGE_KEY, String(next));
      showToast(
        language === 'en'
          ? (next ? 'Snap-to-grid enabled' : 'Snap-to-grid disabled')
          : language === 'de'
          ? (next ? 'Am Raster einrasten aktiviert' : 'Am Raster einrasten deaktiviert')
          : (next ? 'Poravnanje na raster uključeno' : 'Poravnanje na raster isključeno'),
        'info'
      );
      return next;
    });
  }, [language, showToast]);

  // History for Undo / Redo
  const undoStack = useRef<HistoryState[]>([]);
  const redoStack = useRef<HistoryState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const uidCounter = useRef(1);

  const getNextUid = (prefix: string) => `${prefix}${uidCounter.current++}`;

  const bumpUidPast = useCallback((loadedNodes: FlowNode[], loadedEdges: FlowEdge[]) => {
    [...loadedNodes, ...loadedEdges].forEach((item) => {
      const m = /^[a-z]+(\d+)$/.exec(item.id || '');
      if (m) {
        uidCounter.current = Math.max(uidCounter.current, parseInt(m[1], 10) + 1);
      }
    });
  }, []);

  const pushHistory = useCallback(() => {
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (undoStack.current.length > 80) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setSelectedId(null);
    setSelectedKind(null);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [nodes, edges]);

  const handleRedo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedId(null);
    setSelectedKind(null);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, [nodes, edges]);

  // Viewport centering
  const fitViewBoxToContent = useCallback((targetNodes: FlowNode[]) => {
    if (!targetNodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    targetNodes.forEach((n) => {
      minX = Math.min(minX, n.x - n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      maxY = Math.max(maxY, n.y + n.h / 2);
    });
    const pad = 90;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const w = Math.max(1600, contentW);
    const h = Math.max(1000, contentH);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewBox({
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
    });
  }, []);

  // Initial Load & Default Template if empty
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
          setFontSize(data.fontSize || 18);
          setPseudocode(data.pseudocode || '');
          bumpUidPast(data.nodes, data.edges || []);
          fitViewBoxToContent(data.nodes);
          return;
        }
      }
    } catch {}

    // Load standard initial sequence template in active language
    const initialCode = TEMPLATE_CODE[language].sequence;
    const parsed = parsePseudocode(initialCode, language);
    const built = buildFlowchart(parsed.statements, language);
    setNodes(built.nodes);
    setEdges(built.edges);
    setPseudocode(initialCode);
    bumpUidPast(built.nodes, built.edges);
    fitViewBoxToContent(built.nodes);
  }, [bumpUidPast, fitViewBoxToContent, language]);

  // LocalStorage Auto-Save
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          nodes,
          edges,
          fontSize,
          pseudocode,
          language,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem(LANG_STORAGE_KEY, language);
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [nodes, edges, fontSize, pseudocode, language]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && !isInput) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (selectedKind === 'node' && selectedId) {
          pushHistory();
          setNodes((prev) => prev.filter((n) => n.id !== selectedId));
          setEdges((prev) => prev.filter((ed) => ed.from !== selectedId && ed.to !== selectedId));
          setSelectedId(null);
          setSelectedKind(null);
        } else if (selectedKind === 'edge' && selectedId) {
          pushHistory();
          setEdges((prev) => prev.filter((ed) => ed.id !== selectedId));
          setSelectedId(null);
          setSelectedKind(null);
        }
      }

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        toggleSnapToGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, pushHistory, selectedId, selectedKind, toggleSnapToGrid]);

  // Language Change Handler
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  // Node & Edge Handlers
  const handleAddShape = (type: ShapeType) => {
    pushHistory();
    const defaults = t.shapeDefaults;
    let text = defaults.process;
    let w = 180, h = 74;

    if (type === 'start_end') {
      text = defaults.start_end_start;
      w = 170; h = 74;
    } else if (type === 'io') {
      text = defaults.io;
      w = 180; h = 74;
    } else if (type === 'decision') {
      text = defaults.decision;
      w = 200; h = 116;
    } else if (type === 'loop') {
      text = defaults.loop;
      w = 200; h = 84;
    } else if (type === 'subprocess') {
      text = defaults.subprocess;
      w = 190; h = 74;
    } else if (type === 'comment') {
      text = defaults.comment;
      w = 210; h = 88;
    }

    const newNode: FlowNode = {
      id: getNextUid('n'),
      type,
      x: viewBox.x + viewBox.w / 2 - 80 + (nodes.length % 5) * 25,
      y: viewBox.y + viewBox.h / 2 - 50 + (nodes.length % 5) * 25,
      w,
      h,
      text,
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedKind('node');
    setSelectedId(newNode.id);
  };

  // Node movement handler with optional snap-to-grid & node alignment
  const handleNodeMove = (id: string, rawX: number, rawY: number, forceSnap?: boolean) => {
    const shouldSnap = forceSnap !== undefined ? forceSnap : snapToGrid;

    if (!shouldSnap) {
      if (snapGuides) setSnapGuides(null);
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: rawX, y: rawY } : n)));
      return;
    }

    const movingNode = nodes.find((n) => n.id === id);
    if (!movingNode) {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: rawX, y: rawY } : n)));
      return;
    }

    const otherNodes = nodes.filter((n) => n.id !== id);
    const NODE_SNAP_THRESHOLD = 18; // Proximity threshold in SVG units
    const GRID_SIZE = 32;          // 32px matching background grid pattern

    let snappedX = rawX;
    let snappedY = rawY;
    let guideX: number | undefined = undefined;
    let guideY: number | undefined = undefined;

    // --- 1. Horizontal Snapping (X-axis alignment) ---
    let minDiffX = NODE_SNAP_THRESHOLD;
    for (const other of otherNodes) {
      // (a) Center-to-center alignment
      const diffCenter = Math.abs(rawX - other.x);
      if (diffCenter < minDiffX) {
        minDiffX = diffCenter;
        snappedX = other.x;
        guideX = other.x;
      }

      // (b) Left-edge to Left-edge alignment
      const targetLeft = other.x - other.w / 2 + movingNode.w / 2;
      const diffLeft = Math.abs(rawX - targetLeft);
      if (diffLeft < minDiffX) {
        minDiffX = diffLeft;
        snappedX = targetLeft;
        guideX = other.x - other.w / 2;
      }

      // (c) Right-edge to Right-edge alignment
      const targetRight = other.x + other.w / 2 - movingNode.w / 2;
      const diffRight = Math.abs(rawX - targetRight);
      if (diffRight < minDiffX) {
        minDiffX = diffRight;
        snappedX = targetRight;
        guideX = other.x + other.w / 2;
      }
    }

    // If not snapped to another node, snap to background grid lines
    if (guideX === undefined) {
      snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
    }

    // --- 2. Vertical Snapping (Y-axis alignment) ---
    let minDiffY = NODE_SNAP_THRESHOLD;
    for (const other of otherNodes) {
      // (a) Center-to-center alignment
      const diffCenter = Math.abs(rawY - other.y);
      if (diffCenter < minDiffY) {
        minDiffY = diffCenter;
        snappedY = other.y;
        guideY = other.y;
      }

      // (b) Top-edge to Top-edge alignment
      const targetTop = other.y - other.h / 2 + movingNode.h / 2;
      const diffTop = Math.abs(rawY - targetTop);
      if (diffTop < minDiffY) {
        minDiffY = diffTop;
        snappedY = targetTop;
        guideY = other.y - other.h / 2;
      }

      // (c) Bottom-edge to Bottom-edge alignment
      const targetBottom = other.y + other.h / 2 - movingNode.h / 2;
      const diffBottom = Math.abs(rawY - targetBottom);
      if (diffBottom < minDiffY) {
        minDiffY = diffBottom;
        snappedY = targetBottom;
        guideY = other.y + other.h / 2;
      }
    }

    // If not snapped to another node, snap to background grid lines
    if (guideY === undefined) {
      snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
    }

    // Update alignment guide lines to display dynamically on canvas
    if (guideX !== undefined || guideY !== undefined) {
      setSnapGuides({ x: guideX, y: guideY });
    } else {
      setSnapGuides(null);
    }

    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x: snappedX, y: snappedY } : n))
    );
  };

  const handleEdgeSegmentMove = (edgeId: string, axis: 'x' | 'y', seg: number, value: number) => {
    setEdges((prev) =>
      prev.map((e) => {
        if (e.id !== edgeId) return e;
        const wps = [...(e.waypoints || [])];
        wps[seg] = { axis, v: Math.round(value) };
        return { ...e, waypoints: wps };
      })
    );
  };

  const handleConnectNodes = (fromId: string, toId: string) => {
    if (fromId === toId) {
      setPendingConnectFrom(null);
      return;
    }
    const fromNode = nodes.find((n) => n.id === fromId);
    const toNode = nodes.find((n) => n.id === toId);
    if (!fromNode || !toNode) {
      setPendingConnectFrom(null);
      return;
    }
    if (fromNode.type === COMMENT_TYPE || toNode.type === COMMENT_TYPE) {
      showToast(t.hintCommentBlocked, 'error');
      setPendingConnectFrom(null);
      return;
    }

    // Check if edge already exists in this direction
    const exists = edges.some((e) => e.from === fromId && e.to === toId);
    if (exists) {
      showToast(
        language === 'en'
          ? 'These shapes are already connected'
          : language === 'de'
          ? 'Diese Symbole sind bereits verbunden'
          : 'Ovi blokovi su već povezani',
        'info'
      );
      setPendingConnectFrom(null);
      return;
    }

    pushHistory();
    const newEdge: FlowEdge = {
      id: getNextUid('e'),
      from: fromId,
      to: toId,
      label: '',
    };
    const updatedEdges = [...edges, newEdge];
    autoLabelDecisionEdges(nodes, updatedEdges, language);
    setEdges(updatedEdges);
    setSelectedKind('edge');
    setSelectedId(newEdge.id);
    setPendingConnectFrom(null);

    showToast(
      language === 'en'
        ? `Connected: ${fromNode.text.slice(0, 15) || 'shape'} → ${toNode.text.slice(0, 15) || 'shape'}`
        : language === 'de'
        ? `Verbunden: ${fromNode.text.slice(0, 15) || 'Symbol'} → ${toNode.text.slice(0, 15) || 'Symbol'}`
        : `Povezano: ${fromNode.text.slice(0, 15) || 'blok'} → ${toNode.text.slice(0, 15) || 'blok'}`,
      'success'
    );
  };

  const handleUpdateNodeText = (id: string, text: string) => {
    pushHistory();
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const handleUpdateEdgeLabel = (id: string, label: string) => {
    pushHistory();
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, label, elseWord: undefined } : e)));
  };

  const handleStraightenEdge = () => {
    pushHistory();
    if (selectedKind === 'edge' && selectedId) {
      setEdges((prev) =>
        prev.map((e) =>
          e.id === selectedId
            ? { ...e, waypoints: e.baseWaypoints ? [...e.baseWaypoints] : [] }
            : e
        )
      );
    } else {
      setEdges((prev) =>
        prev.map((e) => ({
          ...e,
          waypoints: e.baseWaypoints ? [...e.baseWaypoints] : [],
        }))
      );
    }
  };

  const handleAutoLayout = () => {
    if (!nodes.length) {
      showToast(
        language === 'en'
          ? 'No nodes on canvas to arrange'
          : language === 'de'
          ? 'Keine Symbole auf der Arbeitsfläche zum Anordnen'
          : 'Nema blokova na površini za raspoređivanje',
        'info'
      );
      return;
    }
    pushHistory();
    const result = autoLayoutFlowchart(nodes, edges);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedId(null);
    setSelectedKind(null);
    fitViewBoxToContent(result.nodes);
    showToast(
      language === 'en'
        ? 'Nodes arranged neatly and centered'
        : language === 'de'
        ? 'Ablaufplan sauber angeordnet und zentriert'
        : 'Blokovi uredno posloženi i centrirani',
      'success'
    );
  };

  const handleCenterNodes = () => {
    if (!nodes.length) {
      showToast(
        language === 'en'
          ? 'No nodes to center'
          : language === 'de'
          ? 'Keine Knoten zum Zentrieren vorhanden'
          : 'Nema blokova za centriranje',
        'info'
      );
      return;
    }
    pushHistory();
    const result = centerNodesOnCanvas(nodes, edges);
    setNodes(result.nodes);
    setEdges(result.edges);
    fitViewBoxToContent(result.nodes);
    showToast(
      language === 'en'
        ? 'Nodes centered on canvas'
        : language === 'de'
        ? 'Symbole auf der Arbeitsfläche zentriert'
        : 'Blokovi centrirani na radnoj površini',
      'success'
    );
  };

  const handleDeleteSelected = () => {
    if (selectedKind === 'node' && selectedId) {
      pushHistory();
      setNodes((prev) => prev.filter((n) => n.id !== selectedId));
      setEdges((prev) => prev.filter((e) => e.from !== selectedId && e.to !== selectedId));
      setSelectedId(null);
      setSelectedKind(null);
    } else if (selectedKind === 'edge' && selectedId) {
      pushHistory();
      setEdges((prev) => prev.filter((e) => e.id !== selectedId));
      setSelectedId(null);
      setSelectedKind(null);
    }
  };

  const handleClearAll = () => {
    if (!nodes.length && !edges.length) {
      showToast(
        language === 'en'
          ? 'Canvas is already empty'
          : language === 'de'
          ? 'Die Zeichenfläche ist bereits leer'
          : 'Radna površina je već prazna',
        'info'
      );
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: t.clearAll,
      message: t.confirmClear,
      confirmText: t.clearAll,
      cancelText: language === 'en' ? 'Cancel' : language === 'de' ? 'Abbrechen' : 'Otkaži',
      isDestructive: true,
      hint:
        language === 'en'
          ? 'You can undo this at any time with Ctrl+Z or the Undo button.'
          : language === 'de'
          ? 'Sie können dies jederzeit mit Strg+Z rückgängig machen.'
          : 'Ovu radnju možete poništiti sa Ctrl+Z ili dugmetom Poništi.',
      onConfirm: () => {
        pushHistory();
        setNodes([]);
        setEdges([]);
        setSelectedId(null);
        setSelectedKind(null);
        showToast(
          language === 'en'
            ? 'Canvas cleared'
            : language === 'de'
            ? 'Zeichenfläche geleert'
            : 'Radna površina očišćena',
          'success'
        );
      },
    });
  };

  const doGenerateDiagram = (codeToUse: string) => {
    const parsed = parsePseudocode(codeToUse, language);
    if (parsed.errors.some(isBlocking)) {
      setParseErrors(parsed.errors);
      return;
    }
    // Warnings stay on screen next to the diagram they describe.
    setParseErrors(parsed.errors);
    pushHistory();
    const built = buildFlowchart(parsed.statements, language);
    // Retain comments
    const comments = nodes.filter((n) => n.type === COMMENT_TYPE);
    const newNodes = [...built.nodes, ...comments];
    setNodes(newNodes);
    setEdges(built.edges);
    bumpUidPast(newNodes, built.edges);
    fitViewBoxToContent(newNodes);
    if (typeof window !== 'undefined' && (window.innerWidth < 768 || viewMode === 'code')) {
      setViewMode('canvas');
    }
  };

  // Generate Flowchart from Code
  const handleGenerateDiagram = () => {
    const parsed = parsePseudocode(pseudocode, language);
    if (parsed.errors.some(isBlocking)) {
      setParseErrors(parsed.errors);
      return;
    }
    setParseErrors(parsed.errors);

    if (nodes.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: t.generateDiagram,
        message: t.confirmGenerate,
        confirmText: t.generateDiagram,
        cancelText: language === 'en' ? 'Cancel' : language === 'de' ? 'Abbrechen' : 'Otkaži',
        isDestructive: false,
        hint:
          language === 'en'
            ? 'Current flowchart will be replaced. You can undo with Ctrl+Z.'
            : language === 'de'
            ? 'Aktueller Ablaufplan wird ersetzt. Sie können mit Strg+Z rückgängig machen.'
            : 'Trenutni dijagram toka će biti zamijenjen. Možete poništiti sa Ctrl+Z.',
        onConfirm: () => doGenerateDiagram(pseudocode),
      });
      return;
    }

    doGenerateDiagram(pseudocode);
  };

  const doGeneratePseudocode = () => {
    const generated = diagramToPseudocode(nodes, edges, language);
    setPseudocode(generated);
    setParseErrors([]);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('code');
    } else if (viewMode === 'canvas') {
      setViewMode('split');
    }
  };

  // Generate Code from Flowchart
  const handleGeneratePseudocode = () => {
    if (!nodes.length) {
      showToast(t.emptyCanvasAlert, 'error');
      return;
    }

    if (pseudocode.trim()) {
      setConfirmDialog({
        isOpen: true,
        title: t.generatePseudo,
        message: t.confirmReverse,
        confirmText: t.generatePseudo,
        cancelText: language === 'en' ? 'Cancel' : language === 'de' ? 'Abbrechen' : 'Otkaži',
        isDestructive: false,
        onConfirm: doGeneratePseudocode,
      });
      return;
    }

    doGeneratePseudocode();
  };

  const doLoadTemplate = (templateKey: 'sequence' | 'branch' | 'while' | 'repeat') => {
    pushHistory();
    const code = TEMPLATE_CODE[language][templateKey];
    const parsed = parsePseudocode(code, language);
    const built = buildFlowchart(parsed.statements, language);
    setNodes(built.nodes);
    setEdges(built.edges);
    setPseudocode(code);
    setParseErrors([]);
    bumpUidPast(built.nodes, built.edges);
    fitViewBoxToContent(built.nodes);
  };

  // Template Loader
  const handleLoadTemplate = (templateKey: 'sequence' | 'branch' | 'while' | 'repeat') => {
    if (nodes.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: language === 'en' ? 'Load Template' : language === 'de' ? 'Vorlage laden' : 'Učitaj šablon',
        message: t.confirmTemplate,
        confirmText: language === 'en' ? 'Load' : language === 'de' ? 'Laden' : 'Učitaj',
        cancelText: language === 'en' ? 'Cancel' : language === 'de' ? 'Abbrechen' : 'Otkaži',
        isDestructive: false,
        onConfirm: () => doLoadTemplate(templateKey),
      });
      return;
    }

    doLoadTemplate(templateKey);
  };

  // Export as PNG image
  const handleExportPng = () => {
    let svgEl = document.getElementById('flowchart-canvas-svg') as unknown as SVGSVGElement | null;
    if (!svgEl) {
      if (viewMode === 'code') {
        setViewMode('split');
        setTimeout(() => handleExportPng(), 200);
        return;
      }
      return;
    }

    if (nodes.length === 0) {
      showToast(t.emptyCanvasAlert, 'error');
      return;
    }

    // Calculate bounding box around all nodes and edge waypoints
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x - n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      maxY = Math.max(maxY, n.y + n.h / 2);
    });

    // A Waypoint is {axis, v}: a single coordinate on one axis, not a point.
    // Reading .x/.y off it yielded undefined, so every diagram containing an
    // edge bend — every loop and branch — turned the whole bounding box into
    // NaN, and the export canvas came out 0x0 and produced no file.
    edges.forEach((e) => {
      e.waypoints?.forEach((pt) => {
        if (pt.axis === 'x') {
          minX = Math.min(minX, pt.v);
          maxX = Math.max(maxX, pt.v);
        } else {
          minY = Math.min(minY, pt.v);
          maxY = Math.max(maxY, pt.v);
        }
      });
    });

    if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
      showToast(t.emptyCanvasAlert, 'error');
      return;
    }

    const pad = 60;
    const boxX = Math.floor(minX - pad);
    const boxY = Math.floor(minY - pad);
    const boxW = Math.max(200, Math.ceil(maxX - minX + pad * 2));
    const boxH = Math.max(200, Math.ceil(maxY - minY + pad * 2));

    // Side columns: pseudocode left, Python right. They are not aligned to the
    // node positions — branches put two nodes on one row, and stretching the
    // code to match would destroy Python's indentation. The step badge on each
    // node carries the correspondence instead.
    const pseudoLines = pseudocode.split(/\r?\n/);
    const stepByLine = stepsByPseudocodeLine(pseudocode, language);
    const pyLines = statementsToPython(parsePseudocode(pseudocode, language).statements, language);
    const hasColumns = pseudoLines.some((l) => l.trim().length > 0);

    const COL_GAP = 48;
    const LINE_H = 26;
    const COL_FONT = 16;
    const HEADER_H = 56;
    const GUTTER = 30;
    const CHAR_W = COL_FONT * 0.62; // monospace advance width

    // Size each column to its own longest line rather than a fixed width, so a
    // short program does not export a picture padded with empty space.
    const widthFor = (lines: string[], title: string) => {
      const chars = Math.max(title.length, ...lines.map((l) => l.length), 10);
      return Math.min(1100, Math.max(260, GUTTER + Math.ceil(chars * CHAR_W) + 40));
    };
    const pyText = pyLines.map((l) => '    '.repeat(l.depth) + l.text);
    const leftW = hasColumns ? widthFor(pseudoLines, 'PSEUDOKOD') : 0;
    const rightW = hasColumns ? widthFor(pyText, 'PYTHON') : 0;

    const outX = boxX - (hasColumns ? leftW + COL_GAP : 0);
    const outW = boxW + (hasColumns ? leftW + rightW + COL_GAP * 2 : 0);
    const columnH = HEADER_H + Math.max(pseudoLines.length, pyLines.length) * LINE_H + 40;
    const outH = Math.max(boxH, columnH);

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('id');

    // Remove interactive handles, background grid, and background rects
    clone.querySelectorAll('.edge-handle, #grid-pattern, #canvas-bg-grid, #canvas-bg-fill, rect[fill*="grid-pattern"]').forEach((el) => el.remove());

    // Explicit SVG namespace and view sizing
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('viewBox', `${outX} ${boxY} ${outW} ${outH}`);
    clone.setAttribute('width', `${outW}`);
    clone.setAttribute('height', `${outH}`);
    clone.style.backgroundColor = '#FFFFFF';

    // Repaint the cloned diagram for paper. The live canvas is dark; the sheet
    // has to be ink on white or it eats a cartridge and photocopies to mud.
    clone.querySelectorAll('[data-node-id]').forEach((g) => {
      const id = g.getAttribute('data-node-id');
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      const paint = PRINT_SHAPES[node.type] ?? PRINT_SHAPES.process;
      g.querySelectorAll('ellipse, polygon, path').forEach((shape) => {
        if (shape.getAttribute('fill') === 'none') return;
        shape.setAttribute('fill', paint.fill);
        shape.setAttribute('stroke', paint.stroke);
      });
      g.querySelectorAll('text').forEach((txt) => txt.setAttribute('fill', PRINT_INK));
      // The step badge keeps its accent so it stays findable in the columns.
      g.querySelectorAll('.step-badge circle').forEach((c) => {
        c.setAttribute('fill', PRINT_ACCENT);
        c.setAttribute('fill-opacity', '1');
      });
      g.querySelectorAll('.step-badge text').forEach((t) => t.setAttribute('fill', '#FFFFFF'));
    });

    clone.querySelectorAll('#edges-layer path, #edges-layer line').forEach((el) => {
      if (el.getAttribute('stroke') === 'transparent') return;
      el.setAttribute('stroke', PRINT_INK);
    });
    clone.querySelectorAll('#edges-layer rect').forEach((r) => {
      r.setAttribute('fill', '#FFFFFF');
      r.setAttribute('stroke', PRINT_INK);
    });
    clone.querySelectorAll('#edges-layer text').forEach((t) => t.setAttribute('fill', PRINT_INK));
    clone.querySelectorAll('marker path').forEach((p) => p.setAttribute('fill', PRINT_INK));

    // Insert high-contrast dark background matching flowchart theme
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', `${outX}`);
    bg.setAttribute('y', `${boxY}`);
    bg.setAttribute('width', `${outW}`);
    bg.setAttribute('height', `${outH}`);
    bg.setAttribute('fill', '#FFFFFF');

    let defs = clone.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      clone.insertBefore(defs, clone.firstChild);
    }

    // Embed font family for clean canvas text rendering
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      text {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      }
      text.code-col {
        font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        white-space: pre;
      }
    `;
    defs.appendChild(styleEl);

    // Insert background right after defs
    if (defs.nextSibling) {
      clone.insertBefore(bg, defs.nextSibling);
    } else {
      clone.appendChild(bg);
    }

    if (hasColumns) {
      const NS = 'http://www.w3.org/2000/svg';
      const mk = (tag: string, attrs: Record<string, string>, text?: string) => {
        const el = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        if (text !== undefined) el.textContent = text;
        return el;
      };

      const top = boxY + 40;
      const drawColumn = (
        x: number,
        width: number,
        title: string,
        rows: { badge?: number; text: string }[]
      ) => {
        const g = document.createElementNS(NS, 'g');
        g.appendChild(mk('text', {
          x: `${x}`, y: `${top}`, fill: PRINT_ACCENT,
          'font-size': '15', 'font-weight': '900', 'letter-spacing': '0.18em',
        }, title.toUpperCase()));
        g.appendChild(mk('line', {
          x1: `${x}`, y1: `${top + 14}`, x2: `${x + width - 40}`, y2: `${top + 14}`,
          stroke: PRINT_RULE, 'stroke-width': '1',
        }));

        rows.forEach((row, i) => {
          const y = top + HEADER_H + i * LINE_H;
          if (row.badge !== undefined) {
            g.appendChild(mk('circle', {
              cx: `${x + 10}`, cy: `${y - 5}`, r: '10', fill: PRINT_ACCENT,
            }));
            g.appendChild(mk('text', {
              x: `${x + 10}`, y: `${y - 1}`, fill: '#FFFFFF', 'text-anchor': 'middle',
              'font-size': '11', 'font-weight': '900',
            }, String(row.badge)));
          }
          const line = mk('text', {
            x: `${x + 30}`, y: `${y}`, fill: PRINT_INK, 'font-size': `${COL_FONT}`,
            class: 'code-col',
          }, row.text);
          g.appendChild(line);
        });
        return g;
      };


      /**
       * Decorative rule between two columns: a hairline closed by a small cap
       * at each end with a diamond at its middle, so the three panels read as
       * separate parts of one printed sheet rather than three loose blocks.
       */
      const drawDivider = (x: number) => {
        const y1 = boxY + 24;
        const y2 = boxY + outH - 24;
        const mid = (y1 + y2) / 2;
        const g = document.createElementNS(NS, 'g');
        const rule = (a: string, b: string, c: string, d: string, w: string, col: string) =>
          g.appendChild(mk('line', { x1: a, y1: b, x2: c, y2: d, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }));

        rule(`${x}`, `${y1}`, `${x}`, `${mid - 16}`, '1.25', PRINT_RULE);
        rule(`${x}`, `${mid + 16}`, `${x}`, `${y2}`, '1.25', PRINT_RULE);
        // end caps
        rule(`${x - 7}`, `${y1}`, `${x + 7}`, `${y1}`, '2', PRINT_ACCENT);
        rule(`${x - 7}`, `${y2}`, `${x + 7}`, `${y2}`, '2', PRINT_ACCENT);
        // centre diamond
        g.appendChild(mk('rect', {
          x: `${x - 5}`, y: `${mid - 5}`, width: '10', height: '10',
          fill: PRINT_ACCENT, transform: `rotate(45 ${x} ${mid})`,
        }));
        g.appendChild(mk('circle', { cx: `${x}`, cy: `${mid - 24}`, r: '2.5', fill: PRINT_RULE }));
        g.appendChild(mk('circle', { cx: `${x}`, cy: `${mid + 24}`, r: '2.5', fill: PRINT_RULE }));
        return g;
      };

      clone.appendChild(drawDivider(boxX - COL_GAP / 2));
      clone.appendChild(drawDivider(boxX + boxW + COL_GAP / 2));

      const pseudoTitle = language === 'en' ? 'Pseudocode' : language === 'de' ? 'Pseudocode' : 'Pseudokod';
      clone.appendChild(drawColumn(
        outX + 40,
        leftW,
        pseudoTitle,
        pseudoLines.map((text, i) => ({ badge: stepByLine.get(i + 1), text }))
      ));
      clone.appendChild(drawColumn(
        boxX + boxW + COL_GAP,
        rightW,
        'Python',
        pyLines.map((l, i) => ({ badge: l.step, text: pyText[i] }))
      ));
    }

    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const scale = 2; // 2x high resolution
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(outW * scale);
      canvas.height = Math.round(outH * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast(t.emptyCanvasAlert, 'error');
          return;
        }
        try {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          await saveBytes(`flowchart-${Date.now()}.png`, bytes, 'image/png', [
            { name: 'PNG', extensions: ['png'] },
          ]);
        } catch (err) {
          showToast(err instanceof Error ? err.message : String(err), 'error');
        }
      }, 'image/png');
    };

    img.onerror = (err) => {
      console.error('Failed to load SVG into Image for export:', err);
      URL.revokeObjectURL(url);
      // Fallback: save the SVG itself
      void saveBytes(
        `flowchart-${Date.now()}.svg`,
        new TextEncoder().encode(xml),
        'image/svg+xml',
        [{ name: 'SVG', extensions: ['svg'] }]
      ).catch((e) => showToast(e instanceof Error ? e.message : String(e), 'error'));
    };

    img.src = url;
  };

  // JSON Save / Load
  const handleSaveJson = () => {
    const data = {
      nodes,
      edges,
      fontSize,
      pseudocode,
      language,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2));
    void saveBytes(`flowchart-project-${Date.now()}.json`, bytes, 'application/json', [
      { name: 'JSON', extensions: ['json'] },
    ]).catch((e) => showToast(e instanceof Error ? e.message : String(e), 'error'));
  };

  const handleLoadJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loaded = JSON.parse(reader.result as string);
        if (!loaded.nodes || !Array.isArray(loaded.nodes)) throw new Error('Invalid project structure');
        pushHistory();
        setNodes(loaded.nodes);
        setEdges(loaded.edges || []);
        setFontSize(loaded.fontSize || 18);
        setPseudocode(loaded.pseudocode || '');
        if (loaded.language && (loaded.language === 'en' || loaded.language === 'de' || loaded.language === 'bs')) {
          setLanguage(loaded.language);
        }
        bumpUidPast(loaded.nodes, loaded.edges || []);
        fitViewBoxToContent(loaded.nodes);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(t.invalidJsonAlert + msg, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050505] text-[#F5F5F5] font-sans antialiased selection:bg-white selection:text-black">
      {/* Top Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isTutorOpen={isTutorOpen}
        onToggleTutor={() => setIsTutorOpen(!isTutorOpen)}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onToggleMobileToolbar={() => setIsMobileToolbarOpen(!isMobileToolbarOpen)}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 h-[calc(100vh-56px)] w-full overflow-hidden relative pb-14 md:pb-0">
        {/* Left Toolbar */}
        <Toolbar
          language={language}
          isOpenOnMobile={isMobileToolbarOpen}
          onCloseMobile={() => setIsMobileToolbarOpen(false)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={toggleSnapToGrid}
          mode={mode}
          onSetMode={(newMode) => {
            setMode(newMode);
            setPendingConnectFrom(null);
          }}
          onAddShape={handleAddShape}
          onZoomIn={() => {
            const factor = 1.3;
            setViewBox((vb) => ({
              ...vb,
              x: vb.x + (vb.w * (1 - 1 / factor)) / 2,
              y: vb.y + (vb.h * (1 - 1 / factor)) / 2,
              w: vb.w / factor,
              h: vb.h / factor,
            }));
          }}
          onZoomOut={() => {
            const factor = 1 / 1.3;
            setViewBox((vb) => ({
              ...vb,
              x: vb.x + (vb.w * (1 - 1 / factor)) / 2,
              y: vb.y + (vb.h * (1 - 1 / factor)) / 2,
              w: vb.w / factor,
              h: vb.h / factor,
            }));
          }}
          onResetView={() => fitViewBoxToContent(nodes)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onStraightenEdge={handleStraightenEdge}
          onDeleteSelected={handleDeleteSelected}
          onClearAll={handleClearAll}
          fontSize={fontSize}
          onIncreaseFontSize={() => setFontSize((s) => Math.min(32, s + 2))}
          onDecreaseFontSize={() => setFontSize((s) => Math.max(12, s - 2))}
          onLoadTemplate={handleLoadTemplate}
          onExportPng={handleExportPng}
          onSaveJson={handleSaveJson}
          onLoadJson={handleLoadJson}
          onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        />

        {/* Center: Canvas */}
        {viewMode !== 'code' && (
          <Canvas
            language={language}
            nodes={nodes}
            edges={edges}
            mode={mode}
            fontSize={fontSize}
            selectedId={selectedId}
            selectedKind={selectedKind}
            pendingConnectFrom={pendingConnectFrom}
            onSetPendingConnectFrom={setPendingConnectFrom}
            tutorHighlightId={tutorHighlightId}
            onSelectNode={(id) => {
              if (mode === 'connect') {
                if (!pendingConnectFrom) {
                  setPendingConnectFrom(id);
                  setSelectedKind('node');
                  setSelectedId(id);
                } else if (pendingConnectFrom === id) {
                  setPendingConnectFrom(null);
                  setSelectedId(null);
                  setSelectedKind(null);
                } else {
                  handleConnectNodes(pendingConnectFrom, id);
                }
              } else {
                setSelectedKind('node');
                setSelectedId(id);
              }
            }}
            onSelectEdge={(id) => {
              setSelectedKind('edge');
              setSelectedId(id);
              setPendingConnectFrom(null);
            }}
            onClearSelection={() => {
              setSelectedKind(null);
              setSelectedId(null);
              setPendingConnectFrom(null);
            }}
            onNodeMove={handleNodeMove}
            onEdgeSegmentMove={handleEdgeSegmentMove}
            onConnectNodes={handleConnectNodes}
            onUpdateNodeText={handleUpdateNodeText}
            onUpdateEdgeLabel={handleUpdateEdgeLabel}
            viewBox={viewBox}
            onViewBoxChange={setViewBox}
            snapGuides={snapGuides}
            onClearSnapGuides={() => setSnapGuides(null)}
          />
        )}

        {/* Right: Pseudocode Panel */}
        {viewMode !== 'canvas' && (
          <PseudocodePanel
            language={language}
            code={pseudocode}
            onChangeCode={(val) => {
              setPseudocode(val);
              setParseErrors([]);
            }}
            onGenerateDiagram={handleGenerateDiagram}
            onGeneratePseudocode={handleGeneratePseudocode}
            errors={parseErrors}
            isOpen={true}
            onClose={() => setViewMode('canvas')}
          />
        )}

        {/* Slide-out AI Tutor Panel */}
        <AITutorPanel
          language={language}
          isOpen={isTutorOpen}
          onClose={() => setIsTutorOpen(false)}
          nodes={nodes}
          edges={edges}
          onHighlightNode={(id) => {
            setTutorHighlightId(id);
            if (id) {
              const target = nodes.find((n) => n.id === id);
              if (target) {
                // Pan to node
                setViewBox((vb) => ({
                  ...vb,
                  x: target.x - vb.w / 2,
                  y: target.y - vb.h / 2,
                }));
              }
            }
          }}
        />
      </div>

      {/* Android Build & Deployment Modal */}
      <AndroidBuildModal
        language={language}
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* Shortcuts & Gestures Modal */}
      <ShortcutsModal
        language={language}
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* In-App Confirmation Modal */}
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {/* Toast Notifications Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />

      {/* Mobile Bottom Navigation Bar (Android & iOS) */}
      <MobileNavBar
        language={language}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isTutorOpen={isTutorOpen}
        onToggleTutor={() => setIsTutorOpen(!isTutorOpen)}
        onToggleMobileToolbar={() => setIsMobileToolbarOpen(!isMobileToolbarOpen)}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
      />
    </div>
  );
}
