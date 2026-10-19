// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {toBech32} from '@cosmjs/encoding';
import {GoalProvider} from '../components/goal-provider';
import {WalletCard} from '../components/wallet/wallet-card';
import {LINKED_WALLETS_KEY} from './linked-wallets-key';

// Session AE (Part 6, ADR-027): Today's wallet card with its chooser and display currency (jsdom). Fictional data.
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()}), usePathname: () => '/app'}));
vi.mock('./wallet', () => ({connectKeplr: vi.fn(), quoteExecute: vi.fn(), executeQuote: vi.fn(), readGoals: vi.fn(async () => []), readBalance: vi.fn(async () => '0'), CONTRACT_ADDRESS: '', reconcileTransactions: vi.fn(async () => ({records: [], warnings: []}))}));
const LINKED = toBech32('zig', new Uint8Array(20).fill(5));
let root: Root, container: HTMLDivElement, requests: string[];
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); };
const card = () => container.querySelector<HTMLElement>('.account-panel')!;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); sessionStorage.clear(); requests = [];
  // The market service answers 503, as the spec's /api/** fixture does: no price, so nothing may be estimated.
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => { requests.push(`${init?.method ?? 'GET'} ${url} ${String(init?.body ?? '')}`); return new Response(JSON.stringify({error: 'LOCAL_FIXTURE_ONLY'}), {status: 503, headers: {'content-type': 'application/json'}}); }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

test('the app\'s simulated wallet in ZIG first, with no request; practice money is never shown in another currency (unavailable, with why, still no request)', async () => {
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletCard, {plainWords: true}))));
  await vi.waitFor(async () => { await act(async () => {}); expect(card().querySelector('.wallet-card-currency')).not.toBeNull(); });
  expect(card().querySelector('.account-value')!.textContent).toBe('1,000 ZIG');
  expect(card().textContent).toContain('Simulated balance · this browser');
  expect(card().querySelector('.pill')!.textContent).toBe('Demo records');
  const buttons = [...card().querySelectorAll<HTMLButtonElement>('.wallet-card-currency button')];
  expect(buttons.map(b => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([['ZIG', 'true'], ['USD', 'false'], ['EUR', 'false'], ['BTC', 'false']]);
  expect(card().querySelector('select')).toBeNull();
  await settle(); expect(requests).toEqual([]);
  await act(async () => { buttons[1]!.click(); }); await settle(); await settle();
  // ADR-027: practice money has no market value — no price is asked for and no amount is shown.
  expect(requests).toEqual([]);
  await vi.waitFor(async () => { await act(async () => {}); expect(card().querySelector('.account-value')!.textContent).toBe('USD unavailable'); expect(card().textContent).toContain('Practice money has no market value'); });
  expect(card().textContent).not.toMatch(/\$0|0\.00/);
  expect(JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY)!)).toEqual({version: 1, display: 'USD'});
});

test('with a linked wallet, the chooser shows it read-only: the address shortened (whole in its title), no balance, no request', async () => {
  localStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'cosmostation', label: 'Cosmostation', address: LINKED, addedAt: '2026-10-17T10:00:00.000Z'}]}));
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletCard, {plainWords: true}))));
  const select = await vi.waitFor(async () => { await act(async () => {}); const s = card().querySelector('select'); expect(s).not.toBeNull(); return s!; });
  expect([...select.options].map(o => o.textContent)).toEqual(['This app’s wallet (Demo records)', `Linked · Cosmostation · ${LINKED.slice(0, 8)}…${LINKED.slice(-4)}`]);
  await act(async () => { select.value = 'w1'; select.dispatchEvent(new Event('change', {bubbles: true})); }); await settle();
  const value = card().querySelector('.account-value')!;
  expect(value.textContent).toBe(`${LINKED.slice(0, 8)}…${LINKED.slice(-4)}`); expect(value.getAttribute('title')).toBe(LINKED);
  // Assertion changed (Session AF L2b, Part 3; equal strength): the card still reads nothing (requests stay empty below) and
  // now names where the balances are, with the link.
  expect(card().textContent).toContain('Its balances, read-only, are in Wealth → What you have.');
  expect(card().querySelector('a[href="/app/wealth#holdings"]')?.textContent).toBe('Wealth → What you have');
  expect(card().querySelector('.pill')!.textContent).toBe('Read-only');
  expect(card().querySelector('.wallet-card-currency')).toBeNull();
  expect(JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY)!).selected).toBe('w1');
  expect(requests).toEqual([]);
});
