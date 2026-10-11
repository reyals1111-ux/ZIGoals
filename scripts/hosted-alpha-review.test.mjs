import { test, expect } from "vitest";
import { appNonceFindings, priceFinding, reviewReason, hostedStatus } from "./lib/hosted-alpha-review.mjs";
// Session U Part 2b: fixture shapes for scripts/verify-hosted-alpha.mjs. Header values are synthetic.

const appCsp = nonce => `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'`;
const landingCsp = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; object-src 'none'";
const response = (url, sample, headers) => ({ url, sample, status: 200, headers });

test("the crashing shape: the apex landing's nonce-less CSP is ignored, the /app nonces are read", () => {
  const responses = [
    response("https://alpha.zigoals.app/app", 1, { "content-security-policy": appCsp("bm9uY2Ux") }),
    response("https://alpha.zigoals.app/app", 2, { "content-security-policy": appCsp("bm9uY2Uy") }),
    response("https://zigoals-alpha.example.workers.dev/app", 1, { "content-security-policy": appCsp("bm9uY2Uz") }),
    response("https://zigoals.app/", 1, { "content-security-policy": landingCsp }),
    response("https://zigoals.app/", 2, { "content-security-policy": landingCsp }),
  ];
  // What the old line did, for the record: it threw on the landing response.
  expect(() => responses.filter(r => r.headers["content-security-policy"]).map(r => r.headers["content-security-policy"].match(/'nonce-([^']+)'/)[1])).toThrow(TypeError);
  expect(appNonceFindings(responses)).toEqual({ nonces: ["bm9uY2Ux", "bm9uY2Uy", "bm9uY2Uz"], findings: [] });
});

test("a missing CSP, a nonce-less /app CSP, a repeated nonce and an unparseable URL are reasons, never exceptions", () => {
  const responses = [
    response("https://alpha.zigoals.app/app", 1, {}),
    response("https://alpha.zigoals.app/app", 2, { "content-security-policy": landingCsp }),
    response("https://alpha.zigoals.app/app", 3, { "content-security-policy": appCsp("c2FtZQ==") }),
    response("https://zigoals-alpha.example.workers.dev/app", 1, { "content-security-policy": appCsp("c2FtZQ==") }),
    response("not a url", 1, { "content-security-policy": appCsp("aWdub3JlZA==") }),
    { url: "https://alpha.zigoals.app/app", sample: 4 },
  ];
  expect(appNonceFindings(responses)).toEqual({
    nonces: ["c2FtZQ==", "c2FtZQ=="],
    findings: [
      "https://alpha.zigoals.app/app sample 1: no CSP script nonce",
      "https://alpha.zigoals.app/app sample 2: no CSP script nonce",
      "https://alpha.zigoals.app/app sample 4: no CSP script nonce",
      "a CSP script nonce repeated across /app samples",
    ],
  });
  expect(appNonceFindings([])).toEqual({ nonces: [], findings: [] });
});

test("live prices: VERIFIED passes; UNAVAILABLE, MALFORMED and a missing probe are review reasons with closed fields only", () => {
  expect(priceFinding({ wellFormed: true, result: "VERIFIED", pair: "VERIFIED_FRESH", failure: null })).toBeUndefined();
  expect(priceFinding({ wellFormed: true, result: "UNAVAILABLE", pair: "PROVIDER_UNAVAILABLE", failure: "UNKNOWN" }))
    .toBe("live prices: UNAVAILABLE (PROVIDER_UNAVAILABLE, UNKNOWN); see docs/run11/ALPHA_PRICES_ROLLOUT.md");
  expect(priceFinding({ wellFormed: false, result: "MALFORMED", reason: "envelope" }))
    .toBe("live prices: the market route did not answer a well-formed price envelope (envelope)");
  expect(priceFinding(undefined)).toBe("live prices: the market route did not answer a well-formed price envelope (no answer)");
});

test("a thrown check becomes one bounded line; the status is PASS only with nothing to review or report", () => {
  expect(reviewReason("https://alpha.zigoals.app/app sample 1", new TypeError("Cannot read properties of undefined (reading 'split')")))
    .toBe("https://alpha.zigoals.app/app sample 1: Cannot read properties of undefined (reading 'split')");
  expect(reviewReason("x", "line one\n  line two")).toBe("x: line one line two");
  expect(reviewReason("x", new Error("y".repeat(400)))).toHaveLength(300);
  const clean = { review: [], consoleErrors: [], failedRequests: [], layouts: [{ pass: true }] };
  expect(hostedStatus(clean)).toBe("PASS");
  expect(hostedStatus({ ...clean, layouts: [{ pass: false }] })).toBe("COMPLETED_WITH_FINDINGS");
  expect(hostedStatus({ ...clean, consoleErrors: [{}], review: ["live prices: UNAVAILABLE"] })).toBe("NEEDS_OWNER_REVIEW");
});

// Session Z-Cloud Part 1: the owner's run on #34 (2026-10-10) reported FAIL at Connection diagnostics while the page showed
// "Verified zig-test-2 · azig · 18 decimals · v5.1.2". Playwright's toContainText reads the panel's textContent, where the
// REST row's last word runs straight into the next row's term, so the old `\b` found no boundary.
test("the REST row is found in the panel's textContent, where the version runs into \"Goal Manager\"", async () => {
  const { REVIEWED_TESTNET_VERSIONS, TESTNET } = await import("../packages/chain-config/src/index.ts");
  const { reviewedRestPattern } = await import("./lib/hosted-alpha-review.mjs");
  const pattern = reviewedRestPattern(REVIEWED_TESTNET_VERSIONS);
  // The REST <div> and the Goal Manager <div> as textContent: <dt>, <dd> (address, <br>, detail), then the next <dt>.
  const panelText = `RPC${TESTNET.rpcUrl}Verified zig-test-2REST${TESTNET.restUrl}Verified zig-test-2 · azig · 18 decimals · v5.1.2Goal ManagerNOT DEPLOYED`;
  expect(panelText).toContain("Verified zig-test-2 · azig · 18 decimals · v5.1.2Goal Manager");
  expect(new RegExp(`Verified zig-test-2 · azig · 18 decimals · (?:${REVIEWED_TESTNET_VERSIONS.map(v => v.replaceAll(".", "\\.")).join("|")})\\b`).test(panelText)).toBe(false); // the old pattern, for the record
  expect(pattern.test(panelText)).toBe(true);
  for (const version of REVIEWED_TESTNET_VERSIONS) {
    expect(pattern.test(`Verified zig-test-2 · azig · 18 decimals · ${version}`)).toBe(true);
    expect(pattern.test(`Verified zig-test-2 · azig · 18 decimals · ${version}\nGoal Manager`)).toBe(true);
    expect(pattern.test(`Verified zig-test-2 · azig · 18 decimals · ${version}Goal Manager`)).toBe(true);
  }
  // A version that is not reviewed still fails: a longer patch number, a fourth part, another minor or a missing version.
  for (const unreviewed of ["v5.1.20", "v5.1.2.1", "v5.1.3", "v5.10.0", "v5.1", ""]) expect(pattern.test(`Verified zig-test-2 · azig · 18 decimals · ${unreviewed}Goal Manager`)).toBe(false);
  expect(pattern.test("Verified zig-test-2 · uzig · 6 decimals · v5.1.2")).toBe(false);
});
