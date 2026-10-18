import {deviceTimeZone, journalTimeZone} from '../journal-zone';
import {addDays} from '../zone-time';
import {checklistDaysSchema, type ChecklistDaySummary, type ChecklistDays, type ChecklistToday} from './schema';

/**
 * The Checklist's day (Session AF, ADR-028 H66; P7.15): local midnight in the person's journal time zone, else this
 * device's. The app has no day-start hour, so midnight is the rule (said once in Options). Each page still writes with its
 * own day (Habits' zone override, Health's zone); when that differs the dot says which date it was logged for.
 */
export function zonedDay(now: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now), get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const checklistZone = (): string => journalTimeZone() ?? deviceTimeZone();
export const checklistDay = (now = new Date(), zone = checklistZone()): string => zonedDay(now, zone);

export const MAX_SEALED_DAYS = 400, BACKFILL_DAYS = 14;
const emptyToday = (date: string): ChecklistToday => ({date, ticks: [], custom: [], nudged: []});
/** Today's part of the day record, fresh when it holds another day. */
export const todayOf = (days: ChecklistDays, date: string): ChecklistToday => days.today?.date === date ? days.today : emptyToday(date);

/**
 * The first read on a new day (P7.15): the day the record still holds as "today" is sealed into the history with its
 * summary as derived from the real records and its own receipts, the days between it and today that were never opened are
 * sealed from the records alone (up to two weeks back; items only the path knows, such as custom ticks, are left out of
 * those days rather than counted as missed), and "today" starts empty. A day with nothing on the path is not written
 * (neutral). Idempotent: the same day sealed twice gives the same record, and a sealed day is never overwritten by a later
 * read. The history keeps the latest 400 days.
 *
 * `summarise(today, {receipts})` derives a past day's summary; `receipts: false` for a day no receipts exist for.
 */
export function sealDay(days: ChecklistDays, date: string, summarise: (day: ChecklistToday, options: {receipts: boolean}) => ChecklistDaySummary | null): ChecklistDays {
  const held = days.today;
  if (held?.date === date) return days;
  const sealed: Record<string, ChecklistDaySummary> = {...days.days};
  const put = (day: string, summary: ChecklistDaySummary | null) => { if (summary && summary.total > 0 && !sealed[day]) sealed[day] = summary; };
  if (held && held.date < date) {
    put(held.date, summarise(held, {receipts: true}));
    for (let d = addDays(held.date, 1), n = 0; d < date && n < BACKFILL_DAYS; d = addDays(d, 1), n++) put(d, summarise(emptyToday(d), {receipts: false}));
  }
  const kept = Object.keys(sealed).sort().slice(-MAX_SEALED_DAYS);
  return checklistDaysSchema.parse({...days, days: Object.fromEntries(kept.map(d => [d, sealed[d]!])), today: emptyToday(date)});
}

/** A receipt for a tick made on the path (P7.10; Perfect orbit and Undo). The newest receipt per item wins. */
export function addReceipt(days: ChecklistDays, date: string, tick: {id: string; at: Date; record?: {kind: string; id: string}}): ChecklistDays {
  const today = todayOf(days, date);
  return checklistDaysSchema.parse({...days, today: {...today, ticks: [...today.ticks.filter(t => t.id !== tick.id), {id: tick.id, at: tick.at.toISOString(), ...(tick.record ? {record: tick.record} : {})}]}});
}
export function dropReceipt(days: ChecklistDays, date: string, id: string): ChecklistDays {
  const today = todayOf(days, date); if (!today.ticks.some(t => t.id === id)) return days;
  return checklistDaysSchema.parse({...days, today: {...today, ticks: today.ticks.filter(t => t.id !== id)}});
}
/** A custom item ticked or unticked today (custom items live only on the path). */
export function setCustomDone(days: ChecklistDays, date: string, id: string, done: boolean): ChecklistDays {
  const today = todayOf(days, date), has = today.custom.includes(id);
  if (has === done) return days.today?.date === date ? days : checklistDaysSchema.parse({...days, today});
  return checklistDaysSchema.parse({...days, today: {...today, custom: done ? [...today.custom, id] : today.custom.filter(x => x !== id)}});
}
/** A nudge moment shown today ('10', '15', '19'), so each shows once (P7.14). */
export function markNudged(days: ChecklistDays, date: string, slot: string): ChecklistDays {
  const today = todayOf(days, date); if (today.nudged.includes(slot)) return days;
  return checklistDaysSchema.parse({...days, today: {...today, nudged: [...today.nudged, slot]}});
}
/** A sealed day mended by a streak freeze (P7.13): the repaired habits leave its count, as a rest day would. */
export function mendDay(days: ChecklistDays, date: string, repaired: number): ChecklistDays {
  const day = days.days[date]; if (!day || repaired <= 0) return days;
  return checklistDaysSchema.parse({...days, days: {...days.days, [date]: {...day, total: Math.max(day.done, day.total - repaired)}}});
}
