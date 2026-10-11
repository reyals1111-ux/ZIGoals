import {bellPrefsSchema, meditationGoalSchema, meditationSchema, meditationSessionSchema, type BellPrefs, type Meditation, type MeditationSession} from './schema';
import {instantAt} from '../zone-time';

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
