// ============================================================
// FRC Gantt App — dhtmlxGantt Adapter
// src/utils/ganttAdapter.ts
//
// Transforms between our TypeScript model and dhtmlxGantt's
// internal format. NEVER store data in GanttTask/GanttLink
// format — always convert on the way in and out.
// ============================================================

import type {
  Task, TaskDependency, Project,
  GanttTask, GanttLink,
  DependencyType, TaskType,
} from '../types';
import {
  DEP_TYPE_TO_GANTT,
  GANTT_TO_DEP_TYPE,
} from '../types';
import {
  meetingDaysToCalendarDays,
  calendarDaysToMeetingDays,
  addMeetingDays,
} from './scheduleUtils';

// ------------------------------------------------------------
// Task → GanttTask
// ------------------------------------------------------------

/**
 * @param hasChildren - pass true when this task has at least one child in the task list.
 *   Any task with children renders as a dhtmlxGantt 'project' (summary bar), regardless
 *   of its stored taskType. This supports unlimited nesting depth without mutating types.
 */
export function taskToGantt(task: Task, project: Project, hasChildren = false): GanttTask {
  const calendarDuration = task.taskType === 'milestone'
    ? 0
    : meetingDaysToCalendarDays(task.startDate, task.estimatedDays, project);

  return {
    id: task.id,
    text: task.title,
    start_date: task.startDate + ' 00:00',
    duration: calendarDuration,
    parent: task.parentId ?? 0,
    progress: task.completionPercent / 100,
    open: task.isExpanded ?? (task.taskType === 'subsystem' || task.taskType === 'assembly'),
    readonly: task.taskType === 'subsystem',
    type: hasChildren ? 'project' : ganttTaskType(task.taskType),
    $color: task.color,
    $status: task.status,
    $priority: task.priority,
    $taskType: task.taskType,
    $assignedMemberIds: task.assignedMemberIds,
    $estimatedDays: task.estimatedDays,
  };
}

function ganttTaskType(taskType: TaskType): GanttTask['type'] {
  switch (taskType) {
    case 'milestone': return 'milestone';
    case 'subsystem':
    case 'assembly':  return 'project';   // dhtmlx "project" = summary/rollup bar
    default:          return 'task';
  }
}

// ------------------------------------------------------------
// GanttTask → Task  (called after user drags/edits in the chart)
// ------------------------------------------------------------

/**
 * Merges changes from dhtmlxGantt back into the existing Task.
 * Only updates fields that dhtmlxGantt can legitimately change;
 * all other fields (assignment, status, priority, etc.) are preserved.
 */
export function ganttToTask(ganttTask: GanttTask, existing: Task, project: Project): Task {
  const newStartDate = ganttTask.start_date.slice(0, 10);
  const meetingDays = ganttTask.duration > 0
    ? calendarDaysToMeetingDays(newStartDate, ganttTask.duration, project)
    : existing.estimatedDays;

  return {
    ...existing,
    title: ganttTask.text,
    startDate: newStartDate,
    plannedEndDate: addMeetingDays(newStartDate, meetingDays, project),
    estimatedDays: meetingDays,
    completionPercent: Math.round(ganttTask.progress * 100),
    parentId: ganttTask.parent === 0 ? undefined : String(ganttTask.parent),
    isExpanded: ganttTask.open,
    updatedAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// TaskDependency → GanttLink
// ------------------------------------------------------------

/**
 * predecessorEndDate is used as the anchor for meeting-day → calendar-day
 * lag conversion. Pass the predecessor task's plannedEndDate.
 */
export function dependencyToGantt(
  dep: TaskDependency,
  project: Project,
  predecessorEndDate: string,
): GanttLink {
  return {
    id: dep.id,
    source: dep.predecessorId,
    target: dep.successorId,
    type: DEP_TYPE_TO_GANTT[dep.type],
    lag: dep.lagDays !== 0
      ? meetingDaysToCalendarDays(predecessorEndDate, Math.abs(dep.lagDays), project) * Math.sign(dep.lagDays)
      : 0,
  };
}

// ------------------------------------------------------------
// GanttLink → TaskDependency  (called after user draws a link)
// ------------------------------------------------------------

/**
 * predecessorEndDate is used as the anchor for calendar-day → meeting-day
 * lag conversion. Pass the predecessor task's plannedEndDate (or project
 * startDate as a fallback when the predecessor can't be found).
 */
export function ganttToDependency(
  ganttLink: GanttLink,
  project: Project,
  predecessorEndDate: string,
  existingId?: string,
): Omit<TaskDependency, 'id'> & { id: string } {
  const rawLag = ganttLink.lag ?? 0;
  return {
    id: existingId ?? ganttLink.id,
    predecessorId: ganttLink.source,
    successorId: ganttLink.target,
    type: (GANTT_TO_DEP_TYPE[ganttLink.type] ?? 'FS') as DependencyType,
    lagDays: rawLag !== 0
      ? calendarDaysToMeetingDays(predecessorEndDate, Math.abs(rawLag), project) * Math.sign(rawLag)
      : 0,
  };
}

// ------------------------------------------------------------
// Batch transforms — convert entire project for gantt.parse()
// ------------------------------------------------------------

export function projectToGanttData(
  tasks: Task[],
  dependencies: TaskDependency[],
  project: Project,
): { data: GanttTask[]; links: GanttLink[] } {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  // Any task that appears as a parentId somewhere in the list has children
  const parentIds = new Set(
    tasks.map(t => t.parentId).filter(Boolean) as string[],
  );
  return {
    data: tasks.map(t => {
      const gt = taskToGantt(t, project, parentIds.has(t.id));
      // Resolve color by walking up the parent chain
      gt.$color = resolveTaskColor(t, taskMap);
      return gt;
    }),
    links: dependencies.map(d => {
      const predecessor = taskMap.get(d.predecessorId);
      const predecessorEndDate = predecessor?.plannedEndDate ?? project.startDate;
      return dependencyToGantt(d, project, predecessorEndDate);
    }),
  };
}

// ------------------------------------------------------------
// Subsystem color lookup
// (resolve the effective color for any task by walking up the tree)
// ------------------------------------------------------------

/**
 * Given a task, find its effective display color.
 * Walks up the parentId chain to find the nearest ancestor with a color set.
 * Returns undefined if no color found (dhtmlxGantt will use its default).
 */
export function resolveTaskColor(
  task: Task,
  taskMap: Map<string, Task>,
): string | undefined {
  let current: Task | undefined = task;
  while (current) {
    if (current.color) return current.color;
    current = current.parentId ? taskMap.get(current.parentId) : undefined;
  }
  return undefined;
}

// ------------------------------------------------------------
// Subsystem lookup map
// (build once on project load, rebuild on task move/add/delete)
// ------------------------------------------------------------

/**
 * Builds a Map<taskId, rootAncestorId> for all tasks.
 * Every task maps to the top-level task (the one with no parentId) in its branch.
 * Root tasks map to themselves.
 *
 * Used by DailyView to group leaf tasks under their top-level project grouping,
 * regardless of how many nesting levels exist between them.
 *
 * Never stored in the project file — always computed from the task tree.
 */
export function buildSubsystemLookup(tasks: Task[]): Map<string, string> {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const lookup = new Map<string, string>();

  for (const task of tasks) {
    // Walk up to the root (the task whose parentId is undefined or not in the map)
    let current: Task = task;
    while (current.parentId) {
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    lookup.set(task.id, current.id);
  }
  return lookup;
}