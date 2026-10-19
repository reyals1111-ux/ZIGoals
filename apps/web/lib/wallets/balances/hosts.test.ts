import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import egress from '../../egress-policy.json';
import {BALANCE_ORIGINS, TRACKED_CHAINS, chainsFor} from './chains';
import {EVM_METHODS} from './evm';
import {SOLANA_METHODS} from './solana';
import {BalanceReadError, readJson} from './http';
// A URL carrying a user and password (built from parts so no scan reads it as an e-mail address): it must be refused.
const USERINFO_URL = 'https://user:pw' + '@' + 'mempool.space/api';

/**
 * Session AF (L2b, ADR-028 H16, H50, H64; `TIER 3 (CSP)`): the balance readers' guard. They reach exactly the CSP's
 * browser-direct balance hosts (and ZIGoals' own relay for ZIGChain), use only read methods, name no signing or sending
 * method, and send each address only to its own chain.
 */
const DIR = __dirname;
const files = readdirSync(DIR).filter(f => /\.ts$/.test(f) && !/\.test\./.test(f));
const read = (f: string) => readFileSync(join(DIR, f), 'utf8');
const FORBIDDEN = /signAmino|signDirect|signArbitrary|eth_sign|personal_sign|eth_signTypedData|eth_sendTransaction|eth_sendRawTransaction|sendTransaction|wallet_[A-Za-z]+|sendTx|broadcast|\bsign[A-Z]\w*|experimentalSign|send\w*Tx\b|solana:sign|requestAirdrop/;

describe('the hosts', () => {
  test('exactly the H16 (d) balance hosts, in the CSP for /app documents only, in the same order', () => {
    expect(BALANCE_ORIGINS).toEqual(['https://cosmos-rest.publicnode.com', 'https://ethereum-rpc.publicnode.com', 'https://arbitrum-one-rpc.publicnode.com', 'https://base-rpc.publicnode.com', 'https://optimism-rpc.publicnode.com', 'https://polygon-bor-rpc.publicnode.com', 'https://bsc-rpc.publicnode.com', 'https://solana-rpc.publicnode.com', 'https://mempool.space']);
    const app = egress.csp.app.connect;
    expect(app.slice(app.indexOf(BALANCE_ORIGINS[0]!))).toEqual([...BALANCE_ORIGINS]);
    expect(egress.csp.site.connect).toEqual([]);
    for (const origin of BALANCE_ORIGINS) expect(egress.chainOrigins as string[]).not.toContain(origin);
    // ZIGChain is never read browser-direct here (H16 (a)): its chain has no origin and goes through the relay.
    expect(TRACKED_CHAINS.find(c => c.id === 'zigchain-1')!.origin).toBeNull();
    expect(app).not.toContain('https://api.zigchain.com');
  });
  test('only http.ts calls fetch, and it refuses any other address', async () => {
    for (const f of files) expect(/\bfetch\(/.test(read(f)), f).toBe(f === 'http.ts');
    for (const f of files) expect(read(f), f).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|sendBeacon/);
    const never = async () => { throw Error('fetched'); };
    for (const url of ['https://api.zigchain.com/x', 'https://evil.example/', 'http://mempool.space/api', 'https://mempool.space.evil.example/', USERINFO_URL])
      await expect(readJson(url, {method: 'GET'}, never), url).rejects.toThrow(BalanceReadError);
  });
  test('a request carries no cookie, no referrer, no redirect and, for a GET, no header', async () => {
    const seen: RequestInit[] = [];
    const fetcher = async (_: string, init: RequestInit) => { seen.push(init); return new Response('{"ok":1}', {status: 200}); };
    await readJson('https://mempool.space/api/address/x', {method: 'GET'}, fetcher);
    await readJson('https://ethereum-rpc.publicnode.com', {method: 'POST', body: '[]'}, fetcher);
    expect(seen.every(init => init.signal instanceof AbortSignal)).toBe(true);
    expect(seen.map(init => Object.fromEntries(Object.entries(init).filter(([k]) => k !== 'signal')))).toEqual([
      {method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', mode: 'cors'},
      {method: 'POST', body: '[]', headers: {'content-type': 'application/json'}, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', mode: 'cors'},
    ]);
    await expect(readJson('https://mempool.space/api', {method: 'GET'}, async () => new Response('x'.repeat(70_000)))).rejects.toThrow(/more than ZIGoals reads/);
    await expect(readJson('https://mempool.space/api', {method: 'GET'}, async () => new Response('busy', {status: 429}))).rejects.toThrow('mempool.space answered with an error (HTTP 429).');
    await expect(readJson('https://mempool.space/api', {method: 'GET'}, async () => { throw new TypeError('Failed to fetch'); })).rejects.toThrow('mempool.space could not be reached just now.');
  });
});

describe('read methods only', () => {
  test('the JSON-RPC methods named are exactly eth_getBalance, eth_call, eth_blockNumber, getBalance and getMultipleAccounts', () => {
    expect([...EVM_METHODS, ...SOLANA_METHODS]).toEqual(['eth_getBalance', 'eth_call', 'eth_blockNumber', 'getBalance', 'getMultipleAccounts']);
    for (const f of files) {
      const text = read(f);
      expect(text, f).not.toMatch(FORBIDDEN);
      for (const method of text.match(/method: '([a-z][A-Za-z_]+)'/g) ?? []) expect([...EVM_METHODS, ...SOLANA_METHODS], `${f}: ${method}`).toContain(method.slice(9, -1));
    }
  });
});

describe('each address only to its own chain (no EVM address to Solana, no zig1 to an EVM host, no typed address)', () => {
  test('chainsFor', () => {
    const ids = (w: {kind: string; address: string; chains?: string[]}) => chainsFor(w).map(c => c.id);
    expect(ids({kind: 'cosmos', address: 'zig1abc'})).toEqual(['zigchain-1', 'cosmoshub-4']);
    expect(ids({kind: 'cosmos', address: 'cosmos1abc'})).toEqual([]);
    expect(ids({kind: 'evm', address: '0x'})).toEqual(['eip155:1', 'eip155:42161', 'eip155:8453', 'eip155:10', 'eip155:137', 'eip155:56']);
    expect(ids({kind: 'evm', address: '0x', chains: ['eip155:8453', 'solana:mainnet', 'bitcoin']})).toEqual(['eip155:8453']);
    expect(ids({kind: 'solana', address: 'So'})).toEqual(['solana:mainnet']);
    expect(ids({kind: 'btc', address: 'bc1'})).toEqual(['bitcoin']);
    expect(ids({kind: 'unknown', address: 'x'})).toEqual([]);
  });
});
