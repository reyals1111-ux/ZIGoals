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
