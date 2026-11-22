// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {createElement, act} from 'react';
import {createRoot} from 'react-dom/client';
import {cashForecast, type KnownForecast} from './model';
import {changeFlows, changeIssue, removeWhatIf, restoreWhatIf, saveWhatIf, withChanges} from './what-if';
import {emptyMoneyMore, MONEY_MORE_KEY, moneyMoreSchema, type WhatIfChange} from '../money-more/schema';
import type {Accounts} from '../accounts/schema';
import TryAChange from '../../components/cash-forecast/try-a-change';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's what-if scenarios, LEDGER #388): made-up changes added to the forecast
 * as extra money out or in from their days — a second line, never written anywhere — and kept by name on the device.
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const A = '2026-01-01T09:00:00.000Z', TODAY = '2026-11-14';
const ACCOUNTS: Accounts = {version: 1, items: [{id: '00000000-0000-4000-8000-0000000e0001', kind: 'cash', name: 'Current', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000e0009', date: '2026-11-01', value: '500000', decimals: 2}], payments: [], createdAt: A, updatedAt: A}]};
const row = cashForecast({accounts: ACCOUNTS, bills: {version: 1, bills: [], dismissed: []}, entries: [], today: TODAY, days: 120}).rows[0] as KnownForecast;
const once = (amount: string, from: string, dir: 'out' | 'in' = 'out'): WhatIfChange => ({kind: 'once', dir, amount, from});
const monthly = (amount: string, from: string, until?: string, dir: 'out' | 'in' = 'out'): WhatIfChange => ({kind: 'monthly', dir, amount, from, ...(until ? {until} : {})});

describe('the changes as flows', () => {
  it('a one-off on its day; each month from its day, until its last day; only inside the forecast', () => {
    expect(changeFlows(once('2000.00', '2027-01-10'), '2026-11-15', '2027-03-14')).toEqual([{date: '2027-01-10', cents: -200000n}]);
    expect(changeFlows(monthly('150.00', '2026-12-31', '2027-02-28', 'out'), '2026-11-15', '2027-03-14').map(f => f.date)).toEqual(['2026-12-31', '2027-01-31', '2027-02-28']);
    expect(changeFlows(monthly('200.00', '2026-10-25', undefined, 'in'), '2026-11-15', '2027-01-31')).toEqual([{date: '2026-11-25', cents: 20000n}, {date: '2026-12-25', cents: 20000n}, {date: '2027-01-25', cents: 20000n}]);
    expect(changeFlows(once('5.00', '2026-11-01'), '2026-11-15', '2027-01-31')).toEqual([]);
  });
  it('the second line: the forecast’s points with each change added from its day; the forecast itself unchanged', () => {
    const before = JSON.stringify(row.points, (_, v) => typeof v === 'bigint' ? String(v) : v);
    const t = withChanges(row, [once('2000.00', '2027-01-10'), monthly('150.00', '2026-12-01')]);
    const at = (date: string) => t.points.find(p => p.date === date)!.mid - row.points.find(p => p.date === date)!.mid;
    expect(at(TODAY)).toBe(0n); expect(at('2026-11-30')).toBe(0n); expect(at('2026-12-01')).toBe(-15000n);
    expect(at('2027-01-10')).toBe(-15000n * 2n - 200000n);
    expect(t.moved).toBe(-15000n * 4n - 200000n); // Dec 1, Jan 1, Feb 1 and Mar 1 within 120 days, and the trip
    expect(t.lowest.cents).toBe(t.points.at(-1)!.mid);
    expect(t.skipped).toBe(0);
    expect(JSON.stringify(row.points, (_, v) => typeof v === 'bigint' ? String(v) : v)).toBe(before);
    expect(withChanges(row, [once('10.00', '2028-01-01')]).skipped).toBe(1);
  });
  it('refuses in words what cannot be tried', () => {
    expect(changeIssue({kind: 'once', dir: 'out', amount: '', from: '2027-01-01'}, TODAY)).toMatch(/amount/);
    expect(changeIssue({kind: 'once', dir: 'out', amount: '10.00', from: TODAY}, TODAY)).toMatch(/after today/);
    expect(changeIssue({kind: 'monthly', dir: 'out', amount: '10.00', from: '2027-02-01', until: '2027-01-01'}, TODAY)).toMatch(/last day/);
    expect(changeIssue(monthly('10.00', '2026-01-01'), TODAY)).toBeNull();
  });
});

describe('kept by name', () => {
  it('saves (the same name replaces), up to five, removes and comes back with Undo', () => {
    let more = saveWhatIf(emptyMoneyMore(), {name: ' A trip ', currency: 'EUR', changes: [once('2000.00', '2027-01-10')]}, 'w1');
    more = saveWhatIf(more, {name: 'a trip', currency: 'EUR', changes: [once('2500.00', '2027-01-10')]}, 'w2');
    expect(more.whatIfs).toEqual([{id: 'w1', name: 'a trip', currency: 'EUR', changes: [once('2500.00', '2027-01-10')]}]);
    expect(moneyMoreSchema.parse(more)).toEqual(more);
    for (let i = 0; i < 4; i++) more = saveWhatIf(more, {name: `Set ${i}`, currency: 'EUR', changes: [once('1.00', '2027-01-10')]}, `s${i}`);
    expect(() => saveWhatIf(more, {name: 'One more', currency: 'EUR', changes: [once('1.00', '2027-01-10')]}, 'x')).toThrow('Up to 5 kept sets');
    expect(() => saveWhatIf(more, {name: '', currency: 'EUR', changes: []}, 'x')).toThrow('Type a name');
    const set = more.whatIfs![0]!, gone = removeWhatIf(more, set.id);
    expect(gone.whatIfs).toHaveLength(4);
    expect(restoreWhatIf(gone, set, 0)).toEqual(more);
    expect(removeWhatIf({version: 1, whatIfs: [set]}, set.id)).toEqual({version: 1});
  });
});

describe('the panel', () => {
  it('a change tried draws the second line and words, never saving anything until asked', async () => {
    localStorage.clear();
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    await act(async () => { root.render(createElement(TryAChange, {rows: [row], today: TODAY, words: '120 days'})); });
    expect(host.textContent).toContain('A model, not a plan.');
    const amount = host.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => { setValue.call(amount, '2000'); amount.dispatchEvent(new Event('input', {bubbles: true})); });
    await act(async () => { host.querySelector<HTMLFormElement>('form')!.requestSubmit(); });
    expect(host.querySelector('.money-whatif-list')?.textContent).toContain('€2,000.00 more out on Dec 14, 2026');
    expect(host.querySelector('.money-whatif-line')).not.toBeNull();
    expect(host.querySelector('.money-whatif-words')?.textContent).toMatch(/with your changes around .+: about €3,000/);
    expect(localStorage.length).toBe(0);
    await act(async () => { root.unmount(); });
    host.remove();
  });
  it('review b5k #7: a kept set opens only on its own currency’s line; without one it is refused in words and nothing is drawn', async () => {
    localStorage.clear();
    localStorage.setItem(MONEY_MORE_KEY, JSON.stringify({version: 1, whatIfs: [{id: 'w1', name: 'US trip', currency: 'USD', changes: [{kind: 'once', dir: 'out', amount: '900.00', from: '2027-01-10'}]}]}));
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    await act(async () => { root.render(createElement(TryAChange, {rows: [row], today: TODAY, words: '120 days'})); });
    const open = [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.getAttribute('aria-label') === 'Open US trip')!;
    await act(async () => { open.click(); });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('“US trip” is in USD, and your forecast has no USD line now: it needs a cash or savings account in USD with its balance. Nothing was opened.');
    expect(host.querySelector('.money-whatif-line')).toBeNull();
    expect(host.querySelector('.money-whatif-list')).toBeNull();
    await act(async () => { root.unmount(); });
    host.remove(); localStorage.clear();
  });
});
