// src/components/TaskDialog/index.tsx
// Task create/edit modal. Backdrop, focus trap, and Escape are handled by ModalHost.

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { useModalStore } from '../../stores/modalStore';
import { createTask } from '../../types';
import type { Task, Project } from '../../types';
import { TaskFormFields } from './TaskFormFields';
import {
  taskToForm,
  validateTaskForm,
  computePlannedEndDate,
} from './taskFormUtils';
import type { TaskForm, TaskFormErrors } from './taskFormUtils';

interface TaskDialogProps {
  task: Task;
  project: Project;
  onClose: () => void;
}

export function TaskDialog({ task, project, onClose }: TaskDialogProps) {
  const updateTask     = useProjectStore(s => s.updateTask);
  const deleteTask     = useProjectStore(s => s.deleteTask);
  const addTask        = useProjectStore(s => s.addTask);
  const openEditTask   = useModalStore(s => s.openEditTask);

  const [form, setForm]           = useState<TaskForm>(() => taskToForm(task));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors]       = useState<TaskFormErrors>({});

  const setField = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  function handleSave() {
    const errs = validateTaskForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const isMilestone = form.taskType === 'milestone';
    const plannedEndDate = computePlannedEndDate(form.startDate, form.estimatedDays, form.taskType, project);
    updateTask(task.id, {
      title:              form.title.trim(),
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
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteTask(task.id);
    onClose();
  }

  function handleAddChild() {
    const startDate = task.startDate;
    const newTask = createTask({
      id:             nanoid(),
      title:          'New Task',
      taskType:       'task',
      parentId:       task.id,
      startDate,
      plannedEndDate: computePlannedEndDate(startDate, 3, 'task', project),
      estimatedDays:  3,
    });
    addTask(newTask);
    openEditTask(newTask.id);
  }

  const canHaveChildren = task.taskType !== 'milestone';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg kiosk:max-w-xl max-h-[90vh] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 kiosk:py-4 border-b border-gray-700 shrink-0">
        <span className="text-sm kiosk:text-base font-semibold text-gray-200">
          Edit Task
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl kiosk:text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Form fields */}
      <TaskFormFields
        form={form}
        setField={setField}
        project={project}
        errors={errors}
      />

      {/* Footer */}
      <div className="px-4 kiosk:px-5 py-3 kiosk:py-4 border-t border-gray-700 flex flex-col gap-2 shrink-0">

        {canHaveChildren && (
          <button
            onClick={handleAddChild}
            className="w-full px-3 py-1.5 kiosk:py-3 text-sm kiosk:text-base bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-left"
          >
            + Add Task inside this {task.taskType}
          </button>
        )}

        <div className="flex items-center justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete this task?</span>
              <button
                onClick={handleDelete}
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
              onClick={handleDelete}
              className="px-3 py-1.5 kiosk:py-3 text-sm kiosk:text-base text-red-400 hover:text-red-300 hover:bg-gray-800 rounded"
            >
              Delete
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 kiosk:py-3 kiosk:px-4 text-sm kiosk:text-base bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 kiosk:py-3 kiosk:px-4 text-sm kiosk:text-base bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
