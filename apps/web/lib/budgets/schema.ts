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
  /**
   * Session AV (owner follow-up 1, F-BUDGET-TARGETS; YNAB targets), TIER 3 (stored format), additive and optional: save
   * towards `amount` by the end of `by` (a month). The month view says what each month needs from now on. A value this
   * build cannot read is dropped on read, never failing the record; older builds keep it untouched (loose object).
   */
  target: z.looseObject({amount: amountText, by: month}).optional().catch(undefined),
  /**
   * Session AV (owner follow-up 1, F-FRESH-MONTH; YNAB's fresh start), TIER 3 (stored format), additive and optional: the
   * month the person started fresh — nothing earlier carries into it or after it. A value this build cannot read is
   * dropped on read; older builds keep it untouched (loose object) and still show the carry they work out.
   */
  freshFrom: month.optional().catch(undefined),
  /**
   * Session AV lane 2 (money; YNAB target types and assign mode, Monarch flex budgeting and non-monthly budgets), TIER 3
   * (stored format), each additive and optional, dropped on read when this build cannot read it (older builds keep them
   * untouched in the loose object and count the budget's `monthly` as before):
   * - `need`: "needed for spending" — an amount each week, each month, or each year by its month (YNAB's target types,
   *   beside `target`, saving towards an amount by a month);
   * - `snoozed`: the month the person snoozed this budget's target (not counted in Underfunded that month);
   * - `months`: a different amount for a month (by month key, at most 36), in place of `monthly` that month;
   * - `bucket`: fixed, flexible or non-monthly (Monarch's flex budgeting; flexible ones share one "flexible left");
   * - `period`: a non-monthly budget — an amount every 3, 6 or 12 months, set aside a share each month (`monthly`);
   * - `start`: a starting balance carried into its first month (with rollover);
   * - `group`: the person's own group name (Bills, Everyday, …).
   */
  need: z.looseObject({kind: z.enum(['weekly', 'monthly', 'yearly']), amount: amountText, month: month.optional()}).optional().catch(undefined),
  snoozed: month.optional().catch(undefined),
  months: z.record(month, amountText).refine(m => Object.keys(m).length <= 36, 'At most 36 months.').optional().catch(undefined),
  bucket: z.enum(['fixed', 'flexible', 'non-monthly']).optional().catch(undefined),
  period: z.looseObject({every: z.union([z.literal(3), z.literal(6), z.literal(12)]), amount: amountText}).optional().catch(undefined),
  start: amountText.optional().catch(undefined),
  group: z.string().trim().min(1).max(40).optional().catch(undefined),
});
/**
 * Session AV (owner follow-up 1, F-WATCH; Rocket Money's Watchlist), TIER 3 (stored format), additive and optional: up
 * to 20 categories watched without a budget, each in one currency — this month so far against last month by the same
 * day. A list this build cannot read is dropped on read, never failing the record; older builds keep it (loose object).
 */
export const MAX_WATCHED = 20, MAX_MOVES = 200, MAX_CHALLENGES = 12;
export const watchedSchema = z.looseObject({category: z.string().trim().min(1).max(40), currency: z.string().regex(/^[A-Z]{3}$/)});
export const budgetsSchema = z.looseObject({
  version: z.literal(1),
  budgets: z.array(budgetSchema).max(MAX_BUDGETS),
  watch: z.array(watchedSchema).max(MAX_WATCHED).optional().catch(undefined),
  /**
   * Session AV lane 2 (money), TIER 3 (stored format), additive and optional, dropped on read when unreadable:
   * - `moves`: money moved between two budgets in one month (YNAB's move money), at most 200;
   * - `payees`: payees watched this month against last (Rocket Money's watchlist), at most 20;
   * - `challenges`: "spend less than last month in <category>" for a month (Rocket Money's challenges), at most 12;
   * - `onToday`: show what is left in each budget on Today (off unless the person turns it on).
   */
  moves: z.array(z.looseObject({id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), month, from: z.string().min(1).max(80), to: z.string().min(1).max(80), amount: amountText, at: z.iso.datetime({offset: true})})).max(MAX_MOVES).optional().catch(undefined),
  payees: z.array(z.looseObject({payee: z.string().trim().min(1).max(60), currency: currencyCode})).max(MAX_WATCHED).optional().catch(undefined),
  challenges: z.array(z.looseObject({id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), category: z.string().trim().min(1).max(40), currency: currencyCode, month})).max(MAX_CHALLENGES).optional().catch(undefined),
  onToday: z.literal(true).optional().catch(undefined),
}).refine(r => new Set(r.budgets.map(b => `${b.currency}|${b.category.toLowerCase()}`)).size === r.budgets.length, 'One budget per category and currency.');
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetsRecord = z.infer<typeof budgetsSchema>;
export const emptyBudgets = (): BudgetsRecord => ({version: 1, budgets: []});
export const BUDGETS: DeviceRecordSpec<BudgetsRecord> = {key: BUDGETS_KEY, schema: budgetsSchema, empty: emptyBudgets};
