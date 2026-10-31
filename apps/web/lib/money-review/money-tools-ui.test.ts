// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MoneyCsvImport} from '../../components/import/holdings-import';
import MoneyTools from '../../components/wealth/money-tools/money-tools';
import FeeDragPanel from '../../components/wealth/money-tools/fee-drag-panel';
import FiModelPanel from '../../components/wealth/money-tools/fi-model-panel';
import {MONEY_LOG_KEY, emptyMoneyLog, type MoneyEntry} from '../money-log/schema';
import {MONEY_RULES_KEY} from '../money-rules/schema';
import {MONEY_REVIEW_KEY} from './review';
import {ACCOUNTS_KEY} from '../accounts/schema';
import {EMERGENCY_SHEET_KEY} from '../emergency-sheet/schema';
import {addLocalDays, localDate} from '../local-date';

/**
 * Session AK (lane M): the money tools in a page — a rule set by an import and the entries marked for review, the
 * buffer-days tile, To review with ✓, a rule made from an entry, and the emergency sheet refusing to print a key.
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
/** Waits for a lazily loaded panel. */
const until = async (text: string) => { for (let i = 0; i < 100 && !element.textContent?.includes(text); i++) await act(async () => { await new Promise(r => setTimeout(r, 10)); }); expect(element.textContent).toContain(text); };
const button = (name: string | RegExp) => [...element.querySelectorAll('button')].find(b => typeof name === 'string' ? b.textContent === name : name.test(b.textContent ?? ''));
const click = async (name: string | RegExp) => { const b = button(name); expect(b, String(name)).toBeDefined(); await act(async () => { b!.click(); }); await settle(); };
const read = <T>(key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as T;
const setValue = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); });
  await settle();
};
const today = localDate();
const entry = (id: string, offset: number, amount: string, note: string): MoneyEntry => { const date = addLocalDays(today, offset); return {id, kind: 'expense', amount, currency: 'EUR', category: 'Other', note, date, createdAt: `${date}T10:00:00.000Z`}; };

describe('Money tools (Session AK lane M)', () => {
  test('a CSV import runs the rules, shows the rule in the preview and marks the new entries for review', async () => {
    localStorage.setItem(MONEY_RULES_KEY, JSON.stringify({version: 1, rules: [{id: 'r1', field: 'payee', op: 'contains', text: 'corner grocery', direction: 'out', category: 'Groceries', renameTo: 'Corner'}]}));
    await act(async () => root.render(h(MoneyCsvImport, {onClose: () => {}})));
    await settle();
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {value: [new File([['Date,Payee,Amount', '2026-10-01,Corner Grocery,-42.10', '2026-10-02,Bakery,-3.50'].join('\n')], 'bank.csv', {type: 'text/csv'})], configurable: true});
    await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); });
    await settle();
    await click('Next');
    expect(element.textContent).toContain('Rule: category Groceries, renamed “Corner”');
    await click('Next');
    expect(element.textContent).toContain('then your rules run');
    await click('Add 2 to my money log');
    const log = read<{entries: MoneyEntry[]}>(MONEY_LOG_KEY);
    expect(log.entries.map(e => [e.category, e.note])).toEqual([['Groceries', 'Corner'], ['Other', 'Bakery']]);
    expect(read<{ids: string[]}>(MONEY_REVIEW_KEY).ids).toEqual(log.entries.map(e => e.id));
    expect(element.textContent).toContain('Money tools → To review');
  });

  test('buffer days, To review with ✓, and a rule made from an entry', async () => {
    const entries = Array.from({length: 20}, (_, i) => entry(`e${i}`, -i, '10.00', `Shop ${i}`));
    localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries}));
    localStorage.setItem(MONEY_REVIEW_KEY, JSON.stringify({version: 1, ids: ['e0', 'e1', 'gone']}));
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({version: 1, items: [{id: '00000000-0000-4000-8000-000000000001', kind: 'cash', name: 'Current', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-000000000002', date: addLocalDays(today, -1), value: '30000', decimals: 2}], payments: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'}]}));
    await act(async () => root.render(h(MoneyTools, {})));
    await settle();
    expect(element.textContent).toContain('Your cash covers 30 days of your usual spending.');
    await click('To review (2)');
    await until('They already count in your totals');
    await click(/^✓ Looks right$/);
    expect(read<{ids: string[]}>(MONEY_REVIEW_KEY).ids).toEqual(['e1']);
    await click('Make a rule');
    await until('A rule from this entry is filled in below');
    expect(element.querySelector<HTMLInputElement>('input[placeholder="corner grocery"]')!.value).toBe('Shop 1');
    await click('Save rule');
    expect(read<{rules: {text: string; category: string}[]}>(MONEY_RULES_KEY).rules).toMatchObject([{text: 'Shop 1', category: 'Other'}]);
  });

  test('without a cash account the tile teaches instead of showing zero', async () => {
    await act(async () => root.render(h(MoneyTools, {})));
    await settle();
    expect(element.textContent).toContain('This cannot be worked out yet');
    expect(element.textContent).not.toMatch(/covers 0 days/);
  });

  test('the emergency sheet refuses to print a key and says where', async () => {
    const print = vi.fn(); vi.stubGlobal('print', print);
    await act(async () => root.render(h(MoneyTools, {})));
    await settle();
    await click('If something happens to me');
    await until('Never write passwords');
    await setValue(element.querySelector<HTMLTextAreaElement>('textarea')!, 'ab'.repeat(32));
    expect(element.textContent).toContain('The note looks like a private key (64 hexadecimal characters).');
    await click('Print or save as PDF');
    expect(element.textContent).toContain('Not printed.');
    expect(print).not.toHaveBeenCalled();
    await click('Save notes');
    expect(localStorage.getItem(EMERGENCY_SHEET_KEY)).toBeNull();
  });

  test('a clean sheet prints through the browser\'s own dialog, from a print-only copy', async () => {
    const print = vi.fn(); vi.stubGlobal('print', print);
    await act(async () => root.render(h(MoneyTools, {})));
    await settle();
    await click('If something happens to me');
    await until('Never write passwords');
    await setValue(element.querySelector<HTMLTextAreaElement>('textarea')!, 'Call Anna at the bank first.');
    await click('Print or save as PDF');
    for (let i = 0; i < 20 && !print.mock.calls.length; i++) await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.emergency-print-root')!.textContent).toContain('Call Anna at the bank first.');
    expect(document.documentElement.classList.contains('emergency-printing')).toBe(true);
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    await settle();
    expect(document.querySelector('.emergency-print-root')).toBeNull();
    expect(document.documentElement.classList.contains('emergency-printing')).toBe(false);
  });

  test('split an entry: the parts must add up, then totals read them', async () => {
    localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries: [entry('s1', 0, '10.00', 'Supermarket')]}));
    await act(async () => root.render(h(MoneyTools, {})));
    await settle();
    await click('Split an entry');
    await until('Entry from the last 90 days');
    const select = element.querySelector<HTMLSelectElement>('select')!;
    await act(async () => { select.value = 's1'; select.dispatchEvent(new Event('change', {bubbles: true})); });
    await settle();
    expect(element.textContent).toContain('The parts add up exactly.');
    const amounts = [...element.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')];
    await setValue(amounts[0]!, '6.00');
    expect(element.textContent).toContain('too much');
    await click('Save the split');
    expect(element.textContent).toContain('The parts add up to 11.00; the entry is 10.00.');
    await setValue(amounts[1]!, '4.00');
    await click('Save the split');
    expect(read<{entries: MoneyEntry[]}>(MONEY_LOG_KEY).entries[0]!.parts).toEqual([{amount: '6.00', category: 'Other'}, {amount: '4.00'}]);
  });

  test('the calculator tools render their figures and the model line', async () => {
    await act(async () => root.render(h('div', null, h(FeeDragPanel), h(FiModelPanel))));
    await settle();
    expect(element.textContent).toMatch(/a difference of €[\d,.]+/);
    expect(element.textContent).toContain('A model, not advice');
    expect(element.textContent).toMatch(/Target: €750,000\.00/);
    expect(element.querySelectorAll('svg[role="img"]')).toHaveLength(2);
    expect(localStorage.getItem('zigoals:fi-model:v1')).toBeNull();
    await click('Keep these inputs on this device');
    expect(read<{inputs: {yearlySpend: number}}>('zigoals:fi-model:v1').inputs.yearlySpend).toBe(30000);
  });
});
