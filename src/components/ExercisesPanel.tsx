/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, RotateCcw, Workflow, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { buildFlowchart, parsePseudocode } from '../core/flowchart-gen';
import { describeDiagramIssue } from '../core/diagram-check';
import { Interpreter } from '../core/interpreter';
import { Task, TaskPack, text } from '../exercises/types';
import { STEP, blankedText, blanks, fillBlanks, renderKeywords, solutionText, tileLine, tiles } from '../exercises/render';
import { GradeResult, describeGrade, gradeAttempt, gradeWritten } from '../exercises/grade';
import { AUTOCOMPLETE_KEYWORDS } from '../i18n/keywords';
import { gradeTrace, traceTask } from '../exercises/trace';
import { MistakeKind, mistakeFor, plantMistake } from '../exercises/plant';
import { MiniDiagram } from './MiniDiagram';
import linijska from '../exercises/linijska.json';
import grananje from '../exercises/grananje.json';

interface ExercisesPanelProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  /** Loads the finished program into the app — the reward for solving one. */
  onReward: (code: string) => void;
}

/**
 * The topics, in teaching order. A student meets them in this order and the
 * first is what the panel opens on.
 */
const PACKS = [linijska as TaskPack, grananje as TaskPack];
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
function shuffled<T>(items: T[], seed: string): T[] {
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

/**
 * One tile the student has laid down: which tile it is, and how deep they put
 * it. Depth is answer, not layout — the marker compares it.
 */
interface Placed {
  /** Index into the shuffled pool. */
  i: number;
  level: number;
}

/** The exercise types this panel can actually run, in the order they appear. */
const IN_APP_TYPES = ['kockice', 'dopuni', 'prepoznaj', 'tabela', 'dijagram-greska', 'samostalno'];

/**
 * The words offered above the writing box. The first ten are the sequence and
 * branching keywords; the loop words after them belong to a topic that is not
 * authored yet, and a word a student cannot use anywhere is only in the way.
 */
const WRITING_KEYWORDS = 10;

/** The exercise a task is built for — the first type its author listed. */
function primaryType(task: Task): string {
  return task.types.find((x) => IN_APP_TYPES.includes(x)) ?? 'samostalno';
}

/**
 * Everything this task offers on screen. 'greska' — find the mistake in the
 * pseudocode — is authored but has no exercise here yet, so it stays on paper.
 */
function availableTypes(task: Task): string[] {
  return task.types.filter((x) => IN_APP_TYPES.includes(x));
}

export const ExercisesPanel: React.FC<ExercisesPanelProps> = ({ language, isOpen, onClose, onReward }) => {
  const t = translations[language].vjezbe;
  const [openId, setOpenId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>(PACKS[0].topic);
  const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [filled, setFilled] = useState<string[]>([]);
  const [predicted, setPredicted] = useState<string[]>([]);
  const [traced, setTraced] = useState<string[]>([]);
  const [written, setWritten] = useState<string>('');
  const [activeType, setActiveType] = useState<string>('kockice');
  const [pickedShape, setPickedShape] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const writingBox = React.useRef<HTMLTextAreaElement>(null);

  /** What the writing box starts with: the two lines every algorithm has. */
  const frame = renderKeywords('@START\n\n@END', language);

  const pack = useMemo(() => PACKS.find((p) => p.topic === topic) ?? PACKS[0], [topic]);
  const task = useMemo(() => pack.tasks.find((x) => x.id === openId) ?? null, [openId, pack]);
  const solution = task ? solutionText(task, language) : '';
  /** Every tile of the solution, frame included, in the order it must run. */
  const all = useMemo(() => (task ? tiles(task, language) : []), [task, language]);
  /** The tiles the student actually places; a 'sidra' task keeps the rest fixed. */
  const movable = useMemo(() => all.filter((x) => !x.anchor), [all]);
  const framed = all.some((x) => x.anchor);
  const pool = useMemo(() => (task ? shuffled(movable, task.id) : []), [movable, task]);

  /**
   * The assembled attempt. In a framed task the fixed rows come from the
   * solution and the student's tiles drop into the gaps between them, so the
   * depth of those rows is given; everywhere else the depth is the student's
   * own answer and travels on the placed tile.
   */
  const assembled = useMemo(() => {
    if (!framed) return placed.map((p) => tileLine({ ...pool[p.i], level: p.level })).join('\n');
    let hole = -1;
    return all
      .map((tile) => {
        if (tile.anchor) return tileLine(tile);
        hole += 1;
        const p = placed[hole];
        return p ? tileLine({ ...pool[p.i], level: movable[hole].level }) : null;
      })
      .filter((l): l is string => l !== null)
      .join('\n');
  }, [framed, all, movable, pool, placed]);
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
    setWritten('');
    setPickedShape(null);
    setActiveType(primaryType(next));
    setResult(null);
  };

  /**
   * Drops a keyword — or an indent — where the caret is. On a phone the
   * keyboard has no Č and no Tab, so the buttons are the way in.
   */
  const insertWriting = (text: string) => {
    const box = writingBox.current;
    const start = box?.selectionStart ?? written.length;
    const end = box?.selectionEnd ?? start;
    setWritten(written.slice(0, start) + text + written.slice(end));
    // The value only lands after the redraw, so the caret is placed after it.
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + text.length, start + text.length);
    });
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
              expected: [trace.rows[row].answer],
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
    } else if (kind === 'kockice' && placed.length < movable.length) {
      outcome = { correct: false, reason: 'nepotpuno', message: t.placeAll };
    } else if (kind === 'samostalno') {
      // The bare frame is what the box was handed to the student with; it is
      // an empty answer, not a wrong one.
      const code = written.trim();
      outcome =
        !code || code === frame.trim()
          ? { correct: false, reason: 'nepotpuno', message: t.writeAll }
          : gradeWritten(task, written, language);
    } else {
      const code = kind === 'kockice' ? assembled : fillBlanks(task, language, filled);
      outcome = gradeAttempt(task, code, language);
    }

    setResult(outcome);
    if (outcome.correct) markSolved(task.id);
  };

  const solvedCount = pack.tasks.filter((x) => progress[x.id]).length;

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
            {solvedCount} / {pack.tasks.length} {t.progress}
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
              <p className="text-[11px] text-white/45 mb-3 px-1">
                {text(pack.title, language)} — {pack.tasks.length} {t.tasks}
              </p>
              {PACKS.length > 1 && (
                <div className="flex gap-1.5 mb-3">
                  {PACKS.map((p) => (
                    <button
                      key={p.topic}
                      type="button"
                      onClick={() => setTopic(p.topic)}
                      className={`flex-1 px-3 h-9 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-colors ${
                        p.topic === topic
                          ? 'bg-[#06B6D4]/15 border-[#06B6D4]/50 text-[#06B6D4]'
                          : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {text(p.title, language)}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {pack.tasks.map((item) => (
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
                        if (kind === 'samostalno' && !written.trim()) setWritten(frame);
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
                    {!framed && placed.length === 0 && <Hint>{t.answerEmpty}</Hint>}
                    {framed
                      ? (() => {
                          let hole = -1;
                          return all.map((tile, row) => {
                            if (tile.anchor) return <TileRow key={row} line={tile.text} level={tile.level} fixed />;
                            hole += 1;
                            const at = hole;
                            const p = placed[at];
                            return p ? (
                              <TileRow
                                key={row}
                                line={pool[p.i].text}
                                level={movable[at].level}
                                index={at + 1}
                                onClick={() => setPlaced(placed.filter((_, i) => i !== at))}
                              />
                            ) : (
                              <div
                                key={row}
                                className="h-9 rounded-lg border border-dashed border-white/15"
                                style={{ marginLeft: movable[at].level * 18 }}
                              />
                            );
                          });
                        })()
                      : placed.map((p, position) => (
                          <TileRow
                            key={`${p.i}-${position}`}
                            line={pool[p.i].text}
                            level={p.level}
                            index={position + 1}
                            onClick={() => setPlaced(placed.filter((_, i) => i !== position))}
                            onLevel={(step) =>
                              setPlaced(
                                placed.map((x, i) =>
                                  i === position ? { ...x, level: Math.min(MAX_LEVEL, Math.max(0, x.level + step)) } : x
                                )
                              )
                            }
                          />
                        ))}
                  </Section>
                  <Section label={t.pool}>
                    {placed.length === pool.length && <Hint>{t.poolEmpty}</Hint>}
                    {pool.map((tile, i) =>
                      placed.some((p) => p.i === i) ? null : (
                        <TileRow
                          key={i}
                          line={tile.text}
                          onClick={() =>
                            // A new tile lands beside the one before it: the
                            // depth only has to be changed where the shape of
                            // the program changes, not on every line.
                            setPlaced([...placed, { i, level: framed ? 0 : placed[placed.length - 1]?.level ?? 0 }])
                          }
                        />
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
                  {trace.hasCondition && (
                    <p className="text-[11px] text-[#FBBF24]/80">{t.traceCondHint}</p>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                    <table className="w-full text-[11.5px]">
                      <thead>
                        <tr className="text-white/45">
                          <th className="text-left font-black uppercase tracking-wider text-[9.5px] px-2 py-1.5">
                            {t.traceStep}
                          </th>
                          {trace.hasCondition && (
                            <th className="font-black uppercase tracking-wider text-[9.5px] px-2 py-1.5 text-[#FBBF24]">
                              {t.traceCond}
                            </th>
                          )}
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
                            {trace.hasCondition && (
                              <td className="px-1.5 py-1 text-center">
                                {row.branch !== undefined ? (
                                  <input
                                    value={traced[i] ?? ''}
                                    onChange={(e) => {
                                      const next = [...traced];
                                      next[i] = e.target.value;
                                      setTraced(next);
                                    }}
                                    aria-label={`${t.traceCond} @ ${row.label}`}
                                    className="w-16 px-1 py-0.5 rounded-md bg-white/10 border border-[#FBBF24]/40 text-[#FBBF24] text-[11.5px] font-mono text-center outline-none focus:border-[#FBBF24]"
                                  />
                                ) : (
                                  <span className="text-white/25 font-mono">·</span>
                                )}
                              </td>
                            )}
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

              {activeType === 'samostalno' && (
                <>
                  <p className="text-[11px] text-white/45">{t.write}</p>
                  <p className="text-[11px] text-[#FBBF24]/80">{t.writeNote}</p>
                  <div className="flex flex-wrap gap-1">
                    {AUTOCOMPLETE_KEYWORDS[language].slice(0, WRITING_KEYWORDS).map((word) => (
                      <button
                        key={word.word}
                        type="button"
                        title={word.hint}
                        onClick={() => insertWriting(word.arg ? `${word.word} ` : word.word)}
                        className="px-2 h-7 rounded-lg bg-white/[0.06] border border-white/10 font-mono text-[10.5px] text-white/65 hover:text-white hover:bg-white/[0.12] transition-colors"
                      >
                        {word.word}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={writingBox}
                    value={written}
                    onChange={(e) => setWritten(e.target.value)}
                    onKeyDown={(e) => {
                      // Indentation is part of the answer here, and Tab would
                      // otherwise walk out of the box.
                      if (e.key !== 'Tab' || e.shiftKey) return;
                      e.preventDefault();
                      insertWriting(STEP);
                    }}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-label={t.write}
                    className="min-h-[240px] rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[12px] leading-6 text-white/85 outline-none focus:border-[#06B6D4]/60 resize-y"
                  />
                  <p className="text-[11px] text-white/40">
                    {t.writeTests}{' '}
                    <span className="font-mono text-white/60">
                      {task.tests.map((inputs) => inputs.join(', ') || t.noInput).join('  ·  ')}
                    </span>
                  </p>
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
                      // Their own program is the one worth seeing drawn.
                      onReward(activeType === 'samostalno' ? written : solution);
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

interface TileRowProps {
  line: string;
  /** Depth in levels; drawn as an indent so the tile reads like code. */
  level?: number;
  index?: number;
  onClick?: () => void;
  /** Present only where the depth is the student's to choose. */
  onLevel?: (step: number) => void;
  /** Part of the frame the task gave away: shown, but not to be touched. */
  fixed?: boolean;
}

const MAX_LEVEL = 4;
const LEVEL_PX = 18;

const TileRow: React.FC<TileRowProps> = ({ line, level = 0, index, onClick, onLevel, fixed }) => (
  <div className="flex items-center gap-1" style={{ marginLeft: level * LEVEL_PX }}>
    <button
      type="button"
      onClick={onClick}
      disabled={fixed}
      className={`flex items-center gap-2 flex-1 min-w-0 p-2 rounded-lg border text-left transition-colors ${
        fixed
          ? 'bg-white/[0.02] border-white/5 cursor-default'
          : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 active:scale-[0.99]'
      }`}
    >
      {index !== undefined && (
        <span className="w-5 shrink-0 text-center text-[10px] font-black text-[#06B6D4]">{index}</span>
      )}
      <span className={`font-mono text-[12px] truncate ${fixed ? 'text-white/40' : 'text-white/85'}`}>{line}</span>
    </button>
    {onLevel && (
      <span className="flex shrink-0">
        <button
          type="button"
          onClick={() => onLevel(-1)}
          className="w-7 h-9 grid place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => onLevel(1)}
          className="w-7 h-9 grid place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/10"
        >
          <ChevronRight size={14} />
        </button>
      </span>
    )}
  </div>
);
