import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { existsSync, readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { config, middleware } from "../middleware";
import { expect, test } from "vitest";
import { CONNECT_SOURCES, securityPolicy } from "./security-policy";
import egress from "./egress-policy.json";
import nextConfig from "../next.config";
import { diagnosticSummary } from "./diagnostic-summary";
test("production policy has per-request unpredictable nonces and exact connection origins", () => {
  const a = securityPolicy(false, true), b = securityPolicy(false, true);
  expect(a.nonce).not.toBe(b.nonce);
  expect(a.nonce).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  expect(a.csp).toContain(`script-src 'self' 'nonce-${a.nonce}' 'strict-dynamic'`);
  expect(a.csp.split(";").find(s=>s.includes("script-src"))).not.toMatch(/unsafe-inline|unsafe-eval/);
  // No scheme source, no bare wildcard and no websocket anywhere in production. The one wildcard shape allowed is the
  // port of the two loopback names (http://localhost:*, http://127.0.0.1:*) for a local model (ADR-012).
  for (const directive of a.csp.split(";")) {
    const sources = directive.trim().split(/\s+/).slice(1);
    expect(sources, directive).not.toContain("*"); expect(sources, directive).not.toContain("https:"); expect(sources.some(s => /^wss?:/.test(s)), directive).toBe(false);
    for (const source of sources.filter(s => s.includes("*"))) expect(egress.localModelSources, directive).toContain(source);
  }
  // connect-src comes from one data file: self, the two Testnet endpoints, the AI providers a person may connect (their
  // own key, browser-direct), and the loopback names. Exactly these, in this order, and nothing else.
  expect(a.csp).toContain(`connect-src ${CONNECT_SOURCES.join(" ")}`);
  expect(CONNECT_SOURCES).toEqual(["'self'", "https://testnet-api.zigchain.com", "https://testnet-rpc.zigchain.com", "https://api.openai.com", "https://api.anthropic.com", "https://generativelanguage.googleapis.com", "https://api.x.ai", "https://openrouter.ai", "http://localhost:*", "http://127.0.0.1:*"]);
  for (const origin of Object.values(egress.aiProviderOrigins)) expect(origin).toMatch(/^https:\/\/[a-z0-9.-]+$/);
  expect(a.csp).toContain("frame-ancestors 'none'");
  expect(a.csp).toContain("worker-src 'self'");
});
test("Permissions-Policy: denied everywhere, the microphone on the app's own pages, the camera only on Health; the entries are ordered so the last match wins", async () => {
  // Session W Part 8: Web Bluetooth (heart-rate monitors, scales) only on Health; denied on every other document.
  expect(egress.permissionsPolicy).toEqual({ global: "camera=(), microphone=(), geolocation=(), bluetooth=()", app: "camera=(), microphone=(self), geolocation=(), bluetooth=()", health: "camera=(self), microphone=(self), geolocation=(), bluetooth=(self)" });
  const entries = await nextConfig.headers!();
  const permission = (source: string) => entries.find(e => e.source === source)?.headers.find(h => h.key === "Permissions-Policy")?.value;
  expect(permission("/(.*)")).toBe(egress.permissionsPolicy.global);
  expect(permission("/app/:path*")).toBe(egress.permissionsPolicy.app);
  expect(permission("/app/health")).toBe(egress.permissionsPolicy.health);
  const order = entries.map(e => e.source);
  expect(order.indexOf("/(.*)")).toBeLessThan(order.indexOf("/app/:path*")); expect(order.indexOf("/app/:path*")).toBeLessThan(order.indexOf("/app/health"));
  // Nothing else grants a permission, and no entry uses a wildcard allowlist.
  for (const entry of entries) for (const header of entry.headers) if (header.key === "Permissions-Policy") expect(header.value).not.toMatch(/=\*|=\(\s*"/);
});
test("the push service worker is push-only: no fetch handler, no cache, no writes, no imported scripts; it only reads the opted-in names table", () => {
  const worker = readFileSync(new URL("../public/push-sw.js", import.meta.url), "utf8");
  expect(worker).toContain("addEventListener('push'");
  expect(worker).toContain("addEventListener('notificationclick'");
  expect(worker).not.toMatch(/addEventListener\(\s*['"]fetch['"]|importScripts|caches\b|localStorage|sessionStorage|XMLHttpRequest|\bfetch\(/);
  // Assertion changed (Session V Part 13, owner-approved; ADR-014 "Owner-approved changes", ADR-010 rule 2): IndexedDB was
  // refused outright; now the worker may open one database, the reminder names the page keeps after the person opted in,
  // and only to read it. It never creates, writes, clears or deletes anything.
  expect(worker.match(/indexedDB\.\w+/g)).toEqual(["indexedDB.open"]);
  expect(worker).toContain("'zigoals-push-labels-v1'");
  expect(worker).toContain("'readonly'");
  expect(worker).not.toMatch(/readwrite|createObjectStore|deleteObjectStore|deleteDatabase|\.put\(|\.add\(|\.delete\(|\.clear\(/);
  expect(worker).toContain("'A reminder from ZIGoals'");
});
test("safe diagnostics whitelist enums and identities, ignoring adversarial and private values", () => {
  const text = diagnosticSummary({ environment: "PUBLIC_ALPHA_UNDEPLOYED", version:"0.1.0", commit:"a".repeat(40), scope:"local", rpc:"healthy", rest:"unavailable", checkedAt:"2026-09-13T12:00:00.000Z", owner:"PRIVATE_ACCOUNT", error:"RAW_ERROR", metadata:"PRIVATE_PLAN" } as Parameters<typeof diagnosticSummary>[0]);
  expect(text).toContain("PUBLIC_ALPHA_UNDEPLOYED");
  expect(text).not.toMatch(/PRIVATE|RAW_ERROR/);
  expect(diagnosticSummary({environment:"<script>secret",version:"secret",commit:"secret",scope:"secret",rpc:"secret",rest:"secret",checkedAt:"secret",vault:"secret",connectivity:"secret",sync:"secret",market:"secret"})).not.toContain("secret");
});

test("HTTPS middleware overwrites attacker nonce/origin and sends non-cacheable security headers", () => {
  const request = new NextRequest("https://zigoals-alpha.example.workers.dev/app", {headers:{"x-nonce":"attacker", "x-zigoals-origin":"https://attacker.invalid", "content-security-policy":"script-src *"}});
  const response = middleware(request);
  expect(response.headers.get("x-middleware-request-x-zigoals-origin")).toBe("https://zigoals-alpha.example.workers.dev");
  expect(response.headers.get("x-middleware-request-x-nonce")).not.toBe("attacker");
  expect(response.headers.get("Content-Security-Policy")).not.toContain("attacker");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});

test("Session W Part 1d: every app answer names its exact build (the public 40-character commit), and nothing else", () => {
  const before = process.env.NEXT_PUBLIC_APP_COMMIT;
  try {
    process.env.NEXT_PUBLIC_APP_COMMIT = "0123456789abcdef0123456789abcdef01234567";
    expect(middleware(new NextRequest("https://alpha.zigoals.app/app")).headers.get("x-zigoals-build")).toBe("0123456789abcdef0123456789abcdef01234567");
    for (const commit of ["Unknown", "", "0123456", "0123456789ABCDEF0123456789ABCDEF01234567", "0123456789abcdef0123456789abcdef01234567\nx"]) {
      process.env.NEXT_PUBLIC_APP_COMMIT = commit;
      expect(middleware(new NextRequest("https://alpha.zigoals.app/app")).headers.get("x-zigoals-build"), commit).toBeNull();
    }
  } finally { if (before === undefined) delete process.env.NEXT_PUBLIC_APP_COMMIT; else process.env.NEXT_PUBLIC_APP_COMMIT = before; }
});
test("HSTS and crawler headers avoid middleware duplication while covering Next and static assets", () => {
  const nextConfig = readFileSync(
    new URL("../next.config.ts", import.meta.url),
    "utf8",
  );
  const middlewareSource = readFileSync(
    new URL("../middleware.ts", import.meta.url),
    "utf8",
  );
  const staticHeaders = readFileSync(
    new URL("../public/_headers", import.meta.url),
    "utf8",
  );

  expect(nextConfig).toContain(
    '{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }',
  );
  expect(nextConfig).toContain(
    '{ key: "Strict-Transport-Security", value: "max-age=31536000" }',
  );

  expect(middlewareSource).not.toContain(
    'response.headers.set("X-Robots-Tag"',
  );
  expect(middlewareSource).not.toContain(
    'response.headers.set("Strict-Transport-Security"',
  );

  expect(staticHeaders).toContain(
    "X-Robots-Tag: noindex, nofollow, noarchive",
  );
  expect(staticHeaders).toContain(
    "Strict-Transport-Security: max-age=31536000",
  );
});


test.each(["/icon.svg", "/apple-touch-icon.png", "/robots.txt", "/social-card.svg", "/social-card.png", "/_next/static/chunks/app.js", "/_next/image?url=%2Ficon.svg&w=64&q=75"])("known static/image route bypasses nonce middleware: %s", url => {
  expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url})).toBe(false);
});
test.each(["/", "/app", "/app/settings", "/app/goals/123", "/favicon.ico", "/icon.svg/app", "/robots.txt/app", "/social-card.png/app", "/apple-touch-icon.png/app", "/apple-touch-iconXpng", "/social-cardXpng", "/iconXsvg", "/robotsXtxt", "/_next/staticity", "/_next/image/app", "/icon%2Esvg/app"])("HTML and near-miss paths retain nonce middleware: %s", url => {
  expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url})).toBe(true);
});
test("icon and crawler policy are actual public files, with no competing metadata handlers", () => {
  expect(readFileSync(new URL("../public/icon.svg",import.meta.url),"utf8")).toContain("<svg");
  expect(readFileSync(new URL("../public/robots.txt",import.meta.url),"utf8")).toBe("User-Agent: *\nDisallow: /\n\n");
  expect(existsSync(new URL("../app/robots.ts",import.meta.url))).toBe(false);
  expect(existsSync(new URL("../app/icon.svg",import.meta.url))).toBe(false);
});
