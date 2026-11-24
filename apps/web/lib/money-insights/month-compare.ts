import {monthKey, shiftMonth} from '../budgets/engine';
import {byCategory, monthOf} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {inFigures, spendingDayParts} from '../money-log/counted';

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
    if (!inFigures(e)) continue; // Session AV lane 2 (money): left out and transfers
    if (e.currency !== currency || e.date > today) continue;
    if (monthKey(e.date) === previous) previousRecorded = true;
    // Round 6 (#425): the shared rule (lib/money-log/counted.ts `spendingDayParts`): the person's share, a spread cost by
    // its share on its day of each month, and a refund below zero in its category.
    for (const d of spendingDayParts(e)) {
      const m = monthKey(d.date);
      if (d.date > today || (m !== month && m !== previous)) continue;
      for (const p of d.parts) {
        if (m === month) now.set(p.category, (now.get(p.category) ?? 0) + p.cents);
        else { whole.set(p.category, (whole.get(p.category) ?? 0) + p.cents); if (Number(d.date.slice(8, 10)) <= cut) same.set(p.category, (same.get(p.category) ?? 0) + p.cents); }
      }
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

/**
 * Session AV lane 2, round 3 (money; Simplifi's comparison report with a waterfall, LEDGER #297): from one period's
 * spending total to the next, one step per category that moved it, the largest move first, per currency (never
 * converted). Two choices: this month so far against last month by the same day, or last month against the month
 * before (both whole). The totals and the steps are Wealth → Spending's own figures (`byCategory` in
 * lib/money-log/engine.ts), so the first bar plus every step is the last bar exactly. A month with no record in that
 * currency is unknown, so that currency shows no waterfall (it says so). A comparison of records, never a forecast. Pure.
 */
export type WaterfallMode = 'so-far' | 'last-full';
export type Period = {start: string; end: string};
export type WaterfallStep = {category: string; before: number; after: number; change: number};
export type Waterfall = {currency: string; from: Period; to: Period; before: number; after: number; steps: WaterfallStep[]; recorded: boolean};
export function waterfallPeriods(today: string, mode: WaterfallMode): {from: Period; to: Period} {
  const month = monthKey(today), previous = shiftMonth(month, -1);
  if (mode === 'last-full') return {from: monthOf(`${shiftMonth(month, -2)}-01`), to: monthOf(`${previous}-01`)};
  const prev = monthOf(`${previous}-01`), cut = Math.min(Number(today.slice(8, 10)), Number(prev.end.slice(8, 10)));
  return {from: {start: prev.start, end: `${previous}-${String(cut).padStart(2, '0')}`}, to: {start: `${month}-01`, end: today}};
}
export function monthWaterfall(entries: readonly MoneyEntry[], today: string, mode: WaterfallMode = 'so-far'): Waterfall[] {
  const {from, to} = waterfallPeriods(today, mode), a = byCategory(entries, from.start, from.end), b = byCategory(entries, to.start, to.end);
  const whole = monthOf(from.start), currencies = [...new Set([...a, ...b].map(r => r.currency))].sort();
  return currencies.map(currency => {
    const recorded = entries.some(e => inFigures(e) && e.currency === currency && e.date >= whole.start && e.date <= whole.end);
    const was = new Map(a.filter(r => r.currency === currency).map(r => [r.category, r.total])), now = new Map(b.filter(r => r.currency === currency).map(r => [r.category, r.total]));
    const steps = [...new Set([...was.keys(), ...now.keys()])].map(category => ({category, before: was.get(category) ?? 0, after: now.get(category) ?? 0, change: (now.get(category) ?? 0) - (was.get(category) ?? 0)}))
      .filter(s => s.change !== 0).sort((x, y) => Math.abs(y.change) - Math.abs(x.change) || x.category.localeCompare(y.category));
    const sum = (m: Map<string, number>) => [...m.values()].reduce((n, v) => n + v, 0);
    return {currency, from, to, before: sum(was), after: sum(now), steps, recorded};
  });
}
