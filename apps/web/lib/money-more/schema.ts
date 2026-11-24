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
/**
 * Session AV lane 2, round 4 (money; Lunch Money's Query Tool): a money search kept with a name, shown as a chart. Only
 * the filters (never an entry or an amount found); each one optional and dropped on read when unreadable.
 */
export const MAX_QUESTIONS = 10, MAX_PLACES = 20, MAX_PLACE_PAYEES = 40;
const filterText = z.string().trim().min(1).max(80);
export const questionSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(60),
  text: filterText.optional().catch(undefined), not: filterText.optional().catch(undefined), payee: filterText.optional().catch(undefined),
  kind: z.enum(['expense', 'income']).optional().catch(undefined), category: name.optional().catch(undefined), sub: name.optional().catch(undefined),
  from: day.optional().catch(undefined), to: day.optional().catch(undefined),
  min: amountText.optional().catch(undefined), max: amountText.optional().catch(undefined),
  counted: z.enum(['counted', 'left-out']).optional().catch(undefined), tax: z.literal(true).optional().catch(undefined),
  paidWith: z.enum(['cash', 'debit', 'credit', 'transfer', 'other', 'unmarked']).optional().catch(undefined), tag: z.string().min(1).max(24).optional().catch(undefined),
  /** How the chart is drawn: by month (missing), by week or by category. */
  by: z.enum(['week', 'category']).optional().catch(undefined),
});
/**
 * Session AV lane 2, round 4 (money; Actual's payee locations, without location data): a place the person names
 * ("Work", "The market") and the payees they logged while they chose it, so Quick log offers those first there. Typed
 * names only: no coordinates, no map and no outside service; never on an entry; "Forget places" clears them.
 */
export const placeSchema = z.looseObject({
  id, name: z.string().trim().min(1).max(40),
  payees: z.array(z.string().trim().min(1).max(60)).max(MAX_PLACE_PAYEES).optional().catch(undefined),
});
/**
 * Session AV lane 2, round 5 (money; PocketSmith's what-if scenarios, LEDGER #388), TIER 3 (stored format): a "Try a
 * change" kept by name on this device — up to three made-up changes to the cash forecast in one currency (a one-off
 * amount on a day, or an amount each month from a day, optionally until a day), money out or in. A model only: never an
 * entry, a bill or a plan. Each part optional and dropped on read when unreadable.
 */
export const MAX_WHAT_IFS = 5, MAX_WHAT_IF_CHANGES = 3, MAX_LOOKED = 400;
export const whatIfChangeSchema = z.looseObject({
  kind: z.enum(['once', 'monthly']), dir: z.enum(['out', 'in']), amount: amountText, from: day,
  until: day.optional().catch(undefined), label: z.string().trim().min(1).max(60).optional().catch(undefined),
});
export const whatIfSchema = z.looseObject({id, name, currency: currencyCode, changes: z.array(whatIfChangeSchema).min(1).max(MAX_WHAT_IF_CHANGES)});
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
  /**
   * Session AV lane 2, round 4 (money), TIER 3 (stored format), additive and optional, dropped on read when unreadable:
   * `questions`, up to ten saved money searches with a chart (Lunch Money's Query Tool), and `places`, up to twenty
   * typed place names with their payees (Actual's payee locations, without location data).
   */
  questions: z.array(questionSchema).max(MAX_QUESTIONS).optional().catch(undefined),
  places: z.array(placeSchema).max(MAX_PLACES).optional().catch(undefined),
  /**
   * Session AV lane 2, round 5 (money; LEDGER #388), TIER 3 (stored format), additive and optional, dropped on read when
   * unreadable: up to five named "Try a change" sets for the cash forecast (a model, never written as entries or bills).
   */
  whatIfs: z.array(whatIfSchema).max(MAX_WHAT_IFS).optional().catch(undefined),
  /**
   * Session AV lane 2, round 6 (money; EveryDollar's streaks, LEDGER #427), TIER 3 (stored format), additive and optional,
   * dropped on read when unreadable: the money streak — `on` (off unless the person turns it on) and `looked`, the days
   * (at most the last 400) the person said "I looked at my money today". Entries logged and bank files read count by
   * themselves (their own times). Older builds keep it (loose object) and ignore it.
   */
  streak: z.looseObject({on: z.literal(true).optional().catch(undefined), looked: z.array(day).max(MAX_LOOKED).optional().catch(undefined)}).optional().catch(undefined),
});
export type SavedEntry = z.infer<typeof savedEntrySchema>;
export type OwnBudget = z.infer<typeof ownBudgetSchema>;
export type Owed = z.infer<typeof owedSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type PlannedCost = z.infer<typeof plannedSchema>;
export type SavedQuestion = z.infer<typeof questionSchema>;
export type PayeePlace = z.infer<typeof placeSchema>;
export type WhatIf = z.infer<typeof whatIfSchema>;
export type WhatIfChange = z.infer<typeof whatIfChangeSchema>;
export type MoneyMore = z.infer<typeof moneyMoreSchema>;
export const emptyMoneyMore = (): MoneyMore => ({version: 1});
export const MONEY_MORE: DeviceRecordSpec<MoneyMore> = {key: MONEY_MORE_KEY, schema: moneyMoreSchema, empty: emptyMoneyMore};
