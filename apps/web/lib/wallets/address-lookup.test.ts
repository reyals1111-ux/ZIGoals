import {describe, expect, it} from 'vitest';
import {chainWords, recogniseAddress} from './address-lookup';

// Session AL Part 15 (AL-COMPETITOR-GAP-023, C-TK-09): a pasted public address is recognised on this device, on the chains
// ZIGoals already reads, with a plain reason when it is not one. Public test addresses only (no person's wallet).
const ZIG = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';
describe('recogniseAddress', () => {
  it('knows each kind by its own shape and names the chains it is read on', async () => {
    expect(await recogniseAddress(` ${ZIG} `)).toMatchObject({ok: true, kind: 'cosmos', address: ZIG, label: 'ZIGChain address', chains: 'ZIGChain and Cosmos Hub'});
    expect(await recogniseAddress(ZIG.toUpperCase())).toMatchObject({ok: true, kind: 'cosmos', address: ZIG});
    expect(await recogniseAddress('0x00000000219ab540356cBB839Cbe05303d7705Fa')).toMatchObject({ok: true, kind: 'evm', chains: 'Ethereum, Arbitrum, Base, OP Mainnet, Polygon and BNB Chain'});
    expect(await recogniseAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toMatchObject({ok: true, kind: 'solana', chains: 'Solana'});
    expect(await recogniseAddress('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4')).toMatchObject({ok: true, kind: 'btc', address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', chains: 'Bitcoin'});
    expect(await recogniseAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toMatchObject({ok: true, kind: 'btc'});
  });
  it('refuses with a reason, never a guess: a typo, a name, a validator, a testnet or unknown text', async () => {
    const reason = async (text: string) => { const r = await recogniseAddress(text); expect(r.ok).toBe(false); return r.ok ? '' : r.reason; };
    expect(await reason('')).toMatch(/Paste a public address first/);
    expect(await reason(`${ZIG.slice(0, -1)}q`)).toMatch(/checksum does not match/);
    expect(await reason('vitalik.eth')).toMatch(/not looked up/);
    expect(await reason('zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl')).toMatch(/validator’s operator address/);
    expect(await reason('0x1234')).toMatch(/0x and 40/);
    expect(await reason('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')).toMatch(/does not recognise/);
    expect(await reason('hello world')).toMatch(/does not recognise/);
    for (const text of ['', 'vitalik.eth', 'hello world']) expect(await reason(text)).toMatch(/Nothing was read or saved\.$/);
  });
  it('chainWords joins the chain names in plain English', () => {
    expect(chainWords('btc', 'bc1q')).toBe('Bitcoin');
    expect(chainWords('cosmos', ZIG)).toBe('ZIGChain and Cosmos Hub');
  });
});
