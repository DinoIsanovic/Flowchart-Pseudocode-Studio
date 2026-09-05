/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Columns,
  Maximize,
  Minimize,
  Smartphone,
  GraduationCap,
  Keyboard,
  Download,
  Globe,
  Menu,
  FileCode,
  LayoutGrid,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  viewMode: 'split' | 'canvas' | 'code';
  onViewModeChange: (mode: 'split' | 'canvas' | 'code') => void;
  isTutorOpen: boolean;
  onToggleTutor: () => void;
  onOpenAndroidModal: () => void;
  onOpenShortcutsModal: () => void;
  onToggleMobileToolbar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  viewMode,
  onViewModeChange,
  isTutorOpen,
  onToggleTutor,
  onOpenAndroidModal,
  onOpenShortcutsModal,
  onToggleMobileToolbar,
}) => {
  const t = translations[language];
  const { isInstallable, install } = usePWAInstall();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const languageLabels: Record<Language, { label: string; flag: string }> = {
    en: { label: 'English', flag: '🇬🇧' },
    de: { label: 'Deutsch', flag: '🇩🇪' },
    bs: { label: 'Bosanski', flag: '🇧🇦' },
  };

  return (
    <header className="h-14 min-h-[56px] bg-[#0A0A0A] text-[#F5F5F5] flex items-center justify-between px-3 md:px-5 border-b border-white/10 select-none z-30 shadow-lg">
      {/* Left: Brand & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileToolbar}
          className="md:hidden p-2 rounded-lg bg-[#161616] hover:bg-[#242424] border border-white/15 text-white focus:outline-none transition-colors"
          title="Toggle tools"
          aria-label="Toggle tools"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shadow-md font-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="6" rx="2" fill="#E5E5E5" />
              <path d="M12 9v4" />
              <polygon points="12,17 7,13 17,13" fill="#050505" />
              <path d="M12 17v4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm md:text-base leading-tight tracking-tight uppercase flex items-center gap-1.5 text-white">
              {t.appName}
              <span className="hidden lg:inline-block text-[9px] uppercase font-extrabold tracking-widest bg-white/10 text-white/90 border border-white/20 px-2 py-0.5 rounded-full">
                Android Ready
              </span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-white/50 hidden sm:inline leading-none mt-0.5">
              {t.appSubtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Center: View Switcher (Desktop & Mobile) */}
      <div className="flex items-center bg-[#121212] p-0.5 md:p-1 rounded-xl border border-white/15 text-xs font-bold shadow-inner">
        <button
          onClick={() => onViewModeChange('split')}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            viewMode === 'split' ? 'bg-white text-black font-black shadow-sm' : 'text-white/60 hover:text-white'
          }`}
          title={t.viewSplit}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wider text-[11px]">{t.viewSplit}</span>
        </button>
        <button
          onClick={() => onViewModeChange('canvas')}
          className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all ${
            viewMode === 'canvas' ? 'bg-white text-black font-black shadow-sm' : 'text-white/60 hover:text-white'
          }`}
          title={t.viewCanvasOnly}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wider text-[10px] md:text-[11px]">
            {language === 'en' ? 'Diagram' : language === 'de' ? 'Diagramm' : 'Dijagram'}
          </span>
        </button>
        <button
          onClick={() => onViewModeChange('code')}
          className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all ${
            viewMode === 'code' ? 'bg-white text-black font-black shadow-sm' : 'text-white/60 hover:text-white'
          }`}
          title={t.viewPseudoOnly}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wider text-[10px] md:text-[11px]">
            {language === 'en' ? 'Code' : language === 'de' ? 'Code' : 'Pseudokod'}
          </span>
        </button>
      </div>

      {/* Right: Actions, Language Switcher, AI Tutor */}
      <div className="flex items-center gap-2 md:gap-2.5">
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1.5 bg-[#161616] hover:bg-[#222222] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/15 transition-colors shadow-sm"
            title="Change Language / Promijeni jezik / Sprache wechseln"
          >
            <span className="text-sm">{languageLabels[language].flag}</span>
            <span className="hidden sm:inline uppercase tracking-wider text-[11px]">{languageLabels[language].label}</span>
            <Globe className="w-3.5 h-3.5 text-white/60" />
          </button>

          {langMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-40 bg-[#121212] border border-white/20 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden text-xs">
                {(['en', 'de', 'bs'] as Language[]).map((langKey) => (
                  <button
                    key={langKey}
                    onClick={() => {
                      onLanguageChange(langKey);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors font-bold uppercase tracking-wider text-[11px] ${
                      language === langKey ? 'bg-white text-black font-black' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base">{languageLabels[langKey].flag}</span>
                    <span>{languageLabels[langKey].label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Android Build Button */}
        <button
          onClick={onOpenAndroidModal}
          className="flex items-center gap-1.5 bg-[#06B6D4] hover:bg-[#22D3EE] text-black text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm transition-colors"
          title={t.androidPrep}
        >
          <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">{t.androidPrep}</span>
        </button>

        {/* AI Tutor Toggle */}
        <button
          onClick={onToggleTutor}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all shadow-sm ${
            isTutorOpen
              ? 'bg-white text-black border-white font-black'
              : 'bg-[#161616] text-white border-white/15 hover:bg-[#242424] font-bold'
          }`}
          title={t.tutorBtn}
        >
          <GraduationCap className="w-4 h-4" />
          <span className="hidden sm:inline uppercase tracking-wider text-[11px]">{t.tutorBtn}</span>
        </button>

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcutsModal}
          className="hidden md:flex p-1.5 rounded-lg bg-[#161616] hover:bg-[#242424] border border-white/15 text-white/70 hover:text-white transition-colors"
          title={t.shortcutsBtn}
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Install PWA Prompt (if available) */}
        {isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow transition-colors animate-pulse"
            title={t.installBtn}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden lg:inline">{t.installBtn}</span>
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden lg:flex p-1.5 rounded-lg bg-[#161616] hover:bg-[#242424] border border-white/15 text-white/70 hover:text-white transition-colors"
          title={t.fullscreen}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
