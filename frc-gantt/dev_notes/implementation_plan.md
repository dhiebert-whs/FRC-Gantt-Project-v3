# FRC Gantt — Implementation Plan (Refactor Edition)

## 0) Purpose
This plan replaces the prior phase plan and incorporates the desktop-UX refactor direction from `dev-notes/refactor_plan.md`.

Primary goal: keep **Gantt/Daily as the core workspace** while introducing a **desktop-style menu system**, **popup-based create/edit flows**, and a **command-driven UI architecture** that is easier to test and maintain.

---

## 1) Engineering Principles (must be enforced in every phase)

## 1.1 Separation of Concerns
- Keep domain logic in stores/services (`stores/*`, `commands/*`), not in visual components.
- Components should primarily render state and dispatch commands.
- Avoid direct cross-component coupling; use shared hooks/stores.

## 1.2 DRY (Don’t Repeat Yourself)
- Shared form sections must be extracted into reusable components (`TaskFormFields`, `MemberFormFields`, etc.).
- Keyboard shortcuts, toolbar actions, and menus must use the same command registry.

## 1.3 KISS (Keep It Simple)
- Prefer small composable modules over one large “manager” component.
- Keep state transitions explicit and predictable.
- Defer non-essential complexity (e.g., command palette extensions) until core flows are stable.

## 1.4 Documentation
- Every new architectural module must include file header comments describing purpose and boundaries.
- Non-obvious workflows (modal lifecycle, command dispatch rules) must be documented in dev notes.

## 1.5 TDD / Testing Discipline
- For new domain behavior, write/update tests first where practical.
- Minimum expectation per phase:
  - unit tests for pure functions and command enable/disable logic
  - integration tests for modal open/close and key action flows
  - smoke validation of critical user paths (new/open/save, create/edit task/member)

---

## 2) Current Baseline (what we are preserving)
- Existing Zustand stores are the source of truth for project/team/settings state.
- dhtmlxGantt integration and scheduling utilities remain in place.
- Persistence and Tauri command wiring remain unchanged unless explicitly required.
- Kiosk/desktop display mode support remains a first-class requirement.

---

## 3) Target UX Model

### 3.1 Application Shell
- Main canvas is always either **Gantt** or **Daily**.
- Team/settings operations open in dialogs or secondary utility surfaces instead of replacing the full canvas.

### 3.2 Desktop Menu Bar
Menus to support:
- File
- Edit
- View
- Tasks
- Members
- Settings
- Help

Menus must support accelerators and reflect disabled states based on command context.

### 3.3 Popup-first Entity Management
Create/edit actions for tasks, members, subteams, and skills are modal dialogs (not slide-in panes).

### 3.4 Unified Command System
All action entry points (menu, toolbar, keyboard shortcut, context menu) dispatch through shared command handlers.

---

## 4) Architecture Changes

## 4.1 Commands Layer (new)
- Add `src/commands/appCommands.ts` and `src/commands/useCommands.ts`.
- Define command IDs and metadata:
  - id
  - label
  - accelerator
  - `isEnabled(ctx)`
  - `run(ctx)`
- Move existing keyboard shortcut behavior in `App.tsx` to command dispatch.

## 4.2 Menu Layer (new)
- Add `src/components/AppMenuBar/index.tsx`.
- Menu rendering is declarative from command metadata.
- TopBar becomes optional quick actions + status (not sole navigation system).

## 4.3 Modal Infrastructure (new)
- Add `src/stores/modalStore.ts` and `src/components/modals/ModalHost.tsx`.
- Standardize modal behavior:
  - focus trap
  - esc-to-close
  - dirty-form confirmation
  - consistent sizes/touch target behavior in kiosk mode

## 4.4 Form Reuse / Decomposition
- Split `TaskEditor` into reusable form logic + modal wrapper.
- Split member form similarly.
- Remove duplicated validation logic by centralizing validators/helpers.

---

## 5) Phased Execution Plan

## Phase A — Command Foundation
### Scope
- Implement command registry and context object.
- Wire existing shortcuts (`Ctrl/Cmd+N`, `O`, `S`) to command dispatch.

### Deliverables
- `appCommands.ts`, `useCommands.ts`.
- Updated `App.tsx` shortcut handling via commands.

### Tests
- Unit tests for command `isEnabled` logic and dispatch routing.
- Regression test for new/open/save shortcuts.

---

## Phase B — Menu Bar Integration
### Scope
- Implement desktop-style app menu component and integrate in app shell.
- Keep existing TopBar status indicators.

### Deliverables
- `AppMenuBar` component.
- Menu groups mapped to command registry.

### Tests
- Integration tests ensuring menu item click dispatches correct command.
- Disabled-state tests when no project is open.

---

## Phase C — Modal Framework
### Scope
- Implement central modal host/store and migrate `NewProjectDialog` to shared modal system.

### Deliverables
- `modalStore.ts`, `ModalHost.tsx`.
- NewProject dialog opened via modal infrastructure.

### Tests
- Integration tests for open/close lifecycle, escape behavior, focus restoration.

---

## Phase D — Task Flow Refactor
### Scope
- Replace Gantt slide-in TaskEditor flow with `TaskDialog` modal flow.
- Extract shared task form fields and validation helpers.

### Deliverables
- `TaskDialog` and `TaskFormFields`.
- Gantt interactions open task modal for create/edit.

### Tests
- Unit tests for task form validation and planned date derivation.
- Integration tests for create/edit/delete task via dialog.

---

## Phase E — Team Flow Refactor
### Scope
- Convert member/subteam/skill create/edit flows to modals.
- Remove slide-in dependence in TeamPanel.

### Deliverables
- `MemberDialog`, `SubteamDialog`, `SkillDialog`.
- Reused form components with centralized validation.

### Tests
- Integration tests for add/edit member and subteam/skill flows.
- Regression test: store updates persist correctly.

---

## Phase F — Primary Workspace Consolidation
### Scope
- Reduce primary view routing to `gantt | daily`.
- Move team/settings to secondary surfaces invoked by menu/commands.

### Deliverables
- Simplified primary app routing.
- Command entries for members/settings overlays.

### Tests
- Integration tests verifying Gantt/Daily remain active workspace.
- Navigation tests ensuring overlays do not unmount primary canvas unexpectedly.

---

## Phase G — Quality, Cleanup, and Documentation
### Scope
- Remove deprecated slide-in paths.
- Verify file/module responsibilities and simplify any overgrown components.
- Update README/dev notes with new UI architecture and extension points.

### Deliverables
- Cleaned code paths and reduced duplication.
- Updated documentation.

### Tests
- Full frontend test run.
- Manual smoke checklist for critical workflows.

---

## 6) Definition of Done (for the refactor)
A phase is done only if:
1. Feature behavior is implemented and manually verifiable.
2. Required tests are added/updated and passing.
3. No duplicated logic was introduced when a shared abstraction is appropriate.
4. New modules include clear comments/docstrings for maintainability.
5. Lint/typecheck passes.

Refactor is complete when:
- App provides desktop-style menus with command-backed actions.
- Task/member/subteam/skill create/edit flows are popup dialogs.
- Gantt/Daily are the persistent primary workspace.
- Existing store/persistence behavior remains correct.

---

## 7) Risk Controls
- Keep store APIs stable while changing UI surfaces.
- Land phases in small PRs with explicit rollback points.
- Use feature flags if needed for risky UI transitions (especially TaskEditor replacement).
