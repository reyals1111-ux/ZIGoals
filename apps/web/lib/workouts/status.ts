import {addLocalDays} from '../local-date';
import {plannedRecordSchema, STATUS_KINDS, STATUSES_MAX, type PlannedRecord, type StatusKind, type WorkoutStatus} from './planned';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #374, Gentler Streak's activity status): one status in Workouts — ill, injured, a
 * break or travelling — from a day until the person clears it. While it lasts its days set the planned workouts aside
 * (never "missed"), the training load says the week is not compared, and its weeks pass over the week streak (they neither
 * count nor break it); once cleared, the load says "back after a break" for the weeks after. Everyday words only: no
 * reading of the body, no advice. The status and its reason stay on this device and never go in a notification (nothing
 * here is read by the notification plan). Kept in the planned-workouts record (`statuses`, lib/workouts/planned.ts). Pure.
 */
export const STATUS_WORDS: Record<StatusKind, {en: string; nl: string; since: string; sinceNl: string}> = {
  ill: {en: 'Ill', nl: 'Ziek', since: 'ill', sinceNl: 'ziek'},
  injured: {en: 'Injured', nl: 'Geblesseerd', since: 'injured', sinceNl: 'geblesseerd'},
  break: {en: 'On a break', nl: 'Even pauze', since: 'on a break', sinceNl: 'even pauze'},
  travel: {en: 'Travelling', nl: 'Op reis', since: 'travelling', sinceNl: 'op reis'},
};
export {STATUS_KINDS};
export type Pause = {from: string; to: string};
/** The status open today (from on or before today, not cleared), or null. */
export function currentStatus(rec: PlannedRecord | null | undefined, today: string): WorkoutStatus | null {
  return (rec?.statuses ?? []).find(s => !s.to && s.from <= today) ?? null;
}
/** Every status as a range of days; the open one runs to today. A status starting after today is not a pause yet. */
export function pausesOf(rec: PlannedRecord | null | undefined, today: string): Pause[] {
  return (rec?.statuses ?? []).filter(s => s.from <= today).map(s => ({from: s.from, to: s.to && s.to < today ? s.to : today}));
}
/**
 * Sets a status from `from` (a day up to today, at most a year back). With a status already open: the same status takes
 * the new first day; another one ends it the day before (or takes its place when it starts on or before the open one's
 * first day). Beyond 50 the oldest go.
 */
export function setStatus(rec: PlannedRecord, input: {kind: StatusKind; from: string; today: string; id: string; now: string}): PlannedRecord {
  if (!STATUS_KINDS.includes(input.kind)) throw Error('Choose a status.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from)) throw Error('Choose the day it started.');
  if (input.from > input.today) throw Error('Choose today or a day before.');
  if (input.from < addLocalDays(input.today, -366)) throw Error('Choose a day in the last year.');
  const open = currentStatus(rec, input.today), rest = (rec.statuses ?? []).filter(s => s.id !== open?.id);
  const fresh: WorkoutStatus = {id: input.id, kind: input.kind, from: input.from, createdAt: input.now};
  const next = !open ? [...rest, fresh]
    : open.kind === input.kind ? [...rest, {...open, from: input.from}]
      : input.from > open.from ? [...rest, {...open, to: addLocalDays(input.from, -1)}, fresh] : [...rest, fresh];
  return plannedRecordSchema.parse({...rec, statuses: next.sort((a, b) => a.from.localeCompare(b.from)).slice(-STATUSES_MAX)});
}
/**
 * Clears the open status: it covered up to yesterday. Review B5J-3: cleared on its first day it had covered no whole day,
 * so it is removed — today's planned workouts count again, the streak and the load read today as an ordinary day.
 */
export function clearStatus(rec: PlannedRecord, today: string): PlannedRecord {
  const open = currentStatus(rec, today);
  if (!open) return rec;
  const yesterday = addLocalDays(today, -1);
  if (yesterday < open.from) return withStatuses(rec, (rec.statuses ?? []).filter(s => s.id !== open.id));
  return plannedRecordSchema.parse({...rec, statuses: (rec.statuses ?? []).map(s => s.id === open.id ? {...s, to: yesterday} : s)});
}
/** Undo of a set or a clear: the statuses as they were before it. */
export const withStatuses = (rec: PlannedRecord, before: PlannedRecord['statuses']): PlannedRecord => {
  const out: Record<string, unknown> = {...rec}; delete out.statuses;
  return plannedRecordSchema.parse(before?.length ? {...out, statuses: before} : out);
};
/** "On a break since Mon, Nov 16." (English) */
export const statusLine = (s: WorkoutStatus, dateWords: (d: string) => string) => `${STATUS_WORDS[s.kind].en} since ${dateWords(s.from)}.`;
/** The status closed most recently within the last five weeks, for "back after a break". */
export function lastEnded(rec: PlannedRecord | null | undefined, today: string): WorkoutStatus | null {
  const since = addLocalDays(today, -34);
  return (rec?.statuses ?? []).filter(s => s.to && s.to >= since && s.to < today).sort((a, b) => b.to!.localeCompare(a.to!))[0] ?? null;
}
