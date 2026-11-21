import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV, owner follow-up 1 (F-MONEY-SEARCH; Copilot, Monarch, YNAB): Wealth → Spending → "Search all your entries":
 * words, kind, category and dates across the whole log, newest first, the total of what was found, and Edit opening the
 * usual form — at 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: "cafe" finds two entries months apart, with their total`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-08-02', '12.50', 'Dining', 'expense', 'Café Noël with Sam'), entry('2026-10-14', '40.00', 'Groceries', 'expense', 'Weekly shop'), entry('2026-11-06', '4.20', 'Dining', 'expense', 'cafe on the corner'), entry('2026-11-05', '2000.00', 'Salary', 'income')])});
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).locator('summary', {hasText: 'Search all your entries'}).click();
  const form = page.getByRole('search', {name: 'Search all your entries'});
  await expect(spending(page).locator('.money-search .money-select-total')).toHaveText('Type a word or choose a filter to search all 4 entries.');
  await form.getByLabel('Words or an amount').fill('cafe');
  const found = page.getByRole('list', {name: 'Entries found'});
  await expect(found.getByRole('listitem')).toHaveCount(2);
  await expect(found.getByRole('listitem').first()).toContainText('cafe on the corner');
  await expect(spending(page).locator('.money-search .money-select-total')).toHaveText('2 found · −€16.70');
  await form.getByLabel('Words or an amount').fill('');
  await form.getByLabel('Kind').selectOption('income');
  await expect(spending(page).locator('.money-search .money-select-total')).toHaveText('1 found · +€2,000.00');
  // Session AV (fresh-agent check q2, rank 21; Monarch, Copilot): an amount range.
  await form.getByLabel('Kind').selectOption('expense');
  await form.getByLabel('Amount from').fill('10');
  await form.getByLabel('Amount up to').fill('50');
  await expect(spending(page).locator('.money-search .money-select-total')).toHaveText('2 found · −€52.50');
  await form.getByLabel('Amount from').fill('');
  await form.getByLabel('Amount up to').fill('');
  await form.getByLabel('Kind').selectOption('income');
  await expect(spending(page).locator('.money-search .money-select-total')).toHaveText('1 found · +€2,000.00');
  const findings = await axe(page, spending(page).locator('.money-search'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await found.getByRole('button', {name: /^Edit Salary 2000.00 EUR/}).click();
  await expect(page.getByLabel('Amount', {exact: true}).first()).toHaveValue('2000.00');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
