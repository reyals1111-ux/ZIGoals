import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {amountText, currencyCode} from '../money-log/schema';

/**
 * Session AK (7.7, COMPETITORS M7): monthly category budgets with an optional rollover, TIER 3 (stored format). A NEW
 * device-only key, loose and versioned, so the money log's own record (`zigoals:money-log:v1`, with its weekly room to
 * spend) is never changed and older builds never read this one. One budget per category and currency; amounts are
 * decimal strings in that currency, never converted. Not synced; for Export everything and the account erase.
 */
export const BUDGETS_KEY = 'zigoals:budgets:v1';
export const MAX_BUDGETS = 100, MAX_ROLLOVER_MONTHS = 12;
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const budgetSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  category: z.string().trim().min(1).max(40),
  currency: currencyCode,
  /** The amount for each month. */
  monthly: amountText,
  /** When on, what a month leaves unspent carries into the next (at most 12 months back; an overspend never carries). */
  rollover: z.boolean(),
  /** The first month the budget counts (no carry from before it). */
  since: month,
});
export const budgetsSchema = z.looseObject({
  version: z.literal(1),
  budgets: z.array(budgetSchema).max(MAX_BUDGETS),
}).refine(r => new Set(r.budgets.map(b => `${b.currency}|${b.category.toLowerCase()}`)).size === r.budgets.length, 'One budget per category and currency.');
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetsRecord = z.infer<typeof budgetsSchema>;
export const emptyBudgets = (): BudgetsRecord => ({version: 1, budgets: []});
export const BUDGETS: DeviceRecordSpec<BudgetsRecord> = {key: BUDGETS_KEY, schema: budgetsSchema, empty: emptyBudgets};
