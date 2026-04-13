// ============================================================
// FRC Gantt App — Schedule Utilities
// src/utils/scheduleUtils.ts
//
// All calendar math involving meeting days vs. calendar days.
// Build and TEST THESE FIRST — they underpin every scheduled
// end date in the Gantt chart and all report date calculations.
// ============================================================

import { addDays, format, parseISO, differenceInCalendarDays, getDay } from 'date-fns';
import type { Project, SchedulePeriod, ScheduleException, DayOfWeek } from '../types';

// Map JS getDay() return values (0=Sun … 6=Sat) to DayOfWeek strings
const JS_DAY_TO_DOW: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

// ------------------------------------------------------------
// Core: is a given calendar date a meeting day?
// ------------------------------------------------------------

/**
 * Returns true if the given ISO date is a meeting day per the project schedule.
 * Checks exceptions first, then falls back to the period definition.
 */
export function isMeetingDay(date: string, project: Project): boolean {
  // 1. Check exceptions — they override everything
  const exception = project.scheduleExceptions.find(e => e.date === date);
  if (exception) {
    if (exception.type === 'cancelled') return false;
    if (exception.type === 'added')     return true;
    // 'modified' means it IS a meeting day (just different times)
    if (exception.type === 'modified')  return true;
  }

  // 2. Find which schedule period this date falls in
  const period = findPeriodForDate(date, project.schedulePeriods);
  if (!period) return false;

  // 3. Check if this weekday is in the period's meeting days
  const dow = JS_DAY_TO_DOW[getDay(parseISO(date))];
  return period.meetingDays.includes(dow);
}

/**
 * Find the schedule period that contains the given date, if any.
 */
function findPeriodForDate(date: string, periods: SchedulePeriod[]): SchedulePeriod | undefined {
  return periods.find(p => p.startDate <= date && date <= p.endDate);
}

// ------------------------------------------------------------
// Core: count meeting days in a range
// ------------------------------------------------------------

/**
 * Count how many meeting days fall between startDate and endDate (inclusive).
 */
export function countMeetingDays(
  startDate: string,
  endDate: string,
  project: Project,
): number {
  let count = 0;
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (current <= end) {
    if (isMeetingDay(format(current, 'yyyy-MM-dd'), project)) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

// ------------------------------------------------------------
// Core: advance N meeting days from a start date
// ------------------------------------------------------------

/**
 * Given a start date, return the date that is exactly `meetingDays`
 * meeting days later (the end date of a task).
 *
 * If estimatedDays = 1, the task starts and ends on the same meeting day.
 * If estimatedDays = 2, it ends on the next meeting day.
 */
export function addMeetingDays(
  startDate: string,
  meetingDays: number,
  project: Project,
): string {
  if (meetingDays <= 0) return startDate;

  let remaining = meetingDays - 1;  // startDate counts as day 1
  let current = parseISO(startDate);

  while (remaining > 0) {
    current = addDays(current, 1);
    if (isMeetingDay(format(current, 'yyyy-MM-dd'), project)) {
      remaining--;
    }
  }
  return format(current, 'yyyy-MM-dd');
}

// ------------------------------------------------------------
// Core: convert calendar span back to meeting days
// (used when dhtmlxGantt fires an update after drag-and-drop)
// ------------------------------------------------------------

/**
 * Given a start date and a number of calendar days (from dhtmlxGantt's duration),
 * count how many meeting days that span contains.
 */
export function calendarDaysToMeetingDays(
  startDate: string,
  calendarDays: number,
  project: Project,
): number {
  if (calendarDays <= 0) return 0;
  const endDate = format(addDays(parseISO(startDate), calendarDays - 1), 'yyyy-MM-dd');
  return countMeetingDays(startDate, endDate, project);
}

/**
 * Convert meeting days to a calendar day count suitable for dhtmlxGantt's `duration`.
 * dhtmlxGantt needs calendar days, not meeting days.
 */
export function meetingDaysToCalendarDays(
  startDate: string,
  meetingDays: number,
  project: Project,
): number {
  if (meetingDays <= 0) return 1;
  const endDate = addMeetingDays(startDate, meetingDays, project);
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
}

// ------------------------------------------------------------
// List all meeting days in a range (for daily view, attendance UI)
// ------------------------------------------------------------

/**
 * Returns an array of ISO date strings for every meeting day in the range.
 */
export function getMeetingDaysInRange(
  startDate: string,
  endDate: string,
  project: Project,
): string[] {
  const days: string[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (current <= end) {
    const iso = format(current, 'yyyy-MM-dd');
    if (isMeetingDay(iso, project)) {
      days.push(iso);
    }
    current = addDays(current, 1);
  }
  return days;
}

// ------------------------------------------------------------
// Next / previous meeting day
// ------------------------------------------------------------

/**
 * Starting from date, walk forward to find the next (or same) meeting day.
 * If the given date is already a meeting day, returns it unchanged.
 */
export function nextMeetingDay(date: string, project: Project): string {
  let current = parseISO(date);
  for (let i = 0; i < 365; i++) {
    const iso = format(current, 'yyyy-MM-dd');
    if (isMeetingDay(iso, project)) return iso;
    current = addDays(current, 1);
  }
  return date; // fallback — no meeting days found in a year (shouldn't happen)
}

// ------------------------------------------------------------
// Meeting days remaining
// ------------------------------------------------------------

/**
 * How many meeting days are left from today (or a given date) until the hard deadline?
 */
export function meetingDaysRemaining(
  project: Project,
  fromDate: string = format(new Date(), 'yyyy-MM-dd'),
): number {
  return countMeetingDays(fromDate, project.hardEndDate, project);
}