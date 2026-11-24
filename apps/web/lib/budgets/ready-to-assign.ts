import {monthOf} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import type {BudgetsRecord} from './schema';
import {budgetedIn} from './engine';
import {isCounted} from '../money-log/counted';
import {coveredByCurrency, setAsideFrom} from './set-aside';

/**
 * Session AP (owner-approved): "Ready to assign" on Budgets, pure, one currency at a time (never converted). It is the
 * month's logged income minus what that month's budgets hold (each budget's monthly amount; what rollover carries in was
 * set aside in an earlier month, so it is not taken again). From records only: with no income logged that month in a
 * currency, it says so instead of a figure. Never advice and never a projection.
 */
export type ReadyToAssign =
  | {currency: string; status: 'ok'; income: number; held: number; ready: number; incomeEntries: number; setAside?: number; covered?: number}
  | {currency: string; status: 'no-income'; held: number; setAside?: number; covered?: number};

export function readyToAssign(entries: readonly MoneyEntry[], record: BudgetsRecord, month: string): ReadyToAssign[] {
  const {start, end} = monthOf(`${month}-01`), income = new Map<string, {cents: number; count: number}>(), held = new Map<string, number>();
  for (const e of entries) {
    if (e.kind !== 'income' || e.date < start || e.date > end || !isCounted(e)) continue;
    const row = income.get(e.currency) ?? {cents: 0, count: 0};
    row.cents += minorUnits(e.amount); row.count++; income.set(e.currency, row);
  }
  for (const b of record.budgets) if (b.since <= month) held.set(b.currency, (held.get(b.currency) ?? 0) + budgetedIn(b, month)); // Session AV lane 2 (money): that month's own amount
  // Round 6 (#428): money set aside this month for next month's budgets is held here; what last month set aside for this
  // month's budgets already covers them, so it is not asked of this month's income again.
  const out = setAsideFrom(record, month), covered = coveredByCurrency(record, month);
  for (const [c, v] of out) held.set(c, (held.get(c) ?? 0) + v);
  for (const [c, v] of covered) held.set(c, (held.get(c) ?? 0) - v);
  return [...new Set([...income.keys(), ...held.keys()])].sort().map((currency): ReadyToAssign => {
    const got = income.get(currency), hold = held.get(currency) ?? 0, extra = {...(out.get(currency) ? {setAside: out.get(currency)!} : {}), ...(covered.get(currency) ? {covered: covered.get(currency)!} : {})};
    return got ? {currency, status: 'ok', income: got.cents, held: hold, ready: got.cents - hold, incomeEntries: got.count, ...extra} : {currency, status: 'no-income', held: hold, ...extra};
  });
}
