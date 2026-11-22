import {addLocalDays} from '../local-date';
import {suggestedSteps} from './plan';
import {eveningRecordSchema, type EveningRecord} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #83): the Showcase's evening plan — asleep by 23:00, screens and a busy head named, a
 * 45-minute wind-down — with four of the last seven evenings ticked through and two steps ticked tonight. Fictional and
 * deterministic for a day. The lead adds one line to lib/showcase-data.ts: `records[EVENING_PLAN_KEY] = JSON.stringify(showcaseEvening(day))`.
 */
export function showcaseEvening(day: string): EveningRecord {
  const steps = suggestedSteps(['screens', 'busy-head'], 45), all = steps.map(s => s.id);
  const days: Record<string, string[]> = {[day]: all.slice(0, 2)};
  for (const back of [1, 2, 4, 6]) days[addLocalDays(day, -back)] = all;
  days[addLocalDays(day, -3)] = all.slice(0, 3);
  return eveningRecordSchema.parse({version: 1, plan: {bedtime: '23:00', windDown: 45, hindrances: ['screens', 'busy-head'], steps, updatedAt: `${addLocalDays(day, -10)}T20:00:00.000Z`}, days});
}
