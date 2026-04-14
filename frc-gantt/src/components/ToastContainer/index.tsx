// ============================================================
// FRC Gantt App — Toast Container
// src/components/ToastContainer/index.tsx
//
// Fixed overlay that renders active toasts from toastStore.
// Sits at the top-right of the viewport, above all other content.
// kiosk: variants make toasts readable on the ClearTouch board.
// ============================================================

import { useToastStore } from '../../stores/toastStore';
import type { Toast, ToastType } from '../../stores/toastStore';

const ICON: Record<ToastType, string> = {
  error:   '✕',
  warning: '⚠',
  success: '✓',
};

const BORDER: Record<ToastType, string> = {
  error:   'border-red-500',
  warning: 'border-amber-500',
  success: 'border-green-500',
};

const ICON_COLOR: Record<ToastType, string> = {
  error:   'text-red-400',
  warning: 'text-amber-400',
  success: 'text-green-400',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useToastStore(s => s.dismissToast);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 kiosk:py-4 rounded-lg shadow-xl border-l-4 bg-gray-800 text-white ${BORDER[toast.type]}`}
      role="alert"
    >
      <span className={`text-base kiosk:text-lg font-bold shrink-0 mt-0.5 ${ICON_COLOR[toast.type]}`}>
        {ICON[toast.type]}
      </span>

      <span className="text-sm kiosk:text-base flex-1 leading-snug">
        {toast.message}
      </span>

      <button
        onClick={() => dismissToast(toast.id)}
        className="text-gray-400 hover:text-white text-lg kiosk:text-xl leading-none shrink-0 ml-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 kiosk:w-96 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
