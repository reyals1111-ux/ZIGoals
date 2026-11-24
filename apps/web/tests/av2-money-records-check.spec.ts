import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 6 (money; Banktivity's Check Ledger Health and Remove Historical Data, LEDGER #430, #431):
 * Settings → Your data (/app/settings/data) links to Wealth → Spending → "Check and tidy your money records", which opens by itself; the check
 * reads first and lists an entry twice and a lone transfer, each repair changes only what it names, with Undo; then 2024
 * is put away (out of the list, kept in the record) and brought back — at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
for (const theme of THEMES) test(`${theme}: check the money records, then put a year away and bring it back`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const a = entry('2026-11-10', '25.00', 'Groceries', 'expense', 'Market'), b = {...entry('2026-11-10', '25.00', 'Groceries', 'expense', 'Market'), createdAt: '2026-11-10T11:00:00.000Z'};
  const lone = {...entry('2026-11-09', '200.00', 'Other', 'expense', 'Card payment'), transfer: 'gone-side'};
  const old = [entry('2024-03-02', '40.00', 'Fun', 'expense', 'Cinema'), entry('2024-07-01', '900.00', 'Salary', 'income', 'Work')];
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([...old, a, b, lone])});
  await page.goto('/app/settings/data'); await hydrated(page);
  await page.getByRole('link', {name: 'Check and tidy your money records on Wealth →'}).click();
  await hydrated(page);
  const fold = spending(page).locator('#money-check');
  await expect(fold).toHaveAttribute('open', '');
  await fold.getByRole('button', {name: 'Check my money records'}).click();
  const found = fold.getByRole('list', {name: 'What the check found'});
  await expect(found.getByRole('listitem')).toHaveCount(2);
  await expect(found).toContainText('These look like the same entry twice');
  await expect(found).toContainText('A transfer whose other side is gone');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries).toHaveLength(5);
  await found.getByRole('button', {name: 'Keep the first, remove the copy'}).click();
  await expect(found.getByRole('listitem')).toHaveCount(1);
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.map(e => e.id)).not.toContain(b.id);
  await expect(fold.getByRole('heading', {name: 'Check my money records'})).toBeFocused();
  await found.getByRole('button', {name: 'Count it again'}).click();
  await expect(fold.getByRole('status').filter({hasText: 'Nothing looks wrong'})).toBeVisible();

  await expect(fold.getByLabel('Year to put away')).toHaveValue('2024');
  await expect(fold.getByRole('group', {name: 'What putting 2024 away does'})).toContainText('2 entries go · spent €40.00, received €900.00 in 2024.');
  await fold.getByRole('button', {name: 'Put 2024 away'}).click();
  const away = fold.getByRole('list', {name: 'Years put away'});
  await expect(away).toContainText('2024 · 2 entries put away');
  const stored = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(stored.entries.map(e => e.date.slice(0, 4))).not.toContain('2024');
  expect(stored.putAway?.years[0]?.entries).toHaveLength(2);
  await away.getByRole('button', {name: 'Bring 2024 back'}).click();
  await expect(away).toHaveCount(0);
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.date.startsWith('2024'))).toHaveLength(2);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
