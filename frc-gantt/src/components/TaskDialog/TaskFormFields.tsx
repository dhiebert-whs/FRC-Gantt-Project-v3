// src/components/TaskDialog/TaskFormFields.tsx
// Reusable task form fields — rendering only, no save/cancel/delete logic.
// Used by TaskDialog; can be reused by any future task-editing surface.

import { useMemo } from 'react';
import { useTeamStore } from '../../stores/teamStore';
import { formatDate } from '../../utils/timeUtils';
import type { Project } from '../../types';
import { computePlannedEndDate } from './taskFormUtils';
import type { TaskForm, TaskFormErrors } from './taskFormUtils';

export const TASK_TYPES = [
  { value: 'subsystem' as const, label: 'Subsystem' },
  { value: 'assembly'  as const, label: 'Assembly' },
  { value: 'task'      as const, label: 'Task' },
  { value: 'milestone' as const, label: 'Milestone' },
];

export const TASK_STATUSES = [
  { value: 'not_started' as const, label: 'Not Started' },
  { value: 'in_progress' as const, label: 'In Progress' },
  { value: 'completed'   as const, label: 'Completed' },
  { value: 'blocked'     as const, label: 'Blocked' },
  { value: 'deferred'    as const, label: 'Deferred' },
];

export const TASK_PRIORITIES = [
  { value: 'low'      as const, label: 'Low' },
  { value: 'normal'   as const, label: 'Normal' },
  { value: 'high'     as const, label: 'High' },
  { value: 'critical' as const, label: 'Critical' },
];

interface TaskFormFieldsProps {
  form: TaskForm;
  setField: <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => void;
  project: Project;
  errors: TaskFormErrors;
}

export function TaskFormFields({ form, setField, project, errors }: TaskFormFieldsProps) {
  const subteams = useTeamStore(s => s.db.subteams);
  const skills   = useTeamStore(s => s.db.skills);
  const members  = useTeamStore(s => s.db.members);

  const plannedEndDate = useMemo(
    () => computePlannedEndDate(form.startDate, form.estimatedDays, form.taskType, project),
    [form.startDate, form.estimatedDays, form.taskType, project],
  );

  const isMilestone = form.taskType === 'milestone';

  const filteredMembers = useMemo(() => {
    const active = members.filter(m => m.isActive);
    if (!form.requiredSubteamIds.length) return active;
    return active.filter(m =>
      m.subteamIds.some(sid => form.requiredSubteamIds.includes(sid))
    );
  }, [members, form.requiredSubteamIds]);

  return (
    <div className="flex-1 overflow-y-auto px-4 kiosk:px-5 py-3 kiosk:py-4 space-y-4">

      {/* ── Identity ── */}
      <Section label="Identity">
        <Field label="Title *" error={errors.title}>
          <input
            type="text"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            placeholder="Task title"
            className={textInput(!!errors.title)}
          />
        </Field>

        <Field label="Type">
          <Select
            value={form.taskType}
            onChange={v => setField('taskType', v as TaskForm['taskType'])}
            options={TASK_TYPES}
          />
        </Field>

        {form.taskType === 'subsystem' && (
          <Field label="Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setField('color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-gray-400 font-mono">{form.color}</span>
            </div>
          </Field>
        )}

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            rows={2}
            placeholder="Optional description…"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 kiosk:py-3 text-sm kiosk:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </Field>
      </Section>

      {/* ── Scheduling ── */}
      <Section label="Scheduling">
        <Field label="Start Date">
          <input
            type="date"
            value={form.startDate}
            onChange={e => setField('startDate', e.target.value)}
            className={textInput(false)}
          />
        </Field>

        {!isMilestone && (
          <Field label="Estimated Meeting Days">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={form.estimatedDays}
                onChange={e => setField('estimatedDays', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 kiosk:w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 kiosk:py-3 text-sm kiosk:text-base text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400">→ {formatDate(plannedEndDate)}</span>
            </div>
          </Field>
        )}

        <Field label="Hard Deadline (optional)">
          <input
            type="date"
            value={form.hardDeadline}
            onChange={e => setField('hardDeadline', e.target.value)}
            className={textInput(false)}
          />
        </Field>
      </Section>

      {/* ── Status ── */}
      <Section label="Status">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select
              value={form.status}
              onChange={v => setField('status', v as TaskForm['status'])}
              options={TASK_STATUSES}
            />
          </Field>
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={v => setField('priority', v as TaskForm['priority'])}
              options={TASK_PRIORITIES}
            />
          </Field>
        </div>

        {!isMilestone && (
          <Field label={`Completion: ${form.completionPercent}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.completionPercent}
              onChange={e => setField('completionPercent', parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
          </Field>
        )}
      </Section>

      {/* ── Team ── */}
      <Section label="Team">
        <CheckGroup
          label="Required Subteams"
          allItems={subteams}
          selectedIds={form.requiredSubteamIds}
          getLabel={id => subteams.find(s => s.id === id)?.name ?? id}
          getColor={id => subteams.find(s => s.id === id)?.color}
          onChange={ids => setField('requiredSubteamIds', ids)}
        />
        <CheckGroup
          label="Required Skills"
          allItems={skills}
          selectedIds={form.requiredSkillIds}
          getLabel={id => skills.find(s => s.id === id)?.name ?? id}
          onChange={ids => setField('requiredSkillIds', ids)}
        />
        <CheckGroup
          label={form.requiredSubteamIds.length ? 'Assigned Members (filtered by subteam)' : 'Assigned Members'}
          allItems={filteredMembers}
          selectedIds={form.assignedMemberIds}
          getLabel={id => {
            const m = members.find(m => m.id === id);
            return m ? `${m.firstName} ${m.lastName}` : id;
          }}
          onChange={ids => setField('assignedMemberIds', ids)}
        />
      </Section>

      {/* ── Notes ── */}
      <Section label="Notes">
        <textarea
          value={form.notes}
          onChange={e => setField('notes', e.target.value)}
          rows={3}
          placeholder="Blockers, references, session notes…"
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 kiosk:py-3 text-sm kiosk:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </Section>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs kiosk:text-sm font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs kiosk:text-sm text-gray-400">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function textInput(hasError: boolean) {
  return `w-full bg-gray-800 border rounded px-2 py-1.5 kiosk:py-3 text-sm kiosk:text-base text-white focus:outline-none focus:border-blue-500 ${
    hasError ? 'border-red-500' : 'border-gray-600'
  }`;
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: string) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 kiosk:py-3 text-sm kiosk:text-base text-white focus:outline-none focus:border-blue-500"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function CheckGroup({
  label,
  allItems,
  selectedIds,
  getLabel,
  getColor,
  onChange,
}: {
  label: string;
  allItems: { id: string }[];
  selectedIds: string[];
  getLabel: (id: string) => string;
  getColor?: (id: string) => string | undefined;
  onChange: (ids: string[]) => void;
}) {
  if (!allItems.length) {
    return (
      <div>
        <label className="block text-xs kiosk:text-sm text-gray-400 mb-1">{label}</label>
        <p className="text-xs text-gray-500 italic">None defined yet</p>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs kiosk:text-sm text-gray-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {allItems.map(item => {
          const selected = selectedIds.includes(item.id);
          const color = getColor?.(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange(selected
                  ? selectedIds.filter(id => id !== item.id)
                  : [...selectedIds, item.id])
              }
              className={`px-2 kiosk:px-3 py-0.5 kiosk:py-1.5 rounded text-xs kiosk:text-sm border transition-colors ${
                selected
                  ? 'border-transparent text-white'
                  : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
              }`}
              style={selected && color ? { background: color, borderColor: color } : undefined}
            >
              {getLabel(item.id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
