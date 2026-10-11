import {expect, test} from 'vitest';
import {beginOpenRouterSignIn, callbackUrl, cleanedCallbackUrl, exchangeOpenRouterCode, OPENROUTER_PKCE_KEY, pkcePair, readOpenRouterCallback, readPending} from './openrouter-auth';

// ADR-012 decision 7: OpenRouter's documented PKCE flow, MOCK only; the code in the URL is one-time and not a key.
class MemoryStorage { private map = new Map<string, string>(); getItem(k: string) { return this.map.get(k) ?? null; } setItem(k: string, v: string) { this.map.set(k, v); } removeItem(k: string) { this.map.delete(k); } }
test('the verifier is 43–128 characters and the challenge is its S256 digest', async () => {
  const {verifier, challenge} = await pkcePair();
  expect(verifier.length).toBeGreaterThanOrEqual(43); expect(verifier.length).toBeLessThanOrEqual(128); expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  expect(challenge).toBe(btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  const fixed = await pkcePair(length => new Uint8Array(length));
  expect(fixed.verifier).toBe('A'.repeat(86)); // 64 zero bytes in base64url, no padding
});
test('the sign-in address carries only the callback, the challenge and the method; the verifier stays in this tab', async () => {
  const storage = new MemoryStorage();
  const href = await beginOpenRouterSignIn({origin: 'https://alpha.zigoals.app', remember: true, storage, now: 1_000});
  const url = new URL(href);
  expect(url.origin).toBe('https://openrouter.ai'); expect(url.pathname).toBe('/auth');
  expect(url.searchParams.get('callback_url')).toBe('https://alpha.zigoals.app/app/settings?ai-auth=openrouter'); expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect([...url.searchParams.keys()].sort()).toEqual(['callback_url', 'code_challenge', 'code_challenge_method']);
  const pending = readPending(storage, 2_000);
  expect(pending).toMatchObject({version: 1, remember: true, at: 1_000}); expect(href).not.toContain(pending!.verifier);
  expect(readPending(storage, 1_000 + 11 * 60_000)).toBeNull();
  expect(callbackUrl('http://127.0.0.1:3100')).toBe('http://127.0.0.1:3100/app/settings?ai-auth=openrouter');
});
test('the callback is recognised, cleaned, and exchanged with the verifier for the key', async () => {
  expect(readOpenRouterCallback('https://alpha.zigoals.app/app/settings?ai-auth=openrouter&code=abc123XYZ')).toBe('abc123XYZ');
  expect(readOpenRouterCallback('https://alpha.zigoals.app/app/settings?code=abc123XYZ')).toBeNull(); expect(readOpenRouterCallback('https://alpha.zigoals.app/app/settings?ai-auth=openrouter&code=<script>')).toBeNull();
  expect(cleanedCallbackUrl('https://alpha.zigoals.app/app/settings?ai-auth=openrouter&code=abc123XYZ&other=1')).toBe('/app/settings?other=1#your-ai');
  const storage = new MemoryStorage();
  await beginOpenRouterSignIn({origin: 'https://alpha.zigoals.app', remember: false, storage, now: 0});
  const verifier = readPending(storage, 0)!.verifier;
  const calls: {url: string; init: RequestInit}[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => { calls.push({url: String(url), init: init!}); return new Response(JSON.stringify({key: 'sk-or-v1-FAKE0000000000'}), {status: 200}); }) as typeof fetch;
  await expect(exchangeOpenRouterCode({code: 'abc123XYZ', storage, fetcher, now: 1_000})).resolves.toEqual({key: 'sk-or-v1-FAKE0000000000', remember: false});
  expect(calls[0]!.url).toBe('https://openrouter.ai/api/v1/auth/keys'); expect(JSON.parse(calls[0]!.init.body as string)).toEqual({code: 'abc123XYZ', code_verifier: verifier, code_challenge_method: 'S256'});
  expect(storage.getItem(OPENROUTER_PKCE_KEY)).toBeNull();
  // Without a pending verifier (another tab, or too late) nothing is sent.
  await expect(exchangeOpenRouterCode({code: 'abc123XYZ', storage, fetcher})).rejects.toMatchObject({kind: 'request'});
  expect(calls).toHaveLength(1);
  await beginOpenRouterSignIn({origin: 'https://alpha.zigoals.app', remember: false, storage, now: 0});
  const refused = (async () => new Response(JSON.stringify({error: {message: 'invalid code', code: 400}}), {status: 400})) as typeof fetch;
  await expect(exchangeOpenRouterCode({code: 'abc123XYZ', storage, fetcher: refused, now: 0})).rejects.toMatchObject({provider: 'openrouter'});
  await beginOpenRouterSignIn({origin: 'https://alpha.zigoals.app', remember: false, storage, now: 0});
  const empty = (async () => new Response(JSON.stringify({}), {status: 200})) as typeof fetch;
  await expect(exchangeOpenRouterCode({code: 'abc123XYZ', storage, fetcher: empty, now: 0})).rejects.toMatchObject({kind: 'unreadable'});
});
