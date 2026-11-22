import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (F5a, item 1): what the debt payoff planner keeps, only when the person asks ("Keep these figures on this
 * device"): the currency shown, the extra amount a month, and per debt (by its account id in `zigoals:accounts:v1`) the
 * minimum monthly payment and, only for a debt whose account has no rate, the rate typed here. The accounts record is
 * never changed by the planner. A NEW device-only key, loose and versioned, every field optional, bounded; not synced.
 */
export const DEBT_PLANNER_KEY = 'zigoals:debt-planner:v1';
export const MAX_PLANNER_DEBTS = 200;
const amount = z.string().regex(/^\d{1,13}(\.\d{1,2})?$/);
const rate = z.string().regex(/^(?:0|[1-9]\d{0,2})(?:\.\d{1,4})?$/).refine(v => Number(v) <= 100, 'At most 100 %.');
/**
 * Session AV lane 2 (money; Undebt.it), TIER 3 (stored format), additive and optional per debt, each dropped on read when
 * unreadable: `promoRate` until `promoUntil` (an introductory rate, the person's own figure, then the usual rate), a
 * `note`, and `payoffBy` — the month the person wants it paid off (the plan funds it first, at the amount it needs).
 */
export const plannerDebtSchema = z.looseObject({minimum: amount.optional(), ratePercent: rate.optional(),
  promoRate: rate.optional().catch(undefined), promoUntil: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/).optional().catch(undefined),
  note: z.string().trim().min(1).max(300).optional().catch(undefined), payoffBy: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/).optional().catch(undefined)});
/**
 * Session AV (owner follow-up 1, F-DEBT-PLAN; Undebt.it; TIER 3 (stored format), additive and optional, each dropped on
 * read when it cannot be read; older builds keep them untouched in the loose object):
 * - `order`: "Your order" (account ids, first first);
 * - `lumps`: one-off extra payments by calendar month (at most 24);
 * - `shown`: which plan the month-by-month table shows;
 * - `tracked`: the plan as it stood on "Track this plan" (its own starting figures, so the comparison with what is
 *   recorded later does not move when the figures do).
 */
const monthKey = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/), debtId = z.string().min(1).max(100);
export const MAX_LUMPS = 24;
export const lumpSchema = z.looseObject({month: monthKey, amount});
export const STRATEGIES = ['snowball', 'avalanche', 'custom'] as const;
export const MORE_METHODS = ['interest', 'payment', 'cfi', 'targets'] as const;
export type MoreMethod = (typeof MORE_METHODS)[number];
export const trackedSchema = z.looseObject({
  on: z.iso.date(), strategy: z.enum(STRATEGIES), currency: z.string().regex(/^[A-Z]{3}$/), extra: amount.optional(),
  debts: z.array(z.looseObject({id: debtId, name: z.string().min(1).max(100), balance: amount, ratePercent: rate, minimum: amount})).min(1).max(50),
  order: z.array(debtId).max(MAX_PLANNER_DEBTS).optional(), lumps: z.array(lumpSchema).max(MAX_LUMPS).optional(),
  /** Session AV lane 2 (money): the further order it was kept with, and the Debt Blaster step (both optional). */
  method: z.enum(MORE_METHODS).optional().catch(undefined), stepUp: z.looseObject({amount, every: z.number().int().min(1).max(12)}).optional().catch(undefined),
});
export type TrackedPlan = z.infer<typeof trackedSchema>;
export const debtPlannerSchema = z.looseObject({
  version: z.literal(1),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  extra: amount.optional(),
  debts: z.record(z.string().min(1).max(100), plannerDebtSchema).refine(d => Object.keys(d).length <= MAX_PLANNER_DEBTS, `Up to ${MAX_PLANNER_DEBTS} debts.`).optional(),
  /** A label, e.g. the Showcase's "SHOWCASE DATA · fictional figures". */
  note: z.string().max(200).optional(),
  order: z.array(debtId).max(MAX_PLANNER_DEBTS).optional().catch(undefined),
  lumps: z.array(lumpSchema).max(MAX_LUMPS).optional().catch(undefined),
  shown: z.enum(STRATEGIES).optional().catch(undefined),
  tracked: trackedSchema.optional().catch(undefined),
  /**
   * Session AV lane 2 (money; Undebt.it), TIER 3 (stored format), additive and optional, dropped on read when unreadable:
   * `method`, one of the further orders (highest monthly interest, highest payment, Cash Flow Index, by target dates) —
   * the plan it gives is kept in `order` and `shown: 'custom'`, which older builds read as the same plan;
   * `stepUp`, Debt Blaster: the extra rises by an amount every 1, 3, 6 or 12 months.
   */
  method: z.enum(MORE_METHODS).optional().catch(undefined),
  stepUp: z.looseObject({amount, every: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)])}).optional().catch(undefined),
});
export type DebtPlannerRecord = z.infer<typeof debtPlannerSchema>;
export const emptyDebtPlanner = (): DebtPlannerRecord => ({version: 1});
export const DEBT_PLANNER: DeviceRecordSpec<DebtPlannerRecord> = {key: DEBT_PLANNER_KEY, schema: debtPlannerSchema, empty: emptyDebtPlanner};
