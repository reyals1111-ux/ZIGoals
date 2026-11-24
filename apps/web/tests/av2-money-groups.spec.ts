import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's grouped transactions, LEDGER #341): Wealth → Spending → Search all your
 * entries → Select → "Group them as one" puts three entries under a name; This week then shows them as one line with
 * their total (each entry still counted on its own: the month's figure is unchanged), opened to show each, and
 * "Ungroup" with Undo — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is
 * Saturday 14 November 2026; fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: group entries into one line`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([
    entry('2026-11-10', '120.00', 'Home', 'expense', 'Hotel Ghent'), entry('2026-11-11', '42.40', 'Food & drink', 'expense', 'Dinner Ghent'),
    entry('2026-11-12', '20.00', 'Refund', 'income', 'Refund Ghent'), entry('2026-11-12', '9.00', 'Groceries', 'expense', 'Market'),
  ])});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  const monthLine = box.getByText(/^This month in EUR: spent/);
  await expect(monthLine).toHaveText('This month in EUR: spent €171.40, received €20.00.');
  await box.locator('summary', {hasText: 'Search all your entries'}).click();
  const search = box.locator('.money-search');
  await search.getByLabel('Words or an amount').fill('ghent');
  await expect(search.getByRole('list', {name: 'Entries found'}).getByRole('listitem')).toHaveCount(3);
  await search.getByRole('button', {name: 'Select', exact: true}).click();
  await search.getByRole('button', {name: 'Select all 3'}).click();
  const group = search.getByRole('button', {name: 'Group', exact: true});
  // Session AV lane 2 (fixb4; deliberate): without a name Group is aria-disabled (it stays focusable and says what it
  // needs), and Playwright's click waits for an enabled button, so it never clicked. As strict: it is aria-disabled, and
  // pressed from the keyboard it says what it needs.
  await expect(group).toHaveAttribute('aria-disabled', 'true');
  await group.press('Enter');
  await expect(search.locator('.money-bulk .money-status')).toHaveText('Give the group a name, for example Weekend in Ghent.');
  await search.getByLabel('Group them as one, named').fill('Weekend in Ghent');
  await group.click();
  await expect(search.locator('.money-bulk .money-status')).toHaveText('3 entries grouped as Weekend in Ghent: one line in your lists, each still counted on its own.');
  await expect(group).toBeFocused();
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.filter(e => e.group).map(e => e.group!.name)).toEqual(['Weekend in Ghent', 'Weekend in Ghent', 'Weekend in Ghent']);
  // This week: one line for the group, its total by Spending's rule; the month's figure is unchanged.
  const week = box.getByRole('region', {name: 'This week'});
  const row = week.locator('li.money-group');
  await expect(row.locator('summary')).toContainText('Weekend in Ghent');
  await expect(row.locator('summary')).toContainText('3 entries · spent €162.40, received €20.00');
  await expect(monthLine).toHaveText('This month in EUR: spent €171.40, received €20.00.');
  await row.locator('summary').click();
  await expect(row.getByRole('list', {name: 'Entries in Weekend in Ghent'}).getByRole('listitem')).toHaveCount(3);
  const findings = await axe(page, box);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await row.getByRole('button', {name: 'Ungroup Weekend in Ghent'}).click();
  await expect(week.locator('li.money-group')).toHaveCount(0);
  await page.getByRole('button', {name: 'Undo ungrouping Weekend in Ghent'}).click();
  await expect(week.locator('li.money-group')).toHaveCount(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
