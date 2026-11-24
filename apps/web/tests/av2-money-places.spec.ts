import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 4 (money; Actual's payee locations and amount calculator, LEDGER #346, #339): Wealth → Spending
 * → Log spending — a typed place ("Work"), a sum in the amount ("3,20+1,30" → 4.50), Save keeps the payee with the place
 * (never on the entry, never a location), the place then offers it first, and "Forget places" clears them — at 390 and
 * 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: typed places offer their payees; a sum in the amount`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([])});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  await box.getByRole('button', {name: 'Log spending'}).click();
  const form = box.getByRole('form', {name: 'Log spending or income'});
  const places = form.getByRole('group', {name: 'Where are you? — optional'});
  await places.locator('summary', {hasText: 'Add a place you often pay at'}).click();
  await expect(places).toContainText('Typed names only: ZIGoals never reads where you are');
  await places.getByLabel('New place').fill('Work');
  await places.getByRole('button', {name: 'Add place'}).click();
  await expect(places.getByRole('radio', {name: 'Work'})).toBeChecked();
  await expect(places).toContainText('Nothing kept with Work yet');
  await form.getByLabel('Amount', {exact: true}).fill('3,20+1,30');
  await expect(form.locator('.money-calc-hint')).toContainText('= 4.50');
  await form.getByLabel('Note — optional').fill('Canteen');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(box.locator('.spending-status')).toContainText('Spent €4.50');
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries).toHaveLength(1);
  expect(log.entries[0]!.amount).toBe('4.50');
  expect(Object.keys(log.entries[0]!)).not.toContain('place');
  const more = await readRecord<MoneyMore>(page, MONEY_MORE_KEY);
  expect(more.places).toEqual([{id: expect.stringMatching(/^pl_/), name: 'Work', payees: ['Canteen']}]);
  // The place now offers its payee first; a tap fills the note.
  const payees = places.getByRole('group', {name: 'Payees you logged at Work'});
  await payees.getByRole('button', {name: /^Canteen/}).click();
  await expect(form.getByLabel('Note — optional')).toHaveValue('Canteen');
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await places.getByRole('button', {name: 'Forget places'}).click();
  await expect(places.getByLabel('New place')).toBeFocused();
  expect((await readRecord<MoneyMore>(page, MONEY_MORE_KEY)).places).toBeUndefined();
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
