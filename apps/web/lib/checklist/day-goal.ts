import {z} from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {DAY_GOAL_CHANGES_MAX, DAY_GOAL_KEY_LITERAL, DAY_GOAL_MAX, emptyDayGoal, needOn, type DayGoal} from './day-goal-core';

/**
 * Session AP (owner decision 14 Nov; ADR-040): the record behind "A day counts as done at N" (lib/checklist/day-goal-core.ts
 * holds the rule). Its own device record, not a field of the strict settings record, so builds from before ignore it:
 * exported, restored, erased, in the data catalog; never synced (as "My day ends at").
 */
export const DAY_GOAL_KEY = DAY_GOAL_KEY_LITERAL;
const day = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
export const dayGoalSchema = z.object({
  version: z.literal(1),
  changes: z.array(z.object({from: day, need: z.number().int().min(1).max(DAY_GOAL_MAX).nullable()}).strict()).max(DAY_GOAL_CHANGES_MAX)
    .refine(list => list.every((c, i) => i === 0 || c.from > list[i - 1]!.from), 'One rule per day, in date order.'),
}).strict();
export const DAY_GOAL_RECORD: DeviceRecordSpec<DayGoal> = {key: DAY_GOAL_KEY, schema: dayGoalSchema, empty: emptyDayGoal};

/**
 * The rule chosen on `today` (null: every dot). It applies from `today` on; every earlier day keeps the rule it had. Choosing
 * the rule already in force changes nothing; a second change on the same day replaces that day's. Throws when the list of
 * changes is full (never drops an old change, which would re-count past days).
 */
export function chooseDayGoal(goal: DayGoal, today: string, need: number | null): DayGoal {
  const parsedDay = day.parse(today);
  if (need !== null) z.number().int().min(1).max(DAY_GOAL_MAX).parse(need);
  if (needOn(goal, parsedDay) === need) return goal;
  const kept = goal.changes.filter(c => c.from < parsedDay);
  const before = kept.length ? kept[kept.length - 1]!.need : null;
  const changes = before === need ? kept : [...kept, {from: parsedDay, need}];
  if (changes.length > DAY_GOAL_CHANGES_MAX) throw Error('This setting has changed too many times to keep every past day as it was.');
  return dayGoalSchema.parse({version: 1, changes});
}
export {needOn};
