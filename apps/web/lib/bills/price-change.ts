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
 * since <month of the first payment at the new price>" or "went down by X". Every payment of the series counts here, also one outside
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
  // Session AU (ADR-044 L-4, the rehearsal's Lina): €15.00, €15.00, €17.50, €17.50 showed no change because the last two
  // agree. The latest payment is compared with the most recent payment at another price, when that one is recent (within
  // about three months of the latest), so a rise stays visible for a few cycles and an old one does not come back.
  const latest = list[list.length - 1]!, b = minorUnits(latest.amount);
  let at = list.length - 2;
  for (let i = list.length - 2; i >= 0; i--) { if (minorUnits(list[i]!.amount) !== b) { at = i; break; } }
  const previous = list[at]!, a = minorUnits(previous.amount);
  if (a === b || (Date.parse(latest.date) - Date.parse(previous.date)) / 86_400_000 > 100) return null;
  // Session AV lane 2 (fr-money, FR-L-18, the friend-readiness walk's Lina): "since" is the month of the first payment at
  // the new price (€15.00 on 4 Sept, €17.50 on 4 Oct: "since Oct 2026"); the earlier payment's month read as if the price
  // had changed then.
  return {direction: b > a ? 'up' : 'down', cents: Math.abs(b - a), currency: latest.currency, previous: a, latest: b, previousDate: previous.date, latestDate: latest.date, sinceMonth: monthKey(list[at + 1]!.date)};
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
