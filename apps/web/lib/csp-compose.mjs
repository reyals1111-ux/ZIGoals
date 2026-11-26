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
/**
 * Session AM-2 (TIER 3 (CSP/egress), owner's step 4a; behaviour-preserving while no proxy is configured): the weather
 * proxy's address, from build configuration (NEXT_PUBLIC_WEATHER_PROXY_URL; workers/weather-proxy, deployed by the owner,
 * docs/run11/WEATHER_PROXY_ACTIVATION.md). Accepted only as exactly "https://<dns name>[:port]/v1/forecast" in its
 * canonical spelling: no credentials, query, fragment, wildcard, IP address or other path. Anything else is no proxy at
 * all (null): the weather client then asks MET Norway directly, as before.
 * Security review (AM-2, finding 10a): the loopback form "http://127.0.0.1:<port>/v1/forecast" (a local test against
 * `wrangler dev`; connect-src already allows that origin) is accepted only when the caller says the build is a local one
 * (`{local: true}`: a development or LOCAL_DEMO build, lib/nova/world/proxy.ts). In every other build, the public Alpha
 * included, it is no proxy at all: a deployed app never sends a place to whatever listens on the visitor's own machine.
 */
export const WEATHER_PROXY_ENV = "NEXT_PUBLIC_WEATHER_PROXY_URL";
export const WEATHER_PROXY_PATH = "/v1/forecast";
const PROXY_HOST = /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$/;
export function weatherProxyUrl(value, { local = false } = {}) {
  if (typeof value !== "string" || value.length < 12 || value.length > 300) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.href !== value || url.username || url.password || url.search || url.hash || url.pathname !== WEATHER_PROXY_PATH) return null;
  if (url.protocol === "https:") return PROXY_HOST.test(url.hostname) ? url.href : null;
  return local === true && url.protocol === "http:" && url.hostname === "127.0.0.1" && /^\d{2,5}$/.test(url.port) ? url.href : null;
}
/**
 * The egress policy of a build: the committed policy, plus the configured weather proxy's origin in /app documents'
 * connect-src, right after MET Norway's host (the balance hosts stay the tail). The same object comes back when no proxy
 * is configured, when the value is not accepted, or when connect-src already allows the origin. The loopback test form
 * never changes the policy (it is not accepted here at all; connect-src allows 127.0.0.1 already).
 */
export function withWeatherProxy(egress, value) {
  const url = weatherProxyUrl(value);
  if (!url) return egress;
  const origin = new URL(url).origin, connect = egress.csp.app.connect;
  if (connectSources(egress, "app").includes(origin)) return egress;
  const at = connect.indexOf("https://api.met.no");
  const next = at === -1 ? [...connect, origin] : [...connect.slice(0, at + 1), origin, ...connect.slice(at + 1)];
  return { ...egress, csp: { ...egress.csp, app: { ...egress.csp.app, connect: next } } };
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
    // Session AW (TIER 3 CSP; Part 6, aw-x3-notes-journal): a voice note recorded on this device plays from a blob: URL; without
    // media-src it fell back to default-src 'self' and every journal voice note was refused ("URL safety check").
    ["media-src", ["'self'", "blob:"]],
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
/** The Permissions-Policy of a document (lib/egress-policy.json): the camera only on Health, the microphone on app pages, geolocation denied; Bluetooth is not named (Chromium has no such feature; Session AL TK-191). */
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
