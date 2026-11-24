// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MoneyCsvImport} from '../../components/import/holdings-import';
import {MONEY_LOG_KEY, emptyMoneyLog, type MoneyEntry, type MoneyLog} from '../money-log/schema';
import {applyReimport, changedCsvRows, putBackEntries, similarPayee} from './reimport';
import type {BankTransaction} from './types';

/**
 * Session AV lane 2 (rest, LEDGER #142; Monarch's re-import): a CSV re-import recognises a row the bank changed — the
 * same date, an amount within the tolerance, a similar payee — and updates that entry instead of adding a second one,
 * shown in the preview, with Undo. Fictional records.
 */
const entry = (id: string, amount: string, note: string, date = '2026-10-01', more: Partial<MoneyEntry> = {}): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Food & drink', note, date, createdAt: `${date}T10:00:00.000Z`, ...more});
const row = (index: number, amount: string, payee: string, date = '2026-10-01', more: Partial<BankTransaction> = {}): BankTransaction => ({index, date, direction: 'out', amount, currency: 'EUR', payee, description: '', reference: '', ...more} as BankTransaction);
const log = (entries: MoneyEntry[]): MoneyLog => ({...emptyMoneyLog(), entries});

describe('which rows changed at the bank', () => {
  test('a tip added, a payee renamed, a settled amount: recognised; too far, another day, another payee, a split or a transfer: not', () => {
    const l = log([entry('a', '42.10', 'Fictional Bistro'), entry('b', '3.50', 'Bakery Fictional'), entry('c', '60.00', 'Fictional Fuel'), entry('s', '20.00', 'Fictional Shop', '2026-10-01', {parts: [{amount: '10.00', category: 'Food & drink'}, {amount: '10.00', category: 'Shopping'}]} as Partial<MoneyEntry>), entry('t', '15.00', 'Fictional Card', '2026-10-01', {transfer: 'x'})]);
    const rows = [row(1, '48.50', 'Fictional Bistro'), row(2, '3.50', 'BAKERY FICTIONAL AMSTERDAM'), row(3, '90.00', 'Fictional Fuel'), row(4, '3.60', 'Bakery Fictional', '2026-10-02'), row(5, '21.00', 'Fictional Shop'), row(6, '15.50', 'Fictional Card'), row(7, '42.00', 'Other Place')];
    const c = changedCsvRows(rows, l);
    expect(c.map(x => [x.t.index, x.entry.id, x.amount ?? null, x.note ?? null])).toEqual([[1, 'a', '48.50', null], [2, 'b', null, 'BAKERY FICTIONAL AMSTERDAM']]);
    expect([similarPayee('Albert Heijn 1234', 'ALBERT HEIJN'), similarPayee('Cafe', 'Restaurant'), similarPayee('', 'x')]).toEqual([true, false, false]);
  });
  test('an entry matched exactly by another row of the file is never taken; each entry once, by the closest amount', () => {
    const l = log([entry('a', '10.00', 'Fictional Cafe'), entry('b', '11.00', 'Fictional Cafe')]);
    expect(changedCsvRows([row(1, '10.00', 'Fictional Cafe'), row(2, '11.40', 'Fictional Cafe'), row(3, '11.20', 'Fictional Cafe')], l).map(x => [x.t.index, x.entry.id])).toEqual([[3, 'b']]);
  });
  test('updated in place with history; Undo puts the entries back exactly', () => {
    const l = log([entry('a', '42.10', 'Fictional Bistro')]), c = changedCsvRows([row(1, '48.50', 'Fictional Bistro')], l);
    const after = applyReimport(l, c, '2026-11-22T10:00:00.000Z');
    expect(after.entries).toHaveLength(1);
    expect(after.entries[0]).toMatchObject({id: 'a', amount: '48.50'});
    expect(after.entries[0]!.history).toEqual([expect.objectContaining({by: 'import', field: 'amount', from: '42.10', to: '48.50'})]);
    expect(putBackEntries(after, l.entries)).toEqual(l);
  });
});

const CSV = ['Date,Payee,Amount', '2026-10-01,Fictional Bistro,-48.50', '2026-10-03,Fictional Market,-12.00'].join('\n');
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const click = async (name: string) => { const b = [...element.querySelectorAll('button')].find(x => x.textContent === name); expect(b, name).toBeDefined(); await act(async () => { b!.click(); }); await settle(); };
const stored = () => JSON.parse(localStorage.getItem(MONEY_LOG_KEY)!) as MoneyLog;

test('the import: the changed row is shown and updates its entry; the new row is added; Undo puts both back', async () => {
  localStorage.setItem(MONEY_LOG_KEY, JSON.stringify(log([entry('e1', '42.10', 'Fictional Bistro')])));
  await act(async () => root.render(h(MoneyCsvImport, {onClose: () => undefined})));
  await settle();
  const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', {value: [new File([CSV], 'bank.csv', {type: 'text/csv'})], configurable: true});
  await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); });
  await settle();
  await click('Next');
  expect(element.querySelector('.import-summary')!.textContent).toBe('2 rows read · 1 ticked · 1 to update · 0 rows refused');
  expect(element.querySelector('[data-import-changed]')!.textContent).toContain('1 row looks like an entry already in your log that changed at your bank');
  expect(element.textContent).toContain('Changed at your bank (was €42.10): updates that entry');
  await click('Next');
  expect(element.textContent).toContain('1 entry changed at your bank is updated.');
  await click('Add 1 to my money log, update 1');
  expect(element.querySelector('[role="status"]')!.textContent).toBe('1 entry added to your money log, 1 updated.');
  expect(stored().entries.map(e => [e.id === 'e1' ? 'e1' : 'new', e.amount])).toEqual([['e1', '48.50'], ['new', '12.00']]);
  await click('Undo this import');
  expect(stored().entries.map(e => [e.id, e.amount, e.history ?? null])).toEqual([['e1', '42.10', null]]);
  expect(element.querySelector('[role="status"]')!.textContent).toBe('The import was undone: the entries it added are removed and the ones it updated are as they were.');
});
