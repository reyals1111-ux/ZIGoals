import {describe, expect, test} from 'vitest';
import {cardState, cardStates, hasReminder, nextMonthDay, reminderBill, reminderId, withCard} from './cards';
import type {Account, Accounts} from '../accounts/schema';
import {addManualBill} from '../bills/store';
import {emptyBills} from '../bills/schema';
import type {WealthSheet} from './schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi's credit card dashboard, LEDGER #293): a card's limit, the share used (what
 * it owes today: its latest balance less the payments recorded since), what is available, and the next statement and
 * due days; a payment reminder is an ordinary monthly bill on the due day.
 */
const TODAY = '2026-11-22', at = `${TODAY}T10:00:00.000Z`, ID = '00000000-0000-4000-8000-0000000000c1';
const card: Account = {id: ID, kind: 'credit-card', name: 'Everyday Card', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000000d1', date: '2026-11-10', value: '60000', decimals: 2}],
  payments: [{id: '00000000-0000-4000-8000-0000000000e1', date: '2026-11-15', value: '15000', decimals: 2}], createdAt: at, updatedAt: at};
const accounts: Accounts = {version: 1, items: [card, {...card, id: '00000000-0000-4000-8000-0000000000c2', kind: 'cash', name: 'Current'}]};
const sheet: WealthSheet = withCard({version: 1}, ID, {limit: '2000.00', statementDay: 5, dueDay: 31});

describe('a credit card’s limit and use', () => {
  test('kept, changed and cleared in the wealth sheet; a day outside 1–31 or a limit of zero is refused', () => {
    expect(sheet.cards).toEqual({[ID]: {limit: '2000.00', statementDay: 5, dueDay: 31}});
    expect(withCard(sheet, ID, {limit: null, statementDay: null, dueDay: null})).toEqual({version: 1});
    expect(() => withCard(sheet, ID, {limit: '0', statementDay: null, dueDay: null})).toThrow(/above zero/);
    expect(() => withCard(sheet, ID, {limit: null, statementDay: 32, dueDay: null})).toThrow(/1 to 31/);
  });
  test('used is what it owes today (balance less payments since), with the share and what is available', () => {
    expect(cardState(card, sheet, TODAY)).toMatchObject({owed: 45000, limit: 200000, share: 0.225, available: 155000, nextStatement: '2026-12-05', nextDue: '2026-11-30'});
    expect(cardStates(accounts, sheet, TODAY).map(c => c.name)).toEqual(['Everyday Card']);
    expect(cardState(card, null, TODAY)).toMatchObject({limit: null, share: null, nextDue: null});
    expect(cardState({...card, snapshots: [], payments: []}, sheet, TODAY)).toMatchObject({owed: null, share: null, available: null});
  });
  test('the next day of a month; a short month uses its last day', () => {
    expect(nextMonthDay(31, '2027-02-10')).toBe('2027-02-28');
    expect(nextMonthDay(5, '2026-11-22')).toBe('2026-12-05');
    expect(nextMonthDay(22, '2026-11-22')).toBe('2026-11-22');
  });
  test('a payment reminder: a monthly bill on the due day for what is owed now, found again by its id', () => {
    const bill = reminderBill(cardState(card, sheet, TODAY))!;
    expect(bill).toEqual({title: 'Everyday Card payment', amount: '450.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-30', category: 'Bills'});
    const bills = addManualBill(emptyBills(), bill, reminderId(ID), new Date(at));
    expect(hasReminder(bills, ID)).toBe(true); expect(hasReminder(emptyBills(), ID)).toBe(false);
    expect(reminderBill(cardState(card, withCard({version: 1}, ID, {limit: '2000.00', statementDay: null, dueDay: null}), TODAY))).toBeNull();
  });
});
