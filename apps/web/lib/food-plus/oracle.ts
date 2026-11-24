import {entryOf, normaliseFoodText, type GenericFoodEntry} from '../food-generic/search';
import type {LoadedGenericSource} from '../food-generic/load';
import {notEatenAsFood, usualPortionGrams} from '../food-generic/portion';

/**
 * Session AV lane 2 (food, LEDGER #100; Cronometer's Oracle): the offline food library's richest foods in any nutrient it
 * carries — protein, fiber, the minerals, the vitamins and omega-3 — not only the seven of "Which of my foods are high
 * in…". Foods as people eat them (dried herbs, spices, seaweed and powders left out, lib/food-generic/portion.ts), ranked
 * by a usual portion or per 100 kcal (Cronometer's "nutrient density"), with the per-100 g value beside it. Only foods that
 * carry a value count (unknown is not zero). Pure over the loaded sources.
 */
export type OracleNutrient = {key: string; label: string; nl: string; unit: string; /** stored units per shown unit */ scale: number; read: (e: GenericFoodEntry) => number | undefined | null};
const n = (key: string, label: string, nl: string, unit: string, scale: number, read: OracleNutrient['read']): OracleNutrient => ({key, label, nl, unit, scale, read});
export const ORACLE_NUTRIENTS: readonly OracleNutrient[] = [
  n('protein', 'Protein', 'Eiwit', 'g', 1000, e => e.nutrients.proteinMg),
  n('fiber', 'Fiber', 'Vezels', 'g', 1000, e => e.nutrients.fiberMg),
  n('potassium', 'Potassium', 'Kalium', 'mg', 1, e => e.nutrients.potassiumMg),
  n('calcium', 'Calcium', 'Calcium', 'mg', 1, e => e.nutrients.calciumMg),
  n('iron', 'Iron', 'IJzer', 'mg', 1, e => e.nutrients.ironMg),
  n('magnesium', 'Magnesium', 'Magnesium', 'mg', 1, e => e.more.magnesiumMg),
  n('zinc', 'Zinc', 'Zink', 'mg', 1, e => e.more.zincMg),
  n('vitamin-a', 'Vitamin A', 'Vitamine A', 'µg', 1000, e => e.vitamins.aUg),
  n('vitamin-c', 'Vitamin C', 'Vitamine C', 'mg', 1000, e => e.vitamins.cMg),
  n('vitamin-d', 'Vitamin D', 'Vitamine D', 'µg', 1000, e => e.vitamins.dUg),
  n('vitamin-e', 'Vitamin E', 'Vitamine E', 'mg', 1000, e => e.vitamins.eMg),
  n('vitamin-k', 'Vitamin K', 'Vitamine K', 'µg', 1000, e => e.vitamins.kUg),
  n('vitamin-b1', 'Vitamin B1 (thiamin)', 'Vitamine B1 (thiamine)', 'mg', 1, e => e.more.b1Mg),
  n('vitamin-b2', 'Vitamin B2 (riboflavin)', 'Vitamine B2 (riboflavine)', 'mg', 1, e => e.more.b2Mg),
  n('vitamin-b3', 'Vitamin B3 (niacin)', 'Vitamine B3 (niacine)', 'mg', 1, e => e.more.b3Mg),
  n('vitamin-b6', 'Vitamin B6', 'Vitamine B6', 'mg', 1, e => e.more.b6Mg),
  n('vitamin-b12', 'Vitamin B12', 'Vitamine B12', 'µg', 1000, e => e.vitamins.b12Ug),
  n('folate', 'Folate', 'Foliumzuur', 'µg', 1000, e => e.vitamins.folateUg),
  n('omega-3', 'Omega-3', 'Omega-3', 'mg', 1, e => e.more.omega3Mg),
];
export const oracleNutrient = (key: string) => ORACLE_NUTRIENTS.find(x => x.key === key) ?? null;
export type OracleRank = 'portion' | 'kcal';
export type OracleFood = {name: string; sourceName: string; per100g: number; portionGrams: number; perPortion: number; per100kcal: number | null};
export function oracleFoods(sources: readonly LoadedGenericSource[], key: string, rank: OracleRank = 'portion', limit = 10): OracleFood[] {
  const nutrient = oracleNutrient(key);
  if (!nutrient) return [];
  const best = new Map<string, OracleFood>();
  for (const {entry, file} of sources) for (const row of file.foods) {
    if (notEatenAsFood(row[1])) continue;
    const e = entryOf(file, entry, row), value = nutrient.read(e);
    if (value === undefined || value === null || !(value > 0)) continue;
    const k = normaliseFoodText(row[1]), had = best.get(k), portionGrams = usualPortionGrams(row[1]), kcal = e.nutrients.kcal;
    if (!had || had.per100g < value) best.set(k, {name: row[1], sourceName: entry.name, per100g: value, portionGrams, perPortion: value * portionGrams / 100, per100kcal: kcal && kcal >= 5 ? value / kcal * 100 : null});
  }
  const score = (f: OracleFood) => rank === 'kcal' ? f.per100kcal ?? -1 : f.perPortion;
  return [...best.values()].filter(f => rank === 'portion' || f.per100kcal !== null).sort((a, b) => score(b) - score(a) || b.per100g - a.per100g || a.name.localeCompare(b.name)).slice(0, limit);
}
/** A value in the nutrient's shown unit, plainly rounded (one decimal under 10, whole above). */
export function oracleAmount(value: number, nutrient: OracleNutrient): string {
  const shown = value / nutrient.scale;
  return `${shown >= 10 ? Math.round(shown).toLocaleString('en-US') : (Math.round(shown * 10) / 10).toLocaleString('en-US')} ${nutrient.unit}`;
}
