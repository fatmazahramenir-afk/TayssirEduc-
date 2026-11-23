import { AlertTriangle } from 'lucide-react';

export interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmActionModalProps {
  pending: PendingConfirmation | null;
  busy: boolean;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  pending,
  busy,
  cancelLabel,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="max-w-md w-full bg-white dark:bg-[#101D42] border border-slate-200 dark:border-white/15 rounded-2xl shadow-xl p-6">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              pending.destructive
                ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
              {pending.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {pending.description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 rounded-xl hover:bg-slate-50 dark:hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              pending.destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {busy ? '...' : pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
