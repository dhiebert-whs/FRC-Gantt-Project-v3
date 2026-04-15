# Refactor Plan: Desktop App UX Alignment

## Why this refactor is needed
The current app has solid data/state foundations and feature coverage, but the interaction model still feels like a browser-style single-page app rather than a standalone desktop planning tool. The biggest UX gaps:

1. **Menuing is too shallow** (only a custom `File` dropdown in the top bar).
2. **Creation/edit flows are panel/inline-heavy** (TaskEditor + MemberForm slide-in), not modal/popup driven.
3. **Primary workspace focus is diluted** by using top-level view switching (Gantt/Daily/Team/Settings) instead of treating schedule views as the main canvas with management actions opened contextually.

This plan preserves the existing store architecture and Phase ordering discipline, while moving the UI toward a traditional desktop app model.

---

## What exists today (baseline)

### Strengths to keep
- Good state architecture with Zustand stores and clear source-of-truth rules.
- `implementation_plan.md` already emphasizes the Gantt as primary in Phase 3.
- Core entities (tasks, dependencies, members, subteams, settings) are already modeled and persisted.

### Current UX constraints (from code)
- `TopBar` currently has a custom dropdown with only `File` actions plus view switch buttons.
- `App.tsx` routes entire screen by `currentView` (`gantt`, `daily`, `team`, `settings`).
- `TaskEditor` is a right slide-in panel.
- Team member editing is a slide-in (`MemberForm`) in TeamPanel.

---

## Target interaction model

## 1) Introduce a real app menu system
Add a proper menu bar abstraction that supports keyboard accelerators and role-based menu behavior.

### Recommended menus
- **File**: New Project, Open, Save, Save As, Import, Export, Close Project, Quit
- **Edit**: Undo, Redo, Cut, Copy, Paste, Delete, Select All
- **View**: Gantt, Daily, Toggle Side Panels, Zoom Day/Week/Month, Toggle Critical Path
- **Tasks**: New Subsystem, New Task, New Milestone, Link Tasks, Mark Complete
- **Members**: New Member, Manage Subteams, Manage Skills
- **Settings**: App Settings, Display Mode, Gantt Columns
- **Help**: Shortcuts, About

### Implementation direction
- Build a centralized `menuActions` registry (command pattern) so menu items, toolbar buttons, and keyboard shortcuts call the same actions.
- Keep current top bar visual controls as optional quick-access toolbar, not as the only navigation primitive.
- If using Tauri native menu APIs, keep a parallel web fallback for consistency in dev/web mode.

---

## 2) Move create/edit flows to popups (modal dialogs)
New entity creation and major edits should happen in focused dialogs.

### Dialogs to introduce
- `TaskDialog` (create + edit, can replace or wrap `TaskEditor` form sections)
- `MemberDialog` (create + edit, replacing slide-in `MemberForm` UX)
- `SubteamDialog`, `SkillDialog`
- Reuse existing `NewProjectDialog` pattern as baseline for modal behavior

### Behavior rules
- Dialogs open centered with backdrop and focus trap.
- `Esc` closes (with dirty-form confirmation when needed).
- Enter submits where appropriate.
- No background layout shift when opening dialogs.

### Migration strategy
- Keep existing forms’ business logic; move them into reusable form components used inside modal shells.
- Decompose `TaskEditor` into:
  - `TaskFormFields` (pure form)
  - `TaskDialog` (modal wrapper + actions)
- Decompose `MemberForm` similarly.

---

## 3) Make Gantt/Daily the always-primary workspace
Treat schedule views as the main canvas and move admin domains (team/settings) into secondary surfaces.

### Proposed layout
- Main content area: **Gantt or Daily** only.
- Secondary interactions:
  - Settings via modal dialog / dedicated settings window.
  - Team management via modal or dockable side utility panel (not full-screen mode switch).
- Optional left sidebar for project navigation/filtering; keep center canvas dominant.

### Result
Users always feel they are “in the project timeline,” with management actions as overlays/tools rather than full context switches.

---

## 4) Unify command handling and context
Introduce a small command bus so all entry points trigger the same logic.

### Benefits
- Menu item, toolbar button, shortcut, and context menu stay in sync.
- Enables global enable/disable conditions (e.g., Save disabled without project).
- Easier future features (Undo/Redo, command palette).

### Suggested command IDs
- `project.new`, `project.open`, `project.save`, `project.saveAs`
- `view.gantt`, `view.daily`, `view.toggleCriticalPath`, `view.zoom.day`
- `task.new`, `task.newChild`, `task.edit`, `task.delete`
- `member.new`, `member.edit`
- `settings.open`

---

## 5) Phase-by-phase implementation plan

### Phase A — Navigation & menu foundation (low risk)
1. Add `AppCommand` registry + `useCommands()` hook.
2. Refactor existing keyboard handling in `App.tsx` to dispatch commands.
3. Replace TopBar-only File menu with shared command-backed menu model.

### Phase B — Modal framework
1. Add reusable `ModalHost` + `useModalStore`.
2. Port `NewProjectDialog` to the shared modal framework.
3. Add accessibility baselines (focus trap, aria labels, escape, restore focus).

### Phase C — Task flows
1. Extract task form fields from `TaskEditor`.
2. Implement `TaskDialog` for create/edit.
3. Replace Gantt right-slide editor with modal invocation.

### Phase D — Team flows
1. Extract member form into reusable component.
2. Implement `MemberDialog` and convert add/edit member actions.
3. Convert subteam/skill add/edit into dialogs.

### Phase E — Primary view consolidation
1. Reduce top-level views to `gantt | daily` for main canvas.
2. Move Team/Settings from main route tabs to dialogs/panels.
3. Add quick-launch entries in menu (`Members`, `Settings`).

### Phase F — polish
1. Add right-click/context menus for Gantt tasks.
2. Add command palette (`Ctrl/Cmd+K`).
3. Ensure kiosk mode still has large touch targets for dialog controls.

---

## 6) File-level refactor map (suggested)

### Existing files to modify
- `frc-gantt/src/App.tsx`
- `frc-gantt/src/components/TopBar/index.tsx`
- `frc-gantt/src/components/GanttView/index.tsx`
- `frc-gantt/src/components/TaskEditor/index.tsx` (likely split/deprecate)
- `frc-gantt/src/components/TeamPanel/index.tsx`

### New files/modules to add
- `frc-gantt/src/commands/appCommands.ts`
- `frc-gantt/src/commands/useCommands.ts`
- `frc-gantt/src/components/AppMenuBar/index.tsx`
- `frc-gantt/src/components/modals/ModalHost.tsx`
- `frc-gantt/src/stores/modalStore.ts`
- `frc-gantt/src/components/TaskDialog/*`
- `frc-gantt/src/components/MemberDialog/*`

---

## 7) Risks & mitigations
- **Risk:** Breaking existing Gantt event/edit workflow.
  - **Mitigation:** Keep task store APIs unchanged; only swap UI surface.
- **Risk:** Modal overload on kiosk touch hardware.
  - **Mitigation:** enforce kiosk sizing tokens and minimum 48px controls.
- **Risk:** Regressions in keyboard shortcuts.
  - **Mitigation:** route all shortcuts through command registry and add tests.

---

## 8) Acceptance criteria
Refactor is successful when:
1. App presents a desktop-like menu system with File/Edit/View/Tasks/Members/Settings (+ shortcuts).
2. New/edit task/member/subteam/skill flows open in modal popups.
3. Main screen remains primarily Gantt or Daily workspace.
4. Team/settings operations do not require full-screen view switches.
5. Existing persistence/state behavior remains unchanged.
