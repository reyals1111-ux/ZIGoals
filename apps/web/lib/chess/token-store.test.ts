import 'fake-indexeddb/auto';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {deviceLockedHere, forgetLichess, LICHESS_DATABASE, lichessAccess, lichessAccessFrom, readLichessConnection, revokeEveryLichess, saveLichessConnection, type LichessAccess, type LichessConnection} from './token-store';
import {LINK_TOKENS_DATABASE, linkedScopes, readConnection} from '../links/token-store';
import {eraseDeviceServices} from '../erase-everything';
import {forgetAiAccount} from '../ai/account';

// Session AK (lane C; security review M1, L4, lane W): the Lichess connection is sealed in the device's sign-in store for
// the open account (or "local"), never read while ZIGoals is locked or in the Showcase; forgetting removes it first and
// then revokes the token at Lichess (mocked here).
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const open = (scope: string): LichessAccess => ({kind: 'open', scope});
const LOCAL = open('local');
const record = (over: Partial<LichessConnection> = {}): LichessConnection => ({version: 1, accessToken: 'lio_FixtureToken01', expiresAt: '2027-10-31T12:00:00.000Z', connectedAt: '2026-10-31T12:00:00.000Z', account: {id: 'fictional-me', username: 'Fictional-Me'}, ...over});
const databases = async () => (await indexedDB.databases()).map(d => d.name);
const ok = (async () => new Response(null, {status: 204})) as unknown as typeof fetch;
const drop = (name: string) => new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
async function rawSlots(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => { const o = indexedDB.open(LINK_TOKENS_DATABASE, 1); o.onsuccess = () => { const db = o.result, store = db.transaction('tokens', 'readonly').objectStore('tokens'), keys = store.getAllKeys(), values = store.getAll(); values.onsuccess = () => { db.close(); resolve(Object.fromEntries((keys.result as string[]).map((k, i) => [k, values.result[i]]))); }; values.onerror = () => reject(values.error); }; o.onerror = () => reject(o.error); });
}
/** The first build's plaintext database, as it wrote it (one record for the whole device). */
function plantLegacy(token = 'lio_LegacyToken99'): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(LICHESS_DATABASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('connection');
    r.onsuccess = () => { const db = r.result, t = db.transaction('connection', 'readwrite'); t.objectStore('connection').put({...record(), accessToken: token}, 'lichess'); t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error); };
    r.onerror = () => reject(r.error);
  });
}
afterEach(async () => { await drop(LINK_TOKENS_DATABASE); await drop(LICHESS_DATABASE); vi.unstubAllGlobals(); });

describe('the Lichess token store', () => {
  it('keeps and reads one connection per scope, sealed in the sign-in store (nothing readable on disk)', async () => {
    expect(await readLichessConnection(LOCAL)).toBeNull();
    await saveLichessConnection(LOCAL, record());
    expect(await readLichessConnection(LOCAL, Date.parse('2026-11-01T00:00:00Z'))).toEqual(record());
    expect(await databases()).toContain(LINK_TOKENS_DATABASE);
    expect(await databases()).not.toContain(LICHESS_DATABASE);
    const disk = JSON.stringify(await rawSlots());
    expect(Object.keys(await rawSlots())).toEqual(['local:lichess']);
    expect(disk).not.toContain('lio_FixtureToken01'); expect(disk).not.toContain('Fictional-Me'); expect(disk).toMatch(/"ciphertext"/);
  });
  it('an expired token reads as none; a record that does not match the schema is refused', async () => {
    await saveLichessConnection(LOCAL, record({expiresAt: '2026-11-01T00:00:00.000Z'}));
    expect(await readLichessConnection(LOCAL, Date.parse('2026-11-02T00:00:00Z'))).toBeNull();
    await expect(saveLichessConnection(LOCAL, {...record(), accessToken: 'has spaces in it'})).rejects.toThrow();
    await expect(saveLichessConnection(LOCAL, {...record(), extra: 1} as LichessConnection)).rejects.toThrow();
  });
  it('isolation: account A\'s token is not readable as account B, as "local", while locked, or in the Showcase', async () => {
    await saveLichessConnection(open(A), record());
    expect(await readLichessConnection(open(A))).toEqual(record());
    expect(await readLichessConnection(open(B))).toBeNull();
    expect(await readLichessConnection(LOCAL)).toBeNull();
    expect(await readLichessConnection({kind: 'locked'})).toBeNull();
    expect(await readLichessConnection({kind: 'showcase'})).toBeNull();
    // Nothing is kept while locked or in the Showcase, and the sealed slot of A opens only as A.
    await expect(saveLichessConnection({kind: 'locked'}, record())).rejects.toThrow(/Unlock/);
    await expect(saveLichessConnection({kind: 'showcase'}, record())).rejects.toThrow(/Showcase/);
    await expect(saveLichessConnection(open('showcase'), record())).rejects.toThrow(/Showcase/);
    expect(await readConnection(B, 'lichess')).toBeNull();
    expect(await linkedScopes()).toEqual([A]);
    // Forgetting while locked forgets nothing and sends nothing; B's Disconnect leaves A's connection alone.
    const never = vi.fn(ok);
    expect(await forgetLichess({kind: 'locked'}, never)).toEqual({hadToken: false, revoked: false});
    expect(await forgetLichess(open(B), never)).toEqual({hadToken: false, revoked: false});
    expect(never).not.toHaveBeenCalled();
    expect(await readLichessConnection(open(A))).toEqual(record());
    // Deleting account A from this device (forgetAiAccount) removes its Lichess connection with its other sign-ins.
    await forgetAiAccount(A);
    expect(await readLichessConnection(open(A))).toBeNull();
  });
  it('who may use it: the Showcase and a lock (screen or account) refuse; an open account uses its own scope, no account "local"', () => {
    expect(lichessAccessFrom({showcase: true, accountScope: null, accountLocked: false, deviceLocked: false})).toEqual({kind: 'showcase'});
    expect(lichessAccessFrom({showcase: false, accountScope: null, accountLocked: true, deviceLocked: true})).toEqual({kind: 'locked'});
    expect(lichessAccessFrom({showcase: false, accountScope: A, accountLocked: true, deviceLocked: false})).toEqual({kind: 'locked'});
    expect(lichessAccessFrom({showcase: false, accountScope: A, accountLocked: false, deviceLocked: true})).toEqual({kind: 'locked'});
    expect(lichessAccessFrom({showcase: false, accountScope: A, accountLocked: false, deviceLocked: false})).toEqual(open(A));
    expect(lichessAccessFrom({showcase: false, accountScope: null, accountLocked: true, deviceLocked: false})).toEqual(LOCAL);
    expect(lichessAccess()).toEqual({kind: 'locked'}); // no window: nothing is used
  });
  it('the screen lock counts until this tab is unlocked; storage that cannot be read fails closed', () => {
    const store = (items: Record<string, string>) => ({getItem: (k: string) => items[k] ?? null});
    const lock = JSON.stringify({version: 1, salt: '0'.repeat(32), hash: '0'.repeat(64), failures: 0, retryAt: 0});
    vi.stubGlobal('window', {localStorage: store({}), sessionStorage: store({})});
    expect(deviceLockedHere()).toBe(false);
    vi.stubGlobal('window', {localStorage: store({'zigoals:device-lock:v1': lock}), sessionStorage: store({})});
    expect(deviceLockedHere()).toBe(true);
    vi.stubGlobal('window', {localStorage: store({'zigoals:device-lock:v1': lock}), sessionStorage: store({'zigoals:device-lock:unlocked': '1'})});
    expect(deviceLockedHere()).toBe(false);
    vi.stubGlobal('window', {localStorage: store({'zigoals:device-lock:v1': lock}), get sessionStorage(): Storage { throw Error('refused'); }});
    expect(deviceLockedHere()).toBe(true);
  });
  it('forgetLichess forgets the scope\'s connection, then revokes the token with DELETE /api/token', async () => {
    await saveLichessConnection(LOCAL, record());
    const calls: {url: string; init: RequestInit}[] = [];
    const result = await forgetLichess(LOCAL, (async (url: string, init: RequestInit) => { calls.push({url, init}); return new Response(null, {status: 204}); }) as typeof fetch);
    expect(result).toEqual({hadToken: true, revoked: true});
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://lichess.org/api/token');
    expect(calls[0]!.init).toMatchObject({method: 'DELETE', headers: {Authorization: 'Bearer lio_FixtureToken01'}, credentials: 'omit', referrerPolicy: 'no-referrer'});
    expect(await rawSlots()).toEqual({});
    expect(await readLichessConnection(LOCAL)).toBeNull();
  });
  it('offline: the device still forgets; revoked is false', async () => {
    await saveLichessConnection(LOCAL, record());
    expect(await forgetLichess(LOCAL, (async () => { throw new TypeError('offline'); }) as typeof fetch)).toEqual({hadToken: true, revoked: false});
    expect(await readLichessConnection(LOCAL)).toBeNull();
    expect(await forgetLichess(LOCAL, (async () => { throw new Error('not called'); }) as typeof fetch)).toEqual({hadToken: false, revoked: false});
  });
  it('a plaintext record left by the first build is revoked and deleted, never read as a connection', async () => {
    await plantLegacy();
    const calls: string[] = [];
    expect(await forgetLichess(LOCAL, (async (_url: string, init: RequestInit) => { calls.push(String((init.headers as Record<string, string>).Authorization)); return new Response(null, {status: 204}); }) as typeof fetch)).toEqual({hadToken: false, revoked: false});
    expect(calls).toEqual(['Bearer lio_LegacyToken99']);
    expect(await databases()).not.toContain(LICHESS_DATABASE);
  });
});

describe('Erase everything on this device (security review L4)', () => {
  it('revokes every scope\'s Lichess token (and a first-build record) before the databases go, after the other device services', async () => {
    await saveLichessConnection(open(A), record({accessToken: 'lio_AccountA001'}));
    await saveLichessConnection(LOCAL, record({accessToken: 'lio_LocalToken1'}));
    await plantLegacy();
    const revoked: string[] = [], order: string[] = [];
    const fetcher = (async (_url: string, init: RequestInit) => { revoked.push(String((init.headers as Record<string, string>).Authorization).slice(7)); return new Response(null, {status: 204}); }) as typeof fetch;
    await eraseDeviceServices({turnOffNotifications: async () => { order.push('notifications'); }, forgetOfflineCaches: async () => { order.push('caches'); }, revokeLichess: async () => { order.push('lichess'); return revokeEveryLichess(fetcher); }});
    expect(order).toEqual(['notifications', 'caches', 'lichess']);
    expect(revoked.sort()).toEqual(['lio_AccountA001', 'lio_LegacyToken99', 'lio_LocalToken1']);
    expect(await rawSlots()).toEqual({});
    // A failing revoke never stops the erase.
    await expect(eraseDeviceServices({turnOffNotifications: async () => undefined, forgetOfflineCaches: async () => undefined, revokeLichess: async () => { throw Error('offline'); }})).resolves.toBeUndefined();
  });
  it('the Settings button wires the revoke in', async () => {
    const {readFileSync} = await import('node:fs');
    const text = readFileSync(new URL('../erase-everything.ts', import.meta.url), 'utf8');
    expect(text).toMatch(/const revokeLichess = async \(\) => \(await import\('\.\/chess\/token-store'\)\)\.revokeEveryLichess\(\);/);
    expect(text).toMatch(/await eraseDeviceServices\(\{[^}]*\brevokeLichess\b[^}]*\}\);\s*return eraseEverything\(\);/);
  });
});
