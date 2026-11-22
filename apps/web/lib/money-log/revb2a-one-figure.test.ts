import {describe, expect, test} from 'vitest';
import {ledger} from '../ai/local-answers/exact/money';
import {resolvePeriod} from '../ai/local-answers/exact/period';
import {cashRiver, categoryRanks, savingsRate, spendTrack, spendingCompare, spendingHeat} from '../nova/cards/ax/money-spend';
import {countedCents} from './counted';
import {totals} from './engine';
import type {MoneyEntry} from './schema';

/**
 * Review b2a #1–#3 (one month's spending is one figure everywhere): the reviewer's probe month — €10 counted, €50 marked
 * "Not part of my spending", €30 shared with "your share" €10 — is €20 spent in Wealth → Spending (`totals`), and so in
 * NOVA's and ZIGi's exact money answers, NOVA's spending widgets, the pay-period budgets, the payee budgets, the payee
 * watch and the challenges. A card payment matched as a transfer (both sides) and a Settle-up refund (a left-out income
 * entry) are neither spending nor income.
 */
const TODAY = '2026-11-20';
const e = (id: string, amount: string, extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Groceries', note: 'Albert Heijn', date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z', ...extra});
/** The probe month, a transfer pair (the card's payment out of the current account, and its side on the card) and a refund. */
const PROBE: MoneyEntry[] = [
  e('a', '10.00'), e('b', '50.00', {excluded: true}), e('c', '30.00', {share: '10.00'}),
  e('t1', '200.00', {category: 'Bills', note: 'Card payment', date: '2026-11-12', transfer: 't2'}),
  e('t2', '200.00', {kind: 'income', category: 'Other', note: 'Card payment', date: '2026-11-12', transfer: 't1'}),
  e('r', '20.00', {kind: 'income', category: 'Refund', note: 'Sam paid back · shared costs', date: '2026-11-14', excluded: true}),
  e('s', '1000.00', {kind: 'income', category: 'Salary', note: 'Work', date: '2026-11-01'}),
];
const month = resolvePeriod('this-month', TODAY)!;

describe('Wealth → Spending is the reference', () => {
  test('the probe month: €20.00 spent, €1,000.00 in (no transfer, no refund)', () => {
    expect(totals(PROBE, '2026-11-01', '2026-11-30')).toEqual([{currency: 'EUR', expenses: 2000, income: 100000, count: 3}]);
    expect(PROBE.map(countedCents)).toEqual([1000, 0, 1000, 0, 0, 0, 100000]);
  });
});
describe('B2A-1: NOVA and ZIGi exact money answers and NOVA’s spending widgets', () => {
  test('ledger: €20.00 spent in two counted entries; €1,000.00 came in', () => {
    const spent = ledger(PROBE, 'expense', month);
    expect(spent.total).toBe(2000); expect(spent.own.map(x => x.id)).toEqual(['a', 'c']);
    expect(ledger(PROBE, 'income', month).total).toBe(100000);
    expect(ledger(PROBE, 'expense', month, 'Bills').currency).toBeNull();
  });
  test('the ranks, the twins and the savings gauge say the same figures', () => {
    expect(categoryRanks(PROBE, 'expense', month)).toMatchObject({totalCents: 2000, total: '€20.00', entries: 2, rows: [{label: 'Groceries', cents: 2000, percent: '100%'}]});
    expect(spendingCompare(PROBE, 'expense', month, TODAY)).toMatchObject({nowCents: 2000});
    expect(savingsRate(PROBE, month)).toMatchObject({incomeCents: 100000, spendingCents: 2000, keptCents: 98000});
  });
  test('the days with spending, the heat and the river count the same €20.00', () => {
    const track = spendTrack(PROBE, TODAY, 'EUR'), days = track.points(['2026-11-10', '2026-11-12', '2026-11-14']);
    expect(days.map(d => [d.date, d.value, d.state])).toEqual([['2026-11-10', 2000, 'done'], ['2026-11-12', null, 'none'], ['2026-11-14', null, 'none']]);
    expect(spendingHeat(PROBE, TODAY)).toMatchObject({totalCents: 2000, daysWith: 1, peak: {date: '2026-11-10', cents: 2000}});
    expect(cashRiver(PROBE, month)).toMatchObject({incomeCents: 100000, spendingCents: 2000, netCents: 98000});
  });
});
