# FRC Gantt — Implementation Plan

## Guiding Principle
**Build in order. Nothing in Phase N+1 starts until Phase N is working and testable.**
The previous attempt failed because features were added before anything was functional.
Each phase ends with something visible and usable.

---

## Current State (Completed)

- ✅ Tauri + React + TypeScript + Vite scaffold
- ✅ Dependencies: zustand, nanoid, date-fns, dhtmlx-gantt, tailwindcss v4
- ✅ `src/types/index.ts` — all TypeScript interfaces + factory functions
- ✅ `src/utils/scheduleUtils.ts` — meeting day calendar math + `prevMeetingDay`
- ✅ `src/utils/timeUtils.ts` — time/date formatting (24hr store → 12hr display)
- ✅ `src/utils/ganttAdapter.ts` — dhtmlxGantt adapter, dynamic parent rendering, root-ancestor lookup
- ✅ `src-tauri/src/commands.rs` — Rust file I/O commands
- ✅ `vite.config.ts` — Tailwind v4 plugin registered
- ✅ `src/index.css` — Tailwind + dhtmlxGantt CSS imports
- ✅ Phases 1–4 complete (see below)
- ✅ Pre-Phase 5: flexible hierarchy + completion rollup (see below)

---

## Cross-Cutting Architectural Notes

These apply across all phases and must not be deferred or forgotten.

### Schema versioning
All three persisted JSON files (`project`, `team`, `settings`) must include a `version` field (integer, starting at 1).
On load, if the version is missing or lower than the current version, apply defaults for any missing fields
before using the data. Never throw on an older file — merge with defaults instead.
This has not been implemented yet. Add it when any of the file schemas change for the first time.

### Display mode (kiosk / desktop)

The app runs on two different hardware setups with meaningfully different input and screen characteristics:

| | ClearTouch board (kiosk) | Laptop (desktop) |
|---|---|---|
| Screen | 4K 65"+ at distance | 1080p/1440p up close |
| Input | Touch-first, finger-sized | Mouse + keyboard |
| Users | Team standing around it | One person seated |

**Architecture:**
- `AppSettings.displayMode: 'auto' | 'kiosk' | 'desktop'` — persisted in settings.json
- `src/utils/displayMode.ts` exports `resolveDisplayMode(setting)` → `'kiosk' | 'desktop'`
  - `'auto'` auto-detects: ClearTouch when `navigator.maxTouchPoints > 0` AND `window.screen.width >= 1920`
- `App.tsx` applies `data-mode="kiosk"` or `data-mode="desktop"` on the root `<div>`
- `src/index.css` defines `@variant kiosk { [data-mode="kiosk"] & {} }` for Tailwind
- All components use `kiosk:` Tailwind prefix for ClearTouch-specific sizing

**Rules for all interactive elements (Phase 4+):**
- Use `kiosk:py-3 kiosk:text-base` on buttons and inputs (desktop: `py-1.5 text-sm`)
- Use `kiosk:py-2 kiosk:text-sm` on small toggle/chip-style controls (desktop: `py-0.5 text-xs`)
- Minimum effective touch target in kiosk mode: 48px height or width

**Phase 3 components already retrofitted:**
- `TopBar`: h-12 → `kiosk:h-16`, all buttons have `kiosk:py-3 kiosk:text-base`
- `GanttView`: dhtmlxGantt `scale_height` 50 → 70 in kiosk; toolbar buttons have kiosk variants
- `TaskEditor`: panel `w-80` → `kiosk:w-[420px]`; all inputs/buttons have kiosk variants

**Phase 6 (Settings) must add:**
- "Display Mode" dropdown: Auto-detect / ClearTouch Board / Laptop
- Calls `updateSettings({ displayMode: value })`

**Note:** Changing displayMode while GanttView is mounted does not rescale dhtmlxGantt's row
heights (those are set once at init). The new size takes effect on next app launch. This is
acceptable — display mode is an at-startup configuration, not a live preference.

### Source of truth for task/dependency state
- `projectStore.tasks[]` and `projectStore.dependencies[]` are **always** the source of truth
- dhtmlxGantt's internal state is a derived view — always write to the store, then let the reload effect push to gantt
- The `suppressReload` ref in `GanttView` breaks the feedback loop when gantt events trigger store updates
- Never read back from `gantt.getTask()` except in gantt event handlers that need to translate gantt state to store updates
- When in doubt: store → gantt (never gantt → store except via event handlers)

### Task hierarchy — flexible depth
Tasks form an unlimited-depth tree via `parentId`. There is no fixed number of nesting levels.
- Any non-milestone task can have children added to it at any time
- A task with children is rendered as a dhtmlxGantt summary bar regardless of its stored `taskType`
  — the rendering is determined by whether the task appears as a `parentId` anywhere in the list
- `taskType` (`subsystem | assembly | task | milestone`) remains a **semantic hint** the user
  can set manually in TaskEditor; it is NOT the source of rendering truth
- `buildSubsystemLookup` maps every task to its **root ancestor** (the task with no `parentId`
  in its branch) — used by DailyView to group leaf tasks under their top-level project group

### Completion rollup
Parent task `completionPercent` is always calculated from children — it cannot be set directly
once a task has children.
- Formula: `parent% = Math.round(average of direct children's completionPercent)`
- Propagates all the way up to the root on every change
- Triggered in `projectStore` whenever `updateTask` changes `completionPercent`, when `addTask`
  adds a child (new 0% leaf lowers parent average), and when `deleteTask` removes a child
- DailyView shows **only leaf tasks** (tasks with no children) — the actual work items
- `recalculateCompletion()` and `propagateCompletionUp()` helpers in `projectStore.ts`

---

## Phase 1: Foundation (Data Layer + Rust Wiring) ✅ COMPLETE

**Goal: The app can open, create, save, and load a project file.**

### 1.1 Wire Rust Commands into lib.rs ✅
- `mod commands;` added to `src-tauri/src/lib.rs`
- All 9 commands registered in `.invoke_handler()`
- `tauri_plugin_dialog::init()` and `tauri_plugin_fs::init()` registered
- `dialog:default` and `fs:default` added to `src-tauri/capabilities/default.json`
- Plugin dependencies were already present in `Cargo.toml`

### 1.2 Zustand Stores ✅

**`src/stores/settingsStore.ts`** — complete
**`src/stores/teamStore.ts`** — complete
**`src/stores/projectStore.ts`** — complete

### 1.3 App Initialization ✅
- `src/App.tsx` calls `loadSettings()` + `loadTeamDb()` on mount
- Shows loading screen until both resolve

**Verified:** `tsc --noEmit` clean, `cargo check` clean (exit 0).

---

## Phase 2: App Shell & Navigation ✅ COMPLETE

**Goal: The app has a real layout, a top bar, and can create/open/save projects.**

### 2.1 Layout + View Routing (`src/App.tsx`) ✅
- TopBar + main content area, state-based view routing
- Keyboard shortcuts: Ctrl+N (new), Ctrl+O (open), Ctrl+S (save)
- Loading screen until settings + team db resolve
- Applies `defaultView` from settings once loaded

### 2.2 TopBar (`src/components/TopBar/index.tsx`) ✅
- Left: File dropdown menu (New/Open/Save/Save As) + project name + unsaved dot
- Center: Gantt | Daily | Team | Settings switcher
- Right: Unsaved/Saved indicator + competition countdown (color-coded: red ≤5 days, amber ≤10)

### 2.3 NewProjectDialog (`src/components/NewProjectDialog/index.tsx`) ✅
- All required fields with validation
- Schedule periods pre-populated from settings template, day toggles, time pickers
- Schedule exceptions (cancelled/added/modified) with date + reason
- Calls `projectStore.newProject()` on submit

### 2.4 Placeholder views ✅
- GanttView, DailyView, TeamPanel, Settings — minimal placeholders ready for Phase 3+

**Verified:** `tsc --noEmit` clean.

---

## Phase 3: Gantt View ✅ COMPLETE

**Goal: A working Gantt chart showing the project with real tasks, colors, and dependencies.**
This is the most important phase — it's the primary display on the ClearTouch board.

### 3.1 dhtmlxGantt Initialization ✅
- `import { gantt } from 'dhtmlx-gantt'` (named export, typed as GanttStatic)
- Initialized in a single `useEffect` (runs once on mount) with empty div ref
- Configured: `date_format`, `duration_unit`, `work_time`, `fit_tasks`, `drag_links`, `show_today_marker`
- Work time set via `setupWorkTime(project)` — iterates meeting days in range, calls `gantt.setWorkTime()`
- `gantt.parse({ data: [], links: [] })` on init
- **Known deviation from original plan:** unmount uses `gantt.clearAll()` (not `gantt.destructor()`)
  because `destructor()` destroys the zoom extension singleton and breaks React StrictMode's remount cycle.
  This is intentional — the gantt singleton survives view unmounts by design.

### 3.2 Feed Project Data into Gantt ✅
- Data reload `useEffect` watches `projectFile` — calls `gantt.clearAll()` then `gantt.parse()`
- `suppressReload` ref prevents infinite loops when gantt fires store updates
- `projectToGanttData()` now resolves subsystem colors via `resolveTaskColor()`

### 3.3 Gantt Columns ✅
- `buildColumns(visibleColumns, getMembers)` builds column array based on settings
- Title (always), Assignee, Status (colored badge), Priority, Start Date, Est. Days, %, End Date
- Columns effect reconfigures on settings change

### 3.4 dhtmlxGantt Event Handlers ✅
- `onAfterTaskUpdate` → `ganttToTask()` → `updateTask()`
- `onAfterLinkAdd` → `ganttToDependency()` → `addDependency()`
  - Lag conversion uses predecessor's `plannedEndDate` as anchor (not today)
- `onAfterLinkDelete` → `deleteDependency()`
- `onBeforeTaskDelete` → returns false (deletion via TaskEditor only)
- `onBeforeTaskAdd` → returns false (addition via our UI only)
- `onTaskClick` → `setSelectedTaskId(id)`

### 3.5 Zoom Controls ✅
- Day / Week / Month toolbar buttons, persisted to `settingsStore.gantt.defaultZoom`
- Uses `gantt.ext.zoom.init({ levels })` + `gantt.ext.zoom.setLevel()`

### 3.6 Critical Path Toggle ✅
- Toolbar button, persisted to `settingsStore.gantt.showCriticalPath`
- `gantt.config.highlight_critical_path` toggled + `gantt.render()`
- Note: `show_today_marker` is applied once on init; does not react to live settings changes (deferred to Phase 8 polish)

### 3.7 TaskEditor Panel ✅
- Slide-in panel (w-80) from the right, inside flex layout (gantt shrinks to accommodate)
- All fields: title, description, type, color picker (subsystem only), start date, estimated days
  (auto-shows planned end date), hard deadline, status, priority, completion %, required subteams,
  required skills, assigned members (filtered by subteam), notes
- Save → `updateTask(id, changes)` + close; Delete with inline confirmation; Cancel

### 3.8 Add Task Controls ✅
- "Add Subsystem" button → `createTask({ taskType:'subsystem', ... })` → `addTask()`, auto-selects for editing
- `onBeforeTaskAdd` returns false — inline gantt creation blocked; add subtask via TaskEditor (change parentId)

**Verified:** `tsc --noEmit` clean (exit 0).

---

## Phase 4: Daily View ✅ COMPLETE
**Goal: A useful daily summary screen showing what's happening today and allowing attendance tracking.**

### Pre-Phase 4 Requirements
Before building Phase 4 components, add these two cross-cutting concerns that would be costly to retrofit:

**4.0a Error feedback pipeline** ✅
- `src/stores/toastStore.ts` — Zustand store with `addToast(message, type)` / `dismissToast(id)`
  - Types: `'error'` (6s auto-dismiss), `'warning'` (5s), `'success'` (3s); max 5 toasts
  - Accessible from non-React store code via `useToastStore.getState().addToast(...)`
- `src/components/ToastContainer/index.tsx` — fixed top-right overlay, kiosk-aware sizing
- All file I/O catch blocks wired:
  - `projectStore`: `openProject` (error), `saveProject` (error), `saveProjectAs` (error)
  - `settingsStore`: `loadSettings` (warning), `saveSettings` (warning)
  - `teamStore`: `loadTeamDb` (warning), `saveTeamDb` (warning)
- Startup load failures (settings/team) show a warning but still let the app proceed with defaults

**4.0b Touch target baseline** ✅
- All interactive elements in Phase 4+ must meet a 48px minimum touch target in kiosk mode
- Use the `kiosk:` Tailwind variant — see the "Display mode" section in Cross-Cutting Architectural Notes
- Pattern: `py-1.5 kiosk:py-3 text-sm kiosk:text-base` for standard buttons and inputs
- This infrastructure is already in place (App.tsx sets `data-mode`, index.css defines the variant)
- Phase 3 components (TopBar, GanttView toolbar, TaskEditor) are already retrofitted

### 4.1 DailyView Component (`src/components/DailyView/index.tsx`) ✅
Layout:
```
┌──────────────────────────────────────────────────────┐
│  ← Jan 6   Wednesday, January 7, 2026   Jan 8 →      │
│  Build Day 3 of 28  |  14 meeting days to deadline    │
├──────────────────────┬───────────────────────────────┤
│  Today's Tasks       │  Attendance                   │
│  (by subsystem)      │                               │
│                      │  Mechanical (4/6)             │
│  🔴 Drivetrain       │  ✅ Alex    ✅ Jordan          │
│    ○ Machine plates  │  ✅ Sam     ❌ Riley           │
│    ○ Weld frame      │  ✅ Morgan  ⏰ Casey (late)   │
│                      │                               │
│  🔵 Electrical       │  Electrical (3/3)             │
│    ○ Wire motors     │  ...                          │
│                      │                               │
├──────────────────────┴───────────────────────────────┤
│  📋 Project Notes  [Mechanical Notes]  [Electrical]   │
└──────────────────────────────────────────────────────┘
```

### 4.2 Date Navigation ✅
- Previous/next day buttons
- Only navigate to meeting days (skip non-meeting days)
- "Today" shortcut button
- Show meeting day counter ("Build Day 3 of 28")

### 4.3 Today's Tasks Panel ✅
- Filter `projectStore.tasks` to tasks whose date range includes the selected date
- Group by subsystem (use subsystemLookup)
- Show completion checkbox — clicking updates `completionPercent` (0 → 100 toggle) and status
- Show assigned members next to each task
- Highlight blocked tasks in red

### 4.4 Attendance Panel ✅
- If no WorkSession exists for the selected date: show "Start Session" button
  - Creates WorkSession via `projectStore.addWorkSession()`
  - Pre-populates attendance list from all active TeamMembers
- If WorkSession exists: show attendance list
- Each member row: name, subteam badge, attendance status buttons (Present / Late / Absent / Excused / Partial)
- Late/Partial: time input fields appear for arrival/departure time
- Notes field per member

### 4.5 Daily Notes ✅
- Project-level note editor (markdown textarea)
- One tab/section per active subteam
- Auto-creates DailyNote record on first edit
- Save on blur

**Phase 4 complete when:** You can navigate to any meeting day, mark attendance, check off tasks, and write notes. Non-meeting days are skipped.

---

## Pre-Phase 5: Flexible Hierarchy + Completion Rollup ✅ COMPLETE

These cross-cutting improvements were added before Phase 5 because retrofitting them later
would require touching every feature that creates or updates tasks.

### Flexible task hierarchy ✅
- Any non-milestone task can gain children at any time — there is no fixed depth limit
- `GanttView`: `canHaveChildren(taskType)` replaces the old `PARENT_TYPES` array;
  the "+ Add Task" toolbar button and TaskEditor's "Add Task inside" button are enabled
  for any selected non-milestone task
- `ganttAdapter.ts` → `taskToGantt(task, project, hasChildren)`: if `hasChildren` is true,
  the task is forced to dhtmlxGantt `type: 'project'` (summary bar) regardless of stored
  `taskType`; `projectToGanttData` computes the `parentIds` Set and passes it per task
- `buildSubsystemLookup` rewritten to map every task to its **root ancestor** (walk the full
  `parentId` chain); previously stopped at the nearest `subsystem`-typed ancestor, which
  broke grouping for hierarchies deeper than 2 levels

### Completion rollup ✅
- `projectStore.ts`: `recalculateCompletion(parentId, tasks)` — averages direct children's
  `completionPercent` and propagates recursively up the full ancestor chain
- `propagateCompletionUp(changedId, tasks)` — entry point used by `updateTask` / `addTask`
- `deleteTask` — captures parent ID before deletion, then calls `recalculateCompletion` after
  filtering to keep the parent's average correct
- DailyView `activeTasks` filter changed to **leaf tasks only** (tasks with no children);
  parent/container tasks are excluded because their completion is derived, not directly worked

---

## Phase 5: Team Management
**Goal: Full CRUD for team members, subteams, and skills.**

### 5.1 TeamPanel Layout (`src/components/TeamPanel/index.tsx`)
Three tabs: Members | Subteams | Skills

### 5.2 Members Tab
- List of all active members (table: name, grade, subteams, skills, join date)
- Filter: active / alumni / all
- Search by name
- "Add Member" button → MemberForm
- Click row → MemberForm (edit mode)
- Archive button (sets isActive: false — never delete)

### 5.3 MemberForm (`src/components/TeamPanel/MemberForm.tsx`)
Fields: firstName, lastName, isMentor toggle, grade (if not mentor), joinDate, subteamIds (checkboxes), skillIds (checkboxes), notes

### 5.4 Subteams Tab
- List of subteams (name, color swatch, member count)
- Add/edit/delete subteams
- Color picker for subteam color

### 5.5 Skills Tab
- List of skills (name, associated subteam, description)
- Add/edit/delete skills

**Phase 5 complete when:** You can add all team members, assign them to subteams and skills, and those members appear in the TaskEditor assignment dropdowns.

---

## Phase 6: Settings Screen
**Goal: Configurable app behavior, usable schedule templates.**

### 6.1 Settings Component (`src/components/Settings/index.tsx`)
Sections:

**Gantt Display**
- Default zoom (day/week/month)
- Visible columns (checkboxes)
- Show critical path by default (toggle)
- Show completed tasks (toggle)
- Highlight today (toggle)

**Schedule Templates**
- List of SchedulePeriodTemplates from settingsStore
- Add/edit/delete templates
- These pre-populate new project creation

**Subsystem Color Palette**
- Grid of color swatches
- Click to change any color
- "Reset to defaults" button

**App**
- Default view on open (Gantt / Daily)
- Recent projects list (with "clear recents" button)

---

## Phase 7: Reports
**Goal: Printable/exportable reports for daily use and season review.**

All reports are generated as HTML in a new Tauri window and printed via `window.print()`.
CSS `@media print` handles formatting. Export as PDF via browser print dialog.

**MVP scope (must ship in Phase 7):** Reports 7.1 and 7.2 only.
**Post-MVP (implement after core app is stable):** Reports 7.3–7.5. These are useful but not needed for daily build-season operation.

### 7.1 Report: Daily Summary ← MVP
For a selected date:
- Date, build day number, days remaining
- Attendance summary (present/total per subteam)
- Tasks worked on (by subsystem)
- Completed tasks
- Blocked tasks and their blockers
- Project notes + subteam notes for the day

### 7.2 Report: Daily To-Do List ← MVP
For a selected date:
- Tasks active on that date, grouped by subteam
- Each task: title, assigned members, completion %, status
- Empty checkbox column for printed use
- Formatted for printing on a single page if possible

### 7.3 Report: Attendance Report ← Post-MVP
Date range selector:
- Overall attendance rate per member
- Sessions attended / total sessions
- Late/excused breakdown
- Sorted by attendance rate (descending)

### 7.4 Report: Progress Metrics ← Post-MVP
- Overall project completion %
- Completion % per subsystem
- Tasks by status (not started / in progress / completed / blocked / deferred)
- Critical path status
- Days remaining (meeting days to hard deadline)
- Tasks behind schedule (planned end date < today, not completed)
- Velocity: tasks completed per meeting day (rolling)

### 7.5 Report: Project Summary ← Post-MVP
Full season overview:
- Project info (name, team, season, dates)
- All subsystems with task tree and status
- Team roster (members, subteams, skills)
- Overall timeline (compressed Gantt or milestone list)
- Attendance statistics
- Completion timeline (tasks completed by date)

---

## Phase 8: Polish & Deployment
**Goal: Production-ready app installable on the ClearTouch board.**

### 8.1 Kiosk / Fullscreen Mode
- F11 or button in top bar toggles fullscreen via Tauri window API:
  ```typescript
  import { getCurrentWindow } from '@tauri-apps/api/window';
  await getCurrentWindow().setFullscreen(true);
  ```
- App should look great at 1080p and 4K (ClearTouch board resolution)
- Touch targets minimum 48px for finger use on the board

### 8.2 Auto-save
State machine (implement exactly this — don't simplify):
- **Idle:** not dirty, no pending auto-save
- **Dirty:** `isDirty = true`; starts 30-second countdown on each edit (debounced, not a fixed interval)
- **Saving:** write in flight; suppress further auto-saves until resolved
- **Saved:** write succeeded; show "Auto-saved at 3:42 PM" in top bar; transitions back to Idle
- **Error:** write failed; show "Auto-save failed" warning; stays dirty so manual save can retry
- Manual Save/Save As always interrupts and resets the state machine
- Close/open/new while Dirty triggers the unsaved-changes guard (8.3) before proceeding

### 8.3 Unsaved Changes Guard
- If `isDirty` and user tries to open/new project or close the app:
  - Show confirmation dialog: "You have unsaved changes. Save before continuing?"
  - Wire to Tauri's `onCloseRequested` window event

### 8.4 Export: Gantt Chart to PDF
⚠️ **Spike required before implementing.** Verify which approach is viable:
- `gantt.exportToPDF()` in dhtmlxGantt Standard edition calls an **online export service** (dhtmlx.com).
  This will not work in an offline school environment.
- Fallback approach: capture the gantt `div` with `html2canvas`, convert to PDF via `jsPDF`, then
  write the PDF bytes via the Rust `write_project_file` command.
- Both libraries (`html2canvas`, `jsPDF`) are client-side and do not require network access.
- Recommended: use the html2canvas + jsPDF path and skip `gantt.exportToPDF()` entirely.
- Add "Export Gantt" button that:
  - Captures the gantt div with html2canvas
  - Converts to PDF with jsPDF
  - Triggers `show_export_dialog` for save path
  - Writes PDF bytes via Rust `write_project_file` command

### 8.5 Production Build
```bash
npm run tauri build
```
Output: `src-tauri/target/release/bundle/msi/frc-gantt_x.x.x_x64-setup.msi`
Install this on the ClearTouch board PC.

### 8.6 Data Backup Utility (optional but recommended)
Simple "Backup" button in settings that copies `team.json` and `settings.json`
to a user-chosen folder. Belt-and-suspenders for a school environment.

---

## Feature Backlog (Post-MVP — Do Not Start Early)

These are documented here so they don't get added during phases 1–8:

- Velocity tracking (task completion rate over time)
- Season template system (save project as template for next year)
- Photo/media attachments on tasks
- QR code attendance check-in
- Mentor vs. student role distinction
- Budget tracking per subsystem
- Competition readiness checklist
- Dark mode
- Multi-project view / season comparison

---

## File Locations Reference

```
src/
  types/index.ts                ✅ Complete
  utils/scheduleUtils.ts        ✅ Complete (+ prevMeetingDay added for Phase 4)
  utils/timeUtils.ts            ✅ Complete
  utils/ganttAdapter.ts         ✅ Complete (+ dynamic parent rendering + root-ancestor lookup, pre-Phase 5)
  utils/displayMode.ts          ✅ Pre-Phase 4
  stores/
    projectStore.ts             ✅ Phase 1 + pre-Phase 4 (toasts) + pre-Phase 5 (rollup)
    teamStore.ts                ✅ Phase 1 + pre-Phase 4 (toast wiring)
    settingsStore.ts            ✅ Phase 1 + pre-Phase 4 (toast wiring)
    toastStore.ts               ✅ Pre-Phase 4
  components/
    TopBar/index.tsx            ✅ Phase 2 + kiosk variants
    NewProjectDialog/index.tsx  ✅ Phase 2
    GanttView/index.tsx         ✅ Phase 3 + kiosk variants + pre-Phase 5 (any task can have children)
    TaskEditor/index.tsx        ✅ Phase 3 + kiosk variants
    ToastContainer/index.tsx    ✅ Pre-Phase 4
    DailyView/index.tsx         ✅ Phase 4 + pre-Phase 5 (leaf-only task filter)
    TeamPanel/index.tsx         🔲 Phase 5
    TeamPanel/MemberForm.tsx    🔲 Phase 5
    Settings/index.tsx          🔲 Phase 6
    Reports/index.tsx           🔲 Phase 7
  App.tsx                       ✅ Phase 2 + display mode + toast mount
src-tauri/
  src/
    commands.rs                 ✅ Complete
    lib.rs                      ✅ Phase 1 (commands wired)
```