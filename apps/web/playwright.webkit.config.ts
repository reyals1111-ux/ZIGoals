import {defineConfig, devices} from '@playwright/test';

/**
 * Session X-Local Part 6f: the same tests in WebKit (Playwright's build of Safari's engine), two projects, run by hand
 * on the owner's machines with `pnpm --filter @zigoals/web exec playwright test -c playwright.webkit.config.ts`. CI's
 * workflow and the main config are unchanged; a WebKit run is evidence labelled "WebKit", never "Safari on an iPhone".
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  testMatch: process.env.WEBKIT_MATCH ? new RegExp(process.env.WEBKIT_MATCH) : /(webkit-smoke|zigi-[a-z0-9-]+)\.spec\.ts$/,
  testIgnore: /zigi-(real-model|conversations|pages-conversations|day-in-the-life|on-device|browser-agents)\.spec\.ts$/,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3102',
    trace: 'retain-on-failure',
    locale: 'en-US',
    // CI's runner is UTC and the Chrome runs set TZ=UTC; WebKit follows the system clock unless told.
    timezoneId: 'UTC',
  },
  // The project names match the main config's ("desktop", "mobile"), which the specs branch on; this file's name is
  // the evidence label (WebKit), never the project's.
  projects: [
    {name: 'desktop', use: {...devices['Desktop Safari']}},
    {name: 'mobile', use: {...devices['iPhone 15']}},
  ],
});
