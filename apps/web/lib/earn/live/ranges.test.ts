import {describe, expect, it} from 'vitest';
import fixture from '../fixtures/live-2026-10-19.json';
import {RANGES, chainFailures, defillamaFailures, inRange, oroswapFailures, valdoraFailures} from './ranges.mjs';
import {REASON_WORDS, UNAVAILABLE_REASONS, liveEnvelopeSchema, liveOk, liveUnavailable} from './envelope';
import * as z from 'zod';

/** Session AF (`TIER 3 (data formats)`): the sane ranges accept the recorded read and refuse what nobody should believe. */
type Answer = {data: Record<string, unknown>};
const a = fixture.answers as unknown as Record<string, Answer>;
const copy = <T>(v: T): T => structuredClone(v);

describe('sane ranges', () => {
  it('accept every recorded figure', () => {
    expect(chainFailures(a.chainMainnet!.data)).toEqual([]);
    expect(chainFailures(a.chainTestnet!.data)).toEqual([]);
    expect(oroswapFailures(a.oroswap!.data)).toEqual([]);
    expect(defillamaFailures(a.defillama!.data)).toEqual([]);
    const v = a.valdora!.data as {rate: {zigPerStZig: string; dexZigPerStZig: string}};
    expect(valdoraFailures({...v, contractZigPerStZig: v.rate.zigPerStZig, dexZigPerStZig: v.rate.dexZigPerStZig})).toEqual([]);
  });
  it('refuse zero, negative, absurd and unknown values; unknown is never zero', () => {
    for (const name of Object.keys(RANGES)) for (const bad of ['', 'n/a', NaN, Infinity, -Infinity, '1e3', '--1']) expect(inRange(name, bad as never), `${name} ${String(bad)}`).toBe(false);
    expect(inRange('inflation', 0)).toBe(false);
    expect(inRange('inflation', 0.9)).toBe(false);
    expect(inRange('grossApr', '0.0574')).toBe(true);
    expect(inRange('apy', -1)).toBe(false);
    expect(inRange('apy', 250)).toBe(false);
    expect(inRange('stZigRatio', '0.2')).toBe(false);
    expect(() => inRange('no-such-range', 1)).toThrow();
    const chain = copy(a.chainMainnet!.data) as {mint: {inflation: string}; staking: {bondedTokens: string; supply: string}; apr: {blockSeconds: string; gross: string}};
    chain.mint.inflation = '0.9'; chain.staking.bondedTokens = chain.staking.supply; chain.apr.blockSeconds = '0'; chain.apr.gross = '0';
    expect(chainFailures(chain)).toEqual(expect.arrayContaining(['inflation', 'bondedTokens', 'blockSeconds', 'grossApr']));
    const oro = copy(a.oroswap!.data) as {pools: {reserves: {amount: string}[]; price: {value: string}; feeBps: number}[]};
    oro.pools[0]!.reserves[0]!.amount = '0'; oro.pools[0]!.price.value = '1000'; oro.pools[1]!.feeBps = 20_000;
    expect(oroswapFailures(oro)).toEqual(expect.arrayContaining(['reserves:zig-usdc', 'price:zig-usdc', 'fee:zig-atom']));
    const llama = copy(a.defillama!.data) as {protocols: Record<string, {tvlUsd: number}>; pools: {rows: {apy: number}[]}};
    llama.protocols.oroswap!.tvlUsd = -5; llama.pools.rows[0]!.apy = 900;
    expect(defillamaFailures(llama).length).toBe(2);
  });
});

describe('the live envelope, version 1', () => {
  const schema = liveEnvelopeSchema(z.object({n: z.string()}).strict());
  const source = {name: 'ZIGChain mainnet LCD (official)', origin: 'https://api.zigchain.com'};
  it('reads both outcomes and every recorded answer', () => {
    expect(schema.parse(liveOk(source, {n: '1'}, {height: '5', observedAt: '2026-10-18T20:00:00.000Z', fetchedAt: '2026-10-18T20:00:01.000Z'})).status).toBe('ok');
    expect(schema.parse(liveUnavailable(source, 'TIMEOUT', '2026-10-18T20:00:01.000Z')).status).toBe('unavailable');
    for (const [name, answer] of Object.entries(a)) expect(liveEnvelopeSchema(z.unknown()).safeParse(answer).success, name).toBe(true);
  });
  it('refuses a mixed or unknown shape: unavailable never carries data, ok always does', () => {
    expect(schema.safeParse({...liveUnavailable(source, 'TIMEOUT', '2026-10-18T20:00:01.000Z'), data: {n: '1'}}).success).toBe(false);
    expect(schema.safeParse({...liveOk(source, {n: '1'}, {fetchedAt: '2026-10-18T20:00:01.000Z'}), data: null}).success).toBe(false);
    expect(schema.safeParse({...liveOk(source, {n: '1'}, {fetchedAt: '2026-10-18T20:00:01.000Z'}), version: 2}).success).toBe(false);
    expect(schema.safeParse({...liveUnavailable(source, 'TIMEOUT', '2026-10-18T20:00:01.000Z'), reason: 'BECAUSE'}).success).toBe(false);
    expect(schema.safeParse({...liveOk(source, {n: '1'}, {fetchedAt: '2026-10-18T20:00:01.000Z'}), source: {name: 'x', origin: 'http://evil'}}).success).toBe(false);
  });
  it('has plain words for every reason', () => {
    for (const reason of UNAVAILABLE_REASONS) expect(REASON_WORDS[reason]).toMatch(/^[a-z].{10,}$/);
  });
});
