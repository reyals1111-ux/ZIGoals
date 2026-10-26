import {afterEach, describe, expect, it, vi} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {POOL_SHARE_DENOMS, VAULT_SHARE_DENOMS, poolPart, vaultPart} from './shares';
import {readShares} from '../server/earn/shares';
import {SHARES_CLIENT_PER_MINUTE, sharesRelay} from '../server/earn/shares-relay';
import {GET} from '../../app/api/earn/shares/route';

// Session AH (AF3; `TIER 3 (egress routes)`): your pool and vault shares from eight pinned balances; fictional figures.
const address = toBech32('zig', new Uint8Array(20).fill(7));
afterEach(() => { vi.unstubAllGlobals(); });

describe('the share maths', () => {
  it('a pool part is each reserve × your shares ÷ all shares, rounded down; no shares in the pool is unknown', () => {
    expect(poolPart('25', '100', [{symbol: 'ZIG', amount: '1000', decimals: 18}, {symbol: 'USDC', amount: '399', decimals: 6}])).toEqual([{symbol: 'ZIG', units: '250', decimals: 18}, {symbol: 'USDC', units: '99', decimals: 6}]);
    expect(poolPart('1', '0', [])).toBeNull();
    expect(poolPart('x', '10', [])).toBeNull();
  });
  it('a vault part is shares × the share price, rounded down', () => {
    expect(vaultPart('1000000', '1')).toBe('1000000');
    expect(vaultPart('1000000', '1.0625')).toBe('1062500');
    expect(vaultPart('3', '0.5')).toBe('1');
    expect(vaultPart('3', '-1')).toBeNull();
  });
});

describe('the reader', () => {
  it('asks the official LCD for the eight pinned denoms only, at one block, and keeps the non-zero ones', async () => {
    const asked: string[] = [];
    const fetcher = async (url: string, init: RequestInit) => {
      asked.push(url);
      expect(init.method).toBe('GET'); expect(init.credentials).toBe('omit');
      const u = new URL(url);
      if (u.pathname.endsWith('/blocks/latest')) return Response.json({block: {header: {height: '500', chain_id: 'zigchain-1', time: '2026-10-26T08:00:00Z'}}}, {headers: {'x-cosmos-block-height': '500'}});
      expect(new Headers(init.headers).get('x-cosmos-block-height')).toBe('500');
      const denom = u.searchParams.get('denom')!;
      const amount = denom === POOL_SHARE_DENOMS['zig-usdc'] ? '42' : denom === VAULT_SHARE_DENOMS['core-income'] ? '9000000' : '0';
      return Response.json({balance: {denom, amount}}, {headers: {'x-cosmos-block-height': '500'}});
    };
    const wire = await readShares(fetcher, address);
    expect(wire).toEqual({height: '500', observedAt: '2026-10-26T08:00:00Z', pools: {'zig-usdc': '42'}, vaults: {'core-income': '9000000'}});
    expect(asked.every(u => u.startsWith('https://api.zigchain.com/'))).toBe(true);
    const balances = asked.filter(u => u.includes('/balances/'));
    expect(balances).toHaveLength(8);
    expect(balances.every(u => u.includes(`/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=`))).toBe(true);
  });
});

describe('the limits and the route', () => {
  it('one answer per address for a minute; ten reads a minute per client', async () => {
    let t = 0, reads = 0;
    const relay = sharesRelay({now: () => t, read: async () => { reads++; return {height: '1', observedAt: 'x', pools: {}, vaults: {}}; }});
    await relay(address, 'client'); await relay(address, 'client');
    expect(reads).toBe(1);
    for (let i = 1; i < SHARES_CLIENT_PER_MINUTE; i++) await relay(toBech32('zig', new Uint8Array(20).fill(i + 10)), 'client');
    expect(await relay(toBech32('zig', new Uint8Array(20).fill(99)), 'client')).toHaveProperty('retryAfter');
    t = 61_000;
    expect(await relay(toBech32('zig', new Uint8Array(20).fill(99)), 'client')).toHaveProperty('shares');
  });
  it.each(['address=private-notes', `address=${address}&url=https://attacker.invalid`, `address=${address}&address=${address}`, ''])('refuses "%s" before anything is sent', async query => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown) => { calls.push(String(url)); throw Error('must not fetch'); });
    const response = await GET(new Request(`http://localhost/api/earn/shares?${query}`));
    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
