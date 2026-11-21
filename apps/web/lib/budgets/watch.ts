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
  if (list.length >= MAX_WATCHED) throw new Error(`Up to ${MAX_WATCHED} categories can be watched.`);
  return {...record, watch: [...list, {category: name, currency}]};
}
export function withoutWatch(record: BudgetsRecord, category: string, currency: string): BudgetsRecord {
  const list = (record.watch ?? []).filter(w => !(same(w.category, category) && w.currency === currency));
  const {watch: _w, ...rest} = record; void _w;
  return list.length ? {...rest, watch: list} : rest as BudgetsRecord;
}
export type WatchRow = {category: string; currency: string; thisMonth: number; lastBySameDay: number | null; difference: number | null};
export function watchRows(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): WatchRow[] {
  const views = new Map<string, ReturnType<typeof vsLastMonth>>();
  return (record.watch ?? []).map(w => {
    const view = views.get(w.currency) ?? vsLastMonth(entries, w.currency, today); views.set(w.currency, view);
    const row = view.rows.find(r => same(r.category, w.category));
    return {category: w.category, currency: w.currency, thisMonth: row?.thisMonth ?? 0, lastBySameDay: view.previousRecorded ? row?.lastBySameDay ?? 0 : null, difference: view.previousRecorded ? (row?.thisMonth ?? 0) - (row?.lastBySameDay ?? 0) : null};
  });
}
