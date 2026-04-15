// ============================================================
// FRC Gantt App — Daily View (Phase 4)
// src/components/DailyView/index.tsx
// ============================================================

import { useState, useEffect } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { useProjectStore } from '../../stores/projectStore';
import { useTeamStore } from '../../stores/teamStore';
import {
  isMeetingDay,
  countMeetingDays,
  nextMeetingDay,
  prevMeetingDay,
} from '../../utils/scheduleUtils';
import { formatDateFull, formatDateShort, todayISO } from '../../utils/timeUtils';
import { createWorkSession, createDailyNote } from '../../types';
import type { Task, AttendanceStatus, AttendanceRecord, TeamMember } from '../../types';

// ---- Attendance status display config ----

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-600 text-white',
  late:    'bg-yellow-500 text-black',
  absent:  'bg-red-600 text-white',
  excused: 'bg-blue-600 text-white',
  partial: 'bg-orange-500 text-white',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late:    'Late',
  absent:  'Absent',
  excused: 'Excused',
  partial: 'Partial',
};

const ALL_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused', 'partial'];

// ---- Main component ----

export function DailyView() {
  const projectFile      = useProjectStore(s => s.projectFile);
  const subsystemLookup  = useProjectStore(s => s.subsystemLookup);
  const updateTask       = useProjectStore(s => s.updateTask);
  const addWorkSession   = useProjectStore(s => s.addWorkSession);
  const updateAttendance = useProjectStore(s => s.updateAttendance);
  const addDailyNote     = useProjectStore(s => s.addDailyNote);
  const updateDailyNote  = useProjectStore(s => s.updateDailyNote);

  const members  = useTeamStore(s => s.db.members);
  const subteams = useTeamStore(s => s.db.subteams);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [notesTab, setNotesTab]         = useState<string | undefined>(undefined);
  const [localNote, setLocalNote]       = useState<string>('');

  const project      = projectFile?.project ?? null;
  const tasks        = projectFile?.tasks ?? [];
  const workSessions = projectFile?.workSessions ?? [];
  const dailyNotes   = projectFile?.dailyNotes ?? [];

  // Initialize selectedDate when project loads or changes
  useEffect(() => {
    if (!project) { setSelectedDate(''); return; }
    const today = todayISO();
    setSelectedDate(isMeetingDay(today, project) ? today : nextMeetingDay(today, project));
    setNotesTab(undefined);
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync note textarea when date or tab changes (intentionally omit dailyNotes
  // to avoid overwriting in-progress typing on unrelated store updates)
  useEffect(() => {
    const note = dailyNotes.find(n => n.date === selectedDate && n.subteamId === notesTab);
    setLocalNote(note?.content ?? '');
  }, [selectedDate, notesTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- No-project state ----
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No project open. Create or open a project to get started.
      </div>
    );
  }

  if (!selectedDate) return null; // brief flash during initialization

  // ---- Navigation helpers ----
  const prevNavDate = prevMeetingDay(
    format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd'),
    project,
  );
  const nextNavDate = nextMeetingDay(
    format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'),
    project,
  );
  // Disable prev if we'd go before project start or couldn't find a meeting day
  const hasPrev = prevNavDate >= project.startDate && prevNavDate < selectedDate;
  const hasNext = nextNavDate <= project.hardEndDate && nextNavDate > selectedDate;

  function navigatePrev() { if (hasPrev) setSelectedDate(prevNavDate); }
  function navigateNext() { if (hasNext) setSelectedDate(nextNavDate); }
  function navigateToday() {
    if (!project) return;
    const today = todayISO();
    setSelectedDate(isMeetingDay(today, project) ? today : nextMeetingDay(today, project));
  }

  // ---- Build day counter ----
  const buildDayN     = countMeetingDays(project.startDate, selectedDate, project);
  const buildDayTotal = countMeetingDays(project.startDate, project.hardEndDate, project);
  const daysLeft      = countMeetingDays(selectedDate, project.hardEndDate, project);
  const isToday       = selectedDate === todayISO();

  // ---- Today's tasks — leaf tasks only, grouped by root ancestor ----
  // A "leaf" task is one that has no children — only leaves represent active work.
  // Parent tasks are containers whose completion% is calculated from their children.
  const parentIdSet = new Set(
    tasks.map(t => t.parentId).filter(Boolean) as string[],
  );
  const activeTasks = tasks.filter(t =>
    !parentIdSet.has(t.id) &&
    t.startDate <= selectedDate &&
    t.plannedEndDate >= selectedDate,
  );

  type TaskGroup = {
    subsystemId: string | undefined;
    subsystemTask: Task | undefined;
    tasks: Task[];
  };
  const groupMap = new Map<string, TaskGroup>();
  for (const t of activeTasks) {
    const subsystemId = subsystemLookup.get(t.id) ?? '__ungrouped__';
    if (!groupMap.has(subsystemId)) {
      groupMap.set(subsystemId, {
        subsystemId: subsystemId === '__ungrouped__' ? undefined : subsystemId,
        subsystemTask: subsystemId !== '__ungrouped__'
          ? tasks.find(s => s.id === subsystemId)
          : undefined,
        tasks: [],
      });
    }
    groupMap.get(subsystemId)!.tasks.push(t);
  }
  const taskGroups = Array.from(groupMap.values());

  // ---- Attendance ----
  const session      = workSessions.find(s => s.date === selectedDate) ?? null;
  const activeMembers = members.filter(m => m.isActive);

  function handleStartSession() {
    const period = project!.schedulePeriods.find(
      p => p.startDate <= selectedDate && selectedDate <= p.endDate,
    );
    addWorkSession(createWorkSession(selectedDate, {
      startTime: period?.defaultStartTime,
      endTime:   period?.defaultEndTime,
    }));
  }

  function getRecord(memberId: string): AttendanceRecord | undefined {
    return session?.attendance.find(a => a.memberId === memberId);
  }

  function setMemberStatus(memberId: string, status: AttendanceStatus) {
    if (!session) return;
    const existing = getRecord(memberId);
    updateAttendance(session.id, memberId, {
      memberId,
      status,
      // Keep times only when status needs them; clear when switching away
      arrivalTime:   (status === 'late' || status === 'partial') ? existing?.arrivalTime   : undefined,
      departureTime: status === 'partial'                        ? existing?.departureTime : undefined,
      notes:         existing?.notes,
    });
  }

  function updateRecordTimes(memberId: string, changes: Pick<AttendanceRecord, 'arrivalTime' | 'departureTime'>) {
    if (!session) return;
    const existing = getRecord(memberId);
    if (!existing) return;
    updateAttendance(session.id, memberId, { ...existing, ...changes });
  }

  // Group active members by primary subteam
  type MemberGroup = { subteamId: string | undefined; name: string; color: string | undefined; members: TeamMember[] };
  const memberGroupMap = new Map<string, MemberGroup>();
  for (const m of activeMembers) {
    const stId = m.subteamIds[0] ?? '__none__';
    if (!memberGroupMap.has(stId)) {
      const st = subteams.find(s => s.id === stId);
      memberGroupMap.set(stId, {
        subteamId: stId === '__none__' ? undefined : stId,
        name:  st?.name  ?? 'Unassigned',
        color: st?.color ?? undefined,
        members: [],
      });
    }
    memberGroupMap.get(stId)!.members.push(m);
  }
  const memberGroups = Array.from(memberGroupMap.values());

  function countPresent(groupMembers: TeamMember[]): number {
    return groupMembers.filter(m => {
      const r = getRecord(m.id);
      return r?.status === 'present' || r?.status === 'late' || r?.status === 'partial';
    }).length;
  }

  // ---- Notes ----
  function handleNoteBlur() {
    const existing = dailyNotes.find(n => n.date === selectedDate && n.subteamId === notesTab);
    if (existing) {
      if (localNote !== existing.content) {
        updateDailyNote(existing.id, localNote);
      }
    } else if (localNote.trim()) {
      addDailyNote({ ...createDailyNote(selectedDate, notesTab), content: localNote });
    }
  }

  const notesTabLabel = notesTab === undefined
    ? 'Project'
    : (subteams.find(s => s.id === notesTab)?.name ?? 'Subteam');

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">

      {/* ---- Header: date navigation + counters ---- */}
      <div className="flex flex-col items-center px-4 pt-3 pb-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            disabled={!hasPrev}
            className="flex items-center gap-1 px-3 py-1 kiosk:py-2.5 text-sm kiosk:text-base rounded text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ←{hasPrev ? ` ${formatDateShort(prevNavDate)}` : ''}
          </button>

          <div className="text-center min-w-[260px] kiosk:min-w-[340px]">
            <div className="text-lg kiosk:text-2xl font-semibold leading-tight">
              {formatDateFull(selectedDate)}
              {isToday && (
                <span className="ml-2 text-xs kiosk:text-sm font-normal text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
          </div>

          <button
            onClick={navigateNext}
            disabled={!hasNext}
            className="flex items-center gap-1 px-3 py-1 kiosk:py-2.5 text-sm kiosk:text-base rounded text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {hasNext ? `${formatDateShort(nextNavDate)} ` : ''}→
          </button>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs kiosk:text-sm text-gray-400">
          <span>Build Day {buildDayN} of {buildDayTotal}</span>
          <span className="text-gray-700">|</span>
          <span className={daysLeft <= 5 ? 'text-red-400' : daysLeft <= 10 ? 'text-amber-400' : ''}>
            {daysLeft} meeting day{daysLeft !== 1 ? 's' : ''} to deadline
          </span>
          {!isToday && (
            <>
              <span className="text-gray-700">|</span>
              <button
                onClick={navigateToday}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Go to Today
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---- Body: tasks + attendance ---- */}
      <div className="flex flex-1 overflow-hidden">

        {/* Tasks panel */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-800">
          <div className="px-4 py-2 border-b border-gray-800 shrink-0">
            <h2 className="text-sm kiosk:text-base font-semibold text-gray-300">
              Today's Tasks
              <span className="ml-2 font-normal text-xs text-gray-500">
                ({activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''})
              </span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {taskGroups.length === 0 ? (
              <p className="text-sm text-gray-600 mt-6 text-center">
                No tasks scheduled for this day.
              </p>
            ) : (
              taskGroups.map(group => (
                <TaskGroupSection
                  key={group.subsystemId ?? '__ungrouped__'}
                  group={group}
                  members={members}
                  onToggleComplete={(task) => {
                    const isDone = task.completionPercent === 100 && task.status === 'completed';
                    updateTask(task.id, {
                      completionPercent: isDone ? 0 : 100,
                      status: isDone ? 'not_started' : 'completed',
                    });
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Attendance panel */}
        <div className="w-72 kiosk:w-[380px] flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-2 border-b border-gray-800 shrink-0">
            <h2 className="text-sm kiosk:text-base font-semibold text-gray-300">Attendance</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {!session ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <p className="text-xs text-gray-500 text-center">No session recorded for this day.</p>
                <button
                  onClick={handleStartSession}
                  className="px-4 py-1.5 kiosk:py-3 text-sm kiosk:text-base bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors"
                >
                  Start Session
                </button>
              </div>
            ) : activeMembers.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4 text-center">No active team members.</p>
            ) : (
              <div className="space-y-4">
                {memberGroups.map(({ subteamId, name, color, members: grpMembers }) => {
                  const present = countPresent(grpMembers);
                  return (
                    <div key={subteamId ?? '__none__'}>
                      {/* Subteam header */}
                      <div className="flex items-center gap-2 mb-1.5">
                        {color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        <span className="text-xs kiosk:text-sm font-semibold text-gray-300">
                          {name}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {present}/{grpMembers.length}
                        </span>
                      </div>
                      {/* Members */}
                      <div className="space-y-2 ml-4">
                        {grpMembers.map(m => (
                          <MemberAttendanceRow
                            key={m.id}
                            member={m}
                            record={getRecord(m.id)}
                            onSetStatus={(status) => setMemberStatus(m.id, status)}
                            onUpdateTimes={(changes) => updateRecordTimes(m.id, changes)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Notes footer ---- */}
      <div className="h-44 kiosk:h-56 border-t border-gray-800 shrink-0 flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-gray-800 overflow-x-auto shrink-0">
          <button
            onClick={() => setNotesTab(undefined)}
            className={`px-3 py-1.5 kiosk:py-2.5 text-xs kiosk:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors ${
              notesTab === undefined
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Project Notes
          </button>
          {subteams.map(st => (
            <button
              key={st.id}
              onClick={() => setNotesTab(st.id)}
              className={`px-3 py-1.5 kiosk:py-2.5 text-xs kiosk:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                notesTab === st.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={localNote}
          onChange={e => setLocalNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder={`${notesTabLabel} notes for ${formatDateShort(selectedDate)}…`}
          className="flex-1 w-full bg-transparent text-sm kiosk:text-base text-gray-200 placeholder-gray-600 resize-none p-3 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================
// TaskGroupSection — one subsystem block in the tasks panel
// ============================================================

interface TaskGroupSectionProps {
  group: {
    subsystemId: string | undefined;
    subsystemTask: Task | undefined;
    tasks: Task[];
  };
  members: TeamMember[];
  onToggleComplete: (task: Task) => void;
}

function TaskGroupSection({ group, members, onToggleComplete }: TaskGroupSectionProps) {
  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 mb-1.5">
        {group.subsystemTask?.color && (
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: group.subsystemTask.color }}
          />
        )}
        <span className="text-xs kiosk:text-sm font-semibold text-gray-300">
          {group.subsystemTask?.title ?? 'Ungrouped'}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-1 ml-5">
        {group.tasks.map(task => {
          const isDone    = task.status === 'completed';
          const isBlocked = task.status === 'blocked';
          const assigned  = task.assignedMemberIds
            .map(id => members.find(m => m.id === id)?.firstName)
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={task.id}
              className={`flex items-start gap-2 px-2 py-1 kiosk:py-1.5 rounded ${
                isBlocked
                  ? 'bg-red-900/30 border border-red-700/50'
                  : 'hover:bg-gray-800/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => onToggleComplete(task)}
                className="mt-0.5 w-4 h-4 kiosk:w-5 kiosk:h-5 rounded accent-blue-500 cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`block text-sm kiosk:text-base truncate ${
                    isDone ? 'line-through text-gray-500' : 'text-gray-200'
                  }`}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {assigned && (
                    <span className="text-xs text-gray-500">{assigned}</span>
                  )}
                  {isBlocked && (
                    <span className="text-xs text-red-400 font-medium">Blocked</span>
                  )}
                </div>
              </div>
              {task.completionPercent > 0 && !isDone && (
                <span className="text-xs text-blue-400 shrink-0">{task.completionPercent}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MemberAttendanceRow — one team member in the attendance panel
// ============================================================

interface MemberAttendanceRowProps {
  member: TeamMember;
  record: AttendanceRecord | undefined;
  onSetStatus: (status: AttendanceStatus) => void;
  onUpdateTimes: (changes: Pick<AttendanceRecord, 'arrivalTime' | 'departureTime'>) => void;
}

function MemberAttendanceRow({ member, record, onSetStatus, onUpdateTimes }: MemberAttendanceRowProps) {
  const status       = record?.status;
  const showArrival  = status === 'late' || status === 'partial';
  const showDepart   = status === 'partial';

  return (
    <div className="flex flex-col gap-1">
      {/* Name + status buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs kiosk:text-sm text-gray-300 w-[72px] kiosk:w-[88px] shrink-0 truncate">
          {member.firstName}
        </span>
        <div className="flex gap-0.5 flex-wrap">
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => onSetStatus(s)}
              className={`px-1.5 py-0.5 kiosk:py-1.5 kiosk:px-2 text-[10px] kiosk:text-xs rounded font-medium transition-colors ${
                status === s
                  ? STATUS_COLORS[s]
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Time inputs for late / partial */}
      {(showArrival || showDepart) && (
        <div className="flex gap-3 ml-[80px] kiosk:ml-[96px] text-xs kiosk:text-sm text-gray-400">
          {showArrival && (
            <label className="flex items-center gap-1">
              Arrival
              <input
                type="time"
                value={record?.arrivalTime ?? ''}
                onChange={e => onUpdateTimes({
                  arrivalTime:   e.target.value || undefined,
                  departureTime: record?.departureTime,
                })}
                className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 kiosk:py-1 text-gray-200 text-xs kiosk:text-sm"
              />
            </label>
          )}
          {showDepart && (
            <label className="flex items-center gap-1">
              Departure
              <input
                type="time"
                value={record?.departureTime ?? ''}
                onChange={e => onUpdateTimes({
                  arrivalTime:   record?.arrivalTime,
                  departureTime: e.target.value || undefined,
                })}
                className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 kiosk:py-1 text-gray-200 text-xs kiosk:text-sm"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
