import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_TAGS_KEY, type MoneyTags} from '../lib/money-tags/schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi's imports keep tags and check numbers, LEDGER #299): a Monarch export's
 * Tags column becomes the entries' tags (the preview names them; the tags record keeps them); a file's cheque number is
 * kept with its entry and found by search — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Fictional files.
 */
const MONARCH = ['Date,Merchant,Category,Account,Original Statement,Notes,Amount,Tags', '2026-11-03,Fictional Rail,Travel,Checking,RAIL 1,,-24.50,"Holiday, Work trip"', '2026-11-04,Fictional Bakery,Food,Checking,BAKERY,,-3.20,'].join('\n');
const CHEQUES = ['Date,Payee,Amount,Check Number', '2026-11-05,Fictional Landlord,-850.00,1042'].join('\n');
async function importCsv(page: import('@playwright/test').Page, name: string, csv: string) {
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  await sheet.getByLabel('CSV file', {exact: true}).setInputFiles({name, mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  return sheet;
}
for (const theme of THEMES) test(`${theme}: tags and a cheque number kept from imported files`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([])});
  let sheet = await importCsv(page, 'monarch.csv', MONARCH);
  await expect(sheet.locator('.bankfile-table')).toContainText('Tags: holiday, work trip');
  const findings = await axe(page, sheet);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Add 2 to my money log', exact: true}).click();
  await expect(sheet.getByRole('status')).toHaveText('2 entries added to your money log.');
  await expect(sheet).toContainText('1 entry keeps its tags from the file; Your money over time → Tags shows them.');
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY), rail = log.entries.find(e => e.note?.startsWith('Fictional Rail'))!;
  expect((await readRecord<MoneyTags>(page, MONEY_TAGS_KEY)).tags).toEqual({[rail.id]: ['holiday', 'work trip']});
  // A cheque number: shown in the preview, kept with the entry.
  sheet = await importCsv(page, 'cheques.csv', CHEQUES);
  await expect(sheet.locator('.bankfile-table')).toContainText('No. 1042');
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Add 1 to my money log', exact: true}).click();
  const after = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(after.entries.find(e => e.note === 'Fictional Landlord')?.ref).toMatch(/^out\|[A-Z]{3}\|1042$/);
  await page.setViewportSize({width: 320, height: 800});
  expect(await noSideScroll(page)).toBe(true);
});
