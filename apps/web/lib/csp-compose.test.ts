import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import egress from './egress-policy.json';
import {SVG_CSP,composeCsp,cspDirectives,documentClass,permissionsPolicyFor,staticHeaders,type EgressPolicy} from './csp-compose.mjs';
import {securityPolicy} from './security-policy';

// Session W Part 1e ([TIER 3] (CSP/Permissions-Policy), behaviour-preserving): the one composer. These strings are the
// policies the app sent before the composer existed (security-policy.ts at main 1063765, nonce replaced), byte for byte.
const BEFORE: Record<string, string> = {
  'prod-https': "default-src 'self'; script-src 'self' 'nonce-NONCE' 'strict-dynamic'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.x.ai https://openrouter.ai http://localhost:* http://127.0.0.1:*; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; require-trusted-types-for 'script'; trusted-types default; upgrade-insecure-requests",
  'prod-http': "default-src 'self'; script-src 'self' 'nonce-NONCE' 'strict-dynamic'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.x.ai https://openrouter.ai http://localhost:* http://127.0.0.1:*; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; require-trusted-types-for 'script'; trusted-types default",
  'dev-https': "default-src 'self'; script-src 'self' 'nonce-NONCE' 'strict-dynamic' 'unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.x.ai https://openrouter.ai http://localhost:* http://127.0.0.1:* ws://127.0.0.1:3100; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests",
  'dev-http': "default-src 'self'; script-src 'self' 'nonce-NONCE' 'strict-dynamic' 'unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.x.ai https://openrouter.ai http://localhost:* http://127.0.0.1:* ws://127.0.0.1:3100; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
const modes = {'prod-https': [false, true], 'prod-http': [false, false], 'dev-https': [true, true], 'dev-http': [true, false]} as const;
// Session W Part 14 (Chess, [TIER 3] (egress connect-src + frame-src)): /app documents add chess.com's and Lichess's
// APIs after the shared origins and frame exactly their four pages; every other document keeps main's policy.
const CHESS_CONNECT = ' https://api.chess.com https://lichess.org', CHESS_FRAMES = 'frame-src https://www.chess.com/daily_puzzle https://lichess.org/training/frame https://lichess.org/tv/ https://lichess.org/embed/game/';
const APP_AFTER = (mode: string) => BEFORE[mode]!.replace(/(connect-src [^;]*?http:\/\/127\.0\.0\.1:\*)/, `$1${CHESS_CONNECT}`).replace("frame-src 'none'", CHESS_FRAMES);
test('every mode sends main 1063765\'s policy on every site document, and on /app documents that policy with the Part 14 sources only', () => {
  for (const [mode, [development, https]] of Object.entries(modes)) {
    expect(APP_AFTER(mode), mode).not.toBe(BEFORE[mode]);
    for (const pathname of ['/app', '/app/health', '/app/settings', '/app/chess', '/', '/manifest.webmanifest', '/missing']) {
      const expected = pathname.startsWith('/app') ? APP_AFTER(mode) : BEFORE[mode];
      expect(composeCsp(egress, {nonce: 'NONCE', development, https, pathname}), `${mode} ${pathname}`).toBe(expected);
      const {nonce, csp} = securityPolicy(development, https, pathname);
      expect(csp.replace(nonce, 'NONCE'), `${mode} ${pathname} (app)`).toBe(expected);
    }
  }
  // The default document class of securityPolicy is the app's.
  const {nonce, csp} = securityPolicy(false, true);expect(csp.replace(nonce, 'NONCE')).toBe(APP_AFTER('prod-https'));
});
test('document classes: /app and below are "app"; every other document is "site"', () => {
  for (const path of ['/app', '/app/', '/app/health', '/app/wealth/asset/x']) expect(documentClass(path), path).toBe('app');
  for (const path of ['/', '/apple', '/application', '/api/zigi', '/welcome']) expect(documentClass(path), path).toBe('site');
});
test('a class\'s own sources reach only its documents, in order, after the shared ones; frame-src leaves \'none\' only with sources', () => {
  const sample: EgressPolicy = {...egress, csp: {app: {connect: ['https://api.example.test'], img: ['https://img.example.test'], frame: ['https://embed.example.test/frame']}, site: {connect: [], img: [], frame: []}}};
  const app = new Map(cspDirectives(sample, {nonce: 'N', pathname: '/app/chess'})), site = new Map(cspDirectives(sample, {nonce: 'N', pathname: '/'}));
  expect(app.get('connect-src')!.at(-1)).toBe('https://api.example.test');expect(site.get('connect-src')).not.toContain('https://api.example.test');
  expect(app.get('img-src')).toEqual(["'self'", 'data:', 'blob:', 'https://img.example.test']);expect(site.get('img-src')).toEqual(["'self'", 'data:', 'blob:']);
  expect(app.get('frame-src')).toEqual(['https://embed.example.test/frame']);expect(site.get('frame-src')).toEqual(["'none'"]);
  // Every other directive is the same for both classes.
  for (const name of ['default-src', 'script-src', 'worker-src', 'style-src', 'font-src', 'object-src', 'frame-ancestors', 'base-uri', 'form-action', 'require-trusted-types-for', 'trusted-types', 'upgrade-insecure-requests']) expect(app.get(name), name).toEqual(site.get(name));
});
test('Permissions-Policy per document: the camera only on Health, the microphone on app pages, nothing elsewhere (next.config.ts\'s rules)', () => {
  expect(permissionsPolicyFor(egress, '/app/health')).toBe(egress.permissionsPolicy.health);
  for (const path of ['/app', '/app/settings', '/app/health/x']) expect(permissionsPolicyFor(egress, path), path).toBe(egress.permissionsPolicy.app);
  for (const path of ['/', '/api/zigi']) expect(permissionsPolicyFor(egress, path), path).toBe(egress.permissionsPolicy.global);
});
test('public/_headers is exactly what the composer builds from the same data', () => {
  expect(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')).toBe(staticHeaders(egress));
  expect(SVG_CSP).toBe("default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
});
