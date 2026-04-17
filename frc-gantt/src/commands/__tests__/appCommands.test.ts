import { describe, it, expect, vi } from 'vitest';
import { APP_COMMANDS, type CommandContext } from '../appCommands';

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

function cmd(id: string) {
  const c = APP_COMMANDS.find(c => c.id === id);
  if (!c) throw new Error(`Command not found: ${id}`);
  return c;
}

// --- isEnabled ---

describe('project.new isEnabled', () => {
  it('is always enabled', () => {
    expect(cmd('project.new').isEnabled(makeCtx({ hasProject: false }))).toBe(true);
    expect(cmd('project.new').isEnabled(makeCtx({ hasProject: true }))).toBe(true);
  });
});

describe('project.open isEnabled', () => {
  it('is always enabled', () => {
    expect(cmd('project.open').isEnabled(makeCtx({ hasProject: false }))).toBe(true);
    expect(cmd('project.open').isEnabled(makeCtx({ hasProject: true }))).toBe(true);
  });
});

describe('project.save isEnabled', () => {
  it('is disabled when no project', () => {
    expect(cmd('project.save').isEnabled(makeCtx({ hasProject: false }))).toBe(false);
  });
  it('is enabled when project is open', () => {
    expect(cmd('project.save').isEnabled(makeCtx({ hasProject: true }))).toBe(true);
  });
});

describe('project.saveAs isEnabled', () => {
  it('is disabled when no project', () => {
    expect(cmd('project.saveAs').isEnabled(makeCtx({ hasProject: false }))).toBe(false);
  });
  it('is enabled when project is open', () => {
    expect(cmd('project.saveAs').isEnabled(makeCtx({ hasProject: true }))).toBe(true);
  });
});

describe('project.close isEnabled', () => {
  it('is disabled when no project', () => {
    expect(cmd('project.close').isEnabled(makeCtx({ hasProject: false }))).toBe(false);
  });
  it('is enabled when project is open', () => {
    expect(cmd('project.close').isEnabled(makeCtx({ hasProject: true }))).toBe(true);
  });
});

// --- run dispatch ---

describe('command run routing', () => {
  it('project.new calls onNewProject', () => {
    const ctx = makeCtx();
    cmd('project.new').run(ctx);
    expect(ctx.onNewProject).toHaveBeenCalledOnce();
  });

  it('project.open calls openProject', () => {
    const ctx = makeCtx();
    cmd('project.open').run(ctx);
    expect(ctx.openProject).toHaveBeenCalledOnce();
  });

  it('project.save calls saveProject', () => {
    const ctx = makeCtx({ hasProject: true });
    cmd('project.save').run(ctx);
    expect(ctx.saveProject).toHaveBeenCalledOnce();
  });

  it('project.saveAs calls saveProjectAs', () => {
    const ctx = makeCtx({ hasProject: true });
    cmd('project.saveAs').run(ctx);
    expect(ctx.saveProjectAs).toHaveBeenCalledOnce();
  });

  it('project.close calls closeProject', () => {
    const ctx = makeCtx({ hasProject: true });
    cmd('project.close').run(ctx);
    expect(ctx.closeProject).toHaveBeenCalledOnce();
  });
});
