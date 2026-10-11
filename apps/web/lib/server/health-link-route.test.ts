import {expect, test} from 'vitest';
import {HEALTH_LINK_UNAVAILABLE, LINK_REQUEST_BYTES, healthLinkRequest, type HealthLinkConfig} from './health-link-route';

// /api/health-link (Session W Part 8): the flag, the session check through private sync, one named action forwarded to
// the Worker with the bearer, the app's origin and the account, and the Worker's answer relayed. MOCK origins only.
const config: HealthLinkConfig = {syncOrigin: 'https://sync.fixture.workers.dev', linkOrigin: 'https://link.fixture.test'};
const ORIGIN = 'https://app.test', ACCOUNT = '10000000-0000-4000-8000-000000000001', cookie = '__Host-zigoals_session=fixture-token';
type Call = {url: string; init: RequestInit | undefined};
function fetcher(sessions: () => Response, worker: (url: string, init?: RequestInit) => Response) {
  const calls: Call[] = [];
  const f: typeof fetch = async (input, init) => { const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url; calls.push({url, init}); return url.startsWith(config.syncOrigin) ? sessions() : worker(url, init); };
  return {calls, fetch: f};
}
const post = (body: unknown, headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/health-link`, {method: 'POST', headers: {origin: ORIGIN, 'content-type': 'application/json', cookie, 'X-Zigoals-Account': ACCOUNT, ...headers}, body: typeof body === 'string' ? body : JSON.stringify(body)});
const get = (headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/health-link`, {headers: {cookie, 'X-Zigoals-Account': ACCOUNT, ...headers}});

test('off (no Worker origin, or not https) answers 503 to everything and fetches nothing', async () => {
  const never: typeof fetch = async () => { throw Error('must not fetch'); };
  for (const cfg of [null, {...config, linkOrigin: 'http://link.fixture.test'}, {...config, syncOrigin: 'https://sync.example.com'}])
    for (const request of [get(), post({action: 'data', provider: 'oura'})]) { const res = await healthLinkRequest(request, cfg, never); expect(res.status).toBe(503); expect(await res.json()).toEqual(HEALTH_LINK_UNAVAILABLE); }
});
test('refused before any call: a foreign origin, another method, non-JSON, oversize, an unknown action, no session, no account', async () => {
  const f = fetcher(() => Response.json({}), () => { throw Error('must not reach the Worker'); });
  expect((await healthLinkRequest(post({action: 'data'}, {origin: 'https://evil.test'}), config, f.fetch)).status).toBe(403);
  expect((await healthLinkRequest(new Request(`${ORIGIN}/api/health-link`, {method: 'PUT', headers: {origin: ORIGIN}}), config, f.fetch)).status).toBe(405);
  expect((await healthLinkRequest(post({action: 'data'}, {'content-type': 'text/plain'}), config, f.fetch)).status).toBe(415);
  expect((await healthLinkRequest(post({action: 'data', pad: 'x'.repeat(LINK_REQUEST_BYTES)}), config, f.fetch)).status).toBe(413);
  expect((await healthLinkRequest(post({action: 'exfiltrate'}), config, f.fetch)).status).toBe(400);
  expect((await healthLinkRequest(post({action: 'data'}, {cookie: ''}), config, f.fetch)).status).toBe(401);
  expect((await healthLinkRequest(post({action: 'data'}, {'X-Zigoals-Account': 'nope'}), config, f.fetch)).status).toBe(400);
  expect(f.calls).toEqual([]);
});
test('a revoked session gets nothing; an allowed one reaches /v1/<action> with the bearer, the origin and the account, and the answer comes back', async () => {
  const denied = fetcher(() => new Response(null, {status: 401}), () => { throw Error('no'); });
  expect((await healthLinkRequest(get(), config, denied.fetch)).status).toBe(401);
  const f = fetcher(() => Response.json({sessions: []}), (url) => url.endsWith('/v1/config') ? Response.json({redirectUri: `${ORIGIN}/app/health`, providers: []}) : Response.json({data: {data: []}}));
  expect(await (await healthLinkRequest(get(), config, f.fetch)).json()).toEqual({redirectUri: `${ORIGIN}/app/health`, providers: []});
  const res = await healthLinkRequest(post({action: 'data', provider: 'oura', request: 'oura.sleep', accessToken: 'FAKE-ACCESS-TOKEN'}), config, f.fetch);
  expect(await res.json()).toEqual({data: {data: []}});
  const last = f.calls.at(-1)!;
  expect(last.url).toBe('https://link.fixture.test/v1/data');
  expect(last.init?.headers).toMatchObject({origin: ORIGIN, authorization: 'Bearer fixture-token', 'x-zigoals-account': ACCOUNT, 'content-type': 'application/json'});
  expect(res.headers.get('cache-control')).toBe('no-store');
});
