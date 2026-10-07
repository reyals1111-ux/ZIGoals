import {HEALTH_MEALS, foodSnapshot, healthSchema, parseHealthNumber, saveFood, type HealthData, type HealthFood} from '../health';
import {servingsFromGrams} from '../health-daily';
import {visibleName} from '../visible-text';
import {parseNumberCell, type NumberStyle} from '../csv/numbers';
import {parseDateCell, DATE_FORMAT_LABELS, type DateFormat} from '../csv/dates';
import type {FieldSpec} from '../csv/mapping';
import type {ImportRecord} from './undo-schema';

/**
 * Nutrition CSV import (Session P, PR 3, I1; docs/product/features/I1-nutrition-import.md). Rows become ordinary
 * diary entries on the file's own days with the nutrients the file gives; blank stays unknown; a food joins the
 * library only when the file says what a serving weighs or measures. MyFitnessPal and Cronometer files get pre-filled
 * column matches (lib/import/nutrition-presets.ts, community-documented columns the person checks).
 */
export type Meal = typeof HEALTH_MEALS[number];
export type NutritionBasis = 'serving' | 'per-100g' | 'per-100ml';
export type DiaryEntry = HealthData['diary'][number];
export const NUTRITION_FIELDS: readonly FieldSpec[] = [
  {id: 'date', label: 'Date', synonyms: ['day', 'time', 'timestamp'], required: true},
  {id: 'meal', label: 'Meal', synonyms: ['meal type', 'meal name', 'course']},
  {id: 'food', label: 'Food', synonyms: ['food name', 'item', 'description', 'name', 'product'], required: true},
  {id: 'brand', label: 'Brand', synonyms: ['brand name', 'manufacturer']},
  {id: 'quantity', label: 'Servings', synonyms: ['servings', 'quantity', 'qty', 'amount', 'number of servings', 'portions']},
  {id: 'servingAmount', label: 'Serving size', synonyms: ['serving size', 'serving weight', 'weight', 'volume', 'weight (g)', 'serving (g)', 'portion size']},
  {id: 'servingUnit', label: 'Serving unit', synonyms: ['unit', 'units', 'serving unit']},
  {id: 'kcal', label: 'Calories', synonyms: ['calories', 'kcal', 'energy', 'energy (kcal)', 'calories (kcal)']},
  {id: 'protein', label: 'Protein', synonyms: ['protein (g)', 'proteins']},
  {id: 'carbs', label: 'Carbs', synonyms: ['carbohydrates', 'carbohydrates (g)', 'carbs (g)', 'carbohydrate']},
  {id: 'fat', label: 'Fat', synonyms: ['total fat', 'fat (g)', 'fats']},
  {id: 'fibre', label: 'Fibre', synonyms: ['fiber', 'fiber (g)', 'fibre (g)', 'dietary fiber']},
  {id: 'sugars', label: 'Sugars', synonyms: ['sugar', 'sugar (g)', 'sugars (g)']},
  {id: 'saturatedFat', label: 'Saturated fat', synonyms: ['sat fat', 'saturated', 'saturated fat (g)', 'saturated fats']},
  {id: 'sodium', label: 'Sodium', synonyms: ['sodium (mg)', 'salt']},
  {id: 'potassium', label: 'Potassium', synonyms: ['potassium (mg)']},
  {id: 'calcium', label: 'Calcium', synonyms: ['calcium (mg)']},
  {id: 'iron', label: 'Iron', synonyms: ['iron (mg)']},
];
export type Mapping = Partial<Record<string, number>>;
export type NutritionPlan = {foods: HealthFood[]; entries: DiaryEntry[]; withoutMeasure: number; refused: {row: number; reason: string}[]; days: number};
const cell = (row: readonly string[], mapping: Mapping, field: string) => { const index = mapping[field]; return index === undefined ? '' : (row[index] ?? '').trim(); };
/** The distinct meal names a file uses, in order of appearance, for the mapping step. */
export const distinctMeals = (rows: readonly (readonly string[])[], mapping: Mapping) => [...new Set(rows.map(r => cell(r, mapping, 'meal')))];
/** A meal by its name when it is plainly one of ours. */
export function guessMeal(text: string): Meal | null {
  const t = text.toLowerCase();
  if (/snack/.test(t)) return 'Snacks';
  if (/breakfast|morning/.test(t)) return 'Breakfast';
  if (/lunch|noon|midday/.test(t)) return 'Lunch';
  if (/dinner|supper|evening/.test(t)) return 'Dinner';
  return null;
}
/** A serving measure from "100 g", "250 ml" or an amount plus a unit cell; null when the cells do not describe one. */
export function parseServingMeasure(amount: string, unit: string, style: NumberStyle): {servingGrams: number | null; servingMl?: number} | null {
  const m = amount.trim().match(/^([\d.,\s']+)\s*([A-Za-z]*)$/);
  if (!m) return null;
  const unitText = (m[2] || unit).trim().toLowerCase();
  let value: string | null; try { value = parseNumberCell(m[1]!, style); } catch { return null; }
  if (value === null) return null;
  const grams = Math.round(Number(value));
  if (!(grams >= 1 && grams <= 100_000)) return null;
  if (/^(g|gram|grams|gr)$/.test(unitText)) return {servingGrams: grams};
  if (/^(ml|millilit(er|re)s?|cl|l|litre|liter)$/.test(unitText)) { const ml = /^(l|litre|liter)$/.test(unitText) ? grams * 1000 : unitText === 'cl' ? grams * 10 : grams; return ml <= 100_000 ? {servingGrams: null, servingMl: ml} : null; }
  return null;
}
const NUTRIENTS: {id: string; key: keyof HealthFood['nutrients']; scale: 1 | 1000; core: boolean}[] = [
  {id: 'kcal', key: 'kcal', scale: 1, core: true}, {id: 'protein', key: 'proteinMg', scale: 1000, core: true}, {id: 'carbs', key: 'carbsMg', scale: 1000, core: true}, {id: 'fat', key: 'fatMg', scale: 1000, core: true},
  {id: 'fibre', key: 'fiberMg', scale: 1000, core: false}, {id: 'sugars', key: 'sugarMg', scale: 1000, core: false}, {id: 'saturatedFat', key: 'saturatedFatMg', scale: 1000, core: false},
  {id: 'sodium', key: 'sodiumMg', scale: 1, core: false}, {id: 'potassium', key: 'potassiumMg', scale: 1, core: false}, {id: 'calcium', key: 'calciumMg', scale: 1, core: false}, {id: 'iron', key: 'ironMg', scale: 1, core: false},
];
export function planNutritionImport({rows, mapping, numberStyle, dateFormat, basis, mealMap = {}, today, importId, at}: {rows: readonly (readonly string[])[]; mapping: Mapping; numberStyle: NumberStyle; dateFormat: DateFormat; basis: NutritionBasis; mealMap?: Record<string, Meal>; today: string; importId: string; at: string}): NutritionPlan {
  const plan: NutritionPlan = {foods: [], entries: [], withoutMeasure: 0, refused: [], days: 0}, foodIds = new Map<string, string>(), days = new Set<string>();
  rows.forEach((cells, index) => {
    const row = index + 1, refuse = (reason: string) => plan.refused.push({row, reason: `Row ${row}: ${reason}`});
    const date = parseDateCell(cell(cells, mapping, 'date'), dateFormat);
    if (!date) return refuse(`the date is not ${DATE_FORMAT_LABELS[dateFormat]}.`);
    if (date > today) return refuse('the date is in the future.');
    if (date < '1900-01-01') return refuse('the date is before 1900.');
    const foodName = cell(cells, mapping, 'food');
    if (!foodName) return refuse('the food is blank.');
    const nutrients: Record<string, number | null> = {};
    for (const n of NUTRIENTS) {
      const text = cell(cells, mapping, n.id);
      if (!text) { if (n.core) nutrients[n.key] = null; continue; }
      try { const decimal = parseNumberCell(text, numberStyle); if (decimal === null) { if (n.core) nutrients[n.key] = null; continue; } nutrients[n.key] = n.scale === 1 ? Math.round(parseHealthNumber(decimal, 1000, 0, 1_000_000_000) / 1000) : parseHealthNumber(decimal, 1000, 0, 1_000_000_000); }
      catch { return refuse(`${NUTRITION_FIELDS.find(f => f.id === n.id)!.label} is not a number.`); }
    }
    const amountText = cell(cells, mapping, 'servingAmount'), unitText = cell(cells, mapping, 'servingUnit');
    let measure = amountText ? parseServingMeasure(amountText, unitText, numberStyle) : null;
    let quantityMilli: number;
    try {
      const servings = cell(cells, mapping, 'quantity');
      if (basis === 'serving') { quantityMilli = servings ? parseHealthNumber(parseNumberCell(servings, numberStyle) ?? '1', 1000, 1, 1_000_000) : 1000; }
      else {
        measure = basis === 'per-100g' ? {servingGrams: 100} : {servingGrams: null, servingMl: 100};
        if (amountText) quantityMilli = servingsFromGrams(parseNumberCell(amountText.replace(/[A-Za-z]+$/, ''), numberStyle) ?? '', 100);
        else if (servings) quantityMilli = parseHealthNumber(parseNumberCell(servings, numberStyle) ?? '1', 1000, 1, 1_000_000);
        else return refuse('give the amount eaten or a serving count.');
      }
    } catch { return refuse('the amount is not a number.'); }
    const mealText = cell(cells, mapping, 'meal'), meal: Meal = mealMap[mealText] ?? guessMeal(mealText) ?? 'Snacks';
    const brandText = cell(cells, mapping, 'brand'), brand = brandText ? `${brandText.slice(0, 69)} · imported` : 'Imported';
    let name: string; try { name = visibleName(foodName.slice(0, 120)); } catch { return refuse('the food name has no visible characters.'); }
    const nutrition = nutrients as HealthFood['nutrients'];
    days.add(date);
    const entryId = `health_imp-${importId}-e${row}`;
    if (!measure) {
      plan.withoutMeasure++;
      plan.entries.push({id: entryId, sourceId: `health_imp-${importId}-none`, sourceKind: 'food', snapshot: {name, servingGrams: null, nutrients: nutrition}, date, meal, quantityMilli, createdAt: at, updatedAt: at});
      return;
    }
    const key = JSON.stringify([name, brand, measure.servingGrams, measure.servingMl ?? null, nutrition]);
    let foodId = foodIds.get(key);
    if (!foodId) {
      foodId = `health_imp-${importId}-f${foodIds.size + 1}`; foodIds.set(key, foodId);
      plan.foods.push({id: foodId, name, brand, servingGrams: measure.servingGrams, ...(measure.servingMl !== undefined ? {servingMl: measure.servingMl} : {}), nutrients: nutrition, createdAt: at, updatedAt: at});
    }
    const food = plan.foods.find(f => f.id === foodId)!;
    plan.entries.push({id: entryId, sourceId: foodId, sourceKind: 'food', snapshot: foodSnapshot(food), date, meal, quantityMilli, createdAt: at, updatedAt: at});
  });
  plan.days = days.size;
  return plan;
}
export const DIARY_LIMIT_MESSAGE = 'This import would take your diary past its limit of 10,000 entries. Nothing was imported.';
export const FOODS_LIMIT_MESSAGE = 'This import would take your food library past its limit of 1,000 foods. Nothing was imported.';
/** The foods, then the entries, validated as one Health record; the store writes once. */
export function applyNutritionImport(data: HealthData, plan: NutritionPlan): HealthData {
  if (data.diary.length + plan.entries.length > 10_000) throw Error(DIARY_LIMIT_MESSAGE);
  if (data.foods.length + plan.foods.length > 1000) throw Error(FOODS_LIMIT_MESSAGE);
  const withFoods = plan.foods.reduce((current, food) => saveFood(current, food), data);
  return healthSchema.parse({...withFoods, diary: [...withFoods.diary, ...plan.entries]});
}
export const NUTRITION_UNDO_REFUSED = 'Some imported entries were edited or used since. Remove them one by one in Health.';
export class NutritionUndoRefused extends Error { constructor() { super(NUTRITION_UNDO_REFUSED); this.name = 'NutritionUndoRefused'; } }
/** Removes exactly the entries and foods an import created, only while none was edited or used since. */
export function undoNutritionImport(data: HealthData, record: ImportRecord): {data: HealthData; removed: number} {
  const ids = new Set(record.createdIds);
  const entries = data.diary.filter(e => ids.has(e.id)), foods = data.foods.filter(f => ids.has(f.id));
  if (entries.some(e => e.updatedAt !== record.at) || foods.some(f => f.updatedAt !== record.at)) throw new NutritionUndoRefused();
  const foodIds = new Set(foods.map(f => f.id));
  const used = data.recipes.some(r => r.ingredients.some(i => foodIds.has(i.foodId))) || (data.daily?.savedMeals ?? []).some(m => m.items.some(i => foodIds.has(i.sourceId))) || (data.daily?.favorites ?? []).some(f => foodIds.has(f.sourceId));
  if (used) throw new NutritionUndoRefused();
  const next = healthSchema.parse({...data, diary: data.diary.filter(e => !ids.has(e.id)), foods: data.foods.filter(f => !ids.has(f.id))});
  return {data: next, removed: entries.length + foods.length};
}
