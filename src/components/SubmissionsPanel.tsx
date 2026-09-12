/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Copy, Inbox, Trash2, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { Submission, parseSubmissions, sameCode, studentName } from '../core/submission';
import { FormLink, configLink } from '../core/form-link';
import { LearnedForm } from '../core/form-page';
import { Regraded, regrade } from '../exercises/regrade';
import { describeGrade } from '../exercises/grade';
import { text as taskText } from '../exercises/types';

interface SubmissionsPanelProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  link: FormLink | null;
  /** The prefilled link exactly as the teacher pasted it, for sharing on. */
  linkSource: string | null;
  /** Takes a link to the form — pre-filled, or plain where it can be read. */
  onConfigure: (pasted: string) => Promise<'ok' | 'no-url' | 'no-fields' | 'needs-desktop'>;
  /** What reading the form's own page turned up, when it could be read. */
  learned: LearnedForm | null;
  onForget: () => void;
  onOpenWork: (sub: Submission) => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}

/**
 * The teacher's side: a pasted column of submissions, marked by running them.
 *
 * Nothing here trusts the text. Each submission names a task, and that task is
 * solved again from the bank and the student's answer put through the same
 * tests the app itself uses — so a submission edited on the way loses nothing
 * but its own credibility, and a submission cut short by a form field says so
 * rather than counting as a wrong answer.
 */
export const SubmissionsPanel: React.FC<SubmissionsPanelProps> = ({
  language,
  isOpen,
  onClose,
  link,
  linkSource,
  onConfigure,
  learned,
  onForget,
  onOpenWork,
  onToast,
}) => {
  const t = translations[language].predaja;
  const [pasted, setPasted] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [draftLink, setDraftLink] = useState('');
  const [reading, setReading] = useState(false);

  const read = useMemo(() => {
    if (!pasted.trim()) {
      return { rows: [] as Regraded[], clashing: new Map<string, 'codes' | 'names'>(), skipped: 0, superseded: 0 };
    }
    const { found, skipped, superseded } = parseSubmissions(pasted);
    const rows = found.map(regrade).sort((a, b) => studentName(a.submission).localeCompare(studentName(b.submission)));

    // A code belongs to one student and a student has one code. Where the pile
    // says otherwise, somebody has typed a name that is not theirs — which is
    // the whole reason the codes are handed out.
    const namesOfCode = new Map<string, Set<string>>();
    const codesOfName = new Map<string, Set<string>>();
    for (const { submission } of rows) {
      const code = sameCode(submission.student.code);
      if (!code) continue;
      const name = studentName(submission).toLocaleLowerCase();
      if (!namesOfCode.has(code)) namesOfCode.set(code, new Set());
      if (!codesOfName.has(name)) codesOfName.set(name, new Set());
      namesOfCode.get(code)!.add(name);
      codesOfName.get(name)!.add(code);
    }
    // Which of the two it is matters to whoever reads it: a name under two
    // codes is not the same story as a code under two names.
    const clashing = new Map<string, 'codes' | 'names'>();
    for (const { submission } of rows) {
      const code = sameCode(submission.student.code);
      if (!code) continue;
      const name = studentName(submission).toLocaleLowerCase();
      if ((codesOfName.get(name)?.size ?? 0) > 1) clashing.set(`${name}|${code}`, 'codes');
      else if ((namesOfCode.get(code)?.size ?? 0) > 1) clashing.set(`${name}|${code}`, 'names');
    }

    return { rows, clashing, skipped, superseded };
  }, [pasted]);

  if (!isOpen) return null;

  const marked = read.rows.filter((r) => r.result);
  const correct = marked.filter((r) => r.result?.correct).length;

  const configure = async () => {
    setReading(true);
    const outcome = await onConfigure(draftLink);
    setReading(false);
    if (outcome === 'ok') {
      setDraftLink('');
      onToast(t.configured, 'success');
      return;
    }
    onToast(
      outcome === 'no-url' ? t.formBad : outcome === 'needs-desktop' ? t.formPlainNeedsDesktop : t.formNoFields,
      'error'
    );
  };

  const copyClassLink = async () => {
    if (!linkSource) return;
    try {
      await navigator.clipboard.writeText(configLink(window.location.href, linkSource));
      onToast(t.copied, 'success');
    } catch {
      onToast(t.copied, 'error');
    }
  };

  const field = 'h-9 px-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-[12px] outline-none focus:border-[#06B6D4]/60 w-full';

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/97 backdrop-blur-xl flex flex-col">
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-xs font-black uppercase tracking-widest text-white">{t.review}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {/* The teacher's own form */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setFormOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white/70 hover:text-white"
            >
              <span>{t.form}</span>
              {formOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {formOpen && (
              <div className="px-3 pb-3 space-y-2.5 border-t border-white/10 pt-3">
                <p className="text-[11px] leading-snug text-white/55">{t.formHow}</p>
                <div className="flex gap-2">
                  <input
                    value={draftLink}
                    onChange={(e) => setDraftLink(e.target.value)}
                    placeholder={t.formUrl}
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => void configure()}
                    disabled={!draftLink.trim() || reading}
                    className="h-9 px-3 shrink-0 rounded-lg bg-white text-black text-[11px] font-black uppercase tracking-wider disabled:opacity-30"
                  >
                    {reading ? '…' : 'OK'}
                  </button>
                </div>

                {link && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#86EFAC]">
                      {t.formOk}{' '}
                      <span className="font-mono text-white/70">{Object.keys(link.fields).join(', ')}</span>
                    </p>
                    {!link.fields.payload && <p className="text-[11px] text-[#FCD34D]">{t.formNoPayload}</p>}

                    {/* What reading the form itself turned up — the two things
                        that would otherwise be found out by a class. */}
                    {!!learned && (
                      <>
                        <p className="text-[11px] text-white/55">
                          {t.formLearned}{' '}
                          <span className="text-white/75">
                            {learned.questions.map((q) => q.title).filter(Boolean).join(' · ')}
                          </span>
                        </p>
                        {learned.shortAnswerBox && <p className="text-[11px] text-[#FCD34D]">{t.formShortBox}</p>}
                        {learned.blocking.length > 0 && (
                          <p className="text-[11px] text-[#FCA5A5]">
                            {t.formBlocking} {learned.blocking.map((q) => q.title).join(', ')}
                          </p>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={copyClassLink}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/15 text-white/75 text-[11px] font-black uppercase tracking-wider hover:bg-white/10"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {t.classLink}
                      </button>
                      <button
                        type="button"
                        onClick={onForget}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/15 text-white/45 text-[11px] font-black uppercase tracking-wider hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t.forget}
                      </button>
                    </div>
                    <p className="text-[10.5px] text-white/40">{t.classLinkHint}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* The paste */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black tracking-[0.15em] text-white/40 uppercase">{t.paste}</span>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={t.pasteHint}
              className="w-full h-24 p-2.5 rounded-xl bg-black/60 border border-white/10 text-white/80 font-mono text-[11px] leading-snug resize-none outline-none focus:border-[#06B6D4]/50"
            />
          </div>

          {!!pasted.trim() && !read.rows.length && <p className="text-[12px] text-white/50">{t.none}</p>}

          {!!read.rows.length && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              <span className="text-white/70 font-bold">
                {read.rows.length} {t.found}
              </span>
              {/* Free work has nothing to be marked against, so a paste with
                  none of the bank's tasks in it says nothing about correctness
                  rather than "0 correct". */}
              {marked.length > 0 && (
                <span className="text-[#86EFAC]">
                  {correct} {t.correctN}
                </span>
              )}
              {read.superseded > 0 && (
                <span className="text-white/40">
                  {read.superseded} {t.earlier}
                </span>
              )}
              {read.skipped > 0 && (
                <span className="text-[#FCD34D]">
                  {read.skipped} {t.broken}
                </span>
              )}
            </div>
          )}

          <div className="space-y-1.5 pb-6">
            {read.rows.map((row, i) => {
              const sub = row.submission;
              const verdict = row.result;
              const title = row.task ? taskText(row.task.title, language) : sub.task.title;
              return (
                <div
                  key={`${sub.sum}-${i}`}
                  className={`rounded-xl border p-2.5 flex items-start gap-2.5 ${
                    verdict?.correct
                      ? 'border-[#4ADE80]/30 bg-[#4ADE80]/[0.06]'
                      : verdict
                      ? 'border-[#F87171]/25 bg-[#F87171]/[0.05]'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black ${
                      verdict?.correct
                        ? 'bg-[#4ADE80]/20 text-[#86EFAC]'
                        : verdict
                        ? 'bg-[#F87171]/20 text-[#FCA5A5]'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {verdict?.correct ? <Check className="w-3 h-3" /> : verdict ? '✗' : '–'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13px] font-bold text-white/90">{studentName(sub)}</span>
                      <span className="text-[11px] text-white/40">
                        {[sub.student.class, sub.student.group, sub.student.number].filter(Boolean).join(' · ')}
                      </span>
                      <span className={`text-[11px] font-mono ${sub.student.code ? 'text-[#67E8F9]' : 'text-white/25 italic'}`}>
                        {sub.student.code ?? t.noCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/55">
                      {title}
                      {sub.task.type ? ` · ${sub.task.type}` : ''}
                      {` · ${sub.at.replace('T', ' ').replace('Z', '')}`}
                    </div>
                    {verdict && !verdict.correct && (
                      <div className="text-[11px] text-[#FCA5A5] mt-0.5">{describeGrade(verdict, language)}</div>
                    )}
                    {!verdict && <div className="text-[11px] text-white/40 mt-0.5">{t.noTask}</div>}
                    {(() => {
                      const clash = read.clashing.get(`${studentName(sub).toLocaleLowerCase()}|${sameCode(sub.student.code)}`);
                      if (!clash) return null;
                      return (
                        <div className="flex items-center gap-1 text-[11px] text-[#FCD34D] mt-0.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {clash === 'codes' ? t.clashCodes : t.clashNames}
                        </div>
                      );
                    })()}
                    {!row.intact && (
                      <div className="flex items-center gap-1 text-[11px] text-[#FCD34D] mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {t.notIntact}
                      </div>
                    )}
                  </div>

                  {(sub.answer.code || sub.answer.diagram) && (
                    <button
                      type="button"
                      onClick={() => onOpenWork(sub)}
                      className="shrink-0 h-8 px-2.5 rounded-lg border border-white/15 text-white/70 text-[10px] font-black uppercase tracking-wider hover:bg-white/10"
                    >
                      {t.open}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
