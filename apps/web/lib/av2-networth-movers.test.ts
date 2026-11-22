import {describe, expect, test} from 'vitest';
import {decimalCents, networthMovers} from './networth-movers';
import type {Accounts} from './accounts/schema';
import type {NetworthHistory} from './networth-history';

/**
 * Session AV lane 2, round 3 (money; Simplifi, LEDGER #298): what moved net worth this month — each account by its
 * balance at the end of last month and today (a debt that grows moves it down), Wealth holdings and Portfolio by their
 * recorded days; a new account is named apart, never a move from zero; per currency, largest first.
 */
const TODAY = '2026-11-22', at = '2026-01-01T09:00:00.000Z';
const acct = (id: string, kind: string, name: string, currency: string, snaps: [string, string][]) => ({id, kind, name, currency, snapshots: snaps.map(([date, value], i) => ({id: `${id.slice(0, -4)}${String(9000 + i)}`, date, value, decimals: 2})), payments: [], createdAt: at, updatedAt: at});
const accounts = {version: 1, items: [
  acct('00000000-0000-4000-8000-00000000a001', 'savings', 'Savings', 'EUR', [['2026-10-20', '500000'], ['2026-11-15', '560000']]),
  acct('00000000-0000-4000-8000-00000000a002', 'credit-card', 'Card', 'EUR', [['2026-10-30', '20000'], ['2026-11-20', '45000']]),
  acct('00000000-0000-4000-8000-00000000a003', 'cash', 'Wallet', 'EUR', [['2026-10-01', '10000']]),
  acct('00000000-0000-4000-8000-00000000a004', 'savings', 'New pot', 'EUR', [['2026-11-02', '100000']]),
  acct('00000000-0000-4000-8000-00000000a005', 'cash', 'US cash', 'USD', [['2026-10-31', '10000'], ['2026-11-10', '5000']]),
]} as Accounts;
const history: NetworthHistory = {version: 1, days: [
  {day: '2026-10-29', at: '2026-10-29T10:00:00.000Z', sources: [{source: 'wealth', currency: 'EUR', value: '12000.50', asOf: null}, {source: 'wallets', currency: 'EUR', value: '900', asOf: null}]},
  {day: '2026-11-21', at: '2026-11-21T10:00:00.000Z', sources: [{source: 'wealth', currency: 'EUR', value: '11000.25', asOf: null}, {source: 'wallets', currency: 'EUR', value: '100', asOf: null}]},
]};

describe('what moved net worth this month', () => {
  test('decimal texts to whole cents, half away from zero', () => {
    expect([decimalCents('12000.50'), decimalCents('0.005'), decimalCents('-0.07'), decimalCents('-1.005'), decimalCents('3')]).toEqual([1200050, 1, -7, -101, 300]);
  });
  test('accounts and sources, largest first, per currency; a debt that grows moves it down; a new account apart', () => {
    const rows = networthMovers(accounts, history, TODAY);
    expect(rows.map(r => r.currency)).toEqual(['EUR', 'USD']);
    expect(rows[0]!.movers.map(m => [m.name, m.cents])).toEqual([['Wealth holdings', -100025], ['Savings', 60000], ['Card', -25000]]);
    expect(rows[0]!.movers.find(m => m.name === 'Card')).toMatchObject({debt: true, from: '2026-10-30', to: '2026-11-20'});
    expect(rows[0]).toMatchObject({total: -100025 + 60000 - 25000, newThisMonth: ['New pot']});
    expect(rows[1]!.movers).toEqual([expect.objectContaining({name: 'US cash', cents: -5000})]);
  });
  test('without a recorded day before this month, a source is not a move; nothing at all: nothing listed', () => {
    expect(networthMovers({version: 1, items: []}, {version: 1, days: [history.days[1]!]}, TODAY)).toEqual([]);
    expect(networthMovers(null, null, TODAY)).toEqual([]);
  });
});
