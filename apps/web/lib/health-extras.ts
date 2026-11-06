import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';
import {HEALTH_MEALS, type HealthData, type WaterEntry} from './health';
import {isInvisibleName} from './visible-text';
import {ML_PER_US_FL_OZ} from './health-units';

/**
 * Session AL third pass (L2): small Health choices kept beside the synced journal, on this device only. The synced Health
 * record is strict, so a field added there would make an older build refuse the whole journal; this record is versioned
 * and loose instead (the ADR-022 B1 pattern), and every read tolerates a part it does not know.
 * - `meals` (GAP-045, C-MO-03): your own name and usual time for each of the four diary meals. The stored meal of an
 *   entry stays Breakfast, Lunch, Dinner or Snacks; only the words shown change.
 * - `drinks` (GAP-079, C-MO-09): what a water entry was (coffee, tea…) and its caffeine when you typed it, keyed by the
 *   entry's id. Every drink still counts as water as you logged it: no hydration factor is applied.
 */
export const HEALTH_EXTRAS_KEY = 'zigoals:health-extras:v1';
export const DRINK_TYPES = ['water', 'coffee', 'tea', 'milk', 'juice', 'soft drink', 'other'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];
export type Meal = (typeof HEALTH_MEALS)[number];
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const MEAL_NAME_MAX = 24, CAFFEINE_MAX_MG = 1000;
// Session AL fourth pass (C-DVG-38): an optional calorie target per meal (additive, optional; older builds ignore it).
const mealPrefSchema = z.looseObject({name: z.string().trim().min(1).max(MEAL_NAME_MAX).optional(), time: clock.optional(), kcal: z.number().int().min(1).max(10_000).optional()});
const drinkSchema = z.looseObject({type: z.enum(DRINK_TYPES), caffeineMg: z.number().int().min(0).max(CAFFEINE_MAX_MG).optional()});
export const healthExtrasSchema = z.looseObject({
  version: z.literal(1),
  meals: z.partialRecord(z.enum(HEALTH_MEALS), mealPrefSchema).optional(),
  drinks: z.record(z.string().min(1).max(100), drinkSchema).optional(),
  // Session AL sweep 3 (C-MO-10, C-MO-37): a reminder on Today at each meal's usual time (lib/meal-reminders.ts). Optional
  // and loose; a value this build cannot read is dropped on its own, never the whole record.
  mealReminders: z.looseObject({on: z.boolean(), dismissed: z.partialRecord(z.enum(HEALTH_MEALS), z.iso.date()).optional().catch(undefined)}).optional().catch(undefined),
});
export type HealthExtras = z.infer<typeof healthExtrasSchema>;
export const emptyHealthExtras = (): HealthExtras => ({version: 1});
export const HEALTH_EXTRAS: DeviceRecordSpec<HealthExtras> = {key: HEALTH_EXTRAS_KEY, schema: healthExtrasSchema, empty: emptyHealthExtras};

/** The name shown for a meal: yours, or the meal's own. */
export const mealLabel = (extras: HealthExtras | null | undefined, meal: Meal): string => extras?.meals?.[meal]?.name ?? meal;
/** Your usual time for a meal ("07:30"), or null. */
export const mealTime = (extras: HealthExtras | null | undefined, meal: Meal): string | null => extras?.meals?.[meal]?.time ?? null;
/** "Pre-workout · 07:30", "Lunch", for headings and menus. */
export const mealHeading = (extras: HealthExtras | null | undefined, meal: Meal): string => { const time = mealTime(extras, meal); return time ? `${mealLabel(extras, meal)} · ${time}` : mealLabel(extras, meal); };

export type MealPrefIssue = {field: 'name' | 'time' | 'kcal'; message: string};
/** Session AL fourth pass (C-DVG-38): your calorie target for one meal, or null. */
export const mealKcalTarget = (extras: HealthExtras | null | undefined, meal: Meal): number | null => extras?.meals?.[meal]?.kcal ?? null;
/**
 * Saves a meal's own name and time. Blank clears it (the meal's own name, no time). Returns the issue to say under the
 * field instead of throwing, so the form can mark the right one.
 */
export function setMealPref(r: HealthExtras, meal: Meal, input: {name: string; time: string; kcal?: string}): {ok: true; value: HealthExtras} | {ok: false; issue: MealPrefIssue} {
  const name = input.name.trim(), time = input.time.trim(), kcalText = (input.kcal ?? '').trim();
  if (name && isInvisibleName(name)) return {ok: false, issue: {field: 'name', message: 'Type a name with letters or numbers, or leave it blank.'}};
  if (name.length > MEAL_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${MEAL_NAME_MAX} characters or fewer.`}};
  if (time && !clock.safeParse(time).success) return {ok: false, issue: {field: 'time', message: 'Enter a time like 07:30, or leave it blank.'}};
  if (kcalText && (!/^\d+$/.test(kcalText) || Number(kcalText) < 1 || Number(kcalText) > 10_000)) return {ok: false, issue: {field: 'kcal', message: 'Enter a calorie target from 1 to 10,000 kcal for this meal, or leave it blank.'}};
  // A target kept from before stays when the caller does not pass the field.
  const kcal = input.kcal === undefined ? r.meals?.[meal]?.kcal : kcalText ? Number(kcalText) : undefined;
  const meals = {...(r.meals ?? {})};
  const pref = {...(name && name !== meal ? {name} : {}), ...(time ? {time} : {}), ...(kcal !== undefined ? {kcal} : {})};
  if (Object.keys(pref).length) meals[meal] = pref; else delete meals[meal];
  return {ok: true, value: healthExtrasSchema.parse({...r, meals: Object.keys(meals).length ? meals : undefined})};
}

/** What a water entry was; an entry with no note is plain water. */
export const drinkOf = (extras: HealthExtras | null | undefined, entryId: string): {type: DrinkType; caffeineMg?: number} => extras?.drinks?.[entryId] ?? {type: 'water'};
export const drinkWord = (type: DrinkType) => type === 'soft drink' ? 'Soft drink' : type[0]!.toUpperCase() + type.slice(1);
/** Reads the caffeine field: blank is unknown (undefined), never zero; the reason is said when it cannot be read. */
export function readCaffeine(raw: string): {ok: true; mg: number | undefined} | {ok: false; message: string} {
  const text = raw.trim().replace(/\s*mg$/i, '');
  if (!text) return {ok: true, mg: undefined};
  if (!/^\d+$/.test(text)) return {ok: false, message: 'Caffeine is a whole number of milligrams, like 95, or blank.'};
  const mg = Number(text);
  if (mg > CAFFEINE_MAX_MG) return {ok: false, message: `Caffeine for one drink goes up to ${CAFFEINE_MAX_MG} mg.`};
  return {ok: true, mg};
}
/** Notes (or clears, for plain water with no caffeine) what one water entry was. */
export function setDrink(r: HealthExtras, entryId: string, type: DrinkType, caffeineMg?: number): HealthExtras {
  const drinks = {...(r.drinks ?? {})};
  if (type === 'water' && caffeineMg === undefined) delete drinks[entryId];
  else drinks[entryId] = {type, ...(caffeineMg !== undefined ? {caffeineMg} : {})};
  return healthExtrasSchema.parse({...r, drinks: Object.keys(drinks).length ? drinks : undefined});
}
/** Drops notes whose water entry no longer exists (after a removal), so the record does not grow forever. */
export function pruneDrinks(r: HealthExtras, liveIds: ReadonlySet<string>): HealthExtras {
  if (!r.drinks) return r;
  const drinks = Object.fromEntries(Object.entries(r.drinks).filter(([id]) => liveIds.has(id)));
  return Object.keys(drinks).length === Object.keys(r.drinks).length ? r : healthExtrasSchema.parse({...r, drinks: Object.keys(drinks).length ? drinks : undefined});
}
const entryMl = (w: Pick<WaterEntry, 'amountMilli' | 'unit'>) => w.unit === 'ml' ? w.amountMilli / 1000 : w.amountMilli / 1000 * ML_PER_US_FL_OZ;
export type DrinkDay = {byType: {type: DrinkType; ml: number; entries: number}[]; caffeineMg: number | null; caffeineKnown: number; caffeineUnknown: number};
/**
 * A day's drinks by type, and the caffeine you typed. Coffee, tea and soft drinks without a caffeine amount are counted
 * as unknown (said beside the total), never as zero.
 */
export function drinkDay(extras: HealthExtras | null | undefined, water: readonly WaterEntry[], date: string): DrinkDay {
  const types = new Map<DrinkType, {ml: number; entries: number}>();
  let caffeine = 0, known = 0, unknown = 0;
  for (const w of water) {
    if (w.date !== date) continue;
    const drink = drinkOf(extras, w.id), current = types.get(drink.type) ?? {ml: 0, entries: 0};
    types.set(drink.type, {ml: current.ml + entryMl(w), entries: current.entries + 1});
    if (drink.caffeineMg !== undefined) { caffeine += drink.caffeineMg; known++; }
    else if (drink.type === 'coffee' || drink.type === 'tea' || drink.type === 'soft drink') unknown++;
  }
  return {byType: DRINK_TYPES.filter(t => types.has(t)).map(type => ({type, ...types.get(type)!})), caffeineMg: known ? caffeine : null, caffeineKnown: known, caffeineUnknown: unknown};
}
/** The day's water entries, for drinkDay. */
export const waterEntries = (data: HealthData): readonly WaterEntry[] => data.daily?.water ?? [];
