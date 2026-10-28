import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (feature 1, HE17; TIER 3 (stored format)): the ranges behind an AI meal estimate. A photo or a described meal
 * is never one exact number, so ZIGi's card shows each nutrient as a range ("kcal 450–650") and saves the middle as the
 * food's value, which the person edits before or after saving. Foods are a strict schema in every released build (a new
 * field there would make #37–#50 refuse Health's foods), so the ranges live in their own device-only key, loose and
 * versioned, keyed by the estimated food's id (ADR-034 N21). In Export everything and its restore; not synced (N18).
 */
export const MEAL_ESTIMATES_KEY = 'zigoals:meal-estimates:v1';
export const MAX_ESTIMATES = 2_000;
export const NUTRIENT_RANGES = ['kcal', 'protein_g', 'carbs_g', 'fat_g'] as const;
export type NutrientRange = (typeof NUTRIENT_RANGES)[number];
const limit = (key: NutrientRange) => key === 'kcal' ? 100_000 : 10_000;
/** A [low, high] pair: both finite, at least 0, low ≤ high. */
export const rangeOf = (key: NutrientRange) => z.tuple([z.number().finite().min(0).max(limit(key)), z.number().finite().min(0).max(limit(key))]).refine(([lo, hi]) => lo <= hi, 'The low end comes first.');
export const rangesSchema = z.looseObject({kcal: rangeOf('kcal').optional(), protein_g: rangeOf('protein_g').optional(), carbs_g: rangeOf('carbs_g').optional(), fat_g: rangeOf('fat_g').optional()});
export const mealEstimateSchema = z.looseObject({
  ranges: rangesSchema,
  /** Where the estimate came from: a meal photo, or words in the chat. */
  source: z.enum(['photo', 'chat']),
  at: z.iso.datetime({offset: true}),
});
export const mealEstimatesSchema = z.looseObject({version: z.literal(1), foods: z.record(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), mealEstimateSchema)});
export type MealEstimate = z.infer<typeof mealEstimateSchema>;
export type MealEstimates = z.infer<typeof mealEstimatesSchema>;
export const emptyMealEstimates = (): MealEstimates => ({version: 1, foods: {}});
export const MEAL_ESTIMATES: DeviceRecordSpec<MealEstimates> = {key: MEAL_ESTIMATES_KEY, schema: mealEstimatesSchema, empty: emptyMealEstimates};

/** The middle of a range, rounded as the field is shown (kcal whole, grams to one decimal). */
export const middleOf = (key: NutrientRange, [lo, hi]: readonly [number, number]): number => key === 'kcal' ? Math.round((lo + hi) / 2) : Math.round((lo + hi) * 5) / 10;
/** A range as words: "450–650", or one number when both ends agree. */
export const rangeText = (key: NutrientRange, [lo, hi]: readonly [number, number]): string => {
  const f = (n: number) => key === 'kcal' ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
  return f(lo) === f(hi) ? f(lo) : `${f(lo)}–${f(hi)}`;
};
/** Keeps one food's ranges (the newest replaces an older one); the oldest go past MAX_ESTIMATES. */
export function addEstimate(record: MealEstimates, foodId: string, estimate: MealEstimate): MealEstimates {
  const foods = {...record.foods, [foodId]: mealEstimateSchema.parse(estimate)};
  const ids = Object.keys(foods).sort((a, b) => foods[a]!.at.localeCompare(foods[b]!.at));
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX_ESTIMATES))) delete foods[old];
  return mealEstimatesSchema.parse({...record, foods});
}
/** Forgets one food's ranges (the food was removed, or the person corrected it). */
export function removeEstimate(record: MealEstimates, foodId: string): MealEstimates {
  if (!(foodId in record.foods)) return record;
  const foods = {...record.foods}; delete foods[foodId];
  return {...record, foods};
}
/** One line for the food library: "AI estimate from a photo: kcal 450–650 · protein 20–30 g per serving (saved: the middle)". */
export function estimateLine(estimate: MealEstimate): string {
  const parts = NUTRIENT_RANGES.flatMap(k => { const r = estimate.ranges[k]; return r ? [`${k === 'kcal' ? 'kcal' : k.replace('_g', '')} ${rangeText(k, r)}${k === 'kcal' ? '' : ' g'}`] : []; });
  return `AI estimate ${estimate.source === 'photo' ? 'from a photo' : 'from your words'}: ${parts.join(' · ')} per serving (saved: the middle; edit to correct it)`;
}
