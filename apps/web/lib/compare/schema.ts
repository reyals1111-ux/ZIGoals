import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (lane S, item 2: "Does X affect Y?"): the last pair the person chose in Health → Insights → Compare, and
 * nothing else. A new device-only key, loose and versioned; every field optional. Written only when the person changes a
 * choice (never on view); the comparison itself is worked out on the device each time and never stored.
 */
export const COMPARE_PAIR_KEY = 'zigoals:compare-pair:v1';
export const comparePairSchema = z.looseObject({
  version: z.literal(1),
  /** The factor's id: `habit:<id>`, `sleep-tag:<tag>`, `journal-tag:<tag>`, `workout`, `fasting` or `spend`. */
  factor: z.string().min(1).max(120).optional(),
  /** The outcome's id (lib/compare/engine.ts OUTCOMES); an id this build does not know reads as no choice. */
  outcome: z.string().min(1).max(40).optional(),
  lag: z.enum(['same', 'next']).optional(),
  /** The spending factor's amount, in the money log's most used currency. */
  amount: z.number().finite().min(0).max(1_000_000_000).optional(),
});
export type ComparePair = z.infer<typeof comparePairSchema>;
export const emptyComparePair = (): ComparePair => ({version: 1});
export const COMPARE_PAIR: DeviceRecordSpec<ComparePair> = {key: COMPARE_PAIR_KEY, schema: comparePairSchema, empty: emptyComparePair};
