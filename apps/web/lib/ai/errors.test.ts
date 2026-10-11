import {expect, test} from 'vitest';
import {AiError, errorSteps, mapHttpError, mapNetworkError, parseErrorBody, retryAfterSeconds, scrubSecrets, type AiErrorKind} from './errors';
import {ERROR_BODIES, FAKE_KEY} from './fixtures/mock-streams';
import type {ProviderId} from './providers';

// ADR-012, Part 1: every documented failure becomes a kind the interface can explain; no key and no request detail leaks.
test('scrubSecrets replaces anything shaped like a key or a bearer token', () => {
  expect(scrubSecrets(`key ${FAKE_KEY} and AIzaSyFAKE0000000000000000 and xai-FAKE000000 and Bearer abc.def-ghi and sk-or-v1-abcdef0123`)).toBe('key [key] and [key] and [key] and [key] and [key]');
  expect(scrubSecrets('plain words stay')).toBe('plain words stay');
});
test('retryAfterSeconds reads a delay or an HTTP date', () => {
  expect(retryAfterSeconds(new Headers({'retry-after': '20'}))).toBe(20);
  expect(retryAfterSeconds(new Headers({'retry-after': '0.4'}))).toBe(1);
  const now = Date.parse('2026-10-04T10:00:00Z');
  expect(retryAfterSeconds(new Headers({'retry-after': 'Sun, 04 Oct 2026 10:00:30 GMT'}), now)).toBe(30);
  expect(retryAfterSeconds(new Headers({'retry-after': 'nonsense'}))).toBeNull();
  expect(retryAfterSeconds(new Headers())).toBeNull(); expect(retryAfterSeconds(null)).toBeNull();
});
test('parseErrorBody reads the OpenAI, Anthropic, Gemini (array), OpenRouter (numeric code), Ollama (string) and plain-text shapes', () => {
  expect(parseErrorBody(ERROR_BODIES.openai401.body)).toMatchObject({type: 'invalid_request_error', code: 'invalid_api_key'});
  expect(parseErrorBody(ERROR_BODIES.anthropic401.body)).toMatchObject({type: 'authentication_error', message: 'invalid x-api-key'});
  expect(parseErrorBody(ERROR_BODIES.gemini404.body)).toMatchObject({code: '404', status: 'NOT_FOUND'});
  expect(parseErrorBody(ERROR_BODIES.openrouter402.body)).toMatchObject({code: '402'});
  expect(parseErrorBody(ERROR_BODIES.ollama404.body).message).toMatch(/not found/);
  expect(parseErrorBody(ERROR_BODIES.plainText500.body)).toMatchObject({type: null, message: '<html>Bad gateway (MOCK)</html>'});
  expect(parseErrorBody('')).toEqual({type: null, code: null, status: null, message: null});
});
const cases: [keyof typeof ERROR_BODIES, ProviderId, AiErrorKind, number | null][] = [
  ['openai401', 'openai', 'bad-key', null], ['openai429quota', 'openai', 'no-credit', null], ['openai429credit', 'openai', 'no-credit', null], ['openai429rate', 'openai', 'rate-limit', 20], ['openai404model', 'openai', 'model-missing', null], ['openai503', 'openai', 'overloaded', 5],
  ['anthropic401', 'anthropic', 'bad-key', null], ['anthropic402', 'anthropic', 'no-credit', null], ['anthropic429', 'anthropic', 'rate-limit', 30], ['anthropic529', 'anthropic', 'overloaded', null],
  ['gemini403', 'gemini', 'bad-key', null], ['gemini404', 'gemini', 'model-missing', null], ['gemini429', 'gemini', 'rate-limit', null],
  ['openrouter401', 'openrouter', 'bad-key', null], ['openrouter402', 'openrouter', 'no-credit', null], ['openrouter503', 'openrouter', 'overloaded', null],
  ['ollama404', 'local', 'model-missing', null], ['lmstudio401', 'local', 'bad-key', null], ['plainText500', 'openai', 'server', null],
];
test.each(cases)('mapHttpError %s from %s → %s', (name, provider, kind, retry) => {
  const fixture = ERROR_BODIES[name] as {status: number; body: string; headers?: Record<string, string>};
  const error = mapHttpError(provider, fixture.status, fixture.body, new Headers(fixture.headers ?? {}));
  expect(error).toBeInstanceOf(AiError); expect(error.kind).toBe(kind); expect(error.status).toBe(fixture.status); expect(error.retryAfterSeconds).toBe(retry); expect(error.provider).toBe(provider);
  expect(error.message).not.toContain(FAKE_KEY); expect(error.message).not.toMatch(/authorization|x-api-key|bearer /i);
  expect(error.message.length).toBeLessThan(400);
});
test('a 403 from a provider other than Gemini is a refusal, and a 404 with no model in it is a plain request error', () => {
  expect(mapHttpError('openai', 403, '{"error":{"message":"Country, region, or territory not supported","type":"request_forbidden"}}').kind).toBe('blocked');
  expect(mapHttpError('anthropic', 403, ERROR_BODIES.anthropic401.body.replace('authentication_error', 'permission_error')).kind).toBe('bad-key');
  expect(mapHttpError('openai', 404, '{"error":{"message":"Unknown path","type":"invalid_request_error"}}').kind).toBe('request');
  expect(mapHttpError('openai', 413, '').kind).toBe('request');
});
test('mapNetworkError: stopped, offline, a silent local server, or a browser-side refusal', () => {
  const abort = Object.assign(new Error('aborted'), {name: 'AbortError'});
  expect(mapNetworkError('openai', abort, {local: false}).kind).toBe('aborted');
  expect(mapNetworkError('openai', new TypeError('Failed to fetch'), {local: false, online: false}).kind).toBe('offline');
  expect(mapNetworkError('local', new TypeError('Failed to fetch'), {local: true, online: true}).kind).toBe('local-unreachable');
  expect(mapNetworkError('anthropic', new TypeError('Failed to fetch'), {local: false, online: true}).kind).toBe('cors');
  const own = new AiError('unreadable', 'x'); expect(mapNetworkError('openai', own, {local: false})).toBe(own);
});
test('every kind but aborted has fix steps; local steps name the switches the docs give', () => {
  const kinds: AiErrorKind[] = ['bad-key', 'no-credit', 'rate-limit', 'model-missing', 'local-unreachable', 'cors', 'offline', 'overloaded', 'blocked', 'request', 'server', 'unreadable'];
  for (const kind of kinds) expect(errorSteps(new AiError(kind, 'x', {retryAfterSeconds: kind === 'rate-limit' ? 12 : null}), {providerName: 'Mock', hostedPage: true, keysUrl: 'https://example.invalid/keys'}).length, kind).toBeGreaterThan(0);
  expect(errorSteps(new AiError('aborted', 'x'), {providerName: 'Mock', hostedPage: false, keysUrl: null})).toEqual([]);
  const hosted = errorSteps(new AiError('local-unreachable', 'x'), {providerName: 'A local model', hostedPage: true, keysUrl: null, local: {server: null, baseUrl: 'http://127.0.0.1:11434'}}).join(' ');
  expect(hosted).toContain('OLLAMA_ORIGINS=https://alpha.zigoals.app'); expect(hosted).toContain('Enable CORS'); expect(hosted).toContain('Chrome 142');
  const preview = errorSteps(new AiError('local-unreachable', 'x'), {providerName: 'A local model', hostedPage: false, keysUrl: null, local: {server: 'ollama', baseUrl: 'http://127.0.0.1:11434'}}).join(' ');
  expect(preview).toContain('by default'); expect(preview).not.toContain('Enable CORS'); expect(preview).not.toContain('Chrome 142');
});
