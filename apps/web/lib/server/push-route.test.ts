import {afterEach, expect, test, vi} from 'vitest';
import {PUSH_UNAVAILABLE, pushRequest, type PushConfig} from './push-route';

// /api/push (ADR-010): the flag, the session check through private sync, the forwarded headers, the relayed answer.
const PUBLIC_KEY = 'B'.repeat(87), config: PushConfig = {syncOrigin: 'https://sync.fixture.workers.dev', pushOrigin: 'https://push.fixture.workers.dev', pushPublicKey: PUBLIC_KEY};
const ORIGIN = 'https://app.test', ACCOUNT = '10000000-0000-4000-8000-000000000001', cookie = '__Host-zigoals_session=fixture-token';
const subscribe = {action: 'subscribe', endpoint: 'https://web.push.apple.com/push/x', p256dh: 'A'.repeat(87), auth: 'B'.repeat(22), zone: 'Europe/Brussels', quiet: {from: '22:00', to: '07:00'}, schedules: [{time: '08:00', zone: 'Europe/Brussels', weekdays: 127}]};
type Call = {url: string; init: RequestInit | undefined};
function fetcher(sessions: () => Response, push: () => Response = () => Response.json({subscriptionId: '20000000-0000-4000-8000-000000000002', schedules: 1, subscriptions: 1})) {
  const calls: Call[] = [];
  const f: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({url, init});
    return (url.startsWith(config.syncOrigin) ? sessions : push)();
  };
  return {calls, fetch: f};
}
const post = (body: unknown, headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/push`, {method: 'POST', headers: {origin: ORIGIN, 'content-type': 'application/json', cookie, 'X-Zigoals-Account': ACCOUNT, ...headers}, body: JSON.stringify(body)});
afterEach(() => vi.restoreAllMocks());

test('GET answers the public key, or 503 PUSH_UNAVAILABLE while the two values are not set (the flag is off)', async () => {
  const off = await pushRequest(new Request(`${ORIGIN}/api/push`), null, async () => { throw Error('must not fetch'); });
  expect(off.status).toBe(503); expect(await off.json()).toEqual(PUSH_UNAVAILABLE); expect(off.headers.get('cache-control')).toBe('no-store');
  const partial = await pushRequest(new Request(`${ORIGIN}/api/push`), {...config, pushPublicKey: 'short'}, async () => { throw Error('must not fetch'); });
  expect(partial.status).toBe(503);
  const on = await pushRequest(new Request(`${ORIGIN}/api/push`), config, async () => { throw Error('must not fetch'); });
  expect(on.status).toBe(200); expect(await on.json()).toEqual({publicKey: PUBLIC_KEY});
});
test('POST: a foreign origin, a non-JSON body, an invalid action, a missing cookie, duplicate cookies and a missing account are refused before any upstream call', async () => {
  const f = fetcher(() => Response.json({sessions: []}));
  const log = vi.spyOn(console, 'log').mockImplementation(() => {}), error = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect((await pushRequest(post(subscribe, {origin: 'https://evil.test'}), config, f.fetch)).status).toBe(403);
  expect((await pushRequest(post(subscribe, {'content-type': 'text/plain'}), config, f.fetch)).status).toBe(415);
  for (const bad of [{action: 'subscribe'}, {...subscribe, extra: 1}, {...subscribe, schedules: [{time: '24:00', zone: 'UTC', weekdays: 1}]}, {action: 'unsubscribe', subscriptionId: 'x'}, {action: 'delete-all', confirm: 'x'}]) {
    const res = await pushRequest(post(bad), config, f.fetch); expect(res.status, JSON.stringify(bad)).toBe(400); expect(await res.json()).toEqual({error: 'INVALID_PUSH_REQUEST'});
  }
  expect((await pushRequest(post(subscribe, {cookie: ''}), config, f.fetch)).status).toBe(401);
  expect((await pushRequest(post(subscribe, {cookie: `${cookie}; ${cookie}`}), config, f.fetch)).status).toBe(400);
  expect((await pushRequest(post(subscribe, {'X-Zigoals-Account': 'not-a-uuid'}), config, f.fetch)).status).toBe(400);
  expect((await pushRequest(post(subscribe), null, f.fetch)).status).toBe(503);
  expect(f.calls).toHaveLength(0);
  expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
});
test('POST confirms the session with private sync, then forwards the action with the bearer, the origin and the account, and relays the answer', async () => {
  const f = fetcher(() => Response.json({sessions: []}));
  const res = await pushRequest(post(subscribe, {'X-Zigoals-Account': ACCOUNT.toUpperCase()}), config, f.fetch);
  expect(res.status).toBe(200); expect(await res.json()).toEqual({subscriptionId: '20000000-0000-4000-8000-000000000002', schedules: 1, subscriptions: 1});
  expect(f.calls.map(c => c.url)).toEqual([`${config.syncOrigin}/v1/sessions`, `${config.pushOrigin}/v1/push`]);
  const sessions = new Headers(f.calls[0]!.init?.headers);
  expect(sessions.get('authorization')).toBe('Bearer fixture-token'); expect(sessions.get('origin')).toBe(ORIGIN); expect(sessions.get('x-zigoals-account')).toBe(ACCOUNT);
  const forwarded = f.calls[1]!.init!, headers = new Headers(forwarded.headers);
  expect(forwarded.method).toBe('POST'); expect(headers.get('authorization')).toBe('Bearer fixture-token'); expect(headers.get('origin')).toBe(ORIGIN); expect(headers.get('x-zigoals-account')).toBe(ACCOUNT); expect(headers.get('content-type')).toBe('application/json');
  expect(JSON.parse(forwarded.body as string)).toEqual(subscribe);
  expect(forwarded.redirect).toBe('manual'); expect(forwarded.cache).toBe('no-store');
});
test('a session private sync no longer lists gets SIGN_IN_REQUIRED; another account ACCOUNT_CHANGED; an unreachable registry 503; nothing is forwarded', async () => {
  for (const [status, expected, code] of [[401, 401, 'SIGN_IN_REQUIRED'], [403, 401, 'SIGN_IN_REQUIRED'], [410, 401, 'SIGN_IN_REQUIRED'], [409, 409, 'ACCOUNT_CHANGED'], [500, 503, 'ACCOUNT_STATUS_UNAVAILABLE']] as const) {
    const f = fetcher(() => Response.json({error: 'fixture'}, {status}));
    const res = await pushRequest(post({action: 'delete-all'}), config, f.fetch);
    expect(res.status, String(status)).toBe(expected); expect(await res.json()).toEqual({error: code});
    expect(f.calls).toHaveLength(1);
  }
});
test('the push Worker\'s refusals are relayed as they are; a transport failure answers 503 with a plain message', async () => {
  const limit = fetcher(() => Response.json({sessions: []}), () => Response.json({error: 'SUBSCRIPTION_LIMIT'}, {status: 409}));
  const res = await pushRequest(post(subscribe), config, limit.fetch);
  expect(res.status).toBe(409); expect(await res.json()).toEqual({error: 'SUBSCRIPTION_LIMIT'});
  const down = fetcher(() => Response.json({sessions: []}), () => { throw new TypeError('network'); });
  const failed = await pushRequest(post({action: 'unsubscribe', subscriptionId: '20000000-0000-4000-8000-000000000002'}), config, down.fetch);
  expect(failed.status).toBe(503); expect(await failed.json()).toMatchObject({error: 'PUSH_SERVICE_UNAVAILABLE'});
});
