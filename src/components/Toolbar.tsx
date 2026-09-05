/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  MousePointer,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Spline,
  Trash2,
  AlertTriangle,
  Image,
  Save,
  Upload,
  Smartphone,
  X,
  LayoutGrid,
  FileCode,
  Magnet,
  Workflow,
  AlignCenter,
} from 'lucide-react';
import { Language, ShapeType } from '../types';
import { translations } from '../i18n/translations';

interface ToolbarProps {
  language: Language;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  viewMode?: 'split' | 'canvas' | 'code';
  onViewModeChange?: (mode: 'split' | 'canvas' | 'code') => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  mode: 'move' | 'connect';
  onSetMode: (mode: 'move' | 'connect') => void;
  onAddShape: (type: ShapeType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onAutoLayout?: () => void;
  onCenterNodes?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onStraightenEdge: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  fontSize: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  onLoadTemplate: (templateKey: 'sequence' | 'branch' | 'while' | 'repeat') => void;
  onExportPng: () => void;
  onSaveJson: () => void;
  onLoadJson: (file: File) => void;
  onOpenAndroidModal: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  language,
  isOpenOnMobile,
  onCloseMobile,
  viewMode,
  onViewModeChange,
  snapToGrid = true,
  onToggleSnapToGrid,
  mode,
  onSetMode,
  onAddShape,
  onZoomIn,
  onZoomOut,
  onResetView,
  onAutoLayout,
  onCenterNodes,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onStraightenEdge,
  onDeleteSelected,
  onClearAll,
  fontSize,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onLoadTemplate,
  onExportPng,
  onSaveJson,
  onLoadJson,
  onOpenAndroidModal,
}) => {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadJson(file);
      e.target.value = '';
    }
  };

  const handleAdd = (type: ShapeType) => {
    onAddShape(type);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-md transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-20 w-64 md:w-40 bg-[#0A0A0A] text-[#F5F5F5] flex flex-col overflow-y-auto p-3 gap-3 border-r border-white/10 shadow-2xl md:shadow-none transition-transform duration-200 ease-in-out ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between md:hidden pb-2 border-b border-white/10">
          <span className="font-black text-xs uppercase text-white tracking-widest">
            {t.appName}
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-white hover:bg-white/10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile View Switcher */}
        {onViewModeChange && (
          <div className="md:hidden flex flex-col gap-1.5 pb-2 border-b border-white/10">
            <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
              {language === 'en' ? 'Active View' : language === 'de' ? 'Aktive Ansicht' : 'Aktivni prikaz'}
            </span>
            <div className="grid grid-cols-2 gap-1.5 bg-[#141414] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('canvas');
                  onCloseMobile();
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'canvas' || viewMode === 'split' ? 'bg-white text-black shadow' : 'text-white/70 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Diagram' : language === 'de' ? 'Diagramm' : 'Dijagram'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('code');
                  onCloseMobile();
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'code' ? 'bg-white text-black shadow' : 'text-white/70 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Code' : language === 'de' ? 'Code' : 'Pseudokod'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Add Symbols */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.addSymbol}
          </span>

          <button
            onClick={() => handleAdd('start_end')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-white/20 text-left transition-all"
            title={t.shapes.start_end_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <ellipse cx="11" cy="8" rx="10" ry="7" fill="#152422" stroke="#2DD4BF" strokeWidth="1.5" />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.start_end}</span>
          </button>

          <button
            onClick={() => handleAdd('io')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-white/20 text-left transition-all"
            title={t.shapes.io_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <polygon points="4,1 22,1 18,15 0,15" fill="#132238" stroke="#60A5FA" strokeWidth="1.5" />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.io}</span>
          </button>

          <button
            onClick={() => handleAdd('process')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-white/20 text-left transition-all"
            title={t.shapes.process_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <rect x="1" y="1" width="20" height="14" fill="#1A1A1A" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.process}</span>
          </button>

          <button
            onClick={() => handleAdd('decision')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-white/20 text-left transition-all"
            title={t.shapes.decision_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <polygon points="11,0 22,8 11,16 0,8" fill="#291B08" stroke="#FBBF24" strokeWidth="1.5" />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.decision}</span>
          </button>

          <button
            onClick={() => handleAdd('loop')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-white/20 text-left transition-all"
            title={t.shapes.loop_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <polygon points="5,1 17,1 21,8 17,15 5,15 1,8" fill="#1F1A2E" stroke="#C084FC" strokeWidth="1.5" />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.loop}</span>
          </button>

          <button
            onClick={() => handleAdd('subprocess')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-white/20 text-left transition-all"
            title={t.shapes.subprocess_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <rect x="1" y="1" width="20" height="14" fill="#1A1A1A" stroke="#FFFFFF" strokeWidth="1.5" />
              <line x1="4.5" y1="1" x2="4.5" y2="15" stroke="#FFFFFF" strokeWidth="1.2" />
              <line x1="17.5" y1="1" x2="17.5" y2="15" stroke="#FFFFFF" strokeWidth="1.2" />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.subprocess}</span>
          </button>

          <button
            onClick={() => handleAdd('comment')}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-dashed border-white/25 text-left transition-all italic mt-0.5"
            title={t.shapes.comment_desc}
          >
            <svg width="22" height="16" className="shrink-0">
              <path
                d="M3,1 H19 A2,2 0 0 1 21,3 V9 A2,2 0 0 1 19,11 H9 L5,15 L6,11 H3 A2,2 0 0 1 1,9 V3 A2,2 0 0 1 3,1 Z"
                fill="#242218"
                stroke="#FDE047"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
            </svg>
            <span className="font-bold tracking-tight text-[11.5px] leading-tight text-left">{t.shapes.comment}</span>
          </button>
        </div>

        {/* Section 2: Mode */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/10">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.mode}
          </span>
          <button
            onClick={() => onSetMode('move')}
            className={`flex items-center gap-2 text-xs p-2 rounded-lg text-left transition-all ${
              mode === 'move'
                ? 'bg-white text-black font-black shadow-md'
                : 'bg-[#141414] hover:bg-[#1F1F1F] text-white/80 hover:text-white border border-white/10 font-bold'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[11px]">{t.modeMove}</span>
          </button>
          <button
            onClick={() => onSetMode('connect')}
            className={`flex items-center gap-2 text-xs p-2 rounded-lg text-left transition-all ${
              mode === 'connect'
                ? 'bg-white text-black font-black shadow-md'
                : 'bg-[#141414] hover:bg-[#1F1F1F] text-white/80 hover:text-white border border-white/10 font-bold'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[11px]">{t.modeConnect}</span>
          </button>

          {/* Snap to Grid & Alignment Toggle */}
          {onToggleSnapToGrid && (
            <button
              onClick={onToggleSnapToGrid}
              className={`flex items-center justify-between text-xs p-2 rounded-lg text-left transition-all border ${
                snapToGrid
                  ? 'bg-[#06B6D4]/15 border-[#06B6D4]/50 text-[#22D3EE] font-black shadow-sm'
                  : 'bg-[#141414] hover:bg-[#1F1F1F] text-white/60 hover:text-white border-white/10 font-bold'
              }`}
              title={
                language === 'en'
                  ? 'Snap to Grid & Align with Nodes (Press G)'
                  : language === 'de'
                  ? 'Am Raster & an Symbolen ausrichten (Taste G)'
                  : 'Poravnanje na raster i susjedne blokove (Tipka G)'
              }
            >
              <div className="flex items-center gap-2">
                <Magnet className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider text-[11px]">
                  {language === 'en' ? 'Snap to Grid' : language === 'de' ? 'Am Raster' : 'Magnet / Raster'}
                </span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase ${
                  snapToGrid ? 'bg-[#06B6D4] text-black' : 'bg-white/10 text-white/50'
                }`}
              >
                {snapToGrid ? 'ON' : 'OFF'}
              </span>
            </button>
          )}
        </div>

        {/* Section 3: Zoom & Layout */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/10">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.zoom}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onZoomOut}
              className="flex items-center justify-center gap-1 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 transition-colors"
              title={t.zoomOut}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomIn}
              className="flex items-center justify-center gap-1 bg-[#141414] hover:bg-[#1F1F1F] text-white text-xs p-2 rounded-lg border border-white/10 transition-colors"
              title={t.zoomIn}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Auto-Layout Action Button */}
          {onAutoLayout && (
            <button
              onClick={onAutoLayout}
              className="flex items-center justify-center gap-1.5 bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#22D3EE] hover:text-white text-[11px] font-black uppercase tracking-wider p-2 rounded-lg border border-[#06B6D4]/40 hover:border-[#06B6D4] transition-all shadow-sm group"
              title={t.autoLayoutTooltip}
            >
              <Workflow className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              <span>{t.autoLayout}</span>
            </button>
          )}

          {/* Reset View & Center Nodes — full width rather than a two-column
              grid: at half the sidebar these labels truncated to "RES…", and
              "Ansicht zurücksetzen" never had a chance. There is room below the
              zoom buttons, so they get a row each and wrap if they must. */}
          <button
            onClick={onResetView}
            className="flex items-center justify-center gap-1.5 bg-[#141414] hover:bg-[#1F1F1F] text-white text-[10px] font-bold uppercase tracking-wider leading-tight p-2 rounded-lg border border-white/10 transition-colors text-center"
            title={t.resetView}
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span>{t.resetView}</span>
          </button>
          {onCenterNodes && (
            <button
              onClick={onCenterNodes}
              className="flex items-center justify-center gap-1.5 bg-[#141414] hover:bg-[#1F1F1F] text-white text-[10px] font-bold uppercase tracking-wider leading-tight p-2 rounded-lg border border-white/10 transition-colors text-center"
              title={t.centerNodesTooltip}
            >
              <AlignCenter className="w-3 h-3 shrink-0" />
              <span>{t.centerNodes}</span>
            </button>
          )}
        </div>

        {/* Section 4: Edit */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/10">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.edit}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center justify-center gap-1 bg-[#141414] hover:bg-[#1F1F1F] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-tight leading-tight text-center p-2 rounded-lg border border-white/10 transition-colors min-w-0"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3 h-3" />
              <span>{t.undo}</span>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center justify-center gap-1 bg-[#141414] hover:bg-[#1F1F1F] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-tight leading-tight text-center p-2 rounded-lg border border-white/10 transition-colors min-w-0"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3 h-3" />
              <span>{t.redo}</span>
            </button>
          </div>
          <button
            onClick={onStraightenEdge}
            className="flex items-center justify-center gap-1.5 bg-[#141414] hover:bg-[#1F1F1F] text-white text-[11px] font-bold uppercase tracking-wider p-2 rounded-lg border border-white/10 transition-colors text-center"
            title={t.straightenEdgeTooltip}
          >
            <Spline className="w-3.5 h-3.5" />
            <span>{t.straightenEdge}</span>
          </button>
          <button
            onClick={onDeleteSelected}
            className="flex items-center justify-center gap-1.5 bg-red-950/70 hover:bg-red-900 text-red-200 text-[11px] font-black uppercase tracking-wider p-2 rounded-lg border border-red-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.deleteSelected}</span>
          </button>
          <button
            id="toolbar-clear-canvas-btn"
            onClick={onClearAll}
            className="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-[10.5px] font-bold uppercase tracking-wider p-1.5 rounded-lg border border-white/5 transition-colors cursor-pointer"
            title={t.clearAll}
          >
            <AlertTriangle className="w-3 h-3 text-amber-500/80" />
            <span>{t.clearAll}</span>
          </button>
        </div>

        {/* Section 5: Font Size */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/10">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.textSize}
          </span>
          <div className="flex items-center justify-between bg-[#121212] p-1.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={onDecreaseFontSize}
              className="w-8 h-7 rounded-md bg-[#1C1C1C] hover:bg-[#282828] text-white font-black flex items-center justify-center transition-colors"
            >
              –
            </button>
            <span className="font-mono font-black text-center w-7 text-white text-sm">{fontSize}</span>
            <button
              onClick={onIncreaseFontSize}
              className="w-8 h-7 rounded-md bg-[#1C1C1C] hover:bg-[#282828] text-white font-black flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Section 6: Examples */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/10">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.examples}
          </span>
          <button
            onClick={() => { onLoadTemplate('sequence'); onCloseMobile(); }}
            className="bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 hover:border-white/20 text-white text-[11px] font-bold p-2 rounded-lg text-left uppercase tracking-wider leading-tight transition-colors"
          >
            {t.templates.sequence}
          </button>
          <button
            onClick={() => { onLoadTemplate('branch'); onCloseMobile(); }}
            className="bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 hover:border-white/20 text-white text-[11px] font-bold p-2 rounded-lg text-left uppercase tracking-wider leading-tight transition-colors"
          >
            {t.templates.branch}
          </button>
          <button
            onClick={() => { onLoadTemplate('while'); onCloseMobile(); }}
            className="bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 hover:border-white/20 text-white text-[11px] font-bold p-2 rounded-lg text-left uppercase tracking-wider leading-tight transition-colors"
          >
            {t.templates.while}
          </button>
          <button
            onClick={() => { onLoadTemplate('repeat'); onCloseMobile(); }}
            className="bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 hover:border-white/20 text-white text-[11px] font-bold p-2 rounded-lg text-left uppercase tracking-wider leading-tight transition-colors"
          >
            {t.templates.repeat}
          </button>
        </div>

        {/* Section 7: File & Android */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/10">
          <span className="text-[9.5px] font-black tracking-[0.2em] text-white/50 uppercase px-1">
            {t.file}
          </span>
          <button
            onClick={onExportPng}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider p-2 rounded-lg text-left transition-colors"
          >
            <Image className="w-3.5 h-3.5 shrink-0 text-white/70" />
            <span className="leading-tight text-center">{t.exportPng}</span>
          </button>
          <button
            onClick={onSaveJson}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider p-2 rounded-lg text-left transition-colors"
          >
            <Save className="w-3.5 h-3.5 shrink-0 text-white/70" />
            <span className="leading-tight text-center">{t.saveJson}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1F1F1F] border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider p-2 rounded-lg text-left transition-colors"
          >
            <Upload className="w-3.5 h-3.5 shrink-0 text-white/70" />
            <span className="leading-tight text-center">{t.loadJson}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={onOpenAndroidModal}
            className="flex items-center gap-2 bg-[#06B6D4] hover:bg-[#22D3EE] text-black text-[11px] font-black uppercase tracking-wider p-2 rounded-lg text-left mt-1 shadow-sm transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span className="leading-tight text-center">{t.androidPrep}</span>
          </button>
        </div>

        {/* Author Credit */}
        <div className="mt-auto pt-4 border-t border-white/10 text-[10px] leading-tight text-white/40">
          {t.authorCredit}<br />
          <a
            href="mailto:sekcijainfor@gmail.com"
            className="text-white/70 hover:underline font-mono"
          >
            sekcijainfor@gmail.com
          </a>
        </div>
      </aside>
    </>
  );
};
