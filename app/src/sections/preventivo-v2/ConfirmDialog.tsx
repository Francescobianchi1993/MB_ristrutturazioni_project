/**
 * Dialog di conferma riusabile per azioni distruttive (es. rimozione voce
 * dal carrello / preventivo). Visivamente coerente con il resto del sito:
 * card bianca arrotondata, CTA "Torna indietro" outline + "Continua" nero.
 */

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Continua',
  cancelLabel = 'Torna indietro',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#F5B800]/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#F5B800]" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold leading-tight">{title}</div>
            {description && (
              <p className="text-sm text-[#666] mt-1 leading-snug">{description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-full border border-[#E5E5E5] hover:bg-[#F8F8F8] text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white text-sm font-semibold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
