import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ModalHost } from '../ModalHost';
import { useModalStore } from '../../../stores/modalStore';

// NewProjectDialog uses these stores — provide minimal stubs so it renders
vi.mock('../../../stores/projectStore', () => ({
  useProjectStore: (sel: (s: object) => unknown) =>
    sel({ newProject: vi.fn() }),
}));
vi.mock('../../../stores/settingsStore', () => ({
  useSettingsStore: (sel: (s: object) => unknown) =>
    sel({
      settings: {
        defaultScheduleTemplate: [],
      },
    }),
}));

beforeEach(() => {
  useModalStore.setState({ activeModal: null });
});

describe('ModalHost — open/close lifecycle', () => {
  it('renders nothing when no modal is active', () => {
    const { container } = render(<ModalHost />);
    expect(container.firstChild).toBeNull();
  });

  it('renders NewProjectDialog when activeModal is newProject', () => {
    act(() => useModalStore.getState().openModal('newProject'));
    render(<ModalHost />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('removes dialog when modal is closed via store', () => {
    act(() => useModalStore.getState().openModal('newProject'));
    render(<ModalHost />);
    act(() => useModalStore.getState().closeModal());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ModalHost — Escape behavior', () => {
  it('pressing Escape closes the active modal', () => {
    act(() => useModalStore.getState().openModal('newProject'));
    render(<ModalHost />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useModalStore.getState().activeModal).toBeNull();
  });

  it('Escape does nothing when no modal is open', () => {
    render(<ModalHost />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useModalStore.getState().activeModal).toBeNull();
  });
});

describe('ModalHost — focus restoration', () => {
  it('restores focus to the previously focused element after close', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    act(() => useModalStore.getState().openModal('newProject'));
    render(<ModalHost />);

    act(() => useModalStore.getState().closeModal());
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
