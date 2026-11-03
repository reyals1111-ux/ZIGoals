import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {HealthData, HealthDiaryEntry, HealthRecipe} from '../health';

/**
 * Session AK (task 4.4): the nutrients beyond the app's nutrition format and its vitamin record: magnesium, zinc, B1, B2,
 * B3, B6 and omega-3. Health's nutrition is strict (a new field there would make released builds refuse Health), so these
 * live in their own device-only record (`zigoals:nutrient-extras:v1`, loose and versioned), in the vitamins' shape:
 * - `foods`: per food id, one serving's values, as the source gave them (the offline library today);
 * - `entries`: per diary entry id, the values it was logged with (frozen, so a later edit never rewrites history);
 * an entry without one reads its food's (or recipe's) values now. Every value is an integer in thousandths of a mg
 * (0.05 mg of B1 is 50), so a small figure stays exact. Unknown is absent, never zero. Not synced.
 */
export const NUTRIENT_EXTRAS_KEY = 'zigoals:nutrient-extras:v1';
export const NUTRIENT_EXTRAS = [
  ['magnesiumMg', 'Magnesium', 'mg'], ['zincMg', 'Zinc', 'mg'], ['b1Mg', 'Vitamin B1 (thiamin)', 'mg'], ['b2Mg', 'Vitamin B2 (riboflavin)', 'mg'],
  ['b3Mg', 'Vitamin B3 (niacin)', 'mg'], ['b6Mg', 'Vitamin B6', 'mg'], ['omega3Mg', 'Omega-3 fats', 'mg'],
] as const;
export type ExtraKey = (typeof NUTRIENT_EXTRAS)[number][0];
export const EXTRA_KEYS = NUTRIENT_EXTRAS.map(([k]) => k) as ExtraKey[];
export const EXTRA_SCALE = 1000;
/** General guidance for adults, a day, in thousandths of a mg (the US Daily Values; omega-3: the adequate intake of ALA for men). Not advice. */
export const EXTRA_REFERENCE: Record<ExtraKey, number> = {magnesiumMg: 420_000, zincMg: 11_000, b1Mg: 1_200, b2Mg: 1_300, b3Mg: 16_000, b6Mg: 1_700, omega3Mg: 1_600_000};
export const MAX_EXTRA = 1_000_000_000, MAX_EXTRA_FOODS = 2000, MAX_EXTRA_ENTRIES = 20_000;
export type NutrientExtraValues = Partial<Record<ExtraKey, number>>;
const amount = z.number().int().min(0).max(MAX_EXTRA);
export const extraValuesSchema = z.looseObject(Object.fromEntries(EXTRA_KEYS.map(k => [k, amount.optional()])) as Record<ExtraKey, z.ZodOptional<typeof amount>>);
const id = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
export const nutrientExtrasSchema = z.looseObject({
  version: z.literal(1),
  foods: z.record(id, extraValuesSchema).optional(),
  entries: z.record(id, extraValuesSchema).optional(),
}).refine(r => Object.keys(r.foods ?? {}).length <= MAX_EXTRA_FOODS && Object.keys(r.entries ?? {}).length <= MAX_EXTRA_ENTRIES, 'Too many foods or entries remembered.');
export type NutrientExtras = z.infer<typeof nutrientExtrasSchema>;
export const emptyNutrientExtras = (): NutrientExtras => ({version: 1});
export const NUTRIENT_EXTRAS_RECORD: DeviceRecordSpec<NutrientExtras> = {key: NUTRIENT_EXTRAS_KEY, schema: nutrientExtrasSchema, empty: emptyNutrientExtras};

const known = (v: NutrientExtraValues | undefined) => EXTRA_KEYS.filter(k => typeof v?.[k] === 'number');
const clean = (v: NutrientExtraValues | undefined): NutrientExtraValues => Object.fromEntries(known(v).map(k => [k, v![k]!]));
export const scaleExtras = (v: NutrientExtraValues | undefined, quantityMilli: number): NutrientExtraValues => Object.fromEntries(known(v).map(k => [k, Math.round(v![k]! * quantityMilli / 1000)]));
/** A recipe's values per portion: known only when every ingredient's food gives it. */
export function recipeExtras(r: NutrientExtras, recipe: HealthRecipe): NutrientExtraValues {
  const out: NutrientExtraValues = {};
  for (const k of EXTRA_KEYS) {
    const values = recipe.ingredients.map(item => r.foods?.[item.foodId]?.[k]);
    if (!values.length || values.some(v => v === undefined)) continue;
    out[k] = Math.round(recipe.ingredients.reduce((total, item, i) => total + values[i]! * item.quantityMilli, 0) / recipe.portionsMilli);
  }
  return out;
}
/** What a diary entry holds: its frozen values, or its source's now (unknown when the source has none). */
export function entryExtras(r: NutrientExtras, data: Pick<HealthData, 'recipes'>, entry: HealthDiaryEntry): NutrientExtraValues {
  const frozen = r.entries?.[entry.id];
  if (frozen) return clean(frozen);
  if (entry.sourceKind === 'food') return scaleExtras(r.foods?.[entry.sourceId], entry.quantityMilli);
  const recipe = data.recipes.find(x => x.id === entry.sourceId);
  return recipe ? scaleExtras(recipeExtras(r, recipe), entry.quantityMilli) : {};
}
/**
 * Keeps a food's values (per serving) and, when given, the logged entry's (already scaled), pruning entries whose diary
 * record is gone. Nothing is written for values that are all unknown.
 */
export function rememberExtras(r: NutrientExtras, liveEntryIds: readonly string[], foodId: string, perServing: NutrientExtraValues, entry?: {id: string; quantityMilli: number}): NutrientExtras {
  id.parse(foodId);
  const values = clean(perServing);
  if (!known(values).length) return r;
  const live = new Set(liveEntryIds), entries: Record<string, NutrientExtraValues> = {};
  for (const [entryId, v] of Object.entries(r.entries ?? {})) if (live.has(entryId)) entries[entryId] = v;
  if (entry) { id.parse(entry.id); entries[entry.id] = scaleExtras(values, entry.quantityMilli); }
  return nutrientExtrasSchema.parse({...r, foods: {...(r.foods ?? {}), [foodId]: values}, entries});
}
/** Forgets a food's values (its entries keep what they were logged with only when frozen). */
export function forgetFoodExtras(r: NutrientExtras, foodId: string): NutrientExtras {
  if (!r.foods?.[foodId]) return r;
  const foods = {...r.foods}; delete foods[foodId];
  return nutrientExtrasSchema.parse({...r, foods});
}
