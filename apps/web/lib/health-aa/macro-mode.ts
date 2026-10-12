import * as z from 'zod';
import {MACRO_MODE_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';
import type {Nutrition} from '../health';

/**
 * N7: macro modes, display only (device-only, ADR-022 B1): standard; net carbs (carbs minus fiber where fiber is known,
 * else the carbs as they are, said so); keto (net carbs with a 70/25/5 fat/protein/carb view); custom (the person's own
 * split in percent of calories). The targets record stays as it is; a split only changes what the day is compared with.
 */
export const MACRO_MODES = ['standard', 'net-carbs', 'keto', 'custom'] as const;
export type MacroMode = (typeof MACRO_MODES)[number];
export const macroModeSchema = z.looseObject({version: z.literal(1), mode: z.enum(MACRO_MODES), split: z.looseObject({fat: z.number().int().min(0).max(100), protein: z.number().int().min(0).max(100), carbs: z.number().int().min(0).max(100)}).optional()}).refine(r => !r.split || r.split.fat + r.split.protein + r.split.carbs === 100, 'A split adds up to 100 %.');
export type MacroModeRecord = z.infer<typeof macroModeSchema>;
export const emptyMacroMode = (): MacroModeRecord => ({version: 1, mode: 'standard'});
export const MACRO_MODE: DeviceRecordSpec<MacroModeRecord> = {key: MACRO_MODE_KEY, schema: macroModeSchema, empty: emptyMacroMode};
export const KETO_SPLIT = {fat: 70, protein: 25, carbs: 5} as const;
export const setMacroMode = (r: MacroModeRecord, mode: MacroMode, split?: {fat: number; protein: number; carbs: number}): MacroModeRecord => macroModeSchema.parse({...r, mode, ...(mode === 'custom' ? {split: split ?? r.split ?? {fat: 30, protein: 30, carbs: 40}} : mode === 'keto' ? {split: KETO_SPLIT} : {split: undefined})});
export type NetCarbs = {grams: number | null; net: boolean; fiberKnownOf: number};
/** Net carbs over a day's entries: carbs minus fiber where every read entry had a fiber value; otherwise plain carbs and `net: false`. */
export function netCarbs(nutrients: readonly Nutrition[]): NetCarbs {
  let carbs: number | null = null, fiber = 0, fiberKnown = 0;
  for (const n of nutrients) { if (n.carbsMg !== null) carbs = (carbs ?? 0) + n.carbsMg; if (n.fiberMg !== undefined) { fiber += n.fiberMg; fiberKnown++; } }
  if (carbs === null) return {grams: null, net: false, fiberKnownOf: 0};
  const net = fiberKnown === nutrients.length && nutrients.length > 0;
  return {grams: Math.max(0, Math.round((carbs - (net ? fiber : 0)) / 1000)), net, fiberKnownOf: fiberKnown};
}
/** The grams a split means for a calorie target (fat 9, protein 4, carbs 4 kcal per gram). */
export function splitGrams(kcal: number, split: {fat: number; protein: number; carbs: number}) {
  return {fat: Math.round(kcal * split.fat / 100 / 9), protein: Math.round(kcal * split.protein / 100 / 4), carbs: Math.round(kcal * split.carbs / 100 / 4)};
}
