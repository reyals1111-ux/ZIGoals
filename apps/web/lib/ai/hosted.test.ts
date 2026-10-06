import {expect, test} from 'vitest';
import {collectReply} from './chat';
import {AiError} from './errors';
import {HOSTED_DISCLOSURE, HOSTED_LABEL, HOSTED_PATH, hostedActive, hostedEntitlement, hostedHealth, streamHosted} from './hosted';
import {CONNECT_SOURCES} from '../security-policy';
import egress from '../egress-policy.json';

// Session V Part 17: ZIGoals hosted in the app. Only in a hosted build, only through /api/zigi, only once agreed to.
const ACCOUNT = '10000000-0000-4000-8000-000000000001';
type Call = {url: string; init?: RequestInit};
const recording = (answer: () => Response) => { const calls: Call[] = []; const f: typeof fetch = async (input, init) => { calls.push({url: String(input), init}); return answer(); }; return {calls, f}; };

test('the entitlement: nothing is fetched outside a hosted build or without an account; otherwise /api/zigi decides', async () => {
  const never: typeof fetch = async () => { throw Error('must not fetch'); };
  expect(await hostedEntitlement(ACCOUNT, {build: false, fetcher: never})).toEqual({entitled: false, reason: 'not-in-build'});
  expect(await hostedEntitlement(null, {build: true, fetcher: never})).toEqual({entitled: false, reason: 'signed-out'});
  const yes = recording(() => Response.json({entitled: true, provider: 'OpenAI', model: 'gpt-6-luna', remaining: {requests: 40, tokens: 150000}}));
  expect(await hostedEntitlement(ACCOUNT, {build: true, fetcher: yes.f})).toMatchObject({entitled: true, provider: 'OpenAI'});
  expect(yes.calls[0]!.url).toBe(HOSTED_PATH); expect(yes.calls[0]!.init?.credentials).toBe('same-origin');
  expect(new Headers(yes.calls[0]!.init?.headers).get('x-zigoals-account')).toBe(ACCOUNT);
  for (const [answer, reason] of [[Response.json({entitled: false, reason: 'paused'}), 'paused'], [Response.json({entitled: false, reason: 'not-invited'}), 'not-invited'], [Response.json({error: 'SIGN_IN_REQUIRED'}, {status: 401}), 'signed-out'], [Response.json({error: 'HOSTED_UNAVAILABLE'}, {status: 503}), 'unavailable'], [Response.json({entitled: true}), 'unavailable']] as const)
    expect(await hostedEntitlement(ACCOUNT, {build: true, fetcher: async () => answer})).toEqual({entitled: false, reason});
});
test('in use only when chosen, agreed to and entitled; Health only with the consent\'s own box', () => {
  const yes = {entitled: true as const, provider: 'OpenAI', model: 'gpt-6-luna', remaining: {requests: 1, tokens: 1}}, consent = {at: '2026-10-06T10:00:00.000Z', health: false};
  expect(hostedActive({version: 1, route: 'hosted', hostedConsent: consent}, yes)).toBe(true);
  expect(hostedActive({version: 1, route: 'hosted'}, yes)).toBe(false);
  expect(hostedActive({version: 1, hostedConsent: consent}, yes)).toBe(false);
  expect(hostedActive({version: 1, route: 'hosted', hostedConsent: consent}, {entitled: false, reason: 'paused'})).toBe(false);
  expect(hostedHealth({version: 1, hostedConsent: consent})).toBe(false); expect(hostedHealth({version: 1, hostedConsent: {...consent, health: true}})).toBe(true); expect(hostedHealth({version: 1})).toBe(false);
  expect(HOSTED_LABEL('OpenAI')).toBe('Answer from OpenAI via ZIGoals hosted');
  expect(HOSTED_DISCLOSURE('OpenAI', 'gpt-6-luna').join(' ')).toMatch(/stores none of it and logs none of it/);
});
test('a reply goes to /api/zigi only (never a provider origin), same-origin, and streams like the OpenAI wire; the relay\'s refusals read plainly', async () => {
  const sse = 'data: {"choices":[{"delta":{"content":"Ten minutes"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":300,"completion_tokens":12}}\n\ndata: [DONE]\n\n';
  const ok = recording(() => new Response(sse, {headers: {'content-type': 'text/event-stream'}}));
  const reply = await collectReply(streamHosted({model: 'hosted', system: 'You are ZIGi.', messages: [{role: 'user', content: 'How many minutes?'}], maxOutputTokens: 1024}, ACCOUNT, ok.f));
  expect(reply).toEqual({text: 'Ten minutes', usage: {input: 300, output: 12}, reason: 'stop'});
  expect(ok.calls.map(c => c.url)).toEqual([HOSTED_PATH]);
  expect(ok.calls[0]!.init?.credentials).toBe('same-origin'); expect(ok.calls[0]!.init?.mode).toBe('same-origin');
  const headers = new Headers(ok.calls[0]!.init?.headers); expect(headers.get('x-zigoals-account')).toBe(ACCOUNT); expect(headers.get('authorization')).toBeNull();
  expect(JSON.parse(String(ok.calls[0]!.init?.body))).toMatchObject({stream: true, messages: [{role: 'system', content: 'You are ZIGi.'}, {role: 'user', content: 'How many minutes?'}]});
  for (const [code, kind, words] of [['ACCOUNT_DAILY_TOKENS', 'rate-limit', 'today\'s ZIGoals hosted allowance'], ['NOT_INVITED', 'blocked', 'invite-only'], ['HOSTED_PAUSED', 'blocked', 'paused'], ['UPSTREAM_PAUSED', 'overloaded', 'paused it for a moment'], ['WHATEVER', 'server', 'could not answer']] as const) {
    const refused = recording(() => Response.json({error: code, retryAfterSeconds: 30}, {status: 429}));
    const error = await collectReply(streamHosted({model: 'hosted', system: 's', messages: [{role: 'user', content: 'x'}], maxOutputTokens: 10}, ACCOUNT, refused.f)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError); expect((error as AiError).kind, code).toBe(kind); expect((error as AiError).message).toContain(words);
  }
});
test('the browser never gains a relay origin: connect-src is unchanged, and the policy names the relay as server-side only', () => {
  expect(egress.serverOnly.zigiRelay).toMatch(/ZIGOALS_ZIGI_RELAY_ORIGIN/);
  expect(CONNECT_SOURCES.some(s => /relay|zigi/i.test(s))).toBe(false);
  expect(Object.values(egress.aiProviderOrigins)).toHaveLength(5);
});
