import {describe, expect, it} from 'vitest';
import {accountsSchema, emptyAccounts, type Accounts} from './schema';
import {add, addAccount, balanceOn, editAccount, moneyText, netWorth, netWorthHistory, payoffMonths, recordBalance, recordPayment, removeAccount, sub, usualPayment} from './net-worth';
import {showcaseAccounts} from './showcase';
import {positionSchema, type Position} from '../positions';

// Session W Part 12: accounts and debts on this device; net worth per currency, never converted; payoff from the
// person's own rate and payment. Fictional records only.
const AT = '2026-10-01T09:00:00.000Z';
const eur = (value: string, date: string) => ({value: BigInt(value), decimals: 2, date});
function group(): Accounts {
  let g = addAccount(emptyAccounts(), {id: '00000000-0000-4000-8000-000000000001', kind: 'savings', name: 'Fictional savings', currency: 'EUR', balance: eur('500000', '2026-09-01')}, AT);
  g = recordBalance(g, '00000000-0000-4000-8000-000000000001', eur('520000', '2026-09-30'), AT);
  g = addAccount(g, {id: '00000000-0000-4000-8000-000000000002', kind: 'loan', name: 'Fictional loan', currency: 'EUR', ratePercent: '6', balance: eur('120000', '2026-09-15')}, AT);
  g = addAccount(g, {id: '00000000-0000-4000-8000-000000000003', kind: 'cash', name: 'Fictional dollars', currency: 'USD', balance: {value: 9999n, decimals: 2, date: '2026-09-20'}}, AT);
  return addAccount(g, {id: '00000000-0000-4000-8000-000000000004', kind: 'pension', name: 'No balance yet', currency: 'EUR'}, AT);
}
const position = (id: string, valuation?: {value: string; currency: string}): Position => positionSchema.parse({id, providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'EUR', denom: 'eur', quantity: '1', decimals: 2, verification: 'MANUAL', observedAt: AT, liquidity: 'LIQUID', provenance: 'User entry',
  ...(valuation ? {valuation: {...valuation, decimals: 2, source: 'MANUAL', observedAt: AT}} : {})});

describe('money', () => {
  it('adds and subtracts exactly across decimals and writes the text without rounding', () => {
    expect(add({value: 150n, decimals: 2}, {value: 5n, decimals: 3})).toEqual({value: 1505n, decimals: 3});
    expect(moneyText(sub({value: 100n, decimals: 2}, {value: 250n, decimals: 2}))).toBe('-1.50');
    expect(moneyText({value: 7n, decimals: 3})).toBe('0.007');
    expect(moneyText({value: 1234n, decimals: 0})).toBe('1234');
  });
});

describe('net worth', () => {
  it('per currency: accounts plus valued holdings minus debts; never converted; no balance and no value are counted, not zero', () => {
    const {rows, unvaluedHoldings} = netWorth(group(), '2026-10-01', [position('p1', {value: '30000', currency: 'EUR'}), position('p2')]);
    expect(rows.map(r => ({currency: r.currency, net: moneyText(r.net), assets: moneyText(r.assets), holdings: moneyText(r.holdings), debts: moneyText(r.debts), accounts: r.accounts, noBalance: r.noBalance}))).toEqual([
      {currency: 'EUR', net: '4300.00', assets: '5200.00', holdings: '300.00', debts: '1200.00', accounts: 3, noBalance: 1},
      {currency: 'USD', net: '99.99', assets: '99.99', holdings: '0', debts: '0', accounts: 1, noBalance: 0},
    ]);
    expect(unvaluedHoldings).toBe(1);
  });
  it('on an earlier day, each account\'s latest balance on or before it; archived accounts drop out of today\'s figure', () => {
    expect(moneyText(netWorth(group(), '2026-09-10').rows.find(r => r.currency === 'EUR')!.net)).toBe('5000.00');
    expect(balanceOn(group().items[0]!, '2026-08-31')).toBeNull();
    expect(balanceOn(group().items[0]!)).toMatchObject({value: 520000n, date: '2026-09-30'});
    const archived = editAccount(group(), '00000000-0000-4000-8000-000000000002', {archived: true}, AT);
    expect(moneyText(netWorth(archived, '2026-10-01').rows[0]!.net)).toBe('5200.00');
  });
  it('history: month ends for a year and today, from accounts only, per currency, counting what had a balance', () => {
    const h = netWorthHistory(group(), '2026-10-01');
    expect(h.filter(x => x.currency === 'EUR').map(x => [x.date, moneyText(x.net), x.counted])).toEqual([['2026-09-30', '4000.00', 2], ['2026-10-01', '4000.00', 2]]);
    expect(h.find(x => x.date === '2026-08-31')).toBeUndefined();
    expect(new Set(h.map(x => x.date)).size).toBe(2);
    expect(netWorthHistory(emptyAccounts(), '2026-10-01')).toEqual([]);
  });
});

describe('records', () => {
  it('a balance on the same date replaces that day\'s; payments only on debts; edits clear optional fields; remove', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    let g = recordBalance(group(), id, eur('530000', '2026-09-30'), AT);
    expect(g.items[0]!.snapshots.map(s => [s.date, s.value])).toEqual([['2026-09-01', '500000'], ['2026-09-30', '530000']]);
    expect(() => recordPayment(g, id, eur('100', '2026-09-30'), AT)).toThrow(/Only a debt has payments/);
    g = recordPayment(g, '00000000-0000-4000-8000-000000000002', eur('30000', '2026-09-28'), AT);
    expect(g.items[1]!.payments).toHaveLength(1);
    g = editAccount(g, '00000000-0000-4000-8000-000000000002', {name: 'Renamed loan', institution: 'Fictional bank', ratePercent: null}, AT);
    expect(g.items[1]).toMatchObject({name: 'Renamed loan', institution: 'Fictional bank'});
    expect(g.items[1]!.ratePercent).toBeUndefined();
    expect(removeAccount(g, id).items.map(a => a.id)).not.toContain(id);
    expect(accountsSchema.safeParse({version: 1, items: [{...g.items[0]!, snapshots: [...g.items[0]!.snapshots, {...g.items[0]!.snapshots[0]!, id: '00000000-0000-4000-8000-0000000000ff'}]}]}).success).toBe(false);
    expect(accountsSchema.safeParse({version: 1, items: [{...g.items[1]!, ratePercent: '101'}]}).success).toBe(false);
  });
});

describe('payoff', () => {
  it('months to zero from the person\'s own yearly rate and monthly payment; none when the payment does not cover the interest or beyond 100 years', () => {
    expect(payoffMonths(1000, 0, 100)).toBe(10);
    expect(payoffMonths(1000, 12, 100)).toBe(11);
    expect(payoffMonths(1000, 12, 10)).toBeNull();
    expect(payoffMonths(1_000_000, 0, 500)).toBeNull();
    expect(payoffMonths(0, 5, 100)).toBeNull();
    expect(payoffMonths(1000, 5, 0)).toBeNull();
  });
  it('the usual payment: the payments of the last 90 days per 30 days, from two payments up', () => {
    let g = group();
    const loan = '00000000-0000-4000-8000-000000000002';
    g = recordPayment(g, loan, eur('30000', '2026-09-28'), AT);
    expect(usualPayment(g.items[1]!, '2026-10-01')).toBeNull();
    g = recordPayment(recordPayment(g, loan, eur('30000', '2026-08-28'), AT), loan, eur('30000', '2026-06-01'), AT);
    expect(moneyText(usualPayment(g.items[1]!, '2026-10-01')!)).toBe('200.00');
  });
});

it('the Showcase accounts are fictional, valid and the same for the same day', () => {
  const a = showcaseAccounts('2026-10-01');
  expect(a).toEqual(showcaseAccounts('2026-10-01'));
  expect(a.items.every(x => x.institution === 'SHOWCASE DATA · fictional bank' && x.currency === 'USD')).toBe(true);
  const loan = a.items.find(x => x.kind === 'loan')!;
  expect(moneyText(usualPayment(loan, '2026-10-01')!)).toBe('300.00');
  expect(moneyText(netWorth(a, '2026-10-01').rows[0]!.net)).toBe(String(2430 + 10450 + 23900 - 6911 - 640) + '.00');
});
