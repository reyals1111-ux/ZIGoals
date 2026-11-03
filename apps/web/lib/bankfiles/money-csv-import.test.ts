// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MoneyCsvImport} from '../../components/import/holdings-import';
import {importTargetOf} from '../../components/import/csv-import-steps';
import {HOLDINGS_FIELDS, TRANSACTION_FIELDS} from '../csv/mapping';
import {MONEY_FIELDS} from '../csv/templates/presets';
import {MONEY_LOG_KEY, emptyMoneyLog} from '../money-log/schema';

/**
 * Session AK (lane WW, 7.1): a CSV into the money log through the shared four steps — the columns guessed, a preview
 * with a repeat and a row already in the log unticked and a refused row with its reason, nothing written before the
 * person confirms, and Undo removing exactly what was added.
 */
const CSV = ['Date,Payee,Amount,Note', '2026-10-01,Corner Grocery,-42.10,Weekly shop', '2026-10-01,Corner Grocery,-42.10,Weekly shop', '2026-10-02,Bakery,-3.50,', 'not a date,Cafe,-2.00,', '2026-10-25,Example Employer,2400.00,Salary'].join('\n');
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const button = (name: string) => [...element.querySelectorAll('button')].find(b => b.textContent === name)!;
const click = async (name: string) => { const b = button(name); expect(b, name).toBeDefined(); await act(async () => { b.click(); }); await settle(); };
const log = () => JSON.parse(localStorage.getItem(MONEY_LOG_KEY) ?? JSON.stringify(emptyMoneyLog())) as {entries: {date: string; kind: string; amount: string; note?: string}[]};

test('the import target follows the fields: trades, holdings, the money log, none for meals', () => {
  expect(importTargetOf(TRANSACTION_FIELDS)).toBe('transactions');
  expect(importTargetOf(HOLDINGS_FIELDS)).toBe('holdings');
  expect(importTargetOf(MONEY_FIELDS)).toBe('money');
  expect(importTargetOf([{id: 'date', label: 'Date', synonyms: []}, {id: 'calories', label: 'Calories', synonyms: []}])).toBeUndefined();
});

describe('a CSV into the money log', () => {
  test('preview, repeats unticked, refused rows, confirm, then Undo', async () => {
    localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries: [{id: 'e1', kind: 'expense', amount: '3.50', currency: 'EUR', category: 'Food & drink', note: 'Bakery', date: '2026-10-02', createdAt: '2026-10-02T10:00:00.000Z'}]}));
    let closed = 0;
    await act(async () => root.render(h(MoneyCsvImport, {onClose: () => { closed++; }})));
    await settle();
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([CSV], 'bank.csv', {type: 'text/csv'});
    Object.defineProperty(input, 'files', {value: [file], configurable: true});
    await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); });
    await settle();
    expect(element.textContent).toContain('Step 2 of 4');
    expect(element.textContent).toContain('Currency of this file');
    await click('Next');
    expect(element.textContent).toContain('Step 3 of 4');
    // Five rows read (the bad date is refused): the repeat and the bakery row already in the log start unticked.
    expect(element.querySelector('.import-summary')!.textContent).toBe('4 rows read · 2 ticked · 1 row refused');
    expect(element.textContent).toContain('Possible repeat in this file');
    expect(element.textContent).toContain('Already in your log');
    expect(element.textContent).toContain('Row 4: The date could not be read in the chosen format.');
    expect(log().entries).toHaveLength(1);
    await click('Next');
    expect(element.textContent).toContain('2 entries will be added to your money log: 1 spent, 1 received.');
    await click('Add 2 to my money log');
    expect(element.querySelector('[role="status"]')!.textContent).toBe('2 entries added to your money log.');
    expect(log().entries.map(e => [e.date, e.kind, e.amount])).toEqual([['2026-10-02', 'expense', '3.50'], ['2026-10-01', 'expense', '42.10'], ['2026-10-25', 'income', '2400.00']]);
    await click('Undo this import');
    expect(log().entries.map(e => e.amount)).toEqual(['3.50']);
    expect(element.querySelector('[role="status"]')!.textContent).toContain('undone');
    await click('Done');
    expect(closed).toBe(1);
  });
});
