import {expect, test} from '@playwright/test';
import {MONEY_TAGS_KEY} from '../../lib/money-tags/schema';
import {MONEY_LOG_KEY, entry, moneyLog, openInsight, readRecord, seedDevice, spending} from './ap-money-fixtures';

/**
 * Session AP (feature 2, draft): tags on money entries in their own device record (zigoals:money-tags:v1), never on the
 * money-log entry; filter by a tag, totals per tag and currency; a removed entry's tags are shown nowhere.
 */
test.use({timezoneId: 'UTC'});
test('tag, filter, totals; removing the entry leaves no orphan in view', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '40.00', 'Groceries', 'expense', 'Market', 'EUR', 'g1'), entry('2026-11-12', '12.50', 'Fun', 'expense', 'Cinema', 'EUR', 'f1'), entry('2026-11-13', '5.00', 'Fun', 'expense', 'Arcade', 'USD', 'u1')])});
  const panel = await openInsight(page, 'Tags');
  await expect(panel).toContainText('No tags yet.');
  await panel.getByRole('button', {name: /^Tags for Groceries 40\.00 EUR/}).click();
  const field = panel.getByLabel(/^Tags, separated by commas/);
  await expect(field).toBeFocused();
  await field.fill('Holiday, Work Trip');
  await panel.getByRole('button', {name: 'Save tags'}).click();
  await expect(panel.getByRole('status')).toContainText('Tags saved for Groceries');
  for (const name of [/^Tags for Fun 12\.50 EUR/, /^Tags for Fun 5\.00 USD/]) {
    await panel.getByRole('button', {name}).click();
    await panel.getByLabel(/^Tags, separated by commas/).fill('holiday');
    await panel.getByRole('button', {name: 'Save tags'}).click();
  }
  expect(await readRecord(page, MONEY_TAGS_KEY)).toEqual({version: 1, tags: {g1: ['holiday', 'work trip'], f1: ['holiday'], u1: ['holiday']}});
  // The money log itself is unchanged: no field was added to its entries.
  const log = await readRecord<{entries: Record<string, unknown>[]}>(page, MONEY_LOG_KEY);
  expect(log.entries.every(e => !('tags' in e))).toBe(true);
  const table = panel.getByRole('table');
  await expect(table.getByRole('row', {name: /holiday · EUR/})).toContainText('€52.50');
  await expect(table.getByRole('row', {name: /holiday · USD/})).toContainText('$5.00');
  await panel.getByRole('group', {name: 'Show entries tagged'}).getByRole('button', {name: /^work trip/}).click();
  await expect(panel.locator('.money-tags-list li')).toHaveCount(1);
  // Remove the Groceries entry from This week: "work trip" is offered nowhere any more.
  await spending(page).getByRole('button', {name: /^Remove Groceries 40\.00 EUR/}).click();
  await expect(panel).not.toContainText('work trip');
  await expect(table.getByRole('row', {name: /holiday · EUR/})).toContainText('€12.50');
});
