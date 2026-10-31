import {expect, test} from '@playwright/test';

// Session AK (A15): Settings → Switch to ZIGoals → "From Daylio, Habitica or YNAB". Fictional exports only; each import
// shows a preview, writes on confirm, and "Undo this import" removes exactly what it added.
const YNAB = ['"Account","Flag","Date","Payee","Category Group/Category","Category Group","Category","Memo","Outflow","Inflow","Cleared"',
  '"Checking","","13/10/2026","Fictional grocer","Everyday: Groceries","Everyday","Groceries","","€45,20","€0,00","Cleared"',
  '"Checking","","15/10/2026","Fictional employer","Inflow: Ready to Assign","Inflow","Ready to Assign","","€0,00","€2.500,00","Cleared"'].join('\n');
const DAYLIO = ['full_date,date,weekday,time,mood,activities,note_title,note',
  '2026-10-02,October 2,Friday,9:15 pm,rad,"friends | movies",Fictional evening,"Dinner with fictional friends."',
  '2026-10-01,October 1,Thursday,7:00,good,,,'].join('\n');
const moneyCount = (page: import('@playwright/test').Page) => page.evaluate(() => { const raw = Object.entries(localStorage).find(([k]) => k.endsWith('zigoals:money-log:v1'))?.[1]; return raw ? (JSON.parse(raw).entries?.length ?? 0) : 0; });

test('YNAB: preview, import into the money log, then undo removes exactly those entries', async ({page}) => {
  await page.goto('/app/settings#switch-import');
  const section = page.locator('#switch-import');
  await section.locator('summary', {hasText: 'From Daylio, Habitica or YNAB'}).click();
  await section.getByRole('radio', {name: 'YNAB (spending and income)'}).check();
  await section.getByLabel('Choose the Register CSV').setInputFiles({name: 'register.csv', mimeType: 'text/csv', buffer: Buffer.from(YNAB)});
  await expect(section.getByText(/YNAB: 2 entries for your money log/)).toBeVisible();
  await section.getByLabel('Currency of this plan').selectOption('EUR');
  const before = await moneyCount(page);
  await section.getByRole('button', {name: 'Import into the money log'}).click();
  await expect(section.getByRole('status').filter({hasText: 'Imported from YNAB: 2 entries'})).toBeVisible();
  expect(await moneyCount(page)).toBe(before + 2);
  const undo = section.getByRole('button', {name: 'Undo this import'});
  expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await undo.click();
  await expect(section.getByRole('status').filter({hasText: 'The YNAB import was undone.'})).toBeVisible();
  expect(await moneyCount(page)).toBe(before);
});

test('Daylio: notes become journal entries; moods go to Health only when ticked', async ({page}) => {
  await page.goto('/app/settings#switch-import');
  const section = page.locator('#switch-import');
  await section.locator('summary', {hasText: 'From Daylio, Habitica or YNAB'}).click();
  await section.getByLabel('Choose the Daylio CSV').setInputFiles({name: 'daylio.csv', mimeType: 'text/csv', buffer: Buffer.from(DAYLIO)});
  await expect(section.getByText(/Daylio: 2 entries/)).toBeVisible();
  await expect(section.getByRole('checkbox', {name: /Add each day.s mood to your Health journal/})).not.toBeChecked();
  await section.getByRole('button', {name: 'Import from Daylio'}).click();
  await expect(section.getByRole('status').filter({hasText: 'Imported from Daylio: 1 journal entry'})).toBeVisible();
});
