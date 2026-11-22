import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {MONEY_MORE_KEY_LITERAL} from '../av2-money-r2-keys';
import {amountText, currencyCode, PAID_WITH} from '../money-log/schema';

/**
 * Session AV lane 2, round 2 (money; Wallet by BudgetBakers, Spendee, Emma), TIER 3 (stored format): a NEW device-only
 * record, loose and versioned, so the money log and budgets records are never reshaped and older builds never read this
 * one. Every list bounded; a part this build cannot read is dropped on read, never failing the record. Not synced; in
 * Export everything, the restore and the account erase (lib/av2-money-r2-keys.ts).
 * - `saved`: up to 20 saved entries (Wallet's record templates), each one tap in the money form.
 * - `budgets`: up to 20 of the person's own budgets (Spendee's budgets by label, Wallet's one-time budgets): entries with
 *   one tag, or in chosen categories, against an amount each month or once between two days.
 * - `owed`: what others owe the person from a shared cost (Emma's split), by name, until settled.
 * - `loans`: money lent to or borrowed from someone (Wallet's debts), with a due day, repayments in parts, and closed or
 *   forgiven.
 * - `space`: the money space shown (`business`; missing: personal), and `business`: the business space's own name.
 */
export const MONEY_MORE_KEY = MONEY_MORE_KEY_LITERAL;
export const MAX_PLANNED = 100, MAX_SAVED = 20, MAX_OWN_BUDGETS = 20, MAX_OWED = 500, MAX_LOANS = 200, MAX_REPAID = 200;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const name = z.string().trim().min(1).max(40);
export const savedEntrySchema = z.looseObject({
  id, name, kind: z.enum(['expense', 'income']), amount: amountText, currency: currencyCode, category: name,
  sub: name.optional().catch(undefined), note: z.string().trim().max(200).optional().catch(undefined), paidWith: z.enum(PAID_WITH).optional().catch(undefined),
});
export const ownBudgetSchema = z.looseObject({
  id, name, currency: currencyCode, amount: amountText,
  /** Entries carrying this tag (as the tags record keeps it, lower case), in any category. */
  tag: z.string().min(1).max(24).optional().catch(undefined),
  /** Or entries in these categories (at most 20). */
  categories: z.array(name).min(1).max(20).optional().catch(undefined),
  /** Each month, or once from `from` to `to`. */
  every: z.enum(['month', 'once']), from: day.optional().catch(undefined), to: day.optional().catch(undefined),
});
export const owedSchema = z.looseObject({
  id, name, amount: amountText, currency: currencyCode, date: day,
  /** The money-log entry of the shared cost. */
  entryId: id.optional().catch(undefined), note: z.string().trim().max(80).optional().catch(undefined),
  /** The day it was settled (the money back as an entry in the log, left out of the figures). */
  settled: day.optional().catch(undefined),
});
export const loanSchema = z.looseObject({
  id, kind: z.enum(['lent', 'borrowed']), name, amount: amountText, currency: currencyCode, date: day,
  due: day.optional().catch(undefined), remind: z.literal(true).optional().catch(undefined), note: z.string().trim().max(80).optional().catch(undefined),
  repaid: z.array(z.looseObject({date: day, amount: amountText})).max(MAX_REPAID).optional().catch(undefined),
  closed: day.optional().catch(undefined), forgiven: z.literal(true).optional().catch(undefined),
});
export const plannedSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(60), amount: amountText, currency: currencyCode, date: day,
  category: name.optional().catch(undefined),
});
export const moneyMoreSchema = z.looseObject({
  version: z.literal(1),
  saved: z.array(savedEntrySchema).max(MAX_SAVED).optional().catch(undefined),
  budgets: z.array(ownBudgetSchema).max(MAX_OWN_BUDGETS).optional().catch(undefined),
  owed: z.array(owedSchema).max(MAX_OWED).optional().catch(undefined),
  loans: z.array(loanSchema).max(MAX_LOANS).optional().catch(undefined),
  space: z.literal('business').optional().catch(undefined),
  business: z.looseObject({name: z.string().trim().min(1).max(30)}).optional().catch(undefined),
  /**
   * Session AV lane 2, round 3 (money; Simplifi's planned spending), TIER 3 (stored format), additive: up to 100 planned
   * one-off costs (a name, an amount, a day, optionally a category), counted in the cash forecast and in "Left this month"
   * until an entry in the money log matches one or the person clears it (lib/cash-forecast/planned.ts).
   */
  planned: z.array(plannedSchema).max(MAX_PLANNED).optional().catch(undefined),
  /** Session AV lane 2, round 3 (money; Simplifi's projected cash flow): the forecast's length (missing: 60 days). */
  forecast: z.enum(['6m', '12m']).optional().catch(undefined),
});
export type SavedEntry = z.infer<typeof savedEntrySchema>;
export type OwnBudget = z.infer<typeof ownBudgetSchema>;
export type Owed = z.infer<typeof owedSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type PlannedCost = z.infer<typeof plannedSchema>;
export type MoneyMore = z.infer<typeof moneyMoreSchema>;
export const emptyMoneyMore = (): MoneyMore => ({version: 1});
export const MONEY_MORE: DeviceRecordSpec<MoneyMore> = {key: MONEY_MORE_KEY, schema: moneyMoreSchema, empty: emptyMoneyMore};
