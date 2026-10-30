import {addLocalDays} from '../local-date';
import {focusSessionSchema, MAX_SESSIONS, type FocusSessionEntry, type FocusSessions} from './schema';

/**
 * Session AJ (item 34, D13): the rules of a Focus Session. The web cannot block other apps, so ZIGoals only notices when
 * its page is hidden (the browser's visibility signal) and counts that time as away. A session grows when it ran its full
 * length and the time away stayed within a tenth of it (at most 3 minutes); otherwise it withers, and is kept either way.
 */
export const AWAY_SHARE = 0.1, AWAY_CAP_SECONDS = 180, MIN_SECONDS = 60;
export type Tally = {startedAt: number; plannedMinutes: number; focused: number; away: number; hiddenSince: number | null};
export const startTally = (now: number, plannedMinutes: number): Tally => ({startedAt: now, plannedMinutes, focused: 0, away: 0, hiddenSince: null});
/** The tally after the page was hidden or shown at `now` (seconds since start split into focused and away). */
export function onVisibility(t: Tally, hidden: boolean, now: number): Tally {
  if (hidden && t.hiddenSince === null) return {...t, hiddenSince: now};
  if (!hidden && t.hiddenSince !== null) return {...t, away: t.away + (now - t.hiddenSince) / 1000, hiddenSince: null};
  return t;
}
/** Seconds elapsed, focused and away as of `now`. */
export function tallyAt(t: Tally, now: number): {elapsed: number; away: number; focused: number} {
  const elapsed = Math.max(0, (now - t.startedAt) / 1000), away = t.away + (t.hiddenSince !== null ? (now - t.hiddenSince) / 1000 : 0);
  return {elapsed, away, focused: Math.max(0, elapsed - away)};
}
export function outcomeOf(t: Tally, now: number, endedEarly: boolean): 'grown' | 'withered' {
  const {away} = tallyAt(t, now), allowed = Math.min(AWAY_CAP_SECONDS, t.plannedMinutes * 60 * AWAY_SHARE);
  return !endedEarly && away <= allowed ? 'grown' : 'withered';
}
/** The finished session as an entry, or null when it lasted under a minute (nothing is kept then). */
export function finishTally(t: Tally, now: number, endedEarly: boolean, day: string, id: string, goalId?: string): FocusSessionEntry | null {
  const {elapsed, away, focused} = tallyAt(t, now);
  if (elapsed < MIN_SECONDS) return null;
  return focusSessionSchema.parse({id, startedAt: new Date(t.startedAt).toISOString(), endedAt: new Date(now).toISOString(), day, plannedMinutes: t.plannedMinutes,
    focusedSeconds: Math.min(4 * 3600, Math.round(focused)), awaySeconds: Math.min(24 * 3600, Math.round(away)), outcome: outcomeOf(t, now, endedEarly), ...(goalId ? {goalId} : {})});
}
export function addSession(record: FocusSessions, entry: FocusSessionEntry): FocusSessions {
  if (record.sessions.some(s => s.id === entry.id)) return record;
  return {...record, sessions: [...record.sessions, focusSessionSchema.parse(entry)].slice(-MAX_SESSIONS)};
}
export const newFocusId = () => `focus_${crypto.randomUUID()}`;
export type Garden = {grown: number; withered: number; weekMinutes: number; weekSessions: number};
/** The garden's counts, and the last 7 days' focused minutes (the Life review's weekly line). */
export function gardenOf(record: FocusSessions, today: string): Garden {
  const from = addLocalDays(today, -6), week = record.sessions.filter(s => s.day >= from && s.day <= today);
  return {grown: record.sessions.filter(s => s.outcome === 'grown').length, withered: record.sessions.filter(s => s.outcome === 'withered').length,
    weekMinutes: Math.round(week.reduce((t, s) => t + s.focusedSeconds, 0) / 60), weekSessions: week.length};
}
/** Focused minutes between two days (inclusive), for a review period. */
export function focusMinutesBetween(record: FocusSessions, from: string, to: string): {minutes: number; sessions: number} {
  const list = record.sessions.filter(s => s.day >= from && s.day <= to);
  return {minutes: Math.round(list.reduce((t, s) => t + s.focusedSeconds, 0) / 60), sessions: list.length};
}
export type {FocusSessionEntry};
