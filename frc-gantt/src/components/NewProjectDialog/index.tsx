// ============================================================
// FRC Gantt App — New Project Dialog
// src/components/NewProjectDialog/index.tsx
// ============================================================

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { createProject } from '../../types';
import type { SchedulePeriod, ScheduleException, DayOfWeek } from '../../types';

interface NewProjectDialogProps {
  onClose: () => void;
}

const ALL_DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 'monday',    label: 'Mon' },
  { id: 'tuesday',   label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday',  label: 'Thu' },
  { id: 'friday',    label: 'Fri' },
  { id: 'saturday',  label: 'Sat' },
  { id: 'sunday',    label: 'Sun' },
];

export function NewProjectDialog({ onClose }: NewProjectDialogProps) {
  const newProject      = useProjectStore(s => s.newProject);
  const settings        = useSettingsStore(s => s.settings);

  // ── Form state ──────────────────────────────────────────────
  const [name,        setName]        = useState('');
  const [teamNumber,  setTeamNumber]  = useState('');
  const [season,      setSeason]      = useState(new Date().getFullYear().toString());
  const [gameName,    setGameName]    = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [goalDate,    setGoalDate]    = useState('');
  const [hardDate,    setHardDate]    = useState('');

  // Schedule periods — pre-populated from settings template
  const [periods, setPeriods] = useState<SchedulePeriod[]>(() =>
    settings.defaultScheduleTemplate.map(t => ({
      id: nanoid(),
      startDate: '',
      endDate: '',
      meetingDays: t.meetingDays,
      defaultStartTime: t.defaultStartTime,
      defaultEndTime: t.defaultEndTime,
    }))
  );

  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validation ───────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim())     e.name      = 'Project name is required.';
    if (!teamNumber)      e.team      = 'Team number is required.';
    if (!startDate)       e.startDate = 'Start date is required.';
    if (!goalDate)        e.goalDate  = 'Goal end date is required.';
    if (!hardDate)        e.hardDate  = 'Hard deadline is required.';
    if (startDate && goalDate && goalDate < startDate) e.goalDate  = 'Must be after start date.';
    if (startDate && hardDate && hardDate < startDate) e.hardDate  = 'Must be after start date.';
    // Each period with any filled field must have both dates
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if ((p.startDate || p.endDate) && !(p.startDate && p.endDate)) {
        e[`period_${i}`] = 'Both start and end dates are required.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const filledPeriods = periods.filter(p => p.startDate && p.endDate);

    const project = createProject({
      name: name.trim(),
      teamNumber: parseInt(teamNumber, 10),
      season,
      gameName: gameName.trim() || undefined,
      startDate,
      goalEndDate: goalDate,
      hardEndDate: hardDate,
      schedulePeriods: filledPeriods,
      scheduleExceptions: exceptions,
    });

    newProject(project);
    onClose();
  }

  // ── Period helpers ───────────────────────────────────────────
  function updatePeriod(i: number, changes: Partial<SchedulePeriod>) {
    setPeriods(ps => ps.map((p, idx) => idx === i ? { ...p, ...changes } : p));
  }

  function togglePeriodDay(i: number, day: DayOfWeek) {
    const p = periods[i];
    const next = p.meetingDays.includes(day)
      ? p.meetingDays.filter(d => d !== day)
      : [...p.meetingDays, day];
    updatePeriod(i, { meetingDays: next });
  }

  function addPeriod() {
    setPeriods(ps => [...ps, {
      id: nanoid(),
      startDate: '',
      endDate: '',
      meetingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      defaultStartTime: '15:30',
      defaultEndTime: '18:30',
    }]);
  }

  function removePeriod(i: number) {
    setPeriods(ps => ps.filter((_, idx) => idx !== i));
  }

  // ── Exception helpers ────────────────────────────────────────
  function addException() {
    setExceptions(xs => [...xs, {
      id: nanoid(),
      date: '',
      type: 'cancelled',
      reason: '',
    }]);
  }

  function updateException(i: number, changes: Partial<ScheduleException>) {
    setExceptions(xs => xs.map((x, idx) => idx === i ? { ...x, ...changes } : x));
  }

  function removeException(i: number) {
    setExceptions(xs => xs.filter((_, idx) => idx !== i));
  }

  // ── Render ───────────────────────────────────────────────────
  // Backdrop and centering are provided by ModalHost.
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">New Project</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <form id="new-project-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Project info ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Project</h3>

            <Field label="Project Name *" error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="2026 Season — Reefscape"
                className={input(errors.name)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Team Number *" error={errors.team}>
                <input
                  type="number"
                  value={teamNumber}
                  onChange={e => setTeamNumber(e.target.value)}
                  placeholder="2408"
                  min={1}
                  className={input(errors.team)}
                />
              </Field>
              <Field label="Season Year">
                <input
                  type="text"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  placeholder="2026"
                  className={input()}
                />
              </Field>
            </div>

            <Field label="Game Name">
              <input
                type="text"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
                placeholder="Reefscape"
                className={input()}
              />
            </Field>
          </section>

          {/* ── Dates ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dates</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Kickoff / Start *" error={errors.startDate}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={input(errors.startDate)} />
              </Field>
              <Field label="Goal Completion *" error={errors.goalDate}>
                <input type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} className={input(errors.goalDate)} />
              </Field>
              <Field label="Competition Day *" error={errors.hardDate}>
                <input type="date" value={hardDate} onChange={e => setHardDate(e.target.value)} className={input(errors.hardDate)} />
              </Field>
            </div>
          </section>

          {/* ── Schedule periods ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Schedule Periods</h3>
              <button type="button" onClick={addPeriod} className={btnSecondary}>+ Add Period</button>
            </div>

            {periods.length === 0 && (
              <p className="text-sm text-gray-500 italic">No schedule periods. Tasks will span calendar days.</p>
            )}

            {periods.map((p, i) => (
              <div key={p.id} className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Period {i + 1}</span>
                  <button type="button" onClick={() => removePeriod(i)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">Remove</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date" error={errors[`period_${i}`]}>
                    <input type="date" value={p.startDate} onChange={e => updatePeriod(i, { startDate: e.target.value })} className={input(errors[`period_${i}`])} />
                  </Field>
                  <Field label="End Date">
                    <input type="date" value={p.endDate} onChange={e => updatePeriod(i, { endDate: e.target.value })} className={input()} />
                  </Field>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Meeting Days</label>
                  <div className="flex gap-1.5">
                    {ALL_DAYS.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => togglePeriodDay(i, d.id)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          p.meetingDays.includes(d.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Default Start Time">
                    <input type="time" value={p.defaultStartTime ?? ''} onChange={e => updatePeriod(i, { defaultStartTime: e.target.value })} className={input()} />
                  </Field>
                  <Field label="Default End Time">
                    <input type="time" value={p.defaultEndTime ?? ''} onChange={e => updatePeriod(i, { defaultEndTime: e.target.value })} className={input()} />
                  </Field>
                </div>
              </div>
            ))}
          </section>

          {/* ── Schedule exceptions ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Exceptions</h3>
              <button type="button" onClick={addException} className={btnSecondary}>+ Add Exception</button>
            </div>

            {exceptions.length === 0 && (
              <p className="text-sm text-gray-500 italic">No exceptions. Add snow days, holidays, or extra sessions here.</p>
            )}

            {exceptions.map((x, i) => (
              <div key={x.id} className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Exception {i + 1}</span>
                  <button type="button" onClick={() => removeException(i)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">Remove</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Date">
                    <input type="date" value={x.date} onChange={e => updateException(i, { date: e.target.value })} className={input()} />
                  </Field>
                  <Field label="Type">
                    <select
                      value={x.type}
                      onChange={e => updateException(i, { type: e.target.value as ScheduleException['type'] })}
                      className={input()}
                    >
                      <option value="cancelled">Cancelled</option>
                      <option value="added">Added</option>
                      <option value="modified">Modified</option>
                    </select>
                  </Field>
                  <Field label="Reason">
                    <input type="text" value={x.reason ?? ''} onChange={e => updateException(i, { reason: e.target.value })} placeholder="Snow day…" className={input()} />
                  </Field>
                </div>
              </div>
            ))}
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="new-project-form"
            onClick={handleSubmit}
            className="px-5 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Create Project
          </button>
        </div>
    </div>
  );
}

// ── Shared style helpers ──────────────────────────────────────

const btnSecondary = 'px-3 py-1 text-xs rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors';

function input(error?: string) {
  return `w-full px-3 py-2 rounded bg-gray-800 border text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
  }`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 block">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
