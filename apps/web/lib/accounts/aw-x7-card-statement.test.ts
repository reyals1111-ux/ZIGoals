import {describe, expect, test} from 'vitest';
import {cardStatement, dayOnOrAfter, onCard, onlyCreditCard, statementBefore, statementOnOrBefore} from './card-statement';
import {accountsSchema, type Account} from './schema';
import type {MoneyEntry} from '../money-log/schema';

/** Session AW X7 (LEDGER #464): a card's next payment and "so far this statement", from the person's own entries. */
const ID = '93000000-0000-4000-8000-000000000005', at = '2026-01-01T09:00:00.000Z';
const card = (over: Partial<Account> = {}): Account => accountsSchema.parse({version: 1, items: [{id: ID, kind: 'credit-card', name: 'Visa Gold', currency: 'EUR', snapshots: [], payments: [], createdAt: at, updatedAt: at, ...over}]}).items[0]!;
let n = 0;
const e = (date: string, amount: string, over: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `c${n++}`, kind: 'expense', amount, currency: 'EUR', category: 'Shopping', date, createdAt: at, account: 'VISA gold', ...over});
const days = {statementDay: 5, dueDay: 25, onlyCard: true};

describe('statement days', () => {
  test('the statement on or before a day, the one before it, and a day on or after; short months use their last day', () => {
    expect(statementOnOrBefore(5, '2026-11-25')).toBe('2026-11-05');
    expect(statementOnOrBefore(5, '2026-11-04')).toBe('2026-10-05');
    expect(statementOnOrBefore(31, '2026-11-30')).toBe('2026-11-30');
    expect(statementBefore(31, '2026-03-31')).toBe('2026-02-28');
    expect(dayOnOrAfter(25, '2026-11-25')).toBe('2026-11-25');
    expect(dayOnOrAfter(25, '2026-11-26')).toBe('2026-12-25');
  });
});

describe('the next payment', () => {
  const entries = [
    e('2026-10-05', '999.00'), // the statement before's own day: not in this one
    e('2026-10-06', '300.00'), e('2026-10-20', '150.30'), e('2026-11-05', '10.00'),
    e('2026-10-21', '48.00', {kind: 'income', refund: true}), // a refund lowers it
    e('2026-10-22', '500.00', {kind: 'income', transfer: 'x'}), // a card payment from the bank (a transfer): left out
    e('2026-10-23', '70.00', {currency: 'USD'}), // another currency: left out
    e('2026-11-06', '40.00'), e('2026-11-20', '56.10'), // so far this statement
  ];
  test('"Next payment on 25 Nov: €412.30 (statement of 5 Nov)" and "So far this statement: €96.10"', () => {
    expect(cardStatement(card(), entries, days, '2026-11-25')).toEqual({state: 'known', currency: 'EUR', statementDay: 5, lastStatement: '2026-11-05',
      soFar: {amount: '96.10', count: 2}, next: {due: '2026-11-25', statement: '2026-11-05', open: false, charged: '412.30', paid: null, amount: '412.30', count: 4}});
  });
  test('payments recorded on the card since the statement are taken off, never below zero', () => {
    const paid = card({payments: [{id: '11111111-1111-4111-8111-111111111111', date: '2026-11-10', value: '10000', decimals: 2}, {id: '22222222-2222-4222-8222-222222222222', date: '2026-11-01', value: '99999', decimals: 2}]});
    expect(cardStatement(paid, entries, days, '2026-11-25')).toMatchObject({next: {charged: '412.30', paid: '100.00', amount: '312.30'}});
    const all = card({payments: [{id: '11111111-1111-4111-8111-111111111111', date: '2026-11-10', value: '50000', decimals: 2}]});
    expect(cardStatement(all, entries, days, '2026-11-25')).toMatchObject({next: {amount: '0.00', paid: '500.00'}});
  });
  test('after the due day the next statement is still open: no amount yet, only what is on it so far', () => {
    expect(cardStatement(card(), entries, days, '2026-11-26')).toMatchObject({state: 'known', next: {due: '2026-12-25', statement: '2026-12-05', open: true, amount: null}, soFar: {amount: '96.10'}});
  });
  test('a due day before the statement day takes the statement before it', () => {
    expect(cardStatement(card(), entries, {statementDay: 20, dueDay: 10, onlyCard: true}, '2026-11-25')).toMatchObject({lastStatement: '2026-11-20', next: {due: '2026-12-10', statement: '2026-11-20', open: false}});
  });
  test('unknown is never 0: no statement day, or no entry ever on the card', () => {
    expect(cardStatement(card(), entries, {statementDay: null, dueDay: 25, onlyCard: true}, '2026-11-25')).toEqual({state: 'no-day'});
    expect(cardStatement(card(), [e('2026-11-06', '40.00', {account: 'Other bank'})], days, '2026-11-25')).toEqual({state: 'no-entries', statementDay: 5, lastStatement: '2026-11-05'});
    // Entries on the card, none since the statement: that is a fact.
    expect(cardStatement(card(), [e('2026-10-10', '5.00')], days, '2026-11-25')).toMatchObject({soFar: {amount: '0.00', count: 0}, next: {amount: '5.00'}});
  });
  test('without a due day: only so far this statement', () => {
    expect(cardStatement(card(), entries, {statementDay: 5, dueDay: null, onlyCard: true}, '2026-11-25')).toMatchObject({next: null, soFar: {amount: '96.10'}});
  });
});

describe('which entries are on the card', () => {
  test('its bank-file name, or Paid with: credit card while it is the only card in that currency', () => {
    const c = card();
    expect(onCard({account: 'Visa  GOLD', currency: 'EUR'}, c, false)).toBe(true);
    expect(onCard({account: 'Main bank', paidWith: 'credit', currency: 'EUR'}, c, true)).toBe(false);
    expect(onCard({paidWith: 'credit', currency: 'EUR'}, c, true)).toBe(true);
    expect(onCard({paidWith: 'credit', currency: 'EUR'}, c, false)).toBe(false);
    expect(onCard({paidWith: 'debit', currency: 'EUR'}, c, true)).toBe(false);
    const two = accountsSchema.parse({version: 1, items: [c, {...c, id: '93000000-0000-4000-8000-000000000006', name: 'Other'}]});
    expect(onlyCreditCard(two, c)).toBe(false);
    expect(onlyCreditCard({version: 1, items: [c]}, c)).toBe(true);
  });
});
