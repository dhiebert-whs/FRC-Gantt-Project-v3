// src/components/TaskDialog/taskFormUtils.ts
// Pure form utilities for task dialogs — safe to import in tests with no React deps.

import type { Task, Project, TaskType, TaskStatus, TaskPriority } from '../../types';
import { addMeetingDays } from '../../utils/scheduleUtils';

// ── Form state ────────────────────────────────────────────────

export interface TaskForm {
  title: string;
  description: string;
  taskType: TaskType;
  color: string;
  startDate: string;
  hardDeadline: string;
  estimatedDays: number;
  status: TaskStatus;
  priority: TaskPriority;
  completionPercent: number;
  requiredSubteamIds: string[];
  requiredSkillIds: string[];
  assignedMemberIds: string[];
  notes: string;
}

export function taskToForm(task: Task): TaskForm {
  return {
    title:              task.title,
    description:        task.description ?? '',
    taskType:           task.taskType,
    color:              task.color ?? '#457B9D',
    startDate:          task.startDate,
    hardDeadline:       task.hardDeadline ?? '',
    estimatedDays:      Math.max(1, task.estimatedDays),
    status:             task.status,
    priority:           task.priority,
    completionPercent:  task.completionPercent,
    requiredSubteamIds: task.requiredSubteamIds,
    requiredSkillIds:   task.requiredSkillIds,
    assignedMemberIds:  task.assignedMemberIds,
    notes:              task.notes,
  };
}

// ── Validation ────────────────────────────────────────────────

export interface TaskFormErrors {
  [key: string]: string | undefined;
  title?: string;
}

export function validateTaskForm(form: TaskForm): TaskFormErrors {
  const errors: TaskFormErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  return errors;
}

// ── Planned end date derivation ───────────────────────────────

/** Derives the planned end date from start date + estimated days. Pure — no side effects. */
export function computePlannedEndDate(
  startDate: string,
  estimatedDays: number,
  taskType: TaskType,
  project: Project,
): string {
  if (taskType === 'milestone') return startDate;
  // addMeetingDays has a 730-day guard that falls back to calendar math when
  // no schedule periods match rather than throwing. Guard against that here so
  // we return startDate instead of a date two years in the future.
  const coveringPeriod = project.schedulePeriods.find(
    p => p.startDate <= startDate && startDate <= p.endDate && p.meetingDays.length > 0,
  );
  if (!coveringPeriod) return startDate;
  try {
    return addMeetingDays(startDate, Math.max(1, estimatedDays), project);
  } catch {
    return startDate;
  }
}
