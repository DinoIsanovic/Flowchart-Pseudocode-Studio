/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { Finding, Severity, describeFinding } from '../core/diagnose';

interface DiagnosticsPanelProps {
  language: Language;
  /** Empty and a written program mean different things; the panel says which. */
  hasCode: boolean;
  findings: Finding[];
  /** Takes the student to the line a finding sits on. */
  onSelectLine: (line: number) => void;
}

/**
 * Colour and icon per severity. There is no count of each above the list: the
 * tab already carries the number, and "1 errors" needs a plural system in four
 * languages to say what the list below says by itself.
 */
const LOOK: Record<Severity, { icon: typeof AlertCircle; frame: string; tint: string }> = {
  greska: { icon: AlertCircle, frame: 'border-l-red-500 bg-red-950/40', tint: 'text-red-300' },
  upozorenje: { icon: AlertTriangle, frame: 'border-l-amber-400 bg-amber-950/30', tint: 'text-amber-200' },
  savjet: { icon: Lightbulb, frame: 'border-l-[#06B6D4] bg-[#06B6D4]/5', tint: 'text-[#67E8F9]' },
};

/**
 * What the offline check found, worst first.
 *
 * Each entry says what is wrong and what to do about it, and takes the student
 * to the line when there is one — the message is only half the help if they
 * then have to hunt for the place it means.
 */
export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ language, hasCode, findings, onSelectLine }) => {
  const t = translations[language].diag;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#050505] px-2.5 py-2.5 space-y-2">
      <p className="text-[10.5px] leading-snug text-white/40 px-0.5">{t.note}</p>

      {!hasCode && <p className="text-[12px] text-white/45 italic px-0.5 pt-2">{t.empty}</p>}

      {hasCode && findings.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/5 p-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ADE80] mt-px" />
          <span className="text-[12px] leading-snug text-[#BBF7D0]">{t.clean}</span>
        </div>
      )}

      {findings.map((f, i) => {
        const look = LOOK[f.severity];
        const Icon = look.icon;
        const said = describeFinding(f, language);
        return (
          <div
            key={i}
            onClick={() => f.line && onSelectLine(f.line)}
            className={`rounded-lg border border-white/10 border-l-4 p-2.5 ${look.frame} ${
              f.line ? 'cursor-pointer hover:border-white/25' : ''
            } transition-colors`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${look.tint}`} />
              <div className="min-w-0 flex-1">
                {!!f.line && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/45 mr-1.5">
                    {t.line} {f.line}
                  </span>
                )}
                <span className="text-[12px] leading-snug text-white/90">{said.message}</span>
                <p className="mt-1 text-[11px] leading-snug text-white/50">{said.fix}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
