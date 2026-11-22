import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_REVIEW_KEY} from '../lib/money-review/review';

/**
 * Session AV lane 2 (money; Rocket Money, Monarch, Copilot, YNAB): Wealth → Spending — an own category, an entry left
 * out of the figures, the drill-down from "This month by category" into its entries, Select with a new category for
 * several at once, the exclude filter, and the category suggested on an imported entry in To review — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: own category, left out, drill-down and several at once`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const imported = entry('2026-11-12', '9.40', 'Other', 'expense', 'Pet shop · card', 'EUR', 'av2-imported');
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-02', '30.00', 'Groceries', 'expense', 'Market'), entry('2026-11-09', '22.00', 'Groceries', 'expense', 'Pet shop'), entry('2026-10-20', '15.00', 'Shopping', 'expense', 'Pet shop'), imported]),
    [MONEY_REVIEW_KEY]: {version: 1, ids: ['av2-imported']},
  });
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  // An own category, then an entry left out of the figures.
  await box.getByRole('button', {name: 'Log spending'}).click();
  const form = box.getByRole('form', {name: 'Log spending or income'});
  await form.locator('summary', {hasText: 'Your own categories'}).click();
  await form.getByLabel('New category').fill('Pets');
  await form.getByRole('button', {name: 'Add category'}).click();
  await expect(form.getByRole('radio', {name: 'Pets'})).toBeChecked();
  await form.getByLabel('Amount', {exact: true}).fill('12');
  await form.getByLabel(/^Not part of my spending/).check();
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.own).toEqual({expense: ['Pets']});
  expect(log.entries.find(e => e.category === 'Pets')).toMatchObject({amount: '12.00', excluded: true});
  await expect(box.getByRole('list').filter({hasText: 'Left out'}).first()).toBeVisible();
  // This month by category counts what counts: Groceries €52.00, Pets left out.
  await expect(box.locator('.spending-bars')).toContainText('€52.00');
  await expect(box.locator('.spending-bars')).not.toContainText('Pets');
  // Drill-down: Groceries opens the search on this month's Groceries.
  await box.getByRole('button', {name: "See this month's Groceries entries"}).click();
  const found = page.getByRole('list', {name: 'Entries found'});
  await expect(found.getByRole('listitem')).toHaveCount(2);
  await expect(box.locator('.money-search .money-select-total').first()).toHaveText('2 found · −€52.00');
  // Several at once: both into Pets, the record keeps what each was.
  await box.locator('.money-search').getByRole('button', {name: 'Select', exact: true}).click();
  await box.getByRole('button', {name: 'Select all 2'}).click();
  const bulk = box.getByRole('group', {name: 'Change the selected entries'});
  await expect(bulk).toContainText('2 selected · −€52.00');
  await bulk.getByLabel('New category').selectOption('Pets');
  await bulk.getByRole('button', {name: 'Change category'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.category === 'Pets' && e.history?.[0]?.by === 'bulk').length).toBe(2);
  const findings = await axe(page, box.locator('.money-search'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // The exclude filter: every Pet shop left out of the results.
  await box.locator('.money-search summary', {hasText: 'More filters'}).click();
  const search = page.getByRole('search', {name: 'Search all your entries'});
  await search.getByLabel('Leave out entries with').fill('pet');
  await search.getByLabel('Category', {exact: true}).selectOption('');
  await expect(found.getByRole('listitem')).toHaveCount(1);
  await expect(found).toContainText('Market');
  // To review: the imported pet shop gets the category its payee had before.
  await box.getByRole('button', {name: /^To review \(1\)/}).click();
  const suggest = box.locator('.money-review-suggest');
  await expect(suggest).toContainText('Before, “Pet shop” was');
  await suggest.getByRole('button').click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.find(e => e.id === 'av2-imported')?.history?.[0]?.field).toBe('category');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
