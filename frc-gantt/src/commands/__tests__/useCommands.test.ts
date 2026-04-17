import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommands } from '../useCommands';
import type { CommandContext } from '../appCommands';

function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    hasProject: false,
    onNewProject: vi.fn(),
    openProject: vi.fn(),
    saveProject: vi.fn(),
    saveProjectAs: vi.fn(),
    closeProject: vi.fn(),
    ...overrides,
  };
}

describe('useCommands dispatch', () => {
  it('dispatches project.new and calls onNewProject', () => {
    const ctx = makeCtx();
    const { result } = renderHook(() => useCommands(ctx));
    act(() => result.current.dispatch('project.new'));
    expect(ctx.onNewProject).toHaveBeenCalledOnce();
  });

  it('dispatches project.open and calls openProject', () => {
    const ctx = makeCtx();
    const { result } = renderHook(() => useCommands(ctx));
    act(() => result.current.dispatch('project.open'));
    expect(ctx.openProject).toHaveBeenCalledOnce();
  });

  it('does not dispatch project.save when no project', () => {
    const ctx = makeCtx({ hasProject: false });
    const { result } = renderHook(() => useCommands(ctx));
    act(() => result.current.dispatch('project.save'));
    expect(ctx.saveProject).not.toHaveBeenCalled();
  });

  it('dispatches project.save when project is open', () => {
    const ctx = makeCtx({ hasProject: true });
    const { result } = renderHook(() => useCommands(ctx));
    act(() => result.current.dispatch('project.save'));
    expect(ctx.saveProject).toHaveBeenCalledOnce();
  });

  it('dispatches project.saveAs when project is open', () => {
    const ctx = makeCtx({ hasProject: true });
    const { result } = renderHook(() => useCommands(ctx));
    act(() => result.current.dispatch('project.saveAs'));
    expect(ctx.saveProjectAs).toHaveBeenCalledOnce();
  });

  it('does not dispatch project.close when no project', () => {
    const ctx = makeCtx({ hasProject: false });
    const { result } = renderHook(() => useCommands(ctx));
    act(() => result.current.dispatch('project.close'));
    expect(ctx.closeProject).not.toHaveBeenCalled();
  });
});

describe('useCommands isEnabled', () => {
  it('reports project.save disabled with no project', () => {
    const ctx = makeCtx({ hasProject: false });
    const { result } = renderHook(() => useCommands(ctx));
    expect(result.current.isEnabled('project.save')).toBe(false);
  });

  it('reports project.save enabled with a project', () => {
    const ctx = makeCtx({ hasProject: true });
    const { result } = renderHook(() => useCommands(ctx));
    expect(result.current.isEnabled('project.save')).toBe(true);
  });

  it('reports project.new always enabled', () => {
    const ctx = makeCtx({ hasProject: false });
    const { result } = renderHook(() => useCommands(ctx));
    expect(result.current.isEnabled('project.new')).toBe(true);
  });
});

describe('useCommands dispatch stability', () => {
  it('dispatch reference is stable across re-renders', () => {
    const ctx = makeCtx();
    const { result, rerender } = renderHook(() => useCommands(ctx));
    const first = result.current.dispatch;
    rerender();
    expect(result.current.dispatch).toBe(first);
  });
});
