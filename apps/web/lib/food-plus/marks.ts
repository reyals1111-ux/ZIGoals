import type {HealthFood} from '../health';
import {EATING_STYLES, foodPlusSchema, type FoodPlus} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #198 Lose It!'s diet plans that flag foods, #199 Yazio's food ratings): marks a food
 * gets from its own nutrients, never "good" or "bad", and never a Nutri-Score (Open Food Facts gives that letter to a
 * product; a generic food never gets one, components/health/nutri-score.tsx). Pure.
 * - "Fits low carb / high protein / high fibre" for the eating style the person chose: low carb when carbs give at most
 *   10 % of the food's calories; high protein when protein gives at least 25 %; high fibre at 3 g or more per 100 kcal
 *   (the EU "high fibre" claim's per-energy rule). A value the food does not carry gives no mark.
 * - The label levels (the UK front-of-pack rule, per 100 g of a food, not a drink): fat low ≤ 3 g, high > 17.5 g;
 *   saturated fat low ≤ 1.5 g, high > 5 g; sugars low ≤ 5 g, high > 22.5 g; salt low ≤ 0.3 g, high > 1.5 g (salt is
 *   sodium × 2.5); medium between. Only for a food measured in grams with that value known.
 */
export type EatingStyle = (typeof EATING_STYLES)[number];
export const STYLE_WORDS: Readonly<Record<EatingStyle, {en: string; nl: string}>> = {'low-carb': {en: 'low carb', nl: 'koolhydraatarm'}, 'high-protein': {en: 'high protein', nl: 'eiwitrijk'}, 'high-fibre': {en: 'high fibre', nl: 'vezelrijk'}};
export function fitsStyle(food: Pick<HealthFood, 'nutrients'>, style: EatingStyle): boolean | null {
  const n = food.nutrients, kcal = n.kcal;
  if (kcal === null || kcal <= 0) return null;
  if (style === 'low-carb') return n.carbsMg === null ? null : n.carbsMg / 1000 * 4 <= kcal * 0.10;
  if (style === 'high-protein') return n.proteinMg === null ? null : n.proteinMg / 1000 * 4 >= kcal * 0.25;
  return n.fiberMg === undefined ? null : n.fiberMg / 1000 / kcal * 100 >= 3;
}
export type Level = 'low' | 'medium' | 'high';
const RULES = [['fat', 'Fat', 3, 17.5], ['saturatedFat', 'Saturated fat', 1.5, 5], ['sugars', 'Sugars', 5, 22.5], ['salt', 'Salt', 0.3, 1.5]] as const;
export type LabelLevel = {key: (typeof RULES)[number][0]; name: string; level: Level; per100g: number};
export function labelLevels(food: Pick<HealthFood, 'nutrients' | 'servingGrams'>): LabelLevel[] {
  const g = food.servingGrams;
  if (!g || g <= 0) return [];
  const n = food.nutrients, per100 = (mg: number | null | undefined) => mg === null || mg === undefined ? null : mg / 1000 / g * 100;
  const values: Record<(typeof RULES)[number][0], number | null> = {fat: per100(n.fatMg), saturatedFat: per100(n.saturatedFatMg), sugars: per100(n.sugarMg), salt: n.sodiumMg === undefined ? null : n.sodiumMg * 2.5 / 1000 / g * 100};
  return RULES.flatMap(([key, name, low, high]) => { const v = values[key]; return v === null ? [] : [{key, name, level: v <= low ? 'low' as const : v > high ? 'high' as const : 'medium' as const, per100g: Math.round(v * 10) / 10}]; });
}
export function setMarks(record: FoodPlus, change: {style?: EatingStyle | null; levels?: boolean}): FoodPlus {
  const next: Record<string, unknown> = {...record.marks};
  if (change.style !== undefined) { if (change.style) next.style = change.style; else delete next.style; }
  if (change.levels !== undefined) { if (change.levels) next.levels = true; else delete next.levels; }
  const {marks: _m, ...rest} = record; void _m;
  return foodPlusSchema.parse(Object.keys(next).length ? {...rest, marks: next} : rest);
}
