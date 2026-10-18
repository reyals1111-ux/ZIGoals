// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {toBech32} from '@cosmjs/encoding';
import {GoalProvider} from '../../components/goal-provider';
import {WalletMoreButton} from '../../components/wallet/wallet-more-button';
import {LINKED_WALLETS_KEY} from '../linked-wallets-key';
import {WALLET_BALANCES_KEY} from '../af-wallet-keys';

// Session AF (L2b, ADR-028 H40): the menu's Solana group with a fake Wallet Standard wallet (jsdom; nothing real). Every
// wallet call is recorded: linking calls standard:connect only, Remove calls standard:disconnect, nothing else is asked.
const api = vi.hoisted(() => ({connect: vi.fn(), readBalance: vi.fn(), readGoals: vi.fn(), reconcile: vi.fn()}));
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()}), usePathname: () => '/app'}));
vi.mock('../wallet', () => ({connectKeplr: api.connect, quoteExecute: vi.fn(), executeQuote: vi.fn(), readGoals: api.readGoals, readBalance: api.readBalance, CONTRACT_ADDRESS: '', reconcileTransactions: api.reconcile}));
const OWNER = toBech32('zig', new Uint8Array(20).fill(9)), SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
let root: Root, container: HTMLDivElement, calls: string[];
const byName = (name: string) => [...container.querySelectorAll<HTMLElement>('[role="menuitem"], button, a')].find(el => (el.getAttribute('aria-label') ?? el.textContent ?? '') === name);
async function open() { await act(async () => { byName('More wallets')!.click(); }); await vi.waitFor(async () => { await act(async () => {}); expect(container.querySelector('[role="menu"]')).not.toBeNull(); }); }
const phantom = () => ({version: '1.0.0', name: 'Phantom', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:mainnet'], accounts: [], features: {
  'standard:connect': {version: '1.0.0', connect: async () => { calls.push('connect'); return {accounts: [{address: SOL}]}; }},
  'standard:disconnect': {version: '1.0.0', disconnect: async () => { calls.push('disconnect'); }},
  'solana:signTransaction': {version: '1.0.0', signTransaction: async () => { calls.push('SIGNED'); }},
}});
const onReady = (event: Event) => (event as CustomEvent).detail.register(phantom());
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); sessionStorage.clear(); calls = [];
  api.connect.mockResolvedValue(OWNER); api.readBalance.mockResolvedValue('0'); api.readGoals.mockResolvedValue([]); api.reconcile.mockResolvedValue({records: [], warnings: []});
  window.addEventListener('wallet-standard:app-ready', onReady);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
  window.removeEventListener('wallet-standard:app-ready', onReady);
  vi.unstubAllGlobals();
});

test('a Solana wallet links its address with standard:connect only; Remove disconnects it and forgets its balances', async () => {
  localStorage.setItem(WALLET_BALANCES_KEY, JSON.stringify({version: 1, observations: {}}));
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletMoreButton, {disabled: false}))));
  await open();
  const items = [...container.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(el => el.getAttribute('aria-label'));
  expect(items).toContain('Phantom: link Solana address');
  expect(items).not.toContain('Get Phantom for Solana');
  expect(calls).toEqual([]);
  await act(async () => { byName('Phantom: link Solana address')!.click(); });
  await vi.waitFor(() => expect(container.querySelector('[role="status"]')?.textContent).toBe(`Phantom ${SOL.slice(0, 8)}…${SOL.slice(-4)} linked, read-only.`));
  const stored = JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY)!);
  expect(stored.wallets).toEqual([expect.objectContaining({kind: 'solana', wallet: 'solana:phantom', label: 'Phantom', address: SOL, via: 'extension'})]);
  const id = stored.wallets[0].id as string;
  localStorage.setItem(WALLET_BALANCES_KEY, JSON.stringify({version: 1, observations: {[`${id}|solana:mainnet`]: {walletId: id, chainId: 'solana:mainnet', at: '2026-10-19T08:00:00.000Z', assets: []}}}));
  await act(async () => { byName(`Remove Phantom ${SOL.slice(0, 8)}…${SOL.slice(-4)}`)!.click(); });
  await vi.waitFor(() => expect(calls).toEqual(['connect', 'disconnect']));
  expect(JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY)!).wallets).toEqual([]);
  expect(JSON.parse(localStorage.getItem(WALLET_BALANCES_KEY)!).observations).toEqual({});
});
