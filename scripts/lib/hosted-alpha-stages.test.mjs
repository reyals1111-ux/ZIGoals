import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import nextConfig from "../../apps/web/next.config.ts";
import { composeCsp } from "../../apps/web/lib/csp-compose.mjs";
import { LIVE_ONLY_CHECKS, LIVE_ORIGINS, NAVIGATION_WINDOW_MS, NOT_CONFIGURED_ANSWERS, VERIFIER_STAGES, classifyFailedRequests, isRscRequest, liveOnlySkips, setAsideNotConfigured, setAsideUnboundApi, verifyBase } from "./hosted-alpha-stages.mjs";
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
    [10, "checklist", "Checklist: a fictional favourite habit ticks its own record, and Undo restores it"],
  ]);
  expect(VERIFIER_STAGES.filter(stage => stage.browser).map(stage => stage.number)).toEqual([2, 3, 4, 5, 6, 7, 10]);
  expect(VERIFIER_STAGES.filter(stage => stage.reportsItself).map(stage => stage.number)).toEqual([1]);
  expect(Object.isFrozen(VERIFIER_STAGES) && VERIFIER_STAGES.every(Object.isFrozen)).toBe(true);
});

// The #43 failure: stage 2 ends on /app/settings and stage 3 began with Today's "+ Quick add". Each browser stage's first
// call on the page must be a goto to the page it needs, before anything else touches the page.
test("every browser stage opens its own page first; stage 3 opens Today", async () => {
  const STOP = Symbol("stop");
  const expected = { 2: `${LOCAL}/app`, 3: `${LOCAL}/app`, 4: `${LOCAL}/app/settings`, 5: `${LOCAL}/app/goals/1`, 6: `${LOCAL}/app/wealth/calculator`, 7: LIVE_ORIGINS.apex, 10: `${LOCAL}/app/habits` };
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

// Session AF Part 11 A2 (ADR-028 H70): the owner's run on Alpha #44 passed every stage and ended FAIL only on these.
test("A2: exactly the two designed 'not configured' answers become named, counted items on a live base; every near miss still counts", () => {
  const ALPHA = LIVE_ORIGINS.alpha;
  const push = JSON.stringify({ error: "PUSH_UNAVAILABLE", message: "Reminders while ZIGoals is closed are not available in this build." });
  const account = JSON.stringify({ error: "HOSTED_CONFIGURATION_REQUIRED", message: "Email and encrypted sync have not been configured. Local records remain available." });
  const failed = "Failed to load resource: the server responded with a status of 503 ()";
  const e = (url, status) => ({ url, status });
  const rows = [
    [e(`${ALPHA}/api/push`, 503), { method: "GET", body: push }],                                         // designed
    [e(`${ALPHA}/api/private-account?action=status`, 503), { method: "GET", body: account }],           // designed
    [e(`${ALPHA}/api/push`, 503), { method: "GET", body: push }],                                         // designed (again)
    [e(`${ALPHA}/api/push`, 503), { method: "GET", body: account }],                                      // wrong body
    [e(`${ALPHA}/api/push`, 503), { method: "GET", body: JSON.stringify({ error: "PUSH_UNAVAILABLE" }) }], // body missing the message
    [e(`${ALPHA}/api/push`, 503), { method: "GET", body: push.replace("}", ',"extra":1}') }],             // an extra field
    [e(`${ALPHA}/api/push`, 503), { method: "POST", body: push }],                                        // wrong method
    [e(`${ALPHA}/api/push`, 500), { method: "GET", body: push }],                                         // wrong status
    [e(`${ALPHA}/api/private-account?action=other`, 503), { method: "GET", body: account }],            // wrong query
    [e(`${ALPHA}/api/private-account`, 503), { method: "GET", body: account }],                         // no query
    [e(`${LIVE_ORIGINS.fallback}/api/push`, 503), { method: "GET", body: push }],                         // another origin
    [e(`${ALPHA}/api/push`, 503), { method: "GET" }],                                                     // body unread: fail closed
    [e(`${ALPHA}/api/push`, 503), { method: "GET", body: "not json" }],
  ];
  const map = new Map(rows);
  const report = {
    httpErrors: rows.map(([entry]) => entry),
    consoleErrors: [
      { message: failed, location: { url: `${ALPHA}/api/push` } }, { message: failed, location: { url: `${ALPHA}/api/private-account?action=status` } },
      { message: failed, location: { url: `${ALPHA}/api/private-account?action=other` } }, { message: "TypeError: boom", location: { url: `${ALPHA}/api/push` } },
    ],
  };
  setAsideNotConfigured(report, ALPHA, entry => map.get(entry));
  expect(report.notConfigured.count).toBe(3);
  expect(report.notConfigured.answers).toEqual([
    { url: `${ALPHA}/api/push`, status: 503, error: "PUSH_UNAVAILABLE" },
    { url: `${ALPHA}/api/private-account?action=status`, status: 503, error: "HOSTED_CONFIGURATION_REQUIRED" },
    { url: `${ALPHA}/api/push`, status: 503, error: "PUSH_UNAVAILABLE" },
  ]);
  expect(report.notConfigured.consoleErrors).toHaveLength(2);
  expect(report.httpErrors).toHaveLength(rows.length - 3);
  expect(report.consoleErrors.map(c => c.location.url)).toEqual([`${ALPHA}/api/private-account?action=other`, `${ALPHA}/api/push`]);
  // The bodies are the routes' own exported answers, not copies that could drift.
  const pushRoute = readFileSync(new URL("../../apps/web/lib/server/push-route.ts", import.meta.url), "utf8");
  const accountRoute = readFileSync(new URL("../../apps/web/lib/server/private-account.ts", import.meta.url), "utf8");
  for (const answer of NOT_CONFIGURED_ANSWERS) {
    const source = answer.path === "/api/push" ? pushRoute : accountRoute;
    expect(source).toContain(`error:'${answer.body.error}',message:'${answer.body.message}'`);
  }
  // The verifier reads every error body, then sets the designed answers aside on every base (live included).
  const verifier = readFileSync(new URL("../verify-hosted-alpha.mjs", import.meta.url), "utf8");
  expect(verifier).toContain("setAsideNotConfigured(report, alpha, entry => answers.get(entry));");
  expect(verifier.indexOf("setAsideNotConfigured(report")).toBeLessThan(verifier.indexOf("assert.deepEqual(report.pageErrors,[]); assert.deepEqual(report.httpErrors,[]);"));
});

test("A3: requests the verifier's own navigations abort are a count; a real failed request still counts", () => {
  const nav = 10_000;
  const r = (url, errorText, at, rsc) => ({ url, failure: { errorText }, at, rsc });
  const report = { failedRequests: [
    r("https://alpha.zigoals.app/app/activity?_rsc=abc", "net::ERR_ABORTED", 50_000, true),           // prefetch, any time
    r("https://alpha.zigoals.app/api/private-account?action=status", "net::ERR_ABORTED", nav + 900, false), // cut off by a goto
    r("https://alpha.zigoals.app/api/push", "net::ERR_ABORTED", nav - NAVIGATION_WINDOW_MS, false),  // the window's edge
    r("https://alpha.zigoals.app/api/push", "net::ERR_ABORTED", nav + NAVIGATION_WINDOW_MS + 1, false), // outside: counts
    r("https://alpha.zigoals.app/app?_rsc=x", "net::ERR_FAILED", nav, true),                           // not an abort: counts
    r("https://alpha.zigoals.app/_next/static/chunk.js", "net::ERR_CONNECTION_RESET", nav, false),      // counts
    { url: "https://alpha.zigoals.app/x", failure: null, at: nav, rsc: false },                       // no failure text: counts
  ] };
  classifyFailedRequests(report, [nav]);
  expect(report.abortedByNavigation).toEqual({ count: 3, urls: [
    "https://alpha.zigoals.app/app/activity?_rsc=abc", "https://alpha.zigoals.app/api/private-account?action=status", "https://alpha.zigoals.app/api/push",
  ] });
  expect(report.failedRequests).toHaveLength(4);
  expect(isRscRequest("https://alpha.zigoals.app/app?_rsc=1")).toBe(true);
  expect(isRscRequest("https://alpha.zigoals.app/app", { "next-router-prefetch": "1" })).toBe(true);
  expect(isRscRequest("https://alpha.zigoals.app/app", { rsc: "1" })).toBe(true);
  expect(isRscRequest("https://alpha.zigoals.app/api/push", {})).toBe(false);
  expect(isRscRequest("not a url", {})).toBe(false);
  const verifier = readFileSync(new URL("../verify-hosted-alpha.mjs", import.meta.url), "utf8");
  expect(verifier).toContain("classifyFailedRequests(report, navigations);");
  expect(verifier.indexOf("classifyFailedRequests(report, navigations);")).toBeLessThan(verifier.indexOf("report.status=hostedStatus(report);"));
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
