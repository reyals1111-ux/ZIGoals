import {expect, test} from '@playwright/test';
import {freshHealth, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-62): Moscow MO-029 (a plain "date, weight" CSV was "not recognised" anywhere). Weight → Import
// weights from a file: a preview by line, then one Undo that takes exactly those readings out. Desktop, fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('MO-029: date,weight lines import with a preview, and Undo takes them back', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?view=weight');
  await page.locator('summary', {hasText: 'Import weights from a file'}).click();
  await page.getByLabel('Or paste the lines').fill('date,weight\n2026-11-02,72.4\n2026-11-03,72,1\n2026-11-09,70\n');
  const preview = page.getByRole('region', {name: 'Weight import preview'});
  await expect(preview).toContainText('2 readings to add · 1 line not read');
  await expect(preview).toContainText('Line 4: 2026-11-09 is after today.');
  await preview.getByRole('button', {name: 'Import 2 readings'}).click();
  await expect.poll(async () => (await storedHealth(page))!.weights.map(w => w.grams).sort()).toEqual([72_100, 72_400]);
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
  await expect.poll(async () => (await storedHealth(page))!.weights.length).toBe(0);
});
