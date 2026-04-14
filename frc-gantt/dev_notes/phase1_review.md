# Phase 1 Review — Foundation (Data Layer + Rust Wiring)

## Scope Reviewed
Implementation plan reference: `dev_notes/implementation_plan.md`, **Phase 1**.

Phase 1 target: app can open/create/save/load project file, with Tauri command wiring, foundational Zustand stores, and app initialization for settings + team DB loading.

## Comparison Summary

### 1) Rust command wiring (`src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`) — **Matches plan**
- `mod commands;` is present.
- `tauri_plugin_dialog::init()` and `tauri_plugin_fs::init()` are registered.
- All expected file/dialog commands are exposed through `invoke_handler`:
  - `read_team_db`, `write_team_db`
  - `read_settings`, `write_settings`
  - `read_project_file`, `write_project_file`
  - `show_open_dialog`, `show_save_dialog`, `show_export_dialog`
- `dialog:default` and `fs:default` are present in `src-tauri/capabilities/default.json`.

### 2) Zustand stores (`src/stores/*.ts`) — **Matches plan**
- `settingsStore.ts` supports load/save + preference updates.
- `teamStore.ts` supports load/save + CRUD-style actions for members/subteams/skills.
- `projectStore.ts` supports new/open/save/save-as/close and core task/dependency/session/note/attendance updates.

### 3) App initialization (`src/App.tsx`) — **Matches plan**
- `loadSettings()` and `loadTeamDb()` are called on mount.
- App shows a loading screen until both settings and team DB are loaded.

## Concerns / Gaps Identified

1. **No schema validation/migration during JSON loads (settings/team/project).**
   - Current stores parse JSON directly and cast to target types.
   - Risk: malformed or older files can load partially with missing nested fields, causing subtle runtime issues later.
   - Recommendation: add runtime validation + versioned migrations (or default-merge strategy for all persisted file types, not only settings).

2. **Phase 1 success criteria says “open/create/save/load project file,” but there is no explicit integration test coverage for these flows.**
   - Functionality exists in store actions, but no automated test confirms end-to-end behavior of command invocations and store state transitions.
   - Recommendation: add a small test matrix (or scriptable smoke test checklist) for New/Open/Save/Save As and corrupted-file handling.

3. **Error handling is console-only for critical file operations.**
   - `openProject`, `saveProject`, and store load/save methods mostly log errors to console and return.
   - Risk: user sees no actionable feedback if file I/O fails.
   - Recommendation: add user-visible error state/toast pipeline in the data layer contract before building deeper UI workflows.

4. **Environment parity concern for Rust validation.**
   - The implementation plan marks `cargo check` as clean, but in this container it fails due to missing system `glib-2.0` development packages.
   - This may be CI/environment-specific, but Phase 1 verification should define required native dependencies explicitly.

## Validation Performed During Review
- Front-end build: `npm run build` (passes).
- Rust compile check: `cargo check` (fails in this environment because `glib-2.0` pkg-config dependency is unavailable).
