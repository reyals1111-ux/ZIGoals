import {monthKey, shiftMonth} from '../budgets/engine';
import {monthOf} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {entryParts} from '../money-split/parts';
import {isCounted} from '../money-log/counted';

/**
 * Session AV (owner follow-up 1, F-VS-LAST; Copilot, Rocket Money's watchlist): each spending category this month so far
 * beside last month by the same day and all of last month, in one currency (never converted). A month with no record in
 * that currency is unknown (null), not zero. A comparison of records, never a forecast. Pure.
 */
export type CategoryVsLast = {category: string; thisMonth: number; lastBySameDay: number | null; lastMonth: number | null; difference: number | null};
export type VsLastView = {currency: string; month: string; previous: string; day: number; cut: number; previousRecorded: boolean; rows: CategoryVsLast[]; totals: {thisMonth: number; lastBySameDay: number | null; lastMonth: number | null}};
export function vsLastMonth(entries: readonly MoneyEntry[], currency: string, today: string): VsLastView {
  const month = monthKey(today), previous = shiftMonth(month, -1), day = Number(today.slice(8, 10));
  const cut = Math.min(day, Number(monthOf(`${previous}-01`).end.slice(8, 10)));
  const now = new Map<string, number>(), same = new Map<string, number>(), whole = new Map<string, number>();
  let previousRecorded = false;
  for (const e of entries) {
    if (!isCounted(e)) continue; // Session AV lane 2 (money): left out and transfers
    if (e.currency !== currency || e.date > today) continue;
    const m = monthKey(e.date);
    if (m === previous) previousRecorded = true;
    if (e.kind !== 'expense' || (m !== month && m !== previous)) continue;
    for (const p of entryParts(e)) {
      if (m === month) now.set(p.category, (now.get(p.category) ?? 0) + p.cents);
      else { whole.set(p.category, (whole.get(p.category) ?? 0) + p.cents); if (Number(e.date.slice(8, 10)) <= cut) same.set(p.category, (same.get(p.category) ?? 0) + p.cents); }
    }
  }
  const cats = [...new Set([...now.keys(), ...whole.keys()])];
  const rows = cats.map(category => {
    const thisMonth = now.get(category) ?? 0, lastBySameDay = previousRecorded ? same.get(category) ?? 0 : null, lastMonth = previousRecorded ? whole.get(category) ?? 0 : null;
    return {category, thisMonth, lastBySameDay, lastMonth, difference: lastBySameDay === null ? null : thisMonth - lastBySameDay};
  }).sort((a, b) => b.thisMonth - a.thisMonth || (b.lastMonth ?? 0) - (a.lastMonth ?? 0) || a.category.localeCompare(b.category));
  const sum = (pick: (r: CategoryVsLast) => number | null) => previousRecorded ? rows.reduce((n, r) => n + (pick(r) ?? 0), 0) : null;
  return {currency, month, previous, day, cut, previousRecorded, rows, totals: {thisMonth: rows.reduce((n, r) => n + r.thisMonth, 0), lastBySameDay: sum(r => r.lastBySameDay), lastMonth: sum(r => r.lastMonth)}};
}
