import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { assertHealthCamera } from "./lib/alpha-smoke.mjs";
import nextConfig from "../apps/web/next.config.ts";
// Session U Part 3: the post-upload smoke requires Health's camera. Required: camera=(self) and geolocation=();
// accepted: microphone=() or microphone=(self). Never an exact pin (Session T sets the microphone on app pages).
test("the reviewed /app/health header in next.config.ts meets the smoke's Health requirement", async () => {
  const rules = await nextConfig.headers();
  const health = rules.filter(rule => rule.source === "/app/health").flatMap(rule => rule.headers).filter(h => h.key.toLowerCase() === "permissions-policy");
  expect(health.length).toBeGreaterThan(0);
  for (const header of health) expect(() => assertHealthCamera(header.value)).not.toThrow();
});
test("Session T's microphone value and any order are accepted", () => {
  for (const value of ["camera=(self), microphone=(), geolocation=()", "camera=(self), microphone=(self), geolocation=()", "geolocation=(),camera=(self) ,microphone=(self)"])
    expect(() => assertHealthCamera(value)).not.toThrow();
});
test.each([
  ["camera=(), microphone=(), geolocation=()", /camera=\(self\)/],
  ["microphone=(), geolocation=()", /camera=\(self\)/],
  ["camera=*, microphone=(), geolocation=()", /camera=\(self\)/],
  ["camera=(self), microphone=(), geolocation=(self)", /geolocation=\(\)/],
  ["camera=(self), microphone=()", /geolocation=\(\)/],
  ["camera=(self), microphone=*, geolocation=()", /microphone must be/],
  ["camera=(self), geolocation=()", /microphone must be/],
  [null, /camera=\(self\)/],
])("%s is refused", (value, message) => {
  expect(() => assertHealthCamera(value)).toThrow(message);
});
test("the post-upload smoke checks Health's camera; the rollback capture does not", () => {
  const source = readFileSync(new URL("./lib/alpha-smoke.mjs", import.meta.url), "utf8");
  expect(source).toContain('if (route === "/app/health" && !baseline) assertHealthCamera(response.headers.get("permissions-policy"));');
});
