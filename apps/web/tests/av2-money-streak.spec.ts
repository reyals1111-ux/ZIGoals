import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar's streaks, LEDGER #427): the money streak is off by default (no line on
 * Spending); turned on in Yesterday's money it shows "Days in a row you looked at your money", never an amount; one day
 * off is fine; "I looked at my money today" counts today and keeps focus on the line — at 390 and 1440 in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
for (const theme of THEMES) test(`${theme}: a calm money streak, off until chosen`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  // Entries logged on Wed 11 and Thu 12 November; nothing on Friday 13 (a day off), today still open.
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-11', '12.00', 'Groceries', 'expense', 'Market'), entry('2026-11-12', '4.00', 'Food & drink', 'expense', 'Coffee')])});
  await page.goto('/app/wealth'); await hydrated(page);
  const section = spending(page);
  await expect(section.locator('.money-streak')).toHaveCount(0);
  const fold = section.locator('.money-yesterday-fold');
  await fold.locator('summary').click();
  const choice = fold.getByRole('checkbox', {name: /Days in a row you looked at your money, on Spending/});
  await expect(choice).not.toBeChecked();
  await choice.check();
  const line = section.locator('.money-streak');
  await expect(line).toContainText('Days in a row you looked at your money: 2. A day off is fine.');
  await expect(line).not.toContainText('€');
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).streak).toEqual({on: true});
  const findings = await axe(page, line);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await line.getByRole('button', {name: 'I looked at my money today'}).click();
  await expect(line).toContainText('Days in a row you looked at your money: 3, today too.');
  await expect(line).toBeFocused();
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).streak?.looked).toEqual(['2026-11-14']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
