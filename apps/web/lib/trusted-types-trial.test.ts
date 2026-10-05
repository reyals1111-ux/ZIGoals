import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";
import { middleware } from "../middleware";
import { securityPolicy, TRUSTED_TYPES_TRIAL, trustedTypesTrialHeader } from "./security-policy";

// Session U Part 6 (FIX_PLAN D4): the Trusted Types trial header is local-only and report-only; nothing is enforced.
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

test("D4: middleware sends the report-only trial only on a loopback request, and never enforces Trusted Types", () => {
  vi.stubEnv("ZIGOALS_TRUSTED_TYPES_TRIAL", collector);
  const local = middleware(new NextRequest("http://127.0.0.1:3101/app"));
  expect(local.headers.get("Content-Security-Policy-Report-Only")).toBe(`${TRUSTED_TYPES_TRIAL}; report-uri ${collector}`);
  const hosted = middleware(new NextRequest("https://alpha.zigoals.app/app"));
  expect(hosted.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  for (const response of [local, hosted]) expect(response.headers.get("Content-Security-Policy")).not.toMatch(/trusted-types/);
  vi.unstubAllEnvs();
  expect(middleware(new NextRequest("http://127.0.0.1:3101/app")).headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  for (const [development, https] of [[false, true], [false, false], [true, false]] as const)
    expect(securityPolicy(development, https).csp).not.toMatch(/trusted-types/);
});
