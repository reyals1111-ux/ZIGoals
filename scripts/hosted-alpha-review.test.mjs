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
