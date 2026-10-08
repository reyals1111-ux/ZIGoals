import { defineConfig, devices } from "@playwright/test";

// Session X Part 14: the human-style journeys (docs/verification/x-cloud/HUMAN_TEST.md). Outside CI's suite (its own
// directory and config); run against a production build, or with HUMAN_LIVE=1 against the live Alpha (pass 2: one
// worker, a pause between steps, the journeys tagged @live only). Three viewports, as the charter lists them.
const live = process.env.HUMAN_LIVE === "1";
export default defineConfig({
  testDir: "./human-x",
  timeout: 150_000,
  expect: { timeout: 10_000 },
  workers: live ? 1 : 2,
  grep: live ? /@live/ : undefined,
  reporter: [["line"], ["json", { outputFile: process.env.HUMAN_JSON ?? "/tmp/zigoals-human/results.json" }]],
  outputDir: process.env.HUMAN_OUTPUT ?? "/tmp/zigoals-human/output",
  use: {
    baseURL: live ? "https://alpha.zigoals.app" : process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    locale: "en-US",
    timezoneId: "Europe/Brussels",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Live: through the environment's HTTPS proxy when one is set (a sandbox that reaches the internet only that way).
    launchOptions: live ? { slowMo: 250, ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) } : undefined,
  },
  projects: [
    { name: "D", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "T", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1024, height: 768 } } },
    { name: "P", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", channel: "chrome", viewport: { width: 390, height: 844 } } },
  ],
});
