import {describe, expect, test} from 'vitest';
import {addressAt, parseExtendedKey, XpubError} from './derive';
import {createScanner, GAP_LIMIT, readAddress, refreshAllowed} from './scan';
import type {Fetcher} from '../balances/http';

// Session AJ (item 36; D2b, A5). The account keys of the published BIP-44/49/84 test vectors (the "abandon … about"
// mnemonic, public test data that holds no funds) and their first receive and change addresses.
const XPUB = 'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj';
const YPUB = 'ypub6Ww3ibxVfGzLrAH1PNcjyAWenMTbbAosGNB6VvmSEgytSER9azLDWCxoJwW7Ke7icmizBMXrzBx9979FfaHxHcrArf3zbeJJJUZPf663zsP';
const ZPUB = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';

describe('deriving addresses on the device', () => {
  test('xpub, ypub and zpub give legacy, wrapped and native SegWit addresses (BIP-44/49/84 vectors)', async () => {
    expect(await addressAt(parseExtendedKey(XPUB), 0, 0)).toBe('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA');
    expect(await addressAt(parseExtendedKey(XPUB), 1, 0)).toBe('1J3J6EvPrv8q6AC3VCjWV45Uf3nssNMRtH');
    expect(await addressAt(parseExtendedKey(YPUB), 0, 0)).toBe('37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf');
    expect(await addressAt(parseExtendedKey(ZPUB), 0, 0)).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    expect(await addressAt(parseExtendedKey(ZPUB), 1, 0)).toBe('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
  });
  test('a private key, a testnet key or a broken one is refused before anything is read', () => {
    expect(() => parseExtendedKey('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi')).toThrow(/private key/);
    expect(() => parseExtendedKey('tpubD6NzVbkrYhZ4XgiXtGrdW5XDAPFCL9h7we1vwNCpn8tGbBcgfVYjXyhWo4E1xkh56hjod1RhGjxbaTLV3X4FyWuejifB9jusQ46QzG87VKp')).toThrow(/testnet/);
    expect(() => parseExtendedKey('hello')).toThrow(XpubError);
    expect(() => parseExtendedKey(ZPUB.slice(0, -1) + (ZPUB.endsWith('s') ? 't' : 's'))).toThrow(/copied whole/);
  });
});

const answer = (address: string, txs: number, funded = 0, spent = 0) => new Response(JSON.stringify({address, chain_stats: {funded_txo_sum: funded, spent_txo_sum: spent, tx_count: txs}, mempool_stats: {tx_count: 0}}), {status: 200});
describe('reading balances from mempool.space (A5)', () => {
  test('a 429 waits for Retry-After, then for 2, 4 s, and stops after three tries with a plain sentence', async () => {
    const waits: number[] = [];
    const busy: Fetcher = async () => new Response('', {status: 429, headers: {'retry-after': '7'}});
    await expect(readAddress('bc1qx', busy, async ms => { waits.push(ms); })).rejects.toThrow('slow down');
    expect(waits).toEqual([7000, 7000]);
    let calls = 0; waits.length = 0;
    const once: Fetcher = async url => ++calls === 1 ? new Response('', {status: 429}) : answer(decodeURIComponent(url.split('/').pop()!), 1, 5000);
    expect(await readAddress('bc1qy', once, async ms => { waits.push(ms); })).toEqual({used: true, sats: 5000n});
    expect(waits).toEqual([2000]);
  });
  test('the scan stops at the gap limit on each chain, batches its reads, and a second scan asks only for new addresses', async () => {
    const watched = parseExtendedKey(ZPUB), first = await addressAt(watched, 0, 0), third = await addressAt(watched, 0, 2);
    const asked: string[] = [];
    const fetcher: Fetcher = async url => { const a = decodeURIComponent(url.split('/').pop()!); asked.push(a); expect(url.startsWith('https://mempool.space/api/address/')).toBe(true); return a === first ? answer(a, 2, 30000, 10000) : a === third ? answer(a, 1, 5000) : answer(a, 0); };
    const scanner = createScanner(fetcher, async () => undefined);
    const result = await scanner.scan(watched);
    expect(result).toEqual({sats: 25000n, used: 2, scanned: 3 + GAP_LIMIT + GAP_LIMIT});
    expect(asked).toHaveLength(3 + GAP_LIMIT + GAP_LIMIT + 2); // batches of 3: each chain's last batch reads one address past its gap
    asked.length = 0;
    expect(await scanner.scan(watched)).toEqual(result);
    expect(asked).toEqual([]);
  });
  test('a refresh at most once every 5 minutes', () => {
    const now = Date.parse('2026-10-29T12:00:00Z');
    expect(refreshAllowed(undefined, now)).toBe(true);
    expect(refreshAllowed('2026-10-29T11:56:00.000Z', now)).toBe(false);
    expect(refreshAllowed('2026-10-29T11:55:00.000Z', now)).toBe(true);
  });
});
