import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's what-if scenarios, LEDGER #388): Money tools → Next 60 days → "Try a
 * change — a model": a one-off €2,000 is drawn as a dashed second line beside the forecast, said in words, nothing is
 * written until the person keeps it by name; Remove offers Undo — at 390 and 1440 in Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z';
for (const theme of THEMES) test(`${theme}: try a change on the cash forecast`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [{id: '00000000-0000-4000-8000-0000000e0001', kind: 'cash', name: 'Current account', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000e0009', date: '2026-11-01', value: '500000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]},
    [MONEY_LOG_KEY]: {version: 1, entries: [], weekStartsOn: 'monday'},
  });
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('group', {name: 'Money tools'}).getByRole('button', {name: 'Next 60 days'}).click();
  const forecast = spending(page).locator('.cash-forecast');
  const fold = forecast.locator('.money-whatif-fold');
  await fold.locator('summary').click();
  const panel = fold.locator('.money-whatif');
  await expect(panel).toContainText('A model, not a plan.');
  await panel.getByLabel('Amount (EUR)').fill('2000');
  await panel.getByLabel('On', {exact: true}).fill('2026-12-20');
  await panel.getByLabel('What it is — optional').fill('A trip');
  await panel.getByRole('button', {name: 'Try this change'}).click();
  await expect(panel.getByRole('list', {name: 'Changes tried'})).toContainText('A trip: €2,000.00 more out on Dec 20, 2026');
  await expect(panel.locator('.money-whatif-line')).toHaveCount(1);
  await expect(panel.locator('.money-whatif-words')).toContainText('with your changes around Dec 20, 2026: about €3,000');
  expect(await readRecord<MoneyMore | null>(page, MONEY_MORE_KEY)).toBeNull(); // nothing written while trying
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByLabel('Keep these changes as').fill('Winter trip');
  await panel.getByRole('button', {name: 'Keep on this device'}).click();
  await expect(panel.getByRole('status')).toHaveText('Kept on this device as “Winter trip”.');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).whatIfs).toEqual([{id: expect.any(String), name: 'Winter trip', currency: 'EUR', changes: [{kind: 'once', dir: 'out', amount: '2000.00', from: '2026-12-20', label: 'A trip'}]}]);
  await panel.getByRole('button', {name: 'Remove Winter trip'}).click();
  await expect(panel.getByRole('heading', {name: 'Try a change'})).toBeFocused();
  await page.getByRole('button', {name: 'Undo removing Winter trip'}).click();
  await expect(panel.getByRole('button', {name: 'Open Winter trip'})).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
