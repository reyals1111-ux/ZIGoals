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

// Assertion changed (Session AH TR7, owner amendment 6; stronger): the USD/EUR/BTC buttons could only ever read
// "unavailable" for practice money, so they are gone. The card shows ZIG, says why, asks for no price, and an older stored
// display choice neither changes what shows nor is lost from the record.
// Session AK X1 (RELEASE_REVIEW R2; deliberate): the untouched practice ledger's 1,000 ZIG is not the person's money, so
// outside the Showcase the figure shows once they have a practice goal of their own (seeded here: one goal, no deposit),
// and the default mode reads "On this device" (no demo was opened). The test below covers the untouched ledger.
const CREATED = '2026-10-17T10:00:00.000Z';
const PRACTICE_LEDGER = {schemaVersion: 1, balance: '1000000000000000000000', nextId: '2', goals: [{id: '1', owner: 'local-demo-user', base_denom: 'azig', strategy_id: 'idle', created_at: CREATED, total_deposited: '0', total_withdrawn: '0', position_units: '0', status: 'active', metadata_commitment: null}], activity: [{action: 'Goal created', goalId: '1', amount: '0', timestamp: CREATED, local: true}]};
test('the app\'s simulated wallet shows ZIG only, says why other currencies are not shown, and asks for no price', async () => {
  localStorage.setItem('zigoals:local-ledger:v1', JSON.stringify(PRACTICE_LEDGER));
  localStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify({version: 1, display: 'USD'}));
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletCard, {plainWords: true}))));
  await vi.waitFor(async () => { await act(async () => {}); expect(card().textContent).toContain('Practice money has no market value, so it is never shown in another currency.'); });
  await settle(); await settle();
  expect(card().querySelector('.account-value')!.textContent).toBe('1,000 ZIG');
  expect(card().textContent).toContain('Simulated balance · this browser');
  expect(card().querySelector('.pill')!.textContent).toBe('On this device');
  expect(card().querySelector('.wallet-card-currency')).toBeNull();
  expect(card().querySelector('.wallet-card-controls')).toBeNull();
  expect([...card().querySelectorAll('button')].map(b => b.textContent)).not.toEqual(expect.arrayContaining(['USD', 'EUR', 'BTC']));
  expect(card().querySelector('select')).toBeNull();
  expect(card().textContent).not.toMatch(/\$|€|unavailable/);
  expect(requests).toEqual([]);
  expect(JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY)!)).toEqual({version: 1, display: 'USD'});
});

test('Session AK X1 (R2): an untouched practice ledger shows no made-up balance outside the Showcase, and asks for nothing', async () => {
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletCard, {plainWords: true}))));
  await vi.waitFor(async () => { await act(async () => {}); expect(card().querySelector('.account-value')!.textContent).toBe('No balance yet'); });
  await settle(); await settle();
  expect(card().textContent).not.toContain('1,000');
  expect(card().textContent).not.toContain('Simulated balance');
  expect(card().textContent).toContain('Connect Keplr or link a wallet to see one here.');
  expect(card().querySelector('.pill')!.textContent).toBe('On this device');
  expect(requests).toEqual([]);
});

test('with a linked wallet, the chooser shows it read-only: the address shortened (whole in its title), no balance, no request', async () => {
  localStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'cosmostation', label: 'Cosmostation', address: LINKED, addedAt: '2026-10-17T10:00:00.000Z'}]}));
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletCard, {plainWords: true}))));
  const select = await vi.waitFor(async () => { await act(async () => {}); const s = card().querySelector('select'); expect(s).not.toBeNull(); return s!; });
  expect([...select.options].map(o => o.textContent)).toEqual(['This app’s wallet (On this device)', `Linked · Cosmostation · ${LINKED.slice(0, 8)}…${LINKED.slice(-4)}`]);
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
