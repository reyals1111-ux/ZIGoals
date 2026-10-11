import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { assertOpenerPolicy } from "./lib/alpha-smoke.mjs";
import nextConfig from "../apps/web/next.config.ts";
// Session U Part 6 (FIX_PLAN D1): the post-upload smoke requires Cross-Origin-Opener-Policy: same-origin on every app page.
test("the value next.config.ts sends on every route meets the smoke's requirement", async () => {
  const rules = await nextConfig.headers();
  const opener = rules.filter(rule => rule.source === "/(.*)").flatMap(rule => rule.headers).filter(h => h.key.toLowerCase() === "cross-origin-opener-policy");
  expect(opener).toHaveLength(1);
  expect(() => assertOpenerPolicy(opener[0].value)).not.toThrow();
});
test.each([null, "", "unsafe-none", "same-origin-allow-popups", "same-origin, same-origin", "noopener-allow-popups"])("%s is refused", value => {
  expect(() => assertOpenerPolicy(value)).toThrow(/Cross-Origin-Opener-Policy/);
});
test("the post-upload smoke checks it on every route; the rollback capture does not", () => {
  const source = readFileSync(new URL("./lib/alpha-smoke.mjs", import.meta.url), "utf8");
  expect(source).toContain('    if (!baseline) assertOpenerPolicy(response.headers.get("cross-origin-opener-policy"));\n');
  expect(source.match(/assertOpenerPolicy\(/g)).toHaveLength(2);
});
