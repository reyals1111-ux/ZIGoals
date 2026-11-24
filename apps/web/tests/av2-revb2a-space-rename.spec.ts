import {expect, test} from '@playwright/test';
import {entry, moneyLog, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2 (review b2a #10): renaming the business space while Personal is shown keeps Personal shown (and its
 * entries listed); the space's new name is kept. Fictional records; the API offline.
 */
test('rename from Personal stays on Personal', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '40.00', 'Groceries', 'expense', 'Market', 'EUR', 'revb2a-personal')]), [MONEY_MORE_KEY]: {version: 1, business: {name: 'Studio'}}});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page), space = box.getByRole('radiogroup', {name: 'Space'});
  await expect(space.getByRole('radio', {name: 'Personal'})).toBeChecked();
  await box.getByRole('button', {name: 'Rename the Studio space'}).click();
  await box.getByLabel('Name of the space').fill('Atelier');
  await box.getByRole('button', {name: 'Rename', exact: true}).click();
  await expect(space.getByRole('radio', {name: 'Atelier'})).toBeVisible();
  await expect(space.getByRole('radio', {name: 'Personal'})).toBeChecked();
  await expect(box.locator('.spending-bars')).toContainText('Groceries');
  expect(await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).toEqual({version: 1, business: {name: 'Atelier'}});
});
