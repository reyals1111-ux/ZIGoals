import {expect, test, type Page} from '@playwright/test';

/**
 * Session AK RB (RELEASE_REVIEW_2 R2-8): Health and Wealth stay short on a phone. The page height at 390×844, as
 * scrollHeight / 844 (screens), with every network call answered 503 and motion reduced, on a brand-new device and in the
 * Showcase. Before (production build of `52bd5286`, measured through the browser lock, 1 Nov 2026):
 *   Health  fresh 8,638 px (10.2 screens) · Showcase 10,107 px (12.0)
 *   Wealth  fresh 8,168 px (9.7)          · Showcase 13,645 px (16.2)
 * R2-8 removed the duplicates (the weight trend, energy and coach cards and the meal-by-meal list moved into Health's
 * Weight and Insights views; "Faster ways to log" is gone), folded the secondary sections (Seven days of care; Wealth's
 * composition, bills, budgets and calculator as rows on a phone, the analytic rows in one "More about your wealth" row
 * while there are fewer than two assets) and put the empty forms behind their buttons (Log spending, the weekly and the
 * monthly budget). The ceilings hold the gain with a margin for CI's Linux fonts (about 0.6 screens taller than a Mac in
 * tests/today-screens.spec.ts); each sits far below its "before". A change that makes either page meaningfully longer on
 * a phone fails here instead of going unnoticed.
 */
const CEILING = {healthFresh: 7.0, healthShowcase: 8.2, wealthFresh: 6.0, wealthShowcase: 10.0};
const BEFORE = {healthFresh: 10.2, healthShowcase: 12.0, wealthFresh: 9.7, wealthShowcase: 16.2};
test.use({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
const FIXED_TIME = new Date('2026-11-01T09:30:00.000Z');

async function screens(page: Page, path: '/app/health' | '/app/wealth') {
  await page.goto(path);
  await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible();
  // The parts that load after the page (Health's tiles, Wealth's spending) are in before the page is measured.
  if (path === '/app/health') await expect(page.getByRole('region', {name: 'Daily nutrition summary'})).toBeVisible();
  else await expect(page.locator('#spending').getByRole('button', {name: 'Log spending', exact: true})).toBeVisible();
  await page.waitForTimeout(1200);
  return (await page.evaluate(() => document.documentElement.scrollHeight)) / 844;
}

test('Health and Wealth at 390×844 stay within their screen-count ceilings (fresh and Showcase)', async ({page}) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(FIXED_TIME);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const healthFresh = await screens(page, '/app/health'), wealthFresh = await screens(page, '/app/wealth');
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const healthShowcase = await screens(page, '/app/health'), wealthShowcase = await screens(page, '/app/wealth');
  const measured = {healthFresh, healthShowcase, wealthFresh, wealthShowcase};
  console.log(`PILLAR_SCREENS ${Object.entries(measured).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);
  for (const key of Object.keys(CEILING) as (keyof typeof CEILING)[]) {
    expect(measured[key], key).toBeLessThanOrEqual(CEILING[key]);
    expect(CEILING[key], `${key}: the ceiling keeps at least a third off its "before"`).toBeLessThanOrEqual(BEFORE[key] * 0.69);
  }
});
