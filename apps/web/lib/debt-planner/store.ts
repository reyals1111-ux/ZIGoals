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
export const plannerDebtSchema = z.looseObject({minimum: amount.optional(), ratePercent: rate.optional()});
export const debtPlannerSchema = z.looseObject({
  version: z.literal(1),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  extra: amount.optional(),
  debts: z.record(z.string().min(1).max(100), plannerDebtSchema).refine(d => Object.keys(d).length <= MAX_PLANNER_DEBTS, `Up to ${MAX_PLANNER_DEBTS} debts.`).optional(),
  /** A label, e.g. the Showcase's "SHOWCASE DATA · fictional figures". */
  note: z.string().max(200).optional(),
});
export type DebtPlannerRecord = z.infer<typeof debtPlannerSchema>;
export const emptyDebtPlanner = (): DebtPlannerRecord => ({version: 1});
export const DEBT_PLANNER: DeviceRecordSpec<DebtPlannerRecord> = {key: DEBT_PLANNER_KEY, schema: debtPlannerSchema, empty: emptyDebtPlanner};
