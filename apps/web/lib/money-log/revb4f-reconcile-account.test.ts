// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {accountChecked, markChecked, undoCheck, withAccountChecked} from './reconcile';
import {emptyMoneyLog, MONEY_LOG_KEY, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import type {Account} from '../accounts/schema';
import Reconcile from '../../components/wealth/reconcile';

/**
 * Review b4f #7 (Minor): the last statement day is kept per account, so checking Cash never moves where Savings' next
 * statement starts; Undo takes the marks off and puts the account's earlier day back.
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
const e = (id: string, date: string, over: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date, createdAt: `${date}T10:00:00.000Z`, ...over});
const account = (id: string, name: string): Account => ({id, kind: id.endsWith('1') ? 'cash' : 'savings', name, currency: 'EUR', snapshots: [], payments: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'});
const CASH = '00000000-0000-4000-8000-0000000000a1', SAVINGS = '00000000-0000-4000-8000-0000000000a2';

describe('review b4f #7: the last check per account', () => {
  test('pure: per account, and Undo puts the earlier day back', () => {
    const log: MoneyLog = {...emptyMoneyLog(), entries: [e('x', '2026-11-03'), e('y', '2026-11-04')]};
    const before = withAccountChecked(log, CASH, '2026-10-31');
    const after = withAccountChecked(markChecked(before, new Set(['x']), '2026-11-20'), CASH, '2026-11-20');
    expect([accountChecked(after, CASH), accountChecked(after, SAVINGS)]).toEqual(['2026-11-20', null]);
    const undone = undoCheck(after, new Set(['x']), '2026-11-20', CASH, '2026-10-31');
    expect(accountChecked(undone, CASH)).toBe('2026-10-31');
    expect(undone.entries.every(x => !x.checked)).toBe(true);
    expect(moneyLogSchema.parse(after).accounts?.checked).toEqual({[CASH]: '2026-11-20'});
  });
  test('the panel: another account’s check does not set Savings’ start', async () => {
    localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), accounts: {checked: {[CASH]: '2026-11-20'}}, entries: [e('x', '2026-11-03', {checked: '2026-11-20'}), e('y', '2026-11-10')]}));
    const box = document.createElement('div'); document.body.append(box);
    const root = createRoot(box);
    await act(async () => { root.render(createElement(Reconcile, {account: account(SAVINGS, 'Savings'), today: '2026-11-22'})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(box.textContent).not.toContain('Last checked up to');
    expect((box.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2026-10-23');
    expect(box.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
    await act(async () => { root.render(createElement(Reconcile, {account: account(CASH, 'Cash'), today: '2026-11-22'})); });
    await act(async () => { root.unmount(); });
    const cash = document.createElement('div'); document.body.append(cash);
    const again = createRoot(cash);
    await act(async () => { again.render(createElement(Reconcile, {account: account(CASH, 'Cash'), today: '2026-11-22'})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(cash.textContent).toContain('Last checked up to Nov 20, 2026');
    await act(async () => { again.unmount(); });
  });
});
