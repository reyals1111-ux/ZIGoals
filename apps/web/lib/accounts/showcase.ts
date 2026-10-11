import {accountsSchema, type Accounts} from './schema';
import {addDays} from '../zone-time';

/**
 * Showcase accounts and debts (Session W Part 12): fictional balances in US dollars, entered about once a month for a
 * year, so net worth, its history and a debt's payoff show something. The bank is named as fictional; the rates are
 * fictional "own figures". Deterministic: the same day always gives the same records.
 */
const id = (n: number) => `93000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function showcaseAccounts(day: string): Accounts {
  const months = Array.from({length: 12}, (_, i) => addDays(day, -30 * (11 - i))), created = `${months[0]}T09:00:00.000Z`, updated = `${day}T09:00:00.000Z`;
  let n = 100;
  const entries = (values: readonly (number | null)[], dayOffset = 0) => values.flatMap((v, i) => v === null ? [] : [{id: id(n++), date: addDays(months[i]!, dayOffset), value: String(Math.round(v * 100)), decimals: 2}]);
  const account = (k: number, kind: string, name: string, extra: object) => ({id: id(k), kind, name, currency: 'USD', institution: 'SHOWCASE DATA · fictional bank', payments: [], createdAt: created, updatedAt: updated, ...extra});
  return accountsSchema.parse({version: 1, items: [
    account(1, 'cash', 'Everyday account', {snapshots: entries([1840, 2210, 1975, 2400, 2105, 1890, 2320, 2615, 2050, 2280, 1960, 2430])}),
    account(2, 'savings', 'Rainy-day savings', {snapshots: entries([8200, 8400, 8600, 8650, 8900, 9100, 9350, 9500, 9700, 9950, 10200, 10450])}),
    account(3, 'pension', 'Workplace pension', {snapshots: entries([null, null, 21300, null, null, 22150, null, null, 22900, null, null, 23900])}),
    account(4, 'loan', 'Car loan', {ratePercent: '5.9', snapshots: entries([9800, 9545, 9290, 9033, 8774, 8513, 8250, 7986, 7720, 7452, 7182, 6911]), payments: entries([null, null, null, null, null, null, 300, 300, 300, 300, 300, 300], -2)}),
    account(5, 'credit-card', 'Credit card', {ratePercent: '21.9', snapshots: entries([null, null, null, null, null, null, null, null, 910, null, null, 640])}),
  ]});
}
