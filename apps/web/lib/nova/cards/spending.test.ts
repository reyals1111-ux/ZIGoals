import {describe, expect, it} from 'vitest';
import {emptyMoneyLog, moneyLogSchema, type MoneyEntry} from '../../money-log/schema';
import {spendingAsOf, spendingCard, spendingRows, spendingWindow} from './spending';

const TODAY = '2026-11-11';
let n = 0;
const entry = (date: string, amount: string, category: string, extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `e${++n}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T12:00:00.000Z`, ...extra});
const log = (entries: MoneyEntry[]) => moneyLogSchema.parse({version: 1, entries, weekStartsOn: 'monday'});

describe('spending card (Session AM)', () => {
  it('the range: this month so far by default, else the last days with today included', () => {
    expect(spendingWindow(TODAY)).toEqual({from: '2026-11-01', to: TODAY, words: 'this month'});
    expect(spendingWindow(TODAY, 'week')).toEqual({from: '2026-11-05', to: TODAY, words: 'in the last 7 days'});
    expect(spendingWindow(TODAY, 'year').from).toBe('2025-11-12');
  });
  it('teaches with an empty log, and with income only (income is not spending)', () => {
    expect(spendingCard(emptyMoneyLog(), TODAY)).toMatchObject({state: 'empty', currency: null, total: '—', categories: [], largest: null});
    expect(spendingCard(log([entry('2026-11-03', '2400.00', 'Salary', {kind: 'income'})]), TODAY).state).toBe('empty');
  });
  it('nothing logged in the range is said as nothing logged, never as zero spent', () => {
    const card = spendingCard(log([entry('2026-10-20', '12.00', 'Fun')]), TODAY);
    expect(card).toMatchObject({state: 'quiet', total: '—', lastDate: '2026-10-20'});
    expect(spendingRows(card)).toEqual([['Spent this month', 'Nothing logged']]);
    expect(spendingAsOf(card)).toBe('last entry Oct 20');
  });
  it('totals the range in exact cents, ranks categories by their share, and names the largest entry', () => {
    const card = spendingCard(log([
      entry('2026-11-02', '38.90', 'Groceries'), entry('2026-11-05', '61.30', 'Groceries', {note: 'Market'}), entry('2026-11-10', '0.10', 'Transport'), entry('2026-11-10', '0.20', 'Transport'),
      entry('2026-11-11', '24.50', 'Fun'), entry('2026-10-31', '500.00', 'Home'), entry('2026-11-12', '9.00', 'Fun'), entry('2026-11-03', '2400.00', 'Salary', {kind: 'income'}),
    ]), TODAY);
    expect(card).toMatchObject({state: 'live', currency: 'EUR', totalCents: 12500, total: '€125.00', entries: 5, others: [], lastDate: '2026-11-11'});
    expect(card.categories.map(c => [c.category, c.text, c.percent])).toEqual([['Groceries', '€100.20', '80%'], ['Fun', '€24.50', '20%'], ['Transport', '€0.30', '0%']]);
    expect(card.categories[0]!.share).toBeCloseTo(0.8016, 4);
    expect(card.largest).toEqual({cents: 6130, text: '€61.30', what: 'Market', date: '2026-11-05'});
    expect(spendingRows(card)).toEqual([
      ['Spent this month', '€125.00 in 5 entries'], ['Groceries', '€100.20, 80% of the total'], ['Fun', '€24.50, 20% of the total'], ['Transport', '€0.30, 0% of the total'],
      ['Largest entry', '€61.30 for Market on Nov 5'],
    ]);
    expect(spendingAsOf(card)).toBe('last entry Nov 11');
  });
  it('a split entry counts in each of its parts\' categories', () => {
    const card = spendingCard(log([entry('2026-11-04', '50.00', 'Groceries', {parts: [{amount: '30.00', category: 'Groceries'}, {amount: '20.00', category: 'Gifts'}]})]), TODAY);
    expect(card.total).toBe('€50.00');
    expect(card.categories.map(c => [c.category, c.cents])).toEqual([['Groceries', 3000], ['Gifts', 2000]]);
    expect(card.largest?.cents).toBe(5000);
  });
  it('two currencies are never added or converted: the larger leads, the other is listed apart', () => {
    const card = spendingCard(log([entry('2026-11-02', '40.00', 'Fun'), entry('2026-11-03', '90.00', 'Fun', {currency: 'USD'}), entry('2026-11-04', '15.00', 'Transport', {currency: 'USD'})]), TODAY);
    expect(card).toMatchObject({currency: 'USD', total: '$105.00', totalCents: 10500, entries: 2});
    expect(card.others).toEqual([{currency: 'EUR', cents: 4000, text: '€40.00'}]);
    expect(card.categories.map(c => [c.category, c.text, c.percent])).toEqual([['Fun', '$90.00', '86%'], ['Transport', '$15.00', '14%']]);
    expect(card.largest).toMatchObject({text: '$90.00', what: 'Fun'});
    expect(spendingRows(card).at(-1)).toEqual(['Also spent in EUR', '€40.00, never converted']);
  });
  it('a requested range reads the last days, not the month', () => {
    const card = spendingCard(log([entry('2026-10-20', '12.00', 'Fun'), entry('2026-11-10', '3.00', 'Fun')]), TODAY, 'month');
    expect(card).toMatchObject({state: 'live', total: '€15.00'});
    expect(spendingRows(card)[0]).toEqual(['Spent in the last 30 days', '€15.00 in 2 entries']);
    expect(spendingCard(log([entry('2026-10-20', '12.00', 'Fun'), entry('2026-11-10', '3.00', 'Fun')]), TODAY, 'week').total).toBe('€3.00');
  });
});
