// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {balanceCents, bankAccountNames, difference, lastChecked, markChecked, movement, toCheck, uncheck} from './reconcile';
import {readMoneyAmount} from './form';
import {totals} from './engine';
import {emptyMoneyLog, MONEY_LOG_KEY, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import type {Account} from '../accounts/schema';
import Reconcile from '../../components/wealth/reconcile';

/**
 * Session AV lane 2, round 4 (money; Actual's reconcile, LEDGER #340): a statement's balances, the entries it shows
 * ticked, the difference until zero, and the checked mark — every entry whole, as a bank lists it (not a spending figure).
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `r${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-03', createdAt: `2026-11-03T10:00:0${n % 10}.000Z`, ...over});
const entries = [e({amount: '42.10', note: 'Market', account: 'ING current'}), e({amount: '30.00', share: '10.00', date: '2026-11-05', account: 'ING current'}), e({kind: 'income', amount: '2000.00', category: 'Salary', date: '2026-11-01', account: 'ING current'}),
  e({amount: '200.00', transfer: 'x', date: '2026-11-07', account: 'ING current'}), e({amount: '5.00', date: '2026-11-08', account: 'Card'}), e({amount: '9.00', currency: 'USD'}), e({amount: '1.00', checked: '2026-10-31', date: '2026-10-30'})];

describe('check against my bank (#340)', () => {
  const list = toCheck(entries, {currency: 'EUR', from: '2026-11-01', through: '2026-11-30'});
  test('the entries not yet checked in the currency and the time, oldest first; one bank account name', () => {
    expect(list.map(x => x.amount)).toEqual(['2000.00', '42.10', '30.00', '200.00', '5.00']);
    expect(toCheck(entries, {currency: 'EUR', from: '2026-11-01', through: '2026-11-30', account: 'Card'}).map(x => x.amount)).toEqual(['5.00']);
    expect(bankAccountNames(entries, 'EUR')).toEqual(['Card', 'ING current']);
    expect(lastChecked(entries, 'EUR')).toBe('2026-10-31');
  });
  test('every entry whole, a transfer included (what the bank moved), unlike the spending figure', () => {
    const ing = list.filter(x => x.account === 'ING current');
    expect(movement(ing)).toBe(200_000 - 4_210 - 3_000 - 20_000);
    expect(totals(ing, '2026-11-01', '2026-11-30')[0]!.expenses).toBe(5_210); // Spending's own figure stays the person's share, no transfer
    expect(difference({opening: 100_000, closing: 272_790, debt: false}, ing)).toBe(0);
    expect(difference({opening: 100_000, closing: 272_000, debt: false}, ing)).toBe(-790);
    expect(difference({opening: 30_000, closing: 30_500, debt: true}, [list.at(-1)!])).toBe(0); // a card: spending raises what is owed
  });
  test('balances as typed: decimal comma, a minus, a sum, zero', () => {
    expect(balanceCents('1.234,56', readMoneyAmount)).toBe(123_456);
    expect(balanceCents('−12,50', readMoneyAmount)).toBe(-1_250);
    expect(balanceCents('100+20', readMoneyAmount)).toBe(12_000);
    expect(balanceCents('0', readMoneyAmount)).toBe(0);
    expect(balanceCents('abc', readMoneyAmount)).toBeNull();
  });
  test('marked with the statement day, taken off again; the record reads', () => {
    const log: MoneyLog = {...emptyMoneyLog(), entries};
    const marked = markChecked(log, new Set([list[0]!.id, list[1]!.id]), '2026-11-30');
    expect(marked.entries.filter(x => x.checked === '2026-11-30')).toHaveLength(2);
    expect(moneyLogSchema.parse(marked).entries.find(x => x.id === list[0]!.id)!.checked).toBe('2026-11-30');
    expect(uncheck(marked, list[0]!.id).entries.find(x => x.id === list[0]!.id)!.checked).toBeUndefined();
    expect(() => markChecked(log, new Set(), 'soon')).toThrow('Choose the statement’s day.');
  });
  test('the panel: ticks, the difference until zero, then the entries are marked', async () => {
    localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries: [e({amount: '42.10', note: 'Market', date: '2026-11-10'}), e({amount: '7.90', note: 'Café', date: '2026-11-11'})]}));
    const account: Account = {id: '00000000-0000-4000-8000-000000000001', kind: 'cash', name: 'Current account', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-000000000002', date: '2026-10-01', value: '50000', decimals: 2}], payments: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'};
    const box = document.createElement('div'); document.body.append(box);
    const root = createRoot(box);
    await act(async () => { root.render(createElement(Reconcile, {account, today: '2026-11-14'})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(box.textContent).toContain('Started from your own balance on Oct 1, 2026: €500.00.');
    const closing = [...box.querySelectorAll('label')].find(l => l.textContent?.startsWith('Closing balance'))!.querySelector('input')!;
    const setValue = (input: HTMLInputElement, v: string) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, v); input.dispatchEvent(new Event('input', {bubbles: true})); };
    await act(async () => { setValue(closing, '450,00'); });
    const boxes = [...box.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes).toHaveLength(2);
    await act(async () => { boxes[0]!.click(); });
    expect(box.querySelector('.money-select-total')!.textContent).toBe('1 ticked · −€42.10 · difference −€7.90');
    await act(async () => { boxes[1]!.click(); });
    expect(box.querySelector('.money-select-total')!.textContent).toBe('2 ticked · −€50.00 · it matches your statement');
    const mark = [...box.querySelectorAll('button')].find(b => b.textContent === 'Mark 2 as checked')!;
    await act(async () => { mark.click(); await new Promise(r => setTimeout(r, 0)); });
    const saved = JSON.parse(localStorage.getItem(MONEY_LOG_KEY)!) as MoneyLog;
    expect(saved.entries.map(x => x.checked)).toEqual(['2026-11-14', '2026-11-14']);
    await act(async () => { root.unmount(); });
  });
});
