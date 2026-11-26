import {MAX_END_PAYMENTS, billEndsSchema, billsSchema, type Bill, type BillEnds, type BillsRecord} from './schema';
// Session AW Part 2 (speed, attempt 2): a bill's last payment and the range it reaches live in lib/bills/ends-core.ts (the
// agenda, the calendar and the month read only those); still read from here.
import {firstIndexFrom, lastDueOf, type EndsOf} from './ends-core';
export {billTo, hasEnded, lastDueOf, liveBills} from './ends-core';

/**
 * Session AW, round 7 X7 (money; Cashew's "ends after", LEDGER #462): a bill that ends. A bill keeps its due dates on its
 * own steps from its anchor (`nextDue`, stepped forward and back by its cadence; lib/bills/cadence.ts). With `ends`:
 * - `after` payments from `from`: the payments are the bill's due dates on or after `from`, and the last is the `after`-th;
 * - `on`: the last payment is the bill's last due date on or before `on`.
 * After the last payment the bill leaves Upcoming bills, the calendar, the month's bills, the agenda and the reminders
 * (each reads `billTo` / `hasEnded`); it stays in the record (and in the Bill tracker, as ended). "3 of 24 left" counts
 * the due dates from today to the last one. Facts from the person's own bill; nothing is paid or cancelled. Pure.
 */
export type PaymentsLeft = {left: number; of: number | null; last: string; ended: boolean};
/** How many payments are left from `today` (today's included) to the last, of how many (with `after`), and the last day. */
export function paymentsLeft(bill: EndsOf, today: string): PaymentsLeft | null {
  const last = lastDueOf(bill);
  if (last === null || !bill.ends) return null;
  if (last < today) return {left: 0, of: bill.ends.after ?? null, last, ended: true};
  const kLast = firstIndexFrom(bill.nextDue, bill.cadence, last), kToday = firstIndexFrom(bill.nextDue, bill.cadence, today);
  const kFirst = bill.ends.after !== undefined && bill.ends.from ? firstIndexFrom(bill.nextDue, bill.cadence, bill.ends.from) : kToday;
  return {left: Math.max(0, kLast - Math.max(kToday, kFirst) + 1), of: bill.ends.after ?? null, last, ended: false};
}

export type EndsChoice = {kind: 'never'} | {kind: 'after'; count: string; from: string} | {kind: 'on'; date: string};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const realDay = (d: string) => DAY.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
/** Why a choice cannot be kept, in plain words, or null. */
export function endsProblem(choice: EndsChoice): string | null {
  if (choice.kind === 'after') {
    const n = Number(choice.count.trim());
    if (!/^\d{1,3}$/.test(choice.count.trim()) || n < 1 || n > MAX_END_PAYMENTS) return `Enter how many payments, from 1 to ${MAX_END_PAYMENTS}.`;
    if (!realDay(choice.from)) return 'Choose the day of the first payment.';
  }
  if (choice.kind === 'on' && !realDay(choice.date)) return 'Choose the day of the last payment.';
  return null;
}
/** The stored `ends` of a choice (undefined for "keeps going"); throws with the plain reason. */
export function endsOf(choice: EndsChoice): BillEnds | undefined {
  const problem = endsProblem(choice); if (problem) throw new Error(problem);
  if (choice.kind === 'never') return undefined;
  return billEndsSchema.parse(choice.kind === 'after' ? {after: Number(choice.count.trim()), from: choice.from} : {on: choice.date});
}
/** The choice a bill's `ends` shows in a form (a new choice starts from the bill's next due date). */
export const choiceOf = (bill: Pick<Bill, 'nextDue'> & {ends?: BillEnds | undefined}): EndsChoice =>
  bill.ends?.after !== undefined && bill.ends.from ? {kind: 'after', count: String(bill.ends.after), from: bill.ends.from} : bill.ends?.on ? {kind: 'on', date: bill.ends.on} : {kind: 'never'};
/** The bill with its end set, changed or removed (the record's other bills as they are). */
export function setEnds(record: BillsRecord, id: string, ends: BillEnds | undefined): BillsRecord {
  return billsSchema.parse({...record, bills: record.bills.map(b => { if (b.id !== id) return b; const {ends: _e, ...rest} = b; void _e; return ends ? {...rest, ends} : rest; })});
}
