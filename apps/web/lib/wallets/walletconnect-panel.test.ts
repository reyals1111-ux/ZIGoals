// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {LINKED_WALLETS_KEY} from '../linked-wallets-key';

// Session AF (L2b, ADR-028 D1, H38): the phone sheet's "Connect by WalletConnect" once a project ID is set (mocked here;
// the committed file has none) with a fake sign-client (no relay is reached). The package is asked for only on the tap.
const sdk = vi.hoisted(() => ({loaded: 0, approve: (() => undefined) as (session: unknown) => void, connect: vi.fn()}));
vi.mock('../public-integrations', async original => {
  const real = await original<typeof import('../public-integrations')>();
  const configured = {...real.PUBLIC_INTEGRATIONS, reownProjectId: '0123456789abcdef0123456789abcdef'};
  return {...real, PUBLIC_INTEGRATIONS: configured, walletConnectConfigured: () => true};
});
vi.mock('@walletconnect/sign-client', () => {
  sdk.loaded++;
  return {SignClient: {init: async () => ({
    connect: async (params: unknown) => { sdk.connect(params); return {uri: 'wc:pair@2?relay-protocol=irn&symKey=k', approval: () => new Promise(r => { sdk.approve = r; })}; },
    disconnect: async () => undefined,
  })}};
});
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()}), usePathname: () => '/app'}));
vi.mock('../wallet', () => ({connectKeplr: vi.fn(), quoteExecute: vi.fn(), executeQuote: vi.fn(), readGoals: vi.fn(async () => []), readBalance: vi.fn(async () => '0'), CONTRACT_ADDRESS: '', reconcileTransactions: vi.fn(async () => ({records: [], warnings: []}))}));
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7';
let root: Root, container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); sessionStorage.clear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

test('Connect by WalletConnect: loads the package on the tap, offers the pairing link, links the approved addresses read-only', async () => {
  const {GoalProvider} = await import('../../components/goal-provider');
  const {default: WalletMenu} = await import('../../components/wallet/wallet-menu');
  await act(async () => root.render(createElement(GoalProvider, null, createElement(WalletMenu, {variant: 'sheet'}))));
  const button = await vi.waitFor(() => { const b = [...container.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Connect by WalletConnect'); expect(b).toBeDefined(); return b!; });
  expect(container.textContent).not.toContain('available soon on phones');
  expect(sdk.loaded).toBe(0);
  await act(async () => { button.click(); });
  const trust = await vi.waitFor(() => { const a = container.querySelector<HTMLAnchorElement>('a[href^="https://link.trustwallet.com/wc?uri="]'); expect(a).not.toBeNull(); return a!; });
  expect(sdk.loaded).toBe(1);
  expect(trust.getAttribute('href')).toBe(`https://link.trustwallet.com/wc?uri=${encodeURIComponent('wc:pair@2?relay-protocol=irn&symKey=k')}`);
  expect(trust.getAttribute('rel')).toBe('noopener noreferrer');
  expect(sdk.connect).toHaveBeenCalledWith(expect.objectContaining({optionalNamespaces: expect.objectContaining({eip155: expect.objectContaining({methods: []})})}));
  await act(async () => { sdk.approve({topic: 't', peer: {metadata: {name: 'Trust Wallet'}}, namespaces: {eip155: {accounts: [`eip155:1:${EVM}`]}}}); });
  await vi.waitFor(() => expect(container.textContent).toContain('Trust Wallet: 1 address linked, read-only'));
  expect(JSON.parse(localStorage.getItem(LINKED_WALLETS_KEY)!).wallets).toEqual([expect.objectContaining({kind: 'evm', address: EVM, label: 'Trust Wallet', wallet: 'walletconnect:Trust Wallet', via: 'walletconnect'})]);
  // Nothing of the client is stored on the device: only the linked-wallets record.
  expect(Object.keys(localStorage)).toEqual([LINKED_WALLETS_KEY]);
});
