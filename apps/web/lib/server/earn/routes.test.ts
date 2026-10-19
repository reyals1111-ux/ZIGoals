import {describe, expect, it} from 'vitest';
import fixture from '../../earn/fixtures/live-2026-10-19.json';
import {liveEnvelopeSchema} from '../../earn/live/envelope';
import * as z from 'zod';
import {changedAnswer, fixtureFetcher, type FixtureRequest} from './fixture-fetcher';
import {chainRoute, defillamaRoute, measuredRoute, oroswapRoute, valdoraRoute, vaultsRoute} from './routes';
import {readChain} from './chain';
import {readValdora} from './valdora';
import {readOroswap} from './oroswap';
import {readDefillama} from './defillama';
import {readVaults} from './vaults';
import {MEASURED_DELEGATOR, MEASURED_VALIDATOR, readMeasured} from './measured';
import {EARN_EGRESS, assertEgress, getJson} from './upstream';
import {earnRelay} from './cache';

/**
 * Session AF (ADR-028 H16, H42, H44, H58; `TIER 3 (egress routes)`): the /api/earn/* routes against one recorded real
 * read of every upstream (lib/earn/fixtures/live-2026-10-19.json) and against each way a source can fail. A source that
 * fails answers HTTP 200 with `unavailable` and the reason; a route's own refusal is 400 or 429.
 */
const answers = fixture.answers as unknown as Record<string, {data: unknown; height?: string; source: unknown}>;
const at = Date.parse('2026-10-19T08:00:00Z');
const clock = (start = at) => { let t = start; const now = () => t; return Object.assign(now, {advance: (ms: number) => { t += ms; }}); };
const get = (path: string, ip = '198.51.100.7') => new Request(`https://alpha.test${path}`, {headers: {'cf-connecting-ip': ip}});
const json = async (r: Response) => ({status: r.status, body: await r.json() as {status: string; reason?: string; stale?: boolean; data: never; height?: string; source: {origin: string}}, headers: r.headers});
const timeout = () => Promise.reject(Object.assign(new Error('slow'), {name: 'TimeoutError'}));
const is = (part: string) => (url: string) => url.includes(part);
const respond = (match: (url: string) => boolean, make: (recorded: FixtureRequest | undefined, init: RequestInit) => Response | Promise<Response>) => (url: string, init: RequestInit, recorded: FixtureRequest | undefined) => match(url) ? make(recorded, init) : undefined;
const b64 = (query: unknown) => btoa(JSON.stringify(query));
// Each reader asked for the latest block once; its replay answers with that reader's own recorded height.
const H = {mainnet: answers.chainMainnet!.height!, testnet: answers.chainTestnet!.height!, valdora: answers.valdora!.height!, oroswap: answers.oroswap!.height!, vaults: answers.vaults!.height!, measured: answers.measured!.height!};
type Options = Parameters<typeof fixtureFetcher>[1];
const replay = (reader: keyof typeof H | 'defillama', options: Options = {}) => fixtureFetcher(fixture, {...options, latest: reader === 'defillama' ? undefined : H[reader]});
/** The rotation LCD answers as the official one did, so a failure injected on a path holds on both. */
const mirror = (fetcher: ReturnType<typeof fixtureFetcher>): ReturnType<typeof fixtureFetcher> => (url, init) => fetcher(url.replace('https://zigchain-api.polkachu.com', 'https://api.zigchain.com'), init);

describe('the recorded read replays to the recorded answers', () => {
  it.each([
    ['chainMainnet', () => readChain(replay('mainnet'), 'mainnet')],
    ['chainTestnet', () => readChain(replay('testnet'), 'testnet')],
    ['valdora', () => readValdora(replay('valdora'))],
    ['oroswap', () => readOroswap(replay('oroswap'))],
    ['defillama', () => readDefillama(replay('defillama'))],
    ['vaults', () => readVaults(replay('vaults'))],
    ['measured', () => readMeasured(replay('measured'))],
  ] as const)('%s', async (name, read) => {
    const answer = await read();
    expect(answer.status).toBe('ok');
    expect(answer.data).toEqual(answers[name]!.data);
    expect(answer.source).toEqual(answers[name]!.source);
    expect(liveEnvelopeSchema(z.unknown()).parse(answer)).toBeTruthy();
  });
  it('reads every LCD figure at one block height and names that height', async () => {
    const calls: string[] = [], heights = new Set<string | null>();
    const fetcher = replay('mainnet', {calls, override: (_url, init) => { heights.add((init.headers as Record<string, string>)['x-cosmos-block-height'] ?? null); return undefined; }});
    const answer = await readChain(fetcher, 'mainnet');
    expect(answer.status === 'ok' && answer.height).toBe(answers.chainMainnet!.height);
    expect([...heights].filter(Boolean)).toEqual([answers.chainMainnet!.height]);
    expect(calls.filter(is('/blocks/latest'))).toHaveLength(1);
    expect(calls.some(is(`/blocks/${BigInt(answers.chainMainnet!.height!) - 10000n}`))).toBe(true);
  });
});

describe('every request is a plain GET to the egress list, with no person\'s address', () => {
  it('sends GET, no credentials, no referrer, no redirect, and only to allowed origins', async () => {
    const seen: {url: string; init: RequestInit}[] = [];
    const override = (url: string, init: RequestInit) => { seen.push({url, init}); return undefined; };
    const read = await Promise.all([readChain(replay('mainnet', {override}), 'mainnet'), readChain(replay('testnet', {override}), 'testnet'), readValdora(replay('valdora', {override})), readOroswap(replay('oroswap', {override})), readDefillama(replay('defillama', {override})), readVaults(replay('vaults', {override})), readMeasured(replay('measured', {override}))]);
    expect(read.map(r => r.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
    expect(seen.length).toBeGreaterThan(40);
    for (const {url, init} of seen) {
      expect(EARN_EGRESS).toContain(new URL(url).origin as never);
      expect(init).toMatchObject({method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store'});
      expect(init.body).toBeUndefined();
      // The only bech32 identifiers sent are the pinned public contracts and the Valdora contract admin (a public chain role).
      for (const id of url.match(/zig1[02-9ac-hj-np-z]{38,58}/g) ?? []) expect(['zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55', 'zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq', 'zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx', 'zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85', 'zig10v0hrjvwwlqwvk2yhwagm9m9h385spxa4s54f4aekhap0lxyekysf2ekwz', 'zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h', 'zig1wvqk2tm38dn3yp9ry7h5zzjqv3tytzpwpkkg55w3j58cdhvqrnfq78fe45',
        // Session AF chunk 2: the USDC.inj / ZIG pool, the four USDC vaults, Nawa's stZIG vault, DeFa's counter, and the measured
        // validator's own account (its self-delegation, a public chain role like the Valdora admin above).
        'zig1ewkl2peqhupyfhm6pm7xlufucde7le9zer0wa867u08cveuts2asm0l2z3', 'zig1h3au5n3lsyqm32ydz3usgy7r9z7wpx4gttcxmypfecz29adtu64svluenp', 'zig1mayx7wkzensav40j3qc8c5lh6s884jlhsu0c0js058t4u9xcg0mql58gkq',
        'zig1m526fltgrf70qdsufx9k9fdl4x07usjlydcn32jn83fs6za9c5cswd9grk', 'zig1fn4rrr5knlg93nf3wyme9fzmgve3fftxu5l7wv90llp77mwg7ctq2lfwtd', 'zig1fqxfjv54zavyr9464vj6n2jgw9fxgdnxucf866spedunntw0skcsq9gz33',
        'zig19pp9rxhqktgpf2yqkwwx6yekmgvnu3hvj0c4e5rlpw88l0shh3qs9qcdyg', 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx']).toContain(id);
    }
  });
  it('refuses an origin outside the list before anything is sent', async () => {
    let sent = 0;
    for (const url of ['https://evil.example/x', 'http://api.zigchain.com/x', 'https://api.zigchain.com:8443/x', `https://${'user'}@api.zigchain.com/x` /* a URL with user info, built from parts so no address-shaped string is committed (H101) */, 'https://api.llama.fi.evil.example/x']) {
      expect(() => assertEgress(url), url).toThrow();
      await expect(getJson(async () => { sent++; return new Response('{}'); }, url, {maxChars: 10})).rejects.toThrow();
    }
    expect(sent).toBe(0);
  });
});

describe('a source that fails is an honest unavailable, never a guess', () => {
  it.each([
    ['a 500', respond(is('/cosmos/mint/v1beta1/annual_provisions'), () => new Response('{}', {status: 500})), 'UPSTREAM_DOWN'],
    ['a timeout', respond(is('/cosmos/staking/v1beta1/pool'), timeout), 'TIMEOUT'],
    ['a network error', respond(is('/cosmos/staking/v1beta1/params'), () => Promise.reject(new TypeError('offline'))), 'UPSTREAM_DOWN'],
    ['an oversize body', respond(is('/cosmos/mint/v1beta1/inflation'), () => new Response(JSON.stringify({inflation: '0.01', pad: 'x'.repeat(300_000)}), {headers: {'x-cosmos-block-height': answers.chainMainnet!.height!}})), 'TOO_LARGE'],
    ['a declared oversize body', respond(is('/cosmos/mint/v1beta1/inflation'), () => new Response('{}', {headers: {'content-length': '9000000'}})), 'TOO_LARGE'],
    ['a malformed body', respond(is('/cosmos/mint/v1beta1/params'), (r) => changedAnswer(r, (b: {params: {blocks_per_year: unknown}}) => ({...b, params: {...b.params, blocks_per_year: 'many'}}))), 'MALFORMED'],
    ['broken JSON', respond(is('/cosmos/distribution/v1beta1/params'), () => new Response('{"params":', {headers: {'x-cosmos-block-height': answers.chainMainnet!.height!}})), 'MALFORMED'],
    ['an answer at another height', respond(is('/cosmos/distribution/v1beta1/params'), (r) => changedAnswer(r, b => b, '1')), 'MALFORMED'],
    ['a figure out of range', respond(is('/cosmos/mint/v1beta1/inflation'), (r) => changedAnswer(r, () => ({inflation: '0.9'}))), 'OUT_OF_RANGE'],
    ['another network', respond(is('/node_info'), (r) => changedAnswer(r, (b: {default_node_info: object}) => ({...b, default_node_info: {...b.default_node_info, network: 'zigchain-2'}}))), 'WRONG_NETWORK'],
    ['another bond denom', respond(is('/cosmos/staking/v1beta1/params'), (r) => changedAnswer(r, (b: {params: object}) => ({params: {...b.params, bond_denom: 'uzig'}}))), 'WRONG_NETWORK'],
  ] as const)('chain: %s', async (_label, override, reason) => {
    const answer = await readChain(mirror(replay('mainnet', {override})), 'mainnet');
    expect(answer).toMatchObject({status: 'unavailable', reason, data: null, stale: false});
  });
  it.each([
    ['another code id', respond(u => u.endsWith('/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55'), (r) => changedAnswer(r, (b: {contract_info: object}) => ({...b, contract_info: {...b.contract_info, code_id: '180'}}))), 'PIN_MISMATCH'],
    ['another checksum', respond(is('/code-info/179'), (r) => changedAnswer(r, (b: object) => ({...b, checksum: 'A'.repeat(64)}))), 'PIN_MISMATCH'],
    ['another version', respond(is(b64({contract_version: {}})), (r) => changedAnswer(r, () => ({data: {version: '1.2.0', contract: 'stzig-staker'}}))), 'PIN_MISMATCH'],
    ['another stZIG denom', respond(is(b64({protocol_info: {}})), (r) => changedAnswer(r, (b: {data: object}) => ({data: {...b.data, token_denom: 'coin.zig1other.stzig'}}))), 'PIN_MISMATCH'],
    ['a pool that holds another pair', respond(is(b64({pool: {}})), (r) => changedAnswer(r, (b: {data: {assets: {info: {native_token: {denom: string}}}[]}}) => { b.data.assets[0]!.info.native_token.denom = 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig'; return b; })), 'PIN_MISMATCH'],
    ['a 500', respond(is(b64({paused: {}})), () => new Response('{}', {status: 500})), 'UPSTREAM_DOWN'],
    ['a fee out of range', respond(is(b64({protocol_info: {}})), (r) => changedAnswer(r, (b: {data: object}) => ({data: {...b.data, fees_percentage: '20000'}}))), 'OUT_OF_RANGE'],
  ] as const)('valdora: %s', async (_label, override, reason) => {
    expect(await readValdora(mirror(replay('valdora', {override})))).toMatchObject({status: 'unavailable', reason, data: null});
  });
  it('valdora: the decoy "ZIG" denom is never counted as ZIG', async () => {
    const decoy = 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig';
    const override = respond(is(b64({pool: {}})), (r) => changedAnswer(r, (b: {data: {assets: {info: {native_token: {denom: string}}}[]}}) => { for (const a of b.data.assets) if (a.info.native_token.denom === 'azig') a.info.native_token.denom = decoy; return b; }));
    expect(await readValdora(mirror(replay('valdora', {override})))).toMatchObject({status: 'unavailable', reason: 'PIN_MISMATCH'});
    expect(await readOroswap(mirror(replay('oroswap', {override})))).toMatchObject({status: 'unavailable', reason: 'PIN_MISMATCH'});
  });
  it('valdora: the rate is shown only while OroSwap\'s pool agrees within 2 % (H44)', async () => {
    const ok = await readValdora(replay('valdora'));
    expect(ok.status === 'ok' && ok.data.rate).toMatchObject({status: 'ok'});
    // The pool's ZIG side 5 % lower: the two sources now disagree by more than 2 %.
    const override = respond(is(b64({pool: {}})), (r) => changedAnswer(r, (b: {data: {assets: {info: {native_token: {denom: string}}; amount: string}[]}}) => { for (const a of b.data.assets) if (a.info.native_token.denom === 'azig') a.amount = (BigInt(a.amount) * 95n / 100n).toString(); return b; }));
    const apart = await readValdora(replay('valdora', {override}));
    expect(apart.status).toBe('ok');
    expect(apart.status === 'ok' && apart.data.rate).toEqual({status: 'unavailable', reason: 'SOURCES_DISAGREE'});
    expect(JSON.stringify(apart)).not.toMatch(/zigPerStZig/);
  });
  it('valdora: the contract admin\'s key kind is read from the chain', async () => {
    const answer = await readValdora(replay('valdora'));
    expect(answer.status === 'ok' && answer.data.admin).toEqual({address: 'zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx', key: 'single-key', keyType: '/cosmos.crypto.secp256k1.PubKey'});
    const multisig = respond(is('/cosmos/auth/v1beta1/accounts/'), (r) => changedAnswer(r, (b: {account: {pub_key: object}}) => ({account: {...b.account, pub_key: {'@type': '/cosmos.crypto.multisig.LegacyAminoPubKey'}}})));
    const m = await readValdora(replay('valdora', {override: multisig}));
    expect(m.status === 'ok' && m.data.admin.key).toBe('multisig');
  });
  it.each([
    ['a pool 500', respond(is(b64({pool: {}})), () => new Response('{}', {status: 500})), 'UPSTREAM_DOWN'],
    ['a fee tier out of range', respond(is(b64({config: {}})), (r) => changedAnswer(r, (b: {data: {pair_configs: {total_fee_bps: number}[]}}) => { b.data.pair_configs[0]!.total_fee_bps = 50_000; return b; })), 'OUT_OF_RANGE'],
    ['an empty reserve', respond(is(b64({pool: {}})), (r) => changedAnswer(r, (b: {data: {assets: {amount: string}[]}}) => { b.data.assets[0]!.amount = '0'; return b; })), 'OUT_OF_RANGE'],
  ] as const)('oroswap: %s', async (_label, override, reason) => {
    expect(await readOroswap(mirror(replay('oroswap', {override})))).toMatchObject({status: 'unavailable', reason, data: null});
  });
  it('oroswap: fees come from fee_info per pool; farms only when active_pools lists one', async () => {
    const answer = await readOroswap(replay('oroswap'));
    expect(answer.status === 'ok' && answer.data.pools.map(p => [p.id, p.pairType, p.feeBps])).toEqual([['zig-usdc', 'xyk_25', 25], ['zig-usdc-inj', 'xyk_25', 25], ['zig-atom', 'xyk', 1], ['stzig-zig', 'xyk', 1]]);
    expect(answer.status === 'ok' && answer.data.farms).toEqual({active: false, activePools: 0});
    const farms = respond(is(b64({active_pools: {}})), (r) => changedAnswer(r, () => ({data: [['x', '1']]})));
    const on = await readOroswap(replay('oroswap', {override: farms}));
    expect(on.status === 'ok' && on.data.farms.active).toBe(true);
  });
  it('defillama: one app failing leaves the others; all failing is unavailable', async () => {
    const one = await readDefillama(replay('defillama', {override: respond(is('/protocol/oroswap'), () => new Response('{}', {status: 502}))}));
    expect(one.status).toBe('ok');
    expect(one.status === 'ok' && one.data.protocols.oroswap).toEqual({status: 'unavailable', reason: 'UPSTREAM_DOWN'});
    expect(one.status === 'ok' && one.data.protocols['valdora-finance'].status).toBe('ok');
    const range = await readDefillama(replay('defillama', {override: respond(is('/protocol/nawa-protocol'), (r) => changedAnswer(r, (b: object) => ({...b, currentChainTvls: {ZIGChain: -1}})))}));
    expect(range.status === 'ok' && range.data.protocols['nawa-protocol']).toEqual({status: 'unavailable', reason: 'OUT_OF_RANGE'});
    const none = await readDefillama(async () => { throw new TypeError('offline'); });
    expect(none).toMatchObject({status: 'unavailable', reason: 'UPSTREAM_DOWN', data: null});
  });
  it('defillama: only the ZIGChain rows of the five apps are kept, and Permapod\'s incident keeps its date', async () => {
    const answer = await readDefillama(replay('defillama'));
    expect(answer.status).toBe('ok');
    if (answer.status !== 'ok' || answer.data.pools.status !== 'ok') return;
    expect(answer.data.thirdParty).toBe(true);
    expect(answer.data.pools.rows.length).toBeGreaterThan(0);
    expect(answer.data.pools.rows.every(r => ['valdora-finance', 'oroswap', 'nawa-protocol', 'defa-by-invoicemate', 'permapod'].includes(r.project))).toBe(true);
    expect(answer.data.protocols.permapod.status === 'ok' && answer.data.protocols.permapod.incidents).toEqual([{date: '2026-08-29', classification: 'Protocol Logic'}]);
  });
});

describe('rotation, cache, stale-while-error and limits', () => {
  it('moves to Polkachu only when the official mainnet LCD is down', async () => {
    const calls: string[] = [];
    const polkachu = (url: string) => url.replace('https://zigchain-api.polkachu.com', 'https://api.zigchain.com');
    const fetcher = replay('mainnet', {calls, override: (url, init) => url.startsWith('https://api.zigchain.com') ? new Response('{}', {status: 503}) : url.startsWith('https://zigchain-api.polkachu.com') ? replay('mainnet')(polkachu(url), init) : undefined});
    const answer = await readChain(fetcher, 'mainnet');
    expect(answer).toMatchObject({status: 'ok', source: {name: 'ZIGChain mainnet LCD (Polkachu)', origin: 'https://zigchain-api.polkachu.com'}});
    expect(calls.filter(u => u.startsWith('https://api.zigchain.com'))).toHaveLength(1);
    // A wrong answer is not retried elsewhere: only a source that is down or slow is.
    const wrong = await readChain(replay('mainnet', {calls: [], override: respond(is('/node_info'), (r) => changedAnswer(r, (b: {default_node_info: object}) => ({...b, default_node_info: {...b.default_node_info, network: 'x'}})))}), 'mainnet');
    expect(wrong).toMatchObject({status: 'unavailable', reason: 'WRONG_NETWORK'});
  });
  it('serves one read for the TTL, then the last good answer as stale while the source fails, then unavailable', async () => {
    const now = clock();
    let down = false, reads = 0;
    const fetcher = mirror(replay('mainnet', {override: (url) => { if (url.endsWith('/blocks/latest') && url.startsWith('https://api.zigchain.com')) reads++; return down ? new Response('{}', {status: 503}) : undefined; }}));
    const GET = chainRoute(fetcher, now);
    const first = await json(await GET(get('/api/earn/chain?network=mainnet')));
    expect(first).toMatchObject({status: 200, body: {status: 'ok', stale: false}});
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.headers.get('referrer-policy')).toBe('no-referrer');
    await GET(get('/api/earn/chain?network=mainnet'));
    expect(reads).toBe(1);
    now.advance(2 * 60_000 + 1); down = true;
    const stale = await json(await GET(get('/api/earn/chain?network=mainnet')));
    expect(stale).toMatchObject({status: 200, body: {status: 'ok', stale: true, reason: 'UPSTREAM_DOWN'}});
    expect(stale.body.data).toEqual(first.body.data);
    now.advance(11 * 60_000);
    const gone = await json(await GET(get('/api/earn/chain?network=mainnet')));
    expect(gone).toMatchObject({status: 200, body: {status: 'unavailable', reason: 'UPSTREAM_DOWN', data: null}});
    // The testnet answer is its own entry.
    down = false;
    expect((await json(await GET(get('/api/earn/chain?network=testnet')))).body).toMatchObject({status: 'ok', data: {chainId: 'zig-test-2'}});
  });
  it('requests arriving during a read share it', async () => {
    let reads = 0;
    const GET = valdoraRoute(replay('valdora', {override: (url) => { if (url.endsWith('/blocks/latest')) reads++; return undefined; }}), clock());
    const all = await Promise.all([1, 2, 3, 4].map(() => GET(get('/api/earn/valdora'))));
    expect(all.map(r => r.status)).toEqual([200, 200, 200, 200]);
    expect(reads).toBe(1);
  });
  it.each([
    ['/api/earn/chain'], ['/api/earn/chain?network=devnet'], ['/api/earn/chain?network=mainnet&network=testnet'], ['/api/earn/chain?network=mainnet&address=zig1x'],
  ])('chain refuses %s with 400 and reads nothing', async (path) => {
    let calls = 0;
    const r = await chainRoute(async () => { calls++; return new Response('{}'); })(get(path));
    expect(r.status).toBe(400);
    expect(calls).toBe(0);
  });
  it.each([valdoraRoute, oroswapRoute, defillamaRoute])('%o refuses any query', async (route) => {
    let calls = 0;
    const r = await route(async () => { calls++; return new Response('{}'); })(get('/api/earn/x?network=mainnet'));
    expect(r.status).toBe(400);
    expect(calls).toBe(0);
  });
  it('limits one client to 60 requests a minute with 429, RATE_LIMITED and Retry-After; others are unaffected', async () => {
    const now = clock(), GET = oroswapRoute(replay('oroswap'), now);
    for (let i = 0; i < 60; i++) expect((await GET(get('/api/earn/oroswap', '203.0.113.9'))).status).toBe(200);
    const limited = await json(await GET(get('/api/earn/oroswap', '203.0.113.9')));
    expect(limited).toMatchObject({status: 429, body: {status: 'unavailable', reason: 'RATE_LIMITED'}});
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await GET(get('/api/earn/oroswap', '203.0.113.10'))).status).toBe(200);
    now.advance(60_001);
    expect((await GET(get('/api/earn/oroswap', '203.0.113.9'))).status).toBe(200);
  });
  it('a server-wide read limit serves the last good answer, else an honest RATE_LIMITED with 200', async () => {
    const now = clock(), relay = earnRelay<number>({ttlMs: 1, staleMs: 60_000, failMs: 0, loadsPerMinute: 2, now});
    const source = {name: 'Test', origin: 'https://api.zigchain.com'};
    const ok = async () => ({version: 1 as const, status: 'ok' as const, source, fetchedAt: new Date(now()).toISOString(), stale: false, data: 1});
    await relay('k', null, source, ok); now.advance(2); await relay('k', null, source, ok); now.advance(2);
    expect((await relay('k', null, source, ok)).body).toMatchObject({status: 'ok', stale: true, reason: 'RATE_LIMITED'});
    expect((await relay('other', null, source, ok)).body).toMatchObject({status: 'unavailable', reason: 'RATE_LIMITED'});
  });
  it('a fault of the route itself is a 500 with no detail', async () => {
    const r = await chainRoute(async () => { throw Object.assign(new Error('secret detail'), {name: 'TypeError'}); })(get('/api/earn/chain?network=mainnet'));
    expect(r.status).toBe(200);
    const broken = await valdoraRoute(replay('valdora'), () => NaN)(get('/api/earn/valdora'));
    expect(broken.status).toBe(500);
    expect(await broken.text()).not.toMatch(/secret|Error:|at /);
  });
});

describe('Session AF chunk 2: the factory vouches for each pool, the vaults, the measured figure', () => {
  const USDC_INJ = 'ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B', INJ_POOL = 'zig1ewkl2peqhupyfhm6pm7xlufucde7le9zer0wa867u08cveuts2asm0l2z3';
  const heightOf = (init: RequestInit) => (init.headers as Record<string, string> | undefined)?.['x-cosmos-block-height'] ?? null;
  it('oroswap: a pool the factory does not list for its two tokens is PIN_MISMATCH; the USDC.inj pool is read', async () => {
    const ok = await readOroswap(replay('oroswap'));
    expect(ok.status === 'ok' && ok.data.pools.find(p => p.id === 'zig-usdc-inj')).toMatchObject({label: 'ZIG / USDC.inj (Injective)', pairType: 'xyk_25', reserves: [{symbol: 'ZIG'}, {symbol: 'USDC.inj'}]});
    const unlisted = respond(is(b64({pairs_by_assets: {asset_infos: [{native_token: {denom: 'azig'}}, {native_token: {denom: USDC_INJ}}]}})), (r) => changedAnswer(r, (b: {data: {pairs: {contract_addr: string}[]}}) => ({data: {pairs: b.data.pairs.filter(x => x.contract_addr !== INJ_POOL)}})));
    expect(await readOroswap(mirror(replay('oroswap', {override: unlisted})))).toMatchObject({status: 'unavailable', reason: 'PIN_MISMATCH'});
  });
  it('vaults: every USDC vault names its deposit asset (USDC on Noble), share price, paused and pending redemptions', async () => {
    const answer = await readVaults(replay('vaults'));
    expect(answer.status).toBe('ok');
    if (answer.status !== 'ok') return;
    expect(Object.keys(answer.data.vaults)).toEqual(['stablecoin-yield', 'private-credit', 'core-income', 'nawa-usdc']);
    for (const v of Object.values(answer.data.vaults)) expect(v).toMatchObject({status: 'ok', asset: 'USDC.n', assetDenom: 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4', decimals: 6, paused: false});
    expect(answer.data.nawaZig).toMatchObject({status: 'ok', oroswapPool: 'zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq'});
    expect(answer.data.defa).toMatchObject({status: 'ok', activeTvlUnits: expect.stringMatching(/^\d+$/)});
  });
  it('vaults: one vault that is not the version checked, or out of range, is withdrawn alone; all down moves on', async () => {
    const version = respond(u => u.includes('zig1mayx7wkzensav40j3qc8c5lh6s884jlhsu0c0js058t4u9xcg0mql58gkq') && u.includes(b64({contract_version: {}})), (r) => changedAnswer(r, () => ({data: {version: '2.0.0', contract: 'valdora-vault'}})));
    const one = await readVaults(replay('vaults', {override: version}));
    expect(one.status === 'ok' && one.data.vaults['private-credit']).toEqual({status: 'unavailable', reason: 'PIN_MISMATCH'});
    expect(one.status === 'ok' && one.data.vaults['stablecoin-yield'].status).toBe('ok');
    const price = respond(u => u.includes('zig1m526fltgrf70qdsufx9k9fdl4x07usjlydcn32jn83fs6za9c5cswd9grk') && u.includes(b64({price_per_full_share: {}})), (r) => changedAnswer(r, (b: {data: object}) => ({data: {...b.data, price: '40'}})));
    const range = await readVaults(replay('vaults', {override: price}));
    expect(range.status === 'ok' && range.data.vaults['core-income']).toEqual({status: 'unavailable', reason: 'OUT_OF_RANGE'});
    const down = await readVaults(replay('vaults', {override: (url) => url.includes('/cosmwasm/') ? new Response('{}', {status: 503}) : undefined}));
    expect(down).toMatchObject({status: 'unavailable', reason: 'UPSTREAM_DOWN'});
  });
  it('measured: one named validator\'s self-bond, read at two heights 10,000 blocks apart, annualised over the real time', async () => {
    const calls: string[] = [], heights = new Set<string | null>();
    const answer = await readMeasured(replay('measured', {calls, override: (_url, init) => { heights.add(heightOf(init)); return undefined; }}));
    expect(answer.status).toBe('ok');
    if (answer.status !== 'ok') return;
    expect(answer.data.validator).toMatchObject({operator: MEASURED_VALIDATOR, moniker: 'ZIG Sentinel - Foundation 1', commission: '0.050000000000000000'});
    expect(answer.data.delegator).toBe(MEASURED_DELEGATOR);
    expect(BigInt(answer.data.latest.height) - BigInt(answer.data.earlier.height)).toBe(10000n);
    expect([...heights].filter(Boolean).sort()).toEqual([answer.data.earlier.height, answer.data.latest.height].sort());
    expect(answer.data.measured.status === 'ok' && Number(answer.data.measured.rate)).toBeGreaterThan(0.03);
    expect(answer.data.measured.status === 'ok' && Number(answer.data.measured.rate)).toBeLessThan(0.08);
    expect(calls.every(u => u.startsWith('https://api.zigchain.com'))).toBe(true);
  });
  it('measured: rewards that fell in the window (claimed) give REWARDS_CLAIMED with the validator still named', async () => {
    const earlier = (answers.measured!.data as {earlier: {height: string}}).earlier.height;
    const claimed = respond(u => u.includes('/rewards/'), (r, init) => heightOf(init) === earlier ? changedAnswer(r, () => ({rewards: [{denom: 'azig', amount: '999999999999999999999999.0'}]})) : changedAnswer(r, b => b));
    const answer = await readMeasured(replay('measured', {override: claimed}));
    expect(answer.status === 'ok' && answer.data.measured).toEqual({status: 'unavailable', reason: 'REWARDS_CLAIMED'});
    expect(answer.status === 'ok' && answer.data.validator.moniker).toBe('ZIG Sentinel - Foundation 1');
  });
  it('measured: a host without the older block moves to the rotation host; none keeps it → HISTORY_NOT_KEPT', async () => {
    const earlier = (answers.measured!.data as {earlier: {height: string}}).earlier.height;
    const pruned = (_url: string, init: RequestInit) => heightOf(init) === earlier ? new Response('{"code":3,"message":"version does not exist"}', {status: 500}) : undefined;
    const calls: string[] = [], inner = mirror(replay('measured', {override: pruned}));
    const none = await readMeasured((url, init) => { calls.push(url); return inner(url, init); });
    expect(none).toMatchObject({status: 'unavailable', reason: 'HISTORY_NOT_KEPT', data: null});
    expect(calls.some(u => u.startsWith('https://zigchain-api.polkachu.com'))).toBe(true);
    // The official LCD lacks it, Polkachu keeps it: the figure comes from Polkachu and says so.
    const polkachu = (url: string, init: RequestInit) => url.startsWith('https://api.zigchain.com') ? pruned(url, init) : url.startsWith('https://zigchain-api.polkachu.com') ? replay('measured')(url.replace('https://zigchain-api.polkachu.com', 'https://api.zigchain.com'), init) : undefined;
    const moved = await readMeasured(replay('measured', {override: polkachu}));
    expect(moved).toMatchObject({status: 'ok', source: {name: 'ZIGChain mainnet LCD (Polkachu)'}});
  });
  it.each([vaultsRoute, measuredRoute])('%o refuses any query and answers 200 with the envelope', async (route) => {
    let calls = 0;
    expect((await route(async () => { calls++; return new Response('{}'); })(get('/api/earn/x?network=mainnet'))).status).toBe(400);
    expect(calls).toBe(0);
    const r = await json(await route(async () => { throw new TypeError('offline'); })(get('/api/earn/x')));
    expect(r).toMatchObject({status: 200, body: {status: 'unavailable', reason: 'UPSTREAM_DOWN'}});
  });
});
