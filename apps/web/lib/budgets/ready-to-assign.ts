import {monthOf} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import type {BudgetsRecord} from './schema';

/**
 * Session AP (owner-approved): "Ready to assign" on Budgets, pure, one currency at a time (never converted). It is the
 * month's logged income minus what that month's budgets hold (each budget's monthly amount; what rollover carries in was
 * set aside in an earlier month, so it is not taken again). From records only: with no income logged that month in a
 * currency, it says so instead of a figure. Never advice and never a projection.
 */
export type ReadyToAssign =
  | {currency: string; status: 'ok'; income: number; held: number; ready: number; incomeEntries: number}
  | {currency: string; status: 'no-income'; held: number};

export function readyToAssign(entries: readonly MoneyEntry[], record: BudgetsRecord, month: string): ReadyToAssign[] {
  const {start, end} = monthOf(`${month}-01`), income = new Map<string, {cents: number; count: number}>(), held = new Map<string, number>();
  for (const e of entries) {
    if (e.kind !== 'income' || e.date < start || e.date > end) continue;
    const row = income.get(e.currency) ?? {cents: 0, count: 0};
    row.cents += minorUnits(e.amount); row.count++; income.set(e.currency, row);
  }
  for (const b of record.budgets) if (b.since <= month) held.set(b.currency, (held.get(b.currency) ?? 0) + minorUnits(b.monthly));
  return [...new Set([...income.keys(), ...held.keys()])].sort().map((currency): ReadyToAssign => {
    const got = income.get(currency), hold = held.get(currency) ?? 0;
    return got ? {currency, status: 'ok', income: got.cents, held: hold, ready: got.cents - hold, incomeEntries: got.count} : {currency, status: 'no-income', held: hold};
  });
}
