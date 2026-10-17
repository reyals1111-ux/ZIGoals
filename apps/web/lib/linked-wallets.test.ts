import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {LINKED_WALLETS_KEY} from './linked-wallets-key';
import {LINKED_WALLETS, LINK_DUPLICATE_MESSAGE, LINK_INVALID_MESSAGE, LINK_LIMIT_MESSAGE, LINK_UNREADABLE_MESSAGE, MAX_LINKED_WALLETS, displayOf, emptyLinkedWallets, linkWallet, linkedWalletsOf, linkedWalletsSchema, newLinkedWallet, selectedOf, withDisplay, withSelected, withWallet, withoutWallet, writeLinkedWallets, type LinkedWallets} from './linked-wallets';
import {addressShapeOk, base58Payload, canonicalAddress, isBitcoinBase58, isBitcoinSegwit, isEvmAddress, isZigAddress, shortAddress, verifyAddress} from './wallet-address';
import {readDeviceRecord} from './device-record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS, collectEverything} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {DEVICE_PARTS, NEVER_RESTORED, planParts} from './restore/plan';
import {EXTRAS_DEVICE_KEYS} from './vault/extras-keys';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {buildShowcase} from './showcase-data';

// Session AE (Part 6, ADR-027): the linked-wallets device record. Fictional addresses only: the public BIP-173/BIP-350
// test vectors, the Bitcoin wiki's example addresses and ZIGChain addresses made from fixed bytes.
const memory = () => { const m = new Map<string, string>(); return {m, storage: {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage}; };
const ZIG_A = toBech32('zig', new Uint8Array(20).fill(9)), ZIG_B = toBech32('zig', new Uint8Array(20).fill(7));
const EVM_A = '0x52908400098527886E0F7030069857D2E4169EE7';
const SEGWIT_V0 = 'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4', SEGWIT_V0_32 = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';
const TAPROOT = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0', SEGWIT_V16 = 'BC1SW50QGDZ25J';
const P2PKH = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', P2SH = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', P2PKH_ZEROS = '1111111111111111111114oLvT2';

// A bech32/bech32m encoder for the tests only (the app never encodes): a valid program under the wrong checksum constant.
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l', GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const polymod = (values: number[]) => { let chk = 1; for (const v of values) { const top = chk >>> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]!; } return chk >>> 0; };
const expand = (hrp: string) => [...[...hrp].map(c => c.charCodeAt(0) >> 5), 0, ...[...hrp].map(c => c.charCodeAt(0) & 31)];
const toWords = (bytes: number[]) => { let acc = 0, bits = 0; const out: number[] = []; for (const b of bytes) { acc = (acc << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; out.push((acc >> bits) & 31); } acc &= (1 << bits) - 1; } if (bits) out.push((acc << (5 - bits)) & 31); return out; };
const encode = (hrp: string, data: number[], constant: number) => { const mod = polymod([...expand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ constant; return hrp + '1' + [...data, ...[0, 1, 2, 3, 4, 5].map(i => (mod >> (5 * (5 - i))) & 31)].map(d => CHARSET[d]).join(''); };
const BECH32 = 1, BECH32M = 0x2bc830a3;

describe('Session AE linked-wallets key (ADR-027): personal device data, exported, erased, never synced or restored', () => {
  test('versioned; a personal device record; in Export everything and the data catalog as device-only; no module, sync section or restore part', () => {
    expect(LINKED_WALLETS_KEY).toBe('zigoals:linked-wallets:v1');
    expect(DEVICE_RECORD_KEYS).toContain(LINKED_WALLETS_KEY); expect(NON_PERSONAL_KEYS).not.toContain(LINKED_WALLETS_KEY);
    expect(DEVICE_KEYS.linkedWallets).toBe(LINKED_WALLETS_KEY); expect(EVERYTHING_KEYS).toContain(LINKED_WALLETS_KEY);
    expect(Object.values(MODULE_KEYS)).not.toContain(LINKED_WALLETS_KEY);
    expect(EXTRAS_DEVICE_KEYS).not.toContain(LINKED_WALLETS_KEY);
    expect(DEVICE_ONLY.some(e => e.key === LINKED_WALLETS_KEY)).toBe(true); expect(SYNCED.some(e => e.key === LINKED_WALLETS_KEY)).toBe(false);
    expect(DEVICE_PARTS.some(p => p.key === LINKED_WALLETS_KEY)).toBe(false);
    expect(NEVER_RESTORED).toContain('linked wallet addresses');
    expect(LINKED_WALLETS.key).toBe(LINKED_WALLETS_KEY);
  });
  test('no sync module or Worker names the key', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : files(path)) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []; });
    const sync = [...files(join(__dirname, 'vault')), ...files(join(__dirname, 'sync-offer')), join(__dirname, 'sync-homes-store.ts'), ...files(join(__dirname, '..', '..', '..', 'workers'))];
    expect(sync.length).toBeGreaterThan(20);
    for (const file of sync) expect(readFileSync(file, 'utf8'), file).not.toMatch(/linked-wallets|LINKED_WALLETS/);
  });
  test('a device holding it is not new; the account erase removes it', () => {
    const {m, storage} = memory();
    storage.setItem(LINKED_WALLETS_KEY, JSON.stringify({version: 1}));
    expect(noExistingData(storage)).toBe(false);
    forgetAaDeviceRecords(storage);
    expect(m.has(LINKED_WALLETS_KEY)).toBe(false);
  });
  test('Export everything copies it as stored; a restore never offers it', () => {
    const stored = {version: 1, wallets: [newLinkedWallet({kind: 'cosmos', wallet: 'leap', label: 'Leap', address: ZIG_A}, new Date('2026-10-17T10:00:00.000Z'), 'w1')], display: 'EUR', later: {x: 1}};
    const collected = collectEverything({[LINKED_WALLETS_KEY]: JSON.stringify(stored)}, {now: new Date('2026-10-17T12:00:00.000Z'), version: '0', commit: 'test', localSimulation: null});
    expect(collected.json.device.linkedWallets).toEqual(stored);
    expect(planParts(collected.json as never).map(p => p.id).join(' ')).not.toMatch(/linkedWallets/);
  });
  test('the Showcase never writes it', () => {
    for (const aa of [false, true]) expect(Object.keys(buildShowcase('2026-10-17', 'UTC', {aa}).records)).not.toContain(LINKED_WALLETS_KEY);
  });
});

describe('the record: loose, versioned, capped, checked on write', () => {
  test('frozen reader: the shape this build writes reads back as it is; unknown fields and a newer kind are kept through a write and left out of what shows', () => {
    const {m, storage} = memory();
    const entry = newLinkedWallet({kind: 'evm', wallet: 'io.metamask', label: '  MetaMask  ', address: EVM_A}, new Date('2026-10-17T10:00:00.000Z'), 'w1');
    expect(entry).toEqual({id: 'w1', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM_A, addedAt: '2026-10-17T10:00:00.000Z'});
    const stored = {version: 1, wallets: [entry, {id: 'w9', kind: 'solana', wallet: 'later', label: 'Later', address: 'So1…', addedAt: '2026-10-17T10:00:00.000Z', tag: 1}], selected: 'w1', display: 'BTC', later: {x: 1}};
    storage.setItem(LINKED_WALLETS_KEY, JSON.stringify(stored));
    const read = readDeviceRecord(storage, LINKED_WALLETS);
    expect(read).toEqual({data: stored, unreadable: false});
    expect(linkedWalletsOf(read.data)).toEqual([entry]); expect(selectedOf(read.data)).toBe('w1'); expect(displayOf(read.data)).toBe('BTC');
    writeLinkedWallets(storage, r => withDisplay(r, 'USD'));
    expect(JSON.parse(m.get(LINKED_WALLETS_KEY)!)).toEqual({...stored, display: 'USD'});
    // A display currency or a selection this build does not know reads as the defaults.
    expect(displayOf({version: 1, display: 'GBP'})).toBe('ZIG'); expect(selectedOf({version: 1, selected: 'gone'})).toBe('app'); expect(selectedOf(emptyLinkedWallets())).toBe('app');
    expect(linkedWalletsSchema.parse({version: 1})).toEqual({version: 1});
  });
  test('garbage, another version or more than 12 entries read as unreadable; a write is then refused and the bytes stay', () => {
    const {m, storage} = memory();
    const thirteen = JSON.stringify({version: 1, wallets: Array.from({length: 13}, (_, i) => ({id: `w${i}`}))});
    for (const bad of ['{', '[]', '{"version":2}', '{"version":1,"wallets":"x"}', thirteen]) {
      storage.setItem(LINKED_WALLETS_KEY, bad);
      expect(readDeviceRecord(storage, LINKED_WALLETS)).toEqual({data: emptyLinkedWallets(), unreadable: true});
      expect(() => writeLinkedWallets(storage, r => withDisplay(r, 'EUR'))).toThrow(LINK_UNREADABLE_MESSAGE);
      expect(m.get(LINKED_WALLETS_KEY)).toBe(bad);
    }
  });
  test('at most 12 wallets; the same address twice is refused', () => {
    let record: LinkedWallets = emptyLinkedWallets();
    for (let i = 0; i < MAX_LINKED_WALLETS; i++) record = withWallet(record, newLinkedWallet({kind: 'cosmos', wallet: 'leap', label: 'Leap', address: toBech32('zig', new Uint8Array(20).fill(i + 1))}, new Date(), `w${i}`));
    expect(linkedWalletsOf(record)).toHaveLength(12);
    expect(() => withWallet(record, newLinkedWallet({kind: 'btc', wallet: 'bitcoin-watch', label: 'Bitcoin', address: P2PKH}))).toThrow(LINK_LIMIT_MESSAGE);
    const one = withWallet(emptyLinkedWallets(), newLinkedWallet({kind: 'evm', wallet: 'io.rabby', label: 'Rabby', address: EVM_A}));
    expect(() => withWallet(one, newLinkedWallet({kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM_A.toLowerCase()}))).toThrow(LINK_DUPLICATE_MESSAGE);
  });
  test('an address that fails its checks is never written, by link or by a hand-made change', async () => {
    const {m, storage} = memory();
    for (const [kind, address] of [['cosmos', ZIG_A.slice(0, -1) + (ZIG_A.endsWith('q') ? 'p' : 'q')], ['cosmos', toBech32('cosmos', new Uint8Array(20).fill(9))], ['evm', '0x1234'], ['evm', EVM_A + '0'], ['btc', P2PKH.slice(0, -1) + '3'], ['btc', 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx']] as const)
      await expect(linkWallet(storage, {kind, wallet: 'x', label: 'X', address}), `${kind} ${address}`).rejects.toThrow(LINK_INVALID_MESSAGE);
    expect(m.has(LINKED_WALLETS_KEY)).toBe(false);
    const bad = {id: 'w1', kind: 'cosmos', wallet: 'leap', label: 'Leap', address: 'zig1nothing', addedAt: '2026-10-17T10:00:00.000Z'};
    expect(() => writeLinkedWallets(storage, r => ({...r, wallets: [bad]}))).toThrow(LINK_INVALID_MESSAGE);
    expect(m.has(LINKED_WALLETS_KEY)).toBe(false);
  });
  test('link, select, remove: the card goes back to the app\'s wallet when its wallet is removed; bech32 is stored in lower case', async () => {
    const {m, storage} = memory();
    const a = await linkWallet(storage, {kind: 'btc', wallet: 'bitcoin-watch', label: 'Bitcoin', address: SEGWIT_V0});
    expect(a.address).toBe(SEGWIT_V0.toLowerCase());
    const b = await linkWallet(storage, {kind: 'cosmos', wallet: 'cosmostation', label: 'Cosmostation', address: ZIG_B});
    writeLinkedWallets(storage, r => withSelected(r, a.id));
    expect(() => withSelected(readDeviceRecord(storage, LINKED_WALLETS).data, 'nope')).toThrow();
    writeLinkedWallets(storage, r => withoutWallet(r, a.id));
    const after = readDeviceRecord(storage, LINKED_WALLETS).data;
    expect(linkedWalletsOf(after).map(w => w.id)).toEqual([b.id]); expect(after.selected).toBeUndefined(); expect(selectedOf(after)).toBe('app');
    expect(JSON.parse(m.get(LINKED_WALLETS_KEY)!).version).toBe(1);
  });
});

describe('address checks (no network)', () => {
  test('ZIGChain: bech32 with the zig prefix and a 20- or 32-byte payload', () => {
    expect(isZigAddress(ZIG_A)).toBe(true); expect(isZigAddress(toBech32('zig', new Uint8Array(32).fill(3)))).toBe(true);
    expect(isZigAddress(toBech32('cosmos', new Uint8Array(20).fill(9)))).toBe(false);
    expect(isZigAddress(toBech32('zig', new Uint8Array(19).fill(9)))).toBe(false);
    expect(isZigAddress(encode('zig', toWords(Array(20).fill(9)), BECH32M))).toBe(false); // the right bytes under bech32m
    expect(isZigAddress(ZIG_A.slice(0, 5) + ZIG_A.slice(5, 6).toUpperCase() + ZIG_A.slice(6))).toBe(false); // mixed case
  });
  test('Bitcoin bech32 (v0) and bech32m (v1–v16) per BIP-173/BIP-350; the wrong constant, network or a bad checksum is refused', () => {
    for (const ok of [SEGWIT_V0, SEGWIT_V0.toLowerCase(), SEGWIT_V0_32, TAPROOT, SEGWIT_V16, 'bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs']) expect(isBitcoinSegwit(ok), ok).toBe(true);
    const program = toWords(Array.from({length: 32}, (_, i) => i));
    expect(isBitcoinSegwit(encode('bc', [1, ...program], BECH32M))).toBe(true);
    expect(isBitcoinSegwit(encode('bc', [1, ...program], BECH32))).toBe(false); // v1 under bech32
    expect(isBitcoinSegwit(encode('bc', [0, ...toWords(Array(20).fill(1))], BECH32M))).toBe(false); // v0 under bech32m
    expect(isBitcoinSegwit(encode('bc', [0, ...toWords(Array(21).fill(1))], BECH32))).toBe(false); // v0 must be 20 or 32 bytes
    for (const bad of [SEGWIT_V0.slice(0, -1) + '5', TAPROOT.slice(0, -1) + '1', 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4x', 'bc1', '']) expect(isBitcoinSegwit(bad), bad).toBe(false);
  });
  test('Bitcoin base58check: version 0 (1…) and 5 (3…) with a double SHA-256 checksum', async () => {
    for (const ok of [P2PKH, P2SH, P2PKH_ZEROS]) { expect(base58Payload(ok), ok).not.toBeNull(); expect(await isBitcoinBase58(ok), ok).toBe(true); expect(await verifyAddress('btc', ok)).toBe(true); }
    for (const bad of [P2PKH.slice(0, -1) + '3', P2SH.slice(0, -1) + 'z', '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN0', '2BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn']) expect(await verifyAddress('btc', bad), bad).toBe(false);
    // The shape check alone (used on every write) passes a well-formed base58 string; only the async check reads its checksum.
    expect(addressShapeOk('btc', P2PKH.slice(0, -1) + '3')).toBe(true);
  });
  test('EVM: 0x and 40 hex digits; spelling and shortening', () => {
    expect(isEvmAddress(EVM_A)).toBe(true); expect(isEvmAddress(EVM_A.toLowerCase())).toBe(true);
    for (const bad of ['0x', EVM_A.slice(2), EVM_A + 'a', '0xZZ908400098527886E0F7030069857D2E4169EE7']) expect(isEvmAddress(bad)).toBe(false);
    expect(canonicalAddress('btc', SEGWIT_V0)).toBe(SEGWIT_V0.toLowerCase()); expect(canonicalAddress('btc', P2PKH)).toBe(P2PKH); expect(canonicalAddress('evm', EVM_A)).toBe(EVM_A);
    expect(shortAddress(ZIG_A)).toBe(`${ZIG_A.slice(0, 8)}…${ZIG_A.slice(-4)}`);
  });
});
