import { expect, test } from "vitest";
import { ALPHA_ROUTES, FIRST_RUN_NOTICE, assertFirstRunNotice, smokeAlpha } from "./alpha-smoke.mjs";
import { securityPolicy } from "../../apps/web/lib/security-policy.ts";
import egress from "../../apps/web/lib/egress-policy.json" with { type: "json" };

// Session AL (TIER 3, deploy smoke): run 56 (Alpha #53) failed on the old /Local [Dd]emo/ check after Session AK's R2
// renamed the default mode. The first route is now held to the first-run Alpha notice the server renders on a fresh visit.
const sha = "c".repeat(40);
// The notice as React renders it on the server (components/shell/alpha-notice.tsx) for a device that never chose the chain.
const NOTICE = `<aside class="alpha-notice" aria-label="Alpha notice"><span class="alpha-notice-dot" aria-hidden="true"></span><p><strong>PUBLIC ALPHA</strong> <span>${FIRST_RUN_NOTICE}</span> <a class="text-link" href="/app/help#help-z-about">More</a></p><button type="button" class="alpha-notice-close" aria-label="Close this notice">×</button></aside>`;
// Live #52's notice: the staking sentence before the same facts sentence (the rollback capture reads it).
const NOTICE_52 = `<aside class="alpha-notice" aria-label="Alpha notice"><p><strong>PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN</strong> <span>Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys. ${FIRST_RUN_NOTICE}</span></p></aside>`;

function page(body, nonce, path) {
  return new Response(`<html><body>${body}<h1>YOUR FINANCIAL ORBIT</h1> On this device PUBLIC_ALPHA_UNDEPLOYED ${sha}<script nonce="${nonce}">x()</script></body></html>`, { headers: {
    "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store, max-age=0",
    "content-security-policy": securityPolicy(false, true).csp.replace(/'nonce-[^']+'/, `'nonce-${nonce}'`),
    "strict-transport-security": "max-age=31536000", "cross-origin-opener-policy": "same-origin",
    "x-frame-options": "DENY", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow, noarchive",
    "referrer-policy": "no-referrer", "permissions-policy": path === "/app/health" ? egress.permissionsPolicy.health : egress.permissionsPolicy.app,
    "x-zigoals-build": sha,
  } });
}
const fetcherWith = body => { let count = 0; return async url => page(body, (count++ === 0 ? "A" : "B").repeat(43) + "=", new URL(url).pathname); };

test("the post-upload smoke passes on the current first-run markup (no \"Local demo\" anywhere)", async () => {
  const checks = await smokeAlpha({ expectedCommit: sha, fetcher: fetcherWith(NOTICE) });
  expect(checks).toHaveLength(ALPHA_ROUTES.length + 1);
  expect(checks.every(check => check.security === "PASS")).toBe(true);
});
test("the rollback capture passes on live #52's notice too", async () => {
  expect(await smokeAlpha({ baseline: true, fetcher: fetcherWith(NOTICE_52) })).toHaveLength(ALPHA_ROUTES.length + 1);
});
test("the smoke fails when the first-run wording is missing, even with the old \"Local demo\" label", async () => {
  await expect(smokeAlpha({ expectedCommit: sha, fetcher: fetcherWith("Local demo") })).rejects.toThrow(/First-run Alpha notice missing/);
  await expect(smokeAlpha({ baseline: true, fetcher: fetcherWith("") })).rejects.toThrow(/First-run Alpha notice missing/);
});
test("the sentence must be inside the Alpha notice, not elsewhere on the page", () => {
  expect(() => assertFirstRunNotice(NOTICE)).not.toThrow();
  expect(() => assertFirstRunNotice(`<aside aria-label="Alpha notice"><p>PUBLIC ALPHA</p></aside><p>${FIRST_RUN_NOTICE}</p>`)).toThrow(/First-run Alpha notice missing/);
  expect(() => assertFirstRunNotice(`<aside aria-label="Something else">${FIRST_RUN_NOTICE}</aside>`)).toThrow(/First-run Alpha notice missing/);
  // A notice whose sentence changed (the Keplr mode's words) is not the fresh first visit.
  expect(() => assertFirstRunNotice('<aside aria-label="Alpha notice">Connection only · financial actions unavailable · your records stay in this browser.</aside>')).toThrow(/First-run Alpha notice missing/);
});
