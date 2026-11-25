import {describe, expect, test} from 'vitest';
import {billTo, choiceOf, endsOf, endsProblem, hasEnded, lastDueOf, liveBills, paymentsLeft, setEnds} from './ends';
import {billSchema, billsSchema, type Bill, type BillsRecord} from './schema';
import {billOccurrences, cancelReminders, monthlyEstimate, upcomingBills, yearlyEstimate} from './store';
import {billCalendar} from './calendar';
import {billsThisMonth, dueBeforePayday} from './month';
import {billsCard} from '../nova/cards/bills';

/** Session AW X7 (LEDGER #462): a bill that ends — after N payments or on a day — leaves every list after its last payment. */
const today = '2026-11-25', at = '2026-01-01T09:00:00.000Z';
const bill = (over: Partial<Bill>): Bill => billSchema.parse({id: 'phone', title: 'Phone contract', amount: '25.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-05', origin: 'manual', createdAt: at, ...over});
const record = (...bills: Bill[]): BillsRecord => billsSchema.parse({version: 1, bills, dismissed: []});

describe('the last payment and what is left', () => {
  test('after 24 payments counted from the first one: "3 of 24 left"', () => {
    const b = bill({ends: {after: 24, from: '2025-03-05'}});
    expect(lastDueOf(b)).toBe('2027-02-05');
    expect(paymentsLeft(b, today)).toEqual({left: 3, of: 24, last: '2027-02-05', ended: false});
    expect(paymentsLeft(b, '2027-02-05')).toMatchObject({left: 1});
    expect(paymentsLeft(b, '2027-02-06')).toEqual({left: 0, of: 24, last: '2027-02-05', ended: true});
    expect(hasEnded(b, '2027-02-05')).toBe(false);
    expect(hasEnded(b, '2027-02-06')).toBe(true);
  });
  test('a first payment still ahead counts every payment', () => {
    expect(paymentsLeft(bill({ends: {after: 12, from: '2026-12-05'}}), today)).toMatchObject({left: 12, of: 12, last: '2027-11-05'});
  });
  test('on a day: the last due date on or before it; the 31st keeps its month-end steps', () => {
    expect(lastDueOf(bill({ends: {on: '2027-03-04'}}))).toBe('2027-02-05');
    expect(lastDueOf(bill({ends: {on: '2027-03-05'}}))).toBe('2027-03-05');
    expect(paymentsLeft(bill({ends: {on: '2027-03-05'}}), today)).toEqual({left: 4, of: null, last: '2027-03-05', ended: false});
    expect(lastDueOf(bill({nextDue: '2026-01-31', ends: {after: 2, from: '2026-01-31'}}))).toBe('2026-02-28');
    expect(lastDueOf(bill({cadence: 'weekly', nextDue: '2026-11-27', ends: {after: 3, from: '2026-11-27'}}))).toBe('2026-12-11');
    expect(lastDueOf(bill({cadence: 'yearly', nextDue: '2026-06-01', ends: {after: 2, from: '2020-06-01'}}))).toBe('2021-06-01');
  });
  test('no end: nothing changes', () => {
    expect(lastDueOf(bill({}))).toBeNull();
    expect(billTo(bill({}), '2030-01-01')).toBe('2030-01-01');
    expect(paymentsLeft(bill({}), today)).toBeNull();
  });
});

describe('after its last payment the bill leaves Upcoming, the calendar, the month, the estimates and the reminders', () => {
  const ending = bill({id: 'phone', ends: {after: 2, from: '2026-12-05'}, cancelNote: 'Decide on a new plan', cancelBy: '2026-11-28'});
  const rent = bill({id: 'rent', title: 'Rent', amount: '900.00', nextDue: '2026-12-01'});
  test('Upcoming and the reminders (the notification plan reads upcomingBills) stop at the last payment', () => {
    expect(billOccurrences(record(ending, rent), today, 90).filter(o => o.billId === 'phone').map(o => o.due)).toEqual(['2026-12-05', '2027-01-05']);
    expect(upcomingBills(record(ending), today, 90).map(o => o.id)).toEqual(['phone-2026-12-05', 'phone-2027-01-05']);
  });
  test('the calendar of a month after the end shows only the other bills', () => {
    const feb = billCalendar(record(ending, rent), today, '2027-02');
    expect(feb.due.map(d => d.id)).toEqual(['rent']);
    expect(billCalendar(record(ending, rent), today, '2027-01').due.map(d => d.id).sort()).toEqual(['phone', 'rent']);
  });
  test('the month\'s bills, before payday and the estimates', () => {
    const ended = bill({id: 'old', ends: {on: '2026-10-31'}, nextDue: '2026-08-05'});
    expect(billsThisMonth(record(ended, rent), [], today).lines.map(l => `${l.billId} ${l.due}`)).toEqual(['rent 2026-11-01']);
    expect(dueBeforePayday(record(ended, rent), [], today, '2027-02-01')).toEqual([{currency: 'EUR', cents: 180000, count: 2}]);
    expect(monthlyEstimate(record(ended, rent), today)).toEqual([{currency: 'EUR', cents: 90000}]);
    expect(monthlyEstimate(record(ended, rent))).toEqual([{currency: 'EUR', cents: 92500}]);
    expect(yearlyEstimate(record(ended, rent), today)).toEqual([{currency: 'EUR', cents: 1080000}]);
    expect(liveBills(record(ended, rent), today).bills.map(b => b.id)).toEqual(['rent']);
    expect(billsCard(record(ended, rent), today).lines.map(l => l.id)).toEqual(['rent']);
  });
  test('a note to self on an ended bill is no longer a reminder', () => {
    expect(cancelReminders(record(ending), today).map(n => n.billId)).toEqual(['phone']);
    expect(cancelReminders(record({...ending, ends: {on: '2026-10-01'}}), today)).toEqual([]);
  });
});

describe('the form\'s choice and the stored field (TIER 3, additive on the loose bill)', () => {
  test('choices, problems, and setting or removing the end', () => {
    expect(endsProblem({kind: 'after', count: '0', from: '2026-12-05'})).toMatch(/from 1 to 600/);
    expect(endsProblem({kind: 'after', count: '24', from: ''})).toBe('Choose the day of the first payment.');
    expect(endsProblem({kind: 'on', date: 'soon'})).toBe('Choose the day of the last payment.');
    expect(endsOf({kind: 'after', count: ' 24 ', from: '2025-03-05'})).toEqual({after: 24, from: '2025-03-05'});
    expect(endsOf({kind: 'never'})).toBeUndefined();
    const r = setEnds(record(bill({})), 'phone', endsOf({kind: 'on', date: '2027-03-05'}));
    expect(r.bills[0]!.ends).toEqual({on: '2027-03-05'});
    expect(choiceOf(r.bills[0]!)).toEqual({kind: 'on', date: '2027-03-05'});
    expect('ends' in setEnds(r, 'phone', undefined).bills[0]!).toBe(false);
    expect(choiceOf(bill({}))).toEqual({kind: 'never'});
  });
  test('an end this build cannot read is dropped on read; the bill stays', () => {
    const parsed = billsSchema.parse({version: 1, dismissed: [], bills: [{...bill({}), ends: {after: 'many'}}]});
    expect(parsed.bills).toHaveLength(1);
    expect(parsed.bills[0]!.ends).toBeUndefined();
    expect(billSchema.parse({...bill({}), ends: {on: '2027-01-01', after: 2}}).ends).toBeUndefined();
  });
});
