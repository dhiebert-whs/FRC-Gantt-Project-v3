import { describe, it, expect, beforeEach } from 'vitest';
import { useModalStore } from '../modalStore';

beforeEach(() => {
  useModalStore.setState({ activeModal: null });
});

describe('modalStore', () => {
  it('starts with no active modal', () => {
    expect(useModalStore.getState().activeModal).toBeNull();
  });

  it('openModal sets the active modal', () => {
    useModalStore.getState().openModal('newProject');
    expect(useModalStore.getState().activeModal).toBe('newProject');
  });

  it('closeModal clears the active modal', () => {
    useModalStore.getState().openModal('newProject');
    useModalStore.getState().closeModal();
    expect(useModalStore.getState().activeModal).toBeNull();
  });

  it('opening a modal when one is already open replaces it', () => {
    useModalStore.getState().openModal('newProject');
    useModalStore.getState().openModal('newProject');
    expect(useModalStore.getState().activeModal).toBe('newProject');
  });
});
