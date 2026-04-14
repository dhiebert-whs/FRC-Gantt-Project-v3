# CLAUDE.md — FRC Gantt App

## Project Overview

A standalone desktop application for FRC (FIRST Robotics Competition) teams to manage the 6-week build season. Displays an interactive Gantt chart on a ClearTouch interactive display board, tracks task dependencies, manages team member assignments, and records daily attendance.

**This is a Tauri desktop app, not a web application.** It runs on a single PC (the ClearTouch board). There is no server, no network, no authentication, no multi-user sync.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 (Rust backend) |
| Frontend | React 18 + TypeScript |
| Build | Vite + @tailwindcss/vite |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Gantt chart | dhtmlxGantt Standard (educational license) |
| Date math | date-fns |
| IDs | nanoid |
| File I/O | Rust commands via Tauri invoke |

## Repository Structure

```
frc-gantt/
├── src/                          # React frontend (TypeScript)
│   ├── types/
│   │   └── index.ts              # ALL type definitions — source of truth
│   ├── utils/
│   │   ├── scheduleUtils.ts      # Meeting day calendar math
│   │   ├── timeUtils.ts          # Time/date display formatting
│   │   └── ganttAdapter.ts       # Task ↔ GanttTask transforms + subsystem lookup
│   ├── stores/
│   │   ├── projectStore.ts       # Current project state (Zustand)
│   │   ├── teamStore.ts          # Team database state (Zustand)
│   │   └── settingsStore.ts      # App settings state (Zustand)
│   ├── components/
│   │   ├── TopBar/               # File menu, view switcher, save state
│   │   ├── NewProjectDialog/     # New project creation wizard
│   │   ├── GanttView/            # Main Gantt chart display
│   │   ├── TaskEditor/           # Task create/edit slide-in panel
│   │   ├── DailyView/            # Daily task + attendance view
│   │   ├── TeamPanel/            # Team member management
│   │   └── Settings/             # App preferences
│   ├── App.tsx                   # Root layout and view routing
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind + dhtmlxGantt CSS imports
├── src-tauri/
│   ├── src/
│   │   ├── main.rs               # Tauri app entry — registers commands + plugins
│   │   └── commands.rs           # All Rust file I/O commands
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   ├── data-model.md             # Full data model design documentation
│   └── implementation-plan.md   # Phase-by-phase build plan
├── package.json
└── vite.config.ts
```

## Data Storage

Three files, all on the local filesystem:

| File | Location | Contents |
|------|----------|----------|
| `team.json` | `%APPDATA%/FRCGantt/` | Team members, subteams, skills — persists across seasons |
| `settings.json` | `%APPDATA%/FRCGantt/` | App preferences, recent projects, defaults |
| `*.frcgantt` | User-chosen | Project file — tasks, schedule, sessions, notes |

## Common Commands

```bash
# Development
npm run tauri dev          # Start dev server + Tauri window (first run ~60s Rust compile)
npm run dev                # Vite only (no Tauri window — limited use)

# Production
npm run tauri build        # Build .msi installer for Windows
```

## Critical Architecture Rules

### 1. Never store data in dhtmlxGantt's format
dhtmlxGantt uses `GanttTask` and `GanttLink` objects internally. These are **not** stored
anywhere in the app state or files. Always:
- Keep `Task[]` and `TaskDependency[]` as the source of truth (in the Zustand store)
- Transform to GanttTask/GanttLink via `ganttAdapter.ts` before calling `gantt.parse()`
- Transform back from GanttTask to Task in event handlers (onAfterTaskUpdate, etc.)

### 2. Duration is always in meeting days, never calendar days
`Task.estimatedDays` is **meeting days** — days the team actually works.
dhtmlxGantt's `duration` property is **calendar days**.
The conversion functions in `scheduleUtils.ts` handle this:
- `meetingDaysToCalendarDays()` — before passing to gantt
- `calendarDaysToMeetingDays()` — after receiving from gantt events

### 3. subsystemId is never stored in files
The relationship between a task and its ancestor subsystem is computed at load time
via `buildSubsystemLookup()` in `ganttAdapter.ts`. The result is cached in
`projectStore.subsystemLookup` (a `Map<string, string>`).
Rebuild this map whenever tasks are added, deleted, or moved.

### 4. All times stored 24hr, displayed 12hr
Storage: `"15:30"` (HH:MM string)
Display: `"3:30 PM"` — always use `formatTime()` from `timeUtils.ts`
Never store AM/PM format.

### 5. All dates stored as ISO date strings
Format: `"2026-01-07"` — never a Date object, never a timestamp.
Use `date-fns` functions for all date math.
Use `parseISO()` when you need a Date object temporarily.

### 6. IDs are nanoid strings
Use `nanoid()` for all new entity IDs. Never use integers or sequential numbers.

## Key Type Definitions

All types are in `src/types/index.ts`. Key ones:

```typescript
// The four task types — determines Gantt rendering
type TaskType = 'subsystem' | 'assembly' | 'task' | 'milestone';

// Duration in meeting days (not calendar days)
interface Task {
  estimatedDays: number;  // MEETING DAYS
  // ...
}

// The two gantt adapter types (library-specific, never stored)
interface GanttTask { ... }  // dhtmlxGantt's format
interface GanttLink { ... }  // dhtmlxGantt's format

// Dependency type maps directly to dhtmlxGantt link types
const DEP_TYPE_TO_GANTT = { FS: '0', SS: '1', FF: '2', SF: '3' };
```

## Schedule System

The `Project` contains `schedulePeriods[]` and `scheduleExceptions[]`.
A `SchedulePeriod` defines which days of the week count as meeting days during a date range.
A `ScheduleException` overrides a specific date (cancelled, added, or modified session).

Always use the functions in `scheduleUtils.ts` for any date/duration calculation:
- `isMeetingDay(date, project)` — is this a work day?
- `addMeetingDays(start, n, project)` — what date is N meeting days after start?
- `countMeetingDays(start, end, project)` — how many meeting days in a range?
- `getMeetingDaysInRange(start, end, project)` — list all meeting days in a range

## Zustand Store Patterns

Stores are in `src/stores/`. Each store uses Zustand with the `create` function.
All async operations (file I/O via Tauri invoke) live in store actions, not components.

```typescript
// Invoking Rust commands from TypeScript
import { invoke } from '@tauri-apps/api/core';
const json = await invoke<string>('read_project_file', { path: filePath });
```

## dhtmlxGantt Configuration Notes

- Use `gantt.config.work_time = true` and `gantt.setWorkTime()` to grey out non-meeting days
- Task type in dhtmlxGantt: `'project'` = subsystem/assembly summary bars; `'task'` = work items; `'milestone'` = diamonds
- Custom columns use `gantt.config.columns` array
- Templates (`gantt.templates.task_class`, `gantt.templates.bar_class`) apply subsystem colors
- Always call `gantt.render()` after config changes; `gantt.clearAll()` + `gantt.parse()` to reload data
- Destroy with `gantt.destructor()` on component unmount

## Build Order Rule

**Do not start a phase until the previous phase is working.**
The full implementation plan is at `dev_notes/implementation_plan.md` (absolute path: `D:\FRC Gantt Project v3\frc-gantt\dev_notes\implementation_plan.md`).
Current status is tracked in that file.

The phases are:
1. Foundation (data layer, Rust wiring, Zustand stores)
2. App shell (layout, navigation, new/open/save)
3. Gantt view (chart, task editor, dependencies)
4. Daily view (attendance, today's tasks, notes)
5. Team management (member CRUD)
6. Settings screen
7. Reports
8. Polish & deployment

## What NOT to Add

The following features are intentionally excluded from this version.
Do not implement them unless explicitly instructed:

- User authentication or login
- Network features, sync, or cloud storage
- Real-time collaboration (WebSocket, etc.)
- Competition match tracking or scouting
- Blue Alliance / FIRST API integration
- Budget tracking
- GitHub integration
- Messaging or chat
- Mentorship tracking programs
- Video tutorials

If a requested feature isn't in the implementation plan, ask before building it.