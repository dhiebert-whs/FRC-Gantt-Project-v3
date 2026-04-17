import { describe, it, expect } from 'vitest';
import { validateTaskForm, computePlannedEndDate } from '../taskFormUtils';
import { createProject, createTask } from '../../../types';
import type { TaskForm } from '../taskFormUtils';

// ── Helpers ───────────────────────────────────────────────────

function makeForm(overrides: Partial<TaskForm> = {}): TaskForm {
  return {
    title:              'Test Task',
    description:        '',
    taskType:           'task',
    color:              '#457B9D',
    startDate:          '2026-01-05',
    hardDeadline:       '',
    estimatedDays:      3,
    status:             'not_started',
    priority:           'normal',
    completionPercent:  0,
    requiredSubteamIds: [],
    requiredSkillIds:   [],
    assignedMemberIds:  [],
    notes:              '',
    ...overrides,
  };
}

// Project with Mon–Fri meeting days starting 2026-01-05 (Monday)
const testProject = createProject({
  name: 'Test', teamNumber: 1, season: '2026',
  startDate: '2026-01-05',
  goalEndDate: '2026-06-01',
  hardEndDate: '2026-06-01',
  schedulePeriods: [{
    id: 'p1',
    startDate: '2026-01-05',
    endDate:   '2026-06-01',
    meetingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    defaultStartTime: '15:30',
    defaultEndTime:   '18:30',
  }],
  scheduleExceptions: [],
});

// ── validateTaskForm ──────────────────────────────────────────

describe('validateTaskForm', () => {
  it('passes with a valid title', () => {
    expect(Object.keys(validateTaskForm(makeForm({ title: 'My Task' })))).toHaveLength(0);
  });

  it('fails when title is empty', () => {
    expect(validateTaskForm(makeForm({ title: '' }))).toHaveProperty('title');
  });

  it('fails when title is whitespace only', () => {
    expect(validateTaskForm(makeForm({ title: '   ' }))).toHaveProperty('title');
  });
});

// ── computePlannedEndDate ─────────────────────────────────────

describe('computePlannedEndDate', () => {
  it('returns startDate for milestone regardless of estimated days', () => {
    expect(
      computePlannedEndDate('2026-01-05', 10, 'milestone', testProject)
    ).toBe('2026-01-05');
  });

  it('returns a date after startDate for a normal task', () => {
    const result = computePlannedEndDate('2026-01-05', 3, 'task', testProject);
    expect(result > '2026-01-05').toBe(true);
  });

  it('treats estimatedDays=0 as 1 day (minimum)', () => {
    const one = computePlannedEndDate('2026-01-05', 1, 'task', testProject);
    const zero = computePlannedEndDate('2026-01-05', 0, 'task', testProject);
    expect(zero).toBe(one);
  });

  it('returns a later date for more estimated days', () => {
    const short = computePlannedEndDate('2026-01-05', 1, 'task', testProject);
    const long  = computePlannedEndDate('2026-01-05', 5, 'task', testProject);
    expect(long > short).toBe(true);
  });

  it('falls back to startDate when project has no schedule periods', () => {
    const noScheduleProject = createProject({
      name: 'Empty', teamNumber: 1, season: '2026',
      startDate: '2026-01-05',
      goalEndDate: '2026-06-01',
      hardEndDate: '2026-06-01',
    });
    expect(computePlannedEndDate('2026-01-05', 3, 'task', noScheduleProject)).toBe('2026-01-05');
  });

  it('falls back to startDate when startDate is outside all schedule periods', () => {
    const laterProject = createProject({
      name: 'Later', teamNumber: 1, season: '2026',
      startDate: '2026-03-01',
      goalEndDate: '2026-06-01',
      hardEndDate: '2026-06-01',
      schedulePeriods: [{
        id: 'p1', startDate: '2026-03-01', endDate: '2026-06-01',
        meetingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        defaultStartTime: '15:30', defaultEndTime: '18:30',
      }],
      scheduleExceptions: [],
    });
    // startDate '2026-01-05' is before the period starts — should fall back
    expect(computePlannedEndDate('2026-01-05', 3, 'task', laterProject)).toBe('2026-01-05');
  });
});

// ── taskToForm ────────────────────────────────────────────────

describe('taskToForm', () => {
  it('maps task fields to form correctly', async () => {
    const { taskToForm } = await import('../taskFormUtils');
    const task = createTask({
      title: 'Intake Assembly',
      taskType: 'assembly',
      startDate: '2026-01-05',
      plannedEndDate: '2026-01-10',
      estimatedDays: 5,
      status: 'in_progress',
      priority: 'high',
    });
    const form = taskToForm(task);
    expect(form.title).toBe('Intake Assembly');
    expect(form.taskType).toBe('assembly');
    expect(form.status).toBe('in_progress');
    expect(form.priority).toBe('high');
    expect(form.estimatedDays).toBe(5);
  });

  it('enforces minimum estimatedDays of 1', async () => {
    const { taskToForm } = await import('../taskFormUtils');
    const task = createTask({
      title: 'Milestone',
      taskType: 'milestone',
      startDate: '2026-01-05',
      plannedEndDate: '2026-01-05',
      estimatedDays: 0,
    });
    expect(taskToForm(task).estimatedDays).toBe(1);
  });
});
