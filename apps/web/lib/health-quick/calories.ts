import {healthSchema, parseHealthNumber, type HealthData, type HealthDiaryEntry} from '../health';

/**
 * Session AV (owner follow-up 1, F-QUICK-KCAL; MyFitnessPal and MacroFactor's Quick Add): calories alone, logged to a
 * day and meal without a food in the library. The diary entry carries its own snapshot (as every entry does), named
 * "Quick add" or the person's few words, with protein, carbs and fat unknown (never zero). Nothing is added to the
 * library; the entry's source id names no library food, as an entry whose food was removed later does, so no stored
 * format changes. 1 to 10,000 kcal. Pure.
 */
export const QUICK_KCAL_NAME = 'Quick add';
export function quickCalories(data: HealthData, quick: {id: string; sourceId: string; kcal: string; name?: string; date: string; meal: HealthDiaryEntry['meal']}, at: string): HealthData {
  const kcal = parseHealthNumber(quick.kcal, 1, 1, 10_000, 'kcal');
  const name = (quick.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || QUICK_KCAL_NAME;
  const entry = {id: quick.id, sourceId: quick.sourceId, sourceKind: 'food' as const, snapshot: {name, servingGrams: null, nutrients: {kcal, proteinMg: null, carbsMg: null, fatMg: null}}, date: quick.date, meal: quick.meal, quantityMilli: 1000, createdAt: at, updatedAt: at};
  return healthSchema.parse({...data, diary: [...data.diary, entry]});
}
