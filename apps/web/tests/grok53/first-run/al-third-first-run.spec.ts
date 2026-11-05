import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';

/** Session AL third pass (lane L3): setup rows. Fresh empty profile, every /api request answered 503. */
test.use({viewport: {width: 1280, height: 800}});

test('GAP-103 (P-NB-C05): setup shows the optional game layer before it is chosen, and stores nothing for it', async ({page}) => {
  await emptyDevice(page, {welcomeSeen: false});
  // The wizard's own draft (session storage) opens it at the ZIGi step, as Continue would.
  await page.evaluate(() => sessionStorage.setItem('zigoals:welcome-draft:v1', JSON.stringify({step: 'zigi', pillars: ['habits']})));
  await open(page, '/app/welcome');
  const preview = page.getByRole('complementary', {name: 'A game layer, if you like one'});
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Lv 1');
  await expect(preview).toContainText('Spark');
  await expect(preview).toContainText('Switch it on later in Settings');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:game:v1'))).toBeNull();
});

test('N-045/D-184 (P-DVR-86, Q7 replay): leaving setup at once leaves no stale "Step 1 of 8" on Today', async ({page}) => {
  await emptyDevice(page, {welcomeSeen: false});
  await page.goto('/app/welcome');
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Today', exact: true}).click();
  await page.waitForURL(/\/app$/);
  await hydrated(page);
  await expect(page.getByText(/Step 1 of 8/)).toHaveCount(0);
});
