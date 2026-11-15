import {monthKey, shiftMonth} from '../budgets/engine';
import {normalisePayee} from '../bills/detect';
import type {MoneyEntry} from '../money-log/schema';
import {entryParts, minorUnits} from '../money-split/parts';

/**
 * Session AP (Wealth → Spending, owner-approved): the money log month by month, pure. Every figure is the person's own
 * entries in exact minor units (cents, integers), one currency at a time (amounts in different currencies are never
 * added). A month with no record in a currency is a gap, said as such and never drawn as a zero; nothing is projected.
 * - `cashFlow`: income, spending and net for the last 12 months that hold a record, with the months between them that
 *   hold none folded into one gap row.
 * - `categoryTrend`: each spending category over the 12 calendar months to this one (a month without any record in the
 *   currency is null, a gap; a month with records but none in that category is a real 0).
 * - `topPayees`: who the money went to this month, beside last month (last month without any record: null, a gap).
 */
export const CASH_FLOW_MONTHS = 12, TREND_MONTHS = 12, TOP_PAYEES = 5;

/** The currencies the log holds, in A–Z order (each is shown on its own). */
export function currenciesOf(entries: readonly MoneyEntry[], today: string): string[] {
  return [...new Set(entries.filter(e => e.date <= today).map(e => e.currency))].sort();
}
/** The months ("2026-11") that hold at least one record in the currency, up to today's month, newest first. */
export function recordMonths(entries: readonly MoneyEntry[], currency: string, today: string): string[] {
  const set = new Set<string>();
  for (const e of entries) if (e.currency === currency && e.date <= today) set.add(monthKey(e.date));
  return [...set].sort().reverse();
}

export type CashFlowMonth = {kind: 'month'; month: string; income: number; spending: number; net: number; count: number};
/** One or more months in a row without any record: from and to are months ("2026-07"), both included. */
export type CashFlowGap = {kind: 'gap'; from: string; to: string; months: number};
export type CashFlowRow = CashFlowMonth | CashFlowGap;
export type CashFlow = {currency: string; rows: CashFlowRow[]; months: CashFlowMonth[]};

/** The last 12 months with a record in the currency, oldest first, with the gaps between them. */
export function cashFlow(entries: readonly MoneyEntry[], currency: string, today: string, limit = CASH_FLOW_MONTHS): CashFlow {
  const months = recordMonths(entries, currency, today).slice(0, limit).reverse(), wanted = new Set(months);
  const by = new Map<string, CashFlowMonth>(months.map(m => [m, {kind: 'month', month: m, income: 0, spending: 0, net: 0, count: 0}]));
  for (const e of entries) {
    if (e.currency !== currency || e.date > today) continue;
    const row = by.get(monthKey(e.date)); if (!row || !wanted.has(row.month)) continue;
    const amount = minorUnits(e.amount);
    if (e.kind === 'income') row.income += amount; else row.spending += amount;
    row.count++;
  }
  const rows: CashFlowRow[] = [], list = months.map(m => by.get(m)!);
  for (const row of list) row.net = row.income - row.spending;
  list.forEach((row, i) => {
    const before = list[i - 1];
    if (before) {
      const next = shiftMonth(before.month, 1);
      if (next < row.month) { const to = shiftMonth(row.month, -1); rows.push({kind: 'gap', from: next, to, months: monthsBetween(next, to) + 1}); }
    }
    rows.push(row);
  });
  return {currency, rows, months: list};
}
/** Whole months from `a` to `b` ("2026-01" → "2026-03" is 2). */
export const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) * 12 + Number(b.slice(5, 7))) - (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)));

export type CategoryTrend = {category: string; values: (number | null)[]; total: number};
export type TrendView = {currency: string; months: string[]; recorded: boolean[]; categories: CategoryTrend[]};
/** Each spending category over the 12 calendar months to today's, oldest first, biggest total first. */
export function categoryTrend(entries: readonly MoneyEntry[], currency: string, today: string, span = TREND_MONTHS): TrendView {
  const last = monthKey(today), months = Array.from({length: span}, (_, i) => shiftMonth(last, i - span + 1)), index = new Map(months.map((m, i) => [m, i]));
  const recorded = months.map(() => false), by = new Map<string, number[]>();
  for (const e of entries) {
    if (e.currency !== currency || e.date > today) continue;
    const i = index.get(monthKey(e.date)); if (i === undefined) continue;
    recorded[i] = true;
    if (e.kind !== 'expense') continue;
    // A split entry counts in each of its parts' categories (lib/money-split/parts.ts), as This month by category does.
    for (const p of entryParts(e)) { const row = by.get(p.category) ?? months.map(() => 0); row[i]! += p.cents; by.set(p.category, row); }
  }
  const categories = [...by.entries()].map(([category, sums]) => ({category, values: sums.map((v, i) => recorded[i] ? v : null), total: sums.reduce((a, b) => a + b, 0)}))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
  return {currency, months, recorded, categories};
}

export type Payee = {key: string; name: string; thisMonth: number; lastMonth: number | null; count: number};
export type PayeesView = {currency: string; month: string; previous: string; previousRecorded: boolean; payees: Payee[]};
/** The person's own words before any " · " detail ("Weekly shop · SHOWCASE DATA" → "Weekly shop"). */
const nameOf = (e: MoneyEntry) => e.note?.split(' · ')[0]?.trim() ?? '';
/**
 * The payees this month's spending went to, most first (at most five), beside last month. A payee is the entry's note,
 * read the way Upcoming bills reads it ("NETFLIX.COM 123" and "Netflix" are one); an entry without a note counts under
 * its category, named "<category>, no payee noted".
 */
export function topPayees(entries: readonly MoneyEntry[], currency: string, today: string, limit = TOP_PAYEES): PayeesView {
  const month = monthKey(today), previous = shiftMonth(month, -1);
  const keyOf = (e: MoneyEntry) => { const p = normalisePayee(nameOf(e)); return p ? `payee:${p}` : `category:${e.category.toLowerCase()}`; };
  const by = new Map<string, Payee & {latest: string}>();
  let previousRecorded = false;
  for (const e of entries) {
    if (e.currency !== currency || e.date > today) continue;
    const m = monthKey(e.date);
    if (m === previous) previousRecorded = true;
    if (e.kind !== 'expense' || (m !== month && m !== previous)) continue;
    const key = keyOf(e), row = by.get(key) ?? {key, name: '', thisMonth: 0, lastMonth: 0, count: 0, latest: ''};
    if (m === month) { row.thisMonth += minorUnits(e.amount); row.count++; } else row.lastMonth! += minorUnits(e.amount);
    // The name as the latest entry writes it.
    if (`${e.date}${e.createdAt}` >= row.latest) { row.latest = `${e.date}${e.createdAt}`; row.name = key.startsWith('payee:') ? nameOf(e).slice(0, 60) : `${e.category}, no payee noted`; }
    by.set(key, row);
  }
  const payees = [...by.values()].filter(p => p.thisMonth > 0).sort((a, b) => b.thisMonth - a.thisMonth || a.name.localeCompare(b.name)).slice(0, limit)
    .map((p): Payee => ({key: p.key, name: p.name, thisMonth: p.thisMonth, lastMonth: previousRecorded ? p.lastMonth : null, count: p.count}));
  return {currency, month, previous, previousRecorded, payees};
}
