import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {expenseCategory} from '../money-log/category';
import {detectBills} from './detect';
import {candidatePriceChange} from './price-change';

// Session AU (ADR-044 L-4, the rehearsal's Lina): a bill whose price stepped up is still found, with its change.
let n = 0;
const e = (date: string, amount: string, note = 'Fictional Phone', category = 'Other'): MoneyEntry => ({id: `s${n++}`, kind: 'expense', amount, currency: 'EUR', category, note, date, createdAt: `${date}T10:00:00.000Z`});
const TODAY = '2026-11-24';

describe('a price step', () => {
  test('€15.00 twice, then €17.50 twice: one monthly bill, about €16.25, variable, and the rise shows', () => {
    const entries = [e('2026-08-04', '15.00'), e('2026-09-04', '15.00'), e('2026-10-04', '17.50'), e('2026-11-04', '17.50')];
    const [bill] = detectBills(entries, TODAY);
    expect(bill).toMatchObject({cadence: 'monthly', occurrences: 4, variable: true, nextDue: '2026-12-04'});
    expect(candidatePriceChange(bill!, entries, TODAY)).toMatchObject({direction: 'up', cents: 250, previousDate: '2026-09-04', latestDate: '2026-11-04', sinceMonth: '2026-09'});
  });
  test('amounts further apart than ±25 % stay apart (a gym fee is not a phone bill)', () => {
    const entries = [e('2026-08-04', '15.00'), e('2026-09-04', '15.00'), e('2026-10-04', '30.00'), e('2026-11-04', '30.00')];
    expect(detectBills(entries, TODAY)).toEqual([]);
  });
  test('a strict ±5 % series is unchanged', () => {
    const entries = [e('2026-08-03', '12.99', 'Netflix', 'Subscriptions'), e('2026-09-03', '12.99', 'Netflix', 'Subscriptions'), e('2026-10-03', '12.99', 'Netflix', 'Subscriptions'), e('2026-11-03', '40.00', 'Netflix', 'Subscriptions')];
    expect(detectBills(entries, TODAY)[0]).toMatchObject({occurrences: 3, variable: false});
  });
});
describe('shop names for an imported line', () => {
  test('a grocer, a bakery or a butcher is Groceries (EN and NL)', () => {
    for (const w of ['Fictional Grocer', 'Fictional Bakery', 'Bakkerij De Molen', 'Slager Jansen', 'Ekoplaza Utrecht']) expect(expenseCategory(undefined, w), w).toBe('Groceries');
  });
});
