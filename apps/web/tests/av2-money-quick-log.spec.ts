import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending, TODAY} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 2 (money; Wallet's record templates and payment types, Emma's subcategories): Wealth →
 * Spending — a subcategory added under Food & drink and chosen, "Paid with", the form kept as a saved entry, one tap on
 * the saved entry logging it today with Undo, the month by method and by subcategory, and the search's Paid with filter
 * — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: subcategory, paid with, a saved entry in one tap`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '40.00', 'Groceries', 'expense', 'Market')])});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  await box.getByRole('button', {name: 'Log spending'}).click();
  const form = box.getByRole('form', {name: 'Log spending or income'});
  await form.getByRole('radio', {name: 'Food & drink'}).check();
  await form.locator('summary', {hasText: 'Add a subcategory under Food & drink'}).click();
  await form.getByLabel('New subcategory').fill('Coffee');
  await form.getByRole('button', {name: 'Add subcategory'}).click();
  await expect(form.getByRole('radio', {name: 'Coffee'})).toBeChecked();
  await form.getByLabel('Amount', {exact: true}).fill('3.20');
  await form.getByLabel('Paid with — optional').selectOption('debit');
  await form.getByLabel('Note — optional').fill('Corner café');
  await form.getByRole('button', {name: 'Keep as a saved entry'}).click();
  await form.getByLabel('Name of the saved entry').fill('Coffee');
  await form.getByRole('button', {name: 'Add to saved entries'}).click();
  await expect(form).toContainText('Kept as a saved entry: Coffee');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.find(e => e.sub === 'Coffee')).toMatchObject({amount: '3.20', category: 'Food & drink', paidWith: 'debit'});
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).subs).toEqual({'Food & drink': ['Coffee']});
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).saved).toEqual([expect.objectContaining({name: 'Coffee', amount: '3.20', sub: 'Coffee', paidWith: 'debit'})]);
  await form.getByRole('button', {name: 'Done'}).click();
  // One tap on the saved entry logs it again, dated today, with Undo.
  const chip = box.getByRole('button', {name: 'Log Coffee €3.20 today'});
  await chip.click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.sub === 'Coffee' && e.date === TODAY).length).toBe(2);
  await page.getByRole('button', {name: 'Undo logging Coffee'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.sub === 'Coffee').length).toBe(1);
  // The week list names the path and the method; This month shows them apart.
  await expect(box.locator('.spending-entries').first()).toContainText('Food & drink › Coffee');
  await expect(box.locator('.spending-entries').first()).toContainText('Debit card');
  await expect(box.locator('.quick-methods')).toContainText('Debit card €3.20');
  await expect(box.locator('.quick-sub-line')).toContainText('Food & drink: Coffee €3.20');
  const findings = await axe(page, box);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Search: Paid with → Debit card finds the one.
  await box.locator('summary', {hasText: 'Search all your entries'}).click();
  await box.locator('.money-search summary', {hasText: 'More filters'}).click();
  await page.getByRole('search', {name: 'Search all your entries'}).getByLabel('Paid with').selectOption('debit');
  await expect(page.getByRole('list', {name: 'Entries found'}).getByRole('listitem')).toHaveCount(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
