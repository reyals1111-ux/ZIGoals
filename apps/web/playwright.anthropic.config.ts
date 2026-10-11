import {defineConfig, devices} from '@playwright/test';

/**
 * Session Z-Local Part 2: the real-model specs against a real Claude model on the owner's test key. Used only for those
 * stages, by hand: `pnpm --filter @zigoals/web exec playwright test -c playwright.anthropic.config.ts tests/zigi-real-model.spec.ts`.
 * Nothing is recorded (owner rule): no trace, no video, no screenshot, so the key (sealed into the app's own key store
 * from an init script, never typed) can never land in an artifact; every test gets a fresh ephemeral context whose
 * storage Playwright discards with it. The projects keep the main config's names ("desktop", "mobile"), which the specs
 * branch on; `webkit` selects Playwright's WebKit for the WebKit subset (evidence label "WebKit").
 */
const engine = process.env.ZIGI_ENGINE === 'webkit' ? 'webkit' : 'chrome';
export default defineConfig({
  testDir: './tests',
  timeout: 15 * 60_000,
  testMatch: /zigi-(real-model|conversations|pages-conversations|day-in-the-life|photo)\.spec\.ts$/,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3103',
    trace: 'off', video: 'off', screenshot: 'off',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  reporter: [['line']],
  projects: engine === 'webkit'
    ? [{name: 'desktop', use: {...devices['Desktop Safari']}}, {name: 'mobile', use: {...devices['iPhone 15']}}]
    : [{name: 'desktop', use: {...devices['Desktop Chrome'], channel: 'chrome'}}, {name: 'mobile', use: {...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome'}}],
});
