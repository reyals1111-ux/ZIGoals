import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2 (rest, LEDGER #142; Monarch's re-import): a CSV imported again after the bank changed a row (a tip
 * added at the fictional bistro) shows that row as changed in the preview and updates its entry instead of adding a
 * second one; the new row is added; Undo puts both back — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional file.
 */
const CSV = ['Date,Payee,Amount', '2026-11-10,Fictional Bistro,-48.50', '2026-11-12,Fictional Market,-12.00'].join('\n');

for (const theme of THEMES) test(`${theme}: a changed CSV row updates its entry, with a preview and Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '42.10', 'Food & drink', 'expense', 'Fictional Bistro', 'EUR', 'ap-money-bistro')])});
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  await sheet.getByLabel('CSV file', {exact: true}).setInputFiles({name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV)});
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(sheet.locator('.import-summary')).toHaveText('2 rows read · 1 ticked · 1 to update · 0 rows refused');
  await expect(sheet.locator('[data-import-changed]')).toContainText('1 row looks like an entry already in your log that changed at your bank');
  await expect(sheet.getByRole('checkbox', {name: /^Update that entry instead of adding a new one/})).toBeChecked();
  await expect(sheet).toContainText('Changed at your bank (was €42.10): updates that entry');
  const findings = await axe(page, sheet);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Add 1 to my money log, update 1', exact: true}).click();
  await expect(sheet.getByRole('status')).toHaveText('1 entry added to your money log, 1 updated.');
  let log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.map(e => e.amount).sort()).toEqual(['12.00', '48.50']);
  expect(log.entries.find(e => e.id === 'ap-money-bistro')?.history?.[0]).toMatchObject({by: 'import', field: 'amount', from: '42.10', to: '48.50'});
  await sheet.getByRole('button', {name: 'Undo this import', exact: true}).click();
  log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.map(e => [e.id, e.amount])).toEqual([['ap-money-bistro', '42.10']]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await noSideScroll(page)).toBe(true);
});
