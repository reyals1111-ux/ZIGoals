import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/testnet-block-8046854.json';
import {
  VALDORA_PATHS, VALDORA_TESTNET, buildValdoraQuery, displayAmount, parseBankBalance, parseContractVersion, parsePrice,
  parseProtocolInfo, readValdoraTestnet, type Failure,
} from './testnet';

// Fixtures are real responses of the official testnet LCD, all read at block 8,046,854 (see the fixture's "source").
const HEIGHT = String(fixture.pinnedHeight);
const TREASURY = 'zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx';
const SYNTHETIC = 'zig1qyqszqgpqyqszqgpqyqszqgpqyqszqgpneyv05';
type Responses = typeof fixture.responses;
type Key = keyof Responses;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The LCD path each recorded response answers, for a given holder. */
function routes(holder: string, bodies: Record<Key, unknown>): Map<string, unknown> {
  const pick = (synthetic: Key, treasury: Key) => (holder === TREASURY ? bodies[treasury] : bodies[synthetic]);
  return new Map<string, unknown>([
    [VALDORA_PATHS.latestBlock, bodies.latest],
    [VALDORA_PATHS.nodeInfo, bodies.node_info],
    [VALDORA_PATHS.contractInfo, bodies.contract],
    [VALDORA_PATHS.codeInfo, bodies.code_info],
    [buildValdoraQuery({ kind: 'contract_version' }).path, bodies.contract_version],
    [buildValdoraQuery({ kind: 'paused' }).path, bodies.paused],
    [buildValdoraQuery({ kind: 'protocol_info' }).path, bodies.protocol_info],
    [buildValdoraQuery({ kind: 'total_supply' }).path, bodies.total_supply],
    [buildValdoraQuery({ kind: 'st_zig_price', amount: '1000000' }).path, bodies.st_zig_price_1],
    [VALDORA_PATHS.denomMetadata, bodies.denom_metadata],
    [VALDORA_PATHS.bankBalance(holder), pick('balance_synthetic', 'balance_treasury')],
    [buildValdoraQuery({ kind: 'st_zig_balance', address: holder }).path, pick('st_zig_balance_synthetic', 'st_zig_balance_treasury')],
  ]);
}
type Override = { body?: (key: Key, body: unknown) => unknown; status?: number; height?: (path: string) => string | null; raw?: string; throws?: boolean; only?: string };
function fakeLcd(holder: string, override: Override = {}) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const bodies = Object.fromEntries(Object.entries(fixture.responses).map(([key, value]) => [key, override.body ? override.body(key as Key, clone(value.body)) : clone(value.body)])) as Record<Key, unknown>;
  const table = routes(holder, bodies);
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const path = url.slice(VALDORA_TESTNET.rest.length);
    const applies = !override.only || path === override.only;
    if (override.throws && applies) throw new TypeError('network down');
    if (!url.startsWith(VALDORA_TESTNET.rest) || !table.has(path)) return new Response('{"code":5,"message":"not found"}', { status: 404 });
    const height = override.height && applies ? override.height(path) : HEIGHT;
    const headers = height === null ? undefined : { 'x-cosmos-block-height': height, 'content-type': 'application/json' };
    const text = override.raw !== undefined && applies ? override.raw : JSON.stringify(table.get(path));
    return new Response(text, { status: override.status && applies ? override.status : 200, headers });
  }) as typeof fetch;
  return { fetcher, calls };
}
const reasonFor = async (override: Override, holder = TREASURY) => {
  const result = await readValdoraTestnet(fakeLcd(holder, override).fetcher, holder);
  return result.ok ? 'OK' : result.reason;
};

describe('pins', () => {
  it('match what the chain reported at the fixture height', () => {
    const r = fixture.responses;
    expect(r.latest.body.block.header.chain_id).toBe(VALDORA_TESTNET.chainId);
    expect(r.node_info.body.default_node_info.network).toBe(VALDORA_TESTNET.chainId);
    expect(r.contract.body.address).toBe(VALDORA_TESTNET.staker);
    expect(r.contract.body.contract_info.code_id).toBe(VALDORA_TESTNET.codeId);
    expect(r.contract.body.contract_info.label).toBe(VALDORA_TESTNET.stakerLabel);
    expect(r.code_info.body.checksum).toBe(VALDORA_TESTNET.checksum);
    expect(r.contract_version.body.data).toEqual({ version: VALDORA_TESTNET.version, contract: VALDORA_TESTNET.contract });
    expect(r.protocol_info.body.data.token_denom).toBe(VALDORA_TESTNET.stZigDenom);
    expect(r.denom_metadata.body.metadata.denom_units).toEqual([{ denom: VALDORA_TESTNET.stZigDenom, exponent: 0, aliases: [] }, { denom: 'stZIG', exponent: VALDORA_TESTNET.stZigDecimals, aliases: [] }]);
    // Every recorded response was answered at the pinned height.
    for (const [key, response] of Object.entries(r)) expect(response.blockHeight, key).toBe(HEIGHT);
  });
  it('use the app’s testnet network: azig with 18 decimals, testnet only', () => {
    expect(VALDORA_TESTNET.rest).toBe('https://testnet-api.zigchain.com');
    expect([VALDORA_TESTNET.nativeDenom, VALDORA_TESTNET.nativeDecimals]).toEqual(['azig', 18]);
    expect(Object.isFrozen(VALDORA_TESTNET)).toBe(true);
  });
});

describe('buildValdoraQuery', () => {
  it('produces exactly the paths the chain answered', () => {
    const recorded = (key: Key) => fixture.responses[key].path;
    expect(buildValdoraQuery({ kind: 'contract_version' }).path).toBe(recorded('contract_version'));
    expect(buildValdoraQuery({ kind: 'paused' }).path).toBe(recorded('paused'));
    expect(buildValdoraQuery({ kind: 'protocol_info' }).path).toBe(recorded('protocol_info'));
    expect(buildValdoraQuery({ kind: 'total_supply' }).path).toBe(recorded('total_supply'));
    expect(buildValdoraQuery({ kind: 'token_contract' }).path).toBe(recorded('token_contract'));
    expect(buildValdoraQuery({ kind: 'st_zig_balance', address: SYNTHETIC }).path).toBe(recorded('st_zig_balance_synthetic'));
    expect(buildValdoraQuery({ kind: 'st_zig_balance', address: TREASURY }).path).toBe(recorded('st_zig_balance_treasury'));
    expect(buildValdoraQuery({ kind: 'st_zig_price', amount: '1000000' }).path).toBe(recorded('st_zig_price_1'));
    expect(VALDORA_PATHS.denomMetadata).toBe(recorded('denom_metadata'));
    expect(VALDORA_PATHS.bankBalance(TREASURY)).toBe(recorded('balance_treasury'));
    expect(buildValdoraQuery({ kind: 'reverse_st_zig_price', amount: '7' }).message).toBe('{"reverse_st_zig_price":{"amount":"7"}}');
  });
  it.each([
    [{ kind: 'st_zig_balance', address: 'zig1invalid' }],
    [{ kind: 'st_zig_balance', address: VALDORA_TESTNET.staker }],
    [{ kind: 'st_zig_balance', address: 'cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgpjnp7du' }],
    [{ kind: 'st_zig_price', amount: '0' }],
    [{ kind: 'st_zig_price', amount: '-1' }],
    [{ kind: 'st_zig_price', amount: '1.5' }],
    [{ kind: 'st_zig_price', amount: '01' }],
    [{ kind: 'reverse_st_zig_price', amount: '1e18' }],
  ] as const)('refuses to build %j', query => {
    expect(() => buildValdoraQuery(query)).toThrow();
  });
});

describe('parsers', () => {
  it('accept the recorded shapes and refuse anything else', () => {
    expect(parseProtocolInfo(fixture.responses.protocol_info.body).ok).toBe(true);
    expect(parseContractVersion(fixture.responses.contract_version.body).ok).toBe(true);
    expect(parsePrice(fixture.responses.st_zig_price_1.body)).toEqual({ ok: true, value: { data: { stzig_amount: '1129883713421761571', uzig_amount: '1000000' } } });
    expect(parseBankBalance(fixture.responses.balance_treasury.body).ok).toBe(true);
    const extra = clone(fixture.responses.protocol_info.body) as { data: Record<string, unknown> };
    extra.data.new_field = '1';
    expect(parseProtocolInfo(extra)).toEqual({ ok: false, reason: 'MALFORMED' });
    for (const amount of ['-1', '1.0', '01', ' 1', '1'.repeat(79), 7]) expect(parseBankBalance({ balance: { denom: VALDORA_TESTNET.stZigDenom, amount } }).ok, String(amount)).toBe(false);
    expect(parsePrice({ data: { stzig_amount: '1' } }).ok).toBe(false);
    expect(parseContractVersion(null).ok).toBe(false);
  });
});

describe('readValdoraTestnet', () => {
  it('reads a holder’s stZIG from the bank at one block, with the staker’s own answers alongside', async () => {
    const { fetcher, calls } = fakeLcd(TREASURY);
    const result = await readValdoraTestnet(fetcher, TREASURY);
    expect(result).toEqual({
      ok: true,
      value: {
        stZig: { amount: '10511520227', denom: VALDORA_TESTNET.stZigDenom, decimals: 6 },
        contractAnswer: { stZigBalance: '10511520227', totalSupply: '18633318795402', priceForOneStZigUnitsUnverified: { stzig_amount: '1129883713421761571', uzig_amount: '1000000' } },
        observedAt: '2026-10-02T23:03:18.036Z',
        block: '8046854',
        source: 'https://testnet-api.zigchain.com · block 8046854',
      },
    });
    if (result.ok) expect(displayAmount(result.value.stZig.amount, result.value.stZig.decimals)).toBe('10511.520227');
    // Reads only: GET to the official testnet LCD, no credentials, no referrer, no redirects followed, nothing cached.
    expect(calls).toHaveLength(12);
    for (const [i, call] of calls.entries()) {
      expect(call.url.startsWith('https://testnet-api.zigchain.com/cosmos/') || call.url.startsWith('https://testnet-api.zigchain.com/cosmwasm/wasm/v1/')).toBe(true);
      expect(call.url).not.toMatch(/\/tx|broadcast|simulate/);
      expect(call.init).toMatchObject({ method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store' });
      expect((call.init?.headers as Record<string, string> | undefined)?.['x-cosmos-block-height']).toBe(i === 0 ? undefined : HEIGHT);
    }
  });
  it('reads a zero balance as "0"', async () => {
    const result = await readValdoraTestnet(fakeLcd(SYNTHETIC).fetcher, SYNTHETIC);
    expect(result.ok && result.value.stZig.amount).toBe('0');
    expect(result.ok && result.value.contractAnswer.stZigBalance).toBe('0');
  });

  // The failure cases edit one recorded response in place.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Mutable = any;
  const set = (target: Key, change: (body: Mutable) => void) => (key: Key, body: unknown) => { if (key === target) change(body as Mutable); return body; };
  it.each<[string, Override, Failure]>([
    ['another network in the latest block', { body: set('latest', b => { b.block.header.chain_id = 'zigchain-1'; }) }, 'WRONG_NETWORK'],
    ['another network in node info', { body: set('node_info', b => { b.default_node_info.network = 'zigchain-1'; }) }, 'WRONG_NETWORK'],
    ['a migrated staker (new code ID)', { body: set('contract', b => { b.contract_info.code_id = '2600'; }) }, 'CODE_ID_MISMATCH'],
    ['a different contract label', { body: set('contract', b => { b.contract_info.label = 'Something else'; }) }, 'CODE_ID_MISMATCH'],
    ['a different code checksum', { body: set('code_info', b => { b.checksum = 'A'.repeat(64); }) }, 'CHECKSUM_MISMATCH'],
    ['a new contract version', { body: set('contract_version', b => { b.data.version = '1.2.0'; }) }, 'VERSION_MISMATCH'],
    ['a paused staker', { body: set('paused', b => { b.data.paused = true; }) }, 'PAUSED'],
    ['a different stZIG denom', { body: set('protocol_info', b => { b.data.token_denom = 'coin.zig1other.stzig'; }) }, 'DENOM_MISMATCH'],
    ['denom metadata for another base', { body: set('denom_metadata', b => { b.metadata.base = 'coin.zig1other.stzig'; }) }, 'DENOM_MISMATCH'],
    ['stZIG shown with 18 decimals', { body: set('denom_metadata', b => { b.metadata.denom_units[1].exponent = 18; }) }, 'DECIMALS_MISMATCH'],
    ['a bank balance in another denom', { body: set('balance_treasury', b => { b.balance.denom = 'azig'; }) }, 'DENOM_MISMATCH'],
    ['an unknown field in protocol info', { body: set('protocol_info', b => { b.data.extra = true; }) }, 'MALFORMED'],
    ['a balance that is not an integer', { body: set('balance_treasury', b => { b.balance.amount = '10.5'; }) }, 'MALFORMED'],
    ['the staker answering for another address', { body: set('st_zig_balance_treasury', b => { b.data.address = SYNTHETIC; }) }, 'MALFORMED'],
    ['an answer from another block', { height: path => (path === VALDORA_PATHS.codeInfo ? '8046853' : HEIGHT) }, 'HEIGHT_MISMATCH'],
    ['an answer without a block height', { height: path => (path === VALDORA_PATHS.contractInfo ? null : HEIGHT) }, 'HEIGHT_MISMATCH'],
    ['a server error', { status: 500, only: VALDORA_PATHS.denomMetadata }, 'UNAVAILABLE'],
    ['a redirect', { status: 302, only: VALDORA_PATHS.nodeInfo }, 'UNAVAILABLE'],
    ['a network failure', { throws: true, only: VALDORA_PATHS.latestBlock }, 'UNAVAILABLE'],
    ['a body that is not JSON', { raw: '<html>', only: VALDORA_PATHS.codeInfo }, 'MALFORMED'],
    ['an oversized body', { raw: `{"x":"${'a'.repeat(VALDORA_TESTNET.maxBody)}"}`, only: VALDORA_PATHS.nodeInfo }, 'TOO_LARGE'],
  ])('fails closed on %s', async (_label, override, reason) => {
    expect(await reasonFor(override)).toBe(reason);
  });
  it('refuses an invalid holder before any request', async () => {
    for (const holder of ['zig1invalid', VALDORA_TESTNET.staker, '', 'cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgpjnp7du']) {
      const { fetcher, calls } = fakeLcd(TREASURY);
      expect(await readValdoraTestnet(fetcher, holder)).toEqual({ ok: false, reason: 'INVALID_INPUT' });
      expect(calls).toHaveLength(0);
    }
  });
});

describe('displayAmount (BigInt only)', () => {
  it.each([
    ['0', 6, '0'], ['1', 6, '0.000001'], ['1000000', 6, '1'], ['18633318795402', 6, '18633318.795402'], ['10', 1, '1'],
    ['1000000000000000000', 18, '1'], ['1', 18, '0.000000000000000001'], ['123', 0, '123'],
    ['9'.repeat(78), 18, `${'9'.repeat(60)}.${'9'.repeat(18)}`],
  ])('%s with %d decimals is %s', (amount, decimals, shown) => {
    expect(displayAmount(amount, decimals)).toBe(shown);
  });
  it.each([['-1', 6], ['1.5', 6], ['01', 6], ['', 6], ['1', -1], ['1', 1.5], ['1', 37]])('refuses %s with %d decimals', (amount, decimals) => {
    expect(() => displayAmount(amount, decimals)).toThrow();
  });
});

describe('scope', () => {
  it('is imported by no page, component or route: it is a foundation, not a feature', () => {
    const web = fileURLToPath(new URL('../../../', import.meta.url));
    const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      if (name === 'node_modules' || name.startsWith('.')) return [];
      return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|mjs|js)$/.test(name) ? [path] : [];
    });
    const users = ['app', 'components', 'lib', 'workers'].flatMap(dir => { try { return walk(join(web, dir)); } catch { return []; } })
      .filter(path => !path.includes(join('lib', 'earn')) && /lib\/earn|earn\/valdora/.test(readFileSync(path, 'utf8')));
    expect(users).toEqual([]);
  });
});
