# FRC Gantt

A standalone desktop app for FIRST Robotics Competition teams to plan and track the build season. Runs on a PC-driven interactive display board (ClearTouch), showing the full project as an interactive Gantt chart with task dependencies, team assignments, and a daily attendance view.

Built with Tauri + React + TypeScript.

---

## Features

- **Interactive Gantt chart** — drag-and-drop scheduling, task dependencies, critical path highlighting, color-coded by subsystem
- **Subsystem hierarchy** — subsystems contain assemblies, assemblies contain tasks, unlimited depth
- **Meeting-day scheduling** — duration in meeting days, not calendar days; respects team schedule and cancelled sessions
- **Team management** — track members, subteams, and skills; assign tasks by subteam, skill, or specific person
- **Daily view** — what's happening today, attendance tracking per session, daily notes by subteam
- **Project + team database separation** — team roster persists across seasons; each season is its own project file
- **Save / Open / Export** — native file dialogs, `.frcgantt` project files, PDF export of the Gantt chart
- **Reports** — daily summary and daily to-do list (MVP); attendance, progress metrics, and project summary (planned)

---

## Tech Stack

| | |
|---|---|
| Desktop | [Tauri v2](https://tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript |
| Build | Vite + Tailwind CSS v4 |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Gantt | [dhtmlxGantt](https://dhtmlx.com/docs/products/dhtmlxGantt/) Standard (educational license) |
| Date math | [date-fns](https://date-fns.org/) |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain)
- Windows 10/11 with WebView2 (included with Edge / modern Windows)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development (first run takes ~60s to compile Rust)
npm run tauri dev
```

---

## Development

```bash
npm run tauri dev      # Development mode — hot reload for React, recompile for Rust changes
npm run tauri build    # Production build → src-tauri/target/release/bundle/msi/
```

### Project Structure

```
src/                   # React + TypeScript frontend
  types/index.ts       # All TypeScript interfaces
  utils/               # Schedule math, time formatting, Gantt adapter
  stores/              # Zustand state (project, team, settings)
  components/          # React components
src-tauri/             # Rust backend
  src/commands.rs      # File I/O Tauri commands
dev_notes/             # Design documentation
  data-model.md        # Full data model reference
  implementation_plan.md
```

### Data Files

| File | Location | Purpose |
|------|----------|---------|
| `team.json` | `%APPDATA%/FRCGantt/` | Team members, subteams, skills |
| `settings.json` | `%APPDATA%/FRCGantt/` | App preferences |
| `*.frcgantt` | User-chosen | Project file (one per season) |

---

## Build Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Scaffold + types + utilities | ✅ Complete |
| 1 | Data layer (stores + Rust wiring) | ✅ Complete |
| 2 | App shell (layout + navigation) | ✅ Complete |
| 3 | Gantt view | ✅ Complete |
| 4 | Daily view + attendance | 🔲 Next |
| 5 | Team management | 🔲 |
| 6 | Settings | 🔲 |
| 7 | Reports (daily summary + to-do MVP) | 🔲 |
| 8 | Polish + deployment | 🔲 |

---

## License

Built for FRC Team use. dhtmlxGantt used under educational/non-commercial license.
