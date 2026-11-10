import {addDays, instantAt, wallClock} from './zone-time';
import {JOURNAL_MIN_DAY} from './health-day';
import type {NightInput} from './sleep/engine';

/**
 * Session AL (P-NB-44 / P-PR-10 / P-MO-45; NB-139, NB-196, PR-064, MO-021, BUG-079): the times the "Log a night or a
 * nap" form starts with, and the checks it runs before it saves, each naming its field.
 *
 * The form used to start at 23:00 → 07:00 whatever the hour. Opened before 07:00, that untouched form ended in the
 * future and Save failed with "A night cannot end in the future." The wake time now starts at 07:00 only once 07:00 has
 * passed on that day; before it, it starts at the current minute. Bed time stays 23:00 the evening before.
 */
export type NightTimes = {bedDate: string; bedTime: string; wakeDate: string; wakeTime: string};
export const DEFAULT_BED = '23:00', DEFAULT_WAKE = '07:00';

/** The form's first times for the night that ends on `day` (the journal day), lived in `zone`, seen at `nowMs`. */
export function defaultNightTimes(day: string, nowMs: number, zone: string): NightTimes {
  const now = wallClock(nowMs, zone);
  const wakeAt = instantAt(day, DEFAULT_WAKE, zone);
  // Before 07:00 on the day itself, the night cannot end later than now.
  const wakeTime = now.date === day && wakeAt > nowMs ? now.clock : DEFAULT_WAKE;
  return {bedDate: addDays(day, -1), bedTime: DEFAULT_BED, wakeDate: day, wakeTime};
}

export type NightField = keyof NightTimes;
/** The words for each time field: a night is "went to bed / woke up", a nap "started / ended". */
export function nightLabels(kind: 'night' | 'nap'): Record<NightField, string> {
  return kind === 'nap'
    ? {bedDate: 'Nap started (date)', bedTime: 'Nap started (time)', wakeDate: 'Nap ended (date)', wakeTime: 'Nap ended (time)'}
    : {bedDate: 'Went to bed (date)', bedTime: 'Went to bed (time)', wakeDate: 'Woke up (date)', wakeTime: 'Woke up (time)'};
}

const MAX_MINUTES = 24 * 60, MINUTE = 60_000;
/**
 * What is wrong with the typed times, per field (empty when they can be saved): a missing time, a day before 1990, an
 * end after now, an end before the start, longer than 24 hours. Overlaps with other nights are the store's check.
 */
export function nightTimeIssues(times: NightTimes, kind: 'night' | 'nap', nowMs: number, zone: string, formatClock: (ms: number) => string): Partial<Record<NightField, string>> {
  const out: Partial<Record<NightField, string>> = {};
  const missing: Record<NightField, string> = kind === 'nap'
    ? {bedDate: 'Enter the day the nap started.', bedTime: 'Enter the time the nap started.', wakeDate: 'Enter the day the nap ended.', wakeTime: 'Enter the time the nap ended.'}
    : {bedDate: 'Enter the day you went to bed.', bedTime: 'Enter the time you went to bed.', wakeDate: 'Enter the day you woke up.', wakeTime: 'Enter the time you woke up.'};
  for (const field of ['bedDate', 'bedTime', 'wakeDate', 'wakeTime'] as const) if (!times[field]) out[field] = missing[field];
  for (const field of ['bedDate', 'wakeDate'] as const) if (times[field] && times[field] < JOURNAL_MIN_DAY) out[field] = 'Choose a day from 1990 on.';
  if (Object.keys(out).length) return out;
  const start = instantAt(times.bedDate, times.bedTime, zone), end = instantAt(times.wakeDate, times.wakeTime, zone);
  const ended = kind === 'nap' ? 'The nap' : 'The night';
  if (end > nowMs + MINUTE) out.wakeTime = `${ended} cannot end later than now (${formatClock(nowMs)}).`;
  else if (end <= start) out.wakeTime = kind === 'nap' ? 'The nap must end after it started.' : 'Woke up must be after went to bed.';
  else if ((end - start) / MINUTE > MAX_MINUTES) out.wakeDate = `${ended} can last at most 24 hours: check the dates.`;
  return out;
}

/** A whole number typed in an optional field, or undefined when blank; `issue` says what is wrong, for its own field. */
export function optionalWhole(raw: string, max: number, what: 'minutes' | 'count'): {value?: number; issue?: string} {
  const text = raw.trim();
  if (!text) return {};
  if (!/^\d{1,4}$/.test(text) || Number(text) > max) return {issue: what === 'minutes' ? `Enter whole minutes from 0 to ${max}, or leave it empty.` : `Enter a whole number from 0 to ${max}, or leave it empty.`};
  return {value: Number(text)};
}

/**
 * Session AL (for L3, NB-139): the wake time "When did you wake up?" starts with, for a night still open since `startMs`:
 * 07:00 on the morning after an evening start (the same day for a start after midnight), never later than now. It used
 * to be 07:00 on the start's own date, which is before an evening start, and in the future before 07:00.
 */
export function defaultWakeFor(startMs: number, nowMs: number, zone: string): {date: string; time: string} {
  const start = wallClock(startMs, zone);
  const day = start.minutes >= 12 * 60 ? addDays(start.date, 1) : start.date;
  const t = defaultNightTimes(day, nowMs, zone);
  // A night started this very morning (or later than the default) cannot be offered a wake time before it began.
  if (instantAt(t.wakeDate, t.wakeTime, zone) <= startMs) { const now = wallClock(nowMs, zone); return {date: now.date, time: now.clock}; }
  return {date: t.wakeDate, time: t.wakeTime};
}

/**
 * Session AL (for L3/Today, NB-138): the one quick "last night" write Today can call: a night of `hours` that ended at
 * the default wake time of the journal day `day` (07:00, or now before 07:00), so "7 h" logs 00:00 → 07:00. Returns the
 * night for `saveNight` (lib/sleep/engine.ts), which still refuses an overlap. Nothing is written here:
 *   sleep.update(s => saveNight(s, quickLastNight(7, today, Date.now(), zone), new Date()))
 */
export function quickLastNight(hours: number, day: string, nowMs: number, zone: string): NightInput {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 16) throw new RangeError('Enter from 0.5 to 16 hours.');
  const t = defaultNightTimes(day, nowMs, zone);
  const end = instantAt(t.wakeDate, t.wakeTime, zone);
  return {kind: 'night', start: end - Math.round(hours * 60) * MINUTE, end, timeZone: zone};
}
