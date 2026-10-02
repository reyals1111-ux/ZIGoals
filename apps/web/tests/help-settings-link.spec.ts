import {expect, test} from '@playwright/test';

// The one link to Help in Settings (Session L): there exactly once, under the page title, 44 px tall, and it opens Help.
const NAME = 'Help: install on iPhone, keep your data safe, send feedback →';

test('Settings links to Help exactly once, near the top, and back', async ({page}) => {
  await page.goto('/app/settings');
  await expect(page.locator('a[href="/app/help"]')).toHaveCount(1);
  const link = page.getByRole('link', {name: NAME, exact: true});
  await expect(link).toBeVisible();await expect(link).toBeInViewport();
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await link.click();
  await expect(page).toHaveURL(/\/app\/help$/);
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Help.');
  await page.getByRole('link', {name: '← Back to Settings', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByRole('link', {name: NAME, exact: true})).toBeVisible();
});
