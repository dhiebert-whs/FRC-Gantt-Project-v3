// src/stores/modalStore.ts
// Central modal state. All modal open/close operations go through here so
// focus management and Escape handling can be handled uniformly by ModalHost.
// Extend ModalKey as new dialog phases are implemented.

import { create } from 'zustand';

export type ModalKey = 'newProject';

interface ModalState {
  activeModal: ModalKey | null;
}

interface ModalActions {
  openModal: (key: ModalKey) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  activeModal: null,
  openModal: (key) => set({ activeModal: key }),
  closeModal: () => set({ activeModal: null }),
}));
