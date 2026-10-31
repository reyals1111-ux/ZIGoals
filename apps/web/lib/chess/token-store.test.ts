import 'fake-indexeddb/auto';
import {afterEach, describe, expect, it} from 'vitest';
import {forgetLichess, LICHESS_DATABASE, readLichessConnection, saveLichessConnection, type LichessConnection} from './token-store';

// Session AK (lane C): the Lichess token on this device only, in its own IndexedDB database; forgetting deletes the
// database and then revokes the token at Lichess (mocked here).
const record = (over: Partial<LichessConnection> = {}): LichessConnection => ({version: 1, accessToken: 'lio_FixtureToken01', expiresAt: '2027-10-31T12:00:00.000Z', connectedAt: '2026-10-31T12:00:00.000Z', account: {id: 'fictional-me', username: 'Fictional-Me'}, ...over});
const databases = async () => (await indexedDB.databases()).map(d => d.name);
afterEach(async () => { await forgetLichess((async () => new Response(null, {status: 204})) as unknown as typeof fetch); });

describe('the Lichess token store', () => {
  it('keeps and reads one connection in zigoals-lichess-v1', async () => {
    expect(LICHESS_DATABASE).toBe('zigoals-lichess-v1');
    expect(await readLichessConnection()).toBeNull();
    await saveLichessConnection(record());
    expect(await readLichessConnection(Date.parse('2026-11-01T00:00:00Z'))).toEqual(record());
    expect(await databases()).toContain('zigoals-lichess-v1');
  });
  it('an expired token reads as none; a record that does not match the schema is refused', async () => {
    await saveLichessConnection(record({expiresAt: '2026-11-01T00:00:00.000Z'}));
    expect(await readLichessConnection(Date.parse('2026-11-02T00:00:00Z'))).toBeNull();
    await expect(saveLichessConnection({...record(), accessToken: 'has spaces in it'})).rejects.toThrow();
    await expect(saveLichessConnection({...record(), extra: 1} as LichessConnection)).rejects.toThrow();
  });
  it('forgetLichess deletes the database, then revokes the token with DELETE /api/token', async () => {
    await saveLichessConnection(record());
    const calls: {url: string; init: RequestInit}[] = [];
    const result = await forgetLichess((async (url: string, init: RequestInit) => { calls.push({url, init}); return new Response(null, {status: 204}); }) as typeof fetch);
    expect(result).toEqual({hadToken: true, revoked: true});
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://lichess.org/api/token');
    expect(calls[0]!.init).toMatchObject({method: 'DELETE', headers: {Authorization: 'Bearer lio_FixtureToken01'}, credentials: 'omit', referrerPolicy: 'no-referrer'});
    expect(await databases()).not.toContain('zigoals-lichess-v1');
    expect(await readLichessConnection()).toBeNull();
  });
  it('offline: the device still forgets; revoked is false', async () => {
    await saveLichessConnection(record());
    expect(await forgetLichess((async () => { throw new TypeError('offline'); }) as typeof fetch)).toEqual({hadToken: true, revoked: false});
    expect(await readLichessConnection()).toBeNull();
    expect(await forgetLichess((async () => { throw new Error('not called'); }) as typeof fetch)).toEqual({hadToken: false, revoked: false});
  });
});
