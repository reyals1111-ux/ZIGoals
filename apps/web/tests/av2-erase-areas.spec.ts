import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {MODULE_KEYS} from '../lib/export/everything';

// Session AV lane 2 (owner decision CR-19, follow-up 3): Erase names each area it erased, in the export catalogue's areas
// (the Data health page's names), before it erases (what this browser holds) and in its status line after.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('CR-19: the confirm step lists the areas held, and the status names each area erased', async ({page}) => {
  await page.evaluate(keys => { localStorage.setItem(keys.habits, JSON.stringify({version: 1})); localStorage.setItem(keys.health, JSON.stringify({version: 1})); }, {habits: MODULE_KEYS.habits, health: MODULE_KEYS.health});
  await page.goto('/app/settings#erase-everything'); await hydrated(page);
  const erase = page.locator('#erase-everything');
  await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
  await expect(erase.getByText(/^The areas they hold: /)).toContainText('Habits');
  await expect(erase.getByText(/^The areas they hold: /)).toContainText('Health');
  await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
  await erase.getByRole('button', {name: 'Erase everything', exact: true}).click();
  const status = erase.getByRole('status');
  await expect(status).toContainText(/^Erased \d+ records and \d+ stores from this browser\. Erased areas: .+\. Open ZIGoals fresh now/, {timeout: 20_000});
  for (const area of ['Habits', 'Health']) await expect(status).toContainText(area);
  expect(await page.evaluate(keys => [localStorage.getItem(keys.habits), localStorage.getItem(keys.health)], {habits: MODULE_KEYS.habits, health: MODULE_KEYS.health})).toEqual([null, null]);
});
