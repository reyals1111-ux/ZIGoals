import {expect, test} from '@playwright/test';
import {openPhoneRow} from './phone-length-folds';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {NOTIFY_KEY, type NotifyPrefs} from '../lib/notify/prefs';

/**
 * Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384): Wealth → Spending → "Yesterday's money": the
 * day's entries counted, spent and received by Spending's own rule (a shared cost by its share, a left-out entry not at
 * all), the cash balance; the two choices (a morning notification, a quiet line on Today) are off until chosen and kept
 * in the notification prefs; Today then shows a plain-text line with no Tab stop — at 390 and 1440 in Nebula, Light and
 * Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z', ACCOUNT = '00000000-0000-4000-8000-0000000c0001';
for (const theme of THEMES) test(`${theme}: yesterday's money, with a morning notification and a line on Today`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const shared = {...entry('2026-11-13', '90.00', 'Food & drink', 'expense', 'Dinner with friends'), share: '30.00'}, left = {...entry('2026-11-13', '50.00', 'Other'), excluded: true as const};
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [{id: ACCOUNT, kind: 'cash', name: 'Current account', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000c9999', date: '2026-11-01', value: '123000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]},
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-13', '42.10', 'Groceries', 'expense', 'Market'), shared, left, entry('2026-11-14', '3.00', 'Fun')]),
  });
  await page.goto('/app/wealth'); await hydrated(page);
  // Session AV lane 2 (fix2011; deliberate): on a phone Spending's later parts are one row, "More about your money"
  // (tests/phone-length-folds.ts: there and closed on a phone, absent at 1440); it is opened, then checked as before.
  await openPhoneRow(page, 'More about your money', spending(page));
  const fold = spending(page).locator('.money-yesterday-fold');
  await fold.locator('summary').click();
  const panel = fold.locator('.money-yesterday');
  await expect(panel.locator('.money-yesterday-day')).toHaveText('Fri, Nov 13, 2026: 3 entries logged.');
  await expect(panel.getByRole('list', {name: 'Spent and received yesterday'})).toContainText('spent €72.10');
  await expect(panel.getByRole('list', {name: 'Cash and savings balances'})).toContainText('Current account');
  await expect(panel.getByRole('list', {name: 'Cash and savings balances'})).toContainText('€1,230.00');
  const morning = panel.getByRole('checkbox', {name: /A notification each morning/}), onToday = panel.getByRole('checkbox', {name: 'A quiet line on Today'});
  await expect(morning).not.toBeChecked(); await expect(onToday).not.toBeChecked();
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await morning.check();
  await expect(panel.getByRole('status')).toHaveText('Each morning, a notification says how many entries you logged the day before.');
  await expect(panel).toContainText('Notifications are not on on this device yet');
  await onToday.check();
  await expect(panel.getByRole('status')).toHaveText('Today shows a quiet line with yesterday’s money.');
  const prefs = await readRecord<NotifyPrefs>(page, NOTIFY_KEY);
  expect(prefs.types.moneyMorning).toBe(true);
  expect(prefs.moneyMorning).toEqual({onToday: true});
  // Today: one plain-text line, no Tab stop of its own.
  await page.goto('/app'); await hydrated(page);
  const line = page.getByRole('region', {name: 'Money that asks for a look'}).locator('.today-yesterday-money');
  await expect(line).toHaveText('Yesterday: 3 entries · spent €72.10');
  await expect(line.locator('a, button')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
