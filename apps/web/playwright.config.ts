import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
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
