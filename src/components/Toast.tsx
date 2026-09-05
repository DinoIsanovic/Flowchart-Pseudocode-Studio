/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info, AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'info' | 'error' | 'success';
  text: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none max-w-[90vw] sm:max-w-md">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
              isError
                ? 'bg-red-950/90 text-red-200 border-red-500/40'
                : isSuccess
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : 'bg-[#181818]/90 text-white border-white/20'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-[#06B6D4] shrink-0" />
            )}
            <span className="leading-snug">{toast.text}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
