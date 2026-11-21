import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { A11Y_SWEEP, mainShardMatch } from "./playwright.main.shards";
// Session AK ([TIER 3] (CI), ADR-036 C3): CI runs the accessibility sweep (tests/p6-*.spec.ts) as its own suite of shards
// (A11Y_SWEEP=only) and the rest without it (A11Y_SWEEP=skip); unset, as locally, every spec runs.
// Session AU ([TIER 3] (CI), ADR-044 D-CI): CI's fourteen main shards are the duration-balanced lists in
// playwright.main.shards.ts (`MAIN_SHARD=n/14` with A11Y_SWEEP=skip, which first checks that every selected spec is in
// exactly one list); without MAIN_SHARD, the selection is as before.
if (process.env.MAIN_SHARD && process.env.A11Y_SWEEP !== "skip") {
  throw new Error(`MAIN_SHARD="${process.env.MAIN_SHARD}" needs A11Y_SWEEP=skip: its lists are the main suite, without the accessibility sweep`);
}
export default defineConfig({
  testDir: "./tests",
  ...(process.env.A11Y_SWEEP === "only" ? { testMatch: A11Y_SWEEP }
    : process.env.A11Y_SWEEP === "skip" ? {
      testIgnore: A11Y_SWEEP,
      ...(process.env.MAIN_SHARD ? { testMatch: mainShardMatch(process.env.MAIN_SHARD, join(__dirname, "tests")) } : {}),
    }
    : {}),
  timeout: 45000,
  // Session AP ([TIER 3] (CI), owner rule 14 Nov): in CI's browser suite, a11y and WebKit jobs (ZIGOALS_CI_RETRY=1) a failed
  // test is retried once; one that passes on its retry is reported "flaky" (scripts/ci/flaky-summary.mjs lists it in the
  // job summary) and one that fails twice still fails the job. Locally and in every other job: no retry.
  retries: process.env.ZIGOALS_CI_RETRY === '1' ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    // Numbers, money and dates follow the browser's locale (Session G, Part 3). The suite pins en-US so expected text
    // does not depend on the runner's language; tests/display-locale.spec.ts covers other locales.
    locale: "en-US",
    // Session AK (ADR-036 Q17): the app registers its offline service worker on idle. Specs run without it (a worker would
    // serve navigations and assets past page.route); the specs that test the worker, push and offline use opt in with
    // test.use({serviceWorkers: "allow"}).
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
  ],
});
