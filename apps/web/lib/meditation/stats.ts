import type {Meditation, MeditationSession} from './schema';
import {addDays, wallClock} from '../zone-time';

/**
 * Meditation figures (Session W Part 5), from the person's own sessions. A session belongs to the day it started in the
 * zone it was lived in. Weeks run Monday to Sunday. Minutes are the sum of the sessions' seconds, rounded once at the
 * end, so "minutes this week" is exact. No score: totals, counts, the longest session and the days in a row, which say
 * nothing about a rest day.
 */
export const sessionDay = (s: Pick<MeditationSession, 'startedAt' | 'timeZone'>) => wallClock(Date.parse(s.startedAt), s.timeZone).date;
const minutes = (seconds: number) => Math.round(seconds / 60);
/** Monday of the week a day falls in. */
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}
export function sessionsOn(m: Meditation, day: string): MeditationSession[] { return m.sessions.filter(s => sessionDay(s) === day); }
/** Minutes on a day, or null when no session was logged that day (never zero for an unlogged day). */
export function minutesOn(m: Meditation, day: string): number | null {
  const on = sessionsOn(m, day);
  return on.length ? minutes(on.reduce((t, s) => t + s.seconds, 0)) : null;
}
export type WeekBar = {weekStart: string; minutes: number; sessions: number};
/** The last `weeks` weeks, the current one last; a week without a session shows 0 sessions and 0 minutes. */
export function weeklyBars(m: Meditation, today: string, weeks = 8): WeekBar[] {
  const current = weekStart(today);
  return Array.from({length: weeks}, (_, i) => {
    const start = addDays(current, (i + 1 - weeks) * 7), end = addDays(start, 6);
    const inWeek = m.sessions.filter(s => { const day = sessionDay(s); return day >= start && day <= end; });
    return {weekStart: start, minutes: minutes(inWeek.reduce((t, s) => t + s.seconds, 0)), sessions: inWeek.length};
  });
}
/** Days in a row with a session, counting back from today (or from yesterday while today has none yet). */
export function daysInARow(m: Meditation, today: string): number {
  const days = new Set(m.sessions.map(sessionDay));
  let day = days.has(today) ? today : addDays(today, -1), count = 0;
  while (days.has(day)) { count++; day = addDays(day, -1); }
  return count;
}
export type MeditationSummary = {sessions: number; totalMinutes: number; longestMinutes: number; thisWeek: number; goal: number | null; daysInARow: number; last: string | null};
export function meditationSummary(m: Meditation, today: string): MeditationSummary {
  const week = weeklyBars(m, today, 1)[0]!, sorted = [...m.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {
    sessions: m.sessions.length, totalMinutes: minutes(m.sessions.reduce((t, s) => t + s.seconds, 0)), longestMinutes: minutes(Math.max(0, ...m.sessions.map(s => s.seconds))),
    thisWeek: week.minutes, goal: m.goal?.minutesPerWeek ?? null, daysInARow: daysInARow(m, today), last: sorted[0] ? sessionDay(sorted[0]) : null,
  };
}
/** "1 h 05 min" above an hour, "12 min" below. */
export function minutesText(total: number): string {
  const h = Math.floor(total / 60), rest = total % 60;
  return h ? `${h} h ${String(rest).padStart(2, '0')} min` : `${rest} min`;
}
