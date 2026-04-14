# Phase 3 Review — Gantt View

## Scope Reviewed
Implementation plan reference: `dev_notes/implementation_plan.md`, **Phase 3**.

Phase 3 target: a production-usable Gantt view with dhtmlxGantt init/lifecycle, project data mapping, configurable columns, dependency/task update handlers, zoom + critical-path controls, and a right-side TaskEditor.

## Comparison Summary

### 1) dhtmlxGantt initialization (`src/components/GanttView/index.tsx`) — **Mostly matches plan**
- Uses a single mount effect to initialize `gantt` against a stable DOM ref.
- Configures core options (`date_format`, `duration_unit`, `work_time`, `fit_tasks`, `drag_links`, `show_today_marker`) and extra useful defaults (`open_tree_initially`, `drag_progress=false`).
- Work-time is applied via `setupWorkTime(project)` using meeting-day expansion.
- Initializes with empty parse payload before project load.

### 2) Feeding project data into Gantt (`src/components/GanttView/index.tsx`, `src/utils/ganttAdapter.ts`) — **Matches plan**
- Reload effect watches `projectFile`, calls `gantt.clearAll()` then `gantt.parse(projectToGanttData(...))`.
- `suppressReload` guard prevents store-update feedback loops during Gantt events.
- Adapter resolves effective task color via parent-chain walk (`resolveTaskColor`).

### 3) Gantt columns (`src/components/GanttView/index.tsx`) — **Mostly matches plan**
- Column builder supports title + conditional Assignee/Status/Priority/Start/Est Days/% columns.
- Columns are recomputed/rendered when visible-column settings change.

### 4) Gantt event handlers (`src/components/GanttView/index.tsx`) — **Matches plan**
- `onAfterTaskUpdate` maps through `ganttToTask(...)` then calls `updateTask`.
- `onAfterLinkAdd` maps link via `ganttToDependency(...)` then `addDependency`.
- `onAfterLinkDelete` calls `deleteDependency`.
- `onBeforeTaskDelete` and `onBeforeTaskAdd` block inline delete/create.
- `onTaskClick` opens TaskEditor by selecting task id.

### 5) Zoom controls + persistence (`src/components/GanttView/index.tsx`, `src/stores/settingsStore.ts`) — **Matches plan**
- Day/week/month controls set zoom level in Gantt and persist to settings via `updateGanttPrefs`.
- Zoom extension is initialized once with levels and reused.

### 6) Critical path toggle + persistence (`src/components/GanttView/index.tsx`, `src/stores/settingsStore.ts`) — **Matches plan**
- Toolbar toggle updates `gantt.config.highlight_critical_path`, triggers render, and persists preference.

### 7) TaskEditor panel (`src/components/TaskEditor/index.tsx`) — **Mostly matches plan**
- Right-side panel with expected scheduling, status/priority, assignment, skills/subteams, notes, and delete confirmation.
- Save applies updates through `projectStore.updateTask(...)` and closes the panel.
- Includes child-task creation affordance for subsystem/assembly parents.

### 8) Add task controls (`src/components/GanttView/index.tsx`) — **Matches plan intent**
- `+ Add Subsystem` creates subsystem tasks via `createTask(...)` + `addTask(...)`.
- Inline creation remains blocked via `onBeforeTaskAdd=false`.
- Child tasks can be added from toolbar/editor when a parent task type is selected.

## Concerns / Gaps Identified

1. **Unmount lifecycle differs from Phase 3 plan (`clearAll` vs `destructor`).**
   - The plan explicitly calls for `gantt.destructor()` on unmount.
   - Current implementation intentionally uses `gantt.clearAll()` in cleanup to survive React StrictMode remount behavior.
   - Risk: this leaves singleton-level event/template state alive across view unmounts; this is intentional here, but it is a lifecycle deviation from the documented Phase 3 contract and could complicate later refactors.

2. **Dependency lag conversion is inconsistent and likely incorrect for meeting-day semantics.**
   - `dependencyToGantt(...)` converts lag from meeting days to calendar days using *today* as the anchor date.
   - `ganttToDependency(...)` writes `ganttLink.lag` back directly without converting calendar days to meeting days.
   - Net effect: lag units can drift and become schedule-dependent in non-obvious ways, which undermines the “real dependencies” goal for Phase 3.

3. **`show_today_marker` does not react to settings changes after initial mount.**
   - `gantt.config.show_today_marker` is set during initialization from `ganttPrefs.highlightToday`.
   - There is no effect to reapply this setting if preferences change while GanttView stays mounted.
   - This is not a blocker for Phase 3, but it is a functional gap versus expectation of persisted display preferences being live.

4. **Phase plan lists an `endDate`-style display expectation in typed settings, but column builder omits it.**
   - `GanttColumnId` includes `'endDate'`, but `buildColumns(...)` does not implement it.
   - If settings include `endDate` in visible columns (now or later), the UI silently ignores it.
   - Not critical for minimum Phase 3 usability, but it is a mismatch between settings schema and rendered columns.

## Validation Performed During Review
- Reviewed implementation plan and compared against:
  - `src/components/GanttView/index.tsx`
  - `src/components/TaskEditor/index.tsx`
  - `src/utils/ganttAdapter.ts`
  - `src/stores/projectStore.ts`
  - `src/stores/settingsStore.ts`
  - `src/types/index.ts`
