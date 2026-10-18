import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, test} from 'vitest';
import {WALLET_BALANCES_KEY, WALLET_CATALOG_LABELS, WALLET_ERASE_KEYS, WALLET_EXPORT_KEYS, WALLET_PERSONAL_KEYS} from '../../af-wallet-keys';
import {MAX_OBSERVATIONS, WALLET_BALANCES, forgetWalletBalances, observationOf, withFailure, withObservation, withoutWalletBalances, writeWalletBalances} from './store';
import {readDeviceRecord} from '../../device-record';
import {buildShowcase} from '../../showcase-data';

// Session AF (L2b, ADR-028 H16 §11.4; `TIER 3 (storage)`): zigoals:wallet-balances:v1.
const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }} as Pick<Storage, 'getItem' | 'setItem'>}; };
const AT = '2026-10-19T08:00:00.000Z', LATER = '2026-10-19T09:00:00.000Z';
const ETH = {id: 'native', symbol: 'ETH', decimals: 18, amount: '1500000000000000000'};

describe('the key: personal, device-only, never synced or restored, in Export, erased', () => {
  test('versioned; listed for every registry the lead wires', () => {
    expect(WALLET_BALANCES_KEY).toBe('zigoals:wallet-balances:v1');
    expect(WALLET_PERSONAL_KEYS).toEqual([WALLET_BALANCES_KEY]);
    expect(WALLET_EXPORT_KEYS).toEqual({walletBalances: WALLET_BALANCES_KEY});
    expect(Object.keys(WALLET_CATALOG_LABELS)).toEqual(Object.keys(WALLET_EXPORT_KEYS));
    expect(WALLET_ERASE_KEYS).toEqual([WALLET_BALANCES_KEY]);
  });
  test('no sync module or Worker names it; the Showcase never writes it', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : files(path)) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []; });
    const lib = join(__dirname, '..', '..');
    const sync = [...files(join(lib, 'vault')), ...files(join(lib, 'sync-offer')), join(lib, 'sync-homes-store.ts'), ...files(join(lib, '..', '..', '..', 'workers'))];
    expect(sync.length).toBeGreaterThan(20);
    expect(sync.filter(file => /wallet-balances|WALLET_BALANCES|af-wallet-keys/.test(readFileSync(file, 'utf8'))).map(file => relative(lib, file))).toEqual([]);
    for (const aa of [false, true]) expect(Object.keys(buildShowcase('2026-10-19', 'UTC', {aa}).records)).not.toContain(WALLET_BALANCES_KEY);
  });
});

describe('the record: honest amounts, never 0 for a failure, never overwritten when unreadable', () => {
  test('a read stores the amounts; a failure keeps them with their own time and adds the reason; a new read clears it', () => {
    let r = withObservation({version: 1}, {walletId: 'w1', chainId: 'eip155:1', at: AT, assets: [ETH], height: '21000000'});
    expect(observationOf(r, 'w1', 'eip155:1')).toEqual({walletId: 'w1', chainId: 'eip155:1', at: AT, assets: [ETH], height: '21000000'});
    r = withFailure(r, 'w1', 'eip155:1', 'PublicNode did not answer in time.', LATER);
    expect(observationOf(r, 'w1', 'eip155:1')).toEqual({walletId: 'w1', chainId: 'eip155:1', at: AT, assets: [ETH], height: '21000000', error: 'PublicNode did not answer in time.', errorAt: LATER});
    // A wallet never read that fails has no amounts at all (the page says "unavailable", never 0).
    r = withFailure(r, 'w2', 'solana:mainnet', 'Refused.', LATER);
    expect(observationOf(r, 'w2', 'solana:mainnet')).toEqual({walletId: 'w2', chainId: 'solana:mainnet', error: 'Refused.', errorAt: LATER});
    r = withObservation(r, {walletId: 'w1', chainId: 'eip155:1', at: LATER, assets: []});
    expect(observationOf(r, 'w1', 'eip155:1')).toEqual({walletId: 'w1', chainId: 'eip155:1', at: LATER, assets: []});
    expect(Object.keys(withoutWalletBalances(r, 'w1').observations!)).toEqual(['w2|solana:mainnet']);
  });
  test('an entry filed under another key is not believed; at most 200 observations', () => {
    expect(observationOf({version: 1, observations: {'w1|eip155:1': {walletId: 'w2', chainId: 'eip155:1', at: AT, assets: [ETH]}}}, 'w1', 'eip155:1')).toBeNull();
    let r = {version: 1 as const};
    for (let i = 0; i < MAX_OBSERVATIONS; i++) r = withObservation(r, {walletId: `w${i}`, chainId: 'bitcoin', at: AT, assets: []});
    expect(() => withObservation(r, {walletId: 'one-more', chainId: 'bitcoin', at: AT, assets: []})).toThrow(/most wallet balances/);
    expect(() => withObservation(r, {walletId: 'w0', chainId: 'bitcoin', at: LATER, assets: []})).not.toThrow();
  });
  test('loose: unknown fields kept through a write; unreadable bytes never overwritten; amounts are integer strings', () => {
    const {m, storage} = memory();
    m.set(WALLET_BALANCES_KEY, JSON.stringify({version: 1, later: 1, observations: {'w1|bitcoin': {walletId: 'w1', chainId: 'bitcoin', at: AT, assets: [{id: 'native', symbol: 'BTC', decimals: 8, amount: '5', note: 'x'}], extra: true}}}));
    writeWalletBalances(storage, r => withObservation(r, {walletId: 'w2', chainId: 'bitcoin', at: AT, assets: []}));
    expect(JSON.parse(m.get(WALLET_BALANCES_KEY)!)).toMatchObject({later: 1, observations: {'w1|bitcoin': {extra: true, assets: [{note: 'x'}]}}});
    m.set(WALLET_BALANCES_KEY, '{"version":1,"observations":{"w1|bitcoin":{"walletId":"w1","chainId":"bitcoin","assets":[{"id":"native","symbol":"BTC","decimals":8,"amount":1.5}]}}}');
    expect(readDeviceRecord(storage, WALLET_BALANCES).unreadable).toBe(true);
    expect(() => writeWalletBalances(storage, r => r)).toThrow(/could not be read/);
    forgetWalletBalances(storage, 'w1');
    expect(m.get(WALLET_BALANCES_KEY)).toContain('"amount":1.5');
  });
});
