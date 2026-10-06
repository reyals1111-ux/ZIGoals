import { expect, test, type Page } from "@playwright/test";
import { TRUSTED_TYPES } from "../lib/security-policy";

// Trusted Types (docs/security/TRUSTED_TYPES.md). Session U Part 6 built a report-only trial; its first run found that the
// default policy must hand back a chunk URL unchanged (Turbopack finds a loaded chunk by its script's raw src attribute;
// a rewritten one left every soft navigation waiting forever). Session V Part 19 enforces the directives in production
// builds, after the full suite on both projects reported nothing under the trial. This test reads the page's own policy,
// so it runs against any production server, CI included.
type Seen = { __trustedTypesViolations: string[] };
async function watch(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as Seen).__trustedTypesViolations = seen;
    document.addEventListener("securitypolicyviolation", event => {
      if (event.effectiveDirective === "require-trusted-types-for" || event.effectiveDirective === "trusted-types")
        seen.push(`${event.disposition} ${event.effectiveDirective} ${event.sample}`);
    });
  });
}
const violations = (page: Page) => page.evaluate(() => (window as unknown as Seen).__trustedTypesViolations.splice(0));

test("Trusted Types are enforced: strings at HTML and script sinks are refused, the framework's chunks load, soft navigation works", async ({ page, isMobile }) => {
  await watch(page);
  const settings = await page.goto("/app/settings");
  expect(settings!.headers()["content-security-policy"]).toContain(TRUSTED_TYPES);
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
  // A raw string at an HTML sink and a foreign script URL are refused (the browser throws); a chunk URL passes the
  // default policy with its src attribute exactly as the framework wrote it.
  const result = await page.evaluate(() => {
    const refused = (act: () => void) => { try { act(); return "allowed"; } catch (error) { return error instanceof TypeError ? "refused" : String(error); } };
    const html = refused(() => { document.createElement("div").innerHTML = "trial check"; });
    const foreign = refused(() => { document.createElement("script").src = "https://attacker.invalid/x.js"; });
    const chunk = document.createElement("script");
    chunk.src = "/_next/static/chunks/trial-check.js";
    return { html, foreign, kept: chunk.getAttribute("src") };
  });
  expect(result).toEqual({ html: "refused", foreign: "refused", kept: "/_next/static/chunks/trial-check.js" });
  await expect.poll(() => page.evaluate(() => (window as unknown as Seen).__trustedTypesViolations.length)).toBe(2);
  expect(await violations(page)).toEqual([
    "enforce require-trusted-types-for Element innerHTML|trial check",
    "enforce require-trusted-types-for HTMLScriptElement src|https://attacker.invalid/x.js",
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
  // Every page loaded under enforcement, and nothing the app did was refused.
  expect(await violations(page)).toEqual([]);
});
