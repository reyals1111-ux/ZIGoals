import {expect, test, vi} from 'vitest';
import {PUSH_KEY, applicationServerKey, clearPushRecord, postPush, pushAvailability, pushRefusalMessage, readPushRecord, sha256Hex, subscriptionKeys, writePushRecord, type PushRecord} from './client';

// ADR-010 "client.ts": the device record, the key bytes, the calls to /api/push.
const record: PushRecord = {version: 1, subscriptionId: '20000000-0000-4000-8000-000000000002', endpointHash: 'a'.repeat(64), quiet: {from: '22:00', to: '07:00'}, lastSyncDay: '2026-10-05'};
function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, map};
}
test('the device record round-trips; unreadable bytes read as off and stay; clearing removes the key', () => {
  const s = storage();
  expect(readPushRecord(s)).toEqual({data: null, unreadable: false});
  writePushRecord(s, record);
  expect(readPushRecord(s)).toEqual({data: record, unreadable: false});
  expect(() => writePushRecord(s, {...record, endpointHash: 'short'})).toThrow();
  s.setItem(PUSH_KEY, '{"version":2}');
  expect(readPushRecord(s)).toEqual({data: null, unreadable: true});
  expect(s.map.get(PUSH_KEY)).toBe('{"version":2}');
  clearPushRecord(s);
  expect(readPushRecord(s)).toEqual({data: null, unreadable: false});
  expect(readPushRecord({getItem: () => { throw Error('blocked'); }})).toEqual({data: null, unreadable: true});
});
test('the application server key is the 65-byte point of the base64url public key', () => {
  const point = new Uint8Array(65); point[0] = 4; for (let i = 1; i < 65; i++) point[i] = i;
  const text = btoa(String.fromCharCode(...point)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  expect(text).toHaveLength(87);
  expect(applicationServerKey(text)).toEqual(point);
  expect(() => applicationServerKey('A'.repeat(86))).toThrow('not valid');
  expect(() => applicationServerKey('C' + text.slice(1))).toThrow('not valid');
});
test('subscription keys come from the browser JSON; sha256Hex hashes the endpoint', async () => {
  expect(subscriptionKeys({endpoint: 'https://web.push.apple.com/x', keys: {p256dh: 'p', auth: 'a'}})).toEqual({endpoint: 'https://web.push.apple.com/x', p256dh: 'p', auth: 'a'});
  expect(subscriptionKeys({endpoint: 'https://web.push.apple.com/x', keys: {p256dh: 'p'}})).toBeNull();
  expect(subscriptionKeys(null)).toBeNull();
  expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('postPush sends the action with the account header and relays status and JSON; availability reads GET', async () => {
  const calls: {url: string; init?: RequestInit}[] = [];
  const fetcher: typeof fetch = async (input, init) => { calls.push({url: String(input), init}); return Response.json({subscriptionId: record.subscriptionId}, {status: 200}); };
  const answer = await postPush({action: 'unsubscribe', subscriptionId: record.subscriptionId}, '10000000-0000-4000-8000-000000000001', fetcher);
  expect(answer).toEqual({status: 200, data: {subscriptionId: record.subscriptionId}});
  expect(calls[0]!.url).toBe('/api/push'); expect(new Headers(calls[0]!.init?.headers).get('x-zigoals-account')).toBe('10000000-0000-4000-8000-000000000001');
  expect(JSON.parse(calls[0]!.init?.body as string)).toEqual({action: 'unsubscribe', subscriptionId: record.subscriptionId});
  await expect(postPush({action: 'delete-all'}, 'x', async () => new Response('<html>', {status: 502}))).rejects.toThrow('could not be read');
  expect(await pushAvailability(async () => Response.json({publicKey: 'A'.repeat(87)}))).toEqual({available: true, publicKey: 'A'.repeat(87)});
  expect(await pushAvailability(async () => Response.json({error: 'PUSH_UNAVAILABLE'}, {status: 503}))).toEqual({available: false});
  expect(await pushAvailability(async () => Response.json({publicKey: 'short'}))).toEqual({available: false});
});
test('refusals get plain words; an unknown code keeps the server message or a generic line', () => {
  expect(pushRefusalMessage({status: 409, data: {error: 'SUBSCRIPTION_LIMIT'}})).toContain('five devices');
  expect(pushRefusalMessage({status: 401, data: {error: 'SIGN_IN_REQUIRED'}})).toContain('Sign in');
  expect(pushRefusalMessage({status: 503, data: {error: 'PUSH_UNAVAILABLE'}})).toBe('Reminders while ZIGoals is closed are not available in this build.');
  expect(pushRefusalMessage({status: 503, data: {error: 'OTHER', message: 'Said so.'}})).toBe('Said so.');
  expect(pushRefusalMessage({status: 500, data: {}})).toContain('Try again later');
  vi.restoreAllMocks();
});
