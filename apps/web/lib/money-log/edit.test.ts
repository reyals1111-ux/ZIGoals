// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import SpendingSection from '../../components/wealth/spending/spending-section';
import {AMOUNT_HINT, SPLIT_AMOUNT_PROBLEM, checkMoneyEdit, checkMoneyForm, replaceEntry} from './form';
import {MONEY_LOG_KEY, emptyMoneyLog, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';

/** PR-052: Edit for a money-log entry, through the same check as logging, saved in place (the same id). */
const TODAY = '2026-10-29';
const base: MoneyEntry = {id: 'e1', kind: 'expense', amount: '4.20', currency: 'EUR', category: 'Food & drink', note: 'Coffee', date: '2026-10-28', createdAt: '2026-10-28T10:00:00.000Z', source: 'form'};

describe('the money form check (PR-052)', () => {
  test('a new entry and an edit say the same words for the same mistake', () => {
    for (const amount of ['', '0', 'abc', '1.234']) {
      const form = checkMoneyForm({amount, date: '2026-10-28', today: TODAY}), edit = checkMoneyEdit(base, {amount, category: 'Fun', note: '', date: '2026-10-28'}, TODAY);
      expect(form.ok).toBe(false); expect(edit).toEqual(form);
    }
    expect(checkMoneyForm({amount: '', date: '2026-10-28', today: TODAY})).toEqual({ok: false, problem: AMOUNT_HINT});
    const future = checkMoneyForm({amount: '5', date: '2026-10-30', today: TODAY});
    expect(future).toEqual({ok: false, problem: 'Choose today or an earlier day.'});
    expect(checkMoneyEdit(base, {amount: '5', category: 'Fun', note: '', date: '2026-10-30'}, TODAY)).toEqual(future);
    expect(checkMoneyForm({amount: '12.5 + 3', date: TODAY, today: TODAY})).toEqual({ok: true, amount: '15.50'});
  });
  test('an edit keeps the id, kind, currency, source and creation time; an empty note goes', () => {
    const out = checkMoneyEdit(base, {amount: '6', category: ' Transport ', note: '  ', date: '2026-10-27'}, TODAY);
    expect(out).toEqual({ok: true, entry: {id: 'e1', kind: 'expense', amount: '6.00', currency: 'EUR', category: 'Transport', date: '2026-10-27', createdAt: base.createdAt, source: 'form'}});
  });
  test('a split entry keeps its amount; a new amount is refused in words', () => {
    const split = {...base, parts: [{amount: '2.20', category: 'Fun'}, {amount: '2.00'}]};
    expect(checkMoneyEdit(split, {amount: '5', category: 'Fun', note: '', date: base.date}, TODAY)).toEqual({ok: false, problem: SPLIT_AMOUNT_PROBLEM});
    const kept = checkMoneyEdit(split, {amount: '4.2', category: 'Fun', note: 'x', date: base.date}, TODAY);
    expect(kept.ok && kept.entry).toMatchObject({amount: '4.20', category: 'Fun', note: 'x', parts: split.parts});
  });
  test('replaceEntry puts it in its own place and keeps the log valid', () => {
    const log: MoneyLog = {...emptyMoneyLog(), entries: [{...base, id: 'a'}, base, {...base, id: 'b'}]};
    const edited = {...base, amount: '9.00'};
    const next = replaceEntry(log, edited);
    expect(next.entries.map(e => [e.id, e.amount])).toEqual([['a', '4.20'], ['e1', '9.00'], ['b', '4.20']]);
    expect(moneyLogSchema.safeParse(next).success).toBe(true);
    expect(replaceEntry(log, {...base, id: 'gone'})).toBe(log);
  });
});

let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
vi.useFakeTimers({toFake: ['Date'], now: new Date(`${TODAY}T12:00:00`)});
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const until = async (text: string) => { for (let i = 0; i < 150 && !element.textContent?.includes(text); i++) await act(async () => { await new Promise(r => setTimeout(r, 10)); }); expect(element.textContent).toContain(text); };
const press = async (b: Element | null | undefined) => { expect(b).toBeTruthy(); await act(async () => { (b as HTMLElement).click(); }); await settle(); };
const byText = (text: string) => [...element.querySelectorAll('button')].find(b => b.textContent === text);
const setValue = async (input: HTMLInputElement, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); }); await settle(); };

test('Edit on an entry: the same field error as logging, then saved in place with "Saved."', async () => {
  localStorage.setItem(MONEY_LOG_KEY, JSON.stringify({...emptyMoneyLog(), entries: [base]}));
  await act(async () => root.render(h(SpendingSection)));
  await until('This week');
  await press(element.querySelector('button[aria-label="Edit Food & drink 4.20 EUR on 2026-10-28"]'));
  const form = element.querySelector('form.spending-form')!;
  expect(form.getAttribute('aria-label')).toBe('Edit Food & drink 4.20 EUR on 2026-10-28');
  const amount = form.querySelector<HTMLInputElement>('input[inputmode=decimal]')!;
  expect(amount.value).toBe('4.20');
  await setValue(amount, '0');
  await press(byText('Save changes'));
  const same = checkMoneyForm({amount: '0', date: base.date, today: TODAY});
  expect(same.ok).toBe(false);
  expect(element.querySelector('[role=alert]')?.textContent).toBe(same.ok ? '' : same.problem);
  await setValue(amount, '5.10');
  await setValue(form.querySelector<HTMLInputElement>('input[maxlength="200"]')!, 'Tea');
  await press(byText('Save changes'));
  expect(element.querySelector('.spending-status')?.textContent).toBe('Saved.');
  const saved = JSON.parse(localStorage.getItem(MONEY_LOG_KEY)!) as MoneyLog;
  expect(saved.entries).toHaveLength(1);
  expect(saved.entries[0]).toMatchObject({id: 'e1', amount: '5.10', note: 'Tea', category: 'Food & drink', createdAt: base.createdAt});
});
