// ============================================================
// FRC Gantt App — TypeScript Type Definitions
// src/types/index.ts
// ============================================================

import { nanoid } from 'nanoid';

// ------------------------------------------------------------
// Shared primitives
// ------------------------------------------------------------

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// ------------------------------------------------------------
// Team Database  (team.json — persists across seasons)
// ------------------------------------------------------------

export interface TeamDatabase {
  version: string;
  updatedAt: string;       // ISO datetime
  subteams: Subteam[];
  skills: Skill[];
  members: TeamMember[];
}

export interface Subteam {
  id: string;
  name: string;            // "Mechanical", "Electrical", "Programming", "Drive Team"
  color: string;           // hex
  description?: string;
}

export interface Skill {
  id: string;
  name: string;            // "CAD (Onshape)", "Welding", "Java", "Wiring", "Pneumatics"
  subteamId?: string;      // primary subteam this skill belongs to (informational)
  description?: string;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  isMentor: boolean;
  grade?: 9 | 10 | 11 | 12;   // omit for mentors
  subteamIds: string[];
  skillIds: string[];
  joinDate: string;            // ISO date
  isActive: boolean;           // false = alumni, kept for history
  notes?: string;              // IEP notes, availability, etc.
}

/** Derived convenience — not stored */
export function memberDisplayName(m: TeamMember): string {
  return `${m.firstName} ${m.lastName}`;
}

// ------------------------------------------------------------
// App Settings  (settings.json — app-wide preferences)
// ------------------------------------------------------------

export type GanttColumnId =
  | 'title'
  | 'assignee'
  | 'status'
  | 'priority'
  | 'startDate'
  | 'endDate'
  | 'estimatedDays'
  | 'completionPercent';

export interface GanttPreferences {
  defaultZoom: 'day' | 'week' | 'month';
  visibleColumns: GanttColumnId[];
  showCriticalPath: boolean;
  showCompletedTasks: boolean;
  highlightToday: boolean;
}

/** Template used to pre-populate SchedulePeriods on new project creation */
export interface SchedulePeriodTemplate {
  label: string;               // "Build Season", "Competition Crunch"
  meetingDays: DayOfWeek[];
  defaultStartTime?: string;   // "15:30" (stored 24hr, displayed 12hr)
  defaultEndTime?: string;     // "18:30"
}

export interface RecentProject {
  filePath: string;
  projectName: string;
  season: string;
  teamNumber: number;
  lastOpened: string;          // ISO datetime
}

export interface AppSettings {
  version: string;
  updatedAt: string;
  recentProjects: RecentProject[];
  defaultScheduleTemplate: SchedulePeriodTemplate[];
  subsystemColorPalette: string[];   // hex values, cycles when adding subsystems
  gantt: GanttPreferences;
  defaultView: 'gantt' | 'daily';
  /** Layout mode. 'auto' detects ClearTouch (touch + screen >= 1920px) vs laptop. */
  displayMode: 'auto' | 'kiosk' | 'desktop';
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  recentProjects: [],
  defaultScheduleTemplate: [
    {
      label: 'Build Season',
      meetingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      defaultStartTime: '15:30',
      defaultEndTime: '18:30',
    },
    {
      label: 'Competition Crunch',
      meetingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      defaultStartTime: '15:30',
      defaultEndTime: '20:00',
    },
  ],
  subsystemColorPalette: [
    '#E63946',  // red
    '#457B9D',  // blue
    '#2A9D8F',  // teal
    '#E9C46A',  // yellow
    '#F4A261',  // orange
    '#8338EC',  // purple
    '#06D6A0',  // green
    '#FB8500',  // amber
  ],
  gantt: {
    defaultZoom: 'week',
    visibleColumns: ['title', 'assignee', 'status', 'estimatedDays'],
    showCriticalPath: false,
    showCompletedTasks: true,
    highlightToday: true,
  },
  defaultView: 'gantt',
  displayMode: 'desktop',
};

// ------------------------------------------------------------
// Project File  (*.frcgantt)
// ------------------------------------------------------------

export interface ProjectFile {
  version: string;           // "1.0"
  savedAt: string;           // ISO datetime
  project: Project;
  tasks: Task[];             // ALL tasks including subsystem group headers
  dependencies: TaskDependency[];
  workSessions: WorkSession[];
  dailyNotes: DailyNote[];
}

// ------------------------------------------------------------
// Project
// ------------------------------------------------------------

export interface SchedulePeriod {
  id: string;
  startDate: string;           // ISO date
  endDate: string;             // ISO date
  meetingDays: DayOfWeek[];
  defaultStartTime?: string;   // "15:30"
  defaultEndTime?: string;     // "18:30"
  notes?: string;
}

export type ScheduleExceptionType = 'cancelled' | 'added' | 'modified';

export interface ScheduleException {
  id: string;
  date: string;                     // ISO date
  type: ScheduleExceptionType;
  reason?: string;                  // "snow day", "school holiday"
  startTime?: string;               // for 'added' / 'modified'
  endTime?: string;
}

export interface Project {
  id: string;
  name: string;                     // "2026 Season — Reefscape"
  teamNumber: number;
  season: string;                   // "2026"
  gameName?: string;                // "Reefscape"
  description?: string;
  startDate: string;                // ISO date — kickoff / first build day
  goalEndDate: string;              // ISO date — target robot completion (soft)
  hardEndDate: string;              // ISO date — competition day (hard deadline)
  schedulePeriods: SchedulePeriod[];
  scheduleExceptions: ScheduleException[];
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Task
// ------------------------------------------------------------

export type TaskType =
  | 'subsystem'    // top-level group (Drivetrain, Intake, etc.) — rendered as summary bar
  | 'assembly'     // major sub-component (Gearbox Assembly, Shooter Flywheel)
  | 'task'         // concrete work item ("Machine frame plates")
  | 'milestone';   // point-in-time marker — no duration, renders as diamond

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'deferred';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: string;
  parentId?: string;               // undefined = top-level; unlimited nesting depth

  // Identity
  taskType: TaskType;
  title: string;
  description?: string;

  // Visual
  color?: string;                  // hex; set on subsystem tasks, inherited in UI
  isExpanded?: boolean;            // persisted view state; defaults: subsystem/assembly=true

  // Scheduling — all durations in MEETING DAYS, not calendar days
  startDate: string;               // ISO date
  plannedEndDate: string;          // ISO date — goal completion
  hardDeadline?: string;           // ISO date — task-specific hard constraint (rare)
  estimatedDays: number;           // planned duration in meeting days
  actualDays?: number;             // filled in on completion

  // Assignment
  requiredSubteamIds: string[];    // "the Mechanical team should handle this"
  requiredSkillIds: string[];      // "someone with CAD skills needed"
  assignedMemberIds: string[];     // "specifically Alex and Jordan"

  // Status
  status: TaskStatus;
  completionPercent: number;       // 0–100
  priority: TaskPriority;

  // Notes
  notes: string;

  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Task Dependency
// ------------------------------------------------------------

/**
 * FS = Finish-to-Start (most common — predecessor must finish before successor starts)
 * SS = Start-to-Start
 * FF = Finish-to-Finish
 * SF = Start-to-Finish (rare)
 *
 * Maps directly to dhtmlxGantt link types "0"/"1"/"2"/"3"
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lagDays: number;    // meeting days; 0=none, positive=gap, negative=overlap
}

// ------------------------------------------------------------
// Work Session & Attendance
// ------------------------------------------------------------

export type SessionType =
  | 'regular'
  | 'extended'
  | 'weekend'
  | 'competition_prep'
  | 'other';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'partial';

export interface AttendanceRecord {
  memberId: string;
  status: AttendanceStatus;
  arrivalTime?: string;      // "15:52" — 24hr stored, 12hr displayed
  departureTime?: string;    // "17:00"
  notes?: string;            // "sick", "has a game", "left for appointment"
}

export interface WorkSession {
  id: string;
  date: string;                    // ISO date
  startTime?: string;              // "15:30"
  endTime?: string;                // "18:30"
  sessionType: SessionType;
  notes?: string;
  attendance: AttendanceRecord[];
}

// ------------------------------------------------------------
// Daily Notes
// ------------------------------------------------------------

export interface DailyNote {
  id: string;
  date: string;
  subteamId?: string;    // undefined = project-level; set = subteam daily summary
  content: string;       // markdown text
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Factory functions (create new entities with defaults)
// ------------------------------------------------------------

export function createTask(overrides: Partial<Task> & Pick<Task, 'title' | 'taskType' | 'startDate' | 'plannedEndDate'>): Task {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    parentId: undefined,
    description: '',
    color: undefined,
    isExpanded: overrides.taskType === 'subsystem' || overrides.taskType === 'assembly',
    hardDeadline: undefined,
    estimatedDays: 1,
    actualDays: undefined,
    requiredSubteamIds: [],
    requiredSkillIds: [],
    assignedMemberIds: [],
    status: 'not_started',
    completionPercent: 0,
    priority: 'normal',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createDependency(
  predecessorId: string,
  successorId: string,
  type: DependencyType = 'FS',
  lagDays = 0
): TaskDependency {
  return { id: nanoid(), predecessorId, successorId, type, lagDays };
}

export function createWorkSession(date: string, overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: nanoid(),
    date,
    sessionType: 'regular',
    attendance: [],
    ...overrides,
  };
}

export function createDailyNote(date: string, subteamId?: string): DailyNote {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    date,
    subteamId,
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function createProject(overrides: Partial<Project> & Pick<Project, 'name' | 'teamNumber' | 'season' | 'startDate' | 'goalEndDate' | 'hardEndDate'>): Project {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    gameName: undefined,
    description: '',
    schedulePeriods: [],
    scheduleExceptions: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createProjectFile(project: Project): ProjectFile {
  return {
    version: '1.0',
    savedAt: new Date().toISOString(),
    project,
    tasks: [],
    dependencies: [],
    workSessions: [],
    dailyNotes: [],
  };
}

// ------------------------------------------------------------
// dhtmlxGantt Adapter Types
// (keep these separate from domain types — they're library-specific)
// ------------------------------------------------------------

export interface GanttTask {
  id: string;
  text: string;
  start_date: string;          // "2026-01-07 00:00"
  duration: number;            // calendar days (NOT meeting days)
  parent: string | 0;
  progress: number;            // 0.0 – 1.0
  open: boolean;
  readonly?: boolean;
  type?: 'task' | 'project' | 'milestone';
  // Custom fields — prefix with $ to avoid dhtmlx internal conflicts
  $color?: string;
  $status?: TaskStatus;
  $priority?: TaskPriority;
  $taskType?: TaskType;
  $assignedMemberIds?: string[];
  $estimatedDays?: number;
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: '0' | '1' | '2' | '3';
  lag?: number;                // calendar days
}

export const DEP_TYPE_TO_GANTT: Record<DependencyType, GanttLink['type']> = {
  FS: '0',
  SS: '1',
  FF: '2',
  SF: '3',
};

export const GANTT_TO_DEP_TYPE: Record<string, DependencyType> = {
  '0': 'FS',
  '1': 'SS',
  '2': 'FF',
  '3': 'SF',
};