import {saveMealPlan} from '../health-daily';
import type {HealthData, HealthDiaryEntry} from '../health';
import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AV (owner follow-up 1, F-REPEAT-PLAN; Cronometer's repeat items): a saved meal planned on chosen weekdays for
 * the next weeks — one ordinary meal plan per day, in the plan list as before (each still logged with one tap when it
 * is eaten, so nothing reaches the diary unseen). No new stored field: the strict plan record older builds read is the
 * same. At most 12 weeks at once. Pure.
 */
export const MAX_REPEAT_WEEKS = 12;
/** The days from `from` (included) for `weeks` weeks whose weekday (0 = Sunday … 6) is chosen. */
export function repeatDates(from: string, weekdays: readonly number[], weeks: number): string[] {
  const want = new Set(weekdays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6)), span = Math.max(1, Math.min(MAX_REPEAT_WEEKS, Math.floor(weeks))) * 7, out: string[] = [];
  for (let i = 0; i < span; i++) { const d = addLocalDays(from, i); if (want.has(localWeekday(d))) out.push(d); }
  return out;
}
/** One plan per date, ids `${base}-1`, `${base}-2`…; a date that already has this saved meal in this slot is skipped. */
export function saveRepeatingPlans(data: HealthData, draft: {base: string; savedMealId: string; meal: HealthDiaryEntry['meal']; dates: readonly string[]}, at: string): {data: HealthData; planned: number} {
  const existing = new Set((data.daily?.plans ?? []).filter(p => p.savedMealId === draft.savedMealId && p.meal === draft.meal).map(p => p.date));
  let next = data, planned = 0;
  draft.dates.forEach((date, i) => { if (existing.has(date)) return; next = saveMealPlan(next, {id: `${draft.base}-${i + 1}`, savedMealId: draft.savedMealId, date, meal: draft.meal}, at); planned++; });
  return {data: next, planned};
}
