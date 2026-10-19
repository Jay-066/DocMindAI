'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Modal confirmation for destructive actions. Focus starts on Cancel; Escape and clicking the
 * backdrop cancel (unless busy). Rendered into document.body so parent overflow can't clip it.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-base/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm card p-6 shadow-glow animate-slideUp"
      >
        <div className="w-11 h-11 rounded-xl bg-danger/10 text-danger flex items-center justify-center mb-4">
          <AlertTriangle size={20} />
        </div>
        <h2 id="confirm-title" className="font-display text-lg font-semibold mb-1">
          {title}
        </h2>
        <p id="confirm-message" className="text-sm text-ink-dim leading-relaxed">
          {message}
        </p>
        {error && <p className="text-xs text-danger mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="btn-secondary text-sm py-2 px-4">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-danger text-white font-medium text-sm px-4 py-2 transition-colors hover:bg-danger/85 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
