// src/stores/modalStore.ts
// Central modal state. All modal open/close operations go through here so
// focus management and Escape handling can be handled uniformly by ModalHost.
// Extend ModalKey and add a typed open action as new dialog phases are implemented.

import { create } from 'zustand';

export type ModalKey = 'newProject' | 'editTask';

interface ModalState {
  activeModal: ModalKey | null;
  /** Task ID when activeModal === 'editTask' */
  activeTaskId: string | null;
}

interface ModalActions {
  /** Open modals that require no payload (e.g. newProject). */
  openModal: (key: 'newProject') => void;
  /** Open the task edit dialog for the given task ID. */
  openEditTask: (taskId: string) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  activeModal:  null,
  activeTaskId: null,
  openModal:    (key)    => set({ activeModal: key, activeTaskId: null }),
  openEditTask: (taskId) => set({ activeModal: 'editTask', activeTaskId: taskId }),
  closeModal:   ()       => set({ activeModal: null, activeTaskId: null }),
}));
