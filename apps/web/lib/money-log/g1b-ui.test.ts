// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement as h, type ComponentType} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import SpendingSection from '../../components/wealth/spending/spending-section';
import MoneyTools from '../../components/wealth/money-tools/money-tools';
import CashForecast from '../../components/cash-forecast/cash-forecast';
import MoneyPhotosPanel from '../../components/money-photos/money-photos-panel';
import NetWorthShare from '../../components/networth-share/networth-share';
import {MONEY_DRAFT_EVENT} from '../../components/money-photos/draft-event';
import {useDeviceRecord} from '../../components/ai/use-device-record';
import {MONEY_LOG, MONEY_LOG_KEY, emptyMoneyLog, type MoneyEntry} from './schema';
import {MONEY_REVIEW_KEY} from '../money-review/review';
import {ACCOUNTS_KEY} from '../accounts/schema';
import {BILLS_KEY} from '../bills/schema';
import {putMoneyPhoto} from '../money-photos/store';
import {addLocalDays, localDate} from '../local-date';

/**
 * Session AK (BUILD list 2 #6, #7, #9, #10, #11, #17, #18, #19) in a page: recent categories first, Select with its
 * running total, a sum in the amount field, the spending map with its table, the review cards by keyboard with Undo,
 * the cash forecast (empty start and with records), receipt photos (an orphan) and the net-worth share with amounts hidden.
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const until = async (text: string) => { for (let i = 0; i < 150 && !element.textContent?.includes(text); i++) await act(async () => { await new Promise(r => setTimeout(r, 10)); }); expect(element.textContent).toContain(text); };
const buttons = () => [...element.querySelectorAll('button')];
const click = async (name: string | RegExp) => { const b = buttons().find(x => typeof name === 'string' ? x.textContent === name : name.test(x.textContent ?? '')); expect(b, String(name)).toBeDefined(); await act(async () => { b!.click(); }); await settle(); };
const read = <T>(key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as T;
const setValue = async (input: HTMLInputElement, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); }); await settle(); };
const key = async (target: Element, k: string) => { await act(async () => { target.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true})); }); await settle(); };
const today = localDate();
const entry = (id: string, offset: number, amount: string, category: string, kind: 'expense' | 'income' = 'expense', note?: string, currency = 'EUR'): MoneyEntry => { const date = addLocalDays(today, offset); return {id, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})}; };
const seed = (entries: MoneyEntry[]) => localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries}));
const WithLog = ({C}: {C: ComponentType<{log: ReturnType<typeof useDeviceRecord<typeof MONEY_LOG extends {empty: () => infer T} ? T : never>>}>}) => h(C, {log: useDeviceRecord(MONEY_LOG)});
const AT = '2026-01-01T10:00:00.000Z';
const account = (id: string, currency: string, value: string, date: string) => ({id, kind: 'cash', name: `Cash ${currency}`, currency, snapshots: [{id: id.replace(/.$/, 'f'), date, value, decimals: 2}], payments: [], createdAt: AT, updatedAt: AT});

describe('Spending (BUILD list 2 #6, #7, #18, #19)', () => {
  test('recent categories first; Select shows the running total; a sum in Amount is saved as its result', async () => {
    seed([entry('a', 0, '10.00', 'Transport'), entry('b', -1, '5.25', 'Transport'), entry('c', -2, '2.00', 'Gifts'), entry('d', 0, '100.00', 'Salary', 'income')]);
    await act(async () => root.render(h(SpendingSection)));
    await until('No weekly budget');
    const chips = [...element.querySelectorAll<HTMLInputElement>('.spending-cats input[type=radio]')].map(r => r.parentElement!.textContent);
    expect(chips.slice(0, 2)).toEqual(['Transport', 'Gifts']);
    expect(element.textContent).toContain('Your most used lately come first.');
    // Select: two expenses and the income.
    await click('Select');
    const boxes = [...element.querySelectorAll<HTMLInputElement>('.money-select-check input')];
    expect(boxes).toHaveLength(4);
    for (const b of boxes.filter(x => /Transport|Salary/.test(x.getAttribute('aria-label') ?? ''))) await act(async () => { b.click(); });
    await settle();
    expect(element.querySelector('.money-select-total')?.textContent).toBe('3 selected · +€84.75 (2 expenses, 1 income)');
    await click('Select');
    expect(buttons().find(b => b.textContent === 'Select')?.getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelector('.money-select-total')).toBeNull();
    // A sum.
    const amount = [...element.querySelectorAll<HTMLInputElement>('input')].find(i => i.placeholder === '12.50')!;
    await setValue(amount, '12,50+3,20');
    expect(element.querySelector('.money-calc-hint')?.textContent).toContain('= 15.70');
    await setValue(amount, '5/0');
    expect(element.querySelector('.money-calc-hint')?.textContent).toBe('A number cannot be divided by zero.');
    await click('Save');
    expect(element.querySelector('[role=alert]')?.textContent).toBe('A number cannot be divided by zero.');
    await setValue(amount, '3*4,99');
    await click('Save');
    expect(read<{entries: MoneyEntry[]}>(MONEY_LOG_KEY).entries.at(-1)).toMatchObject({amount: '14.97', kind: 'expense'});
  });

  test('the month as a map: a table always lists every category; a category shows its entries', async () => {
    seed([entry('a', 0, '30.00', 'Groceries', 'expense', 'Market'), entry('b', 0, '10.00', 'Fun', 'expense', 'Cinema'), entry('c', 0, '4.00', 'Fun', 'expense', 'Arcade', 'USD')]);
    await act(async () => root.render(h(SpendingSection)));
    await until('This month by category');
    await click('Map');
    await until('EUR spending this month by category');
    const table = element.querySelector('.spending-map-table')!;
    expect([...table.querySelectorAll('tbody th')].map(t => t.textContent)).toEqual(['Groceries', 'Fun']);
    expect(element.textContent).toContain('USD spending this month by category');
    expect(element.querySelectorAll('.spending-map-cell[role=button]').length).toBe(3);
    await click('Fun');
    expect(element.querySelector('.spending-map-entries')?.textContent).toContain('Cinema');
    expect(element.querySelector('.spending-map-entries')?.textContent).not.toContain('Arcade');
    await click('List');
    expect(element.querySelector('.spending-map')).toBeNull();
  });

  test('a receipt draft fills the form and saves nothing by itself', async () => {
    seed([]);
    await act(async () => root.render(h(SpendingSection)));
    await until('Category');
    await act(async () => { window.dispatchEvent(new CustomEvent(MONEY_DRAFT_EVENT, {detail: {amount: '23.40', payee: 'Corner Bakery', date: today}})); });
    await settle();
    expect([...element.querySelectorAll<HTMLInputElement>('input')].find(i => i.placeholder === '12.50')!.value).toBe('23.40');
    expect(element.textContent).toContain('Check it, then Save.');
    expect(read<{entries: MoneyEntry[]}>(MONEY_LOG_KEY).entries).toHaveLength(0);
  });
});

describe('Review cards (BUILD list 2 #9)', () => {
  test('one at a time by keyboard: A accepts, Z undoes, S skips (kept), the order is the inbox\'s', async () => {
    seed([entry('old', -3, '9.99', 'Other', 'expense', 'Gym'), entry('new', -1, '3.50', 'Other', 'expense', 'Bakery')]);
    localStorage.setItem(MONEY_REVIEW_KEY, JSON.stringify({version: 1, ids: ['old', 'new']}));
    await act(async () => root.render(h(MoneyTools)));
    await click('To review (2)');
    await until('One at a time');
    await click('One at a time');
    await until('2 to go');
    const card = () => element.querySelector('.review-card')!;
    expect(card().querySelector('.review-card-payee')?.textContent).toBe('Bakery');
    await key(card(), 'a');
    expect(read<{ids: string[]}>(MONEY_REVIEW_KEY).ids).toEqual(['old']);
    expect(card().querySelector('.review-card-payee')?.textContent).toBe('Gym');
    await key(card(), 'z');
    expect(read<{ids: string[]}>(MONEY_REVIEW_KEY).ids.sort()).toEqual(['new', 'old']);
    expect(card().querySelector('.review-card-payee')?.textContent).toBe('Bakery');
    await key(card(), 's');
    expect(card().querySelector('.review-card-payee')?.textContent).toBe('Gym');
    await key(card(), 'a');
    expect(element.textContent).toContain('You skipped 1; it stays in To review.');
    expect(read<{ids: string[]}>(MONEY_REVIEW_KEY).ids).toEqual(['new']);
    // The skipped one again; a capital A works too.
    await click('Go through the skipped ones');
    await key(card(), 'a'.toUpperCase());
    expect(read<{ids: string[]}>(MONEY_REVIEW_KEY).ids).toEqual([]);
  });
  test('a category chip recategorises; Make a rule opens the rules with the payee', async () => {
    seed([entry('x', -1, '3.50', 'Other', 'expense', 'Bakery'), entry('y', -2, '4.00', 'Food & drink')]);
    localStorage.setItem(MONEY_REVIEW_KEY, JSON.stringify({version: 1, ids: ['x']}));
    await act(async () => root.render(h(MoneyTools)));
    await click('To review (1)');
    await until('One at a time');
    await click('One at a time');
    await until('1 to go');
    await click('Food & drink');
    expect(read<{entries: MoneyEntry[]}>(MONEY_LOG_KEY).entries.find(e => e.id === 'x')?.category).toBe('Food & drink');
    await click('Make a rule');
    await until('Rules (0 of');
    expect(element.querySelector('form[aria-label="Add a rule"]')).not.toBeNull();
  });
});

describe('Cash forecast (BUILD list 2 #11)', () => {
  test('a fresh start teaches; with a balance and a bill the lowest point and the promise line show', async () => {
    await act(async () => root.render(h(WithLog, {C: CashForecast as never})));
    await until('This needs at least one cash or savings account with its balance.');
    expect(element.textContent).toContain('A model from your own records, not a promise.');
    await act(async () => root.unmount());
    root = createRoot(element);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({version: 1, items: [account('00000000-0000-4000-8000-000000000001', 'EUR', '50000', addLocalDays(today, -1))]}));
    localStorage.setItem(BILLS_KEY, JSON.stringify({version: 1, bills: [{id: 'b1', title: 'Rent', amount: '400.00', currency: 'EUR', cadence: 'monthly', nextDue: addLocalDays(today, 5), origin: 'manual', createdAt: AT}], dismissed: []}));
    await act(async () => root.render(h(WithLog, {C: CashForecast as never})));
    await until('Lowest around');
    expect(element.textContent).toContain('Lowest around'); expect(element.textContent).toContain('about -€300 (below zero)'); // two rents of 400.00 from 500.00
    expect(element.textContent).toContain('Your everyday spending is not known yet');
    expect(element.querySelector('svg.cash-forecast-chart')?.getAttribute('aria-label')).toBe('Expected EUR cash over the next 60 days');
  });
});

describe('Receipt photos (BUILD list 2 #10)', () => {
  test('a fresh start teaches; each entry offers a photo; a photo of a removed entry is named, not deleted', async () => {
    await act(async () => root.render(h(WithLog, {C: MoneyPhotosPanel as never})));
    await until('No entries yet.');
    await act(async () => root.unmount());
    root = createRoot(element);
    seed([entry('e1', 0, '4.20', 'Food & drink', 'expense', 'Coffee')]);
    await putMoneyPhoto('local', {entryId: 'gone', blob: new Blob([new Uint8Array(4)]), type: 'image/jpeg', bytes: 4, takenAt: AT});
    await act(async () => root.render(h(WithLog, {C: MoneyPhotosPanel as never})));
    await until('1 photo belongs to an entry no longer in your money log');
    expect(buttons().some(b => b.getAttribute('aria-label')?.startsWith('Add a photo to Coffee'))).toBe(true);
    expect(element.textContent).toContain('never uploaded or synced');
  });
});

describe('Net-worth share (BUILD list 2 #17)', () => {
  test('amounts hidden by default; the per cent since last month\'s end; numbers only when ticked', async () => {
    const monthStart = `${today.slice(0, 7)}-01`, lastEnd = addLocalDays(monthStart, -1);
    const a = account('00000000-0000-4000-8000-000000000002', 'EUR', '1000000', lastEnd);
    a.snapshots.push({id: '00000000-0000-4000-8000-00000000000e', date: today, value: '1042000', decimals: 2});
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({version: 1, items: [a]}));
    await act(async () => root.render(h(NetWorthShare, {currencies: ['EUR']})));
    await click('Share a net-worth moment');
    await until('Up 4.2% since');
    const preview = () => element.querySelector('.share-sheet-preview')?.textContent ?? '';
    expect(preview()).not.toMatch(/€|10,420|10,000/);
    const box = [...element.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].find(i => i.parentElement?.textContent?.startsWith('Include numbers'))!;
    await act(async () => { box.click(); });
    await settle();
    expect(preview()).toContain('€10,420.00');
  });
});
