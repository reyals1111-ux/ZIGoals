import {addLocalDays} from '../local-date';
import {CADENCE_DAYS, daysBetween, stepDue} from './cadence';
import type {Bill, BillCadence, BillEnds, BillsRecord} from './schema';

/**
 * Session AW, round 7 X7 (money; Cashew's "ends after", LEDGER #462), the reading part (Session AW Part 2, speed): when a
 * bill that ends has its last payment, and the last day a range may reach for it. lib/bills/ends.ts (the "Ends" choice
 * and "3 of 24 left") re-exports these. Pure.
 */
/** The index k of the bill's first step on or after `from` (stepDue(anchor, cadence, k) >= from). */
export function firstIndexFrom(anchor: string, cadence: BillCadence, from: string): number {
  let k = Math.floor(daysBetween(anchor, from) / CADENCE_DAYS[cadence].days) - 2;
  for (let guard = 0; guard < 50 && stepDue(anchor, cadence, k) >= from; guard++) k -= 2;
  for (let guard = 0; guard < 60 && stepDue(anchor, cadence, k) < from; guard++) k++;
  return k;
}
export type EndsOf = Pick<Bill, 'nextDue' | 'cadence'> & {ends?: BillEnds | undefined};
/** The bill's last payment date, or null when it does not end (or its end cannot be read). */
export function lastDueOf(bill: EndsOf): string | null {
  const e = bill.ends;
  if (!e) return null;
  try {
    if (e.after !== undefined && e.from) return stepDue(bill.nextDue, bill.cadence, firstIndexFrom(bill.nextDue, bill.cadence, e.from) + e.after - 1);
    if (e.on) return stepDue(bill.nextDue, bill.cadence, firstIndexFrom(bill.nextDue, bill.cadence, addLocalDays(e.on, 1)) - 1);
  } catch { return null; }
  return null;
}
/** The last day a range may reach for this bill: `to`, or its last payment when that comes first. */
export function billTo(bill: EndsOf, to: string): string {
  const last = lastDueOf(bill);
  return last !== null && last < to ? last : to;
}
/** Whether the bill's last payment lies before `today`. */
export const hasEnded = (bill: EndsOf, today: string) => { const last = lastDueOf(bill); return last !== null && last < today; };
/** The bills of a record that have not ended by `today` (the record's other fields as they are). */
export const liveBills = (record: BillsRecord, today: string): BillsRecord => record.bills.some(b => hasEnded(b, today)) ? {...record, bills: record.bills.filter(b => !hasEnded(b, today))} : record;

