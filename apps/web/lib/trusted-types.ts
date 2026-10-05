/**
 * Session U Part 6 (FIX_PLAN D4, FINDINGS Q-WEB-04): an inert Trusted Types default policy. Browsers call it only for a
 * page whose CSP requires Trusted Types, and no build of this app does: only the report-only trial (TRUSTED_TYPES_TRIAL in
 * lib/security-policy.ts, docs/security/TRUSTED_TYPES.md) asks for it, to list what enforcement would refuse. It allows
 * script URLs only from this origin's /_next/static/ (the framework's chunks) and /push-sw.js (the push-only service
 * worker, ADR-010), and nothing else: no HTML string and no script string is ever made trusted.
 */
export const TRUSTED_SCRIPT_PATHS = ['/_next/static/', '/push-sw.js'] as const;
export function trustedScriptURL(value: string, origin: string): string | null {
  let url: URL;
  try { url = new URL(value, origin); } catch { return null; }
  if (url.origin !== origin) return null;
  return url.pathname === '/push-sw.js' || url.pathname.startsWith('/_next/static/') ? url.href : null;
}
type TrustedTypesFactory = {defaultPolicy?: unknown; createPolicy: (name: string, rules: {createScriptURL: (value: string) => string | null}) => unknown};
/**
 * Registers the default policy once, where the browser has Trusted Types; a page that already has one keeps it. A refused
 * URL returns null, never throws: under enforcement the browser then blocks the sink, and under the report-only trial it
 * reports the sink and lets it run (a throwing default policy would break the page even report-only).
 */
export function installTrustedTypesDefault(scope: {trustedTypes?: TrustedTypesFactory; location: {origin: string}}): boolean {
  const factory = scope.trustedTypes;
  if (!factory || factory.defaultPolicy) return false;
  try {
    factory.createPolicy('default', {createScriptURL: value => trustedScriptURL(value, scope.location.origin)});
    return true;
  } catch {
    return false;
  }
}
