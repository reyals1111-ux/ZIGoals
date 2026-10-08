import {NextRequest} from 'next/server';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {middleware} from '../middleware';

// Session X Part 4 ([TIER 3] (security headers)): /api/market-logo keeps its own policy and cache; middleware still
// overwrites the request's nonce and origin and names the build there, and every other path keeps the page policy and
// no-store. Before this change middleware replaced the route's `default-src 'none'; sandbox` and `public, max-age=86400`
// with the page policy and `private, no-store`, so every view fetched every logo again.
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
let before: string | undefined;
beforeEach(() => { before = process.env.NEXT_PUBLIC_APP_COMMIT; process.env.NEXT_PUBLIC_APP_COMMIT = COMMIT; });
afterEach(() => { if (before === undefined) delete process.env.NEXT_PUBLIC_APP_COMMIT; else process.env.NEXT_PUBLIC_APP_COMMIT = before; vi.resetModules(); });
const attacker = {'x-nonce': 'attacker', 'x-zigoals-origin': 'https://attacker.invalid', 'content-security-policy': 'script-src *'};
const logo = 'https://alpha.zigoals.app/api/market-logo?url=' + encodeURIComponent('https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png');

test('the logo route keeps its own response policy and cache; its request headers are still overwritten', () => {
  const response = middleware(new NextRequest(logo, {headers: attacker}));
  expect(response.headers.get('Content-Security-Policy')).toBeNull();
  expect(response.headers.get('Cache-Control')).toBeNull();
  expect(response.headers.get('x-middleware-request-x-zigoals-origin')).toBe('https://alpha.zigoals.app');
  expect(response.headers.get('x-middleware-request-x-nonce')).not.toBe('attacker');
  expect(response.headers.get('x-middleware-request-content-security-policy')).not.toContain('attacker');
  expect(response.headers.get('x-zigoals-build')).toBe(COMMIT);
});
test.each([
  '/api/market-logo/',
  '/api/market-logo/x',
  '/api/market-logos',
  '/api/market-logo.png',
  '/API/market-logo',
  '/api/market-assets',
  '/api/push',
  '/api/private-account',
  '/api/zigi',
  '/api/health-link',
  '/app',
  '/app/markets',
])('every other path keeps the page policy and no-store: %s', path => {
  const response = middleware(new NextRequest(`https://alpha.zigoals.app${path}`, {headers: attacker}));
  expect(response.headers.get('Content-Security-Policy')).toContain("'strict-dynamic'");
  expect(response.headers.get('Content-Security-Policy')).not.toContain('attacker');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
  expect(response.headers.get('x-middleware-request-x-zigoals-origin')).toBe('https://alpha.zigoals.app');
});
test('the route sends its own headers on every answer: a refusal is never stored, a miss for a minute, a logo for a day', async () => {
  const {GET} = await import('../app/api/market-logo/route');
  const refused = await GET(new Request('https://alpha.zigoals.app/api/market-logo?url=http://localhost'));
  expect(refused.status).toBe(400);
  expect(Object.fromEntries(refused.headers)).toEqual({
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'; sandbox",
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  });
  vi.resetModules();
  vi.doMock('../lib/server/market-logo', () => ({serverMarketLogoCache: {load: async () => null}}));
  const missing = await (await import('../app/api/market-logo/route')).GET(new Request(logo));
  expect(missing.status).toBe(404);
  expect(missing.headers.get('cache-control')).toBe('public, max-age=60');
  expect(missing.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
  vi.resetModules();
  vi.doMock('../lib/server/market-logo', () => ({serverMarketLogoCache: {load: async () => ({bytes: new Uint8Array([137, 80, 78, 71]), contentType: 'image/png'})}}));
  const found = await (await import('../app/api/market-logo/route')).GET(new Request(logo));
  expect(found.status).toBe(200);
  expect(Object.fromEntries(found.headers)).toEqual({
    'cache-control': 'public, max-age=86400',
    'content-security-policy': "default-src 'none'; sandbox",
    'content-type': 'image/png',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  });
  vi.doUnmock('../lib/server/market-logo');
});
