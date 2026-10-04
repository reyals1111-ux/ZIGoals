import {habitCalendarDay, habitRuleOn, logHabitValue, type HabitData, type HabitRule} from '../habits';
import {healthDay} from '../health-daily';
import {FASTING_PRESETS, MAX_CUSTOM_HOURS, MAX_FASTING_SESSIONS, MAX_HOURS, type Fasting, type FastingSession} from './schema';

export {FASTING_PRESETS, MAX_CUSTOM_HOURS, MAX_HOURS};
const HOUR = 3_600_000;
export const runningSession = (data: Fasting): FastingSession | undefined => data.sessions.find(s => s.endedAt === null);
const limitOf = (session: FastingSession) => Date.parse(session.startedAt) + MAX_HOURS * HOUR;
/** Starts a fast: one at a time, a target of 1–18 hours, the Health journal's zone (else the device's). */
export function startFast(data: Fasting, {id, now, targetHours, timeZone, habitId}: {id: string; now: Date; targetHours: number; timeZone: string; habitId?: string}): Fasting {
  if (runningSession(data)) throw Error('A fast is already running.');
  if (!Number.isInteger(targetHours) || targetHours < 1 || targetHours > MAX_CUSTOM_HOURS) throw Error('Choose a target up to 18 hours.');
  if (data.sessions.length >= MAX_FASTING_SESSIONS) throw Error('Your fasting history is full. Remove old sessions to continue.');
  return {...data, sessions: [...data.sessions, {id, startedAt: now.toISOString(), endedAt: null, targetHours, timeZone, ...(habitId ? {habitId} : {})}]};
}
/** The time fasted so far: never negative, never past the 24-hour limit; `clockMovedBack` when the device clock is earlier than the start. */
export function elapsedMs(session: FastingSession, now: Date): {ms: number; clockMovedBack: boolean} {
  const started = Date.parse(session.startedAt), until = session.endedAt === null ? Math.min(now.getTime(), limitOf(session)) : Date.parse(session.endedAt);
  return {ms: Math.max(0, until - started), clockMovedBack: session.endedAt === null && now.getTime() < started};
}
export const autoStopDue = (session: FastingSession, now: Date) => session.endedAt === null && now.getTime() >= limitOf(session);
/** Stops a fast at this instant, never before it started and never past 24 hours. */
export function stopFast(data: Fasting, id: string, now: Date, stoppedBy: 'person' | 'limit' = 'person'): Fasting {
  const session = data.sessions.find(s => s.id === id);
  if (!session || session.endedAt !== null) throw Error('This fast is not running.');
  const endedAt = new Date(Math.max(Date.parse(session.startedAt), Math.min(now.getTime(), limitOf(session)))).toISOString();
  return {...data, sessions: data.sessions.map(s => s.id === id ? {...s, endedAt, stoppedBy} : s)};
}
/** Every running fast past 24 hours ends at exactly 24 hours, noted as stopped by the limit. Returns the same object when nothing was due. */
export function applyAutoStop(data: Fasting, now: Date): Fasting {
  const due = data.sessions.filter(s => autoStopDue(s, now));
  if (!due.length) return data;
  return {...data, sessions: data.sessions.map(s => due.includes(s) ? {...s, endedAt: new Date(limitOf(s)).toISOString(), stoppedBy: 'limit' as const} : s)};
}
export const removeFast = (data: Fasting, id: string): Fasting => ({...data, sessions: data.sessions.filter(s => s.id !== id)});
export type FastingHistoryRow = {session: FastingSession; hours: number; day: string};
/** Ended fasts, newest first: hours to one decimal and the start day in the session's own zone. No totals, no best. */
export function fastingHistory(data: Fasting, limit = 20): FastingHistoryRow[] {
  return data.sessions.filter(s => s.endedAt !== null).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
    .map(session => ({session, hours: Math.round(elapsedMs(session, new Date(session.endedAt!)).ms / HOUR * 10) / 10, day: healthDay(session.timeZone, new Date(session.startedAt))}));
}
/** "3 h 20 min" from milliseconds. */
export function formatFast(ms: number): string { const minutes = Math.floor(ms / 60_000); return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`; }
/** The value a linked duration habit receives: hours to two decimals or whole minutes; 0 when nothing was fasted. */
export function habitLogValue(session: FastingSession, rule: HabitRule): number {
  const ms = elapsedMs(session, new Date(session.endedAt ?? session.startedAt)).ms;
  if (rule.measurement.kind !== 'duration') return 0;
  return rule.measurement.unit === 'hours' ? Math.round(ms / HOUR * 100) / 100 : Math.floor(ms / 60_000);
}
/** Adds a stopped fast's time to its linked duration habit on the habit journal's day of the stop; says why when it cannot. */
export function logFastToHabit(habits: HabitData, session: FastingSession, now = new Date()): {data: HabitData; logged: number | null; reason?: string} {
  if (!session.habitId || session.endedAt === null) return {data: habits, logged: null};
  const habit = habits.habits.find(h => h.id === session.habitId);
  if (!habit) return {data: habits, logged: null, reason: 'That habit is no longer available.'};
  const date = habitCalendarDay(habits, new Date(session.endedAt)), rule = habitRuleOn(habit, date);
  if (!rule) return {data: habits, logged: null, reason: `${habit.title} isn't scheduled today.`};
  const value = habitLogValue(session, rule);
  if (value <= 0) return {data: habits, logged: null};
  try { return {data: logHabitValue(habits, habit.id, date, value, {mode: 'add'}, now), logged: value}; }
  catch { return {data: habits, logged: null, reason: `${habit.title} isn't scheduled today.`}; }
}
