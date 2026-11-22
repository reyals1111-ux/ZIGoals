import type {HealthNumber, HealthNumbers} from './store';
import {formatClock} from '../visual-format';

/**
 * Session AV lane 2 (health r3; LEDGER #284, Carb Manager's glucose and ketones per meal): a reading of "Your numbers"
 * marked before or after one of the diary's four meals, shown beside that meal on the food day. Only the readings, as
 * typed, with their unit: no range, no verdict, no index worked out from them (a glucose-ketone index is left out: it is
 * medical advice). Pure.
 */
export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export type MealName = (typeof MEALS)[number];
export type MealWhen = 'before' | 'after';
/** The form's choices: "before:Breakfast" … "after:Snacks". */
export const MEAL_MARKS: readonly {value: string; label: string}[] = MEALS.flatMap(m => (['before', 'after'] as const).map(w => ({value: `${w}:${m}`, label: `${w === 'before' ? 'Before' : 'After'} ${m === 'Snacks' ? 'a snack' : m.toLowerCase()}`})));
export function readMealMark(text: string | undefined): {meal: MealName; when: MealWhen} | null {
  const m = /^(before|after):(Breakfast|Lunch|Dinner|Snacks)$/.exec((text ?? '').trim());
  return m ? {when: m[1] as MealWhen, meal: m[2] as MealName} : null;
}
/** "after lunch, 1:45 PM" for a marked reading, or null. */
export function mealTag(e: Pick<HealthNumber, 'meal' | 'mealWhen' | 'time'>): string | null {
  // Review B3B-7: the time in the app's own hour cycle ("1:45 PM" or "13:45"), as the other cards say it.
  if (!e.meal || !e.mealWhen) return e.time ? formatClock(e.time) : null;
  return `${e.mealWhen} ${e.meal === 'Snacks' ? 'a snack' : e.meal.toLowerCase()}${e.time ? `, ${formatClock(e.time)}` : ''}`;
}
export type MealReading = {id: string; name: string; value: number; unit: string; when: MealWhen; time?: string};
/** A meal's marked readings on a day, before ones first, then by time. */
export function mealReadings(rec: HealthNumbers | null | undefined, date: string, meal: MealName): MealReading[] {
  return (rec?.entries ?? []).filter(e => e.kind === 'lab' && e.date === date && e.meal === meal && e.mealWhen && e.value !== undefined && e.name)
    .map(e => ({id: e.id, name: e.name!, value: e.value!, unit: e.unit ?? '', when: e.mealWhen!, ...(e.time ? {time: e.time} : {})}))
    .sort((a, b) => (a.when === b.when ? 0 : a.when === 'before' ? -1 : 1) || (a.time ?? '').localeCompare(b.time ?? '') || a.name.localeCompare(b.name));
}
