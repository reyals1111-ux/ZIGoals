import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {BUDGETS_KEY} from '../lib/budgets/schema';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 6 (money; Banktivity's refund, LEDGER #425): Wealth → Spending → Log spending → "Refund": €30 back
 * for a €100 groceries purchase lowers Groceries (Spending's month says €70.00 spent, nothing received) and its budget, and
 * is stored as income with `refund` so an older build reads it as money received — at 390 and 1440 in Nebula, Light and
 * Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
for (const theme of THEMES) test(`${theme}: a refund lowers its category and its budget, never income`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const bought = entry('2026-11-10', '100.00', 'Groceries', 'expense', 'Market');
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([bought]),
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01'}]},
  });
  await page.goto('/app/wealth'); await hydrated(page);
  const section = spending(page);
  await section.getByRole('button', {name: 'Log spending'}).click();
  const form = section.getByRole('form', {name: 'Log spending or income'});
  await form.getByRole('radiogroup', {name: 'Kind'}).getByText('Refund', {exact: true}).click();
  await form.getByLabel('Amount').fill('30');
  await form.locator('fieldset.spending-cats').getByText('Groceries', {exact: true}).click();
  await expect(form.locator('.money-refund-of')).toContainText('A refund lowers Groceries: its spending, its budget and this month’s figures. It is never counted as money received.');
  await form.getByLabel('The purchase it refunds — optional').selectOption(bought.id);
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(section.locator('.spending-status')).toHaveText('Refund €30.00 · Groceries · saved; it lowers Groceries.');
  await expect(section.getByText('This month in EUR: spent €70.00, received €0.00.')).toBeVisible();
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.find(e => e.refund)).toMatchObject({kind: 'income', refund: true, refundOf: bought.id, category: 'Groceries', amount: '30.00'});
  await expect(section.locator('.spending-entries')).toContainText('Refund');
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  await expect(budgets.locator('.budgets-table tbody').first().locator('.budgets-num').first()).toHaveText('€70.00');
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
