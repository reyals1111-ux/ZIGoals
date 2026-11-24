import {sourceExtras} from '../food-scans/match';
import {entryOf, type GenericFoodEntry} from '../food-generic/search';
import type {LoadedGenericSource} from '../food-generic/load';
import {TEMPLATE_FOODS, type FoodKey} from '../diet-templates/templates';
import {rememberExtras, type NutrientExtras, type NutrientExtraValues} from '../health-vitamins/extras';
import {setNewFoodVitamins, type HealthVitamins, type Vitamins} from '../health-vitamins/schema';

/**
 * Session AV lane 2 (food, LEDGER #93; Cronometer's food diary with many nutrients): a food saved from the offline
 * library keeps every nutrient the library carries — the seven vitamins (`zigoals:health-vitamins:v1`) and magnesium,
 * zinc, B1, B2, B3, B6 and omega-3 (`zigoals:nutrient-extras:v1`) beside the eleven of its label — as the barcode and
 * library lookup already do, so the nutrient report counts them. Per 100 g, as the food is saved. Pure.
 */
export type LibraryExtras = {vitamins: Vitamins; extras: NutrientExtraValues};
export const libraryExtras = (e: Pick<GenericFoodEntry, 'source' | 'nutrients' | 'vitamins' | 'more'>): LibraryExtras => {
  const x = sourceExtras({source: e.source, nutrients: e.nutrients as Record<string, number | null | undefined>, vitamins: e.vitamins, more: e.more});
  return {vitamins: x.vitamins, extras: x.extras};
};
export const hasLibraryExtras = (x: LibraryExtras | null | undefined) => !!x && Object.keys(x.vitamins).length + Object.keys(x.extras).length > 0;
/** The library's vitamins and extras for the template foods (the recipe collection's), by key. */
export function bookExtras(keys: readonly FoodKey[], sources: readonly LoadedGenericSource[]): Partial<Record<FoodKey, LibraryExtras>> {
  const out: Partial<Record<FoodKey, LibraryExtras>> = {};
  for (const key of keys) { const ref = TEMPLATE_FOODS[key], loaded = sources.find(s => s.entry.source === ref.source), row = loaded?.file.foods.find(r => r[0] === ref.id); if (loaded && row) out[key] = libraryExtras(entryOf(loaded.file, loaded.entry, row)); }
  return out;
}
/** The vitamins and extras records with a new food's values added (a food that already has vitamins keeps its own). */
export function keepLibraryExtras(records: {vitamins: HealthVitamins; extras: NutrientExtras}, foodId: string, values: LibraryExtras, liveEntryIds: readonly string[]): {vitamins: HealthVitamins; extras: NutrientExtras} {
  let vitamins = records.vitamins, extras = records.extras;
  if (Object.keys(values.vitamins).length && !vitamins.foods?.[foodId]) vitamins = setNewFoodVitamins(vitamins, foodId, values.vitamins);
  if (Object.keys(values.extras).length) extras = rememberExtras(extras, liveEntryIds, foodId, values.extras);
  return {vitamins, extras};
}
