import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';

// Session AH Part 11 (TO1): a start page other than Today never breaks Today. Fictional data only.
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('TO1: with Goals as the start page, /app opens Goals, the Today link shows Today, and /app/today is Today', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  await page.locator('#pages-start-page').selectOption('goals');
  await expect(page.getByText('ZigGoals now opens on Goals'.replace('ZigGoals', 'ZIGoals'), {exact: false}).first()).toBeVisible();
  await page.goto('/app'); await hydrated(page);
  await expect(page).toHaveURL(/\/app\/goals$/);
  const today = page.getByRole('link', {name: 'Today', exact: true}).first();
  if (await today.isVisible()) await today.click(); else await page.evaluate(() => (document.querySelector('a[href="/app"]') as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.goto('/app/today'); await hydrated(page);
  await expect(page).toHaveURL(/\/app#today$/);
  await expect(page.locator('main h1').first()).toBeVisible();
});

test('DE4: in the Showcase, the welcome offers "Start my own", which leaves the demo and opens the welcome', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app'); await hydrated(page);
  await page.goto('/app/welcome'); await hydrated(page);
  await page.getByRole('button', {name: 'Start my own', exact: true}).click();
  await page.waitForURL('**/app/welcome'); await hydrated(page);
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Start my own', exact: true})).toHaveCount(0);
});

test('TO2: "Start the wrap-up now" opens it on Today before its time', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-26T09:00:00')});
  await page.goto('/app/settings'); await hydrated(page);
  const settings = page.getByRole('region', {name: 'Evening wrap-up', exact: true});
  await settings.getByLabel('Show the evening wrap-up on Today').check();
  await expect(settings.getByRole('status')).toContainText('Saved.');
  await settings.getByRole('link', {name: 'Start the wrap-up now →'}).click();
  await expect(page.getByRole('region', {name: 'Your evening wrap-up'}).or(page.locator('[aria-label="Your evening wrap-up"]')).first()).toBeVisible();
});
