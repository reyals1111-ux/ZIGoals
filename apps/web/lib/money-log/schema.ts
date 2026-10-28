import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3 competitor gap, ADR-034): the expense and income log with a weekly "room to spend", TIER 3 (stored
 * format). A new device-only key, loose and versioned, so a later field never makes this build refuse the record and older
 * builds simply do not read it. Amounts are decimal strings in the entry's own currency (two decimals), never converted.
 * In Export everything and the encrypted backup; not synced (ADR-034 N18).
 */
export const MONEY_LOG_KEY = 'zigoals:money-log:v1';
export const EXPENSE_CATEGORIES = ['Food & drink', 'Groceries', 'Transport', 'Home', 'Bills', 'Subscriptions', 'Health', 'Fun', 'Shopping', 'Gifts', 'Other'] as const;
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Refund', 'Other income'] as const;
export const MAX_ENTRIES = 10_000, AMOUNT_MAX = 1_000_000_000;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const amountText = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v => Number(v) > 0 && Number(v) <= AMOUNT_MAX, 'An amount above zero and at most a billion.');
export const currencyCode = z.string().regex(/^[A-Z]{3}$/);
export const moneyEntrySchema = z.looseObject({
  id, kind: z.enum(['expense', 'income']), amount: amountText, currency: currencyCode,
  category: z.string().trim().min(1).max(40), note: z.string().trim().max(200).optional(), date: day,
  createdAt: z.iso.datetime({offset: true}),
  /** Where it came from: the person's own form, ZIGi's card, or a quick line. */
  source: z.enum(['form', 'zigi', 'quick']).optional(),
});
export const moneyLogSchema = z.looseObject({
  version: z.literal(1),
  entries: z.array(moneyEntrySchema).max(MAX_ENTRIES),
  /** The weekly budget for spending ("room to spend"), in one currency; none set: no room line. */
  budget: z.looseObject({weekly: amountText, currency: currencyCode}).optional(),
  /** The day a week starts on for the room to spend. */
  weekStartsOn: z.enum(['monday', 'sunday']).default('monday'),
  /** The currency the form starts with (the person's last choice). */
  currency: currencyCode.optional(),
});
export type MoneyEntry = z.infer<typeof moneyEntrySchema>;
export type MoneyLog = z.infer<typeof moneyLogSchema>;
export const emptyMoneyLog = (): MoneyLog => ({version: 1, entries: [], weekStartsOn: 'monday'});
export const MONEY_LOG: DeviceRecordSpec<MoneyLog> = {key: MONEY_LOG_KEY, schema: moneyLogSchema, empty: emptyMoneyLog};
