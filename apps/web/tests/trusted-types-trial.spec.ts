import { expect, test, type Page } from "@playwright/test";
import { TRUSTED_TYPES_TRIAL } from "../lib/security-policy";

// Session U Part 6 (FIX_PLAN D4, docs/security/TRUSTED_TYPES.md): the report-only Trusted Types trial must not change what
// the app does. The first trial run found it did: the default policy handed back a rewritten chunk URL, Turbopack finds a
// loaded chunk by its script's raw src attribute, and every soft navigation waited forever without an error. This test
// adds the trial's directives (no report-uri: violations are read in the page) to every /app document itself, so it runs
// against any server, CI included, without the local-only switch.
type Seen = { __trustedTypesViolations: string[] };
async function withTrial(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as Seen).__trustedTypesViolations = seen;
    document.addEventListener("securitypolicyviolation", event => {
      if (event.effectiveDirective === "require-trusted-types-for" || event.effectiveDirective === "trusted-types")
        seen.push(`${event.disposition} ${event.effectiveDirective} ${event.sample}`);
    });
  });
  await page.route(url => url.pathname === "/app" || url.pathname.startsWith("/app/"), async route => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy-report-only": TRUSTED_TYPES_TRIAL } });
  });
}
const violations = (page: Page) => page.evaluate(() => (window as unknown as Seen).__trustedTypesViolations.splice(0));

test("under the report-only Trusted Types trial, soft navigation still loads each page's code", async ({ page, isMobile }) => {
  await withTrial(page);
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
  // The trial is really on: a raw string at an HTML sink and a foreign script URL are reported (report-only: still
  // allowed), and a chunk URL passes the default policy with its src attribute exactly as the framework wrote it.
  const kept = await page.evaluate(() => {
    document.createElement("div").innerHTML = "trial check";
    document.createElement("script").src = "https://attacker.invalid/x.js";
    const chunk = document.createElement("script");
    chunk.src = "/_next/static/chunks/trial-check.js";
    return chunk.getAttribute("src");
  });
  expect(kept).toBe("/_next/static/chunks/trial-check.js");
  await expect.poll(() => page.evaluate(() => (window as unknown as Seen).__trustedTypesViolations.length)).toBe(2);
  expect(await violations(page)).toEqual([
    "report require-trusted-types-for Element innerHTML|trial check",
    "report require-trusted-types-for HTMLScriptElement src|https://attacker.invalid/x.js",
  ]);
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  // Phones show the tab bar (Wealth and Markets sit in its More sheet); the sidebar carries every page.
  const pages = isMobile ? [["Goals", "/app/goals"], ["Habits", "/app/habits"], ["Today", "/app"]] as const
    : [["Goals", "/app/goals"], ["Habits", "/app/habits"], ["Wealth", "/app/wealth"], ["Markets", "/app/markets"], ["Today", "/app"]] as const;
  for (const [name, path] of pages) {
    await nav.getByRole("link", { name, exact: true }).click();
    await page.waitForURL(url => url.pathname === path);
    await expect(page.locator("#main")).toBeVisible();
  }
  await page.locator(".today-hero").getByRole("button", { name: "+ Quick add", exact: true }).click();
  await page.getByRole("navigation", { name: "Quick add actions" }).getByRole("link", { name: /Goal/ }).first().click();
  await page.waitForURL("**/app/goals/new");
  // What enforcement would refuse is a finding (docs/security/TRUSTED_TYPES.md), not a failure: this PR enforces nothing.
  // The framework's own script URLs, though, must pass the default policy, or enforcement would stop every page.
  const found = await violations(page);
  test.info().annotations.push({ type: "trusted-types-violations", description: JSON.stringify(found) });
  expect(found.filter(line => line.includes("HTMLScriptElement src|"))).toEqual([]);
});
