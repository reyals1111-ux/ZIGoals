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
    expect(bufferSentence(short)).toBe('This cannot be worked out yet: log your EUR spending on at least 14 different days in the last 30.');
    const none = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '1000', 2]])), [spend(-40, '5.00'), spend(-2, '9.00', 'EUR', 'income')], today)[0]!;
    expect(none).toMatchObject({known: false, reason: 'no-spending'});
  });
  test('a history shorter than 30 days (but at least 14) averages over the days it covers', () => {
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '30000', 2]])), Array.from({length: 15}, (_, i) => spend(-i, '10.00')), today);
    expect(rows[0]).toMatchObject({known: true, windowDays: 15, dailyCents: 1000, days: 30});
  });
  test('a cash account without a balance makes it "at least"; archived accounts and other currencies stay out', () => {
    const rows = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '60000', 2]]), account('savings', 'EUR'), account('cash', 'EUR', [['2026-10-01', '999999', 2]], true), account('cash', 'USD', [['2026-10-01', '100', 2]])), month, today);
    // Session AL (A10-6, deliberate change): the spending in this window is all EUR, so the USD cash account no longer gets
    // its own "log your USD spending" row (the review's Showcase case). Equally strict: the rows are exactly EUR, and USD
    // comes back as its own row once USD spending is logged (below).
    expect(rows.map(r => r.currency)).toEqual(['EUR']);
    expect(bufferSentence(rows[0]!)).toBe('Your cash covers at least 30 days of your usual spending.');
    const both = bufferDays(accounts(account('cash', 'EUR', [['2026-10-01', '60000', 2]]), account('cash', 'USD', [['2026-10-01', '100', 2]])), [...month, spend(-3, '2.00', 'USD')], today);
    expect(both.map(r => r.currency)).toEqual(['EUR', 'USD']);
    expect(both[1]).toMatchObject({known: false, reason: 'short-history'});
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
  test('Session AK Q1 (audit #11): it counts days with spending, not the span: one purchase in a month is an honest unknown', () => {
    const cash = () => accounts(account('cash', 'USD', [['2026-10-01', '387000', 2]]));
    // The audit's case: one $42.10 spend (and two income entries) in the window gave "9178 days".
    const sparse = bufferDays(cash(), [spend(-25, '1500.00', 'USD', 'income'), spend(-20, '42.10', 'USD'), spend(-3, '1500.00', 'USD', 'income')], today)[0]!;
    expect(sparse).toMatchObject({currency: 'USD', known: false, reason: 'short-history'});
    expect(bufferSentence(sparse)).not.toMatch(/covers/);
    // 13 different days with spending (several entries on some days) is still not enough; the 14th day makes it known.
    const thirteen = Array.from({length: 13}, (_, i) => [spend(-2 * i, '10.00', 'USD'), spend(-2 * i, '5.00', 'USD')]).flat();
    expect(bufferDays(cash(), thirteen, today)[0]).toMatchObject({known: false, reason: 'short-history'});
    const fourteen = [...thirteen, spend(-27, '15.00', 'USD')];
    const known = bufferDays(cash(), fourteen, today)[0]!;
    // 14 × 15.00 = 210.00 over the 30-day window (the first entry is 27 days back, so the window is 28 days): 7.50 a day.
    expect(known).toMatchObject({known: true, windowDays: 28, dailyCents: 750, days: 516});
    // Income days never count as spending days.
    const incomeDays = Array.from({length: 20}, (_, i) => spend(-i, '100.00', 'USD', 'income'));
    expect(bufferDays(cash(), [...incomeDays, spend(0, '42.10', 'USD')], today)[0]).toMatchObject({known: false, reason: 'short-history'});
  });
  test('Session AL (A10-6): spending in EUR with cash accounts in USD names both currencies; unknown stays unknown', () => {
    const usd = accounts(account('cash', 'USD', [['2026-10-01', '243000', 2]]), account('savings', 'USD', [['2026-10-01', '1045000', 2]]), account('loan', 'USD', [['2026-10-01', '691100', 2]]));
    const rows = bufferDays(usd, month, today);
    expect(rows).toEqual([{currency: 'EUR', known: false, reason: 'no-cash', missingBalances: 0, cashIn: ['USD']}]);
    expect(bufferSentence(rows[0]!)).toBe('This cannot be worked out yet: your spending is logged in EUR, and your cash and savings accounts are in USD. Currencies are never converted, so add a cash or savings account in EUR with its balance.');
    expect(bufferSentence(rows[0]!)).not.toMatch(/USD spending/);
    // A EUR cash account with its balance makes the EUR buffer known.
    const known = bufferDays(accounts(...usd.items, account('cash', 'EUR', [['2026-10-01', '60000', 2]])), month, today);
    expect(known).toHaveLength(1);
    expect(known[0]).toMatchObject({currency: 'EUR', known: true, days: 30});
    // A EUR cash account without a balance is the plain "add a balance" line, with no other currency named.
    const noBalance = bufferDays(accounts(...usd.items, account('cash', 'EUR')), month, today)[0]!;
    expect(noBalance).toMatchObject({currency: 'EUR', reason: 'no-cash', missingBalances: 1});
    expect(noBalance).not.toHaveProperty('cashIn');
    // No spending at all in the window: one row per cash currency, as before.
    expect(bufferDays(usd, [], today).map(r => [r.currency, r.known ? 'known' : r.reason])).toEqual([['USD', 'short-history']]);
  });
});
