import {expect,test,vi} from 'vitest';
import {installTrustedTypesDefault,trustedScriptURL} from './trusted-types';

// Session U Part 6 (FIX_PLAN D4): the default policy the report-only trial measures against; inert everywhere else.
const origin='https://alpha.zigoals.app';
test('script URLs are trusted only from this origin’s /_next/static/ and /push-sw.js', () => {
  for (const value of ['/_next/static/chunks/main.js', 'https://alpha.zigoals.app/_next/static/x.js', '/push-sw.js'])
    expect(trustedScriptURL(value, origin), value).not.toBeNull();
  for (const value of ['https://attacker.invalid/_next/static/x.js', '/_next/image?url=x', '/push-sw.js.map/../x', '/api/push', 'data:text/javascript,alert(1)', 'javascript:alert(1)', '//attacker.invalid/push-sw.js', '/_next/statically.js', 'blob:https://alpha.zigoals.app/x'])
    expect(trustedScriptURL(value, origin), value).toBeNull();
});
test('the default policy is created once, makes no HTML or script string trusted, and is skipped where it cannot be', () => {
  const createPolicy = vi.fn((_name: string, rules: {createScriptURL: (value: string) => string | null}) => rules);
  const scope = {trustedTypes: {createPolicy} as {defaultPolicy?: unknown; createPolicy: typeof createPolicy}, location: {origin}};
  expect(installTrustedTypesDefault(scope)).toBe(true);
  const [name, rules] = createPolicy.mock.calls[0]!;
  expect(name).toBe('default');expect(Object.keys(rules)).toEqual(['createScriptURL']);
  expect(rules.createScriptURL('/_next/static/chunks/a.js')).toBe('https://alpha.zigoals.app/_next/static/chunks/a.js');
  // Refusal is null (the browser blocks under enforcement, reports under the trial), never a throw that breaks the page.
  expect(rules.createScriptURL('https://attacker.invalid/x.js')).toBeNull();
  // A page that already has a default policy keeps it; a browser without Trusted Types, or a CSP that forbids the name, is a no-op.
  expect(installTrustedTypesDefault({...scope, trustedTypes: {...scope.trustedTypes, defaultPolicy: {}}})).toBe(false);
  expect(installTrustedTypesDefault({location: {origin}})).toBe(false);
  expect(installTrustedTypesDefault({trustedTypes: {createPolicy: () => { throw new TypeError('refused by CSP'); }}, location: {origin}})).toBe(false);
});
