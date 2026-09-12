/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Send, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { stripDiacritics } from '../core/flowchart-gen';
import {
  PREFILL_MAX,
  SIZE_WARN,
  SubmissionAnswer,
  SubmissionStudent,
  SubmissionTask,
  buildSubmission,
  submissionText,
} from '../core/submission';
import { FormLink, submitUrl } from '../core/form-link';

export interface Work {
  task: SubmissionTask;
  answer: SubmissionAnswer;
}

interface SubmitDialogProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  student: SubmissionStudent;
  onStudentChange: (next: SubmissionStudent) => void;
  /** The teacher's form, once it has been set up on this device. */
  link: FormLink | null;
  work: Work | null;
  onSaveFile: (name: string, text: string) => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}

/**
 * Hands one piece of work over as a line of text.
 *
 * The whole submission is shown, not hidden behind a button: it is the
 * student's own work in a form they can read, and seeing it is what makes
 * clear that nothing else is being sent. The app does not send it either —
 * it copies it and opens the teacher's form, and the student presses Send.
 *
 * Who is handing in is remembered between tasks, because a class hands in
 * many, and shown rather than assumed, because these are school computers and
 * the name in the box is often the last person's.
 */
export const SubmitDialog: React.FC<SubmitDialogProps> = ({
  language,
  isOpen,
  onClose,
  student,
  onStudentChange,
  link,
  work,
  onSaveFile,
  onToast,
}) => {
  const t = translations[language].predaja;
  const [title, setTitle] = useState('');

  const submission = useMemo(() => {
    if (!work) return null;
    return buildSubmission({
      app: __APP_VERSION__,
      lang: language,
      student,
      task: work.task.id ? work.task : { ...work.task, title: title.trim() || work.task.title },
      answer: work.answer,
    });
    // The time is part of the submission, so it is built once per opening
    // rather than on every keystroke in the name boxes.
  }, [work, student, title, language]);

  if (!isOpen || !work || !submission) return null;

  const text = submissionText(submission);
  const named = !!student.first.trim() && !!student.last.trim();
  const tooBig = text.length > SIZE_WARN;
  const inLink = !!link?.fields.payload && text.length <= PREFILL_MAX;

  const set = (patch: Partial<SubmissionStudent>) => onStudentChange({ ...student, ...patch });

  const copy = () => {
    // Not awaited by the caller: a window opened after an `await` no longer
    // counts as opened by the click, and the browser blocks it as a popup.
    navigator.clipboard
      .writeText(text)
      .then(() => onToast(t.copied, 'success'))
      // A browser that refuses the clipboard still shows the text below, and
      // selecting it by hand works everywhere.
      .catch(() => onToast(t.copied, 'error'));
  };

  const copyAndOpen = () => {
    if (!named) {
      onToast(t.needName, 'error');
      return;
    }
    copy();
    if (!link) return;
    const url = submitUrl(link, {
      first: student.first,
      last: student.last,
      class: student.class,
      group: student.group,
      number: student.number,
      payload: inLink ? text : undefined,
    });
    window.open(url, '_blank', 'noopener');
  };

  const saveFile = () => {
    const slug = (s: string) => stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const name = ['predaja', slug(student.last), slug(student.first), slug(work.task.id ?? work.task.title)]
      .filter(Boolean)
      .join('-');
    onSaveFile(`${name || 'predaja'}.json`, text);
  };

  const field = 'h-9 px-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-[12px] outline-none focus:border-[#06B6D4]/60 w-full';
  const label = 'text-[9.5px] font-black tracking-[0.15em] text-white/40 uppercase';

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#0A0A0A] border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-[#121212] border-b border-white/10">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-xs font-black uppercase tracking-widest text-white">{t.title}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* What is being handed in */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {work.task.id ? (
              <>
                <div className="text-[13px] text-white/90 font-bold">{work.task.title}</div>
                <div className="text-[11px] text-white/45">
                  {work.task.topic} · {work.task.type}
                </div>
              </>
            ) : (
              <label className="flex flex-col gap-1">
                <span className={label}>{t.workTitle}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.workTitlePlaceholder}
                  className={field}
                />
              </label>
            )}
            <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#67E8F9]">
              {t.code} {submission.sum}
            </div>
          </div>

          {/* Who */}
          <div className="space-y-2">
            <span className={label}>{t.who}</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={student.first}
                onChange={(e) => set({ first: e.target.value })}
                placeholder={t.first}
                className={field}
                autoComplete="given-name"
              />
              <input
                value={student.last}
                onChange={(e) => set({ last: e.target.value })}
                placeholder={t.last}
                className={field}
                autoComplete="family-name"
              />
              <input
                value={student.class ?? ''}
                onChange={(e) => set({ class: e.target.value })}
                placeholder={t.klasa}
                className={field}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={student.group ?? ''}
                  onChange={(e) => set({ group: e.target.value })}
                  placeholder={t.group}
                  className={field}
                />
                <input
                  value={student.number ?? ''}
                  onChange={(e) => set({ number: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={t.number}
                  inputMode="numeric"
                  className={field}
                />
              </div>
            </div>
          </div>

          {/* The text itself — what leaves the computer, in full */}
          <textarea
            value={text}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-20 p-2 rounded-lg bg-black/60 border border-white/10 text-white/60 font-mono text-[10px] leading-snug resize-none outline-none"
          />

          {tooBig && <p className="text-[11px] text-[#FCD34D]">{t.tooBig}</p>}
          {!link && <p className="text-[11px] text-white/50">{t.noForm}</p>}
          {link && <p className="text-[11px] text-white/50">{inLink ? t.prefilled : t.pasteThere}</p>}

          <div className="flex flex-wrap gap-2 pb-1">
            <button
              type="button"
              onClick={copyAndOpen}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-wider hover:bg-neutral-200 active:scale-95 transition-all"
            >
              {link ? <ExternalLink className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {link ? t.copyAndOpen : t.copyOnly}
            </button>
            {link && (
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-white/15 text-white/70 text-[11px] font-black uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                <Copy className="w-4 h-4" />
                {t.copyOnly}
              </button>
            )}
            <button
              type="button"
              onClick={saveFile}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-white/15 text-white/70 text-[11px] font-black uppercase tracking-wider hover:bg-white/10 transition-all"
            >
              <Download className="w-4 h-4" />
              {t.saveFile}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
