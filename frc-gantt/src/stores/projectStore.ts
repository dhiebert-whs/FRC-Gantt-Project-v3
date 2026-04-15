// ============================================================
// FRC Gantt App — Project Store
// src/stores/projectStore.ts
// ============================================================

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type {
  ProjectFile, Project, Task, TaskDependency,
  WorkSession, DailyNote, AttendanceRecord,
} from '../types';
import { createProjectFile } from '../types';
import { buildSubsystemLookup } from '../utils/ganttAdapter';
import { useToastStore } from './toastStore';

// ------------------------------------------------------------
// State & Actions interfaces
// ------------------------------------------------------------

interface ProjectState {
  projectFile: ProjectFile | null;
  currentFilePath: string | null;
  isDirty: boolean;
  subsystemLookup: Map<string, string>;
}

interface ProjectActions {
  // File operations
  newProject: (project: Project) => void;
  openProject: () => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  closeProject: () => void;

  // Tasks
  addTask: (task: Task) => void;
  updateTask: (id: string, changes: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newParentId: string | undefined) => void;

  // Dependencies
  addDependency: (dep: TaskDependency) => void;
  deleteDependency: (id: string) => void;
  updateDependency: (id: string, changes: Partial<TaskDependency>) => void;

  // Work sessions
  addWorkSession: (session: WorkSession) => void;
  updateWorkSession: (id: string, changes: Partial<WorkSession>) => void;

  // Daily notes
  addDailyNote: (note: DailyNote) => void;
  updateDailyNote: (id: string, content: string) => void;

  // Attendance
  updateAttendance: (sessionId: string, memberId: string, record: AttendanceRecord) => void;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Collects a task ID and the IDs of all its descendants. */
function collectWithDescendants(taskId: string, tasks: Task[]): Set<string> {
  const ids = new Set<string>([taskId]);
  const queue = [taskId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const t of tasks) {
      if (t.parentId === parentId) {
        ids.add(t.id);
        queue.push(t.id);
      }
    }
  }
  return ids;
}

/**
 * Recalculate a parent task's completionPercent as the average of its direct
 * children, then propagate the update up to all ancestors.
 * The `visited` set guards against any accidental circular parentId references.
 */
function recalculateCompletion(
  parentId: string,
  tasks: Task[],
  visited = new Set<string>(),
): Task[] {
  if (visited.has(parentId)) return tasks;
  visited.add(parentId);

  const children = tasks.filter(t => t.parentId === parentId);
  if (children.length === 0) return tasks; // leaf — nothing to recalculate

  const avg = Math.round(
    children.reduce((sum, c) => sum + c.completionPercent, 0) / children.length,
  );

  const updated = tasks.map(t =>
    t.id === parentId
      ? { ...t, completionPercent: avg, updatedAt: new Date().toISOString() }
      : t,
  );

  const parent = updated.find(t => t.id === parentId);
  return parent?.parentId
    ? recalculateCompletion(parent.parentId, updated, visited)
    : updated;
}

/**
 * Called after a task's completionPercent changes.
 * If the task has a parent, recalculates the parent (and all ancestors).
 */
function propagateCompletionUp(changedId: string, tasks: Task[]): Task[] {
  const task = tasks.find(t => t.id === changedId);
  return task?.parentId ? recalculateCompletion(task.parentId, tasks) : tasks;
}

// ------------------------------------------------------------
// Store
// ------------------------------------------------------------

export const useProjectStore = create<ProjectState & ProjectActions>((set, get) => {
  // Private helper — writes the current projectFile to a path and updates store state.
  // Throws on failure; callers are responsible for catching and showing a toast.
  async function writeToPath(filePath: string): Promise<void> {
    const { projectFile } = get();
    if (!projectFile) return;
    const updated: ProjectFile = { ...projectFile, savedAt: new Date().toISOString() };
    await invoke('write_project_file', { path: filePath, json: JSON.stringify(updated, null, 2) });
    set({ projectFile: updated, isDirty: false });
  }

  return {
    // ---- State ----
    projectFile: null,
    currentFilePath: null,
    isDirty: false,
    subsystemLookup: new Map(),

    // ---- File operations ----

    newProject: (project) => {
      set({
        projectFile: createProjectFile(project),
        currentFilePath: null,
        isDirty: true,
        subsystemLookup: new Map(),
      });
    },

    openProject: async () => {
      try {
        const filePath = await invoke<string | null>('show_open_dialog');
        if (!filePath) return;  // user cancelled — not an error
        const json = await invoke<string>('read_project_file', { path: filePath });
        const projectFile = JSON.parse(json) as ProjectFile;
        set({
          projectFile,
          currentFilePath: filePath,
          isDirty: false,
          subsystemLookup: buildSubsystemLookup(projectFile.tasks),
        });
      } catch (e) {
        console.error('Failed to open project:', e);
        useToastStore.getState().addToast(
          'Could not open project file. It may be missing or corrupted.',
          'error',
        );
      }
    },

    saveProject: async () => {
      const { currentFilePath } = get();
      try {
        if (currentFilePath) {
          await writeToPath(currentFilePath);
        } else {
          await get().saveProjectAs();
        }
      } catch (e) {
        console.error('Failed to save project:', e);
        useToastStore.getState().addToast(
          'Failed to save project. Your changes may not be saved.',
          'error',
        );
      }
    },

    saveProjectAs: async () => {
      try {
        const filePath = await invoke<string | null>('show_save_dialog');
        if (!filePath) return;  // user cancelled — not an error
        await writeToPath(filePath);
        set({ currentFilePath: filePath });
      } catch (e) {
        console.error('Failed to save project:', e);
        useToastStore.getState().addToast(
          'Failed to save project. Your changes may not be saved.',
          'error',
        );
      }
    },

    closeProject: () => {
      set({
        projectFile: null,
        currentFilePath: null,
        isDirty: false,
        subsystemLookup: new Map(),
      });
    },

    // ---- Tasks ----

    addTask: (task) => {
      const pf = get().projectFile;
      if (!pf) return;
      const base = [...pf.tasks, task];
      // A new task starts at 0% — if it has a parent, that lowers the parent's average
      const tasks = task.parentId ? propagateCompletionUp(task.id, base) : base;
      set({
        projectFile: { ...pf, tasks },
        isDirty: true,
        subsystemLookup: buildSubsystemLookup(tasks),
      });
    },

    updateTask: (id, changes) => {
      const pf = get().projectFile;
      if (!pf) return;
      const mapped = pf.tasks.map(t =>
        t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
      );
      // Propagate completion upward when completionPercent changes
      const tasks = 'completionPercent' in changes
        ? propagateCompletionUp(id, mapped)
        : mapped;
      // Rebuild lookup when the tree structure changed
      const needsRebuild = 'parentId' in changes || 'taskType' in changes;
      set({
        projectFile: { ...pf, tasks },
        isDirty: true,
        ...(needsRebuild ? { subsystemLookup: buildSubsystemLookup(tasks) } : {}),
      });
    },

    deleteTask: (id) => {
      const pf = get().projectFile;
      if (!pf) return;
      const deletedParentId = pf.tasks.find(t => t.id === id)?.parentId;
      const toDelete = collectWithDescendants(id, pf.tasks);
      const filtered = pf.tasks.filter(t => !toDelete.has(t.id));
      const dependencies = pf.dependencies.filter(
        d => !toDelete.has(d.predecessorId) && !toDelete.has(d.successorId)
      );
      // Recalculate parent's completion now that a child is gone
      const tasks = deletedParentId
        ? recalculateCompletion(deletedParentId, filtered)
        : filtered;
      set({
        projectFile: { ...pf, tasks, dependencies },
        isDirty: true,
        subsystemLookup: buildSubsystemLookup(tasks),
      });
    },

    moveTask: (id, newParentId) => {
      get().updateTask(id, { parentId: newParentId });
    },

    // ---- Dependencies ----

    addDependency: (dep) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({ projectFile: { ...pf, dependencies: [...pf.dependencies, dep] }, isDirty: true });
    },

    deleteDependency: (id) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({
        projectFile: { ...pf, dependencies: pf.dependencies.filter(d => d.id !== id) },
        isDirty: true,
      });
    },

    updateDependency: (id, changes) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({
        projectFile: {
          ...pf,
          dependencies: pf.dependencies.map(d => d.id === id ? { ...d, ...changes } : d),
        },
        isDirty: true,
      });
    },

    // ---- Work sessions ----

    addWorkSession: (session) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({ projectFile: { ...pf, workSessions: [...pf.workSessions, session] }, isDirty: true });
    },

    updateWorkSession: (id, changes) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({
        projectFile: {
          ...pf,
          workSessions: pf.workSessions.map(s => s.id === id ? { ...s, ...changes } : s),
        },
        isDirty: true,
      });
    },

    // ---- Daily notes ----

    addDailyNote: (note) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({ projectFile: { ...pf, dailyNotes: [...pf.dailyNotes, note] }, isDirty: true });
    },

    updateDailyNote: (id, content) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({
        projectFile: {
          ...pf,
          dailyNotes: pf.dailyNotes.map(n =>
            n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n
          ),
        },
        isDirty: true,
      });
    },

    // ---- Attendance ----

    updateAttendance: (sessionId, memberId, record) => {
      const pf = get().projectFile;
      if (!pf) return;
      set({
        projectFile: {
          ...pf,
          workSessions: pf.workSessions.map(s => {
            if (s.id !== sessionId) return s;
            const exists = s.attendance.some(a => a.memberId === memberId);
            const attendance = exists
              ? s.attendance.map(a => a.memberId === memberId ? record : a)
              : [...s.attendance, record];
            return { ...s, attendance };
          }),
        },
        isDirty: true,
      });
    },
  };
});
