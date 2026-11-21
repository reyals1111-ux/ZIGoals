import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';
import {BILLS_KEY} from '../lib/bills/schema';
import {MONEY_REVIEW_KEY} from '../lib/money-review/review';

/**
 * Session AV, owner follow-up 1 (F-MONEY-ATTENTION; YNAB's Spotlight): Today says in one line what in Wealth asks for a
 * look — entries to review, a budget over, a bill due within three days — and opens Wealth; with nothing asking there
 * is no line. At 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: one to review, groceries over, rent due tomorrow`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const spent = entry('2026-11-05', '260.00'), fun = entry('2026-11-12', '30.00', 'Fun', 'expense', undefined, 'EUR', 'ap-money-fun');
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([spent, fun]), [MONEY_REVIEW_KEY]: {version: 1, ids: ['ap-money-fun']},
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: false, since: '2026-11'}]},
    [BILLS_KEY]: {version: 1, bills: [{id: 'r1', title: 'Fictional rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-15', origin: 'manual', createdAt: '2026-10-01T10:00:00.000Z'}], dismissed: []}});
  await page.goto('/app'); await hydrated(page);
  const line = page.getByRole('region', {name: 'Money that asks for a look'});
  await expect(line).toHaveText('Money: 1 entry to review · Groceries over budget · Fictional rent due tomorrow →');
  await expect(line.getByRole('link')).toHaveAttribute('href', '/app/wealth');
  const findings = await axe(page, line);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('nothing asks: no money line on Today', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-05', '20.00')])});
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('region', {name: 'Money that asks for a look'})).toHaveCount(0);
});
