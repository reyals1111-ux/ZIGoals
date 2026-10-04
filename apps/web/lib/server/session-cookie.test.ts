import {expect, test} from 'vitest';
import {privateAccountRequest} from './private-account';
import {readSessionCookie, sessionCookieNames} from './session-cookie';

// Parity (ADR-010): the push route's cookie reader and the account route read the same token from the same request.
const config = {authOrigin: 'https://fixture.supabase.co', publicKey: 'public-fixture', syncOrigin: 'https://sync.fixture.workers.dev'};
/** The bearer the account route forwards for a status request, 'none' when it makes no upstream call, or its refusal code. */
async function accountRouteBearer(origin: string, cookie: string) {
  let bearer: string | null | 'none' = 'none';
  const request = new Request(`${origin}/api/private-account?action=status`, {headers: {cookie, 'X-Zigoals-Account': '10000000-0000-4000-8000-000000000001'}});
  const response = await privateAccountRequest(request, config, async (_url, init) => { bearer = new Headers(init?.headers).get('authorization'); return Response.json({error: 'fixture'}, {status: 500}); });
  if (response.status === 400) return `refused:${(await response.json()).error}`;
  return bearer === 'none' ? 'none' : bearer!.replace(/^Bearer /, '');
}
test.each([
  ['https://app.test', '__Host-zigoals_session=tok-1; __Host-zigoals_refresh=ref', 'tok-1'],
  ['https://app.test', 'other=1; __Host-zigoals_session=tok.2_x-y', 'tok.2_x-y'],
  ['https://app.test', 'zigoals_session=tok-1', null],
  ['https://app.test', '', null],
  ['https://app.test', '__Host-zigoals_session=bad token', null],
  ['https://app.test', '__Host-zigoals_session=', null],
  ['http://127.0.0.1:3100', 'zigoals_session=tok-3; zigoals_refresh=ref', 'tok-3'],
  ['http://127.0.0.1:3100', '__Host-zigoals_session=tok-1', null],
])('%s with cookie "%s": the reader and the account route agree', async (origin, cookie, expected) => {
  expect(readSessionCookie(new Request(`${origin}/api/push`, {headers: {cookie}}))).toEqual({token: expected, duplicate: false});
  expect(await accountRouteBearer(origin, cookie)).toBe(expected ?? 'none');
});
test.each([
  ['https://app.test', '__Host-zigoals_session=a; __Host-zigoals_session=b'],
  ['https://app.test', '__Host-zigoals_session=a; __Host-zigoals_refresh=r; __Host-zigoals_refresh=s'],
  ['http://127.0.0.1:3100', 'zigoals_session=a; zigoals_session=b'],
])('%s with duplicated cookies "%s": both refuse', async (origin, cookie) => {
  expect(readSessionCookie(new Request(`${origin}/api/push`, {headers: {cookie}}))).toEqual({token: null, duplicate: true});
  expect(await accountRouteBearer(origin, cookie)).toBe('refused:DUPLICATE_SESSION_COOKIE');
});
test('cookie names follow the origin scheme', () => {
  expect(sessionCookieNames('https://app.test')).toEqual({secure: true, session: '__Host-zigoals_session', refresh: '__Host-zigoals_refresh'});
  expect(sessionCookieNames('http://127.0.0.1:3100')).toEqual({secure: false, session: 'zigoals_session', refresh: 'zigoals_refresh'});
});
