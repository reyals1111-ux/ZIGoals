import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (lane M, item 12): the last inputs of the "Financial freedom" model, so it opens as the person left it.
 * A NEW device-only key, loose and versioned, every field optional; no result is stored (it is worked out again).
 * Not synced; for Export everything and the account erase.
 */
export const FI_MODEL_KEY = 'zigoals:fi-model:v1';
const money = z.number().finite().min(0).max(1e12);
export const fiModelSchema = z.looseObject({
  version: z.literal(1),
  inputs: z.looseObject({
    invested: money.optional(), yearlySpend: money.optional(), monthlyContribution: money.optional(),
    withdrawalPct: z.number().min(1).max(10).optional(), returnPct: z.number().min(-10).max(20).optional(),
    volatilityPct: z.number().min(0).max(60).optional(), years: z.number().int().min(1).max(60).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  }).optional(),
});
export type FiModelRecord = z.infer<typeof fiModelSchema>;
export const emptyFiModel = (): FiModelRecord => ({version: 1});
export const FI_MODEL: DeviceRecordSpec<FiModelRecord> = {key: FI_MODEL_KEY, schema: fiModelSchema, empty: emptyFiModel};
