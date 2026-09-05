/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutGrid, FileCode, Menu, GraduationCap, Smartphone } from 'lucide-react';
import { Language } from '../types';

interface MobileNavBarProps {
  language: Language;
  viewMode: 'split' | 'canvas' | 'code';
  onViewModeChange: (mode: 'split' | 'canvas' | 'code') => void;
  isTutorOpen: boolean;
  onToggleTutor: () => void;
  onToggleMobileToolbar: () => void;
  onOpenAndroidModal: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  language,
  viewMode,
  onViewModeChange,
  isTutorOpen,
  onToggleTutor,
  onToggleMobileToolbar,
  onOpenAndroidModal,
}) => {
  const isDiagramActive = viewMode === 'canvas' || viewMode === 'split';
  const isCodeActive = viewMode === 'code';

  const labels = {
    diagram: language === 'en' ? 'Diagram' : language === 'de' ? 'Diagramm' : 'Dijagram',
    code: language === 'en' ? 'Pseudocode' : language === 'de' ? 'Pseudocode' : 'Pseudokod',
    tools: language === 'en' ? 'Tools' : language === 'de' ? 'Werkzeuge' : 'Alati',
    tutor: language === 'en' ? 'Tutor' : language === 'de' ? 'Tutor' : 'Tutor',
    android: 'Android',
  };

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/15 h-14 flex items-center justify-around px-1 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.7)]"
    >
      {/* 1. Diagram View */}
      <button
        type="button"
        id="mobile-nav-diagram"
        onClick={() => onViewModeChange('canvas')}
        className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all ${
          isDiagramActive && !isTutorOpen
            ? 'text-[#06B6D4] font-black'
            : 'text-white/60 hover:text-white font-medium'
        }`}
      >
        <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight uppercase mt-0.5">{labels.diagram}</span>
        {isDiagramActive && !isTutorOpen && (
          <span className="w-4 h-0.5 bg-[#06B6D4] rounded-full mt-0.5" />
        )}
      </button>

      {/* 2. Pseudocode View */}
      <button
        type="button"
        id="mobile-nav-code"
        onClick={() => onViewModeChange('code')}
        className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all ${
          isCodeActive && !isTutorOpen
            ? 'text-[#06B6D4] font-black'
            : 'text-white/60 hover:text-white font-medium'
        }`}
      >
        <FileCode className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight uppercase mt-0.5">{labels.code}</span>
        {isCodeActive && !isTutorOpen && (
          <span className="w-4 h-0.5 bg-[#06B6D4] rounded-full mt-0.5" />
        )}
      </button>

      {/* 3. Shapes & Tools Drawer */}
      <button
        type="button"
        id="mobile-nav-tools"
        onClick={onToggleMobileToolbar}
        className="flex-1 flex flex-col items-center justify-center h-full py-1 text-white/70 hover:text-white font-medium transition-all"
      >
        <Menu className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight uppercase mt-0.5">{labels.tools}</span>
      </button>

      {/* 4. AI Tutor */}
      <button
        type="button"
        id="mobile-nav-tutor"
        onClick={onToggleTutor}
        className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all ${
          isTutorOpen
            ? 'text-[#A855F7] font-black'
            : 'text-white/60 hover:text-white font-medium'
        }`}
      >
        <GraduationCap className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight uppercase mt-0.5">{labels.tutor}</span>
        {isTutorOpen && (
          <span className="w-4 h-0.5 bg-[#A855F7] rounded-full mt-0.5" />
        )}
      </button>

      {/* 5. Android APK / PWA Modal */}
      <button
        type="button"
        id="mobile-nav-android"
        onClick={onOpenAndroidModal}
        className="flex-1 flex flex-col items-center justify-center h-full py-1 text-[#22D3EE]/80 hover:text-[#22D3EE] font-medium transition-all"
      >
        <Smartphone className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight uppercase mt-0.5">{labels.android}</span>
      </button>
    </nav>
  );
};
