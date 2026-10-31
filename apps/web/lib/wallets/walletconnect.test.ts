import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test, vi} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import egress from '../egress-policy.json';
import {connectSources, frameSources} from '../csp-compose.mjs';
import {PUBLIC_INTEGRATIONS, walletConnectConfigured} from '../public-integrations';
import {WALLETCONNECT_CSP, WC_SOLANA_MAINNET, WalletConnectUnavailable, accountsOf, readOnlyNamespaces, startWalletConnect, stopWalletConnect, trustWalletConnectLink, walletConnectSession} from './walletconnect';

// Session AF (L2b, ADR-028 D1, H6, H38; `TIER 3 (dependencies)`): @walletconnect/sign-client 2.26.0, dormant without the
// owner's project ID. Fake clients only; nothing reaches the relay.
const WEB = join(__dirname, '..', '..');
const sources = (dir: string): string[] => readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? (name === 'node_modules' ? [] : sources(path)) : /\.(ts|tsx|mjs|js)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7', SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', ZIG = toBech32('zig', new Uint8Array(20).fill(3));
const ID = '0123456789abcdef0123456789abcdef';
function fakeLoader() {
  const calls: {init?: Record<string, unknown>; connect?: unknown; disconnect?: unknown} = {};
  let approve!: (s: unknown) => void;
  const client = {
    connect: vi.fn(async (params: unknown) => { calls.connect = params; return {uri: 'wc:abc@2?relay-protocol=irn&symKey=def', approval: () => new Promise(r => { approve = r; })}; }),
    disconnect: vi.fn(async (params: unknown) => { calls.disconnect = params; }),
  };
  const loader = vi.fn(async () => ({SignClient: {init: vi.fn(async (options: Record<string, unknown>) => { calls.init = options; return client; })}}));
  return {calls, client, loader, approve: (s: unknown) => approve(s)};
}

describe('dormant without the project ID', () => {
  test('the committed config holds the owner\'s public ID (Session AK); no static import of the package anywhere; the only dynamic import is in startWalletConnect', () => {
    expect(PUBLIC_INTEGRATIONS.reownProjectId).toBe('a769fc3cf950f7408189e14bac0633b1');
    const files = [...sources('lib'), ...sources('components'), ...sources('app')];
    expect(files.length).toBeGreaterThan(500);
    for (const f of files) {
      const text = readFileSync(join(WEB, f), 'utf8');
      expect(text, f).not.toMatch(/from\s+['"]@walletconnect\/|import\s+['"]@walletconnect\/|require\(['"]@walletconnect\//);
      if (/import\(['"]@walletconnect\//.test(text)) expect(f).toBe('lib/wallets/walletconnect.ts');
    }
    expect((readFileSync(join(WEB, 'lib/wallets/walletconnect.ts'), 'utf8').match(/import\(['"]@walletconnect\/sign-client['"]\)/g) ?? []).length).toBe(1);
  });
  test('with a null or malformed ID nothing loads and no request is made', async () => {
    for (const projectId of [null, '', 'not-an-id', ID.toUpperCase()]) {
      const {loader} = fakeLoader();
      await expect(startWalletConnect({projectId, origin: 'https://alpha.zigoals.app', loader}), String(projectId)).rejects.toThrow(WalletConnectUnavailable);
      expect(loader).not.toHaveBeenCalled();
    }
    const {loader} = fakeLoader();
    await expect(startWalletConnect({projectId: ID, origin: 'http://evil.example', loader})).rejects.toThrow(WalletConnectUnavailable);
    expect(loader).not.toHaveBeenCalled();
  });
  test('the relay and Verify hosts are in the CSP if and only if the project ID is set', () => {
    const app = connectSources(egress, 'app'), frames = frameSources(egress, 'app'), configured = walletConnectConfigured();
    expect(WALLETCONNECT_CSP.connect.every(h => app.includes(h))).toBe(configured);
    expect(WALLETCONNECT_CSP.frame.every(h => frames.includes(h))).toBe(configured);
    if (!configured) {
      for (const h of [...WALLETCONNECT_CSP.connect, ...WALLETCONNECT_CSP.frame]) { expect(app, h).not.toContain(h); expect(frames, h).not.toContain(h); }
      expect(JSON.stringify(egress)).not.toMatch(/walletconnect|web3modal|reown/);
    }
  });
});

describe('read-only pairing with a fake client', () => {
  test('in-memory storage, telemetry off, accounts only; the session holds the checked addresses; Remove ends it', async () => {
    const fake = fakeLoader();
    const started = await startWalletConnect({projectId: ID, origin: 'https://alpha.zigoals.app', loader: fake.loader});
    expect(started.uri).toMatch(/^wc:/);
    expect(fake.calls.init).toMatchObject({projectId: ID, telemetryEnabled: false, metadata: {name: 'ZIGoals', url: 'https://alpha.zigoals.app', icons: ['https://alpha.zigoals.app/apple-touch-icon.png']}});
    const storage = fake.calls.init!.storage as {setItem: (k: string, v: unknown) => Promise<void>; getItem: (k: string) => Promise<unknown>; getKeys: () => Promise<string[]>};
    await storage.setItem('k', 1); expect(await storage.getItem('k')).toBe(1); expect(await storage.getKeys()).toEqual(['k']);
    expect(fake.calls.connect).toEqual({optionalNamespaces: {
      eip155: {chains: ['eip155:1', 'eip155:42161', 'eip155:8453', 'eip155:10', 'eip155:137', 'eip155:56'], methods: [], events: []},
      solana: {chains: [WC_SOLANA_MAINNET], methods: [], events: []},
      cosmos: {chains: ['cosmos:zigchain-1'], methods: ['cosmos_getAccounts'], events: []},
    }});
    fake.approve({topic: 't1', peer: {metadata: {name: 'Keplr Mobile'}}, namespaces: {cosmos: {accounts: [`cosmos:zigchain-1:${ZIG}`]}, eip155: {accounts: [`eip155:8453:${EVM}`, `eip155:1:${EVM}`]}}});
    expect(await started.approval).toEqual({wallet: 'Keplr Mobile', accounts: [{kind: 'cosmos', address: ZIG, chainId: 'cosmos:zigchain-1'}, {kind: 'evm', address: EVM, chainId: 'eip155:8453'}]});
    expect(walletConnectSession()?.session?.topic).toBe('t1');
    expect(fake.client.connect).toHaveBeenCalledTimes(1);
    await stopWalletConnect();
    expect(fake.calls.disconnect).toEqual({topic: 't1', reason: {code: 6000, message: 'User disconnected'}});
    expect(walletConnectSession()).toBeNull();
  });
  test('lane L2a may add Cosmos methods for its signer; nothing else can be added', () => {
    expect(readOnlyNamespaces(['cosmos_getAccounts', 'cosmos_getAccounts']).cosmos.methods).toEqual(['cosmos_getAccounts']);
    for (const bad of [['eth_sendTransaction'], ['personal_sign'], ['solana_signTransaction'], ['cosmos_'], ['wallet_switchEthereumChain'], ['cosmos_signDirect'], ['cosmos_signAmino'], ['cosmos_getAccounts', 'cosmos_signDirect']]) expect(() => readOnlyNamespaces(bad), bad.join()).toThrow(); // S9: signing methods refused too
  });
  test('only well-formed accounts of the tracked chains are read from a session', () => {
    expect(accountsOf({x: {accounts: [`eip155:1:${EVM}`, `eip155:1:${EVM.toLowerCase()}`, `eip155:999:${EVM}`, `eip155:1:0x12`, `${WC_SOLANA_MAINNET}:${SOL}`, `solana:devnet:${SOL}`, 'cosmos:zigchain-1:cosmos1abc', `cosmos:zig-test-2:${ZIG}`, 7, 'nonsense']}}))
      .toEqual([{kind: 'evm', address: EVM, chainId: 'eip155:1'}, {kind: 'solana', address: SOL, chainId: WC_SOLANA_MAINNET}]);
    expect(accountsOf(null)).toEqual([]);
  });
  test('Trust\'s WalletConnect link carries the pairing link encoded', () => {
    expect(trustWalletConnectLink('wc:abc@2?relay-protocol=irn&symKey=def')).toBe('https://link.trustwallet.com/wc?uri=wc%3Aabc%402%3Frelay-protocol%3Dirn%26symKey%3Ddef');
    expect(() => trustWalletConnectLink('https://evil.example')).toThrow();
  });
});

// Session AK (Part 1a, A7–A9): each wallet's own link for the pairing URI, listed only for what it links.
describe('the pairing link handed to each wallet (A7)', () => {
  const URI = 'wc:' + 'a'.repeat(64) + '@2?relay-protocol=irn&symKey=' + 'b'.repeat(64) + '&expiryTimestamp=1793000000';
  test('Keplr gets the link raw (iOS scheme, Android intent); the others encoded; no wallet is promised more than it links', async () => {
    const {walletConnectLinks, PHONE_WALLETS_SWITCHING_ON} = await import('./walletconnect');
    const ios = walletConnectLinks(URI, false), android = walletConnectLinks(URI, true);
    expect(ios.map(l => l.key)).toEqual(['wc-keplr', 'wc-trust', 'wc-metamask', 'wc-ledger']);
    expect(ios[0]!.href).toBe(`keplrwallet://wcV2?${URI}`);
    expect(android[0]!.href).toBe(`intent://wcV2?${URI}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`);
    expect(ios[1]!.href).toBe(`https://link.trustwallet.com/wc?uri=${encodeURIComponent(URI)}`);
    expect(ios[2]!.href).toBe(`metamask://wc?uri=${encodeURIComponent(URI)}`);
    expect(ios[3]!.href).toBe(`ledgerlive://wc?uri=${encodeURIComponent(URI)}`);
    expect(ios.filter(l => /ZIGChain/.test(l.detail)).map(l => l.key)).toEqual(['wc-keplr']);
    for (const bad of ['http://x', 'wc:' + 'x'.repeat(2100), 'wc:a b']) expect(() => walletConnectLinks(bad, false)).toThrow();
    expect(PHONE_WALLETS_SWITCHING_ON).toMatch(/being switched on/);
  });
});
