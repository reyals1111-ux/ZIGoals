import {monthKey, shiftMonth} from '../budgets/engine';
import {monthOf} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';

/**
 * Session AP (owner-approved): spending pace beside your usual month, pure, one currency at a time. "By the 14th you
 * usually have spent X; this month Y." The usual figure is the middle value (median) of what earlier months show spent
 * from their 1st to the same day (the month's last day when it is shorter), over the earlier months of the last twelve
 * that hold at least one spending record. It needs three such months; with fewer it says so. A comparison of records,
 * never a forecast: nothing about the rest of the month is said.
 */
export const PACE_MIN_MONTHS = 3, PACE_LOOKBACK_MONTHS = 12;
export type SpendingPace =
  | {currency: string; status: 'ok'; day: number; usual: number; thisMonth: number; months: number; difference: number}
  | {currency: string; status: 'not-enough'; day: number; months: number};

const median = (values: readonly number[]) => { const s = [...values].sort((a, b) => a - b), mid = Math.floor(s.length / 2); return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2); };
export function spendingPace(entries: readonly MoneyEntry[], currency: string, today: string): SpendingPace {
  const day = Number(today.slice(8, 10)), current = monthKey(today), earliest = shiftMonth(current, -PACE_LOOKBACK_MONTHS);
  const sums = new Map<string, number>();
  let thisMonth = 0;
  for (const e of entries) {
    if (e.kind !== 'expense' || e.currency !== currency || e.date > today) continue;
    const m = monthKey(e.date);
    if (m === current) { thisMonth += minorUnits(e.amount); continue; }
    if (m < earliest || m > current) continue;
    // The same day of that month, or its last day when the month is shorter (the 31st → 30 April).
    const cut = Math.min(day, Number(monthOf(`${m}-01`).end.slice(8, 10)));
    sums.set(m, (sums.get(m) ?? 0) + (Number(e.date.slice(8, 10)) <= cut ? minorUnits(e.amount) : 0));
  }
  const months = sums.size;
  if (months < PACE_MIN_MONTHS) return {currency, status: 'not-enough', day, months};
  const usual = median([...sums.values()]);
  return {currency, status: 'ok', day, usual, thisMonth, months, difference: thisMonth - usual};
}
/** "1st", "2nd", "3rd", "14th", "22nd". */
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
