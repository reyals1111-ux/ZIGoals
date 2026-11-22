import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openInsight, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's needs, wants and savings, Simplifi's waterfall; LEDGER #295, #297):
 * Wealth → Spending → Your money over time → "Needs, wants and saving" (the person marks categories; the month's shares
 * of income as facts, never a target) and "What changed" (from last month's total to this month's, a step per category,
 * largest first) — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday
 * 14 November 2026; fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: needs, wants and saving; what changed since last month`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([
    entry('2026-10-03', '100.00', 'Groceries'), entry('2026-10-05', '60.00', 'Fun'),
    entry('2026-11-01', '2000.00', 'Salary', 'income', 'Employer'), entry('2026-11-03', '800.00', 'Home'), entry('2026-11-04', '180.00', 'Groceries'), entry('2026-11-05', '20.00', 'Fun'),
  ])});
  const panel = await openInsight(page, 'Needs, wants and saving');
  await expect(panel.getByRole('heading', {name: 'Needs, wants and saving'})).toBeVisible();
  await expect(panel).not.toContainText(/50\s*\/\s*30\s*\/\s*20/);
  await panel.locator('summary', {hasText: 'Mark your categories'}).click();
  await panel.getByLabel('Home').selectOption('need');
  await panel.getByLabel('Groceries').selectOption('need');
  await panel.getByLabel('Fun').selectOption('want');
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).needWant).toEqual({Home: 'need', Groceries: 'need', Fun: 'want'});
  const table = panel.locator('.needs-wants-table');
  await expect(table.locator('caption')).toHaveText('Nov 2026 in EUR: €2,000.00 income logged');
  await expect(table.getByRole('row', {name: /^Needs/})).toContainText('€980.00 · 49% of income');
  await expect(table.getByRole('row', {name: /^Wants/})).toContainText('€20.00 · 1% of income');
  await expect(table.getByRole('row', {name: /^Not spent/})).toContainText('€1,000.00 · 50% of income');
  let findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // What changed: €160.00 by 14 October to €1,000.00 so far, Home first.
  const changed = await openInsight(page, 'What changed');
  await expect(changed.getByRole('heading', {name: 'What changed · EUR'})).toBeVisible();
  const rows = changed.locator('.money-insights-table tbody tr');
  await expect(rows.first()).toContainText('€160.00');
  await expect(rows.nth(1)).toContainText('Home');
  await expect(rows.nth(1)).toContainText('+€800.00');
  await expect(rows.last()).toContainText('€1,000.00');
  await changed.getByRole('button', {name: 'Last month, whole'}).click();
  await expect(changed.getByRole('button', {name: 'Last month, whole'})).toHaveAttribute('aria-pressed', 'true');
  await expect(changed).toContainText('Sep 2026 has no records in EUR, so there is nothing to compare yet.');
  findings = await axe(page, changed);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
