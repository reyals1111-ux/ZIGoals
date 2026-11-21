import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY, type BudgetsRecord} from '../lib/budgets/schema';

/**
 * Session AV, owner follow-up 1 (F-WATCH; Rocket Money's Watchlist): Budgets by category → "Watching": Dining followed
 * without a budget, this month so far against last month by the same day, then no longer watched — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: Dining watched, €65 so far against €30 last month by this day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-05', '40.00', 'Dining'), entry('2026-11-12', '25.00', 'Dining'), entry('2026-10-10', '30.00', 'Dining'), entry('2026-10-28', '50.00', 'Dining')])});
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  const watch = section.getByRole('region', {name: 'Watching'});
  await expect(watch).toContainText('Follow a category without giving it a budget');
  const form = watch.getByRole('form', {name: 'Watch a category'});
  await form.getByLabel('Category').fill('Dining');
  await form.getByRole('button', {name: 'Watch'}).click();
  await expect(watch.getByRole('listitem')).toHaveText(/^Dining · €65\.00 so far · €30\.00 by this day last month \(\+€35\.00\)\s*Stop watching$/);
  expect((await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).watch).toEqual([{category: 'Dining', currency: 'EUR'}]);
  const findings = await axe(page, watch);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await watch.getByRole('button', {name: 'Stop watching Dining in EUR'}).click();
  await expect(watch.getByRole('listitem')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
