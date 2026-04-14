# Phase 2 Review — App Shell & Navigation

## Scope Reviewed
Implementation plan reference: `dev_notes/implementation_plan.md`, **Phase 2**.

Phase 2 target: app shell/layout, top bar navigation, project file actions (new/open/save), and placeholder views for later phases.

## Comparison Summary

### 1) Layout + view routing (`src/App.tsx`) — **Mostly matches plan**
- App shell uses a top bar + main content area and routes between `Gantt`, `Daily`, `Team`, and `Settings` views via component state.
- Global keyboard shortcuts are implemented for `Ctrl/Cmd+N`, `Ctrl/Cmd+O`, and `Ctrl/Cmd+S`.
- Loading screen is shown until both settings and team DB finish loading.
- Default view from settings is applied once settings finish loading.

### 2) TopBar (`src/components/TopBar/index.tsx`) — **Matches plan**
- Left section has file menu (`New`, `Open`, `Save`, `Save As`), project name, and dirty indicator dot.
- Center section includes `Gantt | Daily | Team | Settings` view switcher.
- Right section shows Saved/Unsaved status and a competition countdown.
- Countdown color thresholds are implemented (`<=5` red, `<=10` amber).

### 3) NewProjectDialog (`src/components/NewProjectDialog/index.tsx`) — **Mostly matches plan**
- Required project fields and date validation are present.
- Schedule periods are pre-populated from settings template and support day toggles + time pickers.
- Schedule exceptions support `cancelled/added/modified` with date and reason fields.
- Submit creates a `Project` and calls `projectStore.newProject()`.

### 4) Placeholder views — **Matches plan**
- `GanttView`, `DailyView`, `TeamPanel`, and `Settings` exist, with non-Phase-2 views still placeholders as expected.

## Concerns / Gaps Identified

1. **New project dialog has a form wiring inconsistency that can affect keyboard submit behavior.**
   - Footer button declares `form="new-project-form"`, but the `<form>` element does not define `id="new-project-form"`.
   - It still works via `onClick={handleSubmit}`, but Enter-key / native form-submit behavior may be inconsistent.
   - Recommendation: add matching form `id` and rely on native submit (`type="submit"`) without redundant click submit handler.

2. **Default view application effect can become stale if `defaultView` changes after initial load.**
   - `App.tsx` applies default view when `settingsLoaded` changes, but the effect dependency array excludes `defaultView`.
   - In current flow this is usually fine, but it can lead to stale behavior if settings reload or are updated around load timing.
   - Recommendation: include `defaultView` in the dependency list and guard to avoid unwanted resets.

3. **Global keyboard shortcuts are always active, including while typing in modal inputs.**
   - `Ctrl/Cmd+S`, `Ctrl/Cmd+O`, and `Ctrl/Cmd+N` are attached at `window` scope with no focus-context checks.
   - Risk: accidental save/open/new actions while the user is editing text in dialog fields.
   - Recommendation: ignore shortcuts when the focused element is an input/textarea/select or contenteditable region.

4. **No explicit user feedback for open/save failures from top-level app shell interactions.**
   - Phase 2 enables core file actions in shell navigation, but error handling remains console-only in store methods.
   - Risk: user perceives no response if file I/O fails (especially in lab environments with path/permission issues).
   - Recommendation: add lightweight toast/banner feedback for file operation success/failure before Phase 3+ complexity increases.

## Validation Performed During Review
- Reviewed the implementation plan and compared it against:
  - `src/App.tsx`
  - `src/components/TopBar/index.tsx`
  - `src/components/NewProjectDialog/index.tsx`
  - `src/components/GanttView/index.tsx`
  - `src/components/DailyView/index.tsx`
  - `src/components/TeamPanel/index.tsx`
  - `src/components/Settings/index.tsx`
