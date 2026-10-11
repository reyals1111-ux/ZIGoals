import egress from "./egress-policy.json";
import { TRUSTED_TYPES, composeCsp, connectSources } from "./csp-compose.mjs";

/**
 * Every origin the app may connect to, in one place (egress-policy.json): itself, the two Testnet endpoints, the AI
 * providers a person may connect ZIGi to (ADR-012, browser-direct: the browser calls the person's own provider; nothing
 * goes through ZIGoals), and the two loopback names for a local model on the person's computer. A fixed list rather
 * than one narrowed per person: a preference cookie would tell our host which provider each person uses on every
 * request. The exfiltration trade-off (a same-origin script could post data to a listed provider with a key of its
 * own) is recorded in docs/security/THREAT_MODEL.md; CSP never stops exfiltration by navigation anyway.
 */
export const CONNECT_SOURCES: readonly string[] = connectSources(egress, "app");

/**
 * Web Crypto only: runs in Next's edge middleware and workerd. The policy itself comes from lib/csp-compose.mjs (Session
 * W Part 1e), the same composer every deployment check uses; `pathname` picks the document class ("app" for /app and
 * below, "site" otherwise), and with no class-specific sources both classes send the policy of every build since Session V.
 */
export function securityPolicy(development: boolean, https: boolean, pathname = "/app") {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  return { nonce, csp: composeCsp(egress, { nonce, development, https, pathname }) };
}
/**
 * The Trusted Types directives. Session U Part 6 (FIX_PLAN D4, FINDINGS Q-WEB-04) built them as a report-only trial;
 * Session V Part 19 enforces them in every production build (securityPolicy above) after the full browser suite on both
 * projects reported nothing under the trial (docs/security/TRUSTED_TYPES.md). The trial header stays, so a later
 * regression can be measured the same way: a trial run sends the same directives report-only to a local collector
 * (middleware.ts, with ZIGOALS_TRUSTED_TYPES_TRIAL set to a loopback URL), which also covers the development server.
 */
export { TRUSTED_TYPES };
export const TRUSTED_TYPES_TRIAL = TRUSTED_TYPES;
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
