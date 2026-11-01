import type {MoneyEntry} from './schema';
import {minorUnits} from '../money-split/parts';

/**
 * Session AK (BUILD list 2 #7, COMPETITORS_2: Copilot 8.5/8.6): the running total of the entries picked in the money
 * log's Select mode. Exact minor units (cents, integers), per currency, never converted: a mixed selection names each
 * currency's own total ("2 currencies: −€80.00 and +$4.20"). An entry counts once, whole, even when it is split into
 * parts (the parts add up to the entry). Income adds, spending takes away. Pure; nothing stored.
 */
export type SelectionTotal = {currency: string; cents: number; expenses: number; income: number};
export type SelectionSummary = {count: number; expenses: number; income: number; totals: SelectionTotal[]};

export function summarizeSelection(entries: readonly MoneyEntry[], selected: ReadonlySet<string> | readonly string[]): SelectionSummary {
  const wanted = selected instanceof Set ? selected : new Set(selected as readonly string[]);
  const by = new Map<string, SelectionTotal>(), counted = new Set<string>();
  let expenses = 0, income = 0;
  for (const e of entries) {
    if (!wanted.has(e.id) || counted.has(e.id)) continue;
    counted.add(e.id);
    const row = by.get(e.currency) ?? {currency: e.currency, cents: 0, expenses: 0, income: 0}, amount = minorUnits(e.amount);
    if (e.kind === 'income') { row.cents += amount; row.income++; income++; } else { row.cents -= amount; row.expenses++; expenses++; }
    by.set(e.currency, row);
  }
  return {count: counted.size, expenses, income, totals: [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency))};
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** A signed amount: "−€84.20", "+$4.20", "€0.00". `format` writes an amount (cents ≥ 0) in its currency. */
export function signedMoney(cents: number, currency: string, format: (cents: number, currency: string) => string): string {
  return `${cents < 0 ? '−' : cents > 0 ? '+' : ''}${format(Math.abs(cents), currency)}`;
}
/**
 * The sticky line: "3 selected · −€84.20 (2 expenses, 1 income)"; with two currencies "3 selected · 2 currencies:
 * −€80.00 and +$4.20 (2 expenses, 1 income)"; nothing picked: "Nothing selected".
 */
export function selectionLine(summary: SelectionSummary, format: (cents: number, currency: string) => string): string {
  if (!summary.count) return 'Nothing selected';
  const kinds = [summary.expenses ? plural(summary.expenses, 'expense', 'expenses') : '', summary.income ? plural(summary.income, 'income', 'incomes') : ''].filter(Boolean).join(', ');
  const amounts = summary.totals.map(t => signedMoney(t.cents, t.currency, format));
  const money = amounts.length === 1 ? amounts[0]! : `${amounts.length} currencies: ${amounts.slice(0, -1).join(', ')} and ${amounts.at(-1)!}`;
  return `${summary.count} selected · ${money} (${kinds})`;
}
