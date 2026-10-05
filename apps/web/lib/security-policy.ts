/** Web Crypto only: runs in Next's edge middleware and workerd. */
export function securityPolicy(development: boolean, https: boolean) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // The push-only service worker (public/push-sw.js, ADR-010): under 'strict-dynamic' a worker URL carries no nonce,
    // so workers need their own same-origin directive. Nothing else runs in a worker.
    "worker-src 'self'",
    // React progress bars use style attributes. This exception never authorizes scripts.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com${development ? " ws://127.0.0.1:3100" : ""}`,
    "object-src 'none'", "frame-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return { nonce, csp };
}
/**
 * Session U Part 6 (FIX_PLAN D4, FINDINGS Q-WEB-04): the Trusted Types directives, kept apart from the policy above and
 * never enforced in this PR. Only a trial run sends them, report-only, to a local collector (middleware.ts, with
 * ZIGOALS_TRUSTED_TYPES_TRIAL set to a loopback URL; docs/security/TRUSTED_TYPES.md). Enforcing them is a follow-up.
 */
export const TRUSTED_TYPES_TRIAL = "require-trusted-types-for 'script'; trusted-types default";
const LOOPBACK_HOSTS = ["127.0.0.1", "localhost"];
/**
 * The report-only header for a trial run, or null. Both ends must be this machine: a plain http loopback collector, and a
 * request addressed to a loopback host, so a public page never carries it even if the variable were set there.
 */
export function trustedTypesTrialHeader(collector: string | undefined, requestHost: string): string | null {
  if (!collector || !LOOPBACK_HOSTS.includes(requestHost)) return null;
  let url: URL;
  try { url = new URL(collector); } catch { return null; }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.includes(url.hostname) || url.href !== collector) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return `${TRUSTED_TYPES_TRIAL}; report-uri ${url.href}`;
}
