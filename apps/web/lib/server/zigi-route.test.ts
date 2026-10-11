import {afterEach, expect, test, vi} from 'vitest';
import {CHAT_BYTES, HOSTED_UNAVAILABLE, zigiRequest, type ZigiConfig} from './zigi-route';

// /api/zigi (Session V Part 17): the flag, the session check through private sync, the forwarded headers, the streamed
// reply passed through as it arrives, and the relay's own answers relayed.
const config: ZigiConfig = {syncOrigin: 'https://sync.fixture.workers.dev', relayOrigin: 'https://relay.fixture.test'};
const ORIGIN = 'https://app.test', ACCOUNT = '10000000-0000-4000-8000-000000000001', cookie = '__Host-zigoals_session=fixture-token';
const chat = {messages: [{role: 'system', content: 'You are ZIGi.'}, {role: 'user', content: 'How many minutes did I meditate?'}], stream: true, max_completion_tokens: 1024};
type Call = {url: string; init: RequestInit | undefined};
function fetcher(sessions: () => Response, relay: (url: string) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const f: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({url, init});
    return url.startsWith(config.syncOrigin) ? sessions() : relay(url);
  };
  return {calls, fetch: f};
}
const stream = (text: string) => new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); }}), {headers: {'content-type': 'text/event-stream; charset=utf-8'}});
const post = (body: unknown, headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/zigi`, {method: 'POST', headers: {origin: ORIGIN, 'content-type': 'application/json', cookie, 'X-Zigoals-Account': ACCOUNT, ...headers}, body: typeof body === 'string' ? body : JSON.stringify(body)});
const get = (headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/zigi`, {headers: {cookie, 'X-Zigoals-Account': ACCOUNT, ...headers}});
afterEach(() => vi.restoreAllMocks());

test('without both origins (the flag is off) every request answers 503 and nothing is fetched; a relay origin must be https', async () => {
  const never: typeof fetch = async () => { throw Error('must not fetch'); };
  for (const cfg of [null, {...config, relayOrigin: 'http://relay.fixture.test'}, {...config, relayOrigin: 'https://relay.fixture.test/path'}, {...config, syncOrigin: 'https://sync.example.com'}]) {
    for (const request of [get(), post(chat)]) { const res = await zigiRequest(request, cfg, never); expect(res.status).toBe(503); expect(await res.json()).toEqual(HOSTED_UNAVAILABLE); expect(res.headers.get('cache-control')).toBe('no-store'); }
  }
});
test('refused before any upstream call: a foreign origin, another method, a non-JSON or oversize or malformed body, no cookie, two cookies, no account', async () => {
  const f = fetcher(() => Response.json({sessions: []}), () => { throw Error('must not reach the relay'); });
  const log = vi.spyOn(console, 'log').mockImplementation(() => {}), error = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect((await zigiRequest(post(chat, {origin: 'https://evil.test'}), config, f.fetch)).status).toBe(403);
  expect((await zigiRequest(new Request(`${ORIGIN}/api/zigi`, {method: 'PUT', headers: {origin: ORIGIN}}), config, f.fetch)).status).toBe(405);
  expect((await zigiRequest(post(chat, {'content-type': 'text/plain'}), config, f.fetch)).status).toBe(415);
  const big = await zigiRequest(post({messages: [{role: 'user', content: 'x'.repeat(CHAT_BYTES)}]}), config, f.fetch);
  expect(big.status).toBe(413); expect(await big.json()).toEqual({error: 'REQUEST_TOO_LARGE'});
  expect((await zigiRequest(post('{"messages":'), config, f.fetch)).status).toBe(400);
  expect((await zigiRequest(post(chat, {cookie: ''}), config, f.fetch)).status).toBe(401);
  expect((await zigiRequest(get({cookie: ''}), config, f.fetch)).status).toBe(401);
  expect((await zigiRequest(post(chat, {cookie: `${cookie}; ${cookie}`}), config, f.fetch)).status).toBe(400);
  expect((await zigiRequest(post(chat, {'X-Zigoals-Account': 'not-a-uuid'}), config, f.fetch)).status).toBe(400);
  expect(f.calls).toHaveLength(0);
  expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
});
test('GET confirms the session, then relays the entitlement with the bearer, the origin and the account', async () => {
  const f = fetcher(() => Response.json({sessions: []}), () => Response.json({entitled: true, provider: 'OpenAI', model: 'gpt-6-luna', remaining: {requests: 40, tokens: 150000}}));
  const res = await zigiRequest(get({'X-Zigoals-Account': ACCOUNT.toUpperCase()}), config, f.fetch);
  expect(res.status).toBe(200); expect(await res.json()).toEqual({entitled: true, provider: 'OpenAI', model: 'gpt-6-luna', remaining: {requests: 40, tokens: 150000}});
  expect(f.calls.map(c => c.url)).toEqual([`${config.syncOrigin}/v1/sessions`, `${config.relayOrigin}/v1/entitlement`]);
  for (const call of f.calls) { const h = new Headers(call.init?.headers); expect(h.get('authorization')).toBe('Bearer fixture-token'); expect(h.get('origin')).toBe(ORIGIN); expect(h.get('x-zigoals-account')).toBe(ACCOUNT); expect(call.init?.redirect).toBe('manual'); }
});
test('POST forwards the body once and streams the reply back as it arrives; the relay\'s refusals come back as they are', async () => {
  const sse = 'data: {"choices":[{"delta":{"content":"Ten minutes"}}]}\n\ndata: [DONE]\n\n';
  const f = fetcher(() => Response.json({sessions: []}), () => stream(sse));
  const res = await zigiRequest(post(chat), config, f.fetch);
  expect(res.status).toBe(200); expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8'); expect(res.headers.get('cache-control')).toBe('no-store');
  expect(await res.text()).toBe(sse);
  const forwarded = f.calls[1]!; expect(forwarded.url).toBe(`${config.relayOrigin}/v1/chat`); expect(forwarded.init?.method).toBe('POST');
  expect(JSON.parse(forwarded.init?.body as string)).toEqual(chat); expect(new Headers(forwarded.init?.headers).get('content-type')).toBe('application/json');
  for (const [status, body] of [[429, {error: 'ACCOUNT_DAILY_TOKENS', remaining: {requests: 3, tokens: 10}}], [403, {error: 'NOT_INVITED'}], [503, {error: 'HOSTED_PAUSED'}]] as const) {
    const g = fetcher(() => Response.json({sessions: []}), () => Response.json(body, {status}));
    const refused = await zigiRequest(post(chat), config, g.fetch); expect(refused.status).toBe(status); expect(await refused.json()).toEqual(body);
  }
  // A relay that answers 200 without a stream is not passed on as a reply.
  const odd = fetcher(() => Response.json({sessions: []}), () => Response.json({not: 'a stream'}));
  expect((await zigiRequest(post(chat), config, odd.fetch)).status).toBe(502);
});
test('a session private sync no longer lists gets SIGN_IN_REQUIRED; another account ACCOUNT_CHANGED; an unreachable relay 503; nothing more is sent', async () => {
  for (const [status, expected, code] of [[401, 401, 'SIGN_IN_REQUIRED'], [410, 401, 'SIGN_IN_REQUIRED'], [409, 409, 'ACCOUNT_CHANGED'], [500, 503, 'ACCOUNT_STATUS_UNAVAILABLE']] as const) {
    const f = fetcher(() => Response.json({error: 'fixture'}, {status}), () => { throw Error('must not reach the relay'); });
    const res = await zigiRequest(post(chat), config, f.fetch); expect(res.status, String(status)).toBe(expected); expect(await res.json()).toEqual({error: code}); expect(f.calls).toHaveLength(1);
  }
  const down = fetcher(() => Response.json({sessions: []}), () => { throw TypeError('fetch failed'); });
  const res = await zigiRequest(post(chat), config, down.fetch); expect(res.status).toBe(503); expect(await res.json()).toMatchObject({error: 'HOSTED_SERVICE_UNAVAILABLE'});
});
