import assert from "node:assert/strict";

export const ALPHA_ORIGIN = "https://alpha.zigoals.app";
export const ALPHA_ROUTES = ["/app", "/app/habits", "/app/health", "/app/goals", "/app/goals/new", "/app/wealth", "/app/markets", "/app/activity", "/app/ecosystem", "/app/settings"];

export function assertHtml(response, html, route="/app") {
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
  const permissions=(h.get("permissions-policy")??"").split(/\s*,\s*/);
  const camera=route==='/app/health'&&permissions.includes('camera=(self)')?'camera=(self)':'camera=()';
  const expected=[camera,'microphone=()','geolocation=()'];
  assert.deepEqual(permissions,expected,'Camera permission must be self-only on Health and denied everywhere else; other permissions remain denied');
  const directives = new Map();
  for (const directive of (h.get("content-security-policy") ?? "").split(";").filter(s => s.trim())) {
    const [rawKey, ...values] = directive.trim().split(/\s+/);
    const key = rawKey.toLowerCase();
    // Browsers use the first duplicate directive. Never silently keep the last,
    // or accept script-src-elem/attr overriding the reviewed script policy.
    assert(!directives.has(key), `CSP duplicate ${key}`);
    directives.set(key, values);
  }
  assert.deepEqual([...directives.keys()].sort(), ["default-src", "script-src", "style-src", "img-src", "font-src", "connect-src", "object-src", "frame-src", "frame-ancestors", "base-uri", "form-action", "upgrade-insecure-requests"].sort(), "CSP directive set changed");
  for (const key of ["object-src", "base-uri", "frame-ancestors", "frame-src"]) {
    assert.deepEqual(directives.get(key), ["'none'"], `CSP ${key} changed`);
  }
  assert.deepEqual(directives.get("default-src"), ["'self'"], "CSP default-src changed");
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

export async function smokeAlpha({ expectedCommit, fetcher = fetch } = {}) {
  const checks = []; let firstNonce;
  for (const route of [...ALPHA_ROUTES, "/app"]) {
    const response = await fetcher(`${ALPHA_ORIGIN}${route}`, {
      redirect: "manual", signal: AbortSignal.timeout(20000),
      headers: { "Cache-Control": "no-cache", "User-Agent": "ZIGoals-Alpha-Smoke" },
    });
    const html = await response.text();
    const nonce = assertHtml(response, html,route);
    if (checks.length === 0) {
      firstNonce = nonce;
      assert.match(html, /YOUR FINANCIAL ORBIT/, "Run 9.2 Today hero missing");
      assert.match(html, /Local [Dd]emo/, "Local Demo default missing");
    }
    if (route === "/app/settings") {
      assert.match(html, /PUBLIC_ALPHA_UNDEPLOYED/, "Public Alpha safety mode missing");
      if (expectedCommit) assert(html.includes(expectedCommit), "Hosted build commit differs from reviewed source");
    }
    if (checks.length === ALPHA_ROUTES.length) assert.notEqual(nonce, firstNonce, "Response nonce was reused");
    checks.push({ route, status: response.status, security: "PASS" });
  }
  return checks;
}
