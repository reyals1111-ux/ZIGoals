import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { existsSync, readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { config, middleware } from "../middleware";
import { expect, test } from "vitest";
import { securityPolicy } from "./security-policy";
import { diagnosticSummary } from "./diagnostic-summary";
test("production policy has per-request unpredictable nonces and exact connection origins", () => {
  const a = securityPolicy(false, true), b = securityPolicy(false, true);
  expect(a.nonce).not.toBe(b.nonce);
  expect(a.nonce).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  expect(a.csp).toContain(`script-src 'self' 'nonce-${a.nonce}' 'strict-dynamic'`);
  expect(a.csp.split(";").find(s=>s.includes("script-src"))).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(a.csp).not.toMatch(/https:;|ws:|\*/);
  expect(a.csp).toContain("connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com");
  expect(a.csp).toContain("frame-ancestors 'none'");
});
test("safe diagnostics whitelist enums and identities, ignoring adversarial and private values", () => {
  const text = diagnosticSummary({ environment: "PUBLIC_ALPHA_UNDEPLOYED", version:"0.1.0", commit:"a".repeat(40), scope:"local", rpc:"healthy", rest:"unavailable", checkedAt:"2026-09-13T12:00:00.000Z", owner:"PRIVATE_ACCOUNT", error:"RAW_ERROR", metadata:"PRIVATE_PLAN" } as Parameters<typeof diagnosticSummary>[0]);
  expect(text).toContain("PUBLIC_ALPHA_UNDEPLOYED");
  expect(text).not.toMatch(/PRIVATE|RAW_ERROR/);
  expect(diagnosticSummary({environment:"<script>secret",version:"secret",commit:"secret",scope:"secret",rpc:"secret",rest:"secret",checkedAt:"secret"})).not.toContain("secret");
});

test("HTTPS middleware overwrites attacker nonce/origin and sends non-cacheable security headers", () => {
  const request = new NextRequest("https://zigoals-alpha.example.workers.dev/app", {headers:{"x-nonce":"attacker", "x-zigoals-origin":"https://attacker.invalid", "content-security-policy":"script-src *"}});
  const response = middleware(request);
  expect(response.headers.get("x-middleware-request-x-zigoals-origin")).toBe("https://zigoals-alpha.example.workers.dev");
  expect(response.headers.get("x-middleware-request-x-nonce")).not.toBe("attacker");
  expect(response.headers.get("Content-Security-Policy")).not.toContain("attacker");
  expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});


test.each(["/icon.svg", "/robots.txt", "/social-card.svg", "/social-card.png", "/_next/static/chunks/app.js", "/_next/image?url=%2Ficon.svg&w=64&q=75"])("known static/image route bypasses nonce middleware: %s", url => {
  expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url})).toBe(false);
});
test.each(["/", "/app", "/app/settings", "/app/goals/123", "/favicon.ico", "/icon.svg/app", "/robots.txt/app", "/social-card.png/app", "/social-cardXpng", "/iconXsvg", "/robotsXtxt", "/_next/staticity", "/_next/image/app", "/icon%2Esvg/app"])("HTML and near-miss paths retain nonce middleware: %s", url => {
  expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url})).toBe(true);
});
test("icon and crawler policy are actual public files, with no competing metadata handlers", () => {
  expect(readFileSync(new URL("../public/icon.svg",import.meta.url),"utf8")).toContain("<svg");
  expect(readFileSync(new URL("../public/robots.txt",import.meta.url),"utf8")).toBe("User-Agent: *\nDisallow: /\n\n");
  expect(existsSync(new URL("../app/robots.ts",import.meta.url))).toBe(false);
  expect(existsSync(new URL("../app/icon.svg",import.meta.url))).toBe(false);
});
