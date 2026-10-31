import {test, type Locator, type Page} from '@playwright/test';
import {at, desktopOnly, expect, hydrated, nextDay, offlineApis, seedRecords, stored, strayRequests, ZONE} from './journey-helpers';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../../lib/positions';

/**
 * Session AK F2, journey 3: a money month. Monday 2 November: a CSV from the bank and three statement files (CAMT.053,
 * OFX, MT940) go into the money log, read on the device; a row already logged starts unticked; the review inbox, a rule
 * made from an entry and applied to the past 90 days, a split entry, a monthly Groceries budget with rollover, a bill
 * found in the spending and confirmed, and a contribution that sets cash aside for a goal, shown in "What each asset is
 * for". Monday 9 November: the contribution rhythm offers to fill in the usual amount, which opens the goal's form for
 * the person to check (nothing moves by itself). 1 December: the unspent November budget rolls into December.
 * Fictional payees and amounts; nothing is uploaded and no bank is connected.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE});
desktopOnly();
const GOAL_ID = '41', GOAL = 'Fictional buffer fund';
const CSV = ['Date,Payee,Amount,Note',
  '2026-08-03,Fictional Streaming,-9.99,', '2026-09-03,Fictional Streaming,-9.99,', '2026-10-03,Fictional Streaming,-9.99,',
  '2026-10-05,Fictional Grocer,-54.20,', '2026-10-12,Fictional Grocer,-38.10,', '2026-10-15,Fictional Employer,2400.00,Salary',
  '2026-10-20,Fictional Hardware,-120.00,'].join('\n');
const ntry = (amt: string, ind: 'CRDT' | 'DBIT', date: string, party: string, ref: string, ustrd = '') => `<Ntry><Amt Ccy="EUR">${amt}</Amt><CdtDbtInd>${ind}</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>${date}</Dt></BookgDt><ValDt><Dt>${date}</Dt></ValDt><AcctSvcrRef>${ref}</AcctSvcrRef><NtryDtls><TxDtls><Refs><EndToEndId>E2E-${ref}</EndToEndId></Refs><RltdPties><${ind === 'DBIT' ? 'Cdtr' : 'Dbtr'}><Nm>${party}</Nm></${ind === 'DBIT' ? 'Cdtr' : 'Dbtr'}></RltdPties><RmtInf><Ustrd>${ustrd}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>`;
const CAMT = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><GrpHdr><MsgId>J3</MsgId></GrpHdr>
<Stmt><Id>S1</Id><Acct><Id><IBAN>NL00TEST0000000001</IBAN></Id><Ccy>EUR</Ccy></Acct>
<Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">2000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-10-01</Dt></Dt></Bal>
${ntry('38.10', 'DBIT', '2026-10-12', 'Fictional Grocer', 'R1')}${ntry('42.00', 'DBIT', '2026-11-01', 'Fictional Grocer', 'R2', 'Weekly shop')}</Stmt></BkToCstmrStmt></Document>`;
const OFX = `<?xml version="1.0" encoding="UTF-8"?><?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>EUR</CURDEF><BANKACCTFROM><BANKID>000000000</BANKID><ACCTID>TEST-1234</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>
<BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261101</DTPOSTED><TRNAMT>-3.20</TRNAMT><FITID>X1</FITID><NAME>Fictional Cafe</NAME><MEMO>Coffee</MEMO></STMTTRN></BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const MT940 = `{1:F01TESTNL2AXXXX0000000000}{2:I940TESTNL2AXXXXN}{4:
:20:P261031000001
:25:NL00TEST0000000001
:28C:00001
:60F:C261001EUR1000,00
:61:2610081008D7,50NTRFNONREF//B26100800001
:86:/NAME/Fictional Bakery/REMI/USTD//Bread/
:61:2610221022D29,00NTRFNONREF//B26102200002
:86:/NAME/Fictional Gym/REMI/USTD//Monthly fee/
:62F:C261031EUR963,50
-}`;
const goal = privateGoalSchema.parse({id: GOAL_ID, name: GOAL, type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '300000', targetDate: '2027-06-30', notes: '', createdAt: '2026-09-01T09:00:00.000Z', milestones: []});
// Three earlier Monday contributions of €50, recorded as history (a weekly rhythm); the journey funds a fourth.
const earlier = ['2026-10-12', '2026-10-19', '2026-10-26'].map((d, i) => ({id: `contribution-earlier-${i}`, goalId: GOAL_ID, goalScope: 'private', direction: 'IN', quantity: '5000', asset: 'EUR', decimals: 2, occurredAt: `${d}T09:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION', fundingMode: 'HISTORY_ONLY'}));
const moneyLog = (page: Page) => stored<{entries: {id: string; note?: string; category: string; amount: string; date: string; kind: string; parts?: {amount: string; category?: string}[]}[]}>(page, 'zigoals:money-log:v1');
const file = (name: string, text: string, mimeType = 'text/plain') => ({name, mimeType, buffer: Buffer.from(text)});
async function openImport(page: Page): Promise<Locator> {
  await page.locator('#spending').getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await expect(sheet).toBeVisible();
  return sheet;
}
async function bankFile(sheet: Locator, f: ReturnType<typeof file>, rows: number, ticked: number) {
  await sheet.getByLabel(/^Bank statement file/).setInputFiles(f);
  await expect(sheet.locator('.bankfile-preview h3')).toContainText(`${rows} ${rows === 1 ? 'transaction' : 'transactions'}`);
  await sheet.getByRole('button', {name: `Add ${ticked} to my money log`, exact: true}).click();
  await expect(sheet.locator('.bankfile-status')).toContainText(`${ticked} ${ticked === 1 ? 'entry' : 'entries'} added to your money log`);
}

test('@journey 3 money month: CSV and bank files → review inbox → a rule → a split → budget with rollover → a bill → purpose → contribution pre-fill', async ({page}) => {
  test.setTimeout(240_000);
  const stray = strayRequests(page);
  await page.clock.install({time: at('2026-11-02', '10:00')});
  await offlineApis(page);
  await seedRecords(page, {[PLATFORM_KEY]: {...emptyPlatform(), goals: [goal], contributions: earlier}});
  await page.goto('/app/wealth'); await hydrated(page);

  // A CSV from the bank, in four steps.
  let sheet = await openImport(page);
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  await sheet.getByLabel('CSV file', {exact: true}).setInputFiles(file('bank.csv', CSV, 'text/csv'));
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(sheet.locator('.import-summary')).toContainText('7 rows read · 7 ticked · 0 rows refused');
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Add 7 to my money log', exact: true}).click();
  await expect(sheet.getByRole('status').filter({hasText: '7 entries added to your money log'})).toBeVisible();
  await sheet.getByRole('button', {name: 'Done', exact: true}).click();
  expect((await moneyLog(page))!.entries).toHaveLength(7);

  // Three statement files; the grocer's October row is already in the log, so it starts unticked.
  sheet = await openImport(page);
  await sheet.getByLabel(/^Bank statement file/).setInputFiles(file('statement.xml', CAMT, 'application/xml'));
  await expect(sheet.locator('.bankfile-preview h3')).toContainText('2 transactions');
  await expect(sheet.getByRole('row', {name: /Fictional Grocer.*Already in your log/})).toBeVisible();
  await expect(sheet.getByRole('checkbox', {name: /^Add Fictional Grocer 38\.1 EUR/})).not.toBeChecked();
  await sheet.getByRole('button', {name: 'Add 1 to my money log', exact: true}).click();
  await expect(sheet.locator('.bankfile-status')).toContainText('1 entry added to your money log');
  await bankFile(sheet, file('statement.ofx', OFX), 1, 1);
  await bankFile(sheet, file('statement.sta', MT940), 2, 2);
  await sheet.getByRole('button', {name: 'Close', exact: true}).click();
  const log = (await moneyLog(page))!.entries;
  expect(log).toHaveLength(11);
  expect(log.filter(e => e.note?.startsWith('Fictional Grocer')).map(e => e.date).sort()).toEqual(['2026-10-05', '2026-10-12', '2026-11-01']);

  // The review inbox: every imported entry waits there; one is recategorised, one accepted.
  const tools = page.getByRole('group', {name: 'Money tools'});
  await tools.getByRole('button', {name: 'To review (11)'}).click();
  const inbox = page.locator('.money-panel');
  const cafe = inbox.locator('.money-review-row', {hasText: 'Fictional Cafe'});
  await expect(cafe.getByLabel('Category')).toHaveValue('Food & drink');
  const gym = inbox.locator('.money-review-row', {hasText: 'Fictional Gym'});
  await gym.getByLabel('Category').selectOption('Health');
  await expect(inbox.getByRole('status')).toHaveText('Category changed to Health.');
  await gym.getByRole('button', {name: /^Mark Fictional Gym.* as reviewed$/}).click();
  await expect(tools.getByRole('button', {name: 'To review (10)'})).toBeVisible();

  // A rule from the grocer's entry: its category becomes Groceries, then it is applied to the past 90 days (Undo offered).
  await inbox.locator('.money-review-row', {hasText: 'Fictional Grocer'}).first().getByRole('button', {name: 'Make a rule', exact: true}).click();
  const rule = page.getByRole('form', {name: 'Add a rule'});
  await expect(rule.getByLabel('Text', {exact: true})).toHaveValue(/fictional grocer/i);
  await rule.getByLabel('Category').selectOption('Groceries');
  await rule.getByRole('button', {name: 'Save rule', exact: true}).click();
  await expect(page.locator('.money-status')).toContainText('Rule saved.');
  await page.getByRole('button', {name: 'Apply to the past 90 days…', exact: true}).click();
  await page.getByRole('button', {name: 'Apply to 3 entries', exact: true}).click();
  await expect(page.locator('.money-status').getByRole('button', {name: 'Undo', exact: true})).toBeVisible();
  await expect.poll(async () => (await moneyLog(page))!.entries.filter(e => e.note?.startsWith('Fictional Grocer')).map(e => e.category)).toEqual(['Groceries', 'Groceries', 'Groceries']);

  // A split: the hardware bill is half Home, half a Gift.
  await tools.getByRole('button', {name: 'Split an entry', exact: true}).click();
  const choice = page.getByLabel('Entry from the last 90 days');
  const option = await choice.locator('option', {hasText: 'Fictional Hardware'}).getAttribute('value');
  await choice.selectOption(option!);
  const parts = page.getByRole('form', {name: 'Parts of the entry'});
  await parts.getByRole('button', {name: 'Split evenly', exact: true}).click();
  await parts.getByLabel('Category').nth(0).selectOption('Home');
  await parts.getByLabel('Category').nth(1).selectOption('Gifts');
  await expect(parts).toContainText('The parts add up exactly.');
  await parts.getByRole('button', {name: 'Save the split', exact: true}).click();
  await expect.poll(async () => (await moneyLog(page))!.entries.find(e => e.note === 'Fictional Hardware')?.parts?.map(p => [p.amount, p.category])).toEqual([['60.00', 'Home'], ['60.00', 'Gifts']]);

  // A monthly Groceries budget with rollover.
  const budgets = page.getByRole('form', {name: 'Set a monthly budget'});
  await budgets.getByLabel('Category').selectOption('Groceries');
  await budgets.getByLabel('Each month').fill('300');
  await budgets.getByLabel('Currency').selectOption('EUR');
  await budgets.getByLabel('Roll over what is left unspent').check();
  await budgets.getByRole('button', {name: 'Save budget', exact: true}).click();
  await expect(page.locator('.budgets-status')).toHaveText('Budget for Groceries saved: €300.00 a month, with rollover.');
  await expect(page.locator('.budgets-total').first()).toContainText('€258.00 left of €300.00 budgeted');

  // A bill found in the spending (three monthly payments), confirmed by the person.
  await page.getByRole('button', {name: 'Confirm Fictional Streaming as a bill', exact: true}).click();
  await expect(page.locator('.bills-status')).not.toBeEmpty();
  await expect(page.locator('.bills-row', {hasText: 'Fictional Streaming'})).toBeVisible();
  const bills = await stored<{bills: {title: string}[]}>(page, 'zigoals:bills:v1');
  expect(bills?.bills.map(b => b.title)).toEqual(['Fictional Streaming']);

  // A contribution sets €50 of cash aside for the goal; "What each asset is for" shows it.
  await page.goto(`/app/goals/tracked/${GOAL_ID}`); await hydrated(page);
  await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
  const fund = page.getByRole('dialog', {name: 'Fund your Goal'});
  await fund.getByLabel('Cash amount', {exact: true}).fill('200');
  await fund.getByRole('button', {name: 'Continue with this asset', exact: true}).click();
  await fund.getByLabel('Contribution quantity (EUR)', {exact: true}).fill('50');
  await fund.getByRole('button', {name: 'Preview contribution', exact: true}).click();
  await expect(fund.getByText('REVIEW YOUR CONTRIBUTION', {exact: true})).toBeVisible();
  await fund.getByRole('button', {name: 'Confirm & fund Goal', exact: true}).click();
  await expect(fund).toHaveCount(0);
  await page.goto('/app/wealth#purpose'); await hydrated(page);
  const purpose = page.locator('.purpose-body');
  await purpose.getByRole('button', {name: 'Show as a table', exact: true}).click();
  await expect(purpose.getByRole('row', {name: new RegExp(`EUR Cash.*${GOAL}`)})).toBeVisible();

  // A week later: the rhythm (Mondays of €50) offers to fill in the usual amount; the goal's form opens to check.
  await nextDay(page, at('2026-11-09', '09:00'), '/app/wealth#contribution-rhythm');
  const rhythm = page.locator('.autopilot-body');
  await expect(rhythm).toContainText(GOAL);
  const before = (await stored<{contributions: unknown[]}>(page, PLATFORM_KEY))!.contributions.length;
  await rhythm.getByRole('link', {name: /^Fill in /}).click();
  await page.waitForURL(new RegExp(`/app/goals/tracked/${GOAL_ID}`));
  const prefilled = page.getByRole('dialog', {name: 'Fund your Goal'});
  await expect(prefilled).toBeVisible();
  await expect(prefilled.getByRole('button', {name: 'Fund Goal'})).toHaveAttribute('aria-pressed', 'true');
  await prefilled.getByRole('button', {name: /^EUR Cash/}).click();
  await expect(prefilled.getByLabel('Contribution quantity (EUR)', {exact: true})).toBeVisible(); // the person checks and confirms (with a cash asset the amount is filled in: journey 3c, bug J3-2, fixed)
  expect((await stored<{contributions: unknown[]}>(page, PLATFORM_KEY))!.contributions).toHaveLength(before); // nothing moved by itself
  await prefilled.getByRole('button', {name: 'Close dialog'}).click();

  // 1 December: November's unspent €258 rolls into December's Groceries budget.
  await nextDay(page, at('2026-12-01', '09:00'), '/app/wealth#budgets');
  await expect(page.locator('.budgets-total').first()).toContainText('€558.00 left of €558.00 budgeted');
  expect(stray).toEqual([]);
});

// Bug J3-1 (docs/review/session-ak/JOURNEY_BUGS.md): a contribution made with "Fund Goal" from a cash asset is recorded in
// the asset's units (18 decimals), so the contribution rhythm, which counts only events in the goal's own decimals (2),
// never sees it: someone who funds their goal every Monday is never offered "Fill in".
test('@journey 3b bug J3-1: weekly "Fund Goal" contributions from cash make a rhythm the autopilot offers to fill in', async ({page}) => {
  await page.clock.install({time: at('2026-10-12', '10:00')});
  await offlineApis(page);
  await seedRecords(page, {[PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]}});
  for (const [i, day] of ['2026-10-12', '2026-10-19', '2026-10-26'].entries()) {
    await nextDay(page, at(day, '10:00'), `/app/goals/tracked/${GOAL_ID}`);
    await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
    const fund = page.getByRole('dialog', {name: 'Fund your Goal'});
    if (i === 0) { await fund.getByLabel('Cash amount', {exact: true}).fill('500'); await fund.getByRole('button', {name: 'Continue with this asset', exact: true}).click(); }
    else await fund.getByRole('button', {name: /^EUR Cash/}).click();
    await fund.getByLabel('Contribution quantity (EUR)', {exact: true}).fill('50');
    await fund.getByRole('button', {name: 'Preview contribution', exact: true}).click();
    await fund.getByRole('button', {name: 'Confirm & fund Goal', exact: true}).click();
    await expect(fund).toHaveCount(0);
  }
  await nextDay(page, at('2026-11-02', '09:00'), '/app/wealth#contribution-rhythm');
  await expect(page.locator('.autopilot-body')).toContainText(GOAL);
});

// Bug J3-2 (docs/review/session-ak/JOURNEY_BUGS.md): "Fill in €50.00" opens the goal's Fund form, but with the person's
// EUR cash asset (18 decimals, as the app makes cash assets) chosen the amount is never filled in.
test('@journey 3c bug J3-2: "Fill in" from the contribution rhythm fills the amount in with a cash asset', async ({page}) => {
  await page.clock.install({time: at('2026-11-09', '09:00')});
  await offlineApis(page);
  await seedRecords(page, {[PLATFORM_KEY]: {...emptyPlatform(), goals: [goal], contributions: earlier}});
  await page.goto(`/app/goals/tracked/${GOAL_ID}`); await hydrated(page);
  await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
  let fund = page.getByRole('dialog', {name: 'Fund your Goal'});
  await fund.getByLabel('Cash amount', {exact: true}).fill('200');
  await fund.getByRole('button', {name: 'Continue with this asset', exact: true}).click();
  await fund.getByLabel('Contribution quantity (EUR)', {exact: true}).fill('50');
  await fund.getByRole('button', {name: 'Preview contribution', exact: true}).click();
  await fund.getByRole('button', {name: 'Confirm & fund Goal', exact: true}).click();
  await expect(fund).toHaveCount(0);
  await page.goto('/app/wealth#contribution-rhythm'); await hydrated(page);
  await page.locator('.autopilot-body').getByRole('link', {name: /^Fill in /}).click();
  fund = page.getByRole('dialog', {name: 'Fund your Goal'});
  await fund.getByRole('button', {name: /^EUR Cash/}).click();
  await expect(fund.getByLabel('Contribution quantity (EUR)', {exact: true})).toHaveValue('50');
});
