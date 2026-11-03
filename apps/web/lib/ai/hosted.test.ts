import {expect, test} from 'vitest';
import {collectReply} from './chat';
import {AiError} from './errors';
import {CLAUDE_HOSTED_NAME, HOSTED_DISCLOSURE, HOSTED_LABEL, HOSTED_PATH, hostedActive, hostedAllowance, hostedEntitlement, hostedHealth, hostedName, streamHosted} from './hosted';
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
  // Session AK (1a): the one relay the browser may reach is WalletConnect's own websocket (phone wallets); never ZIGi's.
  expect(CONNECT_SOURCES.filter(s => /relay|zigi/i.test(s))).toEqual(['wss://relay.walletconnect.org']);
  expect(Object.values(egress.aiProviderOrigins)).toHaveLength(5);
});

// Session Z-Cloud Part 6 (ADR-019 C40): "ZIGoals AI · powered by Claude" for friends, with their own allowance.
test('on the Claude relay: its name, its label, the allowance in messages and dollars, and "Think deeper" as the high effort', async () => {
  expect(hostedName('Anthropic')).toBe('ZIGoals AI · powered by Claude'); expect(hostedName('OpenAI')).toBe('ZIGoals hosted');
  expect(HOSTED_LABEL('Anthropic')).toBe(`Answer from ${CLAUDE_HOSTED_NAME}`); expect(HOSTED_LABEL('OpenAI')).toBe('Answer from OpenAI via ZIGoals hosted');
  expect(HOSTED_DISCLOSURE('Anthropic', 'claude-sonnet-5-5')[0]).toContain('ZIGoals AI · powered by Claude: your messages');
  expect(HOSTED_DISCLOSURE('Anthropic', 'claude-sonnet-5-5').join(' ')).toContain('messages, tokens and their cost per day and month');
  // The entitlement carries the money and the month when the relay counts them; an older relay's answer still reads.
  const claude = recording(() => Response.json({entitled: true, provider: 'Anthropic', model: 'claude-sonnet-5-5', remaining: {requests: 38, tokens: 1_400_000, usd: 0.957, month: {requests: 512, usd: 7.4049}}}));
  const entitlement = await hostedEntitlement(ACCOUNT, {build: true, fetcher: claude.f});
  expect(entitlement).toEqual({entitled: true, provider: 'Anthropic', model: 'claude-sonnet-5-5', remaining: {requests: 38, tokens: 1_400_000, usd: 0.957, month: {requests: 512, usd: 7.4049}}});
  expect(hostedAllowance({requests: 38, tokens: 1_400_000, usd: 0.957, month: {requests: 512, usd: 7.4049}})).toBe('Left today: 38 messages, $0.95. Left this month: $7.40, 512 messages.');
  expect(hostedAllowance({requests: 40, tokens: 150_000})).toBe('Left today: 40 messages, about 150,000 tokens.');
  // "Think deeper" (request.think) asks the relay for the high effort; the quick reply sends no effort field.
  const sse = 'data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
  const deep = recording(() => new Response(sse, {headers: {'content-type': 'text/event-stream'}}));
  await collectReply(streamHosted({model: 'hosted', system: 's', messages: [{role: 'user', content: 'x'}], maxOutputTokens: 10, think: true}, ACCOUNT, deep.f));
  await collectReply(streamHosted({model: 'hosted', system: 's', messages: [{role: 'user', content: 'x'}], maxOutputTokens: 10}, ACCOUNT, deep.f));
  expect(JSON.parse(String(deep.calls[0]!.init?.body))).toMatchObject({reasoning_effort: 'high', stream: true});
  expect(JSON.parse(String(deep.calls[1]!.init?.body))).not.toHaveProperty('reasoning_effort');
  for (const [code, words] of [['ACCOUNT_DAILY_USD', 'today\'s ZIGi allowance'], ['ACCOUNT_MONTHLY_USD', 'this month\'s ZIGi allowance'], ['ACCOUNT_MONTHLY_REQUESTS', 'this month\'s number of ZIGi messages'], ['GLOBAL_DAILY_USD', 'its own limit for today'], ['ACCOUNT_IN_FLIGHT', 'still answering your other questions']] as const) {
    const refused = recording(() => Response.json({error: code}, {status: 429}));
    const error = await collectReply(streamHosted({model: 'hosted', system: 's', messages: [{role: 'user', content: 'x'}], maxOutputTokens: 10}, ACCOUNT, refused.f)).catch((e: unknown) => e);
    expect((error as AiError).kind, code).toBe('rate-limit'); expect((error as AiError).message).toContain(words);
  }
});
