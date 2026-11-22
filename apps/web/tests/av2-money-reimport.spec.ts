import {expect, test, type Locator, type Page} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {moneyLog, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2 (money; Monarch's re-import and activity log, YNAB's credit-card payment match): two OFX files — a
 * checking account paying the card, the card receiving it — become one transfer in To review; the same checking file
 * imported again with the café's amount changed at the bank updates that entry, and its history says so; an entry spread
 * over 12 months — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional files.
 */
const ofx = (account: string, rows: [string, string, string, string][]) => `<?xml version="1.0" encoding="UTF-8"?><?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>EUR</CURDEF><BANKACCTFROM><BANKID>000000000</BANKID><ACCTID>${account}</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>
<BANKTRANLIST>${rows.map(([date, amount, id, name]) => `<STMTTRN><TRNTYPE>${amount.startsWith('-') ? 'DEBIT' : 'CREDIT'}</TRNTYPE><DTPOSTED>${date}</DTPOSTED><TRNAMT>${amount}</TRNAMT><FITID>${id}</FITID><NAME>${name}</NAME></STMTTRN>`).join('')}</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const file = (name: string, text: string) => ({name, mimeType: 'application/x-ofx', buffer: Buffer.from(text)});
async function importFile(page: Page, f: ReturnType<typeof file>): Promise<Locator> {
  await spending(page).getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await sheet.getByLabel(/^Bank statement file/).setInputFiles(f);
  await expect(sheet.locator('.bankfile-preview h3')).toBeVisible();
  return sheet;
}
// Session AV lane 2 (a bank file's import has no "Done" of its own: once it is added it says so, and the dialog's Close ends
// it; each step checks the words and that the dialog is gone, deliberate)
async function close(page: Page) {
  const dialog = page.getByRole('dialog', {name: 'Import spending and income'});
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  await expect(dialog).toHaveCount(0);
}
const CHECKING = (cafe: string) => ofx('CHECK-0001', [['20261110', '-450.00', 'C1', 'Card payment'], ['20261111', cafe, 'C2', 'Fictional Cafe']]);
const CARD = ofx('CARD-0002', [['20261111', '450.00', 'K1', 'Payment received']]);

for (const theme of THEMES) test(`${theme}: a card payment across two files is one transfer; a re-import updates a changed row`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([])});
  await page.goto('/app/wealth'); await hydrated(page);
  let sheet = await importFile(page, file('checking.ofx', CHECKING('-4.20')));
  await sheet.getByRole('button', {name: 'Add 2 to my money log', exact: true}).click();
  await expect(sheet.getByRole('status')).toContainText('2 entries added to your money log.');
  await close(page);
  sheet = await importFile(page, file('card.ofx', CARD));
  await sheet.getByRole('button', {name: 'Add 1 to my money log', exact: true}).click();
  await expect(sheet.getByRole('status')).toContainText('1 entry added to your money log.');
  await close(page);
  let log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.map(e => e.account).sort()).toEqual(['CARD-0002', 'CHECK-0001', 'CHECK-0001']);
  // To review pairs the €450 out of checking with the €450 into the card.
  await spending(page).getByRole('button', {name: /^To review \(3\)/}).click();
  const pairs = spending(page).getByRole('region', {name: /Card payments and moves between your accounts/});
  await expect(pairs).toContainText('CHECK-0001 → CARD-0002');
  const findings = await axe(page, pairs);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await pairs.getByRole('button', {name: /^Mark .* as a transfer$/}).click();
  log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.filter(e => e.transfer).length).toBe(2);
  // This month counts only the café.
  await expect(spending(page).locator('.spending-bars')).not.toContainText('450');
  // The checking file again, the café now €4.80 at the bank: one row changed, updated in place.
  sheet = await importFile(page, file('checking.ofx', CHECKING('-4.80')));
  await expect(sheet.getByRole('row', {name: /Fictional Cafe.*Changed at your bank since your last import/})).toBeVisible();
  await sheet.getByRole('button', {name: 'Update 1 entry', exact: true}).click();
  await expect(sheet.locator('.bankfile-status')).toContainText("1 entry updated from the file; each change is in the entry's history.");
  await close(page);
  log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  const cafe = log.entries.find(e => e.note?.startsWith('Fictional Cafe'))!;
  expect(log.entries).toHaveLength(3);
  expect(cafe).toMatchObject({amount: '4.80', history: [{by: 'import', field: 'amount', from: '4.20', to: '4.80'}]});
  // The entry's history, and a spread over 12 months, in its edit form.
  await spending(page).getByRole('button', {name: /^Edit .* 4\.80 EUR/}).first().click();
  const form = spending(page).getByRole('form', {name: /^Edit /});
  await form.locator('summary', {hasText: 'Changes to this entry (1)'}).click();
  await expect(form.locator('.spending-history')).toContainText('Amount: 4.20 → 4.80 (by a re-import)');
  await form.getByLabel('Count in budgets over').selectOption('12');
  await form.getByRole('button', {name: 'Save changes'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.find(e => e.id === cafe.id)?.spread).toBe(12);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
