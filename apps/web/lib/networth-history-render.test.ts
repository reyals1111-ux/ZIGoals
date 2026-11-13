// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {NetworthHistory} from '../components/wealth/networth-history';
import {NETWORTH_HISTORY_KEY, networthHistorySchema} from './networth-history';
import {showcaseNetworthHistory} from './networth-history-showcase';
import {SHOWCASE_MARKER, getAppStorage} from './showcase-storage';
import {localDate} from './local-date';
import type {Accounts} from './accounts/schema';

/** Session AO (backlog #11): opening Wealth records today's snapshot in the person's own storage, never in the Showcase. */
let root: Root, element: HTMLDivElement;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); sessionStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });
const accounts = {data: {version: 1, items: []} as unknown as Accounts, loaded: true, unreadable: false};
const rows = [{position: {providerId: 'Cash', sourceType: 'MANUAL', network: 'manual', account: 'me'}, currency: 'USD', value: 12_345n, valuedAt: '2026-11-13T08:00:00.000Z'}];
const open = async (showcase: boolean) => { await act(async () => root.render(createElement(NetworthHistory, {rows, accounts, quotes: [], now: Date.now(), ready: true, showcase}))); await act(async () => { await Promise.resolve(); }); };

test('opening Wealth records today once, in the person\'s own storage, and shows "Recorded since"', async () => {
  await open(false);
  const stored = networthHistorySchema.parse(JSON.parse(localStorage.getItem(NETWORTH_HISTORY_KEY)!));
  expect(stored.days.map(d => d.day)).toEqual([localDate()]);
  expect(stored.days[0]!.sources).toEqual([{source: 'wealth', currency: 'USD', value: '123.45', asOf: '2026-11-13T08:00:00.000Z'}]);
  expect(element.textContent).toContain('Recorded since');
  expect(element.textContent).toContain('Wealth holdings · USD');
  const raw = localStorage.getItem(NETWORTH_HISTORY_KEY);
  await open(false);
  expect(localStorage.getItem(NETWORTH_HISTORY_KEY)).toBe(raw);
});

test('the Showcase never writes the real key and its labelled example stays as it was', async () => {
  sessionStorage.setItem(SHOWCASE_MARKER, JSON.stringify({version: 1, generation: 'test-1', day: '2026-11-13'}));
  const example = JSON.stringify(showcaseNetworthHistory('2026-11-13'));
  getAppStorage().setItem(NETWORTH_HISTORY_KEY, example);
  await open(true);
  expect(localStorage.getItem(NETWORTH_HISTORY_KEY)).toBeNull();
  expect(getAppStorage().getItem(NETWORTH_HISTORY_KEY)).toBe(example);
  expect(element.textContent).toContain('Showcase');
  expect(element.textContent).toContain('No value: SOL (Showcase long-term)');
  expect(element.textContent).toContain('not opened, shown as gaps');
});
