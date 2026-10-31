import {describe, expect, it} from 'vitest';
import {beginLichess, exchangeLichessCode, LICHESS_PENDING_KEY, readLichessCallback, s256} from './oauth';

// Session AK (lane C): Lichess OAuth PKCE as documented (OpenAPI v2.0.178): S256 by WebCrypto, the pending record in
// session storage for one round trip, and the token exchange as a form POST. No request leaves the test.
function memory(): Storage {
  const m = new Map<string, string>();
  return {get length() { return m.size; }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }};
}
const ORIGIN = 'https://zigoals.example', NOW = Date.parse('2026-10-31T12:00:00Z');

describe('PKCE', () => {
  it('S256 matches RFC 7636 appendix B', async () => {
    expect(await s256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('refuses a verifier outside 43–128 unreserved characters', async () => {
    await expect(s256('short')).rejects.toThrow(/43 to 128/);
    await expect(s256('a'.repeat(42) + '!')).rejects.toThrow();
  });
});

describe('connecting', () => {
  it('builds Lichess\'s address with the client id, the callback, S256, board:play and a state; keeps the verifier in this tab only', async () => {
    const storage = memory(), href = await beginLichess(ORIGIN, storage, NOW), url = new URL(href);
    expect(`${url.origin}${url.pathname}`).toBe('https://lichess.org/oauth');
    const q = Object.fromEntries(url.searchParams);
    expect(q).toMatchObject({response_type: 'code', client_id: 'zigoals.app', redirect_uri: 'https://zigoals.example/app/chess?lichess=callback', code_challenge_method: 'S256', scope: 'board:play'});
    const pending = JSON.parse(storage.getItem(LICHESS_PENDING_KEY)!);
    expect(pending.state).toBe(q.state);
    expect(pending.verifier).toHaveLength(64);
    expect(await s256(pending.verifier)).toBe(q.code_challenge);
    expect(href).not.toContain(pending.verifier);
  });
  it('the answer: matched once, then the pending record is gone; a wrong state, a late answer or a refusal is said plainly', async () => {
    const storage = memory(); await beginLichess(ORIGIN, storage, NOW);
    const {state, verifier} = JSON.parse(storage.getItem(LICHESS_PENDING_KEY)!);
    expect(readLichessCallback(`?lichess=callback&code=abc&state=${state}`, storage, NOW + 1000)).toEqual({kind: 'code', code: 'abc', verifier});
    expect(storage.getItem(LICHESS_PENDING_KEY)).toBeNull();
    expect(readLichessCallback(`?lichess=callback&code=abc&state=${state}`, storage, NOW + 1000)).toMatchObject({kind: 'refused'});
    await beginLichess(ORIGIN, storage, NOW);
    expect(readLichessCallback('?lichess=callback&code=abc&state=other', storage, NOW)).toMatchObject({kind: 'refused'});
    await beginLichess(ORIGIN, storage, NOW);
    const late = JSON.parse(storage.getItem(LICHESS_PENDING_KEY)!).state;
    expect(readLichessCallback(`?lichess=callback&code=abc&state=${late}`, storage, NOW + 11 * 60_000)).toMatchObject({kind: 'refused', message: expect.stringContaining('10 minutes')});
    await beginLichess(ORIGIN, storage, NOW);
    const denied = JSON.parse(storage.getItem(LICHESS_PENDING_KEY)!).state;
    expect(readLichessCallback(`?lichess=callback&error=access_denied&state=${denied}`, storage, NOW)).toEqual({kind: 'denied'});
    expect(readLichessCallback('?code=abc&state=x', storage, NOW)).toEqual({kind: 'none'});
  });
  it('exchanges the code by a form POST with the verifier, the same callback and client id; keeps nothing on a refusal', async () => {
    let seen: {url: string; init: RequestInit} | null = null;
    const ok = (async (url: string, init: RequestInit) => { seen = {url, init}; return new Response(JSON.stringify({token_type: 'Bearer', access_token: 'lio_FixtureToken01', expires_in: 31536000}), {status: 200}); }) as typeof fetch;
    const grant = await exchangeLichessCode({origin: ORIGIN, code: 'the-code', verifier: 'v'.repeat(64)}, ok, NOW);
    expect(grant).toEqual({accessToken: 'lio_FixtureToken01', expiresAt: '2027-10-31T12:00:00.000Z'});
    expect(seen!.url).toBe('https://lichess.org/api/token');
    expect(seen!.init).toMatchObject({method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
    expect(Object.fromEntries(new URLSearchParams(String(seen!.init.body)))).toEqual({grant_type: 'authorization_code', code: 'the-code', code_verifier: 'v'.repeat(64), redirect_uri: 'https://zigoals.example/app/chess?lichess=callback', client_id: 'zigoals.app'});
    const refused = (async () => new Response(JSON.stringify({error: 'invalid_grant'}), {status: 400})) as unknown as typeof fetch;
    await expect(exchangeLichessCode({origin: ORIGIN, code: 'x', verifier: 'v'.repeat(64)}, refused)).rejects.toThrow(/did not accept/);
    const odd = (async () => new Response(JSON.stringify({token_type: 'mac', access_token: 'lio_FixtureToken01'}), {status: 200})) as unknown as typeof fetch;
    await expect(exchangeLichessCode({origin: ORIGIN, code: 'x', verifier: 'v'.repeat(64)}, odd)).rejects.toThrow();
  });
});
