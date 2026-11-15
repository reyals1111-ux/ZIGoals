// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import TagsView from '../../components/wealth/spending/insights/tags-view';
import type {MoneyEntry} from '../money-log/schema';
import {MONEY_TAGS_KEY} from './schema';

/** Session AP (feature 2): tag an entry in Wealth → Spending → Tags; filter and totals; a removed entry leaves no orphan. */
const TODAY = '2026-11-14';
const entry = (id: string, date: string, amount: string, category: string, currency = 'EUR'): MoneyEntry => ({id, kind: 'expense', amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, source: 'form'});
const entries = [entry('a', '2026-11-02', '40.00', 'Groceries'), entry('b', '2026-11-03', '12.50', 'Fun'), entry('c', '2026-11-04', '5.00', 'Fun', 'USD')];

let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const button = (name: string) => [...element.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') ?? b.textContent) === name);
const press = async (b: Element | null | undefined) => { expect(b).toBeTruthy(); await act(async () => { (b as HTMLElement).click(); }); await settle(); };
const type = async (input: HTMLInputElement, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); }); };
const submit = async () => { await act(async () => { element.querySelector('form')!.requestSubmit(); }); await settle(); };

test('tag two entries, filter by a tag, totals per currency; a removed entry is never shown', async () => {
  await act(async () => root.render(h(TagsView, {entries, today: TODAY})));
  await settle();
  expect(element.textContent).toContain('No tags yet.');
  await press(button('Tags for Groceries 40.00 EUR on Nov 2, 2026') ?? [...element.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.startsWith('Tags for Groceries')));
  const field = element.querySelector<HTMLInputElement>('form input')!;
  expect(document.activeElement).toBe(field);
  await type(field, 'Holiday, toolongtagtoolongtagtoolong');
  await submit();
  expect(element.querySelector('[role=alert]')?.textContent).toContain('longer than 24 characters');
  expect(localStorage.getItem(MONEY_TAGS_KEY)).toBeNull();
  await type(field, '#Holiday, Work Trip');
  await submit();
  expect(JSON.parse(localStorage.getItem(MONEY_TAGS_KEY)!)).toEqual({version: 1, tags: {a: ['holiday', 'work trip']}});
  expect(element.querySelector('[role=status]')?.textContent).toContain('Tags saved for Groceries');
  for (const id of ['b', 'c']) {
    await press([...element.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.startsWith(`Tags for Fun ${id === 'b' ? '12.50 EUR' : '5.00 USD'}`)));
    await type(element.querySelector<HTMLInputElement>('form input')!, 'holiday');
    await submit();
  }
  const table = element.querySelector('table')!.textContent!;
  expect(table).toContain('holiday · EUR€52.50');
  expect(table).toMatch(/holiday · USD/);
  await press(button('holiday (3)') ?? [...element.querySelectorAll('.money-tags-filter button')].find(b => b.textContent?.startsWith('holiday')));
  expect(element.querySelectorAll('.money-tags-list li')).toHaveLength(3);
  await press([...element.querySelectorAll('.money-tags-filter button')].find(b => b.textContent?.startsWith('work trip')));
  expect(element.querySelectorAll('.money-tags-list li')).toHaveLength(1);
  // The Groceries entry is removed from the money log: its tags stay in the record (Undo) but are shown nowhere.
  await act(async () => root.render(h(TagsView, {entries: entries.slice(1), today: TODAY})));
  await settle();
  expect(element.textContent).not.toContain('work trip');
  expect(element.querySelector('table')!.textContent).toContain('holiday · EUR€12.50');
  expect(JSON.parse(localStorage.getItem(MONEY_TAGS_KEY)!).tags.a).toEqual(['holiday', 'work trip']);
});
