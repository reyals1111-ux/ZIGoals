import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2 (food; TIER 3 stored format: one new device key, additive): the food-logging choices kept beside the
 * strict, synced Health journal, on this device only — `zigoals:food-plus:v1`. The Health record is strict (a field added
 * there would make an older build refuse the whole journal), so this record is versioned and loose (the ADR-022 B1
 * pattern, as `zigoals:health-extras:v1`): every part is optional, and a part this build cannot read is dropped on its
 * own (`.catch(undefined)`), never the whole record. Exported, restored and erased with the Health device records; never
 * synced. Parts:
 * - `times` (LEDGER #101, Cronometer's diary timestamps): an eaten-at time per diary entry id ("12:30"), or "none" when
 *   the person took the time off. With no value, an entry logged on its own day reads its time from its `createdAt`
 *   (lib/food-plus/times.ts), so nothing is stored until the person changes one.
 * - `weekdays` (LEDGER #88, #97, #107; MyFitnessPal's goals by day, Cronometer's Macro Scheduler): calories and macro
 *   grams for a weekday ("0" Sunday … "6" Saturday). A weekday with no value keeps the Targets' own.
 * - `sugarAlcohols` (LEDGER #88, net carbs): grams of sugar alcohols per serving of a library food (mg), by food id.
 * - `checkIn` (LEDGER #106, MacroFactor's check-in): the weekday of the weekly check-in, and days marked "partly
 *   logged" that the energy estimate leaves out.
 * - `challenge` (LEDGER #90, MyFitnessPal's challenges): a weekly logging challenge — days a week, and since when.
 * - `notify` (LEDGER #90): meal reminders as device notifications too (the in-app cards stay as they are).
 * - `pace` (LEDGER #107, MacroFactor's goal pace): the weekly change in kg chosen on the maintenance-estimate card
 *   (−0.5, −0.25, 0 or +0.25), which the weekly coach and the goal date then use.
 * - `photos` (LEDGER #103): which library foods have a front-of-pack photo on this device (the photo itself is in
 *   IndexedDB, lib/food-plus/photos.ts), with when it was taken.
 */
export const FOOD_PLUS_KEY = 'zigoals:food-plus:v1';
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const healthId = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
export const WEEKDAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const;
const gramsTarget = z.number().int().min(0).max(5_000);
const dayTargetSchema = z.looseObject({kcal: z.number().int().min(1).max(100_000).optional(), proteinG: gramsTarget.optional(), carbsG: gramsTarget.optional(), fatG: gramsTarget.optional()});
export type DayTarget = z.infer<typeof dayTargetSchema>;
const day = z.iso.date();
export const foodPlusSchema = z.looseObject({
  version: z.literal(1),
  times: z.record(healthId, z.union([clock, z.literal('none')])).optional().catch(undefined),
  weekdays: z.partialRecord(z.enum(WEEKDAY_KEYS), dayTargetSchema).optional().catch(undefined),
  sugarAlcohols: z.record(healthId, z.number().int().min(0).max(1_000_000)).optional().catch(undefined),
  checkIn: z.looseObject({weekday: z.number().int().min(0).max(6).optional().catch(undefined), partial: z.array(day).max(1000).optional().catch(undefined)}).optional().catch(undefined),
  challenge: z.looseObject({daysPerWeek: z.number().int().min(1).max(7), since: day}).optional().catch(undefined),
  notify: z.boolean().optional().catch(undefined),
  photos: z.record(healthId, z.looseObject({takenAt: z.iso.datetime()})).optional().catch(undefined),
  pace: z.number().min(-1).max(1).optional().catch(undefined),
});
export type FoodPlus = z.infer<typeof foodPlusSchema>;
export const emptyFoodPlus = (): FoodPlus => ({version: 1});
export const FOOD_PLUS: DeviceRecordSpec<FoodPlus> = {key: FOOD_PLUS_KEY, schema: foodPlusSchema, empty: emptyFoodPlus};
export const isClock = (value: string) => clock.safeParse(value).success;
