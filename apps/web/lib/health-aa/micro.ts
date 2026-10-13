import * as z from 'zod';
import {MICRO_TARGETS_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';
import {additionalNutrients, recipeNutrition, scaleNutrition, type HealthData, type Nutrition} from '../health';

/**
 * N4: micronutrient targets (ADR-022 B6: the seven the format holds: fiber, sugars, saturated fats, sodium, potassium,
 * calcium, iron), default reference values the person can edit (device-only), today's totals against them where the
 * data has a value (unknown is never zero), and "which of my foods are high in …" over the person's own foods and recipes.
 */
export type MicroKey = (typeof additionalNutrients)[number][0];
export const MICRO_KEYS = additionalNutrients.map(([k]) => k) as MicroKey[];
/** Reference values in milligrams a day (fiber and sugars shown in grams): common adult guideline figures, editable; not advice. */
export const DEFAULT_MICRO_TARGETS: Record<MicroKey, number> = {fiberMg: 30_000, sugarMg: 50_000, saturatedFatMg: 20_000, sodiumMg: 2_300, potassiumMg: 3_500, calciumMg: 1_000, ironMg: 18};
export const MICRO_DIRECTION: Record<MicroKey, 'at-least' | 'at-most'> = {fiberMg: 'at-least', sugarMg: 'at-most', saturatedFatMg: 'at-most', sodiumMg: 'at-most', potassiumMg: 'at-least', calciumMg: 'at-least', ironMg: 'at-least'};
export const microTargetsSchema = z.looseObject({version: z.literal(1), targets: z.partialRecord(z.enum(MICRO_KEYS as [MicroKey, ...MicroKey[]]), z.number().int().min(1).max(1_000_000_000)).optional()});
export type MicroTargets = z.infer<typeof microTargetsSchema>;
export const emptyMicroTargets = (): MicroTargets => ({version: 1});
export const MICRO_TARGETS: DeviceRecordSpec<MicroTargets> = {key: MICRO_TARGETS_KEY, schema: microTargetsSchema, empty: emptyMicroTargets};
export const microTarget = (r: MicroTargets, key: MicroKey) => r.targets?.[key] ?? DEFAULT_MICRO_TARGETS[key];
export const setMicroTarget = (r: MicroTargets, key: MicroKey, mg: number | null): MicroTargets => { const targets = {...(r.targets ?? {})}; if (mg === null) delete targets[key]; else targets[key] = mg; return microTargetsSchema.parse({...r, targets: Object.keys(targets).length ? targets : undefined}); };
export type MicroDay = {key: MicroKey; label: string; unit: string; scale: number; total: number | null; known: number; entries: number; target: number; direction: 'at-least' | 'at-most'};
export function microDay(data: HealthData, date: string, r: MicroTargets): MicroDay[] {
  const entries = data.diary.filter(d => d.date === date);
  return additionalNutrients.map(([key, label, unit, scale]) => {
    let total: number | null = null, known = 0;
    for (const e of entries) { const n = scaleNutrition(e.snapshot.nutrients, e.quantityMilli)[key]; if (n !== undefined) { known++; total = (total ?? 0) + n; } }
    return {key, label, unit, scale, total, known, entries: entries.length, target: microTarget(r, key), direction: MICRO_DIRECTION[key]};
  });
}
export type RichFood = {id: string; kind: 'food' | 'recipe'; name: string; mgPerServing: number; serving: string};
/** The person's own foods and recipes with the most of a nutrient per serving; items without a value are left out, never read as zero. */
export function richIn(data: HealthData, key: MicroKey, limit = 6): RichFood[] {
  const rows: RichFood[] = [];
  for (const f of data.foods) { const v = (f.nutrients as Nutrition)[key]; if (v !== undefined && v > 0) rows.push({id: f.id, kind: 'food', name: f.name, mgPerServing: v, serving: f.servingGrams !== null ? `${f.servingGrams} g` : `${f.servingMl ?? '?'} mL`}); }
  for (const r of data.recipes) { const v = recipeNutrition(r)[key]; if (v !== undefined && v > 0) rows.push({id: r.id, kind: 'recipe', name: r.name, mgPerServing: v, serving: 'per serving'}); }
  return rows.sort((a, b) => b.mgPerServing - a.mgPerServing).slice(0, limit);
}
