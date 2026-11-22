// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import NeedsWantsView from '../../components/wealth/spending/insights/needs-wants-view';
import {MONEY_LOG_KEY, type MoneyEntry} from '../money-log/schema';
import {MONEY_LOG_BUSINESS_KEY_LITERAL} from '../av2-money-r2-keys';

/**
 * Review b3a #11 (Session AV lane 2, round 3, LEDGER #295): in the business space, needs, wants and saving marks go to
 * the business space's own money log; the personal log is never touched (and the other way round).
 */
const TODAY = '2026-11-14';
const entries: MoneyEntry[] = [{id: 'b1', kind: 'expense', amount: '120.00', currency: 'EUR', category: 'Software', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z'}];
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const mark = async (value: string) => {
  const select = [...element.querySelectorAll('label')].find(l => l.textContent?.startsWith('Software'))!.querySelector('select')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value); select.dispatchEvent(new Event('change', {bubbles: true})); });
  await settle();
};
const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

test('the business space marks its own categories on its own log', async () => {
  await act(async () => root.render(h(NeedsWantsView, {entries, today: TODAY, space: 'business'})));
  await settle();
  await mark('need');
  expect(read(MONEY_LOG_BUSINESS_KEY_LITERAL)?.needWant).toEqual({Software: 'need'});
  expect(read(MONEY_LOG_KEY)).toBeNull();
});
test('the personal space marks the personal log, as before', async () => {
  await act(async () => root.render(h(NeedsWantsView, {entries, today: TODAY})));
  await settle();
  await mark('want');
  expect(read(MONEY_LOG_KEY)?.needWant).toEqual({Software: 'want'});
  expect(read(MONEY_LOG_BUSINESS_KEY_LITERAL)).toBeNull();
});
