import assert from "node:assert/strict";
import { probeAlphaMarket } from "./alpha-market-probe.mjs";

export const ALPHA_ORIGIN = "https://alpha.zigoals.app";
export const ALPHA_ROUTES = ["/app", "/app/habits", "/app/health", "/app/goals", "/app/goals/new", "/app/wealth", "/app/markets", "/app/activity", "/app/ecosystem", "/app/settings"];

/**
 * Security floor for the LIVE Alpha before an upload (rollback capture). The live version is the previous build, so it
 * cannot be held to the new build's exact policy: a release that adds a directive (worker-src, #72) would otherwise
 * never deploy. It must still hold every essential protection; extra or newer directives are accepted, and any
 * script-src-elem/attr must meet the same script rules. The post-upload check stays the exact match below.
 */
function assertBaselineCsp(directives) {
  const required = { "default-src": ["'self'"], "object-src": ["'none'"], "base-uri": ["'none'"], "frame-ancestors": ["'none'"], "form-action": ["'self'"], "upgrade-insecure-requests": [] };
  for (const [key, value] of Object.entries(required)) assert.deepEqual(directives.get(key), value, `CSP baseline ${key} missing or weakened`);
  const unsafe = token => /^'unsafe-/i.test(token) || token === "*" || /^(https?|data|blob|filesystem):$/i.test(token) || token.includes("*");
  for (const key of ["script-src", "script-src-elem", "script-src-attr"]) {
    if (key !== "script-src" && !directives.has(key)) continue;
    const tokens = directives.get(key) ?? [];
    assert(!tokens.some(unsafe), `CSP baseline ${key} allows unsafe or wildcard sources`);
  }
}

export function assertHtml(response, html, route="/app", { baseline = false } = {}) {
  assert.equal(response.status, 200, "Alpha route must return HTTP 200 without redirect");
  const h = response.headers;
  assert.match(h.get("content-type") ?? "", /^text\/html\b/i, "Expected HTML");
  const cache = h.get("cache-control") ?? "";
  assert.match(cache, /\bprivate\b/i, "HTML must stay private");
  assert.match(cache, /\bno-store\b/i, "HTML must not be stored");
  assert.doesNotMatch(cache, /\bpublic\b/i, "HTML cannot be public cacheable");
  assert.equal(h.get("x-frame-options")?.toUpperCase(), "DENY", "Frame denial missing");
  assert.equal(h.get("x-content-type-options"), "nosniff", "nosniff missing");
  assert.equal(h.get("referrer-policy"), "no-referrer", "Referrer policy changed");
  const hsts = h.get("strict-transport-security") ?? "";
  const ages = [...hsts.matchAll(/max-age=(\d+)/g)].map(m => Number(m[1]));
  assert(ages.length > 0 && ages.every(age => age >= 31536000), "HSTS missing or weakened");
  for (const token of ["noindex", "nofollow", "noarchive"]) {
    assert((h.get("x-robots-tag") ?? "").split(/\s*,\s*/).includes(token), `Robots ${token} missing`);
  }
  const directives = new Map();
  for (const directive of (h.get("content-security-policy") ?? "").split(";").filter(s => s.trim())) {
    const [rawKey, ...values] = directive.trim().split(/\s+/);
    const key = rawKey.toLowerCase();
    // Browsers use the first duplicate directive. Never silently keep the last,
    // or accept script-src-elem/attr overriding the reviewed script policy.
    assert(!directives.has(key), `CSP duplicate ${key}`);
    directives.set(key, values);
  }
  if (baseline) {
    assertBaselineCsp(directives);
    const nonce = (directives.get("script-src") ?? []).find(token => /^'nonce-[A-Za-z0-9+/]{43}='$/.test(token))?.slice(7, -1);
    assert(nonce, "Fresh 32-byte script nonce missing");
    const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)];
    assert(scriptTags.length > 0, "Rendered application scripts missing");
    assert(scriptTags.every(([tag]) => tag.includes(`nonce="${nonce}"`)), "HTML script nonce does not match CSP");
    return nonce;
  }
  const permissions=(h.get("permissions-policy")??"").split(/\s*,\s*/);
  const camera=route==='/app/health'&&permissions.includes('camera=(self)')?'camera=(self)':'camera=()';
  const expected=[camera,'microphone=()','geolocation=()'];
  assert.deepEqual(permissions,expected,'Camera permission must be self-only on Health and denied everywhere else; other permissions remain denied');
  assert.deepEqual([...directives.keys()].sort(), ["default-src", "script-src", "worker-src", "style-src", "img-src", "font-src", "connect-src", "object-src", "frame-src", "frame-ancestors", "base-uri", "form-action", "upgrade-insecure-requests"].sort(), "CSP directive set changed");
  for (const key of ["object-src", "base-uri", "frame-ancestors", "frame-src"]) {
    assert.deepEqual(directives.get(key), ["'none'"], `CSP ${key} changed`);
  }
  assert.deepEqual(directives.get("default-src"), ["'self'"], "CSP default-src changed");
  assert.deepEqual(directives.get("worker-src"), ["'self'"], "CSP worker-src changed");
  assert.deepEqual(directives.get("style-src"), ["'self'", "'unsafe-inline'"], "CSP style-src changed");
  assert.deepEqual(directives.get("img-src"), ["'self'", "data:", "blob:"], "CSP img-src changed");
  assert.deepEqual(directives.get("font-src"), ["'self'"], "CSP font-src changed");
  assert.deepEqual(directives.get("form-action"), ["'self'"], "CSP form-action changed");
  assert.deepEqual(directives.get("connect-src"), ["'self'", "https://testnet-api.zigchain.com", "https://testnet-rpc.zigchain.com"], "CSP Testnet egress changed");
  assert.deepEqual(directives.get("upgrade-insecure-requests"), [], "CSP HTTPS upgrade policy changed");
  const scripts = directives.get("script-src") ?? [];
  const nonce = scripts.find(token => /^'nonce-[A-Za-z0-9+/]{43}='$/.test(token))?.slice(7, -1);
  assert(nonce, "Fresh 32-byte script nonce missing");
  assert.deepEqual(scripts, ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"], "Script CSP changed");
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)];
  assert(scriptTags.length > 0, "Rendered application scripts missing");
  assert(scriptTags.every(([tag]) => tag.includes(`nonce="${nonce}"`)), "HTML script nonce does not match CSP");
  return nonce;
}

// Session U Part 2d (kept apart from the imports above, which Session T also edits).
import { readPolicyWindow, POLICY_STATUS_PATH } from "./market-policy-window.mjs";
/**
 * Session U Part 3: the Health document must grant its own camera (the barcode scanner) and never location. The
 * microphone may be () or (self) (Session T's voice input). Only these three are required here, never the exact value:
 * assertHtml keeps the exact per-route check. Post-upload smoke only; the rollback capture never fails on it.
 */
export function assertHealthCamera(header) {
  const entries = new Map(String(header ?? "").split(/\s*,\s*/).filter(Boolean).map(entry => [entry.slice(0, entry.indexOf("=")), entry.slice(entry.indexOf("=") + 1)]));
  assert.equal(entries.get("camera"), "(self)", "Health must allow its own camera (camera=(self)) for the barcode scanner");
  assert.equal(entries.get("geolocation"), "()", "Health must not allow geolocation (geolocation=())");
  assert(["()", "(self)"].includes(entries.get("microphone")), "Health microphone must be () or (self)");
}
/**
 * `marketProbe` (Session S, the post-deploy smoke only): one BTC/USD probe of /api/market-quotes. The answer must be a
 * well-formed envelope; VERIFIED or UNAVAILABLE is recorded as information and never fails the smoke. The rollback capture
 * leaves it off, since the version it validates may predate the envelope.
 * `baseline` (the rollback capture only): the live, previous build is checked against the fixed security floor
 * (assertBaselineCsp) instead of the new build's exact policy. The post-upload smoke never sets it.
 */
export async function smokeAlpha({ expectedCommit, fetcher = fetch, marketProbe = false, baseline = false } = {}) {
  const checks = []; let firstNonce;
  for (const route of [...ALPHA_ROUTES, "/app"]) {
    const response = await fetcher(`${ALPHA_ORIGIN}${route}`, {
      redirect: "manual", signal: AbortSignal.timeout(20000),
      headers: { "Cache-Control": "no-cache", "User-Agent": "ZIGoals-Alpha-Smoke" },
    });
    const html = await response.text();
    const nonce = assertHtml(response, html, route, { baseline });
    if (route === "/app/health" && !baseline) assertHealthCamera(response.headers.get("permissions-policy"));
    if (checks.length === 0) {
      firstNonce = nonce;
      assert.match(html, /YOUR FINANCIAL ORBIT/, "Run 9.2 Today hero missing");
      assert.match(html, /Local [Dd]emo/, "Local Demo default missing");
    }
    if (!baseline) assertOpenerPolicy(response.headers.get("cross-origin-opener-policy"));
    if (route === "/app/settings") {
      assert.match(html, /PUBLIC_ALPHA_UNDEPLOYED/, "Public Alpha safety mode missing");
      if (expectedCommit) assert(html.includes(expectedCommit), "Hosted build commit differs from reviewed source");
    }
    if (checks.length === ALPHA_ROUTES.length) assert.notEqual(nonce, firstNonce, "Response nonce was reused");
    checks.push({ route, status: response.status, security: "PASS" });
  }
  if (marketProbe) {
    // Session U Part 2d: when the market policy period ends, read first and recorded as information only.
    const policy = await readPolicyWindow({ origin: ALPHA_ORIGIN, fetcher });
    checks.push({ route: POLICY_STATUS_PATH, status: policy.httpStatus, policyWindowEnd: policy.policyWindowEnd, nextPolicyWindowEnd: policy.nextPolicyWindowEnd });
    const market = await probeAlphaMarket({ origin: ALPHA_ORIGIN, fetcher });
    assert(market.wellFormed, `Alpha market route did not answer a well-formed price envelope (${market.reason})`);
    checks.push({ route: "/api/market-quotes", status: market.httpStatus, market: market.result, pair: market.pair, failure: market.failure });
  }
  return checks;
}
/**
 * Session U Part 6 (FIX_PLAN D1, FINDINGS Q-WEB-01): every app page is sent with Cross-Origin-Opener-Policy:
 * same-origin, so a page it opens, or that opens it, gets no handle on it. Post-upload smoke only: the rollback capture
 * never requires it (the live, previous build may predate it).
 */
export function assertOpenerPolicy(header) {
  assert.equal(header, "same-origin", "Cross-Origin-Opener-Policy must be same-origin");
}
