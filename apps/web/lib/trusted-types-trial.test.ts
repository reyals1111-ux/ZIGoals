import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";
import { middleware } from "../middleware";
import { securityPolicy, TRUSTED_TYPES, TRUSTED_TYPES_TRIAL, trustedTypesTrialHeader } from "./security-policy";

// Session U Part 6 (FIX_PLAN D4): the Trusted Types trial header is local-only and report-only. Session V Part 19:
// production builds enforce the same directives; the development server does not.
afterEach(() => vi.unstubAllEnvs());
const collector = "http://127.0.0.1:9311/";

test("D4: the trial header needs a plain http loopback collector and a loopback request", () => {
  expect(trustedTypesTrialHeader(collector, "127.0.0.1")).toBe(`require-trusted-types-for 'script'; trusted-types default; report-uri ${collector}`);
  expect(trustedTypesTrialHeader("http://localhost:9311/", "localhost")).toBe(`${TRUSTED_TYPES_TRIAL}; report-uri http://localhost:9311/`);
  for (const host of ["alpha.zigoals.app", "accounts-test.zigoals.app", "zigoals-alpha.example.workers.dev", "127.0.0.1.attacker.invalid"])
    expect(trustedTypesTrialHeader(collector, host), host).toBeNull();
  for (const value of [undefined, "", "https://127.0.0.1:9311/", "http://attacker.invalid/", "http://127.0.0.1:9311", "http://user@127.0.0.1:9311/", "http://127.0.0.1:9311/#x", "not a url"])
    expect(trustedTypesTrialHeader(value, "127.0.0.1"), String(value)).toBeNull();
});

test("D4: middleware sends the report-only trial only on a loopback request", () => {
  vi.stubEnv("ZIGOALS_TRUSTED_TYPES_TRIAL", collector);
  const local = middleware(new NextRequest("http://127.0.0.1:3101/app"));
  expect(local.headers.get("Content-Security-Policy-Report-Only")).toBe(`${TRUSTED_TYPES_TRIAL}; report-uri ${collector}`);
  const hosted = middleware(new NextRequest("https://alpha.zigoals.app/app"));
  expect(hosted.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  vi.unstubAllEnvs();
  expect(middleware(new NextRequest("http://127.0.0.1:3101/app")).headers.get("Content-Security-Policy-Report-Only")).toBeNull();
});

test("Session V Part 19: production policies enforce Trusted Types with the default policy only; development does not", () => {
  expect(TRUSTED_TYPES).toBe("require-trusted-types-for 'script'; trusted-types default");
  expect(TRUSTED_TYPES_TRIAL).toBe(TRUSTED_TYPES);
  for (const https of [true, false]) {
    const directives = securityPolicy(false, https).csp.split("; ");
    expect(directives).toContain("require-trusted-types-for 'script'");
    expect(directives).toContain("trusted-types default");
    // Exactly one policy name, and never 'allow-duplicates' or a wildcard.
    expect(directives.filter(d => d.startsWith("trusted-types"))).toEqual(["trusted-types default"]);
  }
  expect(securityPolicy(true, false).csp).not.toMatch(/trusted-types/);
  // The hosted middleware's enforced header carries them too.
  const hosted = middleware(new NextRequest("https://alpha.zigoals.app/app"));
  expect(hosted.headers.get("Content-Security-Policy")).toContain("require-trusted-types-for 'script'; trusted-types default");
});
