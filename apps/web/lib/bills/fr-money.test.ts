import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {detectBills, isPriceStep} from './detect';
import {billsThisMonth} from './month';
import {candidatePriceChange} from './price-change';
import {emptyBills} from './schema';
import {confirmCandidate, monthlyEstimate, yearlyEstimate} from './store';

// Session AV lane 2 (fr-money): the friend-readiness walk's Lina (FR-L-1, FR-L-2), with her own bank file's rows.
let n = 0;
const e = (date: string, amount: string, note: string, category = 'Other'): MoneyEntry => ({id: `f${n++}`, kind: 'expense', amount, currency: 'EUR', category, note, date, createdAt: `${date}T10:00:00.000Z`});
const TODAY = '2026-11-24';
const phone = [e('2026-08-04', '15.00', 'Fictional Phone'), e('2026-09-04', '15.00', 'Fictional Phone'), e('2026-10-04', '17.50', 'Fictional Phone'), e('2026-11-04', '17.50', 'Fictional Phone')];
const rent = ['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'].map(d => e(d, '950.00', 'Fictional Rent Co', 'Rent'));
const grocer = [e('2026-11-02', '61.30', 'Fictional Grocer', 'Groceries'), e('2026-11-09', '48.75', 'Fictional Grocer', 'Groceries'), e('2026-11-16', '55.10', 'Fictional Grocer', 'Groceries')];
const lina = [...phone, ...rent, ...grocer];

describe('FR-L-1: a bill whose price rose is the latest price paid', () => {
  test('confirmed at €17.50; this month counts the €17.50 paid on 4 Nov; the typical month and year use €17.50', () => {
    const found = detectBills(lina, TODAY), phoneBill = found.find(c => c.payee === 'fictional phone')!;
    expect(phoneBill).toMatchObject({amount: '17.50', variable: false});
    expect(candidatePriceChange(phoneBill, lina, TODAY)).toMatchObject({direction: 'up', previous: 1500, latest: 1750});
    let record = confirmCandidate(emptyBills(), phoneBill, 'phone', new Date('2026-11-24T10:00:00Z'));
    record = confirmCandidate(record, found.find(c => c.payee === 'fictional rent co')!, 'rent', new Date('2026-11-24T10:00:00Z'));
    expect(record.bills.find(b => b.id === 'phone')!.amount).toBe('17.50');
    expect(billsThisMonth(record, lina, TODAY).lines.map(l => [l.title, l.due, l.cents, l.state])).toEqual([['Fictional Rent Co', '2026-11-01', 95000, 'seen'], ['Fictional Phone', '2026-11-04', 1750, 'seen']]);
    expect(monthlyEstimate(record)).toEqual([{currency: 'EUR', cents: 96750}]);
    expect(yearlyEstimate(record)).toEqual([{currency: 'EUR', cents: 1161000}]);
  });
  test('a series without a clean step keeps its middle amount, "about"', () => {
    const energy = [e('2026-08-15', '100.00', 'Energy', 'Bills'), e('2026-09-15', '103.00', 'Energy', 'Bills'), e('2026-10-15', '98.00', 'Energy', 'Bills')];
    expect(detectBills(energy, TODAY)[0]).toMatchObject({amount: '100.00', variable: true});
  });
  test('a step is a steady amount, then another', () => {
    expect(isPriceStep([1500, 1500, 1750, 1750])).toBe(true);
    expect(isPriceStep([1299, 1299, 1299, 1349])).toBe(true);
    expect(isPriceStep([6130, 4875, 5510])).toBe(false);
    expect(isPriceStep([10000, 10300, 9800])).toBe(false);
    expect(isPriceStep([1500, 1500, 1500])).toBe(false);
  });
});

describe('FR-L-2: weekly shopping at one shop is not a bill', () => {
  test('three grocery trips of differing amounts: no candidate and no price change', () => {
    const found = detectBills(lina, TODAY);
    expect(found.map(c => c.payee).sort()).toEqual(['fictional phone', 'fictional rent co']);
  });
  test('the same trips a month apart are not a step either; four weekly trips within ±5 % are not a weekly bill', () => {
    const monthly = [e('2026-08-02', '61.30', 'Fictional Grocer', 'Groceries'), e('2026-09-02', '48.75', 'Fictional Grocer', 'Groceries'), e('2026-10-02', '55.10', 'Fictional Grocer', 'Groceries')];
    expect(detectBills(monthly, TODAY)).toEqual([]);
    const weekly = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'].map((d, i) => e(d, ['50.00', '51.50', '49.20', '52.00'][i]!, 'Fictional Grocer', 'Groceries'));
    expect(detectBills(weekly, TODAY)).toEqual([]);
  });
  test('a steady weekly fee is still a weekly bill', () => {
    const gym = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'].map(d => e(d, '5.00', 'Gym class', 'Health'));
    expect(detectBills(gym, TODAY)).toEqual([expect.objectContaining({cadence: 'weekly', amount: '5.00', variable: false})]);
  });
});
