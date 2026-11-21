import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyEntry} from '../lib/money-log/schema';

/**
 * Session AV, owner follow-up 1 (F-CATEGORY-SUGGEST; YNAB, Copilot): typing a note the log has seen before offers the
 * category it had ("Before, “Café Noël” was Dining (2 times). Use Dining") — offered, never chosen for the person — at
 * 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: "café noël" offers Dining, used with one tap`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-10-02', '12.50', 'Dining', 'expense', 'Café Noël'), entry('2026-11-02', '9.00', 'Dining', 'expense', 'cafe noel')])});
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('button', {name: 'Log spending'}).click();
  await spending(page).getByLabel('Amount').fill('7.40');
  await spending(page).getByRole('radio', {name: 'Groceries'}).check();
  await spending(page).getByLabel('Note — optional').fill('café noël');
  const hint = spending(page).locator('.spending-suggest');
  await expect(hint).toHaveText('Before, “café noël” was Dining (2 times). Use Dining');
  const findings = await axe(page, spending(page).locator('form').first());
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await hint.getByRole('button', {name: 'Use Dining'}).click();
  await expect(spending(page).getByRole('radio', {name: 'Dining'})).toBeChecked();
  await expect(hint).toHaveCount(0);
  await spending(page).getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await readRecord<{entries: MoneyEntry[]}>(page, MONEY_LOG_KEY)).entries.map(e => [e.category, e.note])).toContainEqual(['Dining', 'café noël']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

// Session AV (fresh-agent check q2, rank 22; YNAB, Copilot): the payee part of a note, offered from the first letters.
test('"wee" offers Groceries from "Weekly shop · SHOWCASE DATA"', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-02', '38.90', 'Groceries', 'expense', 'Weekly shop · SHOWCASE DATA'), entry('2026-11-09', '42.10', 'Groceries', 'expense', 'Weekly shop · SHOWCASE DATA')])});
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('button', {name: 'Log spending'}).click();
  await spending(page).getByRole('radio', {name: 'Fun'}).check();
  await spending(page).getByLabel('Note — optional').fill('wee');
  const hint = spending(page).locator('.spending-suggest');
  await expect(hint).toHaveText('Before, “Weekly shop” was Groceries (2 times). Use Groceries');
  await hint.getByRole('button', {name: 'Use Groceries'}).click();
  await expect(spending(page).getByRole('radio', {name: 'Groceries'})).toBeChecked();
  await expect(spending(page).getByLabel('Note — optional')).toBeFocused(); // the hint is gone; focus is back on the note
});
