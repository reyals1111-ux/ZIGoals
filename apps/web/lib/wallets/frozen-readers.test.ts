import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import * as AE from './frozen-ae-4f92495/linked-wallets';
import {LINKED_WALLETS, linkedWalletsOf, newLinkedWallet, withChains, withWallet, writeLinkedWallets} from '../linked-wallets';
import {readDeviceRecord} from '../device-record';

/**
 * Session AF (L2b, ADR-028 H16 §11.4, L2 design §6; `TIER 3 (storage)`): the frozen-reader proof for
 * `zigoals:linked-wallets:v1`'s additive change, run on AE's own modules. `frozen-ae-4f92495/` holds byte-exact copies of
 * the four files Alpha #44 (main 4f92495) reads the record with (their git blob ids are checked below, so the copies can
 * never drift into this build's code). This build writes the kind `solana` and the fields `chains` and `via`; AE's build
 * must keep every entry and field through its own writes, hide the kind it does not know, and show the rest as before.
 * The lead's release-wide proof (scripts/frozen-readers.mjs, #37–#44) gains the fixture row listed in L2b.md.
 */
const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }} as Pick<Storage, 'getItem' | 'setItem'>}; };
const gitBlob = (file: string) => { const bytes = readFileSync(join(__dirname, 'frozen-ae-4f92495', file)); return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'); };
const ZIG = toBech32('zig', new Uint8Array(20).fill(9)), EVM = '0x52908400098527886E0F7030069857D2E4169EE7', SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const AT = new Date('2026-10-19T08:00:00.000Z');

describe('AE (#44) reads and writes this build\'s linked-wallets record', () => {
  test('the frozen copies are main 4f92495\'s files, byte for byte', () => {
    expect({
      'device-record.ts': gitBlob('device-record.ts'), 'linked-wallets-key.ts': gitBlob('linked-wallets-key.ts'),
      'linked-wallets.ts': gitBlob('linked-wallets.ts'), 'wallet-address.ts': gitBlob('wallet-address.ts'),
    }).toEqual({
      'device-record.ts': '9b5ddb97d72e46ca44e892b53da7252ecbd19049', 'linked-wallets-key.ts': '1cbfcd21d51175803c6f4d913e052f2a42ab09c6',
      'linked-wallets.ts': '93a52cfa388c9469f34620109990fc3fa2d7fc22', 'wallet-address.ts': '494f72d1050334e9a0432ad171dc9db0b3389daf',
    });
  });
  test('the new kind is kept and hidden, the new fields are kept and ignored, through AE\'s own writes', () => {
    const {m, storage} = memory();
    // This build links three wallets, one of each new shape.
    writeLinkedWallets(storage, r => withWallet(withWallet(withWallet(r,
      newLinkedWallet({kind: 'cosmos', wallet: 'keplr', label: 'Keplr', address: ZIG, via: 'extension'}, AT, 'w1')),
      newLinkedWallet({kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, via: 'in-app-browser', chains: ['eip155:8453', 'eip155:42161']}, AT, 'w2')),
      newLinkedWallet({kind: 'solana', wallet: 'solana:phantom', label: 'Phantom', address: SOL, via: 'extension'}, AT, 'w3')));
    const written = m.get(AE.LINKED_WALLETS_KEY)!;
    expect(JSON.parse(written).wallets.map((w: {kind: string}) => w.kind)).toEqual(['cosmos', 'evm', 'solana']);
    // AE reads it: the record parses, the Solana entry is hidden, the others show with AE's fields only.
    const ae = readDeviceRecord(storage, AE.LINKED_WALLETS);
    expect(ae.unreadable).toBe(false);
    expect(AE.linkedWalletsOf(ae.data)).toEqual([
      {id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'Keplr', address: ZIG, addedAt: AT.toISOString()},
      {id: 'w2', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT.toISOString()},
    ]);
    // AE writes twice (a display choice, then a link of its own): every entry and field of this build survives.
    AE.writeLinkedWallets(storage, r => AE.withSelected(AE.withDisplay(r, 'EUR'), 'w2'));
    AE.writeLinkedWallets(storage, r => AE.withWallet(r, AE.newLinkedWallet({kind: 'btc', wallet: 'bitcoin-watch', label: 'Bitcoin', address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'}, AT, 'w4')));
    const after = JSON.parse(m.get(AE.LINKED_WALLETS_KEY)!);
    expect(after.wallets.slice(0, 3)).toEqual(JSON.parse(written).wallets);
    expect(after).toMatchObject({display: 'EUR', selected: 'w2'});
    // AE removes the EVM wallet: the Solana entry it cannot show still stays.
    AE.writeLinkedWallets(storage, r => AE.withoutWallet(r, 'w2'));
    expect(JSON.parse(m.get(AE.LINKED_WALLETS_KEY)!).wallets.map((w: {id: string}) => w.id)).toEqual(['w1', 'w3', 'w4']);
    // And this build reads everything back, the new fields included.
    expect(linkedWalletsOf(readDeviceRecord(storage, LINKED_WALLETS).data).map(w => [w.id, w.kind, w.via ?? null, w.chains ?? null])).toEqual([['w1', 'cosmos', 'extension', null], ['w3', 'solana', 'extension', null], ['w4', 'btc', null, null]]);
  });
  test('this build keeps what a newer build may add: an unknown via is kept on write and not shown; odd chain ids are not shown', () => {
    const {m, storage} = memory();
    m.set(AE.LINKED_WALLETS_KEY, JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT.toISOString(), via: 'passkey', chains: ['eip155:1', 'not a chain', 'eip155:1'], later: {x: 1}}, {id: 'w9', kind: 'ton', wallet: 'later', label: 'Later', address: 'EQ…', addedAt: AT.toISOString()}]}));
    const record = readDeviceRecord(storage, LINKED_WALLETS);
    expect(linkedWalletsOf(record.data)).toEqual([{id: 'w1', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT.toISOString(), chains: ['eip155:1']}]);
    writeLinkedWallets(storage, r => withChains(r, 'w1', ['eip155:10', 'eip155:10', 'eip155:56']));
    const stored = JSON.parse(m.get(AE.LINKED_WALLETS_KEY)!);
    expect(stored.wallets[0]).toEqual({id: 'w1', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT.toISOString(), via: 'passkey', chains: ['eip155:10', 'eip155:56'], later: {x: 1}});
    expect(stored.wallets[1].kind).toBe('ton');
  });
});
