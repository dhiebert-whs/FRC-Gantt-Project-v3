// ============================================================
// FRC Gantt App — Toast Store
// src/stores/toastStore.ts
//
// Lightweight notification system for surfacing file I/O errors
// and other async failures to the user.
//
// Usage from non-React code (other stores):
//   import { useToastStore } from './toastStore';
//   useToastStore.getState().addToast('message', 'error');
//
// Usage from React components:
//   const addToast = useToastStore(s => s.addToast);
// ============================================================

import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastType = 'error' | 'warning' | 'success';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  error:   6000,
  warning: 5000,
  success: 3000,
};

const MAX_TOASTS = 5;

interface ToastState {
  toasts: Toast[];
}

interface ToastActions {
  addToast: (message: string, type: ToastType) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState & ToastActions>((set, get) => ({
  toasts: [],

  addToast: (message, type) => {
    const id = nanoid();
    const toast: Toast = { id, message, type };

    set(state => {
      const toasts = [...state.toasts, toast];
      // Drop the oldest if over the cap
      return { toasts: toasts.length > MAX_TOASTS ? toasts.slice(-MAX_TOASTS) : toasts };
    });

    // Auto-dismiss after timeout
    setTimeout(() => {
      get().dismissToast(id);
    }, AUTO_DISMISS_MS[type]);
  },

  dismissToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },
}));
