/**
 * Session W Part 1e ([TIER 3] (CSP/Permissions-Policy), behaviour-preserving): the one composer of the documents'
 * Content-Security-Policy and Permissions-Policy, from lib/egress-policy.json. The app (security-policy.ts, called by
 * middleware.ts; next.config.ts for the SVG policy) and every check (the post-upload smoke, the hosted verifier, the
 * packaged-artifact test, the browser specs, public/_headers) build the values here, so no check holds a copy that can
 * drift. Pure: no imports and no Node or browser API, so it runs in the edge middleware and in plain Node alike.
 *
 * Document classes: "app" is /app and everything under it, "site" every other document. Each class may add connect-src,
 * img-src and frame-src sources in egress-policy.json ("csp"); with empty lists the policy is exactly the one every
 * build since Session V sends (frame-src 'none').
 */
export const SVG_CSP = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
export const TRUSTED_TYPES = "require-trusted-types-for 'script'; trusted-types default";
/** Session W Part 23 (Session Q D2): a /_next/static/ file that does not exist (lib/static-miss.mjs) loads, frames and submits nothing. */
export const STATIC_MISS_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox";
/** The development server's own refresh socket (next dev on its usual port). */
const DEV_SOCKET = "ws://127.0.0.1:3100";
export function documentClass(pathname) { return pathname === "/app" || pathname.startsWith("/app/") ? "app" : "site"; }
/** connect-src: itself, the Testnet endpoints, the AI providers, local models (ADR-012), then the class's own origins. */
export function connectSources(egress, cls = "app") {
  return ["'self'", ...egress.chainOrigins, ...Object.values(egress.aiProviderOrigins), ...egress.localModelSources, ...egress.csp[cls].connect];
}
export function imgSources(egress, cls = "app") { return ["'self'", "data:", "blob:", ...egress.csp[cls].img]; }
export function frameSources(egress, cls = "app") { const frames = egress.csp[cls].frame; return frames.length ? [...frames] : ["'none'"]; }
/** The policy as ordered [directive, sources] pairs: the order and spelling every build since Session V sends. */
export function cspDirectives(egress, { nonce, development = false, https = true, pathname = "/app" }) {
  const cls = documentClass(pathname);
  return [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(development ? ["'unsafe-eval'"] : [])]],
    // The push-only service worker (public/push-sw.js, ADR-010): under 'strict-dynamic' a worker URL carries no nonce.
    ["worker-src", ["'self'"]],
    // React progress bars use style attributes. This exception never authorizes scripts.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", imgSources(egress, cls)],
    ["font-src", ["'self'"]],
    ["connect-src", [...connectSources(egress, cls), ...(development ? [DEV_SOCKET] : [])]],
    ["object-src", ["'none'"]],
    ["frame-src", frameSources(egress, cls)],
    ["frame-ancestors", ["'none'"]],
    ["base-uri", ["'none'"]],
    ["form-action", ["'self'"]],
    // Session V Part 19: Trusted Types enforced in every production build (docs/security/TRUSTED_TYPES.md).
    ...(development ? [] : TRUSTED_TYPES.split("; ").map(directive => { const [name, ...sources] = directive.split(" "); return [name, sources]; })),
    ...(https ? [["upgrade-insecure-requests", []]] : []),
  ];
}
export function composeCsp(egress, options) { return cspDirectives(egress, options).map(([name, sources]) => [name, ...sources].join(" ")).join("; "); }
/** The Permissions-Policy of a document: the camera and Bluetooth only on Health, the microphone on app pages, the rest denied. */
export function permissionsPolicyFor(egress, pathname) {
  return pathname === "/app/health" ? egress.permissionsPolicy.health : documentClass(pathname) === "app" ? egress.permissionsPolicy.app : egress.permissionsPolicy.global;
}
/** The headers every static asset carries (public/_headers' "/*" block), as [name, value] pairs. */
export function globalStaticHeaders(egress) {
  return [
    ["X-Frame-Options", "DENY"], ["Cross-Origin-Opener-Policy", "same-origin"], ["X-Content-Type-Options", "nosniff"], ["Referrer-Policy", "no-referrer"],
    ["Permissions-Policy", egress.permissionsPolicy.global], ["Strict-Transport-Security", "max-age=31536000"], ["X-Robots-Tag", "noindex, nofollow, noarchive"],
  ];
}
/** public/_headers, the headers Cloudflare's static assets carry (checked byte for byte by csp-compose.test.ts). */
export function staticHeaders(egress) {
  return [
    "/*", ...globalStaticHeaders(egress).map(([name, value]) => `  ${name}: ${value}`), "",
    "/_next/static/*", "  Cache-Control: public, max-age=31536000, immutable", "",
    "/*.svg", `  Content-Security-Policy: ${SVG_CSP}`, "",
  ].join("\n");
}
/** A static miss (lib/static-miss.mjs): plain text, never stored, a policy that allows nothing, then the static assets' own headers. */
export function staticMissHeaders(egress) {
  return [["Content-Type", "text/plain; charset=utf-8"], ["Cache-Control", "no-store"], ["Content-Security-Policy", STATIC_MISS_CSP], ...globalStaticHeaders(egress)];
}
