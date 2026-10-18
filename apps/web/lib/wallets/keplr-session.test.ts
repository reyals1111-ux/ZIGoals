import {toBech32} from '@cosmjs/encoding';
import {describe, expect, test} from 'vitest';
import {NETWORK_CHANGED} from '@zigoals/chain-config/networks';
import {NO_KEPLR, WRONG_ADDRESS, connectStaking, dropStakingSession, keplrMobileLink, readStakingSession, saveStakingSession, verifyRpcIdentity, type KeplrConnect} from './keplr-session';

// Session AF (ADR-028 H61, H87): enable first, suggest only on Keplr's "no chain info", nothing that signs.
const ME = toBech32('zig', new Uint8Array(20).fill(1));
function keplr(options: {noChainInfo?: boolean; address?: unknown; ledger?: boolean; enableError?: string} = {}) {
  const calls: string[] = [];
  let suggested = false;
  const wallet: KeplrConnect = {
    enable: async chainId => { calls.push(`enable:${chainId}`); if (options.enableError) throw Error(options.enableError); if (options.noChainInfo && !suggested) throw Error(`There is no chain info for ${chainId}`); },
    experimentalSuggestChain: async info => { calls.push(`suggest:${info.chainId}:${info.feeCurrencies[0]!.gasPriceStep.average}`); suggested = true; },
    getKey: async chainId => { calls.push(`getKey:${chainId}`); return {bech32Address: 'address' in options ? options.address : ME, isNanoLedger: options.ledger ?? false}; },
  };
  return {wallet, calls};
}
const ok = async () => 'v5.1.2';
describe('connectStaking', () => {
  test('practice: identity, enable, key; no suggestion when Keplr knows the chain', async () => {
    const {wallet, calls} = keplr();
    const session = await connectStaking('practice', wallet, ok);
    expect(calls).toEqual(['enable:zig-test-2', 'getKey:zig-test-2']);
    expect(session).toMatchObject({version: 1, network: 'practice', chainId: 'zig-test-2', address: ME, isLedger: false});
  });
  test('real: Keplr without the chain gets the registry suggestion (25 Gazig average), then enable again; a Ledger is noted', async () => {
    const {wallet, calls} = keplr({noChainInfo: true, ledger: true});
    const session = await connectStaking('real', wallet, ok);
    expect(calls).toEqual(['enable:zigchain-1', 'suggest:zigchain-1:25000000000', 'enable:zigchain-1', 'getKey:zigchain-1']);
    expect(session).toMatchObject({network: 'real', chainId: 'zigchain-1', isLedger: true});
  });
  test('any other enable error (the person said no) is not answered with a suggestion', async () => {
    const {wallet, calls} = keplr({enableError: 'Request rejected'});
    await expect(connectStaking('real', wallet, ok)).rejects.toThrow('Request rejected');
    expect(calls).toEqual(['enable:zigchain-1']);
  });
  test('no Keplr, a failed identity check or a non-ZIGChain address connects nothing', async () => {
    await expect(connectStaking('practice', undefined, ok)).rejects.toThrow(NO_KEPLR);
    const {wallet, calls} = keplr();
    await expect(connectStaking('real', wallet, async () => { throw Error(NETWORK_CHANGED); })).rejects.toThrow(NETWORK_CHANGED);
    expect(calls).toEqual([]);
    for (const address of [toBech32('cosmos', new Uint8Array(20)), toBech32('zigvaloper', new Uint8Array(20)), ME.toUpperCase(), undefined, 5]) await expect(connectStaking('practice', keplr({address}).wallet, ok), String(address)).rejects.toThrow(WRONG_ADDRESS);
  });
});
describe('verifyRpcIdentity', () => {
  const rpc = (network: string, version: string) => { const urls: string[] = []; return {urls, fetcher: (async (url: string) => { urls.push(url); return Response.json(url.endsWith('/status') ? {result: {node_info: {network}}} : {result: {response: {version}}}); }) as unknown as typeof fetch}; };
  test('reads /status and /abci_info on the network\'s own RPC; plain GETs', async () => {
    const real = rpc('zigchain-1', 'v5.1.2');
    await expect(verifyRpcIdentity('real', real.fetcher)).resolves.toBe('v5.1.2');
    expect(real.urls.sort()).toEqual(['https://rpc.zigchain.com/abci_info', 'https://rpc.zigchain.com/status']);
    const practice = rpc('zig-test-2', 'v5.1.0');
    await expect(verifyRpcIdentity('practice', practice.fetcher)).resolves.toBe('v5.1.0');
    expect(practice.urls.every(u => u.startsWith('https://testnet-rpc.zigchain.com/'))).toBe(true);
  });
  test('fails closed on the other network, an unreviewed version or a refused answer', async () => {
    await expect(verifyRpcIdentity('real', rpc('zig-test-2', 'v5.1.2').fetcher)).rejects.toThrow(NETWORK_CHANGED);
    await expect(verifyRpcIdentity('real', rpc('zigchain-1', 'v5.1.0').fetcher)).rejects.toThrow(NETWORK_CHANGED);
    await expect(verifyRpcIdentity('practice', (async () => new Response('', {status: 502})) as unknown as typeof fetch)).rejects.toThrow('did not answer');
  });
});
describe('the tab session and the phone link', () => {
  class Memory { map = new Map<string, string>(); getItem(k: string) { return this.map.get(k) ?? null; } setItem(k: string, v: string) { this.map.set(k, v); } removeItem(k: string) { this.map.delete(k); } }
  test('kept per network in sessionStorage; anything malformed or for the other network reads as none', async () => {
    const storage = new Memory(), session = await connectStaking('practice', keplr().wallet, ok);
    saveStakingSession(storage, session);
    expect([...storage.map.keys()]).toEqual(['zigoals:wallet-session:v1']);
    expect(readStakingSession(storage, 'practice')).toEqual(session);
    expect(readStakingSession(storage, 'real')).toBeNull();
    storage.setItem('zigoals:wallet-session:v1', JSON.stringify({...session, address: 'zig1nope'}));
    expect(readStakingSession(storage, 'practice')).toBeNull();
    storage.setItem('zigoals:wallet-session:v1', '{');
    expect(readStakingSession(storage, 'practice')).toBeNull();
    dropStakingSession(storage);
    expect(storage.map.size).toBe(0);
  });
  test('Open ZIGoals in Keplr: the two documented deep-link forms, to this app\'s staking page only', () => {
    expect(keplrMobileLink('https://alpha.zigoals.app', false)).toBe('keplrwallet://web-browser?url=https%3A%2F%2Falpha.zigoals.app%2Fapp%2Fstaking');
    expect(keplrMobileLink('https://alpha.zigoals.app', true)).toBe('intent://web-browser?url=https%3A%2F%2Falpha.zigoals.app%2Fapp%2Fstaking#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;');
    expect(() => keplrMobileLink('http://evil.example', false)).toThrow();
  });
});
