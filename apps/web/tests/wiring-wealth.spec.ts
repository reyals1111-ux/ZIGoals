import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {PORTFOLIO_KEY} from '../lib/portfolio/schema';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {feeDrag} from '../lib/fee-drag/fee-drag';
import {money} from '../components/wealth/money-tools/format';
import {chooseChain} from './chain-choice';
import {hydrated, offlineApis, seedRecords, stored} from './journeys/journey-helpers';
import {loadShowcase, showcaseRecord} from './wiring-helpers';
import {openFold} from './phone-nav';

/**
 * Session AK Q1 (WIRING_AUDIT 7.2, 7.4, #12, #17, #18, F5): Wealth features that worked in the build but had no browser
 * test on the UI path: an exchange's automatic read every 15 minutes (ZIGoals' relay answered by fixtures, never a real
 * exchange), the target mix and its drift, the planning tools (a yearly fee's cost, financial freedom, the debt planner),
 * the family emergency sheet's refusal to print key-like text, and net-worth milestones. Fictional data; every /api route
 * answers 503 unless a test routes it.
 */
test.use({timezoneId: 'UTC'});
test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'these wiring specs run once, on the desktop project'); });
const NOW = new Date('2026-11-04T09:00:00.000Z');

test('7.2: a connected exchange reads itself again after 15 minutes while the app is open, and says when it last synced', async ({page}) => {
  await chooseChain(page);
  await page.clock.install({time: NOW});
  await offlineApis(page);
  let btc = '0.5';
  const reads: string[] = [];
  await page.route('**/api/exchange', async route => {
    const call = (JSON.parse(route.request().postData() ?? '{}') as {call: string}).call;
    if (call !== 'permissions') reads.push(call);
    await route.fulfill({json: {status: 200, data: call === 'permissions' ? {error: [], result: {permissions: ['query-funds']}} : {error: [], result: {XXBT: {balance: btc}}}}});
  });
  await seedRecords(page, {[PORTFOLIO_KEY]: {version: 1, portfolios: [{id: 'p-real', name: 'Mine', kind: 'real', currency: 'USD', createdAt: '2026-10-28T08:00:00.000Z', coins: [], transactions: []}]}});
  await page.goto('/app/portfolio'); await hydrated(page);
  const panel = page.getByRole('region', {name: 'Exchanges (read-only)'});
  await panel.getByRole('button', {name: 'Connect Kraken'}).click();
  const form = panel.getByRole('form', {name: 'Connect Kraken'});
  await form.getByLabel('API key').fill('FICTIONAL-KRAKEN-KEY');
  await form.getByLabel('Private key').fill(Buffer.from('fictional-kraken-private-key-for-tests-only-0123456789').toString('base64'));
  await form.getByRole('button', {name: 'Check and connect'}).click();
  const kraken = panel.getByRole('article', {name: 'Kraken'});
  await expect(kraken).toContainText('0.5 BTC');
  await expect(kraken.getByText('Last synced just now')).toBeVisible();
  const refresh = kraken.getByRole('button', {name: 'Refresh Kraken now'});
  const readsAfterConnect = reads.length;
  // The balance changes at the exchange; nothing is read before the 15 minutes are up.
  btc = '0.75';
  await page.clock.fastForward('05:00');
  await expect(kraken.getByText('Last synced 5 min ago')).toBeVisible({timeout: 15_000});
  expect(reads.length).toBe(readsAfterConnect);
  await expect(kraken).toContainText('0.5 BTC');
  // At 15 minutes the panel reads Kraken again by itself (the app open and visible), and the line says so.
  await page.clock.fastForward('10:30');
  await expect(kraken).toContainText('0.75 BTC', {timeout: 15_000});
  expect(reads.length).toBe(readsAfterConnect + 1);
  await expect(kraken.getByText('Last synced just now')).toBeVisible();
  // "Refresh now" waits at least a minute after the last read.
  await expect(refresh).toBeDisabled();
  await expect(refresh).toHaveText(/^Refresh in \d+ s$/);
  await page.clock.fastForward('01:05');
  await expect(refresh).toBeEnabled({timeout: 15_000});
  btc = '1';
  await refresh.click();
  await expect(kraken).toContainText('1 BTC');
  expect(reads.length).toBe(readsAfterConnect + 2);
});

test('#18 and #12: the planning tools — a yearly fee\'s cost from my numbers, and financial freedom\'s target from my spending', async ({page}) => {
  await offlineApis(page);
  await seedRecords(page, {});
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  const tools = page.getByRole('group', {name: 'More planning tools'});
  await tools.getByRole('button', {name: 'What a yearly fee costs'}).click();
  const fee = page.getByRole('region', {name: 'What a yearly fee costs'});
  await fee.getByLabel('Amount').fill('20000');
  await fee.getByLabel(/^Years/).fill('25');
  await fee.getByLabel('Yearly return before fees (%)').fill('5');
  await fee.getByLabel('Fee A each year (%)').fill('0.1');
  await fee.getByLabel('Fee B each year (%)').fill('1.5');
  const r = feeDrag({amount: 20000, years: 25, returnPct: 5, feeAPct: 0.1, feeBPct: 1.5});
  await expect(fee.locator('.fee-drag-result')).toHaveText(`After 25 years: ${money(r.endA, 'EUR')} with fee A and ${money(r.endB, 'EUR')} with fee B — a difference of ${money(Math.abs(r.difference), 'EUR')} (${Math.round(r.share * 1000) / 10} % of the higher one).`);
  await expect(fee.getByRole('img', {name: /^Two lines over 25 years/})).toBeVisible();
  await fee.getByLabel('Fee B each year (%)').fill('99');
  await expect(fee.getByRole('alert')).toBeVisible();

  await tools.getByRole('button', {name: 'Financial freedom'}).click();
  const fi = page.getByRole('region', {name: 'Financial freedom'});
  await fi.getByLabel('Your yearly spending (EUR)').fill('40000');
  await fi.getByLabel('Withdrawal rate a year (%)').fill('4');
  // The target is the yearly spending ÷ the withdrawal rate: 40,000 ÷ 4 % = 1,000,000.
  await expect(fi).toContainText(/your target of €1,000,000(\.00)?\b/);
  await expect(fi).toContainText('A model, not advice');
  await fi.getByLabel('Withdrawal rate a year (%)').fill('5');
  await expect(fi).toContainText(/your target of €800,000(\.00)?\b/);
  await fi.getByRole('button', {name: 'Keep these inputs on this device'}).click();
  await page.reload(); await hydrated(page);
  await page.getByRole('group', {name: 'More planning tools'}).getByRole('button', {name: 'Financial freedom'}).click();
  await expect(page.getByRole('region', {name: 'Financial freedom'}).getByLabel('Your yearly spending (EUR)')).toHaveValue('40000');
});

test('F5 debt planner: snowball and avalanche from example figures; more each month clears the debts sooner; avalanche pays no more interest', async ({page}) => {
  await offlineApis(page);
  await seedRecords(page, {});
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  await page.getByRole('group', {name: 'More planning tools'}).getByRole('button', {name: 'Paying off debts'}).click();
  const planner = page.getByRole('region', {name: 'Paying off debts: snowball or avalanche'});
  await planner.getByRole('button', {name: 'Try it with example figures'}).click();
  await expect(planner.getByRole('note')).toContainText('Example figures, not yours');
  await expect(planner.getByRole('list', {name: 'Your debts'}).getByRole('listitem')).toHaveCount(3);
  const snowball = planner.getByRole('article', {name: /snowball/i}), avalanche = planner.getByRole('article', {name: /avalanche/i});
  await expect(snowball).toContainText(/Debt-free by .+after /);
  await expect(avalanche).toContainText(/Debt-free by .+after /);
  const cents = async (card: typeof snowball) => Number((await card.locator('dl > div').first().locator('dd').textContent())!.replace(/[^\d.]/g, ''));
  expect(await cents(avalanche)).toBeLessThanOrEqual(await cents(snowball));
  const before = (await avalanche.locator('.debt-plan-date').textContent())!, monthsBefore = (await avalanche.textContent())!.match(/after ([^.]+?)(Interest|$)/)?.[1];
  await planner.getByLabel(/^Extra each month, on top of the minimums/).fill('600');
  await expect(avalanche.locator('.debt-plan-date')).not.toHaveText(before);
  expect((await avalanche.textContent())!.match(/after ([^.]+?)(Interest|$)/)?.[1]).not.toBe(monthsBefore);
  await expect(planner.locator('.debt-plan-summary')).not.toBeEmpty();
  expect(await stored(page, 'zigoals:debt-planner:v1')).toBeNull(); // example figures are never stored
});

test('#17: the emergency sheet refuses to print a key-like note, prints once it is taken out, and keeps the note on the device', async ({page}) => {
  await page.addInitScript(() => { (window as unknown as {__printed: number}).__printed = 0; window.print = () => { (window as unknown as {__printed: number}).__printed++; }; });
  await offlineApis(page);
  await loadShowcase(page);
  await page.goto('/app/wealth'); await hydrated(page);
  const tools = page.getByRole('group', {name: 'Money tools'});
  await tools.getByRole('button', {name: /^If something happens to me/}).click();
  const sheet = page.getByRole('region', {name: 'If something happens to me'});
  const note = sheet.getByLabel('A note for the people you trust — optional');
  await note.fill(`Call the notary first. ${'ab12'.repeat(16)}`);
  await expect(sheet.locator('.emergency-warnings')).toContainText('looks like a private key');
  await sheet.getByRole('button', {name: 'Print or save as PDF'}).click();
  await expect(sheet.locator('.emergency-refusal')).toContainText('Not printed.');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as {__printed: number}).__printed)).toBe(0);
  await note.fill('Call the notary first. The will is in the grey folder, top drawer of the desk.');
  await expect(sheet.locator('.emergency-warnings')).toHaveCount(0);
  await sheet.getByRole('button', {name: 'Save notes'}).click();
  expect(JSON.stringify(await showcaseRecord(page, 'zigoals:emergency-sheet:v1'))).toContain('grey folder');
  await sheet.getByRole('button', {name: 'Print or save as PDF'}).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {__printed: number}).__printed)).toBe(1);
  await expect(sheet.locator('.emergency-refusal')).toHaveCount(0);
});

async function openMilestones(page: Page) {
  const summary = page.locator('details.nwm-settings > summary');
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  return page.locator('details.nwm-settings');
}
test('F5 net-worth milestones: one already passed is remembered quietly; passing a new one shows a card once', async ({page}) => {
  await offlineApis(page);
  const account = {id: '00000000-0000-4000-8000-000000000001', kind: 'cash', name: 'Fictional current account', currency: 'USD', snapshots: [{id: '00000000-0000-4000-8000-000000000002', date: '2026-11-01', value: '300000', decimals: 2}], payments: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'};
  await seedRecords(page, {[ACCOUNTS_KEY]: {version: 1, items: [account]}, [DASHBOARD_SETTINGS_KEY]: {...presetSettings('balanced'), onboarded: true}});
  await page.goto('/app/wealth'); await hydrated(page);
  let box = await openMilestones(page);
  const said = page.locator('.nwm-status');
  await box.getByRole('checkbox', {name: 'Celebrate when my net worth first passes a milestone'}).check();
  await expect(said).toHaveText('Milestones on, in USD.');
  for (const amount of ['2000', '5000']) {
    await box.getByLabel('A milestone (USD, whole amount)').fill(amount);
    await box.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(said).toHaveText('Milestone added.');
  }
  const list = box.getByRole('list', {name: 'Your milestones'});
  await expect(list.getByRole('listitem').filter({hasText: '2,000'})).toContainText('passed');
  await expect(list.getByRole('listitem').filter({hasText: '5,000'})).toContainText('ahead');
  await expect(page.locator('section.nwm-celebration')).toHaveCount(0); // passed before: no celebration
  // The balance grows past 5,000: a quiet card says so, once.
  await page.getByRole('button', {name: 'Update the balance of Fictional current account'}).click();
  const balance = page.getByRole('form', {name: 'New balance for Fictional current account'});
  await balance.getByLabel(/^Balance \(USD\)/).fill('6000');
  await balance.getByRole('button', {name: 'Save'}).click();
  const card = page.locator('section.nwm-celebration');
  await expect(card.getByRole('heading', {name: /^Past .*5,000/})).toBeVisible({timeout: 15_000});
  await card.getByRole('button', {name: 'Thanks'}).click();
  await expect(card).toHaveCount(0);
  expect(JSON.stringify(await stored(page, 'zigoals:networth-milestones:v1'))).toContain('5000');
  await page.reload(); await hydrated(page);
  box = await openMilestones(page);
  await expect(box.getByRole('list', {name: 'Your milestones'}).getByRole('listitem').filter({hasText: '5,000'})).toContainText('passed');
  await expect(page.locator('section.nwm-celebration')).toHaveCount(0);
});

test.describe('on the Showcase', () => {
  test.beforeEach(async ({page}) => { await offlineApis(page); await loadShowcase(page); });
  test('7.4: a target mix is saved and the drift reads back per asset class; it is kept after a reload', async ({page}) => {
    await page.goto('/app/wealth'); await hydrated(page);
    // Session AO (RR-16, owner decision 13 Nov, deliberate): on a computer this Wealth section folds by default; it is opened from
    // its row as a reader would (tests/phone-nav.ts openFold), then checked exactly as before.
    await openFold(page, 'Your target mix');
    const slot = page.locator('#target-mix');
    await slot.scrollIntoViewIfNeeded();
    // One class the person holds a good share of (read from the table as it is now).
    await expect(slot.locator('table.alloc-table').first()).toBeVisible({timeout: 15_000});
    const rows = await slot.locator('table.alloc-table tbody tr').evaluateAll(trs => trs.map(tr => ({label: tr.querySelector('th')!.textContent!.trim(), now: Number(tr.querySelector('td')!.textContent!.match(/^([\d.]+) %/)?.[1] ?? 'NaN')})));
    const pick = rows.find(r => r.now >= 20)!;
    expect(pick, JSON.stringify(rows)).toBeTruthy();
    const target = Math.round(pick.now) - 15;
    await slot.getByRole('button', {name: 'Set a target mix'}).click();
    const edit = slot.getByRole('group', {name: 'Your target mix'});
    await edit.getByRole('textbox', {name: `Target for ${pick.label}, percent`}).fill(String(target));
    await expect(edit).toContainText(`Together: ${target} %`);
    await edit.getByRole('button', {name: 'Save targets'}).click();
    await expect(slot.getByRole('status')).toHaveText('Your targets are saved on this device.');
    const row = slot.locator('table.alloc-table tbody tr').filter({has: page.getByRole('rowheader', {name: pick.label, exact: true})});
    // Session AL (GAP-017 / P-DVG-63, deliberate): the amount at the target share stands beside the share ("85.0 % €6,800").
    await expect(row.getByRole('cell').nth(1)).toHaveText(new RegExp(`^${target}\\.0 % €[\\d,]+$`));
    // The drift: now minus the target, in percentage points, above the default range.
    await expect(row.getByRole('cell').nth(2)).toHaveText(new RegExp(`^\\+${(pick.now - target).toFixed(1).replace('.', '\\.')} pp Above your target$`));
    expect(await showcaseRecord(page, 'zigoals:target-allocation:v1')).toMatchObject({basis: 'class', targets: expect.arrayContaining([expect.objectContaining({label: pick.label, percent: String(target)})])});
    await page.reload(); await hydrated(page);
    await page.locator('#target-mix').scrollIntoViewIfNeeded();
    await expect(page.locator('#target-mix').getByRole('button', {name: 'Change targets'})).toBeVisible();
    await expect(page.locator('#target-mix')).toContainText(`Targets: ${target} % set`);
  });
});
