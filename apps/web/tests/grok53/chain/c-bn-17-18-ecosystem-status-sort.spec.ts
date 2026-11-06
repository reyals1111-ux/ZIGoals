import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (Part 15, lane L6): Berlin BN-096 / C-BN-17 / C-BN-18. A status filter and a sort on the Ecosystem page.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('C-BN-18: Status "Closing or paused" keeps Zignaly and PermaPod; Clear filters brings every project back', async ({page}) => {
  await page.goto('/app/ecosystem'); await hydrated(page);
  const all = await page.locator('.ecosystem-project').count();
  await page.getByLabel('Status').selectOption({label: 'Closing or paused'});
  await expect(page.locator('#project-zignaly')).toBeVisible();
  await expect(page.locator('#project-permapod')).toBeVisible();
  await expect(page.locator('#project-valdora')).toHaveCount(0);
  await expect(page.locator('.ecosystem-result')).toContainText('Closing or paused');
  await page.getByRole('button', {name: 'Clear filters'}).click();
  await expect(page.locator('.ecosystem-project')).toHaveCount(all);
});

test('C-BN-17: Sort "Name, A to Z" orders the cards by name', async ({page}) => {
  await page.goto('/app/ecosystem'); await hydrated(page);
  await page.getByLabel('Sort').selectOption({label: 'Name, A to Z'});
  const names = await page.locator('.ecosystem-project h2 .ecosystem-toggle > span:first-child').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'})));
});
