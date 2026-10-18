import {createHash} from 'node:crypto';
import {fromBech32, toBase64, toBech32} from '@cosmjs/encoding';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {validatorsWireSchema} from '../chain/validators-wire';
import {CHAIN_CACHE_MS, CHAIN_CLIENT_READS_PER_MINUTE, chainRelay} from './chain-relay';
import {readValidators, shareOf, unavailableValidators, unitDecimalOf, valconsOf} from './chain-validators';

// Session AF (ADR-028 H16, H58): GET /api/chain/validators, against a recorded-shape LCD (fields as the official LCD
// answered on 2026-10-18; values fictional).
const A = toBech32('zigvaloper', new Uint8Array(20).fill(2)), B = toBech32('zigvaloper', new Uint8Array(20).fill(3));
const keyA = new Uint8Array(32).fill(7), keyB = new Uint8Array(32).fill(8);
const valcons = (key: Uint8Array) => toBech32('zigvalcons', new Uint8Array(createHash('sha256').update(key).digest()).slice(0, 20));
const selfOf = (v: string) => toBech32('zig', fromBech32(v, 90).data);
const row = (operator: string, key: Uint8Array, status: string, tokens: string, moniker: string) => ({operator_address: operator, consensus_pubkey: {'@type': '/cosmos.crypto.ed25519.PubKey', key: toBase64(key)}, jailed: false, status, tokens, delegator_shares: tokens + '.000000000000000000', description: {moniker, identity: '', website: 'https://example.invalid/' + moniker, security_contact: 'x', details: ''}, unbonding_height: '0', commission: {commission_rates: {rate: '0.050000000000000000', max_rate: '0.200000000000000000', max_change_rate: '0.010000000000000000'}, update_time: '2025-10-14T08:39:33.270154839Z'}, min_self_delegation: '1'});
function lcd(host = 'https://testnet-api.zigchain.com', chainId = 'zig-test-2', over: {height?: (path: string) => string} = {}) {
  const urls: string[] = [];
  const fetcher = (async (input: string, init?: RequestInit) => {
    urls.push(input);
    const url = new URL(input), path = url.pathname;
    expect(url.origin).toBe(host);
    expect(init?.method).toBe('GET');
    if (!path.endsWith('/blocks/latest')) expect(new Headers(init?.headers).get('x-cosmos-block-height')).toBe('8290600');
    const headers = {'x-cosmos-block-height': over.height?.(path) ?? '8290600'};
    if (path.endsWith('/blocks/latest')) return Response.json({block: {header: {height: '8290600', chain_id: chainId, time: '2026-10-18T21:00:00.123456789Z'}}}, {headers});
    if (path.endsWith('/staking/v1beta1/validators')) return Response.json({validators: [row(B, keyB, 'BOND_STATUS_UNBONDED', '45000000000000000000', 'Beta'), row(A, keyA, 'BOND_STATUS_BONDED', '300000000000000000000', 'Alpha')], pagination: {next_key: null, total: '2'}}, {headers});
    if (path.endsWith('/signing_infos')) return Response.json({info: [{address: valcons(keyA), start_height: '1', index_offset: '9', jailed_until: '1970-01-01T00:00:00Z', tombstoned: false, missed_blocks_counter: '7'}], pagination: {next_key: null}}, {headers});
    if (path.endsWith('/slashing/v1beta1/params')) return Response.json({params: {signed_blocks_window: '35000', min_signed_per_window: '0.8'}}, {headers});
    if (path.endsWith('/staking/v1beta1/pool')) return Response.json({pool: {not_bonded_tokens: '1', bonded_tokens: '1200000000000000000000'}}, {headers});
    if (path === `/cosmos/staking/v1beta1/validators/${A}/delegations/${selfOf(A)}`) return Response.json({delegation_response: {delegation: {}, balance: {denom: 'azig', amount: '100000000000000000000'}}}, {headers});
    if (path === `/cosmos/staking/v1beta1/validators/${B}/delegations/${selfOf(B)}`) return Response.json({code: 5, message: 'delegation not found', details: []}, {status: 404, headers});
    throw Error('unexpected ' + path);
  }) as unknown as typeof fetch;
  return {urls, fetcher};
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('readValidators', () => {
  it('reads every fact at one height from the network\'s own LCD and answers the fixed wire shape, sorted by name', async () => {
    const {urls, fetcher} = lcd();
    const wire = await readValidators('zig-test-2', fetcher);
    expect(validatorsWireSchema.parse(wire)).toEqual(wire);
    expect(wire).toMatchObject({version: 1, status: 'ok', network: 'zig-test-2', height: '8290600', observedAt: '2026-10-18T21:00:00.123Z', source: 'https://testnet-api.zigchain.com', bondedTotal: '1200000000000000000000'});
    expect(wire.validators.map(v => v.moniker)).toEqual(['Alpha', 'Beta']);
    expect(wire.validators[0]).toEqual({operator: A, moniker: 'Alpha', website: 'https://example.invalid/Alpha', status: 'bonded', jailed: false, tombstoned: false, tokens: '300000000000000000000', votingPowerShare: '0.25',
      commission: {rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2025-10-14T08:39:33.270Z'}, selfBond: '100000000000000000000', uptime: {window: 35000, missed: 7, signedShare: '0.9998'}});
    // Unbonded: no share of the bonded total, no signing info (null, not zero), and no self-bond (the chain's "not found").
    expect(wire.validators[1]).toMatchObject({operator: B, status: 'unbonded', votingPowerShare: '0', tombstoned: null, uptime: null, selfBond: '0'});
    expect(urls.length).toBeLessThanOrEqual(8);
  });
  it('mainnet reads api.zigchain.com only', async () => {
    const {urls, fetcher} = lcd('https://api.zigchain.com', 'zigchain-1');
    expect((await readValidators('zigchain-1', fetcher)).source).toBe('https://api.zigchain.com');
    expect(urls.every(u => u.startsWith('https://api.zigchain.com/cosmos/'))).toBe(true);
  });
  it('fails closed on the other network, a different block, a refused answer or another host', async () => {
    await expect(readValidators('zig-test-2', lcd('https://testnet-api.zigchain.com', 'zigchain-1').fetcher)).rejects.toThrow('another network');
    await expect(readValidators('zig-test-2', lcd('https://testnet-api.zigchain.com', 'zig-test-2', {height: p => p.endsWith('/pool') ? '8290601' : '8290600'}).fetcher)).rejects.toThrow('different block');
    await expect(readValidators('zig-test-2', (async () => new Response('', {status: 503})) as unknown as typeof fetch)).rejects.toThrow('did not answer');
    await expect(readValidators('staging' as 'zig-test-2', lcd().fetcher)).rejects.toThrow('Unsupported');
  });
  it('exact decimals, never floats', async () => {
    expect(shareOf(1n, 3n)).toBe('0.333333333333333333');
    expect(shareOf(0n, 3n)).toBe('0'); expect(shareOf(5n, 5n)).toBe('1'); expect(shareOf(1n, 0n)).toBe('0');
    expect(unitDecimalOf('0.050000000000000000')).toBe('0.05'); expect(unitDecimalOf('1.000000000000000000')).toBe('1'); expect(unitDecimalOf('0.000000000000000000')).toBe('0');
    expect(() => unitDecimalOf('1.5')).toThrow();
    expect(await valconsOf({'@type': '/cosmos.crypto.ed25519.PubKey', key: toBase64(keyA)})).toBe(valcons(keyA));
    expect(await valconsOf({'@type': '/cosmos.crypto.secp256k1.PubKey', key: toBase64(keyA)})).toBeUndefined();
  });
  it('the unavailable answer is the wire shape with a reason and no validators', () => {
    expect(validatorsWireSchema.parse(unavailableValidators('zigchain-1'))).toMatchObject({status: 'unavailable', validators: [], source: 'https://api.zigchain.com'});
  });
});
describe('the chain relay (positions-relay pattern)', () => {
  it('one read per key per 60 s, shared while it is read; a failed read is not kept; 10 reads a minute per client', async () => {
    let t = 1_000_000, reads = 0, fail = false;
    const relay = chainRelay({now: () => t, read: async key => { reads++; await Promise.resolve(); if (fail) throw Error('upstream'); return key; }});
    await Promise.all([relay('zig-test-2', 'a'), relay('zig-test-2', 'b')]); expect(reads).toBe(1);
    t += CHAIN_CACHE_MS - 1; expect(await relay('zig-test-2', 'c')).toEqual({value: 'zig-test-2'}); expect(reads).toBe(1);
    t += 1; await relay('zig-test-2', 'c'); expect(reads).toBe(2);
    fail = true; t += CHAIN_CACHE_MS; await expect(relay('zig-test-2', 'd')).rejects.toThrow(); fail = false; await relay('zig-test-2', 'd'); expect(reads).toBe(4);
    const many = chainRelay({now: () => t, read: async key => key});
    for (let i = 0; i < CHAIN_CLIENT_READS_PER_MINUTE; i++) await many(`k${i}`, 'one');
    expect(await many('another', 'one')).toEqual({retryAfter: 60});
    expect(await many('k0', 'one')).toEqual({value: 'k0'});
  });
});
describe('GET /api/chain/validators', () => {
  it('strict query; upstream failure answers 200 unavailable (H58); success the wire; no-store', async () => {
    const {GET} = await import('../../app/api/chain/validators/route');
    for (const bad of ['', '?network=zigchain-2', '?network=zig-test-2&network=zigchain-1', '?network=zig-test-2&address=zig1x', '?net=zig-test-2'])
      expect((await GET(new Request(`http://localhost/api/chain/validators${bad}`))).status, bad).toBe(400);
    vi.stubGlobal('fetch', async () => { throw Error('offline'); });
    const down = await GET(new Request('http://localhost/api/chain/validators?network=zigchain-1'));
    expect(down.status).toBe(200); expect(down.headers.get('cache-control')).toBe('no-store');
    expect(await down.json()).toMatchObject({version: 1, status: 'unavailable', network: 'zigchain-1', validators: []});
    vi.stubGlobal('fetch', lcd().fetcher);
    const up = await GET(new Request('http://localhost/api/chain/validators?network=zig-test-2', {headers: {'cf-connecting-ip': '203.0.113.9'}}));
    expect(up.status).toBe(200);
    expect(validatorsWireSchema.parse(await up.json()).validators).toHaveLength(2);
  });
});
