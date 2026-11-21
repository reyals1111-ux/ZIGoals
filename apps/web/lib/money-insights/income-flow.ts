import {monthKey} from '../budgets/engine';
import type {MoneyEntry} from '../money-log/schema';
import {entryParts} from '../money-split/parts';

/**
 * Session AV (owner follow-up 1, F-INCOME-FLOW; Monarch's Sankey): one month's income in one currency, and where it went —
 * each spending category, then what is left (or how far spending went beyond it). From the money log only; never
 * converted; "left" is income minus spending recorded, not a savings figure from an account. Pure.
 */
export type FlowPart = {label: string; cents: number; kind: 'category' | 'left' | 'beyond'};
export type IncomeFlow = {currency: string; month: string; income: number; spent: number; parts: FlowPart[]; sources: {label: string; cents: number}[]};
export function incomeFlow(entries: readonly MoneyEntry[], currency: string, month: string, max = 7): IncomeFlow {
  const byCat = new Map<string, number>(), bySource = new Map<string, number>();
  let income = 0, spent = 0;
  for (const e of entries) {
    if (e.currency !== currency || monthKey(e.date) !== month) continue;
    for (const p of entryParts(e)) {
      if (e.kind === 'income') { income += p.cents; bySource.set(p.category, (bySource.get(p.category) ?? 0) + p.cents); }
      else { spent += p.cents; byCat.set(p.category, (byCat.get(p.category) ?? 0) + p.cents); }
    }
  }
  const sorted = [...byCat].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = sorted.slice(0, max), rest = sorted.slice(max).reduce((t, [, c]) => t + c, 0);
  const parts: FlowPart[] = shown.map(([label, cents]) => ({label, cents, kind: 'category'}));
  if (rest) parts.push({label: 'Other categories', cents: rest, kind: 'category'});
  if (income > spent) parts.push({label: 'Left', cents: income - spent, kind: 'left'});
  return {currency, month, income, spent, parts, sources: [...bySource].sort((a, b) => b[1] - a[1]).map(([label, cents]) => ({label, cents}))};
}
