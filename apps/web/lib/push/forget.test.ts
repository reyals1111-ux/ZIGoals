import {afterEach, beforeEach, expect, it, vi} from 'vitest';

// Session X Part 8: what leaves for /api/push on sign-out and on account or cloud deletion. Deletion asks the server to
// delete the account's push data even from a device that never turned push on (another device may have); sign-out
// sends nothing without this device's record, as before.
const ACCOUNT = '10000000-0000-4000-8000-000000000001';
const state = vi.hoisted(() => ({account: null as string | null, store: new Map<string, string>()}));
vi.mock('../account-session', () => ({getAccountScope: () => state.account}));
vi.mock('../showcase-storage', () => ({getAppStorage: () => ({getItem: (k: string) => state.store.get(k) ?? null, setItem: (k: string, v: string) => { state.store.set(k, v); }, removeItem: (k: string) => { state.store.delete(k); }})}));
const {forgetPushOnThisDevice} = await import('./device');
const {PUSH_KEY} = await import('./client');
const RECORD = {version: 1, subscriptionId: '20000000-0000-4000-8000-000000000002', endpointHash: 'a'.repeat(64), quiet: {from: '22:00', to: '07:00'}, lastSyncDay: '2026-10-08'};
let calls: {url: string; body: unknown; account: string | null}[] = [];
beforeEach(() => {
  calls = []; state.account = ACCOUNT; state.store.clear();
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls.push({url, body: JSON.parse(String(init.body)), account: new Headers(init.headers).get('x-zigoals-account')}); return new Response('{"deleted":true}', {status: 200}); });
});
afterEach(() => { vi.unstubAllGlobals(); });

it('deletion from a device without a record still asks the server to delete the account\'s push data', async () => {
  await forgetPushOnThisDevice({deleteAll: true});
  expect(calls).toEqual([{url: '/api/push', body: {action: 'delete-all'}, account: ACCOUNT}]);
});
it('sign-out from a device without a record sends nothing; neither does anything without an account', async () => {
  await forgetPushOnThisDevice({deleteAll: false});
  state.account = null;
  await forgetPushOnThisDevice({deleteAll: true});
  expect(calls).toEqual([]);
});
it('with a record: sign-out unsubscribes this device, deletion deletes everything, and the record is forgotten', async () => {
  state.store.set(PUSH_KEY, JSON.stringify(RECORD));
  await forgetPushOnThisDevice({deleteAll: false});
  expect(calls).toEqual([{url: '/api/push', body: {action: 'unsubscribe', subscriptionId: RECORD.subscriptionId}, account: ACCOUNT}]);
  expect(state.store.has(PUSH_KEY)).toBe(false);
  state.store.set(PUSH_KEY, JSON.stringify(RECORD)); calls = [];
  await forgetPushOnThisDevice({deleteAll: true});
  expect(calls).toEqual([{url: '/api/push', body: {action: 'delete-all'}, account: ACCOUNT}]);
  expect(state.store.has(PUSH_KEY)).toBe(false);
});
it('a server that refuses (push not set up: 503) changes nothing and never throws', async () => {
  vi.stubGlobal('fetch', async () => new Response('{"error":"PUSH_UNAVAILABLE"}', {status: 503}));
  await expect(forgetPushOnThisDevice({deleteAll: true})).resolves.toBeUndefined();
});
