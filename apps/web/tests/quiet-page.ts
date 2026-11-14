import type {Page} from '@playwright/test';

/**
 * Session AO (CI_INTERMITTENTS "WebKit class A", owner option from STATUS item 14): before a navigation that follows a
 * seeded page, wait until the app has hydrated and no new resource has started for `quietMs`. In WebKit the launcher's
 * idle-time imports start on an 800 ms timer after mount, which can be just after `networkidle`; a goto that cancels them
 * met "WebKit encountered an internal error" (zigi-accept-correct:268/271, zigi-stress:124, webkit-smoke:40). This waits
 * for the page, never retries or skips the navigation itself.
 */
export async function quietPage(page: Page, {quietMs = 1_000, timeout = 10_000} = {}): Promise<void> {
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout});
  await page.waitForFunction(quiet => {
    const w = window as unknown as {__aoQuiet?: {count: number; since: number}};
    const count = performance.getEntriesByType('resource').length, now = performance.now();
    if (!w.__aoQuiet || w.__aoQuiet.count !== count) { w.__aoQuiet = {count, since: now}; return false; }
    return now - w.__aoQuiet.since >= quiet;
  }, quietMs, {timeout, polling: 100});
}
