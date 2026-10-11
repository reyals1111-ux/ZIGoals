import 'fake-indexeddb/auto';
import {afterEach, expect, test, vi} from 'vitest';
import {LINK_TOKENS_DATABASE, readTokens, sealTokens} from '../links/token-store';
import {freshTokens, ReconnectRequired, syncLink} from './sync';

// Session W Part 8: a sync with MOCK answers from /api/health-link: tokens refreshed when about to expire (the rotated
// refresh token kept), an expired grant removes the tokens and asks to connect again, pages followed, records mapped.
const ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NOW = Date.parse('2026-10-07T08:00:00Z');
afterEach(async () => { vi.unstubAllGlobals(); await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(LINK_TOKENS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); });
function route(answer: (body: Record<string, unknown>) => {status?: number; json: unknown}) {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => { const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>; bodies.push(body); const a = answer(body); return Response.json(a.json, {status: a.status ?? 200}); }));
  return bodies;
}
test('fresh tokens are used as they are; tokens about to expire are refreshed once and sealed again with the rotated refresh token', async () => {
  await sealTokens(ACCOUNT, 'oura', {accessToken: 'FAKE-ACCESS-OLD-1', refreshToken: 'FAKE-REFRESH-OLD-1', expiresAt: new Date(NOW + 3_600_000).toISOString()});
  expect((await freshTokens(ACCOUNT, ACCOUNT, 'oura', NOW)).accessToken).toBe('FAKE-ACCESS-OLD-1');
  const bodies = route(() => ({json: {accessToken: 'FAKE-ACCESS-NEW-2', refreshToken: 'FAKE-REFRESH-NEW-2', expiresAt: new Date(NOW + 86_400_000).toISOString()}}));
  expect((await freshTokens(ACCOUNT, ACCOUNT, 'oura', NOW + 3_590_000)).accessToken).toBe('FAKE-ACCESS-NEW-2');
  expect(bodies).toEqual([{action: 'refresh', provider: 'oura', refreshToken: 'FAKE-REFRESH-OLD-1'}]);
  expect(await readTokens(ACCOUNT, 'oura')).toMatchObject({accessToken: 'FAKE-ACCESS-NEW-2', refreshToken: 'FAKE-REFRESH-NEW-2'});
});
test('an expired grant removes the tokens and asks to connect again', async () => {
  await sealTokens(ACCOUNT, 'strava', {accessToken: 'FAKE-ACCESS-OLD-1', refreshToken: 'FAKE-REFRESH-OLD-1', expiresAt: new Date(NOW - 1000).toISOString()});
  route(() => ({status: 409, json: {error: 'RECONNECT_REQUIRED'}}));
  await expect(freshTokens(ACCOUNT, ACCOUNT, 'strava', NOW)).rejects.toBeInstanceOf(ReconnectRequired);
  expect(await readTokens(ACCOUNT, 'strava')).toBeNull();
});
test('a sync follows Oura\'s pages and maps what comes back; a token the service refuses removes the link', async () => {
  await sealTokens(ACCOUNT, 'oura', {accessToken: 'FAKE-ACCESS-OK-12', expiresAt: new Date(NOW + 86_400_000).toISOString()});
  const bodies = route(body => {
    if (body.request === 'oura.daily_activity') { const second = !!(body.params as Record<string, string>).next_token; return {json: {data: {data: [{day: second ? '2026-10-05' : '2026-10-06', steps: second ? 6001 : 8123, active_calories: 410}], next_token: second ? null : 'PAGE2'}}}; }
    return {json: {data: {data: [], next_token: null}}};
  });
  const items = await syncLink(ACCOUNT, ACCOUNT, 'oura', {zone: 'Europe/Brussels', now: NOW});
  expect(bodies.filter(b => b.request === 'oura.daily_activity').map(b => (b.params as Record<string, string>).next_token ?? null)).toEqual([null, 'PAGE2']);
  expect(bodies[0]).toMatchObject({action: 'data', provider: 'oura', request: 'oura.sleep', params: {start_date: '2026-09-07', end_date: '2026-10-07'}});
  expect(items.activity.map(a => [a.date, a.steps, a.id.startsWith('health_imp-oura-link-')])).toEqual([['2026-10-06', 8123, true], ['2026-10-05', 6001, true]]);
  expect(items.vitals.map(v => [v.id, v.activeKcal])).toEqual([['health_vital-oura-link-2026-10-06', 410], ['health_vital-oura-link-2026-10-05', 410]]);
  route(() => ({status: 401, json: {error: 'TOKEN_EXPIRED'}}));
  await expect(syncLink(ACCOUNT, ACCOUNT, 'oura', {zone: 'UTC', now: NOW})).rejects.toBeInstanceOf(ReconnectRequired);
  expect(await readTokens(ACCOUNT, 'oura')).toBeNull();
});
