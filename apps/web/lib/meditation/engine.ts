import {bellPrefsSchema, meditationGoalSchema, meditationSchema, meditationSessionSchema, type BellPrefs, type Meditation, type MeditationSession} from './schema';
import {addDays, instantAt, wallClock} from '../zone-time';

/**
 * Meditation edits (Session W Part 5): each returns a new, validated group for Health v4 `meditation`. Timer and
 * breathing sessions come from lib/meditation/timer.ts; a manual entry ("mindful minutes") is a start time and minutes;
 * an import keeps its own deterministic id and source. Nothing here is advice.
 */
export const newSessionId = () => `health_med-${crypto.randomUUID()}`;
const parse = (m: Meditation) => meditationSchema.parse(m);
export function addSession(m: Meditation, session: MeditationSession): Meditation {
  if (m.sessions.some(s => s.id === session.id)) return m;
  return parse({...m, sessions: [...m.sessions, meditationSessionSchema.parse(session)]});
}
export type ManualInput = {id?: string; date: string; time: string; minutes: number; note?: string; timeZone: string};
/** Logs or edits mindful minutes typed by the person; a session that would end in the future is refused. */
export function saveManual(m: Meditation, input: ManualInput, at: Date): Meditation {
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 1440) throw Error('Enter whole minutes from 1 to 1440.');
  const start = instantAt(input.date, input.time, input.timeZone), held = input.id ? m.sessions.find(s => s.id === input.id) : undefined;
  if (input.id && !held) throw Error('This session is no longer here.');
  if (start + input.minutes * 60_000 > at.getTime() + 60_000) throw Error('A session cannot end in the future.');
  const now = at.toISOString();
  const session = meditationSessionSchema.parse({
    ...(held ?? {kind: 'manual', source: 'manual', createdAt: now}), id: held?.id ?? input.id ?? newSessionId(), startedAt: new Date(start).toISOString(), seconds: input.minutes * 60,
    timeZone: input.timeZone, ...(input.note?.trim() ? {note: input.note.trim()} : {note: undefined}), updatedAt: now,
  });
  const clean = JSON.parse(JSON.stringify(session)) as MeditationSession;
  return parse({...m, sessions: held ? m.sessions.map(s => s.id === clean.id ? clean : s) : [...m.sessions, clean]});
}
/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #415, Medito's past sessions): "Several days" — one manual session a day
 * from `from` to `to` (at most 31 days), each at the same time and length. A day that already has a session starting at
 * that time is skipped, and so is a day whose session would end in the future; the ids written come back so one Undo
 * takes them all away. Ordinary sessions in the strict group: no new field.
 */
export const MAX_RANGE_DAYS = 31;
export type RangeInput = {from: string; to: string; time: string; minutes: number; note?: string; timeZone: string};
export function saveManualRange(m: Meditation, input: RangeInput, at: Date): {meditation: Meditation; added: string[]; skipped: string[]} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)) throw Error('Choose the first and the last day.');
  if (input.to < input.from) throw Error('The last day comes on or after the first.');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw Error('Enter the time you began.');
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 1440) throw Error('Enter whole minutes from 1 to 1440.');
  const days: string[] = [];
  for (let d = input.from; d <= input.to; d = addDays(d, 1)) { days.push(d); if (days.length > MAX_RANGE_DAYS) throw Error(`Choose at most ${MAX_RANGE_DAYS} days.`); }
  let next = m; const added: string[] = [], skipped: string[] = [];
  for (const day of days) {
    const start = instantAt(day, input.time, input.timeZone);
    const taken = next.sessions.some(s => { const w = wallClock(Date.parse(s.startedAt), s.timeZone); return w.date === day && w.clock === input.time; });
    if (taken || start + input.minutes * 60_000 > at.getTime() + 60_000) { skipped.push(day); continue; }
    next = saveManual(next, {date: day, time: input.time, minutes: input.minutes, note: input.note, timeZone: input.timeZone}, at);
    added.push(next.sessions.at(-1)!.id);
  }
  return {meditation: next, added, skipped};
}
/** Undo of a range: the sessions it wrote go again (one already removed elsewhere is passed over). */
export const removeSessions = (m: Meditation, ids: readonly string[]): Meditation => parse({...m, sessions: m.sessions.filter(s => !ids.includes(s.id))});
/** The days a range covers, for the form's line ("7 days"). */
export const rangeDays = (from: string, to: string) => from && to && to >= from ? Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1 : 0;
export function deleteSession(m: Meditation, id: string): Meditation {
  if (!m.sessions.some(s => s.id === id)) throw Error('This session is no longer here.');
  return parse({...m, sessions: m.sessions.filter(s => s.id !== id)});
}
/** The person's own weekly goal in minutes (null removes it). */
export function setMeditationGoal(m: Meditation, minutesPerWeek: number | null, at: Date): Meditation {
  if (minutesPerWeek === null) { const {goal: _old, ...rest} = m; void _old; return parse(rest); }
  return parse({...m, goal: meditationGoalSchema.parse({minutesPerWeek, updatedAt: at.toISOString()})});
}
export const DEFAULT_BELLS: Omit<BellPrefs, 'updatedAt'> = {sound: 'bowl', volume: 60};
export function setBells(m: Meditation, bells: Omit<BellPrefs, 'updatedAt'>, at: Date): Meditation {
  return parse({...m, bells: bellPrefsSchema.parse({...bells, updatedAt: at.toISOString()})});
}
