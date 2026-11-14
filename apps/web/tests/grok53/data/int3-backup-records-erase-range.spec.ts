import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../../../lib/showcase-data';
import {readStoredZip} from '../../../lib/export/zip-reader';
import {HABITS_KEY} from '../../../lib/habits';
import {PLATFORM_KEY} from '../../../lib/positions';
import {ACCOUNTS_KEY} from '../../../lib/w-device-keys';
import {JOURNAL_KEY} from '../../../lib/journal/schema';
import {MONEY_LOG_KEY} from '../../../lib/money-log/schema';
import {afterGoto} from '../../settings-open';

/**
 * Session AL (INT third pass): fresh profile, fictional records, a fixed clock and zone; no request leaves the page.
 * 1. Keep a protected copy also holds accounts, the journal and the money log (format 4) and restores them.
 * 2. GAP-176 (C-BN-28): Settings → Your data → Erase one area: Habits go, Goals stay, Undo brings Habits back.
 * 3. GAP-175 (C-BN-27): Export everything with two dates makes a CSV-only ZIP of that range.
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const DAY = '2026-11-05', NOW = new Date(`${DAY}T08:00:00.000Z`), AT = '2026-10-01T09:00:00.000Z';
const ACCOUNTS = {version: 1, items: [{id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a01', kind: 'savings', name: 'Fictional savings', currency: 'EUR', snapshots: [{id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a02', date: '2026-10-01', value: '125000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]};
const JOURNAL = {version: 1, entries: [{id: 'j_sep', date: '2026-09-30', text: 'Fictional: September', createdAt: '2026-09-30T08:00:00.000Z'}, {id: 'j_oct', date: '2026-10-15', text: 'Fictional: October', createdAt: '2026-10-15T08:00:00.000Z'}], shareWithAi: false, followUps: true};
const MONEY = {version: 1, entries: [{id: 'm1', kind: 'expense', amount: '4.50', currency: 'EUR', category: 'Food & drink', date: '2026-10-31', createdAt: AT}], weekStartsOn: 'monday'};
const RECORDS = {[ACCOUNTS_KEY]: JSON.stringify(ACCOUNTS), [JOURNAL_KEY]: JSON.stringify(JOURNAL), [MONEY_LOG_KEY]: JSON.stringify(MONEY)};
const stored = async (page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null');
const seed = async (page: Page, path: string, values: Record<string, string>) => { await page.goto(path); await afterGoto(page, path); await page.evaluate(v => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values); await page.reload(); };
test.beforeEach(async ({page}) => {
  await page.clock.install({time: NOW});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});

test('INT: the protected copy holds accounts, the journal and the money log, previews them and restores each', async ({page}) => {
  await seed(page, '/app/settings', RECORDS);
  const vault = page.locator('#private-vault');
  await vault.getByRole('button', {name: 'Prepare encrypted backup'}).click();
  const secret = await vault.getByLabel('Recovery secret', {exact: true}).inputValue();
  await vault.getByLabel('I saved the recovery secret.').check();
  const download = page.waitForEvent('download');
  await vault.getByRole('button', {name: 'Download encrypted backup'}).click();
  const file = readFileSync((await (await download).path())!);
  expect(JSON.parse(file.toString('utf8')).version).toBe(4);
  expect(file.toString('utf8')).not.toContain('Fictional');
  await page.evaluate(keys => { for (const k of keys) localStorage.removeItem(k); }, Object.keys(RECORDS));
  await vault.getByText('Restore an encrypted backup', {exact: true}).click();
  await vault.getByLabel('Encrypted backup file').setInputFiles({name: 'zigoals-encrypted-backup-v1.json', mimeType: 'application/json', buffer: file});
  await vault.getByLabel('Backup recovery secret').fill(secret);
  await vault.getByRole('button', {name: 'Unlock and preview'}).click();
  const inventory = vault.getByLabel('Protected backup inventory');
  await expect(inventory).toContainText('Format version 4');
  await expect(inventory).toContainText('Spending: 1');
  await expect(inventory).toContainText('Journal: 2');
  for (const label of [/^More Goals and Wealth records/, /^Today and Life records/]) {
    await vault.getByLabel('Module to restore').selectOption({label: (await vault.getByLabel('Module to restore').locator('option').allTextContents()).find(t => label.test(t))!});
    await vault.getByLabel('Replace the selected module with this validated backup.').check();
    await vault.getByRole('button', {name: 'Restore selected module'}).click();
    await expect(vault.getByRole('status')).toContainText('Selected module restored');
  }
  expect(await stored(page, ACCOUNTS_KEY)).toEqual(ACCOUNTS);
  expect(await stored(page, JOURNAL_KEY)).toEqual(JOURNAL);
  expect(await stored(page, MONEY_LOG_KEY)).toEqual(MONEY);
});

test('GAP-176 (C-BN-28): Erase one area clears Habits only, says what went, and Undo brings it back', async ({page}) => {
  const {records} = buildShowcase('2026-10-20', 'Europe/Brussels', {aa: true});
  await seed(page, '/app/settings/data', records);
  const habitsBefore = await stored(page, HABITS_KEY), goalsBefore = await stored(page, PLATFORM_KEY);
  const region = page.getByRole('region', {name: 'Restore from a backup'});
  await region.getByText('Erase one area instead', {exact: true}).click();
  await region.getByLabel('Area').selectOption('Habits');
  await region.getByRole('button', {name: 'Show what would be erased'}).click();
  const list = region.getByRole('group', {name: 'What erasing Habits removes'});
  await expect(list).toContainText('Habits');
  await list.getByLabel('Erase these from this device. I can undo it for 7 days.').check();
  await list.getByRole('button', {name: 'Erase Habits'}).click();
  await expect(region.getByRole('status').first()).toContainText('Erased on this device: Habits');
  expect((await stored(page, HABITS_KEY)).habits).toEqual([]);
  expect(await stored(page, PLATFORM_KEY)).toEqual(goalsBefore);
  await region.getByRole('button', {name: 'Undo this erase'}).click();
  await expect(region.getByRole('status').first()).toContainText('The erase is undone');
  expect(await stored(page, HABITS_KEY)).toEqual(habitsBefore);
});

test('GAP-175 (C-BN-27): Export everything with two dates makes a CSV-only ZIP of that range', async ({page}) => {
  await seed(page, '/app/settings', RECORDS);
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('From').fill('2026-10-01');
  await section.getByLabel('To').fill('2026-09-01');
  await expect(section.getByText('Choose a start date on or before the end date.')).toBeVisible();
  await section.getByLabel('To').fill('2026-10-31');
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const download = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export these dates'}).click();
  const zip = await download;
  expect(zip.suggestedFilename()).toBe('zigoals-export-2026-10-01-to-2026-10-31.zip');
  const files = readStoredZip(new Uint8Array(readFileSync((await zip.path())!)));
  expect(files.map(f => f.name)).not.toContain('everything.json');
  const journal = new TextDecoder().decode(files.find(f => f.name === 'journal.csv')!.data);
  expect(journal).toContain('Fictional: October');
  expect(journal).not.toContain('Fictional: September');
  await expect(section.getByRole('status')).toContainText('cannot be restored');
});
