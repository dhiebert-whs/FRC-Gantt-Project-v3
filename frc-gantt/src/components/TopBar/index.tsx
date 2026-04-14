// ============================================================
// FRC Gantt App — Top Bar
// src/components/TopBar/index.tsx
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { countMeetingDays } from '../../utils/scheduleUtils';
import { format, parseISO } from 'date-fns';

export type View = 'gantt' | 'daily' | 'team' | 'settings';

interface TopBarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onNewProject: () => void;
}

const VIEW_LABELS: { id: View; label: string }[] = [
  { id: 'gantt',    label: 'Gantt' },
  { id: 'daily',    label: 'Daily' },
  { id: 'team',     label: 'Team' },
  { id: 'settings', label: 'Settings' },
];

export function TopBar({ currentView, onViewChange, onNewProject }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const projectFile   = useProjectStore(s => s.projectFile);
  const isDirty       = useProjectStore(s => s.isDirty);
  const openProject   = useProjectStore(s => s.openProject);
  const saveProject   = useProjectStore(s => s.saveProject);
  const saveProjectAs = useProjectStore(s => s.saveProjectAs);

  const projectName = projectFile?.project.name ?? 'No Project Open';
  const project     = projectFile?.project ?? null;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Competition countdown
  const daysRemaining = project
    ? countMeetingDays(
        format(new Date(), 'yyyy-MM-dd'),
        project.hardEndDate,
        project,
      )
    : null;

  const deadlineLabel = project
    ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to ${format(parseISO(project.hardEndDate), 'MMM d')}`
    : null;

  function handleOpen() {
    setMenuOpen(false);
    openProject();
  }

  function handleSave() {
    setMenuOpen(false);
    saveProject();
  }

  function handleSaveAs() {
    setMenuOpen(false);
    saveProjectAs();
  }

  function handleNew() {
    setMenuOpen(false);
    onNewProject();
  }

  return (
    <header className="flex items-center h-12 kiosk:h-16 px-3 bg-gray-900 border-b border-gray-800 shrink-0 gap-3">
      {/* ── Left: File menu + project name ── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* File menu button */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="px-3 py-1.5 kiosk:py-3 kiosk:px-4 text-sm kiosk:text-base rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          >
            File
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded shadow-xl z-50">
              <MenuItem label="New Project" shortcut="Ctrl+N" onClick={handleNew} />
              <MenuItem label="Open Project…" shortcut="Ctrl+O" onClick={handleOpen} />
              <div className="my-1 border-t border-gray-700" />
              <MenuItem label="Save" shortcut="Ctrl+S" onClick={handleSave} disabled={!projectFile} />
              <MenuItem label="Save As…" onClick={handleSaveAs} disabled={!projectFile} />
            </div>
          )}
        </div>

        {/* Project name */}
        <span className="text-sm font-medium text-white truncate max-w-xs">
          {projectName}
        </span>

        {/* Dirty indicator */}
        {isDirty && (
          <span
            title="Unsaved changes"
            className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
          />
        )}
      </div>

      {/* ── Center: View switcher ── */}
      <nav className="flex items-center gap-1 mx-auto">
        {VIEW_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`px-4 kiosk:px-5 py-1.5 kiosk:py-3 text-sm kiosk:text-base rounded transition-colors ${
              currentView === id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Right: Save state + countdown ── */}
      <div className="flex items-center gap-3 text-xs kiosk:text-sm text-gray-400 shrink-0">
        {isDirty ? (
          <button
            onClick={saveProject}
            className="text-amber-400 hover:text-amber-300 transition-colors"
            title="Click to save"
          >
            ● Unsaved
          </button>
        ) : projectFile ? (
          <span className="text-green-500">Saved</span>
        ) : null}

        {deadlineLabel && (
          <span
            className={`font-medium ${
              (daysRemaining ?? 0) <= 5 ? 'text-red-400' :
              (daysRemaining ?? 0) <= 10 ? 'text-amber-400' :
              'text-gray-400'
            }`}
          >
            {deadlineLabel}
          </span>
        )}
      </div>
    </header>
  );
}

// ── Small helper ──────────────────────────────────────────────

interface MenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({ label, shortcut, onClick, disabled = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between w-full px-3 py-2 kiosk:py-3 text-sm kiosk:text-base text-left transition-colors ${
        disabled
          ? 'text-gray-600 cursor-default'
          : 'text-gray-200 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-gray-500 text-xs ml-4">{shortcut}</span>}
    </button>
  );
}
