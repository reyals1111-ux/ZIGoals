import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {detectBills} from './detect';
import {billPriceChange, candidatePriceChange} from './price-change';
import {confirmCandidate} from './store';
import {emptyBills} from './schema';

let n = 0;
const e = (date: string, amount: string, note = 'Netflix', category = 'Subscriptions', currency = 'EUR'): MoneyEntry => ({id: `p${n++}`, kind: 'expense', amount, currency, category, note, date, createdAt: `${date}T10:00:00.000Z`});
const TODAY = '2026-11-14';

describe('a bill\'s price change (Session AP, feature 6)', () => {
  test('the latest payment against the one before: went up, with the month of the earlier one', () => {
    const entries = [e('2026-08-03', '12.99'), e('2026-09-03', '12.99'), e('2026-10-03', '12.99'), e('2026-11-03', '13.49', 'NETFLIX.COM 4471*AB')];
    const [candidate] = detectBills(entries, TODAY);
    expect(candidate).toBeDefined();
    expect(candidatePriceChange(candidate!, entries, TODAY)).toEqual({direction: 'up', cents: 50, currency: 'EUR', previous: 1299, latest: 1349, previousDate: '2026-10-03', latestDate: '2026-11-03', sinceMonth: '2026-10'});
    const record = confirmCandidate(emptyBills(), candidate!, 'b1', new Date('2026-11-14T10:00:00Z'));
    expect(billPriceChange(record.bills[0]!, entries, TODAY)).toMatchObject({direction: 'up', cents: 50});
  });
  test('a rise beyond the detector\'s ±5 % still shows; a fall says down', () => {
    const base = [e('2026-07-03', '10.00'), e('2026-08-03', '10.00'), e('2026-09-03', '10.00')];
    const [candidate] = detectBills(base, '2026-09-10');
    const record = confirmCandidate(emptyBills(), candidate!, 'b1', new Date('2026-09-10T10:00:00Z'));
    expect(billPriceChange(record.bills[0]!, [...base, e('2026-10-03', '15.00')], TODAY)).toMatchObject({direction: 'up', cents: 500, sinceMonth: '2026-09'});
    expect(billPriceChange(record.bills[0]!, [...base, e('2026-10-03', '15.00'), e('2026-11-03', '9.00')], TODAY)).toMatchObject({direction: 'down', cents: 600, sinceMonth: '2026-10'});
  });
  test('no change, a hand-made bill, another payee or currency, or a later date: no notice', () => {
    const entries = [e('2026-08-03', '12.99'), e('2026-09-03', '12.99'), e('2026-10-03', '12.99'), e('2026-11-20', '20.00'), e('2026-11-04', '99.00', 'Netflix', 'Subscriptions', 'USD'), e('2026-11-05', '1.00', 'Music')];
    const [candidate] = detectBills(entries, TODAY).filter(c => c.currency === 'EUR' && c.payee === 'netflix');
    expect(candidatePriceChange(candidate!, entries, TODAY)).toBeNull();
    const manual = {id: 'm', title: 'Rent', amount: '900.00', currency: 'EUR', cadence: 'monthly' as const, nextDue: '2026-12-01', origin: 'manual' as const, createdAt: '2026-11-01T10:00:00.000Z'};
    expect(billPriceChange(manual, entries, TODAY)).toBeNull();
  });
  test('a same-day duplicate is not a second payment', () => {
    const entries = [e('2026-08-03', '12.99'), e('2026-09-03', '12.99'), e('2026-10-03', '12.99'), e('2026-10-03', '14.00')];
    const [candidate] = detectBills(entries, TODAY);
    expect(candidatePriceChange(candidate!, entries, TODAY)).toBeNull();
  });
});
