import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import nextConfig from "../../apps/web/next.config.ts";
import { composeCsp } from "../../apps/web/lib/csp-compose.mjs";
import { LIVE_ONLY_CHECKS, LIVE_ORIGINS, VERIFIER_STAGES, liveOnlySkips, setAsideUnboundApi, verifyBase } from "./hosted-alpha-stages.mjs";
// Session AE (Part 0b, ADR-027): the verifier's stage list, its live-only classification and its base option. The browser
// half (stages 2 → 6 in this order on one page) is apps/web/tests/hosted-verifier-order.spec.ts.

const egress = JSON.parse(readFileSync(new URL("../../apps/web/lib/egress-policy.json", import.meta.url), "utf8"));
const LOCAL = "http://127.0.0.1:3101";
const PRICE = "Live BTC/USD price through the market coordinator";
const LANDING = "Live landing CTA, safety copy, social links and responsiveness";
afterEach(() => vi.unstubAllGlobals());

test("the stages, in the order the verifier runs them (the owner's numbering)", () => {
  expect(VERIFIER_STAGES.map(stage => [stage.number, stage.key, stage.name])).toEqual([
    [1, "price-and-headers", PRICE],
    [2, "identity", "Live Alpha identity, initial resources and navigation"],
    [3, "goal", "Fictional local create, deposit and withdraw"],
    [4, "backup-diagnostics", "Local backup export/import and live read-only diagnostics"],
    [5, "reload-close", "Reload retention, close empty goal and navigation"],
    [6, "aa-pages", "AA pages: calculator, Life review, Journey, Your data, Reminders and Share open"],
    [7, "landing", LANDING],
    [8, "recipe", "Recipe import refuses http, a private host and an oversized address"],
  ]);
  expect(VERIFIER_STAGES.filter(stage => stage.browser).map(stage => stage.number)).toEqual([2, 3, 4, 5, 6, 7]);
  expect(VERIFIER_STAGES.filter(stage => stage.reportsItself).map(stage => stage.number)).toEqual([1]);
  expect(Object.isFrozen(VERIFIER_STAGES) && VERIFIER_STAGES.every(Object.isFrozen)).toBe(true);
});

// The #43 failure: stage 2 ends on /app/settings and stage 3 began with Today's "+ Quick add". Each browser stage's first
// call on the page must be a goto to the page it needs, before anything else touches the page.
test("every browser stage opens its own page first; stage 3 opens Today", async () => {
  const STOP = Symbol("stop");
  const expected = { 2: `${LOCAL}/app`, 3: `${LOCAL}/app`, 4: `${LOCAL}/app/settings`, 5: `${LOCAL}/app/goals/1`, 6: `${LOCAL}/app/wealth/calculator`, 7: LIVE_ORIGINS.apex };
  for (const stage of VERIFIER_STAGES.filter(s => s.browser)) {
    const calls = [];
    const page = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); throw STOP; } });
    const ctx = { base: LOCAL, live: false, origins: LIVE_ORIGINS, expectedCommit: null, expect: () => { throw Error("expect before goto"); }, report: { stages: [], review: [], layouts: [] }, reviewedVersions: ["v5.1.0"] };
    await expect(stage.run(page, ctx)).rejects.toBe(STOP);
    expect(calls, stage.name).toEqual([["goto", expected[stage.number]]]);
  }
});

test("live only: the landing stage as a whole, and parts of stage 1; the docs name each one", () => {
  expect(VERIFIER_STAGES.filter(stage => stage.liveOnly).map(stage => stage.name)).toEqual([LANDING]);
  expect(LIVE_ONLY_CHECKS.map(check => check.key)).toEqual(["price", "fallback-headers", "apex-headers", "https", "landing", "unbound-api"]);
  expect(liveOnlySkips(LOCAL).map(skip => skip.stage)).toEqual([
    PRICE,
    `${PRICE} (header samples of https://zigoals-alpha.reyals1111.workers.dev/app)`,
    `${PRICE} (header samples of https://zigoals.app/)`,
    `${PRICE} (the /app samples answered over HTTPS)`,
    LANDING,
    "HTTP and console errors: 503 answers of the base's own /api routes",
  ]);
  // An https base answers over HTTPS, so it keeps that check.
  expect(liveOnlySkips("https://preview.example").map(skip => skip.stage)).not.toContain(`${PRICE} (the /app samples answered over HTTPS)`);
  for (const skip of liveOnlySkips(LOCAL)) {
    expect(Object.keys(skip)).toEqual(["stage", "reason"]);
    expect(skip.reason).toMatch(/^live only: /);
    // No security header is skipped: CSP, nonces, Trusted Types and HSTS are checked on a local base too.
    expect(`${skip.stage} ${skip.reason}`).not.toMatch(/CSP|nonce|Trusted Types|HSTS|Strict-Transport/i);
  }
  const docs = readFileSync(new URL("../../docs/deployment/MANUAL_ALPHA_WORKFLOW.md", import.meta.url), "utf8");
  expect(docs).toContain("ZIGOALS_VERIFY_BASE=http://127.0.0.1:3100 node scripts/verify-hosted-alpha.mjs");
  for (const check of LIVE_ONLY_CHECKS) expect(docs).toContain(check.label);
  expect(docs).toContain("LOCAL_BASE_SMOKE");
});

test("ZIGOALS_VERIFY_BASE: unset is the live Alpha; only an https origin or an http loopback origin is accepted", () => {
  expect(verifyBase(undefined)).toEqual({ base: "https://alpha.zigoals.app", live: true });
  expect(verifyBase("")).toEqual({ base: "https://alpha.zigoals.app", live: true });
  for (const [raw, base] of [
    ["http://127.0.0.1:3101", "http://127.0.0.1:3101"], ["http://127.0.0.1:3101/", "http://127.0.0.1:3101"], ["http://localhost:3100", "http://localhost:3100"],
    ["http://[::1]:3101", "http://[::1]:3101"], ["HTTP://LOCALHOST:3101", "http://localhost:3101"], ["https://preview.example", "https://preview.example"],
  ]) expect(verifyBase(raw), raw).toEqual({ base, live: false });
  for (const raw of [
    "http://example.com", "http://192.168.1.20:3101", "http://0.0.0.0:3101", "http://127.0.0.1.nip.io:3101", "ftp://127.0.0.1", "127.0.0.1:3101", "not a url",
    "http://127.0.0.1:3101/app", "http://127.0.0.1:3101/?x=1", "http://127.0.0.1:3101/#top", "http://user:pass@127.0.0.1:3101", "https://preview.example/app",
  ]) expect(() => verifyBase(raw), raw).toThrow(/ZIGOALS_VERIFY_BASE=.* is refused/);
});

test("a local base sets aside only the base's own /api answers of 503 and Chrome's line for each; everything else still counts", () => {
  const failed = () => "Failed to load resource: the server responded with a status of 503 (Service Unavailable)";
  const report = {
    httpErrors: [
      { url: `${LOCAL}/api/push`, status: 503 }, { url: `${LOCAL}/api/private-account?action=status`, status: 503 },
      { url: `${LOCAL}/api/push`, status: 500 }, { url: `${LOCAL}/app/missing`, status: 503 }, { url: "http://localhost:3101/api/push", status: 503 },
      { url: `${LOCAL}/apix`, status: 503 }, { url: "not a url", status: 503 },
    ],
    consoleErrors: [
      { message: failed(), location: { url: `${LOCAL}/api/push` } }, { message: failed(), location: { url: `${LOCAL}/app/missing` } },
      { message: "TypeError: boom", location: { url: `${LOCAL}/api/push` } }, { message: failed() },
    ],
  };
  setAsideUnboundApi(report, LOCAL);
  expect(report.setAside).toEqual({
    httpErrors: [{ url: `${LOCAL}/api/push`, status: 503 }, { url: `${LOCAL}/api/private-account?action=status`, status: 503 }],
    consoleErrors: [{ message: failed(), location: { url: `${LOCAL}/api/push` } }],
  });
  expect(report.httpErrors.map(e => `${e.status} ${e.url}`)).toEqual([`500 ${LOCAL}/api/push`, `503 ${LOCAL}/app/missing`, "503 http://localhost:3101/api/push", `503 ${LOCAL}/apix`, "503 not a url"]);
  expect(report.consoleErrors).toHaveLength(3);
  // The verifier calls it on a local base only; the live run counts every error as before.
  const verifier = readFileSync(new URL("../verify-hosted-alpha.mjs", import.meta.url), "utf8");
  expect(verifier).toContain("if (!live) setAsideUnboundApi(report, alpha);");
});

/** The headers a local `next start` sends on /app: next.config.ts's every-route block and the middleware's CSP and cache. */
const middleware = readFileSync(new URL("../../apps/web/middleware.ts", import.meta.url), "utf8");
async function localAppHeaders() {
  const global = (await nextConfig.headers()).find(rule => rule.source === "/(.*)").headers;
  const cache = /response\.headers\.set\("Cache-Control", "([^"]+)"\)/.exec(middleware)[1];
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  return { ...Object.fromEntries(global.map(h => [h.key.toLowerCase(), h.value])), "content-security-policy": composeCsp(egress, { nonce, https: false, pathname: "/app" }), "cache-control": cache, "x-zigoals-build": "a".repeat(40) };
}
function samplingPage(answer) {
  const asked = [];
  return { asked, page: { context: () => ({ request: { get: async url => { asked.push(url); const { url: answered = url, headers } = await answer(url); return { url: () => answered, status: () => 200, body: async () => Buffer.from("<!doctype html>"), headers: () => headers }; } } }) } };
}
const stage1 = VERIFIER_STAGES[0];
const ctx = (base, live, report) => ({ base, live, origins: LIVE_ORIGINS, expectedCommit: null, report, egressPolicy: egress, reviewedVersions: [] });
const emptyReport = () => ({ stages: [], review: [], layouts: [], responses: [], builds: [] });

test("stage 1 on a local base: no price probe, three /app samples of the base, every header check passes on a local next start's headers", async () => {
  const fetches = []; vi.stubGlobal("fetch", async url => { fetches.push(url); throw Error("no fetch on a local base"); });
  const report = emptyReport(), { asked, page } = samplingPage(async () => ({ headers: await localAppHeaders() }));
  await stage1.run(page, ctx(LOCAL, false, report));
  expect(fetches).toEqual([]);
  expect(asked).toEqual([`${LOCAL}/app`, `${LOCAL}/app`, `${LOCAL}/app`]);
  expect(report.stages).toEqual([{ name: PRICE, status: "SKIPPED" }]);
  expect(report.review).toEqual([]);
  expect(report.freshNonceSamples).toBe(3);
  expect(report.marketProbe).toBeUndefined(); expect(report.policyWindow).toBeUndefined();
});

test("stage 1 on a local base still fails a missing HSTS, a missing Trusted Types and an answer from another origin", async () => {
  for (const [change, reason] of [
    [headers => { delete headers["strict-transport-security"]; }, /sample 1: .*/],
    [headers => { headers["content-security-policy"] = headers["content-security-policy"].replace("; require-trusted-types-for 'script'", ""); }, /Trusted Types must be enforced/],
  ]) {
    const report = emptyReport(), { page } = samplingPage(async () => { const headers = await localAppHeaders(); change(headers); return { headers }; });
    await stage1.run(page, ctx(LOCAL, false, report));
    expect(report.review).toHaveLength(3);
    expect(report.review[0]).toMatch(reason);
  }
  const report = emptyReport(), { page } = samplingPage(async () => ({ url: "http://localhost:3999/app", headers: await localAppHeaders() }));
  await stage1.run(page, ctx(LOCAL, false, report));
  expect(report.review).toHaveLength(3);
});

test("stage 1 live: the price probe first, then 3 Alpha, 2 fallback and 2 apex samples, as before", async () => {
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 503, headers: { "content-type": "application/json" } }));
  const report = emptyReport(), { asked, page } = samplingPage(async () => ({ headers: { ...await localAppHeaders(), "content-security-policy": composeCsp(egress, { nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64"), pathname: "/app" }) } }));
  await stage1.run(page, ctx(LIVE_ORIGINS.alpha, true, report));
  expect(asked).toEqual([...Array(3).fill("https://alpha.zigoals.app/app"), ...Array(2).fill("https://zigoals-alpha.reyals1111.workers.dev/app"), ...Array(2).fill("https://zigoals.app/")]);
  expect(report.stages).toEqual([{ name: PRICE, status: "NEEDS_OWNER_REVIEW" }]);
  expect(report.review).toHaveLength(1);
  expect(report.review[0]).toMatch(/^live prices: /);
  expect(report.policyWindow.text).toMatch(/not reported/);
  expect(report.freshNonceSamples).toBe(5);
});
