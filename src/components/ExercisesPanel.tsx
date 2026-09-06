/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, GraduationCap, RotateCcw, Workflow, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { buildFlowchart, parsePseudocode } from '../core/flowchart-gen';
import { describeDiagramIssue } from '../core/diagram-check';
import { Interpreter } from '../core/interpreter';
import { Task, TaskPack, text } from '../exercises/types';
import { blankedText, blanks, fillBlanks, solutionText, tiles } from '../exercises/render';
import { GradeResult, describeGrade, gradeAttempt } from '../exercises/grade';
import { gradeTrace, traceTask } from '../exercises/trace';
import { MistakeKind, mistakeFor, plantMistake } from '../exercises/plant';
import { MiniDiagram } from './MiniDiagram';
import linijska from '../exercises/linijska.json';

interface ExercisesPanelProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  /** Loads the finished program into the app — the reward for solving one. */
  onReward: (code: string) => void;
}

const PACK = linijska as TaskPack;
const PROGRESS_KEY = 'flowchart_studio_vjezbe_v1';

/**
 * Marks where a blank sits while a line is split into parts. A control
 * character, not `___`, so a solution that legitimately contains underscores
 * can never be mistaken for a blank.
 */
const HOLE = '\u0001';

function loadProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Shuffled once per task and always the same way, so a class working from the
 * printed worksheet sees the tiles in the order the screen shows them.
 */
function shuffled(items: string[], seed: string): string[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The exercise types this panel can actually run, in the order they appear. */
const IN_APP_TYPES = ['kockice', 'dopuni', 'prepoznaj', 'tabela', 'dijagram-greska'];

/** The exercise a task is built for — the first type its author listed. */
function primaryType(task: Task): string {
  return task.types.find((x) => IN_APP_TYPES.includes(x)) ?? 'samostalno';
}

/**
 * Everything this task offers on screen. 'greska' and 'samostalno' are
 * authored but have no exercise here yet, so they stay on paper.
 */
function availableTypes(task: Task): string[] {
  return task.types.filter((x) => IN_APP_TYPES.includes(x));
}

export const ExercisesPanel: React.FC<ExercisesPanelProps> = ({ language, isOpen, onClose, onReward }) => {
  const t = translations[language].vjezbe;
  const [openId, setOpenId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress);
  const [placed, setPlaced] = useState<number[]>([]);
  const [filled, setFilled] = useState<string[]>([]);
  const [predicted, setPredicted] = useState<string[]>([]);
  const [traced, setTraced] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<string>('kockice');
  const [pickedShape, setPickedShape] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);

  const task = useMemo(() => PACK.tasks.find((x) => x.id === openId) ?? null, [openId]);
  const solution = task ? solutionText(task, language) : '';
  const pool = useMemo(() => (task ? shuffled(tiles(task, language), task.id) : []), [task, language]);
  const holes = useMemo(() => (task ? blanks(task, language) : []), [task, language]);

  /** What each test case prints — the answer key for a 'prepoznaj' exercise. */
  const expected = useMemo(() => {
    if (!task) return [];
    const { statements } = parsePseudocode(solution, language);
    return task.tests.map((inputs) => {
      const machine = new Interpreter(statements);
      machine.runToEnd(inputs);
      return machine.output.join(' / ');
    });
  }, [task, solution, language]);

  /**
   * The diagram of this task with one mistake planted in it. The same task
   * always gets the same mistake, so a class works on one picture.
   */
  const planted = useMemo(() => {
    if (!task) return null;
    const { statements } = parsePseudocode(solution, language);
    const built = buildFlowchart(statements, language);
    return plantMistake(built.nodes, built.edges, (task.mistake as MistakeKind) ?? mistakeFor(task.id));
  }, [task, solution, language]);

  /** The run a state-table exercise is filled in against — the first test case. */
  const trace = useMemo(
    () => (task ? traceTask(task, language, task.tests[0] ?? []) : null),
    [task, language]
  );

  if (!isOpen) return null;

  const openTask = (next: Task) => {
    setOpenId(next.id);
    setPlaced([]);
    setFilled([]);
    setPredicted([]);
    setTraced([]);
    setPickedShape(null);
    setActiveType(primaryType(next));
    setResult(null);
  };

  const markSolved = (id: string) => {
    const next = { ...progress, [id]: true };
    setProgress(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      // A browser with storage switched off must not break the exercise.
    }
  };

  const check = () => {
    if (!task) return;
    const kind = activeType;
    let outcome: GradeResult;

    if (kind === 'dijagram-greska' && planted) {
      if (!pickedShape) {
        outcome = { correct: false, reason: 'dijagram', message: t.findMistake };
      } else if (planted.answerIds.includes(pickedShape)) {
        const issue = planted.issues.find((i) => i.nodeId === pickedShape);
        outcome = { correct: true, message: issue ? describeDiagramIssue(issue, language) : undefined };
      } else {
        outcome = { correct: false, reason: 'dijagram', message: t.wrongPick };
      }
    } else if (kind === 'tabela' && trace) {
      const marked = gradeTrace(trace, traced);
      const row = marked.firstWrong ?? 0;
      outcome = marked.correct
        ? { correct: true }
        : {
            correct: false,
            reason: 'tabela',
            mismatch: {
              inputs: [String(trace.rows[row].step ?? row + 1)],
              expected: [trace.rows[row].values[trace.rows[row].changed]],
              got: [(traced[row] ?? '').trim() || '—'],
            },
          };
    } else if (kind === 'prepoznaj') {
      const wrong = expected.findIndex((want, i) => (predicted[i] ?? '').trim() !== want);
      outcome =
        wrong < 0
          ? { correct: true }
          : {
              correct: false,
              reason: 'ispis',
              mismatch: {
                inputs: task.tests[wrong],
                expected: [expected[wrong]],
                got: [(predicted[wrong] ?? '').trim() || '—'],
              },
            };
    } else if (kind === 'dopuni' && holes.some((_, i) => !(filled[i] ?? '').trim())) {
      // An empty blank collapses the line and the parser complains about
      // indentation, which tells the student nothing about what to do.
      outcome = { correct: false, reason: 'nepotpuno', message: t.fillAll };
    } else {
      const code =
        kind === 'kockice' ? placed.map((i) => pool[i]).join('\n') : fillBlanks(task, language, filled);
      outcome = gradeAttempt(task, code, language);
    }

    setResult(outcome);
    if (outcome.correct) markSolved(task.id);
  };

  const solvedCount = PACK.tasks.filter((x) => progress[x.id]).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/97 backdrop-blur-xl flex flex-col">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 h-14 border-b border-white/10 shrink-0">
          {task ? (
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="flex items-center gap-1 px-2 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-[11px] font-black uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </button>
          ) : (
            <span className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
              <GraduationCap className="w-4 h-4 text-[#06B6D4]" />
              {t.title}
            </span>
          )}
          <span className="flex-1 min-w-0 truncate text-[11px] text-white/45 text-right">
            {solvedCount} / {PACK.tasks.length} {t.progress}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {!task && (
            <>
              <p className="text-[11px] text-white/45 mb-3 px-1">{t.intro}</p>
              <div className="flex flex-col gap-1.5">
                {PACK.tasks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openTask(item)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors"
                  >
                    <span className="w-6 shrink-0 text-center text-[11px] font-black text-white/40">
                      {item.level}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-white truncate">
                        {text(item.title, language)}
                      </span>
                      <span className="block text-[10px] uppercase tracking-wider text-white/35">
                        {t.types[primaryType(item)] ?? primaryType(item)}
                      </span>
                    </span>
                    {progress[item.id] && <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {task && (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-white font-black text-[15px]">{text(task.title, language)}</h2>
                <p className="text-[12px] text-white/60 mt-1">{text(task.prompt, language)}</p>
                {task.hint && (
                  <p className="mt-2 rounded-lg border border-[#06B6D4]/30 bg-[#06B6D4]/10 px-2.5 py-1.5 text-[11.5px] text-[#A5F3FC]">
                    <span className="font-black uppercase tracking-wider text-[9.5px] text-[#06B6D4] mr-1.5">
                      {t.hint}
                    </span>
                    {text(task.hint, language)}
                  </p>
                )}
              </div>

              {availableTypes(task).length > 1 && (
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                  {availableTypes(task).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        setActiveType(kind);
                        setResult(null);
                      }}
                      className={`flex-1 min-w-0 truncate px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        activeType === kind ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {t.types[kind] ?? kind}
                    </button>
                  ))}
                </div>
              )}

              {activeType === 'kockice' && (
                <>
                  <Section label={t.answer}>
                    {placed.length === 0 && <Hint>{t.answerEmpty}</Hint>}
                    {placed.map((idx, position) => (
                      <Tile
                        key={`${idx}-${position}`}
                        line={pool[idx]}
                        index={position + 1}
                        onClick={() => setPlaced(placed.filter((_, i) => i !== position))}
                      />
                    ))}
                  </Section>
                  <Section label={t.pool}>
                    {pool.every((_, i) => placed.includes(i)) && <Hint>{t.poolEmpty}</Hint>}
                    {pool.map((line, i) =>
                      placed.includes(i) ? null : (
                        <Tile key={i} line={line} onClick={() => setPlaced([...placed, i])} />
                      )
                    )}
                  </Section>
                </>
              )}

              {activeType === 'dopuni' && (
                <>
                  <p className="text-[11px] text-white/45">{t.fill}</p>
                  <div className="rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[12px] leading-8 text-white/85 overflow-x-auto">
                    {(() => {
                      // The blanks are numbered across the whole solution, so
                      // the counter runs outside the line loop.
                      let n = 0;
                      return blankedText(task, language, HOLE)
                        .split('\n')
                        .map((line, i) => (
                          <div key={i} className="whitespace-pre">
                            {line.split(HOLE).map((part, j, parts) => {
                              const isBlank = j < parts.length - 1;
                              const index = n;
                              if (isBlank) n += 1;
                              return (
                                <React.Fragment key={j}>
                                  {part}
                                  {isBlank && (
                                    <input
                                      value={filled[index] ?? ''}
                                      onChange={(e) => {
                                        const next = [...filled];
                                        next[index] = e.target.value;
                                        setFilled(next);
                                      }}
                                      aria-label={`${index + 1}. ${holes[index]?.kind ?? ''}`}
                                      className="mx-1 w-20 px-1.5 py-0.5 rounded-md bg-white/10 border border-[#06B6D4]/40 text-[#67E8F9] text-[12px] font-mono outline-none focus:border-[#06B6D4]"
                                    />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        ));
                    })()}
                  </div>
                </>
              )}

              {activeType === 'prepoznaj' && (
                <>
                  <p className="text-[11px] text-white/45">{t.predict}</p>
                  <pre className="rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[12px] leading-6 text-white/85 overflow-x-auto whitespace-pre">
                    {solution}
                  </pre>
                  <div className="flex flex-col gap-1.5">
                    {task.tests.map((inputs, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-[11px] font-mono text-white/55 truncate">
                          {inputs.length ? inputs.join(', ') : t.noInput}
                        </span>
                        <input
                          value={predicted[i] ?? ''}
                          onChange={(e) => {
                            const next = [...predicted];
                            next[i] = e.target.value;
                            setPredicted(next);
                          }}
                          placeholder={t.outputLabel}
                          className="flex-1 min-w-0 h-9 px-2 rounded-lg bg-white/5 border border-white/15 text-white text-[12px] font-mono outline-none focus:border-[#06B6D4]/60"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeType === 'dijagram-greska' && planted && (
                <>
                  <p className="text-[11px] text-white/45">{t.findMistake}</p>
                  <MiniDiagram
                    nodes={planted.nodes}
                    edges={planted.edges}
                    selectedId={pickedShape}
                    onSelect={(id) => {
                      setPickedShape(id);
                      setResult(null);
                    }}
                    markedIds={result?.correct ? planted.answerIds : []}
                  />
                </>
              )}

              {activeType === 'tabela' && trace && (
                <>
                  <p className="text-[11px] text-white/45">
                    {t.trace}{' '}
                    {trace.inputVars.length > 0 && (
                      <span className="text-white/70 font-mono">
                        {trace.inputVars
                          .map((name, i) => `${name} = ${trace.inputs[i] ?? ''}`)
                          .join(', ')}
                      </span>
                    )}
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                    <table className="w-full text-[11.5px]">
                      <thead>
                        <tr className="text-white/45">
                          <th className="text-left font-black uppercase tracking-wider text-[9.5px] px-2 py-1.5">
                            {t.traceStep}
                          </th>
                          {trace.columns.map((name) => (
                            <th key={name} className="px-2 py-1.5 font-mono font-bold text-[#67E8F9]">
                              {name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trace.rows.map((row, i) => (
                          <tr key={i} className="border-t border-white/[0.07]">
                            <td className="px-2 py-1 font-mono text-white/60 whitespace-nowrap">
                              {row.step !== undefined && (
                                <span className="text-[#06B6D4] mr-1.5">{row.step}</span>
                              )}
                              {row.label}
                            </td>
                            {trace.columns.map((name) => (
                              <td key={name} className="px-1.5 py-1 text-center">
                                {name === row.changed ? (
                                  <input
                                    value={traced[i] ?? ''}
                                    onChange={(e) => {
                                      const next = [...traced];
                                      next[i] = e.target.value;
                                      setTraced(next);
                                    }}
                                    aria-label={`${name} @ ${row.label}`}
                                    className="w-16 px-1 py-0.5 rounded-md bg-white/10 border border-[#06B6D4]/40 text-[#67E8F9] text-[11.5px] font-mono text-center outline-none focus:border-[#06B6D4]"
                                  />
                                ) : (
                                  <span className="text-white/25 font-mono">·</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {task.discussion && (
                <p className="text-[11px] text-[#FBBF24]/90 border-l-2 border-[#FBBF24]/40 pl-2">
                  {text(task.discussion, language)}
                </p>
              )}

              {result && (
                <div
                  className={`rounded-xl border p-2.5 text-[12px] ${
                    result.correct
                      ? 'bg-[#4ADE80]/10 border-[#4ADE80]/40 text-[#86EFAC]'
                      : 'bg-[#F87171]/10 border-[#F87171]/40 text-[#FCA5A5]'
                  }`}
                >
                  {describeGrade(result, language)}
                  {result.correct && result.message ? ` — ${result.message}` : ''}
                </div>
              )}

              <div className="flex items-center gap-2 pb-4">
                <button
                  type="button"
                  onClick={check}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#06B6D4]/20 border border-[#06B6D4]/50 text-[#67E8F9] text-[11px] font-black uppercase tracking-wider hover:bg-[#06B6D4]/30 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {t.check}
                </button>
                <button
                  type="button"
                  onClick={() => openTask(task)}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-white/15 text-white/70 text-[11px] font-black uppercase tracking-wider hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t.reset}
                </button>
                {result?.correct && (
                  <button
                    type="button"
                    onClick={() => {
                      onReward(solution);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[#4ADE80]/15 border border-[#4ADE80]/40 text-[#86EFAC] text-[11px] font-black uppercase tracking-wider hover:bg-[#4ADE80]/25 active:scale-95 transition-all ml-auto"
                  >
                    <Workflow className="w-4 h-4" />
                    {t.reward}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[9.5px] font-black tracking-[0.2em] text-white/40 uppercase">{label}</span>
    <div className="flex flex-col gap-1">{children}</div>
  </div>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] italic text-white/30 py-1">{children}</span>
);

const Tile: React.FC<{ line: string; index?: number; onClick: () => void }> = ({ line, index, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2 w-full p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-left transition-colors active:scale-[0.99]"
  >
    {index !== undefined && (
      <span className="w-5 shrink-0 text-center text-[10px] font-black text-[#06B6D4]">{index}</span>
    )}
    <span className="font-mono text-[12px] text-white/85 truncate">{line}</span>
  </button>
);
