// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {toBech32} from '@cosmjs/encoding';
import {GoalProvider} from '../components/goal-provider';
import {WalletMoreButton} from '../components/wallet/wallet-more-button';
import WalletMenu from '../components/wallet/wallet-menu';
import {LINKED_WALLETS_KEY} from './linked-wallets-key';

// Session AE (Part 6, ADR-027): the wallet menu in a page (jsdom). Test doubles only; every wallet call is recorded.
const api = vi.hoisted(() => ({connect: vi.fn(), readBalance: vi.fn(), readGoals: vi.fn(), reconcile: vi.fn()}));
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()}), usePathname: () => '/app'}));
vi.mock('./wallet', () => ({connectKeplr: api.connect, quoteExecute: vi.fn(), executeQuote: vi.fn(), readGoals: api.readGoals, readBalance: api.readBalance, CONTRACT_ADDRESS: '', reconcileTransactions: api.reconcile}));
const OWNER = toBech32('zig', new Uint8Array(20).fill(9)), LEAP = toBech32('zig', new Uint8Array(20).fill(4));
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7';
let root: Root, container: HTMLDivElement, calls: string[];
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
const byName = (name: string | RegExp) => [...container.querySelectorAll<HTMLElement>('[role="menuitem"], button, a')].find(el => { const n = el.getAttribute('aria-label') ?? el.textContent ?? ''; return typeof name === 'string' ? n === name : name.test(n); });
const stored = () => JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY) ?? '{"wallets":[]}') as {wallets: {kind: string; wallet: string; label: string; address: string}[]};
async function open() { await act(async () => { byName('More wallets')!.click(); }); await vi.waitFor(async () => { await act(async () => {}); expect(container.querySelector('[role="menu"]')).not.toBeNull(); }); }
function announce() {
  window.dispatchEvent(Object.assign(new Event('eip6963:announceProvider'), {detail: {info: {uuid: 'u-1', rdns: 'io.fictional', name: 'Fictional EVM', icon: 'data:image/png;base64,iVBORw0KGgo='}, provider: {request: async ({method}: {method: string}) => { calls.push(method); return [EVM]; }}}}));
  window.dispatchEvent(Object.assign(new Event('eip6963:announceProvider'), {detail: {info: {uuid: 'u-2', rdns: 'io.plain', name: 'Plain Wallet', icon: 'https://example.invalid/icon.png'}, provider: {request: async ({method}: {method: string}) => { calls.push(method); return []; }}}}));
}
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); sessionStorage.clear(); calls = [];
  api.connect.mockResolvedValue(OWNER); api.readBalance.mockResolvedValue('0'); api.readGoals.mockResolvedValue([]); api.reconcile.mockResolvedValue({records: [], warnings: []});
  Object.assign(window, {
    keplr: {experimentalSuggestChain: async () => { calls.push('keplr.suggest'); }, enable: async () => { calls.push('keplr.enable'); }, getKey: async () => ({bech32Address: OWNER}), disable: async (chain: string) => { calls.push(`keplr.disable:${chain}`); }},
    leap: {experimentalSuggestChain: async () => { calls.push('leap.suggest'); }, enable: async () => { calls.push('leap.enable'); }, getKey: async () => { calls.push('leap.getKey'); return {bech32Address: LEAP}; }},
  });
  window.addEventListener('eip6963:requestProvider', announce);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
  window.removeEventListener('eip6963:requestProvider', announce);
  for (const name of ['keplr', 'leap']) Reflect.deleteProperty(window, name);
  vi.unstubAllGlobals();
});

test('the ▾ opens a menu of the choices; arrows move, Escape closes and the focus comes back', async () => {
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletMoreButton, {disabled: false}))));
  const trigger = byName('More wallets')!;
  expect(trigger.getAttribute('aria-haspopup')).toBe('menu'); expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await open();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  const items = [...container.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(el => el.getAttribute('aria-label'));
  expect(items).toEqual(['Keplr', 'Leap: link address', 'Fictional EVM: link address', 'Plain Wallet: link address', 'Get MetaMask', 'Get Rabby', 'Get Coinbase Wallet', 'Watch a Bitcoin address']);
  // An announced data: image is shown; a remote URL is not (the generic glyph instead).
  expect(byName('Fictional EVM: link address')!.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/png/);
  expect(byName('Plain Wallet: link address')!.querySelector('img')).toBeNull();
  for (const link of container.querySelectorAll('a[role="menuitem"]')) { expect(link.getAttribute('target')).toBe('_blank'); expect(link.getAttribute('rel')).toBe('noopener noreferrer'); }
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Keplr');
  await act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true})); });
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Leap: link address');
  await act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true})); });
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Watch a Bitcoin address');
  await act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true})); });
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Keplr');
  await act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); });
  expect(container.querySelector('[role="menu"]')).toBeNull(); expect(document.activeElement).toBe(trigger);
  expect(calls).toEqual([]); // opening asks no wallet for anything
});

test('linking reads only the address (Cosmos: suggest, enable, getKey; EVM: eth_requestAccounts); Bitcoin is checked here; Remove removes', async () => {
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletMoreButton, {disabled: false}))));
  await open();
  await act(async () => { byName('Leap: link address')!.click(); }); await settle();
  expect(calls).toEqual(['leap.suggest', 'leap.enable', 'leap.getKey']);
  await act(async () => { byName('Fictional EVM: link address')!.click(); }); await settle();
  expect(calls.slice(3)).toEqual(['eth_requestAccounts']);
  await act(async () => { byName('Plain Wallet: link address')!.click(); }); await settle();
  expect(container.textContent).toContain('did not give an account address');
  await act(async () => { byName('Watch a Bitcoin address')!.click(); }); await settle();
  const input = container.querySelector<HTMLInputElement>('input')!, form = container.querySelector('form')!;
  const type = async (value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); }); };
  await type('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3'); await act(async () => { form.requestSubmit(); }); await settle();
  expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/not a valid Bitcoin address/);
  await type('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'); await act(async () => { form.requestSubmit(); }); await settle();
  expect(stored().wallets.map(w => [w.kind, w.wallet, w.label, w.address])).toEqual([['cosmos', 'leap', 'Leap', LEAP], ['evm', 'io.fictional', 'Fictional EVM', EVM], ['btc', 'bitcoin-watch', 'Bitcoin', 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0']]);
  await act(async () => { byName(/^Remove Fictional EVM/)!.click(); }); await settle();
  expect(stored().wallets.map(w => w.label)).toEqual(['Leap', 'Bitcoin']);
  expect(calls).toEqual(['leap.suggest', 'leap.enable', 'leap.getKey', 'eth_requestAccounts', 'eth_requestAccounts']);
});

test('Disconnect returns to the local demo, clears the reconnect hint and asks Keplr to forget the testnet, in the phone sheet\'s rows too', async () => {
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletMoreButton, {disabled: false}), createElement(WalletMenu, {variant: 'sheet'}))));
  await open();
  await act(async () => { byName('Keplr')!.click(); }); await settle();
  expect(sessionStorage.getItem('zigoals:wallet-reconnect-hint:v1')).toBe('true');
  const sheet = container.querySelector<HTMLElement>('.wallet-choices')!;
  const disconnect = [...sheet.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Disconnect')!;
  expect(disconnect).toBeDefined();
  await act(async () => { disconnect.click(); }); await settle();
  expect(sessionStorage.getItem('zigoals:wallet-reconnect-hint:v1')).toBeNull();
  expect(calls).toContain('keplr.disable:zig-test-2');
  expect([...sheet.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Disconnect')).toBe(false);
  expect(sheet.textContent).toContain('Keplr disconnected');
  // No row of the sheet carries the main buttons' names, so "Connect Keplr" and "Local demo" stay unique.
  for (const row of sheet.querySelectorAll('button, a')) expect(row.getAttribute('aria-label') ?? '').not.toMatch(/connect keplr|local demo|demo records/i);
});

test('the Showcase: the ▾ is off, like Connect Keplr (wallet-menu.spec checks the sheet in a real Showcase)', async () => {
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletMoreButton, {disabled: true}))));
  expect((byName('More wallets') as HTMLButtonElement).disabled).toBe(true);
});
