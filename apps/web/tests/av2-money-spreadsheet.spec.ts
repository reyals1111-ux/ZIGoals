import {readFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {openPhoneRow} from './phone-length-folds';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Foundation Template, LEDGER #389): Wealth → Spending → "Your money as a
 * spreadsheet": the range's entries as a sortable table with what the figures count (a shared cost by its share, a
 * left-out entry not at all), each category month by month, and a CSV and an .xlsx made on the device — the CSV keeps a
 * formula-looking note as text — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
for (const theme of THEMES) test(`${theme}: money as a spreadsheet`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-03', '42.10', 'Groceries', 'expense', 'Market'), {...entry('2026-11-05', '90.00', 'Food & drink', 'expense', '=SUM(A1)'), share: '30.00'}, {...entry('2026-11-06', '50.00', 'Other'), excluded: true}, entry('2026-10-02', '12.00', 'Fun')])});
  await page.goto('/app/wealth'); await hydrated(page);
  // Session AV lane 2 (fix2011; deliberate): on a phone Spending's later parts are one row, "More about your money"
  // (tests/phone-length-folds.ts: there and closed on a phone, absent at 1440); it is opened, then checked as before.
  await openPhoneRow(page, 'More about your money', spending(page));
  const fold = spending(page).locator('.money-sheet-fold');
  await fold.locator('summary').click();
  const sheet = fold.locator('.money-sheet');
  const table = sheet.getByRole('region', {name: 'Entries table, personal'}).locator('table');
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').nth(0)).toContainText('left out');
  await expect(table.locator('tbody tr').nth(1)).toContainText('€30.00');
  await table.getByRole('button', {name: 'Amount'}).click();
  await expect(table.getByRole('columnheader', {name: /Amount/})).toHaveAttribute('aria-sort', 'descending');
  await sheet.getByRole('group', {name: 'Which entries'}).getByRole('button', {name: 'Last 3 months'}).click();
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await expect(sheet.getByRole('region', {name: 'Month by month, EUR'})).toContainText('Groceries');
  const findings = await axe(page, sheet);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const [csv] = await Promise.all([page.waitForEvent('download'), sheet.getByRole('button', {name: 'Download as CSV'}).click()]);
  expect(csv.suggestedFilename()).toBe('zigoals-money-2026-09-01-to-2026-11-14.csv');
  const text = await readFile((await csv.path())!, 'utf8');
  expect(text).toContain('"\'=SUM(A1)"');
  expect(text).toContain('"90.00","30.00","EUR","counted"');
  const [xlsx] = await Promise.all([page.waitForEvent('download'), sheet.getByRole('button', {name: 'Download for Excel, Numbers or Sheets (.xlsx)'}).click()]);
  expect(xlsx.suggestedFilename()).toBe('zigoals-money-2026-09-01-to-2026-11-14.xlsx');
  const bytes = await readFile((await xlsx.path())!);
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  await expect(sheet.getByRole('status')).toContainText('A workbook of 4 entries was made on this device');
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
