import {join} from 'node:path';
import {defineConfig, devices} from '@playwright/test';
import {WEBKIT_TEST_IGNORE, WEBKIT_TEST_MATCH, webkitShardMatch} from './playwright.webkit.shards';

/**
 * Session X-Local Part 6f: the same tests in WebKit (Playwright's build of Safari's engine), two projects, run by hand
 * with `pnpm --filter @zigoals/web exec playwright test -c playwright.webkit.config.ts`; since Session Y Part 6 also in
 * CI's `web-webkit` job. A WebKit run is evidence labelled "WebKit", never "Safari on an iPhone".
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  // Session Y Part 6: CI's WebKit job runs this selection; `webkit-phone` is its curated phone set.
  // Session AN ([TIER 3] (CI)): CI's four shards are the duration-balanced lists in playwright.webkit.shards.ts
  // (`WEBKIT_SHARD=n/4`, which first checks that every selected spec is in exactly one list); without it, every spec.
  testMatch: process.env.WEBKIT_MATCH ? new RegExp(process.env.WEBKIT_MATCH)
    : process.env.WEBKIT_SHARD ? webkitShardMatch(process.env.WEBKIT_SHARD, join(__dirname, 'tests'))
    : WEBKIT_TEST_MATCH,
  testIgnore: WEBKIT_TEST_IGNORE,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3102',
    trace: 'retain-on-failure',
    locale: 'en-US',
    // CI's runner is UTC and the Chrome runs set TZ=UTC; WebKit follows the system clock unless told.
    timezoneId: 'UTC',
    // Session AK (ADR-036 Q17): as in the main config, service workers only where a spec opts in.
    serviceWorkers: 'block',
  },
  // The project names match the main config's ("desktop", "mobile"), which the specs branch on; this file's name is
  // the evidence label (WebKit), never the project's.
  projects: [
    {name: 'desktop', use: {...devices['Desktop Safari']}},
    {name: 'mobile', use: {...devices['iPhone 15']}},
  ],
});
