import {healthSchema, parseHealthNumber, type HealthData, type HealthDiaryEntry} from '../health';

/**
 * Session AV (owner follow-up 1, F-QUICK-KCAL; MyFitnessPal and MacroFactor's Quick Add): calories alone, logged to a
 * day and meal without a food in the library. The diary entry carries its own snapshot (as every entry does), named
 * "Quick add" or the person's few words, with protein, carbs and fat unknown (never zero). Nothing is added to the
 * library; the entry's source id names no library food, as an entry whose food was removed later does, so no stored
 * format changes. 1 to 10,000 kcal. Pure.
 */
export const QUICK_KCAL_NAME = 'Quick add';
/** Session AV lane 2 (food, LEDGER #86): a quick add's source id starts so (a valid Health id; no library food has it), so the Diary can say "Quick add". */
export const QUICK_ADD_PREFIX = 'health_quickadd-';
export const quickAddSourceId = (): string => `${QUICK_ADD_PREFIX}${crypto.randomUUID()}`;
/**
 * Session AV lane 2 (food, LEDGER #86; MyFitnessPal and MacroFactor's Quick Add): protein, carbs and fat may be given too,
 * each optional (0 to 1,000 g, up to three decimals). A blank one stays unknown, never zero, as before.
 */
export type QuickMacros = {protein?: string; carbs?: string; fat?: string};
const MACRO_WORDS = {protein: 'g protein', carbs: 'g carbs', fat: 'g fat'} as const;
export function quickMacro(raw: string | undefined, which: keyof QuickMacros): number | null {
  return raw?.trim() ? parseHealthNumber(raw, 1000, 0, 1_000_000, MACRO_WORDS[which]) : null;
}
export function quickCalories(data: HealthData, quick: {id: string; sourceId: string; kcal: string; name?: string; date: string; meal: HealthDiaryEntry['meal']} & QuickMacros, at: string): HealthData {
  const kcal = parseHealthNumber(quick.kcal, 1, 1, 10_000, 'kcal');
  const name = (quick.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || QUICK_KCAL_NAME;
  const nutrients = {kcal, proteinMg: quickMacro(quick.protein, 'protein'), carbsMg: quickMacro(quick.carbs, 'carbs'), fatMg: quickMacro(quick.fat, 'fat')};
  const entry = {id: quick.id, sourceId: quick.sourceId, sourceKind: 'food' as const, snapshot: {name, servingGrams: null, nutrients}, date: quick.date, meal: quick.meal, quantityMilli: 1000, createdAt: at, updatedAt: at};
  return healthSchema.parse({...data, diary: [...data.diary, entry]});
}
