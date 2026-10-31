import {describe, expect, test} from 'vitest';
import {bufferDays, bufferSentence, bufferTrend} from './buffer';
import {addLocalDays} from '../local-date';
import type {Account, Accounts} from '../accounts/schema';
import type {MoneyEntry} from '../money-log/schema';

const today = '2026-10-31';
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const account = (kind: Account['kind'], currency: string, snapshots: [string, string, number][] = [], archived = false): Account => ({id: uuid(), kind, name: kind, currency, snapshots: snapshots.map(([date, value, decimals]) => ({id: uuid(), date, value, decimals})), payments: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...(archived ? {archivedAt: '2026-02-01T00:00:00.000Z'} : {})});
const accounts = (...items: Account[]): Accounts => ({version: 1, items});
const spend = (offset: number, amount: string, currency = 'EUR', kind: 'expense' | 'income' = 'expense'): MoneyEntry => { const date = addLocalDays(today, offset); return {id: uuid(), kind, amount, currency, category: 'Other', date, createdAt: `${date}T10:00:00.000Z`}; };
// 30 days of 20.00 a day = 600.00 in the window.
const month = Array.from({length: 30}, (_, i) => spend(-i, '20.00'));

describe('buffer days (Session AK lane M, item 11)', () => {
  test('cash and savings balances ÷ the trailing 30-day average daily spending, floored', () => {
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '100000', 2]]), account('savings', 'EUR', [['2026-10-30', '50050', 2]]), account('investment', 'EUR', [['2026-10-30', '9999999', 2]])), [...month, spend(-1, '500.00', 'EUR', 'income')], today);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({currency: 'EUR', known: true, days: 75, cashCents: 150050n, dailyCents: 2000, windowDays: 30, missingBalances: 0});
    expect(bufferSentence(rows[0]!)).toBe('Your cash covers 75 days of your usual spending.');
  });
  test('balances in other decimals are exact', () => {
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '600', 0]])), month, today);
    expect(rows[0]).toMatchObject({known: true, days: 30, cashCents: 60000n});
  });
  test('unknown is never zero: no balance, too short a history, no spending', () => {
    expect(bufferDays(accounts(), month, today)).toEqual([]);
    const noBalance = bufferDays(accounts(account('cash', 'EUR')), month, today)[0]!;
    expect(noBalance).toMatchObject({known: false, reason: 'no-cash', missingBalances: 1});
    expect(bufferSentence(noBalance)).toMatch(/cannot be worked out yet: add a balance/);
    const short = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '1000', 2]])), [spend(0, '5.00'), spend(-5, '5.00')], today)[0]!;
    expect(short).toMatchObject({known: false, reason: 'short-history'});
    expect(bufferSentence(short)).toMatch(/at least 14 days/);
    const none = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '1000', 2]])), [spend(-40, '5.00'), spend(-2, '9.00', 'EUR', 'income')], today)[0]!;
    expect(none).toMatchObject({known: false, reason: 'no-spending'});
  });
  test('a history shorter than 30 days (but at least 14) averages over the days it covers', () => {
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '30000', 2]])), Array.from({length: 15}, (_, i) => spend(-i, '10.00')), today);
    expect(rows[0]).toMatchObject({known: true, windowDays: 15, dailyCents: 1000, days: 30});
  });
  test('a cash account without a balance makes it "at least"; archived accounts and other currencies stay out', () => {
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '60000', 2]]), account('savings', 'EUR'), account('cash', 'EUR', [['2026-10-01', '999999', 2]], true), account('cash', 'USD', [['2026-10-01', '100', 2]])), month, today);
    expect(rows.map(r => r.currency)).toEqual(['EUR', 'USD']);
    expect(bufferSentence(rows[0]!)).toBe('Your cash covers at least 30 days of your usual spending.');
    expect(rows[1]).toMatchObject({known: false, reason: 'short-history'});
  });
  test('the trend compares with 30 days ago, when that is known', () => {
    const older = Array.from({length: 30}, (_, i) => spend(-30 - i, '10.00'));
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-09-01', '30000', 2], ['2026-10-20', '60000', 2]])), [...month, ...older], today);
    expect(rows[0]).toMatchObject({days: 30, earlier: 30});
    expect(bufferTrend(rows[0]!)).toBe('The same as 30 days ago.');
    const rows2 = bufferDays(accounts(account('cash', 'EUR', [['2026-09-01', '15000', 2], ['2026-10-20', '60000', 2]])), [...month, ...older], today);
    expect(bufferTrend(rows2[0]!)).toBe('30 days ago: 15 days.');
    expect(bufferTrend(bufferDays(accounts(account('cash', 'EUR', [['2026-10-20', '60000', 2]])), month, today)[0]!)).toBeNull();
  });
});
