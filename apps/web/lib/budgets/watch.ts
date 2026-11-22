import type {BudgetsRecord} from './schema';
import {MAX_WATCHED} from './schema';
import type {MoneyEntry} from '../money-log/schema';
import {vsLastMonth} from '../money-insights/month-compare';

/**
 * Session AV (owner follow-up 1, F-WATCH; Rocket Money's Watchlist): a category watched without a budget — this month
 * so far, last month by the same day and the difference, from the money log only (lib/money-insights/month-compare.ts),
 * per currency, never converted. Pure.
 */
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export function withWatch(record: BudgetsRecord, category: string, currency: string): BudgetsRecord {
  const name = category.trim(), list = record.watch ?? [];
  if (!name) throw new Error('Choose a category to watch.');
  if (list.some(w => same(w.category, name) && w.currency === currency)) return record;
  // Session AV (fresh-agent check q2, rank 31): a category with a budget is already followed in its row (spent, left, pace).
  const budgeted = record.budgets.find(b => same(b.category, name) && b.currency === currency);
  if (budgeted) throw new Error(`${budgeted.category} already has a budget in ${currency}: its row above shows this month.`);
  if (list.length >= MAX_WATCHED) throw new Error(`Up to ${MAX_WATCHED} categories can be watched.`);
  return {...record, watch: [...list, {category: name, currency}]};
}
export function withoutWatch(record: BudgetsRecord, category: string, currency: string): BudgetsRecord {
  const list = (record.watch ?? []).filter(w => !(same(w.category, category) && w.currency === currency));
  const {watch: _w, ...rest} = record; void _w;
  return list.length ? {...rest, watch: list} : rest as BudgetsRecord;
}
/** Session AV (q2 rank 31): `lastMonth` is all of last month (null when last month has no record in that currency). */
export type WatchRow = {category: string; currency: string; thisMonth: number; lastBySameDay: number | null; difference: number | null; lastMonth: number | null};
export function watchRows(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): WatchRow[] {
  const views = new Map<string, ReturnType<typeof vsLastMonth>>();
  return (record.watch ?? []).map(w => {
    const view = views.get(w.currency) ?? vsLastMonth(entries, w.currency, today); views.set(w.currency, view);
    const row = view.rows.find(r => same(r.category, w.category));
    return {category: w.category, currency: w.currency, thisMonth: row?.thisMonth ?? 0, lastBySameDay: view.previousRecorded ? row?.lastBySameDay ?? 0 : null, difference: view.previousRecorded ? (row?.thisMonth ?? 0) - (row?.lastBySameDay ?? 0) : null, lastMonth: view.previousRecorded ? row?.lastMonth ?? 0 : null};
  });
}
/**
 * Session AV (fresh-agent check q2, rank 31; Rocket Money's watchlist notice): watched categories well above last month
 * by the same day — at least a quarter more and at least 20 (in the currency's main unit) more — for Today's money line.
 */
export const WATCH_ABOVE_SHARE = 0.25, WATCH_ABOVE_MIN = 2000;
export function watchedAbove(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): WatchRow[] {
  return watchRows(record, entries, today).filter(r => r.lastBySameDay !== null && r.difference !== null && r.difference >= WATCH_ABOVE_MIN && r.thisMonth >= r.lastBySameDay * (1 + WATCH_ABOVE_SHARE));
}
