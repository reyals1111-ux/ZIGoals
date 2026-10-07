import {expect, test} from 'vitest';
import {authorizeUrl, beginLink, challengeFor, PENDING_KEY, readCallback} from './oauth';

// Session W Part 8: the OAuth rules: one-use 128-bit state bound to provider, account and 10 minutes; PKCE for Oura;
// the pending record removed on the first read, whatever the answer.
class Memory implements Storage { private m = new Map<string, string>(); get length() { return this.m.size; } clear() { this.m.clear(); } getItem(k: string) { return this.m.get(k) ?? null; } key(i: number) { return [...this.m.keys()][i] ?? null; } removeItem(k: string) { this.m.delete(k); } setItem(k: string, v: string) { this.m.set(k, v); } }
const ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', T0 = Date.parse('2026-10-07T08:00:00Z');
const config = {clientId: 'fixture-client', redirectUri: 'https://app.test/app/health'};

test('the provider address: client id, the one redirect address, scopes in the provider\'s own separator, the state; PKCE for Oura only', async () => {
  const oura = new URL(await beginLink('oura', config, ACCOUNT, new Memory(), T0));
  expect(`${oura.origin}${oura.pathname}`).toBe('https://cloud.ouraring.com/oauth/authorize');
  expect(Object.fromEntries(oura.searchParams)).toMatchObject({response_type: 'code', client_id: 'fixture-client', redirect_uri: 'https://app.test/app/health', scope: 'daily workout session', code_challenge_method: 'S256'});
  expect(oura.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{22}$/);
  const withings = new URL(authorizeUrl('withings', config, 'S'));
  expect(withings.searchParams.get('scope')).toBe('user.activity,user.metrics');
  expect(withings.searchParams.has('code_challenge')).toBe(false);
  expect(new URL(authorizeUrl('strava', config, 'S')).searchParams.get('approval_prompt')).toBe('auto');
});
test('a matching answer gives the code once (with the verifier whose S256 matches the challenge); the record is gone after', async () => {
  const storage = new Memory(), url = new URL(await beginLink('oura', config, ACCOUNT, storage, T0)), state = url.searchParams.get('state')!;
  const result = readCallback(`?code=CODE-1&state=${state}`, ACCOUNT, storage, T0 + 60_000);
  expect(result).toMatchObject({kind: 'code', provider: 'oura', code: 'CODE-1'});
  if (result.kind === 'code') expect(await challengeFor(result.verifier!)).toBe(url.searchParams.get('code_challenge'));
  expect(storage.getItem(PENDING_KEY)).toBeNull();
  expect(readCallback(`?code=CODE-1&state=${state}`, ACCOUNT, storage, T0 + 61_000)).toMatchObject({kind: 'refused'});
});
test('refused: another state, after 10 minutes, another or a locked account; a refusal at the provider is said; nothing else is a callback', async () => {
  const start = async () => { const s = new Memory(); const state = new URL(await beginLink('strava', config, ACCOUNT, s, T0)).searchParams.get('state')!; return {s, state}; };
  let c = await start(); expect(readCallback('?code=X&state=other', ACCOUNT, c.s, T0)).toMatchObject({kind: 'refused', message: expect.stringMatching(/did not match/)});
  c = await start(); expect(readCallback(`?code=X&state=${c.state}`, ACCOUNT, c.s, T0 + 10 * 60_000 + 1)).toMatchObject({kind: 'refused', message: expect.stringMatching(/10 minutes/)});
  c = await start(); expect(readCallback(`?code=X&state=${c.state}`, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', c.s, T0)).toMatchObject({kind: 'refused', message: expect.stringMatching(/account changed or locked/)});
  c = await start(); expect(readCallback(`?code=X&state=${c.state}`, null, c.s, T0)).toMatchObject({kind: 'refused'});
  c = await start(); expect(readCallback(`?error=access_denied&state=${c.state}`, ACCOUNT, c.s, T0)).toEqual({kind: 'denied', provider: 'strava'});
  expect(readCallback('?view=devices', ACCOUNT, new Memory(), T0)).toEqual({kind: 'none'});
  expect(readCallback('?code=X', ACCOUNT, new Memory(), T0)).toEqual({kind: 'none'});
});
