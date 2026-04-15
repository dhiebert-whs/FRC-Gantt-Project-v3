// ============================================================
// FRC Gantt App — Gantt View
// src/components/GanttView/index.tsx
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { resolveDisplayMode } from '../../utils/displayMode';
import { gantt } from 'dhtmlx-gantt';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTeamStore } from '../../stores/teamStore';
import {
  projectToGanttData,
  ganttToTask,
  ganttToDependency,
} from '../../utils/ganttAdapter';
import { getMeetingDaysInRange, addMeetingDays } from '../../utils/scheduleUtils';
import { createTask } from '../../types';
import type { GanttColumnId, Project, TeamMember, TaskType } from '../../types';
import { TaskEditor } from '../TaskEditor';

// ------------------------------------------------------------
// Work-time setup
// ------------------------------------------------------------

function setupWorkTime(project: Project) {
  // Reset all days of week to non-working
  for (let d = 0; d < 7; d++) {
    gantt.setWorkTime({ day: d, hours: false });
  }
  // Mark each actual meeting day as working
  const meetingDays = getMeetingDaysInRange(
    project.startDate,
    project.hardEndDate,
    project,
  );
  for (const dateStr of meetingDays) {
    gantt.setWorkTime({ date: new Date(dateStr + 'T00:00:00'), hours: true });
  }
}

// ------------------------------------------------------------
// Column configuration
// ------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed:   'Done',
  blocked:     'Blocked',
  deferred:    'Deferred',
};

const STATUS_COLORS: Record<string, string> = {
  not_started: '#6b7280',
  in_progress: '#3b82f6',
  completed:   '#22c55e',
  blocked:     '#ef4444',
  deferred:    '#f59e0b',
};

const PRIORITY_LABELS: Record<string, string> = {
  low:      'Low',
  normal:   'Normal',
  high:     'High',
  critical: 'Critical',
};

function buildColumns(
  visibleColumns: GanttColumnId[],
  getMembers: () => TeamMember[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols: any[] = [];

  // Title column — always first, always visible
  cols.push({
    name:   'text',
    label:  'Task',
    tree:   true,
    width:  200,
    resize: true,
    editor: { type: 'text', map_to: 'text' },
  });

  if (visibleColumns.includes('assignee')) {
    cols.push({
      name:     'assignee',
      label:    'Assignee',
      width:    110,
      resize:   true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: (task: any) => {
        const ids: string[] = task.$assignedMemberIds ?? [];
        if (!ids.length) return '<span style="color:#6b7280">—</span>';
        const names = ids
          .map((id: string) => {
            const m = getMembers().find(m => m.id === id);
            return m ? m.firstName : null;
          })
          .filter(Boolean)
          .join(', ');
        return names || '<span style="color:#6b7280">—</span>';
      },
    });
  }

  if (visibleColumns.includes('status')) {
    cols.push({
      name:     'status',
      label:    'Status',
      width:    90,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: (task: any) => {
        const s     = task.$status ?? 'not_started';
        const color = STATUS_COLORS[s] ?? '#6b7280';
        const label = STATUS_LABELS[s] ?? s;
        return `<span style="background:${color};color:white;padding:1px 6px;border-radius:3px;font-size:10px;white-space:nowrap">${label}</span>`;
      },
    });
  }

  if (visibleColumns.includes('priority')) {
    cols.push({
      name:     'priority',
      label:    'Priority',
      width:    70,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: (task: any) =>
        PRIORITY_LABELS[task.$priority ?? 'normal'] ?? task.$priority,
    });
  }

  if (visibleColumns.includes('startDate')) {
    cols.push({ name: 'start_date', label: 'Start', width: 88, align: 'center' });
  }

  if (visibleColumns.includes('estimatedDays')) {
    cols.push({
      name:     'estimatedDays',
      label:    'Days',
      width:    50,
      align:    'center',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: (task: any) =>
        task.$estimatedDays != null ? String(task.$estimatedDays) : '—',
    });
  }

  if (visibleColumns.includes('completionPercent')) {
    cols.push({
      name:     'completionPercent',
      label:    '%',
      width:    45,
      align:    'center',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: (task: any) => `${Math.round((task.progress ?? 0) * 100)}%`,
    });
  }

  if (visibleColumns.includes('endDate')) {
    cols.push({
      name:     'end_date',
      label:    'End',
      width:    88,
      align:    'center',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: (task: any) => {
        if (!task.end_date) return '—';
        try {
          const d = task.end_date instanceof Date ? task.end_date : new Date(task.end_date);
          return format(d, 'MM/dd/yy');
        } catch {
          return '—';
        }
      },
    });
  }

  return cols;
}

// ------------------------------------------------------------
// Module-level flag — prevents duplicate zoom.init() + attachEvent()
// during React StrictMode's mount → cleanup → remount cycle.
// The gantt singleton persists across clearAll(); only destructor() resets ext.
// ------------------------------------------------------------
let ganttConfigured = false;

// ------------------------------------------------------------
// GanttView component
// ------------------------------------------------------------

// Any non-milestone task can have children added to it
const canHaveChildren = (taskType: TaskType) => taskType !== 'milestone';

export function GanttView() {
  const containerRef     = useRef<HTMLDivElement>(null);
  const ganttInitialized = useRef(false);
  const suppressReload   = useRef(false);

  // ── Store subscriptions ──
  const projectFile      = useProjectStore(s => s.projectFile);
  const addTask          = useProjectStore(s => s.addTask);
  const updateTask       = useProjectStore(s => s.updateTask);
  const deleteTask       = useProjectStore(s => s.deleteTask);
  const addDependency    = useProjectStore(s => s.addDependency);
  const deleteDependency = useProjectStore(s => s.deleteDependency);

  const ganttPrefs         = useSettingsStore(s => s.settings.gantt);
  const updateGanttPrefs   = useSettingsStore(s => s.updateGanttPrefs);
  const colorPalette       = useSettingsStore(s => s.settings.subsystemColorPalette);
  const displayModeSetting = useSettingsStore(s => s.settings.displayMode);

  const teamMembers      = useTeamStore(s => s.db.members);

  // ── Local UI state ──
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [zoom,           setZoom]           = useState<'day' | 'week' | 'month'>(ganttPrefs.defaultZoom);
  const [criticalPath,   setCriticalPath]   = useState(ganttPrefs.showCriticalPath);

  // ── Refs so event handlers always see latest values ──
  const projectFileRef      = useRef(projectFile);
  const updateTaskRef       = useRef(updateTask);
  const addDependencyRef    = useRef(addDependency);
  const deleteDependencyRef = useRef(deleteDependency);
  const teamMembersRef      = useRef(teamMembers);
  const colorPaletteRef     = useRef(colorPalette);
  const addTaskRef          = useRef(addTask);
  const deleteTaskRef       = useRef(deleteTask);

  useEffect(() => { projectFileRef.current      = projectFile;      }, [projectFile]);
  useEffect(() => { updateTaskRef.current       = updateTask;       }, [updateTask]);
  useEffect(() => { addDependencyRef.current    = addDependency;    }, [addDependency]);
  useEffect(() => { deleteDependencyRef.current = deleteDependency; }, [deleteDependency]);
  useEffect(() => { teamMembersRef.current      = teamMembers;      }, [teamMembers]);
  useEffect(() => { colorPaletteRef.current     = colorPalette;     }, [colorPalette]);
  useEffect(() => { addTaskRef.current          = addTask;          }, [addTask]);
  useEffect(() => { deleteTaskRef.current       = deleteTask;       }, [deleteTask]);

  // ── Gantt initialization ─────────────────────────────────────
  // IMPORTANT: The containerRef div is ALWAYS in the DOM (never inside an early return).
  // This guarantees containerRef.current is set when this effect first runs.
  //
  // React StrictMode fires: mount → cleanup → remount. We use gantt.clearAll() in
  // cleanup (not gantt.destructor()) so gantt.ext.zoom survives the cycle.
  // The module-level `ganttConfigured` flag prevents ext.zoom.init() and
  // attachEvent() from being called twice.
  useEffect(() => {
    if (!containerRef.current || ganttInitialized.current) return;

    // Core config — safe to (re-)set on every mount
    gantt.config.date_format         = '%Y-%m-%d %H:%i';
    gantt.config.duration_unit       = 'day';
    gantt.config.work_time           = true;
    gantt.config.fit_tasks           = true;
    gantt.config.drag_links          = true;
    gantt.config.drag_progress       = false;
    gantt.config.show_today_marker   = ganttPrefs.highlightToday;
    gantt.config.open_tree_initially = true;
    gantt.config.readonly            = false;

    if (!ganttConfigured) {
      // Scale dimensions vary by display mode — kiosk needs larger rows for touch readability.
      // displayModeSetting is read from the store at component render time; settings are
      // guaranteed loaded before GanttView mounts (App.tsx loading screen), so this is safe.
      const isKiosk    = resolveDisplayMode(displayModeSetting) === 'kiosk';
      const scaleH     = isKiosk ? 70 : 50;
      const dayColW    = isKiosk ? 80 : 60;
      const weekColW   = isKiosk ? 65 : 50;
      const monthColW  = isKiosk ? 160 : 120;

      // Zoom levels — only init once (ext.zoom is reset by destructor, not clearAll)
      gantt.ext.zoom.init({
        levels: [
          {
            name: 'day',
            scale_height: scaleH,
            min_column_width: dayColW,
            scales: [
              { unit: 'month', step: 1, format: '%F %Y' },
              { unit: 'day',   step: 1, format: '%d %D' },
            ],
          },
          {
            name: 'week',
            scale_height: scaleH,
            min_column_width: weekColW,
            scales: [
              { unit: 'month', step: 1, format: '%F %Y' },
              { unit: 'week',  step: 1, format: 'W%W' },
              { unit: 'day',   step: 1, format: '%d' },
            ],
          },
          {
            name: 'month',
            scale_height: scaleH,
            min_column_width: monthColW,
            scales: [
              { unit: 'month', step: 1, format: '%F %Y' },
              { unit: 'week',  step: 1, format: 'W%W' },
            ],
          },
        ],
      });

      // Initial columns
      gantt.config.columns = buildColumns(
        ganttPrefs.visibleColumns,
        () => teamMembersRef.current,
      );

      // Task bar styling
      gantt.templates.task_style = function (_start: Date, _end: Date, task: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (task.$color) return `background:${task.$color};border-color:${task.$color};`;
        return '';
      };
      gantt.templates.progress_text = function () { return ''; };

      // Grey out non-working day columns
      gantt.templates.scale_cell_class = function (date: Date) {
        return gantt.isWorkTime(date, 'day') ? '' : 'gantt-nonwork-scale';
      };
      gantt.templates.timeline_cell_class = function (_task: any, date: Date) { // eslint-disable-line @typescript-eslint/no-explicit-any
        return gantt.isWorkTime(date, 'day') ? '' : 'gantt-nonwork-cell';
      };

      // Block gantt's built-in inline task creation / deletion
      gantt.attachEvent('onBeforeTaskAdd',    () => false);
      gantt.attachEvent('onBeforeTaskDelete', () => false);

      // ── Event handlers ────────────────────────────────────────

      gantt.attachEvent('onAfterTaskUpdate', (id: string, task: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const pf = projectFileRef.current;
        if (!pf) return true;
        const existing = pf.tasks.find(t => t.id === id);
        if (!existing) return true;
        suppressReload.current = true;
        updateTaskRef.current(id, ganttToTask(task, existing, pf.project));
        requestAnimationFrame(() => { suppressReload.current = false; });
        return true;
      });

      gantt.attachEvent('onAfterLinkAdd', (id: string, link: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const pf = projectFileRef.current;
        if (!pf) return true;
        suppressReload.current = true;
        const predecessor = pf.tasks.find(t => t.id === link.source);
        const predecessorEndDate = predecessor?.plannedEndDate ?? pf.project.startDate;
        addDependencyRef.current(ganttToDependency({ ...link, id }, pf.project, predecessorEndDate));
        requestAnimationFrame(() => { suppressReload.current = false; });
        return true;
      });

      gantt.attachEvent('onAfterLinkDelete', (id: string) => {
        suppressReload.current = true;
        deleteDependencyRef.current(id);
        requestAnimationFrame(() => { suppressReload.current = false; });
        return true;
      });

      // Task click → open editor
      gantt.attachEvent('onTaskClick', (id: string) => {
        setSelectedTaskId(id);
        return true;
      });

      ganttConfigured = true;
    }

    // (Re-)attach gantt to this mount's DOM container, then seed with empty data
    gantt.init(containerRef.current);
    gantt.parse({ data: [], links: [] });
    ganttInitialized.current = true;
    gantt.ext.zoom.setLevel(ganttPrefs.defaultZoom);

    return () => {
      // Use clearAll() — NOT destructor() — so gantt.ext.zoom survives StrictMode cleanup
      gantt.clearAll();
      ganttInitialized.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ Empty deps intentional: init runs once. All mutable state accessed via refs.

  // ── Columns (when visible column prefs change) ──────────────
  useEffect(() => {
    if (!ganttInitialized.current) return;
    gantt.config.columns = buildColumns(
      ganttPrefs.visibleColumns,
      () => teamMembersRef.current,
    );
    gantt.render();
  }, [ganttPrefs.visibleColumns]);

  // ── Work time (when project schedule changes) ────────────────
  useEffect(() => {
    if (!ganttInitialized.current || !projectFile?.project) return;
    setupWorkTime(projectFile.project);
    gantt.render();
  // projectFile.project ref is stable across task-only store updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFile?.project]);

  // ── Data reload (when tasks or dependencies change) ──────────
  useEffect(() => {
    if (!ganttInitialized.current) return;
    if (!projectFile) {
      gantt.clearAll();
      return;
    }
    if (suppressReload.current) return;

    gantt.clearAll();
    gantt.parse(
      projectToGanttData(projectFile.tasks, projectFile.dependencies, projectFile.project),
    );
  }, [projectFile]);

  // ── Zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ganttInitialized.current) return;
    gantt.ext.zoom.setLevel(zoom);
  }, [zoom]);

  // ── Critical path ─────────────────────────────────────────────
  useEffect(() => {
    if (!ganttInitialized.current) return;
    gantt.config.highlight_critical_path = criticalPath;
    gantt.render();
  }, [criticalPath]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleAddSubsystem = useCallback(() => {
    const pf = projectFileRef.current;
    if (!pf) return;
    const subsystemCount = pf.tasks.filter(t => t.taskType === 'subsystem').length;
    const color = colorPaletteRef.current[subsystemCount % colorPaletteRef.current.length] ?? '#457B9D';
    const startDate = pf.project.startDate;
    const task = createTask({
      id:            nanoid(),
      title:         'New Subsystem',
      taskType:      'subsystem',
      startDate,
      plannedEndDate: addMeetingDays(startDate, 5, pf.project),
      estimatedDays:  5,
      color,
    });
    addTaskRef.current(task);
    setSelectedTaskId(task.id);
  }, []);

  // Creates a child task under the given parent
  const handleAddChildTask = useCallback((parentId: string) => {
    const pf = projectFileRef.current;
    if (!pf) return;
    const parent = pf.tasks.find(t => t.id === parentId);
    if (!parent) return;
    const startDate = parent.startDate;
    const task = createTask({
      id:            nanoid(),
      title:         'New Task',
      taskType:      'task',
      parentId,
      startDate,
      plannedEndDate: addMeetingDays(startDate, 3, pf.project),
      estimatedDays:  3,
    });
    addTaskRef.current(task);
    setSelectedTaskId(task.id);
  }, []);

  const handleZoomChange = useCallback((level: 'day' | 'week' | 'month') => {
    setZoom(level);
    updateGanttPrefs({ defaultZoom: level });
  }, [updateGanttPrefs]);

  const handleCriticalPathToggle = useCallback(() => {
    const next = !criticalPath;
    setCriticalPath(next);
    updateGanttPrefs({ showCriticalPath: next });
  }, [criticalPath, updateGanttPrefs]);

  // ── Derived state ─────────────────────────────────────────────
  const selectedTask = selectedTaskId && projectFile
    ? (projectFile.tasks.find(t => t.id === selectedTaskId) ?? null)
    : null;

  // "Add Task" is enabled when any non-milestone task is selected
  const selectedIsParent =
    !!selectedTask && canHaveChildren(selectedTask.taskType);

  // ── Render ───────────────────────────────────────────────────
  //
  // IMPORTANT: The gantt container div (containerRef) is ALWAYS rendered,
  // even when no project is open. Without this, containerRef.current is null
  // when the init useEffect([], []) fires, and gantt never initializes.
  // The "no project" message is rendered as an absolute overlay instead.

  return (
    <div className="flex flex-col h-full">

      {/* Toolbar — only meaningful when a project is open */}
      <div className="flex items-center gap-2 kiosk:gap-3 px-3 py-2 kiosk:py-3 bg-gray-900 border-b border-gray-700 shrink-0">

        <button
          onClick={handleAddSubsystem}
          disabled={!projectFile}
          className="px-3 kiosk:px-4 py-1.5 kiosk:py-3 text-sm kiosk:text-base bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded"
        >
          + Add Subsystem
        </button>

        <button
          onClick={() => selectedTask && handleAddChildTask(selectedTask.id)}
          disabled={!selectedIsParent}
          title={
            !projectFile
              ? 'Open a project first'
              : !selectedTask
              ? 'Click a subsystem or assembly to select it first'
              : !selectedIsParent
              ? 'Select a subsystem or assembly to add a task inside it'
              : `Add a task inside "${selectedTask.title}"`
          }
          className="px-3 kiosk:px-4 py-1.5 kiosk:py-3 text-sm kiosk:text-base bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded"
        >
          + Add Task
        </button>

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Zoom */}
        <div className="flex rounded overflow-hidden border border-gray-600">
          {(['day', 'week', 'month'] as const).map(level => (
            <button
              key={level}
              onClick={() => handleZoomChange(level)}
              className={`px-3 kiosk:px-4 py-1 kiosk:py-2.5 text-sm kiosk:text-base capitalize ${
                zoom === level
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Critical path */}
        <button
          onClick={handleCriticalPathToggle}
          className={`px-3 kiosk:px-4 py-1.5 kiosk:py-3 text-sm kiosk:text-base rounded border ${
            criticalPath
              ? 'bg-red-700 border-red-500 text-white'
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Critical Path
        </button>
      </div>

      {/* Gantt chart area — container is always in DOM so gantt.init() always works */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* The gantt container — always rendered */}
        <div
          ref={containerRef}
          className="flex-1"
          style={{ minWidth: 0, minHeight: 0 }}
        />

        {/* No-project overlay — shown on top of the empty gantt when nothing is open */}
        {!projectFile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 gap-2 text-gray-500 z-10">
            <p className="text-lg">No project open.</p>
            <p className="text-sm">Use File → New Project or File → Open to get started.</p>
          </div>
        )}

        {/* TaskEditor slide-in panel */}
        {selectedTask && projectFile && (
          <TaskEditor
            key={selectedTask.id}
            task={selectedTask}
            project={projectFile.project}
            onClose={() => setSelectedTaskId(null)}
            onAddChild={canHaveChildren(selectedTask.taskType)
              ? handleAddChildTask
              : undefined}
          />
        )}

      </div>
    </div>
  );
}
