import {describe, expect, it} from 'vitest';
import {DENOM_TTL_MS, denomRoute} from './denom-route';
import {readDenom, unavailableDenom} from './denom-reader';
import {checkToken, NOT_IN_THIS_BUILD} from './denom-client';
import {KNOWN_TOKENS, classifyToken, foldName, ibcDenomOf, imitatedFamily, isCheckableDenom, parseTraceAnswer, traceMatches} from './denoms';
import {HEIGHT, NETWORK, lcdFetch, type Shape} from './fixtures/lcd';

const ATOM = 'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0';
const V10 = {denom: {base: 'uatom', trace: [{port_id: 'transfer', channel_id: 'channel-4'}]}};
const LEGACY = {denom_trace: {path: 'transfer/channel-4', base_denom: 'uatom'}};
const FACTORY = 'coin.zig1020uljv3lamnhlgvetx5tq5gtjl6p7ggvepdeep2fjul6u0pevzsjz270a.neon';
const CW20 = 'zig1' + 'q'.repeat(58);

describe('IBC traces', () => {
  it('derives the IBC denom from the path exactly as the chain does (hashes checked against the live chain)', async () => {
    expect(await ibcDenomOf('transfer/channel-4/uatom')).toBe(ATOM);
    expect(await ibcDenomOf('transfer/channel-4/transfer/08-wasm-1369/0x68749665ff8d2d112fa859aa293f07a622782f38')).toBe('ibc/294719272CB20610F3C0173B0E14DD65F9D7F515548AB3F8373CC91F36357234');
    for (const t of KNOWN_TOKENS.filter(k => k.base.startsWith('ibc/'))) expect(t.base).toMatch(/^ibc\/[0-9A-F]{64}$/);
  });
  it('reads the v10 shape (both networks today) and the older denom_trace shape to the same trace', () => {
    const a = parseTraceAnswer(V10), b = parseTraceAnswer(LEGACY);
    expect(a).toEqual({hops: [{port: 'transfer', channel: 'channel-4'}], base: 'uatom', path: 'transfer/channel-4/uatom'});
    expect(b).toEqual(a);
    const twoHops = parseTraceAnswer({denom: {base: '0xabc', trace: [{port_id: 'transfer', channel_id: 'channel-4'}, {port_id: 'transfer', channel_id: '08-wasm-1369'}]}});
    expect(twoHops?.path).toBe('transfer/channel-4/transfer/08-wasm-1369/0xabc');
  });
  it('refuses malformed traces', () => {
    for (const bad of [null, 1, {}, {denom: {base: 'x', trace: []}}, {denom: {base: 'u atom', trace: [{port_id: 'transfer', channel_id: 'channel-4'}]}}, {denom: {base: 'x', trace: [{port_id: 'transfer'}]}}, {denom_trace: {path: 'transfer', base_denom: 'x'}}])
      expect(parseTraceAnswer(bad)).toBeNull();
  });
  it('accepts a trace only when its hash is the denom', async () => {
    expect(await traceMatches(ATOM, parseTraceAnswer(V10)!)).toBe(true);
    expect(await traceMatches(ATOM.toLowerCase().replace('ibc/', 'ibc/'), parseTraceAnswer(V10)!)).toBe(true);
    expect(await traceMatches(ATOM, parseTraceAnswer({denom: {base: 'uusdc', trace: [{port_id: 'transfer', channel_id: 'channel-4'}]}})!)).toBe(false);
  });
});

describe('look-alike names', () => {
  it('folds styled, invisible and look-alike letters', () => {
    expect(foldName('ＺＩＧ')).toBe('zig');
    expect(foldName('Z​IG')).toBe('zig');
    expect(foldName('ZΙG')).toBe('zig');
    expect(foldName('Z1G')).toBe('zig');
    expect(foldName('ZlG')).toBe('zig');
    expect(foldName('USDС')).toBe('usdc'); // Cyrillic Es
    expect(imitatedFamily('ZIG Rewards')).toBe('zig');
    expect(imitatedFamily('Bitcoin')).toBe('btc');
    expect(imitatedFamily('Neon')).toBeNull();
    expect(imitatedFamily('')).toBeNull();
  });
});

describe('classifyToken', () => {
  it('names ZIG and curated tokens by their exact denom only', () => {
    expect(classifyToken({network: 'zigchain-1', denom: 'azig'})).toMatchObject({kind: 'zig', identity: 'ZIG: ZIG'});
    expect(classifyToken({network: 'zigchain-1', denom: ATOM, metadata: {name: 'whatever', symbol: 'UATOM'}})).toMatchObject({kind: 'known', identity: 'ATOM: Cosmos Hub ATOM', ownName: 'whatever · UATOM'});
    // The mainnet ATOM hash is not a known token on the practice network.
    expect(classifyToken({network: 'zig-test-2', denom: ATOM}).kind).toBe('unknown');
  });
  it('calls a factory token that names itself ZIG, stZIG or USDC a look-alike, with the maker', () => {
    const fake = classifyToken({network: 'zigchain-1', denom: 'coin.zig1020uljv3lamnhlgvetx5tq5gtjl6p7ggvepdeep2fjul6u0pevzsjz270a.stzig', metadata: {name: 'Staked ZIG', symbol: 'stZIG'}});
    expect(fake).toMatchObject({kind: 'lookalike', maker: 'zig1020uljv3lamnhlgvetx5tq5gtjl6p7ggvepdeep2fjul6u0pevzsjz270a'});
    expect(fake.warning).toContain('stZIG');
    expect(classifyToken({network: 'zigchain-1', denom: FACTORY, metadata: {name: 'U​SDC', symbol: 'USDС'}}).kind).toBe('lookalike');
    expect(classifyToken({network: 'zigchain-1', denom: 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig'})).toMatchObject({kind: 'lookalike', warning: 'Not ZIG. Never stake, buy or send this.'});
  });
  it('labels an ordinary factory token and a CW20 contract by their maker, the name as their own words', () => {
    const neon = classifyToken({network: 'zig-test-2', denom: FACTORY, metadata: {name: 'Neon', symbol: 'NEON'}});
    expect(neon).toMatchObject({kind: 'factory', ownName: 'Neon · NEON'});
    expect(neon.identity).toMatch(/^A token made on ZIGChain by zig1020ulj…/);
    expect(classifyToken({network: 'zigchain-1', denom: CW20, cw20: {name: 'Moon', symbol: 'MOON', decimals: 6}})).toMatchObject({kind: 'cw20', maker: CW20, ownName: 'Moon · MOON'});
    expect(classifyToken({network: 'zigchain-1', denom: CW20, cw20: {name: 'Tether', symbol: 'USDT', decimals: 6}}).kind).toBe('lookalike');
  });
  it('trusts an IBC token only with a checked trace, and still catches a name that imitates another coin', async () => {
    const usdc = 'ibc/' + 'A'.repeat(64);
    expect(classifyToken({network: 'zig-test-2', denom: usdc}).kind).toBe('unknown');
    const trace = parseTraceAnswer({denom: {base: 'uusdc', trace: [{port_id: 'transfer', channel_id: 'channel-42'}]}})!;
    const real = await ibcDenomOf(trace.path);
    expect(classifyToken({network: 'zig-test-2', denom: real, verifiedTrace: trace, metadata: {name: 'USDC', symbol: 'USDC'}})).toMatchObject({kind: 'ibc', identity: 'uusdc from another chain'});
    const other = parseTraceAnswer({denom: {base: 'umy', trace: [{port_id: 'transfer', channel_id: 'channel-45'}]}})!;
    expect(classifyToken({network: 'zig-test-2', denom: await ibcDenomOf(other.path), verifiedTrace: other, metadata: {name: 'ZIG', symbol: 'ZIG'}}).kind).toBe('lookalike');
  });
  // Security review F10 (R2-F1, R2-F2, R2-I2, R2-I5).
  it('folds capitals by their own shape and other scripts\' look-alikes, so imitations are caught', () => {
    for (const name of ['ΑΤΟΜ', 'ΕΤΗ', 'ΒΙΤCΟΙΝ', 'ZӀG', 'ZıG', 'ᴢɪɢ', 'ꓜꓲꓖ', 'ᏃᏆᏀ', 'սsdc', 'ZIG✓Official', 'ZIG—Rewards', 'Z\u2067IG\u2069\u061c']) {
      expect(imitatedFamily(name), name).not.toBeNull();
      expect(classifyToken({network: 'zigchain-1', denom: FACTORY, metadata: {name, symbol: 'X'}}).kind, name).toBe('lookalike');
    }
    expect(classifyToken({network: 'zig-test-2', denom: FACTORY, metadata: {name: 'Ne\u2066on\ufe0f', symbol: 'N'}}).ownName).toBe('Neon · N');
  });
  it('a checked IBC route is never an endorsement: every IBC token not on the curated list carries a caution; "uusd" is not USDC', async () => {
    for (const base of ['uatom', 'uusdc', 'uzig', 'uusd']) {
      const trace = parseTraceAnswer({denom: {base, trace: [{port_id: 'transfer', channel_id: 'channel-999'}]}})!;
      const view = classifyToken({network: 'zig-test-2', denom: await ibcDenomOf(trace.path), verifiedTrace: trace});
      expect(view.warning, base).toMatch(/not on ZIGChain’s curated token list/);
    }
    const uusd = parseTraceAnswer({denom: {base: 'uusd', trace: [{port_id: 'transfer', channel_id: 'channel-999'}]}})!;
    expect(classifyToken({network: 'zig-test-2', denom: await ibcDenomOf(uusd.path), verifiedTrace: uusd, metadata: {name: 'USDC', symbol: 'USDC'}}).kind).toBe('lookalike');
  });
  it('a known IBC token pasted with a lower-case hash is still the known token', () => {
    const known = KNOWN_TOKENS.find(t => t.base.startsWith('ibc/'));
    if (known) expect(classifyToken({network: known.network, denom: known.base.toLowerCase().replace(/^ibc\//, 'ibc/')}).kind).toBe('known');
  });
  it('strips control characters from a token’s own name', () => {
    expect(classifyToken({network: 'zig-test-2', denom: FACTORY, metadata: {name: 'Ne‮on\u0007', symbol: 'N'}}).ownName).toBe('Neon · N');
  });
  it('accepts only checkable denoms', () => {
    for (const ok of ['azig', 'uzig', ATOM, FACTORY, CW20]) expect(isCheckableDenom(ok)).toBe(true);
    for (const bad of ['', 'ZIG', 'ibc/123', 'coin.zig1abc', 'zig1short', `${ATOM} `, 'javascript:alert(1)']) expect(isCheckableDenom(bad)).toBe(false);
  });
});

describe.each(['v5.1', 'v6.0'] as const)('readDenom on a %s LCD', (shape: Shape) => {
  const network = NETWORK[shape].chainId;
  it('reads the v10 trace and the bank metadata at one block, and keeps the trace only when its hash matches', async () => {
    const wire = await readDenom(network, ATOM, lcdFetch(shape, {
      [`/ibc/apps/transfer/v1/denoms/${ATOM.slice(4)}`]: V10,
      [`/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(ATOM)}`]: {metadata: {description: 'IBC token from transfer/channel-4/uatom', denom_units: [{denom: 'uatom', exponent: 0, aliases: []}], base: ATOM, display: 'transfer/channel-4/uatom', name: 'transfer/channel-4/uatom IBC token\u0000', symbol: 'UATOM', uri: '', uri_hash: ''}},
    }));
    expect(wire).toMatchObject({status: 'ok', network, height: HEIGHT, trace: {base: 'uatom', path: 'transfer/channel-4/uatom'}, metadata: {name: 'transfer/channel-4/uatom IBC token', symbol: 'UATOM', exponent: null}});
    const wrong = await readDenom(network, ATOM, lcdFetch(shape, {[`/ibc/apps/transfer/v1/denoms/${ATOM.slice(4)}`]: {denom: {base: 'uusdc', trace: [{port_id: 'transfer', channel_id: 'channel-4'}]}}}));
    expect(wrong).toMatchObject({trace: null, traceMismatch: true, metadata: null});
  });
  it('falls back to the older denom_traces path only when the node says the new one is not implemented', async () => {
    const wire = await readDenom(network, ATOM, lcdFetch(shape, {
      [`/ibc/apps/transfer/v1/denoms/${ATOM.slice(4)}`]: {code: 12, message: 'Not Implemented', details: []},
      [`/ibc/apps/transfer/v1/denom_traces/${ATOM.slice(4)}`]: LEGACY,
    }));
    expect(wire.trace?.path).toBe('transfer/channel-4/uatom');
  });
  it('reads a CW20 contract’s own token_info, and a factory token’s metadata', async () => {
    const query = encodeURIComponent(btoa(JSON.stringify({token_info: {}})));
    const cw = await readDenom(network, CW20, lcdFetch(shape, {[`/cosmwasm/wasm/v1/contract/${CW20}/smart/${query}`]: {data: {name: 'Moon', symbol: 'MOON', decimals: 6, total_supply: '1'}}}));
    expect(cw).toMatchObject({cw20: {name: 'Moon', symbol: 'MOON', decimals: 6}, metadata: null, trace: null});
    const factory = await readDenom(network, FACTORY, lcdFetch(shape, {[`/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(FACTORY)}`]: {metadata: {base: FACTORY, display: 'NEON', name: 'Neon', symbol: 'NEON', denom_units: [{denom: FACTORY, exponent: 0}, {denom: 'NEON', exponent: 6}]}}}));
    expect(factory.metadata).toEqual({name: 'Neon', symbol: 'NEON', display: 'NEON', exponent: 6});
  });
  it('refuses another network’s node, a moved block and an unknown denom', async () => {
    const other: Shape = shape === 'v5.1' ? 'v6.0' : 'v5.1';
    await expect(readDenom(NETWORK[other].chainId, ATOM, lcdFetch(shape))).rejects.toThrow();
    const movedTrace: typeof fetch = async (input, init) => String(input).includes('/ibc/apps/transfer/v1/denoms/') ? new Response(JSON.stringify(V10), {status: 200, headers: {'x-cosmos-block-height': '1'}}) : lcdFetch(shape)(input, init);
    await expect(readDenom(network, ATOM, movedTrace)).rejects.toThrow('different block');
    await expect(readDenom(network, 'not a denom', lcdFetch(shape))).rejects.toThrow('Unsupported');
  });
});

describe('the denom route and the browser check', () => {
  const ok = (network: 'zigchain-1' | 'zig-test-2', denom: string) => Promise.resolve({version: 1 as const, status: 'ok' as const, network, denom, height: HEIGHT, observedAt: '2026-10-31T21:00:00.000Z', trace: null, metadata: {name: 'Neon', symbol: 'NEON', display: 'NEON', exponent: 6}, cw20: null});
  it('answers 400 for a bad query, the wire for a good one, and unavailable on a failure', async () => {
    const GET = denomRoute(ok);
    expect((await GET(new Request('https://x/api/chain/denom?network=zigchain-1'))).status).toBe(400);
    expect((await GET(new Request('https://x/api/chain/denom?network=cosmoshub-4&denom=azig'))).status).toBe(400);
    expect((await GET(new Request(`https://x/api/chain/denom?network=zigchain-1&denom=${FACTORY}&x=1`))).status).toBe(400);
    const good = await GET(new Request(`https://x/api/chain/denom?network=zig-test-2&denom=${encodeURIComponent(FACTORY)}`));
    expect(good.headers.get('cache-control')).toBe('no-store');
    expect(await good.json()).toMatchObject({status: 'ok', denom: FACTORY});
    const failing = denomRoute(() => Promise.reject(Error('down')));
    expect(await (await failing(new Request(`https://x/api/chain/denom?network=zig-test-2&denom=${encodeURIComponent(FACTORY)}`))).json()).toEqual(unavailableDenom('zig-test-2', FACTORY));
    expect(DENOM_TTL_MS).toBe(600_000);
  });
  it('checks in the browser through the app’s own route only, and needs no read for known tokens', async () => {
    const asked: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => { asked.push(String(input)); return Response.json(await ok('zig-test-2', FACTORY)); }) as typeof fetch;
    expect(await checkToken('zigchain-1', 'azig', fetcher)).toMatchObject({phase: 'ok', view: {kind: 'zig'}, wire: null});
    expect(asked).toEqual([]);
    const result = await checkToken('zig-test-2', ` ${FACTORY} `, fetcher);
    expect(result).toMatchObject({phase: 'ok', view: {kind: 'factory', ownName: 'Neon · NEON'}});
    expect(asked).toEqual([`/api/chain/denom?network=zig-test-2&denom=${encodeURIComponent(FACTORY)}`]);
    expect(await checkToken('zig-test-2', 'hello', fetcher)).toMatchObject({phase: 'unavailable'});
    expect(await checkToken('zig-test-2', FACTORY, (async () => new Response('', {status: 404})) as typeof fetch)).toEqual({phase: 'unavailable', reason: NOT_IN_THIS_BUILD});
    // An answer for another denom is refused.
    expect((await checkToken('zig-test-2', FACTORY, (async () => Response.json(await ok('zig-test-2', 'azig'))) as typeof fetch)).phase).toBe('unavailable');
  });
});
