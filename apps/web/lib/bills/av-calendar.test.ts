import {describe, expect, it} from 'vitest';
import {billCalendar, monthAfter} from './calendar';
import type {BillsRecord} from './schema';

/** Session AV (fresh-agent check q2, rank 10; Rocket Money's bill calendar): the next 31 days, or a month you page, with each day's total. */
const bill = (id: string, title: string, amount: string, nextDue: string, cadence: 'weekly' | 'monthly' | 'yearly' = 'monthly', currency = 'EUR') => ({id, title, amount, currency, cadence, nextDue, origin: 'manual' as const, createdAt: '2026-09-01T10:00:00.000Z'});
const record: BillsRecord = {version: 1, dismissed: [], bills: [
  bill('r', 'Rent · SHOWCASE DATA', '900.00', '2026-12-01'), bill('g', 'Gym', '30.00', '2026-12-01'), bill('u', 'Cloud', '5.00', '2026-12-01', 'monthly', 'USD'), bill('i', 'Insurance', '180.00', '2027-02-10', 'yearly'),
]};
const TODAY = '2026-11-21';
const day = (c: ReturnType<typeof billCalendar>, date: string) => c.weeks.flat().find(d => d.date === date)!;
describe('Session AV (q2 rank 10): bill calendar', () => {
  it('the next 31 days: each day its bills and its total per currency, never added across', () => {
    const c = billCalendar(record, TODAY);
    expect([c.shown, c.from, c.to, c.title]).toEqual(['next', '2026-11-21', '2026-12-21', 'the next 31 days']);
    const first = day(c, '2026-12-01');
    expect(first.bills.map(b => b.title)).toEqual(['Cloud', 'Gym', 'Rent']);
    expect(first.totals).toEqual([{currency: 'EUR', text: '€930.00'}, {currency: 'USD', text: '$5.00'}]);
    expect(first.words).toMatch(/: Cloud \$5\.00, Gym €30\.00, Rent €900\.00$/);
    expect(day(c, '2026-11-17').inRange).toBe(false);
    expect(c.totals).toEqual([{currency: 'EUR', text: '€930.00', count: 2}, {currency: 'USD', text: '$5.00', count: 1}]);
  });
  it('a month you page: this month shows its earlier dates, a later month its own, a year ahead at most', () => {
    expect([monthAfter(TODAY, 0), monthAfter(TODAY, 1), monthAfter(TODAY, 3)]).toEqual(['2026-11', '2026-12', '2027-02']);
    const nov = billCalendar(record, TODAY, '2026-11');
    expect([nov.from, nov.to]).toEqual(['2026-11-01', '2026-11-30']);
    expect(day(nov, '2026-11-01').bills.map(b => b.id)).toEqual(['u', 'g', 'r']);
    expect(day(nov, '2026-12-01').inRange).toBe(false);
    const feb = billCalendar(record, TODAY, '2027-02');
    expect(feb.due.map(d => [d.id, d.date])).toEqual([['u', '2027-02-01'], ['g', '2027-02-01'], ['r', '2027-02-01'], ['i', '2027-02-10']]);
    expect(feb.totals[0]).toEqual({currency: 'EUR', text: '€1,110.00', count: 3});
    expect(day(feb, '2027-02-10').words).toMatch(/: Insurance €180\.00$/);
  });
});
