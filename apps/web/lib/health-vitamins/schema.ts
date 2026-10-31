import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {HEALTH_VITAMINS_KEY} from '../ab-cloud-device-keys';
import type {HealthData, HealthDiaryEntry, HealthRecipe} from '../health';

/**
 * Session AB-Cloud Part 4 (ADR-023 C20): vitamins beside the nutrition format, never inside it. Health v4's nutrition is
 * strict in #32–#39, so vitamins live in this device record (`zigoals:health-vitamins:v1`, loose and versioned), synced in
 * the encrypted `health` extras section under Health's consent.
 *
 * - `foods`: per food id, the vitamins of one serving as the label gives them.
 * - `entries`: per diary entry id, the vitamins it was logged with, frozen when its food's vitamins are edited later (so an
 *   edit never rewrites history); an entry without one reads its food's (or recipe's) vitamins now.
 * - `targets`: the person's own daily targets, editable like the seven nutrients; common adult reference values otherwise.
 * Every value is an integer in thousandths of its unit (`aUg` 900 µg is 900000; B12's 2.4 µg is 2400), so a microgram
 * figure stays exact. Unknown is absent, never zero.
 */
export {HEALTH_VITAMINS_KEY};
export const VITAMINS = [
  ['aUg', 'Vitamin A', 'µg'], ['cMg', 'Vitamin C', 'mg'], ['dUg', 'Vitamin D', 'µg'], ['eMg', 'Vitamin E', 'mg'],
  ['kUg', 'Vitamin K', 'µg'], ['b12Ug', 'Vitamin B12', 'µg'], ['folateUg', 'Folate', 'µg'],
] as const;
export type VitaminKey = (typeof VITAMINS)[number][0];
export const VITAMIN_KEYS = VITAMINS.map(([k]) => k) as VitaminKey[];
/** Thousandths of the unit per stored step. */
export const VITAMIN_SCALE = 1000;
/** Common adult reference values per day (the US Daily Values), editable; not advice. Thousandths of the unit. */
export const DEFAULT_VITAMIN_TARGETS: Record<VitaminKey, number> = {aUg: 900_000, cMg: 90_000, dUg: 20_000, eMg: 15_000, kUg: 120_000, b12Ug: 2_400, folateUg: 400_000};
export const MAX_VITAMIN = 1_000_000_000, MAX_FOODS = 2000, MAX_ENTRIES = 20_000;
const amount = z.number().int().min(0).max(MAX_VITAMIN);
export const vitaminsSchema = z.looseObject(Object.fromEntries(VITAMIN_KEYS.map(k => [k, amount.optional()])) as Record<VitaminKey, z.ZodOptional<typeof amount>>);
export type Vitamins = Partial<Record<VitaminKey, number>>;
const id = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
export const healthVitaminsSchema = z.looseObject({
  version: z.literal(1),
  foods: z.record(id, vitaminsSchema).optional(),
  entries: z.record(id, vitaminsSchema).optional(),
  targets: z.looseObject(Object.fromEntries(VITAMIN_KEYS.map(k => [k, z.number().int().min(1).max(MAX_VITAMIN).optional()])) as Record<VitaminKey, z.ZodOptional<z.ZodNumber>>).optional(),
}).refine(r => Object.keys(r.foods ?? {}).length <= MAX_FOODS && Object.keys(r.entries ?? {}).length <= MAX_ENTRIES, 'Too many foods or entries remembered.');
export type HealthVitamins = z.infer<typeof healthVitaminsSchema>;
export const emptyHealthVitamins = (): HealthVitamins => ({version: 1});
export const HEALTH_VITAMINS: DeviceRecordSpec<HealthVitamins> = {key: HEALTH_VITAMINS_KEY, schema: healthVitaminsSchema, empty: emptyHealthVitamins};

const known = (v: Vitamins | undefined) => VITAMIN_KEYS.filter(k => v?.[k] !== undefined);
const clean = (v: Vitamins): Vitamins => Object.fromEntries(known(v).map(k => [k, v[k]!]));
/** Rounded once, like scaleNutrition: value × quantity / 1000. */
const scaled = (v: number, quantityMilli: number) => Math.round(v * quantityMilli / 1000);
export function scaleVitamins(v: Vitamins | undefined, quantityMilli: number): Vitamins {
  return Object.fromEntries(known(v).map(k => [k, scaled(v![k]!, quantityMilli)]));
}
/** A recipe's vitamins per portion: a vitamin is known only when every ingredient's food gives it (as recipeNutrition). */
export function recipeVitamins(r: HealthVitamins, recipe: HealthRecipe): Vitamins {
  const out: Vitamins = {};
  for (const k of VITAMIN_KEYS) {
    const values = recipe.ingredients.map(item => r.foods?.[item.foodId]?.[k]);
    if (!values.length || values.some(v => v === undefined)) continue;
    out[k] = Math.round(recipe.ingredients.reduce((total, item, i) => total + values[i]! * item.quantityMilli, 0) / recipe.portionsMilli);
  }
  return out;
}
/** What a diary entry holds: its frozen vitamins, or its source's now (unknown when the source has none). */
export function entryVitamins(r: HealthVitamins, data: Pick<HealthData, 'recipes'>, entry: HealthDiaryEntry): Vitamins {
  const frozen = r.entries?.[entry.id];
  if (frozen) return clean(frozen);
  if (entry.sourceKind === 'food') return scaleVitamins(r.foods?.[entry.sourceId], entry.quantityMilli);
  const recipe = data.recipes.find(x => x.id === entry.sourceId);
  return recipe ? scaleVitamins(recipeVitamins(r, recipe), entry.quantityMilli) : {};
}
export const vitaminTarget = (r: HealthVitamins, k: VitaminKey) => r.targets?.[k] ?? DEFAULT_VITAMIN_TARGETS[k];
export type VitaminDay = {key: VitaminKey; label: string; unit: string; total: number | null; known: number; entries: number; target: number};
/** Today's totals against the targets: entries without a value are counted as unknown, never as zero. */
export function vitaminDay(data: Pick<HealthData, 'diary' | 'recipes'>, date: string, r: HealthVitamins): VitaminDay[] {
  const entries = data.diary.filter(d => d.date === date), values = entries.map(e => entryVitamins(r, data, e));
  return VITAMINS.map(([key, label, unit]) => {
    let total: number | null = null, count = 0;
    for (const v of values) if (v[key] !== undefined) { count++; total = (total ?? 0) + v[key]!; }
    return {key, label, unit, total, known: count, entries: entries.length, target: vitaminTarget(r, key)};
  });
}

/**
 * Sets a food's vitamins (null clears them). Diary entries that read this food's vitamins now (directly or through a
 * recipe) and hold no frozen copy keep the values they were logged with: they are frozen first. Entries of diary records
 * that no longer exist are pruned on the way.
 */
export function setFoodVitamins(r: HealthVitamins, data: Pick<HealthData, 'diary' | 'recipes'>, foodId: string, vitamins: Vitamins | null): HealthVitamins {
  id.parse(foodId);
  const live = new Set(data.diary.map(d => d.id)), entries: Record<string, Vitamins> = {};
  for (const [entryId, v] of Object.entries(r.entries ?? {})) if (live.has(entryId)) entries[entryId] = v;
  const uses = (d: HealthDiaryEntry) => d.sourceKind === 'food' ? d.sourceId === foodId : data.recipes.find(x => x.id === d.sourceId)?.ingredients.some(i => i.foodId === foodId) ?? false;
  for (const d of data.diary) if (!entries[d.id] && uses(d)) { const before = entryVitamins(r, data, d); if (known(before).length) entries[d.id] = before; }
  const foods = {...(r.foods ?? {})}, next = vitamins ? clean(vitamins) : {};
  if (known(next).length) foods[foodId] = next; else delete foods[foodId];
  return healthVitaminsSchema.parse({...r, foods, entries});
}
/** A daily target, or null for the reference value. */
export function setVitaminTarget(r: HealthVitamins, k: VitaminKey, value: number | null): HealthVitamins {
  const targets = {...(r.targets ?? {})};
  if (value === null) delete targets[k]; else targets[k] = value;
  return healthVitaminsSchema.parse({...r, targets});
}
/** Reads one input in the vitamin's unit ("2.4", "2,4"); blank is unknown (null). Refuses what is not a number from 0 up. */
export function parseVitamin(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  if (!/^\d+(\.\d{1,3})?$/.test(t)) throw Error('Enter a vitamin as a number such as 2.4, or leave it blank when the label does not give it.');
  const v = Math.round(Number(t) * VITAMIN_SCALE);
  if (v > MAX_VITAMIN) throw Error('That vitamin amount is too large.');
  return v;
}
export const vitaminText = (v: number | undefined) => v === undefined ? '' : String(v / VITAMIN_SCALE);
/**
 * Session AK (task 4.4): the vitamins of a food that was just created from a source (the offline library, FoodData
 * Central), per serving. No entry reads this food yet except the one logged with it, which should read exactly these, so
 * nothing is frozen; a food that already holds vitamins goes through `setFoodVitamins` instead (it is refused here).
 */
export function setNewFoodVitamins(r: HealthVitamins, foodId: string, vitamins: Vitamins): HealthVitamins {
  id.parse(foodId);
  const next = clean(vitamins);
  if (!known(next).length) return r;
  if (r.foods?.[foodId]) throw Error('This food already has vitamins; edit them on the food.');
  return healthVitaminsSchema.parse({...r, foods: {...(r.foods ?? {}), [foodId]: next}});
}
