// src/commands/appCommands.ts
// Central command registry — every application action is defined here.
// Menu items, toolbar buttons, and keyboard shortcuts all reference these
// command IDs so enable/disable state and behavior stay in sync.

export interface CommandContext {
  hasProject: boolean;
  onNewProject: () => void;
  openProject: () => void;
  saveProject: () => void;
  saveProjectAs: () => void;
  closeProject: () => void;
}

export type CommandId =
  | 'project.new'
  | 'project.open'
  | 'project.save'
  | 'project.saveAs'
  | 'project.close';

export interface AppCommand {
  id: CommandId;
  label: string;
  /** Human-readable accelerator hint — not parsed, for display only */
  accelerator?: string;
  isEnabled: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void;
}

export const APP_COMMANDS: AppCommand[] = [
  {
    id: 'project.new',
    label: 'New Project',
    accelerator: 'Ctrl+N',
    isEnabled: () => true,
    run: (ctx) => ctx.onNewProject(),
  },
  {
    id: 'project.open',
    label: 'Open…',
    accelerator: 'Ctrl+O',
    isEnabled: () => true,
    run: (ctx) => ctx.openProject(),
  },
  {
    id: 'project.save',
    label: 'Save',
    accelerator: 'Ctrl+S',
    isEnabled: (ctx) => ctx.hasProject,
    run: (ctx) => ctx.saveProject(),
  },
  {
    id: 'project.saveAs',
    label: 'Save As…',
    accelerator: 'Ctrl+Shift+S',
    isEnabled: (ctx) => ctx.hasProject,
    run: (ctx) => ctx.saveProjectAs(),
  },
  {
    id: 'project.close',
    label: 'Close Project',
    isEnabled: (ctx) => ctx.hasProject,
    run: (ctx) => ctx.closeProject(),
  },
];
