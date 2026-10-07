import 'fake-indexeddb/auto';
import {afterEach, expect, test, vi} from 'vitest';
import {createEmptyHealth} from '../health';
import {healthGroupIn} from '../vault/w-homes';
import {LINK_TOKENS_DATABASE, readTokens, sealTokens} from '../links/token-store';
import {sizeCheck} from '../import/switch/apply';
import {beginLink, readCallback} from './oauth';
import {finishLink, syncedHealth, unlink, userIdOf} from './flow';
import {freshTokens, syncLink} from './sync';

// Session W Part 8, end to end with MOCK answers from /api/health-link: connect (state checked, code exchanged, Polar's
// registration, tokens sealed with the service's user id), sync into the journal under the size rule, refresh keeping
// the user id, Disconnect revoking with it and forgetting the tokens even when the revoke fails.
class Memory implements Storage { private m = new Map<string, string>(); get length() { return this.m.size; } clear() { this.m.clear(); } getItem(k: string) { return this.m.get(k) ?? null; } key(i: number) { return [...this.m.keys()][i] ?? null; } removeItem(k: string) { this.m.delete(k); } setItem(k: string, v: string) { this.m.set(k, v); } }
const ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NOW = Date.parse('2026-10-07T08:00:00Z');
afterEach(async () => { vi.unstubAllGlobals(); await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(LINK_TOKENS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); });
function route(answer: (body: Record<string, unknown>) => {status?: number; json: unknown}) {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => { const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>; bodies.push(body); const a = answer(body); return Response.json(a.json, {status: a.status ?? 200}); }));
  return bodies;
}

test('Polar, connected and disconnected: the code once, the registration, the user id sealed with the tokens and used to revoke', async () => {
  const storage = new Memory(), url = new URL(await beginLink('polar', {clientId: 'fixture-polar', redirectUri: 'https://app.test/app/health'}, ACCOUNT, storage, NOW));
  const callback = readCallback(`?code=CODE-POLAR-1&state=${url.searchParams.get('state')}`, ACCOUNT, storage, NOW + 30_000);
  if (callback.kind !== 'code') throw Error(`expected a code, got ${callback.kind}`);
  const bodies = route(body => body.action === 'token' ? {json: {accessToken: 'FAKE-POLAR-ACCESS', expiresAt: '2027-10-07T08:00:00.000Z', userId: '10101010'}} : {json: {ok: true}});
  await finishLink(ACCOUNT, callback.provider, callback.code, callback.verifier, () => 'member-fixture-0001');
  expect(bodies).toEqual([{action: 'token', provider: 'polar', code: 'CODE-POLAR-1'}, {action: 'register', provider: 'polar', accessToken: 'FAKE-POLAR-ACCESS', memberId: 'member-fixture-0001'}]);
  const sealed = await readTokens(ACCOUNT, 'polar');
  expect(sealed).toEqual({accessToken: 'FAKE-POLAR-ACCESS', expiresAt: '2027-10-07T08:00:00.000Z', scope: 'user:10101010'});
  expect(userIdOf(sealed)).toBe('10101010');
  // A sync: Polar's three lists, mapped and written under the size rule.
  route(body => {
    if (body.request === 'polar.sleep') return {json: {data: {nights: [{date: '2026-10-06', sleep_start_time: '2026-10-06T00:00:00+03:00', sleep_end_time: '2026-10-06T07:30:00+03:00', light_sleep: 14400, deep_sleep: 6000, rem_sleep: 4800, unrecognized_sleep_stage: 0}]}}};
    if (body.request === 'polar.activities') return {json: {data: [{steps: 9100, samples: {date: '2026-10-06'}}]}};
    return {json: {data: [{start_time: '2026-10-06T18:00:00', start_time_utc_offset: 180, duration: 'PT45M', sport: 'CYCLING'}]}};
  });
  const items = await syncLink(ACCOUNT, ACCOUNT, 'polar', {zone: 'Europe/Brussels', now: NOW});
  const {next, added} = syncedHealth(createEmptyHealth(), items, 2_000_000);
  expect(added).toBe(3);
  expect(healthGroupIn(next, 'sleep')?.nights.map(n => n.source)).toEqual(['polar-link']);
  expect(next.activity.map(a => a.name).sort()).toEqual(['Cycling · Polar', 'Steps · Polar']);
  expect(syncedHealth(next, items, 2_000_000).added).toBe(0);
  const bytes = sizeCheck(next, Infinity).bytes;
  expect(syncedHealth(createEmptyHealth(), items, bytes).added).toBe(3);
  expect(() => syncedHealth(createEmptyHealth(), items, bytes - 1)).toThrow(/storage is full/);
  // Disconnect: revoked with the user id, tokens forgotten.
  const revoke = route(() => ({json: {ok: true}}));
  expect(await unlink(ACCOUNT, 'polar')).toEqual({revoked: true});
  expect(revoke).toEqual([{action: 'revoke', provider: 'polar', accessToken: 'FAKE-POLAR-ACCESS', userId: '10101010'}]);
  expect(await readTokens(ACCOUNT, 'polar')).toBeNull();
});

test('a refresh keeps the service\'s user id (or takes the new one it states); a revoke that fails still forgets the tokens', async () => {
  await sealTokens(ACCOUNT, 'withings', {accessToken: 'FAKE-WITHINGS-OLD', refreshToken: 'FAKE-WITHINGS-REF-1', expiresAt: new Date(NOW - 1000).toISOString(), scope: 'user:363'});
  route(() => ({json: {accessToken: 'FAKE-WITHINGS-NEW', refreshToken: 'FAKE-WITHINGS-REF-2', expiresAt: new Date(NOW + 10_800_000).toISOString(), scope: 'user.activity,user.metrics'}}));
  expect(await freshTokens(ACCOUNT, ACCOUNT, 'withings', NOW)).toEqual({accessToken: 'FAKE-WITHINGS-NEW', refreshToken: 'FAKE-WITHINGS-REF-2', expiresAt: new Date(NOW + 10_800_000).toISOString(), scope: 'user:363'});
  await sealTokens(ACCOUNT, 'withings', {accessToken: 'FAKE-WITHINGS-NEW', refreshToken: 'FAKE-WITHINGS-REF-2', expiresAt: new Date(NOW - 1000).toISOString(), scope: 'user:363'});
  route(() => ({json: {accessToken: 'FAKE-WITHINGS-NEWER', refreshToken: 'FAKE-WITHINGS-REF-3', userId: '364'}}));
  expect(userIdOf(await freshTokens(ACCOUNT, ACCOUNT, 'withings', NOW))).toBe('364');
  route(() => ({status: 502, json: {error: 'PROVIDER_UNAVAILABLE'}}));
  expect(await unlink(ACCOUNT, 'withings')).toEqual({revoked: false});
  expect(await readTokens(ACCOUNT, 'withings')).toBeNull();
});
