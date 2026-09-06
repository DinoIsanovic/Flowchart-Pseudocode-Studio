/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, ChevronUp, ChevronDown, TerminalSquare } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { parsePseudocode } from '../core/flowchart-gen';
import { Interpreter, StepResult, describeRunError } from '../core/interpreter';
import { formatValue } from '../core/expr';

interface SimulatorPanelProps {
  language: Language;
  pseudocode: string;
  /** Step badge of the node being executed, so the canvas can highlight it. */
  onActiveStep: (step: number | null) => void;
}

interface Snapshot {
  status: 'ready' | 'running' | 'input' | 'done' | 'error';
  step?: number;
  vars: [string, string][];
  output: string[];
  /** Variable written by the last step, highlighted for one step. */
  changed?: string;
  awaiting?: string;
  error?: string;
  errorLine?: number;
}

const EMPTY: Snapshot = { status: 'ready', vars: [], output: [] };

/** Milliseconds between steps while running — slow enough to follow by eye. */
const TICK = 550;

/**
 * Drives the interpreter and shows what it is doing.
 *
 * The controls and the readout sit at the bottom of the canvas rather than the
 * top: the mode badge already occupies the top-left corner, and on a phone the
 * buttons belong within reach of a thumb. The variable table and console stay
 * folded away until asked for, so the diagram keeps the full screen — the
 * bottom navigation is only 56px away and there is nothing to spare.
 */
export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({ language, pseudocode, onActiveStep }) => {
  const t = translations[language].sim;
  const machineRef = useRef<Interpreter | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // A run that stopped only to ask for a value picks itself back up once the
  // value arrives, so the student types and watches instead of typing and
  // then hunting for the play button again.
  const resumeAfterInput = useRef(false);

  const sync = useCallback(
    (result: StepResult) => {
      const machine = machineRef.current;
      if (!machine) return;
      setSnapshot({
        status: machine.status,
        step: result.step,
        vars: [...machine.vars].map(([name, value]) => [name, formatValue(value)] as [string, string]),
        output: [...machine.output],
        changed: result.changed,
        awaiting: result.awaiting,
        error: result.error ? describeRunError(result.error, language) : undefined,
        errorLine: result.error?.line,
      });
      onActiveStep(result.step ?? null);
    },
    [language, onActiveStep]
  );

  // Editing the pseudocode invalidates the run: the statements it was stepping
  // through no longer exist.
  useEffect(() => {
    const { statements } = parsePseudocode(pseudocode, language);
    machineRef.current = new Interpreter(statements);
    setSnapshot(EMPTY);
    setPlaying(false);
    setDraft('');
    onActiveStep(null);
  }, [pseudocode, language, onActiveStep]);

  const stepOnce = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    sync(machine.step());
    if (machine.status !== 'running') {
      resumeAfterInput.current = playing && machine.status === 'input';
      setPlaying(false);
    }
    if (machine.status === 'input' || machine.status === 'error') setOpen(true);
  }, [sync, playing]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(stepOnce, TICK);
    return () => window.clearInterval(id);
  }, [playing, stepOnce]);

  useEffect(() => {
    if (snapshot.status === 'input') inputRef.current?.focus();
  }, [snapshot.status]);

  const reset = () => {
    machineRef.current?.reset();
    setSnapshot(EMPTY);
    setPlaying(false);
    setDraft('');
    resumeAfterInput.current = false;
    onActiveStep(null);
  };

  const submitInput = () => {
    const machine = machineRef.current;
    if (!machine || machine.status !== 'input') return;
    machine.provideInput(draft);
    setDraft('');
    sync(machine.step());
    if (resumeAfterInput.current) {
      resumeAfterInput.current = false;
      setPlaying(true);
    }
  };

  const finished = snapshot.status === 'done' || snapshot.status === 'error';
  const statusText =
    snapshot.status === 'error'
      ? snapshot.error ?? ''
      : snapshot.status === 'done'
      ? t.done
      : snapshot.status === 'ready'
      ? t.ready
      : snapshot.step !== undefined
      ? `${t.stepLabel} ${snapshot.step}`
      : t.ready;

  const statusColor =
    snapshot.status === 'error'
      ? 'text-[#F87171]'
      : snapshot.status === 'input'
      ? 'text-[#FBBF24]'
      : snapshot.status === 'done'
      ? 'text-[#4ADE80]'
      : 'text-white/70';

  const button = 'flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 pointer-events-none">
      <div className="pointer-events-auto mx-2 mb-2 rounded-xl border border-white/15 bg-[#0A0A0A]/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Controls */}
        <div className="flex items-center gap-1.5 px-2 h-11">
          <button
            type="button"
            onClick={() => (finished ? reset() : setPlaying((p) => !p))}
            disabled={snapshot.status === 'input'}
            title={playing ? t.pause : t.run}
            aria-label={playing ? t.pause : t.run}
            className={`${button} ${playing ? 'text-[#06B6D4] border-[#06B6D4]/50' : ''}`}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={stepOnce}
            disabled={finished || snapshot.status === 'input'}
            title={t.step}
            aria-label={t.step}
            className={button}
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button type="button" onClick={reset} title={t.reset} aria-label={t.reset} className={button}>
            <RotateCcw className="w-4 h-4" />
          </button>

          <span className={`flex-1 min-w-0 truncate text-[11px] font-bold tracking-tight ${statusColor}`}>
            {/* The open panel already labels its own input box; repeating the
                prompt here would cost a line of a phone screen for nothing. */}
            {snapshot.status === 'input' && !open ? `${t.inputFor} ${snapshot.awaiting}` : statusText}
            {snapshot.status === 'error' && snapshot.errorLine ? ` (${snapshot.errorLine})` : ''}
          </span>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title={t.panel}
            className="flex items-center gap-1 h-8 px-2 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <TerminalSquare className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">{t.panel}</span>
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Variables and console */}
        {open && (
          <div className="border-t border-white/10 max-h-[38vh] overflow-y-auto px-2 py-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {snapshot.vars.length === 0 && <span className="text-[11px] text-white/35 italic">{t.noVars}</span>}
              {snapshot.vars.map(([name, value]) => (
                <span
                  key={name}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-colors ${
                    name === snapshot.changed
                      ? 'bg-[#06B6D4]/20 border-[#06B6D4]/60 text-[#67E8F9]'
                      : 'bg-white/5 border-white/10 text-white/80'
                  }`}
                >
                  {name}={value}
                </span>
              ))}
            </div>

            <div className="rounded-lg bg-black/60 border border-white/10 p-2 font-mono text-[11px] leading-relaxed text-white/85 min-h-[2rem]">
              {snapshot.output.length === 0 && <span className="text-white/30 italic">{t.noOutput}</span>}
              {snapshot.output.map((line, i) => (
                <div key={i} className="truncate">
                  <span className="text-white/30 select-none">&gt; </span>
                  {line}
                </div>
              ))}
            </div>

            {snapshot.status === 'input' && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="sim-input" className="text-[11px] font-bold text-[#FBBF24] shrink-0">
                  {t.inputFor} {snapshot.awaiting}
                </label>
                <input
                  id="sim-input"
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitInput();
                  }}
                  className="flex-1 min-w-0 h-8 px-2 rounded-lg bg-white/5 border border-white/15 text-white text-[12px] font-mono outline-none focus:border-[#FBBF24]/60"
                />
                <button
                  type="button"
                  onClick={submitInput}
                  className="h-8 px-3 rounded-lg bg-[#FBBF24]/20 border border-[#FBBF24]/50 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider active:scale-95 transition-all"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
