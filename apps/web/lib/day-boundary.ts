import {z} from 'zod';
import {activityDay, boundaryDay, currentDayEnds, dayUnder, emptyDayEnds, readDayEnds, setCurrentDayEnds, subscribeDayEnds, type DayEnds} from './day-boundary-core';
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
export {activityDay, boundaryDay, currentDayEnds, dayUnder, emptyDayEnds, readDayEnds, setCurrentDayEnds, subscribeDayEnds, type DayEnds};
export const DAY_ENDS_RECORD: DeviceRecordSpec<DayEnds> = {key: DAY_ENDS_KEY, schema: dayEndsSchema, empty: emptyDayEnds};

/** A new setting: the end chosen now, with the change remembered (choosing the same end changes nothing). */
export function chooseDayEnd(current: DayEnds, endsAt: number, now = new Date()): DayEnds {
  const next = minutesSchema.parse(endsAt);
  if (next === current.endsAt) return current;
  return dayEndsSchema.parse({version: 1, endsAt: next, change: {at: now.toISOString(), from: current.endsAt}});
}

/** "midnight", "1:00" … "6:00", as the setting's choices read. */
export const dayEndLabel = (minutes: number) => minutes === 0 ? 'Midnight' : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

