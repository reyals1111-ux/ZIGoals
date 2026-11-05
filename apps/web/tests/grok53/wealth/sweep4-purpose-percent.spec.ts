import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase} from '../../ah-helpers';

// Session AL sweep 4 (L8f note 2): Wealth's purpose flow writes its share as NOVA does ("12.7%"), never "12.7 %".
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels', locale: 'en-GB'});

test('L8f note 2: the purpose share has no space before the percent sign, in the summary and the table', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth#purpose'); await hydrated(page);
  const summary = page.locator('.purpose-summary strong');
  await expect(summary).toHaveText(/^\d{1,3}\.\d%$/);
  await page.getByRole('button', {name: 'Show as a table'}).click();
  const cells = await page.locator('.purpose-body table td').allTextContents();
  expect(cells.filter(c => /\d %/.test(c))).toEqual([]);
  expect(cells.some(c => /\d\.\d%/.test(c))).toBe(true);
});
