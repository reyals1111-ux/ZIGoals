import {expect, test, type Page} from '@playwright/test';

// Session I, Part 9: on a phone, Today and Wealth fold their secondary modules to one row each. Nothing is removed: a
// row opens its module in place, a #link into it opens it, and desktop shows every module as before.
async function showcase(page: Page) {
  await page.route('**/api/market-**', route => route.fulfill({status: 503, json: {error: 'fixture offline'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
const TODAY = ['Your market watch', 'Your progress', 'Your wallet', 'Staking', 'Plan a new destination', 'Recent activity', 'How it works', 'Your week'];
const WEALTH = ['Your wealth, in perspective', 'Your favourite markets', 'Your wealth over time', 'Evidence & returns', 'Allocation and coverage'];
const fold = (page: Page, label: string) => page.locator('.phone-fold').filter({has: page.getByRole('button', {name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)})}).first();

test('phone: Today folds its secondary modules to rows that open in place, and focus stays on the row', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone layout only; desktop is covered below.');
  await showcase(page);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  for (const label of TODAY) {
    const toggle = fold(page, label).locator('.phone-fold-toggle');
    await expect(toggle, label).toHaveAttribute('aria-expanded', 'false');
    const box = (await toggle.boundingBox())!;
    expect(box.height, label).toBeGreaterThanOrEqual(44); expect(box.height, label).toBeLessThanOrEqual(72);
    await expect(fold(page, label).locator('.phone-fold-body')).toBeHidden();
  }
  const activity = fold(page, 'Recent activity'), toggle = activity.locator('.phone-fold-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toBeFocused();
  await expect(activity.locator('.phone-fold-body')).toBeVisible();
  await expect(activity.getByRole('heading', {name: 'Recent activity'})).toBeVisible();
  await toggle.click();
  await expect(activity.locator('.phone-fold-body')).toBeHidden();
  // The daily core stays open: what matters today, habits and health.
  for (const heading of ['Small steps, steady rhythm.', 'Your daily balance.']) await expect(page.getByRole('heading', {name: heading})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('phone: Wealth folds its secondary modules, a link into one opens it, and amounts never split inside a number', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Phone layout only; desktop is covered below.');
  await showcase(page);
  await page.goto('/app/wealth');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  for (const label of WEALTH) await expect(fold(page, label).locator('.phone-fold-toggle'), label).toHaveAttribute('aria-expanded', 'false');
  // Each amount in the hero's Goals split, and the composition ring's total, sits on one line.
  for (const amount of await page.locator('.wealth-split dd > span, .composition-donut strong').all()) {
    expect(await amount.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size; })).toBe(1);
  }
  await page.goto('/app/wealth#wealth-history');
  const history = fold(page, 'Your wealth over time');
  await expect(history.locator('.phone-fold-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#wealth-history')).toBeVisible();
});

test('desktop: no module is folded and every one shows as before', async ({page, isMobile}) => {
  test.skip(!!isMobile, 'Desktop layout only.');
  await showcase(page);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  // Today's "For you" area folds its extra cards on every size (Session P, owner addition 2); no module is folded.
  await expect(page.locator('.phone-fold:not(.for-you-fold)')).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'How it works', exact: true})).toBeVisible();
  await page.goto('/app/wealth');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('.phone-fold')).toHaveCount(0);
  await expect(page.locator('#wealth-history')).toBeVisible();
});
