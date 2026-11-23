import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's archived categories and category template library, LEDGER #342,
 * #347): Wealth → Spending → Log spending → Your own categories — archive Gifts (it leaves the chips, its entry keeps it,
 * search still finds it), bring it back; then a starter set in Dutch, previewed and added in one tap — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: archive a category and add a starter set`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-02', '30.00', 'Gifts', 'expense', 'Book for Sam')])});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  await box.getByRole('button', {name: 'Log spending'}).click();
  const form = box.getByRole('form', {name: 'Log spending or income'});
  await expect(form.getByRole('radio', {name: 'Gifts'})).toBeVisible();
  await form.locator('summary', {hasText: 'Your own categories'}).click();
  const more = form.locator('.category-more');
  await expect(more.getByRole('heading', {name: 'Archive a category'})).toBeVisible();
  // Session AV lane 2 (fixb4; deliberate): getByLabel reads the <label>'s whole text, its options' words with it
  // ("CategoryChoose…Gifts…"), so an exact "Category" never matched. The combobox's accessible name is exactly
  // "Category"; as strict.
  await more.getByRole('combobox', {name: 'Category', exact: true}).selectOption('Gifts');
  await more.getByRole('button', {name: 'Archive', exact: true}).click();
  // (fix2011; deliberate) the fold's parts speak through Spending's one status line under the form (since CI run 2007 the
  // form's other parts do; the fold had three status lines of its own), so that line is read, with the same exact words.
  await expect(box.locator('p.spending-status')).toHaveText('Gifts archived: it is no longer offered for spending. Its 1 entry keeps it, and reports and search still show it.');
  await expect(form.getByRole('radio', {name: 'Gifts'})).toHaveCount(0);
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).archived).toEqual({expense: ['Gifts']});
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries[0]!.category).toBe('Gifts');
  let findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await more.getByRole('button', {name: 'Bring back Gifts'}).click();
  await expect(form.getByRole('radio', {name: 'Gifts'})).toBeVisible();
  // A starter set, in Dutch: previewed, then added; the button stays focusable once everything is there.
  // Session AV lane 2 (fixb4; deliberate): "Set" also matched the region "Start from a set"; each select by its exact
  // accessible name, as strict.
  await more.getByRole('combobox', {name: 'Set', exact: true}).selectOption('household');
  await more.getByRole('combobox', {name: 'Names in', exact: true}).selectOption('nl');
  const preview = more.getByRole('list', {name: 'What A household adds'});
  await expect(preview).toContainText('Kinderen');
  await expect(preview).toContainText('Opvang');
  const add = more.getByRole('button', {name: /^Add \d+ new from this set$/});
  await add.click();
  await expect(box.locator('p.spending-status')).toContainText('Added from Een huishouden: 4 categories and'); // fix2011; deliberate (above)
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.own?.expense).toEqual(['Kinderen', 'Huisdieren', 'Auto']);
  expect(log.subs?.Bills).toContain('Energie');
  await expect(more.getByRole('button', {name: 'All of it is already there'})).toBeFocused();
  await expect(form.getByRole('radio', {name: 'Kinderen'})).toBeVisible();
  findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
