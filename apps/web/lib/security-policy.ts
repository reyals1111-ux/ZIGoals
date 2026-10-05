import egress from "./egress-policy.json";

/**
 * Every origin the app may connect to, in one place (egress-policy.json): itself, the two Testnet endpoints, the AI
 * providers a person may connect ZIGi to (ADR-012, browser-direct: the browser calls the person's own provider; nothing
 * goes through ZIGoals), and the two loopback names for a local model on the person's computer. A fixed list rather
 * than one narrowed per person: a preference cookie would tell our host which provider each person uses on every
 * request. The exfiltration trade-off (a same-origin script could post data to a listed provider with a key of its
 * own) is recorded in docs/security/THREAT_MODEL.md; CSP never stops exfiltration by navigation anyway.
 */
export const CONNECT_SOURCES: readonly string[] = ["'self'", ...egress.chainOrigins, ...Object.values(egress.aiProviderOrigins), ...egress.localModelSources];

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
    `connect-src ${CONNECT_SOURCES.join(" ")}${development ? " ws://127.0.0.1:3100" : ""}`,
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
