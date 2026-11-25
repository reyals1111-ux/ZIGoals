import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {amountText, currencyCode} from '../money-log/schema';

/**
 * Session AK (7.3, COMPETITORS M7): bills and subscriptions, TIER 3 (stored format). A NEW device-only key, loose and
 * versioned (older builds never read it; a later field never makes this build refuse it). It holds the bills the person
 * confirmed from the money log or added by hand, the candidates they dismissed, and a per-bill note to self ("cancel
 * before the trial ends"). ZIGoals never pays, cancels or moves anything: these are reminders only. Amounts are decimal
 * strings in the bill's own currency, never converted. Not synced; for Export everything and the account erase.
 */
export const BILLS_KEY = 'zigoals:bills:v1';
export const BILL_CADENCES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
export type BillCadence = (typeof BILL_CADENCES)[number];
export const MAX_BILLS = 200, MAX_DISMISSED = 500;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Session AW X7 (LEDGER #462): at most this many payments for a bill that ends after a number of them (50 years monthly). */
export const MAX_END_PAYMENTS = 600;
export const billEndsSchema = z.looseObject({
  after: z.number().int().min(1).max(MAX_END_PAYMENTS).optional(),
  from: day.optional(),
  on: day.optional(),
}).refine(e => (e.after !== undefined && e.from !== undefined && e.on === undefined) || (e.on !== undefined && e.after === undefined), 'A number of payments from a day, or a last day.');
export type BillEnds = z.infer<typeof billEndsSchema>;
export const billSchema = z.looseObject({
  id,
  title: z.string().trim().min(1).max(80),
  amount: amountText,
  currency: currencyCode,
  cadence: z.enum(BILL_CADENCES),
  /** The anchor due date; later due dates step from it by the cadence (the 31st stays the month's last day). */
  nextDue: day,
  /** Confirmed from a candidate the money log showed, or written by hand. */
  origin: z.enum(['detected', 'manual']),
  /** A detected bill's candidate key, so the same candidate is not offered again. */
  matchKey: z.string().max(200).optional(),
  category: z.string().trim().max(40).optional(),
  /** The person's own note ("cancel before 1 Dec"), and the day they want to be reminded to act on it. */
  cancelNote: z.string().trim().max(300).optional(),
  cancelBy: day.optional(),
  /** Session AV lane 2 (money; Undebt.it's bill tracker), TIER 3 (stored format), additive and optional: the person's "paid automatically" mark. */
  autopay: z.literal(true).optional().catch(undefined),
  /**
   * Session AW, round 7 X7 (money; Cashew's "ends after", LEDGER #462), TIER 3 (stored format), additive and optional,
   * dropped on read when this build cannot read it: when the bill ends — after `after` payments counted from the due date
   * `from` (a phone contract of 24 months), or with the last payment on or before `on`. After its last payment the bill
   * leaves Upcoming bills, the calendar, the month's bills and the reminders (lib/bills/ends.ts); it stays in the Bill
   * tracker as ended, with its history. An older build ignores the field in the loose bill and keeps showing the bill,
   * which is safe.
   */
  ends: billEndsSchema.optional().catch(undefined),
  createdAt: z.iso.datetime({offset: true}),
});
export const billsSchema = z.looseObject({
  version: z.literal(1),
  bills: z.array(billSchema).max(MAX_BILLS),
  /** Candidate keys the person said are not bills, with the day they said so. */
  dismissed: z.array(z.looseObject({key: z.string().min(1).max(200), at: day})).max(MAX_DISMISSED),
});
export type Bill = z.infer<typeof billSchema>;
export type BillsRecord = z.infer<typeof billsSchema>;
export const emptyBills = (): BillsRecord => ({version: 1, bills: [], dismissed: []});
export const BILLS: DeviceRecordSpec<BillsRecord> = {key: BILLS_KEY, schema: billsSchema, empty: emptyBills};
