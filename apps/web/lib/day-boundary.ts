import {z} from 'zod';
import {addLocalDays, localDate} from './local-date';
import {wallClock} from './zone-time';
import type {DeviceRecordSpec} from './device-record';

/**
 * Session AO (C-DVG-22, C-NB-28, N-NB-11; TIER 3 stored format, owner-approved 13 Nov): "My day ends at". A night owl's
 * habits, Checklist and streaks count until e.g. 03:00: an instant whose wall-clock time in the day's zone is before the
 * end belongs to the calendar day before. Wall-clock fields come from Intl in the zone, so a daylight-saving night moves
 * nothing (03:00 is 03:00 local, whatever the offset). Midnight (0, the default and a missing record) is exactly the
 * behaviour before this setting.
 *
 * Owner rule 1 (verbatim in ADR-039): a change never rewrites, re-dates or re-counts past records; it applies from the
 * change on, and a streak never breaks because of the change itself: after a change the day in progress keeps the rule it
 * started under until both rules name the same day (so "today" never steps back, and a later end is never cut short).
 * Only "now" goes through here; stored day keys are never recomputed.
 *
 * Stored as its own device record `zigoals:day-ends:v1` (not a field of the settings record, whose strict schema older
 * builds would refuse): exported, restored, erased, in the data catalog; never synced.
 */
export const DAY_ENDS_KEY = 'zigoals:day-ends:v1';
export const DAY_END_CHOICES = [0, 60, 120, 180, 240, 300, 360] as const;
const minutesSchema = z.number().int().min(0).max(360).refine(m => m % 30 === 0, 'A day ends on the hour or half hour, up to 06:00.');
export const dayEndsSchema = z.object({
  version: z.literal(1),
  /** Minutes after midnight the day ends (0 = midnight). */
  endsAt: minutesSchema,
  /** The latest change: when it was made and the end before it (owner rule 1). */
  change: z.object({at: z.iso.datetime(), from: minutesSchema}).strict().optional(),
}).strict();
export type DayEnds = z.infer<typeof dayEndsSchema>;
export const emptyDayEnds = (): DayEnds => ({version: 1, endsAt: 0});
export const DAY_ENDS_RECORD: DeviceRecordSpec<DayEnds> = {key: DAY_ENDS_KEY, schema: dayEndsSchema, empty: emptyDayEnds};

/** The calendar day an instant belongs to when the day ends `endsAt` minutes after midnight, in `zone` (null: this device). */
export function dayUnder(endsAt: number, now: Date, zone: string | null): string {
  if (zone) {
    const wall = wallClock(now.getTime(), zone);
    return endsAt > 0 && wall.minutes < endsAt ? addLocalDays(wall.date, -1) : wall.date;
  }
  const date = localDate(now);
  return endsAt > 0 && now.getHours() * 60 + now.getMinutes() < endsAt ? addLocalDays(date, -1) : date;
}

/** The day `now` counts for under a stored setting, with owner rule 1's change rule. */
export function activityDay(setting: DayEnds, now: Date, zone: string | null): string {
  const change = setting.change;
  // Session AO security delta (Low): a change dated in the future (a restored record, a clock set back) is ignored, so it can
  // never keep an old end in force while Settings shows the new one.
  if (!change || Date.parse(change.at) > Date.now() + 5 * 60_000) return dayUnder(setting.endsAt, now, zone);
  const at = new Date(change.at);
  if (now.getTime() < at.getTime()) return dayUnder(change.from, now, zone);
  const oldAtChange = dayUnder(change.from, at, zone);
  // At the change the two rules named different days: the old rule keeps that day until it ends under the old rule.
  if (oldAtChange !== dayUnder(setting.endsAt, at, zone) && dayUnder(change.from, now, zone) === oldAtChange) return oldAtChange;
  return dayUnder(setting.endsAt, now, zone);
}

/** A new setting: the end chosen now, with the change remembered (choosing the same end changes nothing). */
export function chooseDayEnd(current: DayEnds, endsAt: number, now = new Date()): DayEnds {
  const next = minutesSchema.parse(endsAt);
  if (next === current.endsAt) return current;
  return dayEndsSchema.parse({version: 1, endsAt: next, change: {at: now.toISOString(), from: current.endsAt}});
}

/** "midnight", "1:00" … "6:00", as the setting's choices read. */
export const dayEndLabel = (minutes: number) => minutes === 0 ? 'Midnight' : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

// The setting in effect on this page, set by the shell from the device record (components/shell.tsx), as the journal zone
// is. On the server, in tests and before it is read: midnight, exactly as before.
let current: DayEnds = emptyDayEnds();
const listeners = new Set<() => void>();
export function currentDayEnds(): DayEnds { return current; }
export function setCurrentDayEnds(next: DayEnds): void {
  if (next.endsAt === current.endsAt && next.change?.at === current.change?.at && next.change?.from === current.change?.from) return;
  current = next;
  for (const listener of listeners) listener();
}
export function subscribeDayEnds(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** The day `now` counts for, with the setting in effect (midnight unless the person chose another end). */
export function boundaryDay(now: Date, zone: string | null): string { return activityDay(current, now, zone); }
