/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, RotateCcw } from 'lucide-react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  hint?: string;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ dialog, onClose }) => {
  useEffect(() => {
    if (!dialog?.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dialog.onConfirm();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, onClose]);

  if (!dialog || !dialog.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = true,
    hint,
    onConfirm,
  } = dialog;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0A0A0A] text-[#F5F5F5] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#121212] p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDestructive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white text-black'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-black stroke-[2.5]" />
              )}
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 bg-[#0A0A0A]">
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            {message}
          </p>
          {hint && (
            <div className="p-3 bg-[#141414] border border-white/10 rounded-xl text-[11px] text-white/60 font-mono flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
              <span>{hint}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#121212] border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white/70 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                : 'bg-white hover:bg-neutral-200 text-black shadow-md'
            }`}
          >
            {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
