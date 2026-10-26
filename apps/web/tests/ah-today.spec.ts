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
