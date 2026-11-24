import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openInsight, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's Query Tool, LEDGER #344): Wealth → Spending → Search all your entries
 * → "Save this search", then Your money over time → "Saved searches" draws it by month (with the monthly average), by
 * week or by category, with its total and a table; "Open a saved search" sets its filters again; Remove with Undo — at
 * 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026;
 * fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: a saved search drawn as a chart`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([
    entry('2026-09-02', '8.00', 'Food & drink', 'expense', 'Café Noël'), entry('2026-10-10', '12.00', 'Food & drink', 'expense', 'Café Noël'),
    entry('2026-11-03', '10.00', 'Food & drink', 'expense', 'Café Noël'), entry('2026-11-04', '900.00', 'Home', 'expense', 'Rent'),
  ])});
  const panel = await openInsight(page, 'Saved searches');
  await expect(panel).toContainText('No saved searches yet.');
  const box = spending(page);
  await box.locator('summary', {hasText: 'Search all your entries'}).click();
  const search = box.locator('.money-search');
  await search.getByLabel('Words or an amount').fill('café');
  await search.getByLabel('Save this search as').fill('Eating out');
  await search.getByRole('button', {name: 'Save this search'}).click();
  await expect(search.locator('.money-saved-row [role="status"]')).toHaveText('Saved as Eating out. Your money over time → Saved searches draws it as a chart, with its total and monthly average.');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).questions).toEqual([{id: expect.stringMatching(/^q_/), name: 'Eating out', text: 'café'}]);
  // The view: by month with the monthly average, a table of every bar.
  await expect(panel.locator('.money-saved-total')).toHaveText('Eating out · EUR: spent €30.00 from Sep 2, 2026 to Nov 14, 2026 (3 entries counted), €10.00 a month on average over 3 months.');
  await expect(panel.locator('svg[role="img"]')).toBeVisible();
  await expect(panel.getByRole('row', {name: /Oct 2026/})).toContainText('€12.00');
  let findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'By category'}).click();
  await expect(panel.getByRole('button', {name: 'By category'})).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('row', {name: /Food & drink/})).toContainText('€30.00');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).questions![0]!.by).toBe('category');
  // Opened again in the search: its filters are set.
  await search.getByLabel('Words or an amount').fill('');
  await search.getByLabel('Open a saved search').selectOption({label: 'Eating out'});
  await expect(search.getByLabel('Words or an amount')).toHaveValue('café');
  findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'Remove the saved search Eating out'}).click();
  await expect(panel).toContainText('No saved searches yet.');
  await page.getByRole('button', {name: 'Undo removing Eating out'}).click();
  await expect(panel.locator('.money-saved-total')).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
