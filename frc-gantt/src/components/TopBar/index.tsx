// ============================================================
// FRC Gantt App — Top Bar
// src/components/TopBar/index.tsx
// ============================================================

import { useProjectStore } from '../../stores/projectStore';
import { countMeetingDays } from '../../utils/scheduleUtils';
import { format, parseISO } from 'date-fns';

export type View = 'gantt' | 'daily' | 'team' | 'settings';

interface TopBarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const VIEW_LABELS: { id: View; label: string }[] = [
  { id: 'gantt',    label: 'Gantt' },
  { id: 'daily',    label: 'Daily' },
  { id: 'team',     label: 'Team' },
  { id: 'settings', label: 'Settings' },
];

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const projectFile   = useProjectStore(s => s.projectFile);
  const isDirty       = useProjectStore(s => s.isDirty);
  const saveProject   = useProjectStore(s => s.saveProject);

  const projectName = projectFile?.project.name ?? 'No Project Open';
  const project     = projectFile?.project ?? null;

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

  return (
    <header className="flex items-center h-12 kiosk:h-16 px-3 bg-gray-900 border-b border-gray-800 shrink-0 gap-3">
      {/* ── Left: Project name + dirty indicator ── */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-white truncate max-w-xs">
          {projectName}
        </span>
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
              (daysRemaining ?? 0) <= 5  ? 'text-red-400'   :
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
