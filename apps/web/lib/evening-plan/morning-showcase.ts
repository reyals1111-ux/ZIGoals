import {saveMorning, tickMorning} from './morning';
import type {EveningRecord} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #236): the Showcase's morning steps beside its evening plan — daylight in the
 * first hour and the first coffee after the grogginess, daylight ticked today. Fictional and deterministic. No reminder
 * (the Showcase plans no notification). The lead changes one line of lib/showcase-data.ts:
 * `records[EVENING_PLAN_KEY] = JSON.stringify(withShowcaseMorning(showcaseEvening(day), day));`.
 */
export function withShowcaseMorning(r: EveningRecord, day: string): EveningRecord {
  return tickMorning(saveMorning(r, ['m-daylight', 'm-coffee'], new Date(`${day}T06:00:00.000Z`)), day, 'm-daylight', true);
}
