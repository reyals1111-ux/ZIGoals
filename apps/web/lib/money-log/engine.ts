import {addLocalDays} from '../local-date';
import type {MoneyEntry, MoneyLog} from './schema';
import {entryParts} from '../money-split/parts';

/**
 * Session AI: the expense log's figures, in cents (integers), per currency, never converted. The week runs from the
 * person's week start; "room to spend" is the weekly budget minus this week's spending in the budget's currency (other
 * currencies are listed apart, never added). Facts from the log only; nothing projected.
 */
export const cents = (amount: string): number => Math.round(Number(amount) * 100);
export const fromCents = (n: number): string => `${n < 0 ? '-' : ''}${Math.floor(Math.abs(n) / 100)}.${String(Math.abs(n) % 100).padStart(2, '0')}`;
export function weekOf(day: string, startsOn: 'monday' | 'sunday'): {start: string; end: string} {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(), back = startsOn === 'monday' ? (weekday + 6) % 7 : weekday;
  const start = addLocalDays(day, -back);
  return {start, end: addLocalDays(start, 6)};
}
export type Totals = {currency: string; expenses: number; income: number; count: number};
export function totals(entries: readonly MoneyEntry[], from: string, to: string): Totals[] {
  const by = new Map<string, Totals>();
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    const t = by.get(e.currency) ?? {currency: e.currency, expenses: 0, income: 0, count: 0};
    if (e.kind === 'expense') t.expenses += cents(e.amount); else t.income += cents(e.amount);
    t.count++; by.set(e.currency, t);
  }
  return [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
export function byCategory(entries: readonly MoneyEntry[], from: string, to: string, kind: 'expense' | 'income' = 'expense'): {category: string; currency: string; total: number; count: number}[] {
  const by = new Map<string, {category: string; currency: string; total: number; count: number}>();
  for (const e of entries) {
    if (e.kind !== kind || e.date < from || e.date > to) continue;
    // Session AK (lane M, item 22): a split entry counts in each of its parts' categories (the whole entry otherwise).
    for (const part of entryParts(e)) {
      const k = `${e.currency}\u0000${part.category}`, row = by.get(k) ?? {category: part.category, currency: e.currency, total: 0, count: 0};
      row.total += part.cents; row.count++; by.set(k, row);
    }
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}
export type Room = {currency: string; budget: number; spent: number; left: number; week: {start: string; end: string}; daysLeft: number};
/** This week's room to spend in the budget's currency, or null with no budget. */
export function roomToSpend(log: MoneyLog, today: string): Room | null {
  if (!log.budget) return null;
  const week = weekOf(today, log.weekStartsOn), spent = totals(log.entries, week.start, today).find(t => t.currency === log.budget!.currency)?.expenses ?? 0;
  const budget = cents(log.budget.weekly), daysLeft = Math.round((Date.parse(`${week.end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1;
  return {currency: log.budget.currency, budget, spent, left: budget - spent, week, daysLeft};
}
export const addEntry = (log: MoneyLog, entry: MoneyEntry): MoneyLog => ({...log, entries: [...log.entries, entry].slice(-10_000), currency: entry.currency});
export const removeEntry = (log: MoneyLog, id: string): MoneyLog => ({...log, entries: log.entries.filter(e => e.id !== id)});
/** The month of a day, first to last day. */
export function monthOf(day: string): {start: string; end: string} {
  const [y, m] = day.split('-').map(Number), last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return {start: `${day.slice(0, 7)}-01`, end: `${day.slice(0, 7)}-${String(last).padStart(2, '0')}`};
}
