import { defineConfig, devices } from "@playwright/test";
// Session AK ([TIER 3] (CI), ADR-036 C3): CI runs the accessibility sweep (tests/p6-*.spec.ts) as its own suite of shards
// (A11Y_SWEEP=only) and the rest without it (A11Y_SWEEP=skip); unset, as locally, every spec runs.
const A11Y_SWEEP = /p6-(axe-all|axe-surfaces|keyboard)\.spec\.ts$/;
export default defineConfig({
  testDir: "./tests",
  ...(process.env.A11Y_SWEEP === "only" ? { testMatch: A11Y_SWEEP } : process.env.A11Y_SWEEP === "skip" ? { testIgnore: A11Y_SWEEP } : {}),
  timeout: 45000,
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
