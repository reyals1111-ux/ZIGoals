import {test, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {AK_SHORTCUTS, AK_STAGE, WALLETCONNECT_CONNECT, connectSrc, foodState, manifestProblems, pushState} from './hosted-alpha-ak.mjs';
import egress from '../../apps/web/lib/egress-policy.json' with {type: 'json'};

// Session AK Part 14 (TIER 3 (verifier)): the AK stage's pure checks, against the committed manifest and policy.
test('stage 11 is appended after the Checklist stage and is a browser stage', () => {
  expect([AK_STAGE.number, AK_STAGE.key, AK_STAGE.browser, AK_STAGE.liveOnly, AK_STAGE.reportsItself]).toEqual([11, 'ak', true, false, false]);
});
test('the committed manifest passes; a manifest without a shortcut or a screenshot kind fails with a sentence', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../apps/web/public/manifest.webmanifest', import.meta.url), 'utf8'));
  expect(manifestProblems(manifest)).toEqual([]);
  expect(manifestProblems({...manifest, shortcuts: manifest.shortcuts.filter(s => s.url !== AK_SHORTCUTS[1])})).toEqual([`manifest: no shortcut to ${AK_SHORTCUTS[1]}`]);
  expect(manifestProblems({...manifest, screenshots: manifest.screenshots.filter(s => s.form_factor === 'wide')})).toEqual(['manifest: screenshots need one wide and one narrow']);
  expect(manifestProblems(null)).toHaveLength(3);
});
test('the WalletConnect hosts are the policy\'s own; connect-src is read from a header', () => {
  for (const host of WALLETCONNECT_CONNECT) expect(egress.csp.app.connect).toContain(host);
  expect(connectSrc("default-src 'self'; connect-src 'self' wss://relay.walletconnect.org; img-src 'self'")).toEqual(["'self'", 'wss://relay.walletconnect.org']);
  expect(connectSrc(null)).toEqual([]);
});
test('the push switch: on, off, or a problem (never a silent pass)', () => {
  expect(pushState(200, {enabled: true, publicKey: 'B'.repeat(87)})).toBe('on');
  expect(pushState(200, {enabled: false, error: 'PUSH_SWITCHING_ON'})).toBe('off');
  expect(pushState(200, {enabled: true, publicKey: 'short'})).toMatch(/^push-device: unexpected/);
  expect(pushState(500, null)).toMatch(/^push-device: unexpected/);
});
test('the food binding: bound, unbound, or a problem', () => {
  expect(foodState(200, {name: 'x'})).toBe('bound');
  expect(foodState(404, {error: 'NOT_FOUND'})).toBe('bound');
  expect(foodState(503, {error: 'PROVIDER_SETUP_REQUIRED'})).toBe('unbound');
  expect(foodState(503, {error: 'PROVIDER_UNAVAILABLE'})).toMatch(/^food-lookup: unexpected/);
  expect(foodState(400, {error: 'INVALID_BARCODE'})).toMatch(/^food-lookup: unexpected/);
});
