import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskDialog } from '../index';
import { createTask, createProject } from '../../../types';

// ── Store mocks ───────────────────────────────────────────────

const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockAddTask    = vi.fn();
const mockOpenEditTask = vi.fn();

vi.mock('../../../stores/projectStore', () => ({
  useProjectStore: (sel: (s: object) => unknown) =>
    sel({ updateTask: mockUpdateTask, deleteTask: mockDeleteTask, addTask: mockAddTask }),
}));
vi.mock('../../../stores/modalStore', () => ({
  useModalStore: (sel: (s: object) => unknown) =>
    sel({ openEditTask: mockOpenEditTask }),
}));
vi.mock('../../../stores/teamStore', () => ({
  useTeamStore: (sel: (s: object) => unknown) =>
    sel({ db: { subteams: [], skills: [], members: [] } }),
}));

// ── Test fixtures ─────────────────────────────────────────────

const testProject = createProject({
  name: 'Test', teamNumber: 1, season: '2026',
  startDate: '2026-01-05',
  goalEndDate: '2026-06-01',
  hardEndDate: '2026-06-01',
  schedulePeriods: [{
    id: 'p1', startDate: '2026-01-05', endDate: '2026-06-01',
    meetingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    defaultStartTime: '15:30', defaultEndTime: '18:30',
  }],
  scheduleExceptions: [],
});

const testTask = createTask({
  title: 'Drive Train Assembly',
  taskType: 'assembly',
  startDate: '2026-01-05',
  plannedEndDate: '2026-01-10',
  estimatedDays: 5,
});

function renderDialog(onClose = vi.fn()) {
  return render(
    <TaskDialog task={testTask} project={testProject} onClose={onClose} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────

describe('TaskDialog — rendering', () => {
  it('shows Edit Task header', () => {
    renderDialog();
    expect(screen.getByText('Edit Task')).toBeInTheDocument();
  });

  it('pre-fills the title field with the task title', () => {
    renderDialog();
    expect(screen.getByDisplayValue('Drive Train Assembly')).toBeInTheDocument();
  });

  it('shows Save and Cancel buttons', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });
});

// ── Save ──────────────────────────────────────────────────────

describe('TaskDialog — save', () => {
  it('calls updateTask and onClose when Save is clicked', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockUpdateTask).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not save when title is cleared', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.change(screen.getByDisplayValue('Drive Train Assembly'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockUpdateTask).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('passes the edited title to updateTask', () => {
    renderDialog();
    fireEvent.change(screen.getByDisplayValue('Drive Train Assembly'), {
      target: { value: 'Gearbox Build' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith(
      testTask.id,
      expect.objectContaining({ title: 'Gearbox Build' }),
    );
  });
});

// ── Cancel ────────────────────────────────────────────────────

describe('TaskDialog — cancel', () => {
  it('calls onClose without saving when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });
});

// ── Delete ────────────────────────────────────────────────────

describe('TaskDialog — delete', () => {
  it('first click shows confirmation prompt', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(screen.getByText(/Delete this task\?/i)).toBeInTheDocument();
  });

  it('confirming delete calls deleteTask and onClose', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Yes$/i }));
    expect(mockDeleteTask).toHaveBeenCalledWith(testTask.id);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancelling delete returns to normal state', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^No$/i }));
    expect(screen.queryByText(/Delete this task\?/i)).toBeNull();
  });
});

// ── Add child ─────────────────────────────────────────────────

describe('TaskDialog — add child task', () => {
  it('shows "Add Task inside this" button for assembly tasks', () => {
    renderDialog();
    expect(screen.getByText(/Add Task inside this assembly/i)).toBeInTheDocument();
  });

  it('does not show add-child button for milestone tasks', () => {
    const milestone = createTask({
      title: 'Kickoff', taskType: 'milestone',
      startDate: '2026-01-05', plannedEndDate: '2026-01-05',
    });
    render(<TaskDialog task={milestone} project={testProject} onClose={vi.fn()} />);
    expect(screen.queryByText(/Add Task inside/i)).toBeNull();
  });

  it('calls addTask and openEditTask when adding a child', () => {
    renderDialog();
    fireEvent.click(screen.getByText(/Add Task inside this assembly/i));
    expect(mockAddTask).toHaveBeenCalledOnce();
    expect(mockOpenEditTask).toHaveBeenCalledOnce();
  });
});
