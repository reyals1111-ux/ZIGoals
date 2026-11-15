import {monthKey} from '../budgets/engine';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import type {BillCandidate} from './detect';
import {normalisePayee} from './detect';
import type {Bill} from './schema';

/**
 * Session AP (owner-approved): a price-change notice on Upcoming bills, pure. For a bill confirmed from the money log (or
 * a candidate still offered), the latest payment of the same series (same currency, category and payee, read as the
 * detector reads them) is compared with the payment before it, on an earlier date. When the two differ: "went up by X
 * since <month of the earlier payment>" or "went down by X". Every payment of the series counts here, also one outside
 * the ±5 % the detector uses to find a bill, so a real price rise is not hidden. Exact cents; the bill's own currency.
 */
export type PriceChange = {direction: 'up' | 'down'; cents: number; currency: string; previous: number; latest: number; previousDate: string; latestDate: string; sinceMonth: string};

const groupKey = (e: MoneyEntry) => `${e.currency}|${e.category}|${normalisePayee(e.note) || normalisePayee(e.category)}`;
/** The series' payments, oldest first, one per date (a same-day duplicate: the first logged). */
function series(entries: readonly MoneyEntry[], matches: (e: MoneyEntry) => boolean, today: string): MoneyEntry[] {
  const byDate = new Map<string, MoneyEntry>();
  for (const e of [...entries].filter(e => e.kind === 'expense' && e.date <= today && matches(e)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))) if (!byDate.has(e.date)) byDate.set(e.date, e);
  return [...byDate.values()];
}
function compare(list: readonly MoneyEntry[]): PriceChange | null {
  if (list.length < 2) return null;
  const latest = list[list.length - 1]!, previous = list[list.length - 2]!, a = minorUnits(previous.amount), b = minorUnits(latest.amount);
  if (a === b) return null;
  return {direction: b > a ? 'up' : 'down', cents: Math.abs(b - a), currency: latest.currency, previous: a, latest: b, previousDate: previous.date, latestDate: latest.date, sinceMonth: monthKey(previous.date)};
}
/** A confirmed bill's change, when it came from the money log (a bill added by hand has no payments to compare). */
export function billPriceChange(bill: Bill, entries: readonly MoneyEntry[], today: string): PriceChange | null {
  if (bill.origin !== 'detected' || !bill.matchKey) return null;
  return compare(series(entries, e => `${groupKey(e)}|${bill.cadence}`.slice(0, 200) === bill.matchKey, today));
}
/** A candidate's change, over the same series. */
export function candidatePriceChange(candidate: BillCandidate, entries: readonly MoneyEntry[], today: string): PriceChange | null {
  return compare(series(entries, e => `${groupKey(e)}|${candidate.cadence}`.slice(0, 200) === candidate.key, today));
}
