import { describe, it, expect, beforeEach } from 'vitest';
import { useModalStore } from '../modalStore';

beforeEach(() => {
  useModalStore.setState({ activeModal: null, activeTaskId: null });
});

describe('modalStore — newProject', () => {
  it('starts with no active modal', () => {
    expect(useModalStore.getState().activeModal).toBeNull();
  });

  it('openModal sets the active modal', () => {
    useModalStore.getState().openModal('newProject');
    expect(useModalStore.getState().activeModal).toBe('newProject');
  });

  it('openModal clears activeTaskId', () => {
    useModalStore.getState().openEditTask('task-1');
    useModalStore.getState().openModal('newProject');
    expect(useModalStore.getState().activeTaskId).toBeNull();
  });

  it('closeModal clears the active modal', () => {
    useModalStore.getState().openModal('newProject');
    useModalStore.getState().closeModal();
    expect(useModalStore.getState().activeModal).toBeNull();
  });
});

describe('modalStore — editTask', () => {
  it('openEditTask sets activeModal to editTask', () => {
    useModalStore.getState().openEditTask('task-abc');
    expect(useModalStore.getState().activeModal).toBe('editTask');
  });

  it('openEditTask stores the task ID', () => {
    useModalStore.getState().openEditTask('task-abc');
    expect(useModalStore.getState().activeTaskId).toBe('task-abc');
  });

  it('openEditTask on a different task replaces the active task ID', () => {
    useModalStore.getState().openEditTask('task-1');
    useModalStore.getState().openEditTask('task-2');
    expect(useModalStore.getState().activeTaskId).toBe('task-2');
  });

  it('closeModal clears both activeModal and activeTaskId', () => {
    useModalStore.getState().openEditTask('task-abc');
    useModalStore.getState().closeModal();
    expect(useModalStore.getState().activeModal).toBeNull();
    expect(useModalStore.getState().activeTaskId).toBeNull();
  });
});
