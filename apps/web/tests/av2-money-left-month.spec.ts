import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {hydrated} from './ah-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';
import {BILLS_KEY} from '../lib/bills/schema';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Leftover, Simplifi's planned spending and projected cash flow; LEDGER
 * #291, #292, #294): Budgets → "Left this month" with each part listed, a planned one-off cost added there (and counted),
 * cleared with Undo, the cash forecast at 6 months with each month's lowest point, and the quiet line on Today — at 390
 * and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026;
 * fictional records; the API offline.
 */
const at = '2026-11-01T10:00:00.000Z', ACC = '00000000-0000-4000-8000-0000000003a1';
for (const theme of THEMES) test(`${theme}: left this month, a planned cost, the forecast by month`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '2000.00', 'Salary', 'income', 'Employer'), entry('2026-11-03', '120.00', 'Groceries', 'expense', 'Market')]),
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}], onToday: true},
    [BILLS_KEY]: {version: 1, dismissed: [], bills: [{id: 'b1', title: 'Phone', amount: '20.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-28', origin: 'manual', createdAt: at}]},
    [ACCOUNTS_KEY]: {version: 1, items: [{id: ACC, kind: 'cash', name: 'Current', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000003b1', date: '2026-11-14', value: '100000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]},
  });
  const box = await openWealthSection(page, 'budgets', 'Budgets by category');
  const left = box.getByRole('region', {name: 'Left this month'});
  // €2,000 income − €120 spent − €180 still in Groceries − €20 Phone still due.
  await expect(left.locator('.left-month-figure')).toHaveText('€1,680.00 left · EUR');
  await expect(left.locator('.left-month-parts')).toContainText('Bills still due, no budget covers them (1)');
  // A planned one-off cost, added from Left this month.
  await left.locator('summary', {hasText: 'Planned one-off costs'}).click();
  const form = left.getByRole('form', {name: 'Add a planned cost'});
  await form.getByLabel('What').fill('Birthday present');
  await form.getByLabel('Amount').fill('60');
  await form.getByLabel('Currency').selectOption('EUR');
  // Session AV lane 2 (fixb3: "On" also matched "Category — optional", deliberate): the field named exactly On.
  await form.getByLabel('On', {exact: true}).fill('2026-11-27');
  await form.getByRole('button', {name: 'Add planned cost'}).click();
  await expect(left.locator('.left-month-figure')).toHaveText('€1,620.00 left · EUR');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).planned).toEqual([expect.objectContaining({name: 'Birthday present', amount: '60.00', currency: 'EUR', date: '2026-11-27'})]);
  const findings = await axe(page, box);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Cleared with Undo: focus goes to the list's heading, never to the page.
  await left.getByRole('button', {name: 'Clear Birthday present'}).click();
  await expect(left.locator('.left-month-figure')).toHaveText('€1,680.00 left · EUR');
  await expect(left.getByRole('heading', {name: 'Planned one-off costs'})).toBeFocused();
  await page.getByRole('button', {name: /^Undo/}).click();
  await expect(left.locator('.left-month-figure')).toHaveText('€1,620.00 left · EUR');
  // The forecast at 6 months, with each month's lowest point; the length is kept on this device.
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('group', {name: 'Money tools'}).getByRole('button', {name: 'Next 60 days'}).click();
  const forecast = spending(page).locator('.cash-forecast');
  await forecast.getByRole('group', {name: 'How far ahead'}).getByRole('button', {name: '6 months'}).click();
  await expect(forecast.getByRole('heading', {name: 'Next 6 months'})).toBeVisible();
  await expect(forecast.getByRole('button', {name: '6 months'})).toHaveAttribute('aria-pressed', 'true');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).forecast).toBe('6m');
  const months = forecast.locator('.forecast-months table');
  await expect(months.locator('caption')).toContainText('An estimate from your own records, not a promise.');
  await expect(months.locator('tbody tr')).toHaveCount(7); // Nov to May
  await expect(forecast.locator('.cash-forecast-events', {hasText: 'Dated items'}).locator('summary')).toBeVisible();
  // Today: the quiet line under Budgets left, with no Tab stop of its own.
  await page.goto('/app'); await hydrated(page);
  const money = page.getByRole('region', {name: 'Money that asks for a look'});
  await expect(money.locator('.today-left-month')).toHaveText('Left this month: €1,620.00');
  await expect(money.locator('.today-left-month a, .today-left-month button')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
