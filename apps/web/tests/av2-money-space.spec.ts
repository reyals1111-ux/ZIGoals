import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';
import {MONEY_LOG_BUSINESS_KEY_LITERAL, BUDGETS_BUSINESS_KEY_LITERAL} from '../lib/av2-money-r2-keys';

/**
 * Session AV lane 2, round 2 (money; Emma's Spaces): a business space started at the foot of Spending, its own entry and
 * budget written to its own records, the personal ones untouched, the switch at the top of Spending and Budgets (inside
 * Wealth's own sections; the shell and Today are not touched) — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: a business space kept apart`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '40.00', 'Groceries', 'expense', 'Market', 'EUR', 'av2r2-personal')]), [BUDGETS_KEY]: {version: 1, budgets: []}});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  await expect(box.getByRole('radiogroup', {name: 'Space'})).toHaveCount(0);
  await box.getByRole('button', {name: 'Keep business money apart: add a business space'}).click();
  await box.getByLabel('Name of the space').fill('Studio');
  await box.getByRole('button', {name: 'Add the space'}).click();
  const space = box.getByRole('radiogroup', {name: 'Space'});
  await expect(space.getByRole('radio', {name: 'Studio'})).toBeChecked();
  await expect(box).toContainText('Studio: its own entries and totals. Today, NOVA, bills and the rest of Wealth use Personal.');
  // The business space starts empty; an entry there goes to its own record.
  await expect(box.locator('.spending-lists')).toContainText('Nothing logged this week yet.');
  await box.getByRole('button', {name: 'Log spending'}).click();
  const form = box.getByRole('form', {name: 'Log spending or income'});
  await form.getByRole('radio', {name: 'Bills'}).check();
  await form.getByLabel('Amount', {exact: true}).fill('90');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_BUSINESS_KEY_LITERAL))?.entries.length).toBe(1);
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.map(e => e.id)).toEqual(['av2r2-personal']);
  const findings = await axe(page, box.locator('.money-space'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Budgets follow the space: a business budget in its own record.
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  await expect(budgets.getByRole('radiogroup', {name: 'Space'}).getByRole('radio', {name: 'Studio'})).toBeChecked();
  await budgets.getByRole('button', {name: '+ Set a monthly budget'}).click();
  // Session AV lane 2 (Budgets has more forms with a Category field (watch, payee, own budgets) and more Save budget buttons:
  // scoped to the "Set a monthly budget" form, deliberate)
  const set = budgets.getByRole('form', {name: 'Set a monthly budget'});
  await set.getByRole('combobox', {name: 'Category', exact: true}).selectOption('Bills');
  await set.getByRole('textbox', {name: 'Each month', exact: true}).fill('100');
  await set.getByRole('button', {name: 'Save budget', exact: true}).click();
  await expect.poll(async () => (await readRecord<{budgets: unknown[]}>(page, BUDGETS_BUSINESS_KEY_LITERAL))?.budgets.length).toBe(1);
  expect((await readRecord<{budgets: unknown[]}>(page, BUDGETS_KEY)).budgets).toEqual([]);
  // Back to Personal: its own entry is there, as before.
  await box.getByRole('radiogroup', {name: 'Space'}).getByRole('radio', {name: 'Personal'}).check();
  await expect(box.locator('.spending-bars')).toContainText('Groceries');
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
