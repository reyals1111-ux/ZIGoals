/**
 * Session U Part 6 (FIX_PLAN D4, FINDINGS Q-WEB-04): an inert Trusted Types default policy. Browsers call it only for a
 * page whose CSP requires Trusted Types, and no build of this app does: only the report-only trial (TRUSTED_TYPES_TRIAL in
 * lib/security-policy.ts, docs/security/TRUSTED_TYPES.md) asks for it, to list what enforcement would refuse. It allows
 * script URLs only from this origin's /_next/static/ (the framework's chunks) and /push-sw.js (the push-only service
 * worker, ADR-010), and nothing else: no HTML string and no script string is ever made trusted.
 */
export const TRUSTED_SCRIPT_PATHS = ['/_next/static/', '/push-sw.js'] as const;
/**
 * The value itself when it resolves, against the document's base URL as the browser will resolve it, to an allowed path
 * on this origin; otherwise null. An allowed value is returned unchanged, never rewritten: Turbopack recognises a loaded
 * chunk by its script's raw src attribute, and an absolute rewrite left soft navigations waiting forever (trial, 2026-10-05).
 */
export function trustedScriptURL(value: string, origin: string, base: string = origin): string | null {
  let url: URL;
  try { url = new URL(value, base); } catch { return null; }
  if (url.origin !== origin) return null;
  return url.pathname === '/push-sw.js' || url.pathname.startsWith('/_next/static/') ? value : null;
}
type TrustedTypesFactory = {defaultPolicy?: unknown; createPolicy: (name: string, rules: {createScriptURL: (value: string) => string | null}) => unknown};
/**
 * Registers the default policy once, where the browser has Trusted Types; a page that already has one keeps it. A refused
 * URL returns null, never throws: under enforcement the browser then blocks the sink, and under the report-only trial it
 * reports the sink and lets it run (a throwing default policy would break the page even report-only).
 */
export function installTrustedTypesDefault(scope: {trustedTypes?: TrustedTypesFactory; location: {origin: string}; document?: {baseURI: string}}): boolean {
  const factory = scope.trustedTypes;
  if (!factory || factory.defaultPolicy) return false;
  try {
    factory.createPolicy('default', {createScriptURL: value => trustedScriptURL(value, scope.location.origin, scope.document?.baseURI)});
    return true;
  } catch {
    return false;
  }
}
