import {describe, expect, it} from 'vitest';
import {billsSchema, emptyBills, type Bill} from '../../bills/schema';
import {billLine, billsCard, billsRows, dueWords, nearness} from './bills';

const TODAY = '2026-11-11';
const bill = (title: string, amount: string, nextDue: string, extra: Partial<Bill> = {}): Bill => ({id: `bill-${title.toLowerCase()}`, title, amount, currency: 'EUR', cadence: 'monthly', nextDue, origin: 'manual', createdAt: '2026-10-01T09:00:00.000Z', ...extra});
const record = (bills: Bill[]) => billsSchema.parse({version: 1, bills, dismissed: []});

describe('upcoming bills card (Session AM)', () => {
  it('the days to a bill in words, overdue included', () => {
    expect([0, 1, 2, 21, -1, -3].map(dueWords)).toEqual(['today', 'tomorrow', 'in 2 days', 'in 21 days', 'overdue by 1 day', 'overdue by 3 days']);
  });
  it('the countdown fills over the last 30 days: full on the day and when overdue, empty a month or more ahead', () => {
    expect([0, -4, 15, 30, 200].map(nearness)).toEqual([1, 1, 0.5, 0, 0]);
  });
  it('teaches with no bills', () => {
    expect(billsCard(emptyBills(), TODAY)).toEqual({state: 'empty', lines: [], next: null, month: [], typical: []});
  });
  it('lists each bill once at its next due date, soonest first, each amount in its own currency', () => {
    const card = billsCard(record([
      bill('Rent', '950.00', '2026-12-01'), bill('Music', '9.99', '2026-11-11'), bill('Insurance', '180.00', '2027-03-01', {cadence: 'yearly', currency: 'USD'}),
      bill('Gym', '25.00', '2026-10-14'), bill('Paper', '3.50', '2026-11-05', {cadence: 'weekly'}),
    ]), TODAY);
    expect(card.state).toBe('live');
    expect(card.lines.map(l => [l.title, l.amount, l.due, l.when])).toEqual([
      ['Music', '€9.99', '2026-11-11', 'today'], ['Paper', '€3.50', '2026-11-12', 'tomorrow'], ['Gym', '€25.00', '2026-11-14', 'in 3 days'],
      ['Rent', '€950.00', '2026-12-01', 'in 20 days'], ['Insurance', '$180.00', '2027-03-01', 'in 110 days'],
    ]);
    expect(card.next).toMatchObject({title: 'Music', days: 0, overdue: false, near: 1});
    // Today through 30 days ahead, per currency (the weekly bill comes five times, the monthly one due today comes again on Dec 11); USD has nothing due, so it is not listed as 0.
    expect(card.month).toEqual([{currency: 'EUR', text: '€1,012.48', count: 9}]);
    expect(card.typical).toEqual([{currency: 'EUR', text: '€1,000.16'}, {currency: 'USD', text: '$15.00'}]);
    expect(billsRows(card, 3)).toEqual([
      ['Next bill: Music', '€9.99, due Wed, Nov 11, today'], ['Paper', '€3.50, due Thu, Nov 12, tomorrow'], ['Gym', '€25.00, due Sat, Nov 14, in 3 days'], ['More bills', '2 more on Wealth'],
      ['Due in the next 30 days in EUR', '€1,012.48 across 9 due dates'], ['A typical month in EUR, an estimate', 'about €1,000.16'], ['A typical month in USD, an estimate', 'about $15.00'],
    ]);
  });
  it('a due date before today reads as overdue, in words, with a full dial', () => {
    const line = billLine(bill('Water', '30.00', '2026-11-08'), '2026-11-08', TODAY);
    expect(line).toMatchObject({days: -3, overdue: true, when: 'overdue by 3 days', near: 1, amount: '€30.00'});
    expect(billLine(bill('Water', '30.00', '2026-11-10'), '2026-11-10', TODAY).when).toBe('overdue by 1 day');
  });
  it('an amount in a code that is not money stays the person\'s own words, never a guessed currency', () => {
    expect(billLine(bill('Club', '12.50', '2026-11-20', {currency: 'XYZ'}), '2026-11-20', TODAY).amount).toBe('12.5 XYZ');
  });
});
