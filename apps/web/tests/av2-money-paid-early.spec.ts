import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {BILLS_KEY, type BillsRecord} from '../lib/bills/schema';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's "fix this bill", LEDGER #386): Upcoming bills → Bill tracker → a due
 * date shown as passed → "Paid early?": the expenses of the 14 days before it with the bill's amount, "This was it"
 * counts one as that payment (the bill's match words learn its payee; the date then shows as paid), with Undo — at 390
 * and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026.
 */
for (const theme of THEMES) test(`${theme}: a passed bill date paid early`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [BILLS_KEY]: {version: 1, dismissed: [], bills: [{id: 'rent', title: 'Rent', amount: '800.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-10', origin: 'manual', createdAt: '2026-06-01T09:00:00.000Z'}]},
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '800.00', 'Home', 'expense', 'Landlord'), entry('2026-11-05', '12.00', 'Groceries', 'expense', 'Market')]),
  });
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  await bills.locator('summary', {hasText: 'Bill tracker'}).click();
  const tracker = bills.getByRole('region', {name: 'Bill tracker'});
  await expect(tracker).toContainText('date passed, not in your money log');
  const early = tracker.getByRole('button', {name: 'Paid early? Rent of Nov 10, 2026'});
  await early.click();
  await expect(early).toHaveAttribute('aria-expanded', 'true');
  const list = tracker.getByRole('list', {name: 'Expenses that could be Rent of Nov 10, 2026'});
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Landlord');
  await expect(list).toContainText('9 days before');
  const findings = await axe(page, tracker);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await list.getByRole('button', {name: 'Count Landlord of Nov 1, 2026 as Rent of Nov 10, 2026'}).click();
  await expect(tracker.getByRole('status')).toContainText('Rent of Nov 10, 2026: paid early on Nov 1, 2026.');
  await expect(tracker).toContainText('paid: in your money log');
  await expect(tracker.getByRole('heading', {name: 'To pay this month'})).toBeFocused();
  expect((await readRecord<BillsRecord>(page, BILLS_KEY)).bills[0]!.matchKey).toBe('EUR|Home|landlord|monthly');
  await page.getByRole('button', {name: 'Undo counting Rent as paid early'}).click();
  await expect(tracker).toContainText('date passed, not in your money log');
  expect((await readRecord<BillsRecord>(page, BILLS_KEY)).bills[0]!.matchKey).toBeUndefined();
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
