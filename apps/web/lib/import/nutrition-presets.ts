import {normalizeHeader} from '../csv/mapping';
import type {Mapping} from './nutrition';

/**
 * MyFitnessPal and Cronometer presets for the meals import (Session W Part 7; IMPORT_FORMATS.md). Both apps document
 * how to export, not their columns, so the column names below come from real exports others have published (community-
 * documented, read 2026-10-07): the preset only pre-fills the column matches, says so, and the person checks them in the
 * usual step before anything is imported. Recognised by the header row, never by the file name alone.
 */
export type NutritionPreset = {id: 'myfitnesspal' | 'cronometer'; label: string; note: string; mapping: Mapping};
const find = (header: readonly string[], ...names: string[]) => { const wanted = names.map(normalizeHeader); const i = header.findIndex(h => wanted.includes(normalizeHeader(h))); return i < 0 ? undefined : i; };
const has = (header: readonly string[], ...names: string[]) => names.every(name => find(header, name) !== undefined);
const clean = (mapping: Record<string, number | undefined>): Mapping => Object.fromEntries(Object.entries(mapping).filter(([, v]) => v !== undefined)) as Mapping;
export function detectNutritionPreset(header: readonly string[]): NutritionPreset | null {
  if (has(header, 'Date', 'Meal', 'Calories', 'Fat (g)', 'Carbohydrates (g)', 'Protein (g)') && find(header, 'Food Name', 'Food') === undefined) {
    const meal = find(header, 'Meal');
    return {id: 'myfitnesspal', label: 'MyFitnessPal', mapping: clean({
      date: find(header, 'Date'), meal, food: meal, kcal: find(header, 'Calories'), fat: find(header, 'Fat (g)'), carbs: find(header, 'Carbohydrates (g)'), protein: find(header, 'Protein (g)'),
      fibre: find(header, 'Fiber'), sugars: find(header, 'Sugar'), saturatedFat: find(header, 'Saturated Fat'), sodium: find(header, 'Sodium (mg)'), potassium: find(header, 'Potassium'),
    }), note: 'This looks like MyFitnessPal\'s Nutrition-Summary. It has one row per meal with its totals and no food names, so each meal becomes one entry named after it. Calcium, iron and vitamins are left out: MyFitnessPal gives them as a percentage of a daily value, not an amount. MyFitnessPal does not publish these columns; check the matches below.'};
  }
  if (has(header, 'Day', 'Group', 'Food Name', 'Amount')) {
    return {id: 'cronometer', label: 'Cronometer', mapping: clean({
      date: find(header, 'Day'), meal: find(header, 'Group'), food: find(header, 'Food Name'), servingAmount: find(header, 'Amount'), kcal: find(header, 'Energy (kcal)'),
      protein: find(header, 'Protein (g)'), carbs: find(header, 'Carbs (g)'), fat: find(header, 'Fat (g)'), fibre: find(header, 'Fiber (g)'), sugars: find(header, 'Sugars (g)'),
      saturatedFat: find(header, 'Saturated (g)'), sodium: find(header, 'Sodium (mg)'), potassium: find(header, 'Potassium (mg)'), calcium: find(header, 'Calcium (mg)'), iron: find(header, 'Iron (mg)'),
    }), note: 'This looks like Cronometer\'s servings.csv: each food with its amount and nutrients. Times and categories are not kept. Cronometer does not publish these columns; check the matches below.'};
  }
  return null;
}
