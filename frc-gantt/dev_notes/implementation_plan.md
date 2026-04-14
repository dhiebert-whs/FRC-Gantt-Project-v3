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
- ✅ `src/utils/scheduleUtils.ts` — meeting day calendar math
- ✅ `src/utils/timeUtils.ts` — time/date formatting (24hr store → 12hr display)
- ✅ `src/utils/ganttAdapter.ts` — dhtmlxGantt adapter + subsystem lookup
- ✅ `src-tauri/src/commands.rs` — Rust file I/O commands
- ✅ `vite.config.ts` — Tailwind v4 plugin registered
- ✅ `src/index.css` — Tailwind + dhtmlxGantt CSS imports

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

## Phase 3: Gantt View
**Goal: A working Gantt chart showing the project with real tasks, colors, and dependencies.**
This is the most important phase — it's the primary display on the ClearTouch board.

### 3.1 dhtmlxGantt Initialization (`src/components/GanttView/index.tsx`)
- Initialize `gantt` in a `useEffect` with empty div ref
- Configure `gantt.config`:
  - `date_format: "%Y-%m-%d %H:%i"`
  - `xml_date: "%Y-%m-%d %H:%i"`
  - `duration_unit: "day"`
  - `work_time: true`
  - `skip_off_time: true`
  - `fit_tasks: true`
  - `drag_links: true`
  - `drag_progress: true`
- Set up work time from project schedule: call `gantt.setWorkTime()` for each meeting day pattern and exception
- `gantt.parse({ data: [], links: [] })` on init with empty data
- Destroy gantt on component unmount

### 3.2 Feed Project Data into Gantt
- When `projectStore.tasks` or `projectStore.dependencies` change:
  - Call `projectToGanttData(tasks, dependencies, project)` from `ganttAdapter.ts`
  - Call `gantt.clearAll()` then `gantt.parse(ganttData)`
- Apply subsystem colors via `gantt.templates.task_class` and `gantt.templates.bar_class`

### 3.3 Gantt Columns (Left-side grid)
Configure `gantt.config.columns` based on `settingsStore.gantt.visibleColumns`:
- Title column (always visible, editable inline)
- Assignee column (shows assigned member names, read-only in grid)
- Status column (colored badge)
- Priority column
- Start date column
- Estimated days column
- Completion % column

### 3.4 dhtmlxGantt Event Handlers
Wire these gantt events back to the store:
- `gantt.attachEvent("onAfterTaskUpdate", ...)` → `ganttToTask()` → `projectStore.updateTask()`
- `gantt.attachEvent("onAfterLinkAdd", ...)` → `ganttToDependency()` → `projectStore.addDependency()`
- `gantt.attachEvent("onAfterLinkDelete", ...)` → `projectStore.deleteDependency()`
- `gantt.attachEvent("onAfterTaskAdd", ...)` → sync new task back to store
- `gantt.attachEvent("onAfterTaskDelete", ...)` → `projectStore.deleteTask()`
- `gantt.attachEvent("onTaskClick", ...)` → open TaskEditor panel

### 3.5 Zoom Controls
Toolbar buttons for Day / Week / Month zoom:
```typescript
gantt.ext.zoom.setLevel('week'); // or 'day' | 'month'
```
Save selected zoom to `settingsStore.gantt.defaultZoom`

### 3.6 Critical Path Toggle
Button in top bar or gantt toolbar:
```typescript
gantt.config.highlight_critical_path = true; // toggle
gantt.render();
```

### 3.7 TaskEditor Panel (`src/components/TaskEditor/index.tsx`)
Slides in from the right when a task is clicked. Fields:
- Title, description
- Task type (subsystem / assembly / task / milestone)
- Subsystem color picker (only for taskType = 'subsystem')
- Start date, planned end date, hard deadline
- Estimated days (auto-calculates end date from start + meeting days)
- Status dropdown, priority dropdown, completion % slider
- Required subteams (multi-select from teamStore)
- Required skills (multi-select from teamStore)
- Assigned members (multi-select from teamStore, filtered by required subteams/skills)
- Notes (textarea)
- Delete button (with confirmation)

On save: `projectStore.updateTask(id, changes)`

### 3.8 Add Task Controls
- "Add Subsystem" button → creates taskType: 'subsystem' at root level
- Right-click on any task → context menu → "Add subtask"
- Tab key in inline title editor → create sibling task

**Phase 3 complete when:** You can see the Gantt chart with color-coded subsystems, drag tasks to reschedule them, draw dependency arrows, click a task to edit it, and the chart respects the meeting schedule (non-meeting days are greyed/skipped).

---

## Phase 4: Daily View
**Goal: A useful daily summary screen showing what's happening today and allowing attendance tracking.**

### 4.1 DailyView Component (`src/components/DailyView/index.tsx`)
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

### 4.2 Date Navigation
- Previous/next day buttons
- Only navigate to meeting days (skip non-meeting days)
- "Today" shortcut button
- Show meeting day counter ("Build Day 3 of 28")

### 4.3 Today's Tasks Panel
- Filter `projectStore.tasks` to tasks whose date range includes the selected date
- Group by subsystem (use subsystemLookup)
- Show completion checkbox — clicking updates `completionPercent` (0 → 100 toggle) and status
- Show assigned members next to each task
- Highlight blocked tasks in red

### 4.4 Attendance Panel
- If no WorkSession exists for the selected date: show "Start Session" button
  - Creates WorkSession via `projectStore.addWorkSession()`
  - Pre-populates attendance list from all active TeamMembers
- If WorkSession exists: show attendance list
- Each member row: name, subteam badge, attendance status buttons (Present / Late / Absent / Excused / Partial)
- Late/Partial: time input fields appear for arrival/departure time
- Notes field per member

### 4.5 Daily Notes
- Project-level note editor (markdown textarea)
- One tab/section per active subteam
- Auto-creates DailyNote record on first edit
- Save on blur

**Phase 4 complete when:** You can navigate to any meeting day, mark attendance, check off tasks, and write notes. Non-meeting days are skipped.

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

### 7.1 Report: Daily Summary
For a selected date:
- Date, build day number, days remaining
- Attendance summary (present/total per subteam)
- Tasks worked on (by subsystem)
- Completed tasks
- Blocked tasks and their blockers
- Project notes + subteam notes for the day

### 7.2 Report: Daily To-Do List
For a selected date:
- Tasks active on that date, grouped by subteam
- Each task: title, assigned members, completion %, status
- Empty checkbox column for printed use
- Formatted for printing on a single page if possible

### 7.3 Report: Attendance Report
Date range selector:
- Overall attendance rate per member
- Sessions attended / total sessions
- Late/excused breakdown
- Sorted by attendance rate (descending)

### 7.4 Report: Progress Metrics
- Overall project completion %
- Completion % per subsystem
- Tasks by status (not started / in progress / completed / blocked / deferred)
- Critical path status
- Days remaining (meeting days to hard deadline)
- Tasks behind schedule (planned end date < today, not completed)
- Velocity: tasks completed per meeting day (rolling)

### 7.5 Report: Project Summary
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
- Set up a 30-second auto-save interval when `isDirty = true` and `currentFilePath` exists
- Show "Auto-saved at 3:42 PM" indicator in top bar

### 8.3 Unsaved Changes Guard
- If `isDirty` and user tries to open/new project or close the app:
  - Show confirmation dialog: "You have unsaved changes. Save before continuing?"
  - Wire to Tauri's `onCloseRequested` window event

### 8.4 Export: Gantt Chart to PDF
- dhtmlxGantt Standard has built-in export via `html2canvas` + `jsPDF`
- Add "Export Gantt" button that:
  - Calls `gantt.exportToPDF()` or captures the gantt div with html2canvas
  - Triggers `show_export_dialog` for save path
  - Writes PDF via Rust `write_project_file` command (reuse the write command)

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
  utils/scheduleUtils.ts        ✅ Complete
  utils/timeUtils.ts            ✅ Complete
  utils/ganttAdapter.ts         ✅ Complete
  stores/
    projectStore.ts             ✅ Phase 1
    teamStore.ts                ✅ Phase 1
    settingsStore.ts            ✅ Phase 1
  components/
    TopBar/index.tsx            ✅ Phase 2
    NewProjectDialog/index.tsx  ✅ Phase 2
    GanttView/index.tsx         🔲 Phase 3
    TaskEditor/index.tsx        🔲 Phase 3
    DailyView/index.tsx         🔲 Phase 4
    TeamPanel/index.tsx         🔲 Phase 5
    TeamPanel/MemberForm.tsx    🔲 Phase 5
    Settings/index.tsx          🔲 Phase 6
    Reports/index.tsx           🔲 Phase 7
  App.tsx                       ✅ Phase 2
src-tauri/
  src/
    commands.rs                 ✅ Complete
    lib.rs                      ✅ Phase 1 (commands wired)
```