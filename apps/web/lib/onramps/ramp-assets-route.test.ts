import {describe, expect, test} from 'vitest';
import fixture from './fixtures/ramp-assets-2026-10-18.json';
import {rampAssetsRoute} from './server/route';
import {FRESH_MS, LOADS_PER_HOUR, RAMP_EGRESS, STALE_MS, loadRampAssets} from './server/ramp-assets';
import {rampAssetsWire} from './ramp-assets';

// Session AF (L2b, Part 4, ADR-028 H35, H58, H89; A2.5): GET /api/onramps/ramp-assets against one recorded real read of
// Ramp's public asset list (reduced) and against each way it can fail. No request leaves the test.
const T0 = Date.parse('2026-10-19T08:00:00.000Z');
const clock = () => { let t = T0; return Object.assign(() => new Date(t), {advance: (ms: number) => { t += ms; }}); };
const get = (query: string, ip = '198.51.100.7') => new Request(`https://alpha.test/api/onramps/ramp-assets${query}`, {headers: {'cf-connecting-ip': ip}});
const recorded = (calls: {url: string; init: RequestInit}[], answer: () => Response | Promise<Response> = () => new Response(JSON.stringify(fixture.answer), {status: 200})) =>
  async (url: string, init: RequestInit) => { calls.push({url, init}); return answer(); };

describe('the route', () => {
  test('Ramp\'s figures for the offered assets only, with source and as of; one plain GET to api.rampnetwork.com with no person\'s data', async () => {
    const calls: {url: string; init: RequestInit}[] = [], now = clock();
    const GET = rampAssetsRoute(recorded(calls), now);
    const r = await GET(get('?currency=EUR'));
    expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store'); expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    const body = rampAssetsWire.parse(await r.json());
    expect(body).toMatchObject({version: 1, status: 'ok', source: 'https://api.rampnetwork.com/api/host-api/v3/assets', currency: 'EUR', asOf: '2026-10-19T08:00:00.000Z', fees: {minFeePercent: 0.99, maxFeePercent: 3.9, minFeeAmount: 2.49, minPurchaseAmount: 6, maxPurchaseAmount: 15000}});
    if (body.status !== 'ok') throw Error('not ok');
    expect(body.assets.map(a => a.code).sort()).toEqual(['ARBITRUM_ETH', 'ARBITRUM_USDC', 'BASE_ETH', 'BASE_USDC', 'BTC_BTC', 'COSMOS_ATOM', 'ETH_ETH', 'ETH_USDC', 'ETH_USDT', 'MATIC_USDC', 'OPTIMISM_ETH', 'OPTIMISM_USDC', 'SOLANA_SOL', 'SOLANA_USDC', 'SOLANA_USDT']);
    expect(body.assets.find(a => a.code === 'COSMOS_ATOM')).toEqual({code: 'COSMOS_ATOM', enabled: true, minPurchaseAmount: 6.25, maxPurchaseAmount: 15000, networkFee: 0.01});
    expect(calls.map(c => c.url)).toEqual(['https://api.rampnetwork.com/api/host-api/v3/assets?currencyCode=EUR']);
    expect(new URL(calls[0]!.url).origin).toBe(RAMP_EGRESS);
    expect(calls[0]!.init).toMatchObject({method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store'});
    expect(Object.keys(calls[0]!.init.headers as Record<string, string>).sort()).toEqual(['accept', 'user-agent']);
  });
  test('strict query: exactly currency=EUR or USD', async () => {
    const GET = rampAssetsRoute(recorded([]), clock());
    for (const q of ['', '?currency=GBP', '?currency=EUR&currency=USD', '?currency=EUR&address=0x52908400098527886E0F7030069857D2E4169EE7', '?cur=EUR'])
      expect((await GET(get(q))).status, q).toBe(400);
  });
  test('cached one hour; on failure the last good list (with its own as of) for up to a day, then unavailable with a reason, always HTTP 200', async () => {
    const calls: {url: string; init: RequestInit}[] = [], now = clock();
    let fail = false;
    const GET = rampAssetsRoute(recorded(calls, () => fail ? new Response('down', {status: 503}) : new Response(JSON.stringify(fixture.answer))), now);
    await GET(get('?currency=EUR')); await GET(get('?currency=EUR'));
    expect(calls).toHaveLength(1);
    now.advance(FRESH_MS + 1); fail = true;
    const stale = await (await GET(get('?currency=EUR'))).json();
    expect(stale).toMatchObject({status: 'ok', asOf: '2026-10-19T08:00:00.000Z'});
    expect(calls).toHaveLength(2);
    now.advance(STALE_MS);
    const gone = await GET(get('?currency=EUR'));
    expect(gone.status).toBe(200);
    expect(await gone.json()).toEqual({version: 1, status: 'unavailable', source: 'https://api.rampnetwork.com/api/host-api/v3/assets', currency: 'EUR', reason: 'UPSTREAM_DOWN'});
  });
  test('each failure has its reason; an answer in another currency or of another shape is MALFORMED; a failure is remembered for a minute', async () => {
    const cases: [() => Response | Promise<Response>, string][] = [
      [() => { throw Object.assign(new Error('slow'), {name: 'TimeoutError'}); }, 'TIMEOUT'],
      [() => new Response('{"nope":1}'), 'MALFORMED'],
      [() => new Response(JSON.stringify({...fixture.answer, currencyCode: 'USD'})), 'MALFORMED'],
      [() => new Response('x'.repeat(600_000)), 'TOO_LARGE'],
      [() => new Response('[]', {status: 500}), 'UPSTREAM_DOWN'],
    ];
    for (const [answer, reason] of cases) {
      const calls: {url: string; init: RequestInit}[] = [];
      const GET = rampAssetsRoute(recorded(calls, answer), clock());
      expect(await (await GET(get('?currency=EUR'))).json(), reason).toMatchObject({status: 'unavailable', reason});
      await GET(get('?currency=EUR'));
      expect(calls, reason).toHaveLength(1);
    }
  });
  test('limits: 30 a minute per client (429 with Retry-After); at most 12 upstream loads an hour per server', async () => {
    const now = clock(), GET = rampAssetsRoute(recorded([]), now);
    for (let i = 0; i < 30; i++) expect((await GET(get('?currency=EUR'))).status).toBe(200);
    const limited = await GET(get('?currency=EUR'));
    expect(limited.status).toBe(429); expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await GET(get('?currency=EUR', '203.0.113.9'))).status).toBe(200);
    const calls: {url: string; init: RequestInit}[] = [], t2 = clock();
    const failing = rampAssetsRoute(recorded(calls, () => new Response('', {status: 503})), t2);
    for (let i = 0; i < 20; i++) { await failing(get('?currency=EUR', `198.51.100.${i}`)); t2.advance(61_000); }
    expect(calls.length).toBe(LOADS_PER_HOUR);
  });
  test('the reader refuses another origin before sending anything', async () => {
    await expect(loadRampAssets('EUR', async () => { throw Error('sent'); })).rejects.toThrow();
    expect(RAMP_EGRESS).toBe('https://api.rampnetwork.com');
  });
});
