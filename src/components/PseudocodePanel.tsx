/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, ArrowLeft, ArrowRight, AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { Language, ParseError } from '../types';
import { translations } from '../i18n/translations';
import { AUTOCOMPLETE_KEYWORDS, KeywordItem } from '../i18n/keywords';
import { normWord } from '../core/flowchart-gen';

interface PseudocodePanelProps {
  language: Language;
  code: string;
  onChangeCode: (code: string) => void;
  onGenerateDiagram: () => void;
  onGeneratePseudocode: () => void;
  errors: ParseError[];
  isOpen: boolean;
  onClose: () => void;
}

export const PseudocodePanel: React.FC<PseudocodePanelProps> = ({
  language,
  code,
  onChangeCode,
  onGenerateDiagram,
  onGeneratePseudocode,
  errors,
  isOpen,
  onClose,
}) => {
  const t = translations[language];
  const [legendOpen, setLegendOpen] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<KeywordItem[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestBoxPos, setSuggestBoxPos] = useState<{ left: number; top: number } | null>(null);
  const [replaceRange, setReplaceRange] = useState<{ start: number; end: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const keywords = AUTOCOMPLETE_KEYWORDS[language];

  // Sync scroll between textarea and error highlight backdrop
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    setSuggestBoxPos(null);
  };

  const updateSuggestions = () => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart;
    if (caret !== el.selectionEnd) {
      setSuggestBoxPos(null);
      return;
    }

    const value = el.value;
    const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
    const lineBeforeCaret = value.slice(lineStart, caret);
    const match = /^([ \t]*)([A-Za-zČĆŠŽĐčćšžđÄÖÜäöüß]+(?:[ \t]+[A-Za-zČĆŠŽĐčćšžđÄÖÜäöüß]*)?)$/.exec(lineBeforeCaret);

    if (!match) {
      setSuggestBoxPos(null);
      return;
    }

    const head = match[2];
    const nHead = normWord(head);
    if (!nHead) {
      setSuggestBoxPos(null);
      return;
    }

    const matched = keywords.filter((k) => {
      const nk = normWord(k.word);
      return nk.startsWith(nHead) && nk !== nHead;
    });

    if (!matched.length) {
      setSuggestBoxPos(null);
      return;
    }

    // Measure caret coordinates
    const linesCount = (value.slice(0, caret).match(/\n/g) || []).length;
    const colCount = caret - (value.lastIndexOf('\n', caret - 1) + 1);
    const lineH = 21; // roughly 14px * 1.5
    const charW = 8.5; // monospaced char width

    const rect = el.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.left + colCount * charW + 16 - el.scrollLeft, window.innerWidth - 240));
    const y = Math.min(rect.top + (linesCount + 1) * lineH + 16 - el.scrollTop, window.innerHeight - 200);

    setSuggestions(matched);
    setSuggestionIndex(0);
    setSuggestBoxPos({ left: x, top: y });
    setReplaceRange({ start: lineStart + match[1].length, end: caret });
  };

  const acceptSuggestion = (item: KeywordItem) => {
    if (!replaceRange || !textareaRef.current) return;
    const insert = item.word + (item.arg ? ' ' : '');
    const val = code;
    const newVal = val.slice(0, replaceRange.start) + insert + val.slice(replaceRange.end);
    onChangeCode(newVal);
    setSuggestBoxPos(null);

    setTimeout(() => {
      if (textareaRef.current) {
        const nextPos = replaceRange.start + insert.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestBoxPos && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        acceptSuggestion(suggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestBoxPos(null);
        return;
      }
    }

    // Support Tab indentation
    if (e.key === 'Tab' && !suggestBoxPos) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChangeCode(newCode);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      }, 0);
    }
  };

  const hardErrors = errors.filter((e) => e.severity !== 'warning');
  const warnings = errors.filter((e) => e.severity === 'warning');
  const errorLines = new Set<number>(hardErrors.map((e) => e.line));
  const warningLines = new Set<number>(warnings.map((e) => e.line));
  const codeLines = code.split('\n');

  if (!isOpen) return null;

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] bg-[#0A0A0A] text-[#F5F5F5] border-l border-white/10 flex flex-col h-full z-20 shadow-2xl select-none md:select-auto shrink-0 transition-all">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#121212]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#06B6D4]" />
          <span className="font-black text-xs uppercase tracking-widest text-white">{t.pseudocodeHeader}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Back to Diagram Button */}
          <button
            onClick={onClose}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider transition-colors border border-white/15"
            title={language === 'en' ? 'Back to diagram' : language === 'de' ? 'Zurück zum Diagramm' : 'Nazad na dijagram'}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Diagram' : language === 'de' ? 'Diagramm' : 'Dijagram'}</span>
          </button>
          <button
            onClick={onClose}
            className="hidden md:block p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cheatsheet Accordion */}
      <div className="border-b border-white/10 bg-[#0F0F0F]">
        <button
          type="button"
          onClick={() => setLegendOpen(!legendOpen)}
          className="w-full px-3 py-2 text-xs font-black uppercase tracking-wider text-white/80 hover:text-white flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <span>{t.keywordsToggle}</span>
          {legendOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {legendOpen && (
          <div className="px-3 pb-3 text-[11px] leading-relaxed text-white/80 space-y-1 bg-[#141414] border-t border-white/10 max-h-48 overflow-y-auto font-mono">
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.input}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.output}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.assign}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.calc}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.ifThen}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.ifElse}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.elseIf}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.repeatCount}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.whileLoop}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.repeatUntil}</div>
            <div className="font-mono font-bold text-[#22D3EE]">{t.keywordsLegend.startEnd}</div>
            <div className="pt-1 text-white/40 border-t border-white/10 italic">{t.keywordsLegend.indentNotice}</div>
            <div className="text-[#FBBF24] font-bold">{t.keywordsLegend.tipTab}</div>
          </div>
        )}
      </div>

      {/* Parse Errors Banner */}
      {hardErrors.length > 0 && (
        <div className="m-2.5 p-2.5 bg-red-950/80 border border-red-500/40 border-l-4 border-l-red-500 rounded-lg text-xs text-red-200 max-h-36 overflow-y-auto font-mono">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-wider font-sans font-black">{t.errorHeader}</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {hardErrors.slice(0, 5).map((err, i) => (
              <li key={i}>
                <span className="font-bold text-white">{err.line}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings Banner — the diagram was still drawn */}
      {warnings.length > 0 && (
        <div className="m-2.5 p-2.5 bg-amber-950/70 border border-amber-500/40 border-l-4 border-l-amber-400 rounded-lg text-xs text-amber-100 max-h-36 overflow-y-auto font-mono">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-wider font-sans font-black">{t.warningHeader}</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {warnings.slice(0, 5).map((warn, i) => (
              <li key={i}>
                <span className="font-bold text-white">{warn.line}:</span> {warn.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Code Textarea with Aligned Error Highlights */}
      <div className="relative flex-1 min-h-0 bg-[#050505] font-mono text-[13px] leading-[21px]">
        {/* Error Highlighting Layer Behind Textarea */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="absolute inset-0 p-3 pointer-events-none whitespace-pre overflow-hidden text-transparent"
        >
          {codeLines.map((line, idx) => {
            const isErr = errorLines.has(idx + 1);
            const isWarn = !isErr && warningLines.has(idx + 1);
            return (
              <div
                key={idx}
                className={
                  isErr
                    ? 'bg-red-950/50 border-l-4 border-red-500'
                    : isWarn
                    ? 'bg-amber-950/40 border-l-4 border-amber-400'
                    : ''
                }
              >
                {line || ' '}
              </div>
            );
          })}
        </div>

        {/* Real Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            onChangeCode(e.target.value);
            updateSuggestions();
          }}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onClick={updateSuggestions}
          onKeyUp={updateSuggestions}
          spellCheck={false}
          autoComplete="off"
          placeholder={t.pseudoPlaceholder}
          className="absolute inset-0 w-full h-full p-3 bg-transparent text-[#F5F5F5] resize-none outline-none overflow-auto font-mono text-[13px] leading-[21px] selection:bg-white/20"
        />
      </div>

      {/* Autocomplete Popup */}
      {suggestBoxPos && suggestions.length > 0 && (
        <div
          className="fixed z-50 bg-[#141414] border border-white/20 rounded-lg shadow-2xl p-1 text-xs w-64 max-h-56 overflow-y-auto text-white backdrop-blur-md"
          style={{ left: `${suggestBoxPos.left}px`, top: `${suggestBoxPos.top}px` }}
        >
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={() => acceptSuggestion(item)}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                idx === suggestionIndex
                  ? 'bg-white text-black font-black'
                  : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <div className={`font-mono font-bold ${idx === suggestionIndex ? 'text-black' : 'text-[#22D3EE]'}`}>
                {item.word}
              </div>
              <div className={`text-[10.5px] ${idx === suggestionIndex ? 'text-neutral-700' : 'text-white/50'}`}>
                {item.hint}
              </div>
            </div>
          ))}
          <div className="border-t border-white/10 mt-1 pt-1 text-[10px] text-white/40 text-center font-mono">
            {t.autocompleteTip}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-3 border-t border-white/10 bg-[#121212] flex flex-col gap-2">
        <button
          onClick={onGenerateDiagram}
          className="w-full bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-wider text-xs py-2.5 px-3 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
          title={t.generateDiagram}
        >
          <ArrowLeft className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>{t.generateDiagram}</span>
        </button>

        <button
          onClick={onGeneratePseudocode}
          className="w-full bg-[#1A1A1A] hover:bg-[#262626] text-white font-black uppercase tracking-wider text-xs py-2.5 px-3 rounded-lg border border-white/20 shadow flex items-center justify-center gap-2 transition-colors"
          title={t.generatePseudo}
        >
          <span>{t.generatePseudo}</span>
          <ArrowRight className="w-4 h-4 shrink-0 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
