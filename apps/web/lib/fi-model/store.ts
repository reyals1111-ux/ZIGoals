import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (lane M, item 12): the last inputs of the "Financial freedom" model, so it opens as the person left it.
 * A NEW device-only key, loose and versioned, every field optional; no result is stored (it is worked out again).
 * Not synced; for Export everything and the account erase.
 */
export const FI_MODEL_KEY = 'zigoals:fi-model:v1';
const money = z.number().finite().min(0).max(1e12);
export const MAX_LIFE_EVENTS = 12, MAX_SCENARIOS = 4;
export const lifeEventSchema = z.looseObject({id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), title: z.string().trim().min(1).max(60), year: z.number().int().min(1).max(60), amount: money, kind: z.enum(['in', 'out']), every: z.enum(['once', 'yearly']),
  /** Session AV lane 2 (money; Kubera's Fast Forward), TIER 3 additive: the tax rate the person types for this income stream. */ taxPct: z.number().min(0).max(100).optional().catch(undefined)});
export const fiModelSchema = z.looseObject({
  version: z.literal(1),
  inputs: z.looseObject({
    invested: money.optional(), yearlySpend: money.optional(), monthlyContribution: money.optional(),
    withdrawalPct: z.number().min(1).max(10).optional(), returnPct: z.number().min(-10).max(20).optional(),
    volatilityPct: z.number().min(0).max(60).optional(), years: z.number().int().min(1).max(60).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    /** Session AV lane 2 (money; Kubera's Fast Forward), TIER 3 additive: the inflation a year the person expects, for figures in the money of each year beside today's. */
    inflationPct: z.number().min(0).max(20).optional().catch(undefined),
  }).optional(),
  /**
   * Session AV lane 2 (money; Monarch's forecast scenarios and life events), TIER 3 (stored format), additive and optional,
   * dropped on read when unreadable (older builds keep them in the loose record): `events`, one-off or yearly amounts in or
   * out in a given year of the model (a car, a sabbatical, a pension starting); `scenarios`, up to four saved sets of
   * inputs and events, shown side by side. Still a model from the person's own figures, never a promise.
   */
  events: z.array(lifeEventSchema).max(MAX_LIFE_EVENTS).optional().catch(undefined),
  scenarios: z.array(z.looseObject({id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), name: z.string().trim().min(1).max(40), inputs: z.looseObject({}), events: z.array(lifeEventSchema).max(MAX_LIFE_EVENTS).optional()})).max(MAX_SCENARIOS).optional().catch(undefined),
});
export type FiModelRecord = z.infer<typeof fiModelSchema>;
export const emptyFiModel = (): FiModelRecord => ({version: 1});
export const FI_MODEL: DeviceRecordSpec<FiModelRecord> = {key: FI_MODEL_KEY, schema: fiModelSchema, empty: emptyFiModel};
