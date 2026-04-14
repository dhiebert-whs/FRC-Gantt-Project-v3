// ============================================================
// FRC Gantt App — Time & Date Display Utilities
// src/utils/timeUtils.ts
//
// All display formatting for times and dates.
// Storage is always 24hr ("15:30") and ISO date ("2026-01-07").
// Display is always 12hr ("3:30 PM") and human-readable.
// ============================================================

import { format, parseISO } from 'date-fns';

// ------------------------------------------------------------
// Time formatting  (24hr stored → 12hr displayed)
// ------------------------------------------------------------

/**
 * Format a stored 24hr time string for display.
 * "15:30" → "3:30 PM"
 * "09:00" → "9:00 AM"
 */
export function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

/**
 * Format a time range for display.
 * ("15:30", "18:30") → "3:30 PM – 6:30 PM"
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

// ------------------------------------------------------------
// Date formatting  (ISO date string → human-readable)
// ------------------------------------------------------------

/**
 * Format an ISO date string for display.
 * "2026-01-07" → "January 7, 2026"
 */
export function formatDate(date: string): string {
  return format(parseISO(date), 'MMMM d, yyyy');
}

/**
 * Format an ISO date string as a short date.
 * "2026-01-07" → "Jan 7"
 */
export function formatDateShort(date: string): string {
  return format(parseISO(date), 'MMM d');
}

/**
 * Format an ISO date string with day of week.
 * "2026-01-07" → "Wednesday, January 7, 2026"
 */
export function formatDateFull(date: string): string {
  return format(parseISO(date), 'EEEE, MMMM d, yyyy');
}

/**
 * Today's date as an ISO string ("2026-01-07").
 */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
