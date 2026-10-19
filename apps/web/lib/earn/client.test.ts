import {afterEach, describe, expect, it, vi} from 'vitest';
import live from './fixtures/live-2026-10-19.json';
import validators from './fixtures/validators-2026-10-19.json';
import {readEarn, readValidators} from './client';
import {bps, duration, large, pct, pctShort, tokenAmount, updatedAgo, zig} from './format';

/** Session AF (L1): the Earn page's reads and its number formats. */
afterEach(() => vi.unstubAllGlobals());
const respond = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), {status})));

describe('the page reads only its own routes and shows nothing it cannot check', () => {
  it('a good answer is shown; the request is same-origin, GET, no credentials', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(live.answers.valdora)));
    vi.stubGlobal('fetch', fetch);
    const state = await readEarn('valdora');
    expect(state.phase).toBe('ok');
    expect(fetch).toHaveBeenCalledWith('/api/earn/valdora', expect.objectContaining({method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'}));
  });
  it.each([
    [200, {version: 1, status: 'unavailable', reason: 'TIMEOUT', source: live.answers.chainMainnet.source, fetchedAt: '2026-10-19T00:00:00.000Z', stale: false, data: null}, 'TIMEOUT'],
    [200, {...live.answers.chainMainnet, status: 'unavailable', reason: 'TIMEOUT', data: null}, 'MALFORMED'],
    [429, {version: 1, status: 'unavailable', reason: 'RATE_LIMITED', source: {name: 'x', origin: 'https://api.zigchain.com'}, fetchedAt: '2026-10-19T00:00:00.000Z', stale: false, data: null}, 'RATE_LIMITED'],
    [404, 'Not found', 'NOT_IN_THIS_BUILD'],
    [500, {error: 'x'}, 'UPSTREAM_DOWN'],
    [200, {version: 2, status: 'ok'}, 'MALFORMED'],
    [200, '{"version":1,', 'MALFORMED'],
  ])('HTTP %s with an odd or unavailable body is unavailable (%s)', async (status, body, reason) => {
    respond(status, body);
    expect(await readEarn('chain')).toMatchObject({phase: 'unavailable', reason});
  });
  it('a network failure is unavailable, never a thrown error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await readEarn('oroswap')).toEqual({phase: 'unavailable', reason: 'UPSTREAM_DOWN'});
  });
  it('reads lane L2a\'s validators shape strictly where it is shown', async () => {
    respond(200, validators.answer);
    const state = await readValidators();
    expect(state.phase).toBe('ok');
    if (state.phase !== 'ok') return;
    expect(state.answer.data.validators.length).toBe(validators.answer.validators.length);
    expect(state.answer.source.name).toBe('ZIGChain mainnet LCD (official)');
    respond(200, {...validators.answer, validators: [{...validators.answer.validators[0], operator: 'zig1notavaloper'}]});
    expect(await readValidators()).toMatchObject({phase: 'unavailable', reason: 'MALFORMED'});
    respond(404, 'Not found');
    expect(await readValidators()).toEqual({phase: 'unavailable', reason: 'NOT_IN_THIS_BUILD'});
    // crit1: a route that is down did not answer (as readEarn); it is not "not in the shape ZIGoals checks for".
    respond(503, {error: 'offline fixture'});
    expect(await readValidators()).toEqual({phase: 'unavailable', reason: 'UPSTREAM_DOWN'});
    respond(429, {error: 'slow down'});
    expect(await readValidators()).toEqual({phase: 'unavailable', reason: 'RATE_LIMITED'});
  });
});

describe('number formats', () => {
  it('writes amounts and rates plainly', () => {
    expect(zig('50000000000000000000')).toBe('50 ZIG');
    expect(zig('425559497761956330156508434', {compact: true})).toBe('425.6 million ZIG');
    expect(zig('24438865427046207987769200.159838743647053428', {compact: true})).toBe('24.4 million ZIG');
    expect(tokenAmount('181660424460329', 6, 'stZIG', {compact: true})).toBe('181.7 million stZIG');
    expect(tokenAmount('42158523948', 6, 'USDC', {compact: true})).toBe('42,159 USDC');
    expect(large(2_337_760_212)).toBe('2.3 billion');
    expect(pct('0.057427611310690302')).toBe('5.74 %');
    expect(pctShort('0.075000')).toBe('7.5 %');
    expect(pctShort('0.050000000000000000')).toBe('5 %');
    expect(bps(25)).toBe('0.25 %');
    expect(bps(2000)).toBe('20 %');
    expect(duration(1_814_400)).toBe('21 days');
    expect(duration(600)).toBe('10 minutes');
    const now = Date.parse('2026-10-19T08:00:00Z');
    expect(updatedAgo('2026-10-19T08:00:00Z', now)).toBe('updated just now');
    expect(updatedAgo('2026-10-19T07:57:00Z', now)).toBe('updated 3 min ago');
    expect(updatedAgo('2026-10-19T05:00:00Z', now)).toBe('updated 3 h ago');
    expect(() => pct('n/a')).toThrow();
  });
});
