# FRC Gantt

A standalone desktop app for FIRST Robotics Competition teams to plan and track the build season. Runs on a PC-driven interactive display board (ClearTouch), showing the full project as an interactive Gantt chart with task dependencies, team assignments, and a daily attendance view.

Built with Tauri v2 + React 18 + TypeScript. Windows desktop app — no server, no network, no login.

---

## Features

- **Interactive Gantt chart** — drag-and-drop scheduling, task dependencies, critical path highlighting, color-coded by top-level group
- **Flexible task hierarchy** — unlimited nesting depth; any task can be broken into subtasks at any time; parent completion % rolls up automatically from children
- **Meeting-day scheduling** — duration in meeting days, not calendar days; respects team schedule and cancelled sessions
- **Team management** — track members, subteams, and skills; assign tasks by subteam, skill, or specific person
- **Daily view** — today's active leaf tasks (grouped by top-level project group), attendance tracking per session, daily notes by subteam
- **Project + team database separation** — team roster persists across seasons; each season is its own project file
- **Native file dialogs** — save/open `.frcgantt` project files anywhere on disk
- **ClearTouch board support** — kiosk display mode with 48px+ touch targets for finger use on large interactive displays

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

## Build Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Scaffold + types + utilities | ✅ Complete |
| 1 | Data layer (stores + Rust wiring) | ✅ Complete |
| 2 | App shell (layout + navigation) | ✅ Complete |
| 3 | Gantt view | ✅ Complete |
| — | Pre-Phase 4: toast pipeline, kiosk display mode | ✅ Complete |
| 4 | Daily view + attendance | ✅ Complete |
| — | Pre-Phase 5: flexible hierarchy + completion rollup | ✅ Complete |
| 5 | Team management | 🔲 Next |
| 6 | Settings | 🔲 |
| 7 | Reports | 🔲 |
| 8 | Polish + deployment | 🔲 |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain)
- Windows 10/11 with WebView2 (included with Edge / modern Windows)

---

## Getting Started

```bash
cd frc-gantt
npm install
npm run tauri dev   # first run takes ~60s to compile Rust
```

---

## License

Built for FRC Team use. dhtmlxGantt used under educational/non-commercial license.
