import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  assertDispatch, assertSource, assertBuild, assertEnvironment, assertAlphaConfig,
  currentDeployment, deployedVersion, performDeployment,
} from "./lib/alpha-deployment.mjs";
import { assertHtml, smokeAlpha } from "./lib/alpha-smoke.mjs";

const sha = "a".repeat(40);
const oldVersion = "af45987b-f792-4755-a9e6-f58bb49f0cfe";
const newVersion = "dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80";
const oldDeployment = "11111111-1111-4111-8111-111111111111";
const newDeployment = "22222222-2222-4222-8222-222222222222";
const dispatch = () => ({
  GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REPOSITORY: "reyals1111-ux/ZIGoals",
  GITHUB_ACTOR: "reyals1111-ux", GITHUB_TRIGGERING_ACTOR: "reyals1111-ux",
  GITHUB_REF: "refs/heads/main", GITHUB_SHA: sha, GITHUB_RUN_ATTEMPT: "1",
  EXPECTED_COMMIT: sha, OWNER_APPROVAL: "true",
});
const source = () => ({ expected: sha, dispatched: sha, remote: sha, head: sha, dirty: "", node: "v24.19.0", pnpm: "11.19.0" });
const build = () => ({ environment: "PUBLIC_ALPHA_UNDEPLOYED", version: "0.1.0", commit: sha, dirty: false });
const environment = () => ({
  name: "alpha", can_admins_bypass: false,
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  protection_rules: [{ type: "required_reviewers", prevent_self_review: false, reviewers: [{ type: "User", reviewer: { login: "reyals1111-ux" } }] }],
});
const policies = () => ({ total_count: 1, branch_policies: [{ name: "main", type: "branch" }] });
const deployment = (id = oldDeployment, version = oldVersion) => ({ id, strategy: "percentage", versions: [{ version_id: version, percentage: 100 }] });
const envelope = (entries = [deployment()]) => ({ success: true, result: { deployments: entries } });
const output = (version = newVersion) => JSON.stringify({ type: "deploy", version: 1, worker_name: "zigoals-alpha", version_id: version });

test("only a fresh explicit owner dispatch of the full main SHA is authorized", () => {
  expect(() => assertDispatch(dispatch())).not.toThrow();
});
test.each([
  ["GITHUB_EVENT_NAME", "push"], ["GITHUB_REPOSITORY", "fork/ZIGoals"],
  ["GITHUB_ACTOR", "collaborator"], ["GITHUB_TRIGGERING_ACTOR", "collaborator"],
  ["GITHUB_REF", "refs/tags/main"], ["GITHUB_RUN_ATTEMPT", "2"],
  ["EXPECTED_COMMIT", "aaaaaaa"], ["EXPECTED_COMMIT", "b".repeat(40)],
  ["OWNER_APPROVAL", "false"], ["OWNER_APPROVAL", ""],
])("rejects unsafe dispatch %s=%s", (key, value) => {
  expect(() => assertDispatch({ ...dispatch(), [key]: value })).toThrow();
});
test.each([
  ["remote", "b".repeat(40)], ["dispatched", "b".repeat(40)], ["head", "b".repeat(40)],
  ["dirty", "?? surprise.mjs"], ["node", "v22.23.1"], ["pnpm", "11.18.0"], ["expected", ""],
])("exact-source gate rejects %s drift", (key, value) => {
  expect(() => assertSource({ ...source(), [key]: value })).toThrow();
});
test("clean pinned source and matching Alpha identity pass", () => {
  assertSource(source());
  assertBuild(build(), sha, "0.1.0");
});
test.each([
  ["commit", "b".repeat(40)], ["dirty", true], ["dirty", "false"],
  ["environment", "TESTNET_DEPLOYED"], ["version", "0.2.0"],
])("build identity rejects %s drift", (key, value) => {
  expect(() => assertBuild({ ...build(), [key]: value }, sha, "0.1.0")).toThrow();
});
test("owner-only environment approval and an exact main branch policy pass", () => {
  assertEnvironment(environment(), policies());
});
test.each([
  env => { env.protection_rules = []; },
  env => { env.can_admins_bypass = true; },
  env => { env.protection_rules[0].prevent_self_review = true; },
  env => { env.protection_rules[0].reviewers.push({ type: "User", reviewer: { login: "someone-else" } }); },
  env => { env.deployment_branch_policy = null; },
])("rejects missing or weakened owner environment protection %#", mutate => {
  const env = environment(); mutate(env);
  expect(() => assertEnvironment(env, policies())).toThrow();
});
test.each([
  { total_count: 0, branch_policies: [] },
  { total_count: 1, branch_policies: [{ name: "*", type: "branch" }] },
  { total_count: 1, branch_policies: [{ name: "main", type: "tag" }] },
  { total_count: 2, branch_policies: [{ name: "main", type: "branch" }] },
])("rejects broad, tag or incomplete environment branch policy %#", value => {
  expect(() => assertEnvironment(environment(), value)).toThrow();
});
const alphaConfig = () => JSON.parse(readFileSync(new URL("../apps/web/wrangler.alpha.jsonc", import.meta.url)));
test("the reviewed Alpha configuration is accepted", () => assertAlphaConfig(alphaConfig()));
test.each([
  c => { c.name = "zigoals"; }, c => { c.route = "alpha.zigoals.app/*"; },
  c => { c.routes = []; }, c => { c.env = { production: {} }; },
  c => { c.build = { command: "unexpected-command" }; }, c => { c.r2_buckets = []; },
  c => { c.vars = { NEXT_PUBLIC_APP_ENVIRONMENT: "TESTNET_DEPLOYED" }; },
  c => { c.services[0].service = "zigoals"; }, c => { c.limits.cpu_ms = 30000; },
  c => { c.assets.run_worker_first = true; }, c => { c.observability.enabled = true; },
])("manual publishing rejects target, route, resource or policy drift %#", mutate => {
  const config = alphaConfig(); mutate(config);
  expect(() => assertAlphaConfig(config)).toThrow();
});
test("Cloudflare's first deployment is current, regardless of older entries", () => {
  expect(currentDeployment(envelope([deployment(), deployment(newDeployment, newVersion)])))
    .toEqual({ deploymentId: oldDeployment, versionId: oldVersion });
});
test.each([
  { success: false, result: { deployments: [deployment()] } }, {}, envelope([]),
  envelope([{ ...deployment(), id: "not-a-uuid" }]),
  envelope([{ ...deployment(), versions: [{ version_id: oldVersion, percentage: 50 }, { version_id: newVersion, percentage: 50 }] }]),
  envelope([{ ...deployment(), versions: [{ version_id: oldVersion, percentage: "100" }] }]),
])("refuses absent, malformed or split-traffic rollback state %#", value => {
  expect(() => currentDeployment(value)).toThrow();
});
test("deployment identity comes from the pinned Wrangler structured output", () => {
  expect(deployedVersion(output())).toBe(newVersion);
});
test.each(["", "Current Version ID: " + newVersion, output() + "\n" + output(), output().replace("zigoals-alpha", "zigoals"), output().replace(newVersion, "bad")])(
  "rejects missing, duplicate or wrong-target Wrangler output %#", value => expect(() => deployedVersion(value)).toThrow(),
);

function runtime({ fail, stateChange = false, cliCode = 0, wrangler = output() } = {}) {
  const calls = []; const reports = []; let liveReads = 0;
  return {
    calls, reports,
    io: {
      checkSource: async () => { calls.push("source"); if (fail === "source") throw Error("main moved"); },
      current: async () => {
        calls.push("current"); liveReads++;
        const changed = (stateChange && liveReads === 1) || liveReads > 1;
        return { deploymentId: changed ? newDeployment : oldDeployment, versionId: changed ? newVersion : oldVersion };
      },
      publish: async () => { calls.push("publish"); return { code: cliCode, output: wrangler }; },
      smoke: async () => { calls.push("smoke"); if (fail === "smoke") throw Error("bad CSP"); return [{ status: 200 }]; },
      save: report => { reports.push(structuredClone(report)); },
    },
  };
}
const rollback = () => ({ deploymentId: oldDeployment, versionId: oldVersion });
test("deploys once, verifies emitted version at 100%, smokes, then checks live state again", async () => {
  const r = runtime();
  const report = await performDeployment(rollback(), r.io);
  expect(r.calls).toEqual(["source", "current", "source", "publish", "current", "smoke", "current"]);
  expect(report).toMatchObject({ status: "VERIFIED", rollbackVersionId: oldVersion, newVersionId: newVersion });
});
test.each([{ fail: "source" }, { stateChange: true }])("does not publish after source or rollback drift %#", async options => {
  const r = runtime(options);
  await expect(performDeployment(rollback(), r.io)).rejects.toThrow();
  expect(r.calls).not.toContain("publish");
  expect(r.reports.at(-1)).toMatchObject({ status: "NOT_DEPLOYED", rollbackVersionId: oldVersion });
});
test.each([{ cliCode: 1 }, { fail: "smoke" }, { wrangler: "" }])("retains rollback and flags uncertainty after mutation failure %#", async options => {
  const r = runtime(options);
  await expect(performDeployment(rollback(), r.io)).rejects.toThrow();
  expect(r.calls.filter(call => call === "publish")).toHaveLength(1);
  expect(r.reports.at(-1)).toMatchObject({ status: "NEEDS_OWNER_REVIEW", rollbackVersionId: oldVersion });
  expect(r.calls).not.toContain("rollback");
});
test("a different live version cannot be reported as this run's deployment", async () => {
  const r = runtime();
  r.io.current = async () => rollback();
  await expect(performDeployment(rollback(), r.io)).rejects.toThrow(/version/);
});

function htmlResponse(nonce = "A".repeat(43) + "=") {
  return new Response(`<html>Turn today Local Demo PUBLIC_ALPHA_UNDEPLOYED ${sha}<script nonce="${nonce}">x()</script></html>`, { headers: {
    "content-type": "text/html", "cache-control": "private, no-store, max-age=0",
    "content-security-policy": `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; frame-src 'none'; form-action 'self'; upgrade-insecure-requests`,
    "strict-transport-security": "max-age=31536000, max-age=31536000",
    "x-frame-options": "DENY", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow, noarchive, noindex, nofollow, noarchive",
    "referrer-policy": "no-referrer", "permissions-policy": "camera=(), microphone=(), geolocation=()",
  } });
}
test("smoke accepts strong nonce security and existing duplicate HSTS/robots values", async () => {
  const response = htmlResponse();
  expect(assertHtml(response, await response.text())).toBe("A".repeat(43) + "=");
});
test.each([
  ["content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'", /CSP/],
  ["cache-control", "public, max-age=3600", /private/], ["x-frame-options", "SAMEORIGIN", /Frame denial/],
  ["x-content-type-options", "", /nosniff/], ["strict-transport-security", "max-age=0", /HSTS/],
  ["x-robots-tag", "index", /Robots/], ["referrer-policy", "origin", /Referrer/], ["permissions-policy", "", /permissions/],
])("smoke rejects weakened %s", async (key, value, error) => {
  const response = htmlResponse(); response.headers.set(key, value);
  const html = await response.text();
  expect(() => assertHtml(response, html)).toThrow(error);
});
test.each([
  csp => `script-src * 'unsafe-inline'; ${csp}`,
  csp => `SCRIPT-SRC * 'unsafe-inline'; ${csp}`,
  csp => `${csp}; script-src-elem * 'unsafe-inline'`,
  csp => `${csp}; script-src-attr 'unsafe-inline'`,
  csp => csp.replace("font-src 'self'", "font-src *"),
])("smoke rejects duplicate, overriding or weakened CSP directives %#", async mutate => {
  const response = htmlResponse();
  response.headers.set("content-security-policy", mutate(response.headers.get("content-security-policy")));
  const html = await response.text();
  expect(() => assertHtml(response, html)).toThrow(/CSP/);
});
test("smoke rejects nonce mismatch and redirects", async () => {
  const response = htmlResponse();
  expect(() => assertHtml(response, '<script nonce="wrong">x()</script>')).toThrow();
  expect(() => assertHtml(new Response("", { status: 302 }), "")).toThrow();
});
test("smoke visits only Alpha, checks all routes and fresh nonces, and never sends credentials", async () => {
  const calls = []; let count = 0;
  const checks = await smokeAlpha({ expectedCommit: sha, fetcher: async (url, options) => {
    calls.push({ url, options }); return htmlResponse((count++ === 0 ? "A" : "B").repeat(43) + "=");
  } });
  expect(checks).toHaveLength(9);
  expect(calls.map(c => new URL(c.url).pathname)).toEqual(["/app", "/app/habits", "/app/health", "/app/goals", "/app/goals/new", "/app/activity", "/app/ecosystem", "/app/settings", "/app"]);
  for (const { url, options } of calls) {
    expect(new URL(url).origin).toBe("https://alpha.zigoals.app");
    expect(options.redirect).toBe("manual");
    expect(new Headers(options.headers).has("authorization")).toBe(false);
  }
});
test("smoke rejects stale deployed source and reused response nonces", async () => {
  await expect(smokeAlpha({ expectedCommit: "b".repeat(40), fetcher: async () => htmlResponse() })).rejects.toThrow();
  await expect(smokeAlpha({ expectedCommit: sha, fetcher: async () => htmlResponse() })).rejects.toThrow(/nonce/);
});
