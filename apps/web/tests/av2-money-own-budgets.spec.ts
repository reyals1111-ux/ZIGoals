import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY, type BudgetsRecord} from '../lib/budgets/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';
import {MONEY_TAGS_KEY} from '../lib/money-tags/schema';

/**
 * Session AV lane 2, round 2 (money; Spendee, Wallet, Emma): Wealth → Budgets — "about €X a day left" on a budget row,
 * a one-time budget on a tag across categories (spent, left, days to go), and an amount a month on a watched payee (spent,
 * left, near the limit) — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is
 * Saturday 14 November 2026 (17 days to go); fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: a day left, a budget on a tag, a payee budget`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const trip = entry('2026-11-08', '120.00', 'Transport', 'expense', 'Train', 'EUR', 'av2r2-trip'), hotel = entry('2026-11-09', '80.00', 'Fun', 'expense', 'Hotel', 'EUR', 'av2r2-hotel');
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-03', '130.00', 'Groceries', 'expense', 'Albert Heijn'), trip, hotel]),
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}], payees: [{payee: 'Albert Heijn', currency: 'EUR'}]},
    [MONEY_TAGS_KEY]: {version: 1, tags: {'av2r2-trip': ['holiday'], 'av2r2-hotel': ['holiday']}},
  });
  const box = await openWealthSection(page, 'budgets', 'Budgets by category');
  // €170 left over 17 days: about €10.00 a day.
  await expect(box.locator('.budgets-per-day')).toHaveText('About €10.00 a day left for 17 days.');
  // A one-time budget on the tag "holiday".
  await box.getByRole('button', {name: '+ Add your own budget'}).click();
  const form = box.getByRole('form', {name: 'Add your own budget'});
  await form.getByLabel('Name').fill('Holiday');
  await form.getByLabel('Amount').fill('500');
  await form.getByRole('radio', {name: 'Entries with a tag'}).check();
  await form.getByLabel('Tag').selectOption('holiday');
  await form.getByLabel('First day').fill('2026-11-01');
  await form.getByLabel('Last day').fill('2026-11-30');
  await form.getByRole('button', {name: 'Save budget'}).click();
  const own = box.locator('.budgets-own-list li', {hasText: 'Holiday'});
  await expect(own).toContainText('€200.00 of €500.00 · €300.00 left · 17 days to go · about €17.64 a day');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).budgets).toEqual([expect.objectContaining({name: 'Holiday', tag: 'holiday', every: 'once', from: '2026-11-01', to: '2026-11-30', amount: '500.00'})]);
  // A payee budget: €130 of €150, near the limit.
  await box.getByRole('button', {name: 'Set the amount a month for Albert Heijn'}).click();
  await box.getByLabel('Each month (EUR)').fill('150');
  await box.getByRole('button', {name: 'Save amount'}).click();
  await expect(box.locator('.budgets-payee-budget')).toContainText('Budget €150.00 a month · €20.00 left · near the limit');
  expect((await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).payees).toEqual([{payee: 'Albert Heijn', currency: 'EUR', amount: '150.00'}]);
  await expect(box.getByRole('button', {name: 'Change the amount a month for Albert Heijn'})).toBeFocused();
  const findings = await axe(page, box);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Remove with Undo.
  await own.getByRole('button', {name: 'Remove the budget Holiday'}).click();
  await expect.poll(async () => (await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).budgets).toBeUndefined();
  await page.getByRole('button', {name: /^Undo/}).click();
  await expect(box.locator('.budgets-own-list li', {hasText: 'Holiday'})).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
