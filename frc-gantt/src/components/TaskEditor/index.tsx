// ============================================================
// FRC Gantt App — Task Editor Panel
// src/components/TaskEditor/index.tsx
//
// Slides in from the right when a task is clicked.
// Reads the selected task from the project store and provides
// a form for editing all task fields.
// ============================================================

import { useMemo, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useTeamStore } from '../../stores/teamStore';
import { addMeetingDays } from '../../utils/scheduleUtils';
import { formatDate } from '../../utils/timeUtils';
import type {
  Task,
  Project,
  TaskType,
  TaskStatus,
  TaskPriority,
} from '../../types';

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'subsystem', label: 'Subsystem' },
  { value: 'assembly',  label: 'Assembly' },
  { value: 'task',      label: 'Task' },
  { value: 'milestone', label: 'Milestone' },
];

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'completed',   label: 'Completed'    },
  { value: 'blocked',     label: 'Blocked'      },
  { value: 'deferred',    label: 'Deferred'     },
];

const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low',      label: 'Low' },
  { value: 'normal',   label: 'Normal' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ------------------------------------------------------------
// Form state type — mirrors Task fields we allow editing
// ------------------------------------------------------------

interface TaskForm {
  title: string;
  description: string;
  taskType: TaskType;
  color: string;
  startDate: string;
  hardDeadline: string;
  estimatedDays: number;
  status: TaskStatus;
  priority: TaskPriority;
  completionPercent: number;
  requiredSubteamIds: string[];
  requiredSkillIds: string[];
  assignedMemberIds: string[];
  notes: string;
}

function taskToForm(task: Task): TaskForm {
  return {
    title:              task.title,
    description:        task.description ?? '',
    taskType:           task.taskType,
    color:              task.color ?? '#457B9D',
    startDate:          task.startDate,
    hardDeadline:       task.hardDeadline ?? '',
    estimatedDays:      Math.max(1, task.estimatedDays),
    status:             task.status,
    priority:           task.priority,
    completionPercent:  task.completionPercent,
    requiredSubteamIds: task.requiredSubteamIds,
    requiredSkillIds:   task.requiredSkillIds,
    assignedMemberIds:  task.assignedMemberIds,
    notes:              task.notes,
  };
}

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-5 mb-2">
      {children}
    </h3>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs text-gray-400 mb-1">{children}</label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
    />
  );
}

function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
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
        <FieldLabel>{label}</FieldLabel>
        <p className="text-xs text-gray-500 italic">None defined yet</p>
      </div>
    );
  }
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {allItems.map(item => {
          const selected = selectedIds.includes(item.id);
          const color = getColor?.(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange(
                  selected
                    ? selectedIds.filter(id => id !== item.id)
                    : [...selectedIds, item.id]
                )
              }
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                selected
                  ? 'border-transparent text-white'
                  : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
              }`}
              style={
                selected && color
                  ? { background: color, borderColor: color }
                  : undefined
              }
            >
              {getLabel(item.id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

interface TaskEditorProps {
  task: Task;
  project: Project;
  onClose: () => void;
  /** If provided (for subsystem/assembly tasks), shows an "Add Child Task" button */
  onAddChild?: (parentId: string) => void;
}

export function TaskEditor({ task, project, onClose, onAddChild }: TaskEditorProps) {
  const updateTask = useProjectStore(s => s.updateTask);
  const deleteTask = useProjectStore(s => s.deleteTask);
  const subteams   = useTeamStore(s => s.db.subteams);
  const skills     = useTeamStore(s => s.db.skills);
  const members    = useTeamStore(s => s.db.members);

  const [form, setForm]           = useState<TaskForm>(() => taskToForm(task));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setField = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  // Auto-computed planned end date shown next to estimatedDays
  const plannedEndDate = useMemo(() => {
    if (form.taskType === 'milestone') return form.startDate;
    try {
      return addMeetingDays(form.startDate, Math.max(1, form.estimatedDays), project);
    } catch {
      return form.startDate;
    }
  }, [form.startDate, form.estimatedDays, form.taskType, project]);

  const handleSave = () => {
    const isMilestone = form.taskType === 'milestone';
    updateTask(task.id, {
      title:              form.title.trim() || task.title,
      description:        form.description,
      taskType:           form.taskType,
      color:              form.taskType === 'subsystem' ? form.color : task.color,
      startDate:          form.startDate,
      plannedEndDate,
      hardDeadline:       form.hardDeadline || undefined,
      estimatedDays:      isMilestone ? 0 : form.estimatedDays,
      status:             form.status,
      priority:           form.priority,
      completionPercent:  isMilestone ? 0 : form.completionPercent,
      requiredSubteamIds: form.requiredSubteamIds,
      requiredSkillIds:   form.requiredSkillIds,
      assignedMemberIds:  form.assignedMemberIds,
      notes:              form.notes,
    });
    onClose();
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteTask(task.id);
    onClose();
  };

  // Filter members to those in required subteams (when subteams are selected)
  const filteredMembers = useMemo(() => {
    const active = members.filter(m => m.isActive);
    if (!form.requiredSubteamIds.length) return active;
    return active.filter(m =>
      m.subteamIds.some(sid => form.requiredSubteamIds.includes(sid))
    );
  }, [members, form.requiredSubteamIds]);

  const isMilestone = form.taskType === 'milestone';

  return (
    <div className="w-80 flex flex-col bg-gray-900 border-l border-gray-700 shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-gray-200">Edit Task</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        <SectionHeader>Identity</SectionHeader>

        <div className="mb-3">
          <FieldLabel>Title</FieldLabel>
          <TextInput
            value={form.title}
            onChange={v => setField('title', v)}
            placeholder="Task title"
          />
        </div>

        <div className="mb-3">
          <FieldLabel>Type</FieldLabel>
          <SelectInput
            value={form.taskType}
            onChange={v => setField('taskType', v)}
            options={TASK_TYPES}
          />
        </div>

        {form.taskType === 'subsystem' && (
          <div className="mb-3">
            <FieldLabel>Color</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setField('color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-gray-400 font-mono">{form.color}</span>
            </div>
          </div>
        )}

        <div className="mb-3">
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            rows={2}
            placeholder="Optional description…"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <SectionHeader>Scheduling</SectionHeader>

        <div className="mb-3">
          <FieldLabel>Start Date</FieldLabel>
          <input
            type="date"
            value={form.startDate}
            onChange={e => setField('startDate', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {!isMilestone && (
          <div className="mb-3">
            <FieldLabel>Estimated Meeting Days</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={form.estimatedDays}
                onChange={e =>
                  setField('estimatedDays', Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400">
                → {formatDate(plannedEndDate)}
              </span>
            </div>
          </div>
        )}

        <div className="mb-3">
          <FieldLabel>Hard Deadline (optional)</FieldLabel>
          <input
            type="date"
            value={form.hardDeadline}
            onChange={e => setField('hardDeadline', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <SectionHeader>Status</SectionHeader>

        <div className="mb-3">
          <FieldLabel>Status</FieldLabel>
          <SelectInput
            value={form.status}
            onChange={v => setField('status', v)}
            options={TASK_STATUSES}
          />
        </div>

        <div className="mb-3">
          <FieldLabel>Priority</FieldLabel>
          <SelectInput
            value={form.priority}
            onChange={v => setField('priority', v)}
            options={TASK_PRIORITIES}
          />
        </div>

        {!isMilestone && (
          <div className="mb-3">
            <FieldLabel>Completion: {form.completionPercent}%</FieldLabel>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.completionPercent}
              onChange={e => setField('completionPercent', parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        <SectionHeader>Team</SectionHeader>

        <div className="mb-3">
          <CheckGroup
            label="Required Subteams"
            allItems={subteams}
            selectedIds={form.requiredSubteamIds}
            getLabel={id => subteams.find(s => s.id === id)?.name ?? id}
            getColor={id => subteams.find(s => s.id === id)?.color}
            onChange={ids => setField('requiredSubteamIds', ids)}
          />
        </div>

        <div className="mb-3">
          <CheckGroup
            label="Required Skills"
            allItems={skills}
            selectedIds={form.requiredSkillIds}
            getLabel={id => skills.find(s => s.id === id)?.name ?? id}
            onChange={ids => setField('requiredSkillIds', ids)}
          />
        </div>

        <div className="mb-3">
          <CheckGroup
            label={
              form.requiredSubteamIds.length
                ? 'Assigned Members (filtered by subteam)'
                : 'Assigned Members'
            }
            allItems={filteredMembers}
            selectedIds={form.assignedMemberIds}
            getLabel={id => {
              const m = members.find(m => m.id === id);
              return m ? `${m.firstName} ${m.lastName}` : id;
            }}
            onChange={ids => setField('assignedMemberIds', ids)}
          />
        </div>

        <SectionHeader>Notes</SectionHeader>

        <textarea
          value={form.notes}
          onChange={e => setField('notes', e.target.value)}
          rows={4}
          placeholder="Blockers, references, session notes…"
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />

      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700 flex flex-col gap-2 shrink-0">

        {/* Add Child Task — only for subsystem/assembly types */}
        {onAddChild && (
          <button
            onClick={() => { onAddChild(task.id); }}
            className="w-full px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-left"
          >
            + Add Task inside this {task.taskType}
          </button>
        )}

        <div className="flex items-center justify-between">
        {/* Delete / confirm */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Delete?</span>
            <button
              onClick={handleDeleteClick}
              className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded"
          >
            Delete
          </button>
        )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
            >
              Save
            </button>
          </div>
        </div>{/* end flex items-center justify-between */}

      </div>{/* end footer */}

    </div>
  );
}
