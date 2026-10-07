import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import egress from './egress-policy.json';
import {STATIC_MISS_CSP, globalStaticHeaders, staticHeaders, staticMissHeaders, type EgressPolicy} from './csp-compose.mjs';
import {isStaticPath, staticMiss} from './static-miss.mjs';

// Session W Part 23 (Session Q D2, [TIER 3] (deploy config)): a /_next/static/ file that does not exist gets a plain-text
// 404 from the Alpha's Worker entry (alpha/worker.mjs) instead of Next's HTML 404 page without a policy.
const policy = egress as EgressPolicy;
const at = (path: string, init?: RequestInit) => new Request(`https://alpha.zigoals.app${path}`, init);

test('a missing static file: 404, plain text, nothing from the request, a policy that allows nothing, the static headers', async () => {
  const response = staticMiss(at('/_next/static/chunks/<script>alert(1)</script>.js?x=<b>hi</b>', {headers: {'x-zigoals-origin': 'https://evil.example'}}), policy)!;
  expect(response.status).toBe(404);
  expect(await response.text()).toBe('Not found\n');
  expect(Object.fromEntries(response.headers)).toEqual(Object.fromEntries(staticMissHeaders(policy).map(([name, value]) => [name.toLowerCase(), value])));
  expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox");
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(response.headers.get('x-frame-options')).toBe('DENY');
  expect(response.headers.get('permissions-policy')).toBe(policy.permissionsPolicy.global);
  expect(response.headers.has('set-cookie')).toBe(false);
});

test('every method and the bare prefix get the same answer; HEAD has no body', async () => {
  for (const path of ['/_next/static', '/_next/static/', '/_next/static/css/a.css', '/_next/static/media/font.woff2']) {
    for (const method of ['GET', 'POST', 'PUT']) expect(staticMiss(at(path, {method}), policy)?.status, `${method} ${path}`).toBe(404);
    const head = staticMiss(at(path, {method: 'HEAD'}), policy)!;
    expect(head.status).toBe(404);
    expect(head.body).toBeNull();
  }
});

test('every other path is left to OpenNext, as before', () => {
  for (const path of ['/', '/app', '/app/settings', '/_next/image', '/_next/data/x.json', '/_next/staticx/a.js', '/_next/static-assets/a.js', '/static/a.js', '/_next', '/api/market-logo', '/icon.svg', '/robots.txt'])
    expect(staticMiss(at(path), policy), path).toBeNull();
  expect(isStaticPath('/_next/static/chunks/a.js')).toBe(true);
  expect(isStaticPath('/_next/statics')).toBe(false);
});

test('the paths it answers are exactly the static paths middleware never sees', () => {
  // middleware.ts's matcher leaves out `_next/static(?:/|$)`: those responses carry no page policy.
  expect(readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8')).toContain('(?!_next/static(?:/|$)|');
});

test('its headers are the static assets\' own (public/_headers "/*" block), plus the policy, the type and no-store', () => {
  const block = staticHeaders(policy).split('\n\n')[0]!.split('\n').slice(1).map(line => line.trim().split(': ') as [string, string]);
  expect(globalStaticHeaders(policy)).toEqual(block);
  expect(staticMissHeaders(policy)).toEqual([['Content-Type', 'text/plain; charset=utf-8'], ['Cache-Control', 'no-store'], ['Content-Security-Policy', STATIC_MISS_CSP], ...block]);
});

test('the Alpha\'s Worker entry puts the static answer in front of OpenNext\'s handler and keeps its exports', () => {
  const entry = readFileSync(new URL('../alpha/worker.mjs', import.meta.url), 'utf8');
  expect(entry).toContain('import openNext from "../.open-next/worker.js";');
  expect(entry).toContain('export * from "../.open-next/worker.js";');
  expect(entry).toContain('fetch: (request, env, ctx) => staticMiss(request, egress) ?? openNext.fetch(request, env, ctx)');
  expect(JSON.parse(readFileSync(new URL('../wrangler.alpha.jsonc', import.meta.url), 'utf8')).main).toBe('alpha/worker.mjs');
});
