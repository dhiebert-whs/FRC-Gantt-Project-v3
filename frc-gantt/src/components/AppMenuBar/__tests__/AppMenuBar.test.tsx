import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppMenuBar } from '../index';
import type { CommandId } from '../../../commands/appCommands';

function renderBar(hasProject = false) {
  const dispatch = vi.fn();
  const isEnabled = (id: CommandId) =>
    id === 'project.new' || id === 'project.open' ? true : hasProject;

  render(<AppMenuBar dispatch={dispatch} isEnabled={isEnabled} />);
  return { dispatch, isEnabled };
}

function openFileMenu() {
  fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
}

// --- Menu open/close ---

describe('AppMenuBar — File menu open/close', () => {
  it('File menu is closed by default', () => {
    renderBar();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('clicking File opens the dropdown', () => {
    renderBar();
    openFileMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('clicking File again closes the dropdown', () => {
    renderBar();
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('pressing Escape closes the dropdown', () => {
    renderBar();
    openFileMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

// --- Dispatch routing ---

describe('AppMenuBar — command dispatch', () => {
  it('clicking New Project dispatches project.new', () => {
    const { dispatch } = renderBar();
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /New Project/i }));
    expect(dispatch).toHaveBeenCalledWith('project.new');
  });

  it('clicking Open dispatches project.open', () => {
    const { dispatch } = renderBar();
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Open/i }));
    expect(dispatch).toHaveBeenCalledWith('project.open');
  });

  it('clicking Save dispatches project.save when project is open', () => {
    const { dispatch } = renderBar(true);
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Save$/i }));
    expect(dispatch).toHaveBeenCalledWith('project.save');
  });

  it('clicking Save As dispatches project.saveAs when project is open', () => {
    const { dispatch } = renderBar(true);
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Save As/i }));
    expect(dispatch).toHaveBeenCalledWith('project.saveAs');
  });

  it('dispatching a command closes the menu', () => {
    renderBar();
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /New Project/i }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

// --- Disabled states ---

describe('AppMenuBar — disabled states when no project', () => {
  it('Save is disabled when no project is open', () => {
    renderBar(false);
    openFileMenu();
    const saveBtn = screen.getByRole('menuitem', { name: /^Save$/i });
    expect(saveBtn).toBeDisabled();
  });

  it('Save As is disabled when no project is open', () => {
    renderBar(false);
    openFileMenu();
    const saveAsBtn = screen.getByRole('menuitem', { name: /Save As/i });
    expect(saveAsBtn).toBeDisabled();
  });

  it('Close Project is disabled when no project is open', () => {
    renderBar(false);
    openFileMenu();
    const closeBtn = screen.getByRole('menuitem', { name: /Close Project/i });
    expect(closeBtn).toBeDisabled();
  });

  it('clicking a disabled Save does not dispatch', () => {
    const { dispatch } = renderBar(false);
    openFileMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Save$/i }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('New Project and Open are always enabled', () => {
    renderBar(false);
    openFileMenu();
    expect(screen.getByRole('menuitem', { name: /New Project/i })).not.toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Open/i })).not.toBeDisabled();
  });
});

// --- Stub menus ---

describe('AppMenuBar — stub menus', () => {
  it('renders stub menu headers', () => {
    renderBar();
    ['Edit', 'View', 'Tasks', 'Members', 'Settings', 'Help'].forEach(label => {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    });
  });

  it('clicking a stub menu does not open a dropdown', () => {
    renderBar();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
