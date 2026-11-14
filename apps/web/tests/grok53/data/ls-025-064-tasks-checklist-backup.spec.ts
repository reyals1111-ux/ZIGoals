import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {buildEverythingZip, collectEverything} from '../../../lib/export/everything';
import {TASKS_KEY, emptyTasks, tasksSchema} from '../../../lib/tasks/schema';
import {addProject, addTask} from '../../../lib/tasks/engine';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {checklistDaysSchema, checklistSchema, emptyChecklist} from '../../../lib/checklist/schema';
import {addCustom} from '../../../lib/checklist/store';
import {RECORD_LABELS} from '../../../lib/vault/backup-records';
import {openSettings} from '../../settings-open';

/**
 * Session AL (P-LS-36; LS-025, LS-064): Tasks and the Checklist come back from both backups. Fresh profile, fictional
 * records, a fixed clock and zone; no request leaves the page.
 * 1. Export everything ZIP → Settings → Your data → Restore from a backup: Tasks, the Checklist path and its day history
 *    are offered (the Health quick inputs under Health) and restore value for value; today's ticks stay on the device.
 * 2. Keep a protected copy: the encrypted backup's preview lists Tasks and the Checklist, and each restores
 *    (needs the integrator's wiring of lib/vault/backup-lists.ts into components/private-vault-tools.tsx).
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const DAY = '2026-11-02', NOW = new Date(`${DAY}T08:00:00.000Z`);
const TASKS = tasksSchema.parse(addTask(addProject(emptyTasks(), {name: 'Fictional home', colour: 'teal'}, 'p'), {title: 'Fictional: call the bank', level: 1, projectId: 'p', due: DAY}, {id: 'task_a', at: NOW, today: DAY, allowPast: true}));
const PATH = (() => { const r = addCustom(emptyChecklist(), {label: 'Fictional tidy desk'}, {id: 'ck_desk', at: NOW}); return checklistSchema.parse({...r, healthItems: [{id: 'ck_water', kind: 'health', input: 'water', addedAt: NOW.toISOString()}], order: [...r.order, 'ck_water']}); })();
const DAYS = checklistDaysSchema.parse({version: 1, days: {'2026-10-31': {total: 2, done: 2, perfect: true}}});
const RECORDS = {[TASKS_KEY]: JSON.stringify(TASKS), [CHECKLIST_KEY]: JSON.stringify(PATH), [CHECKLIST_DAYS_KEY]: JSON.stringify(DAYS)};
const stored = async (page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null');
test.beforeEach(async ({page}) => {
  await page.clock.install({time: NOW});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});

test('LS-064: the readable export restores Tasks and the Checklist; the Checklist note says how', async ({page}) => {
  const zip = buildEverythingZip(collectEverything(RECORDS, {now: NOW, version: 'x', commit: 'y', localSimulation: null}), {date: DAY, showcase: false, now: NOW});
  await page.goto('/app/settings/data');
  const region = page.getByRole('region', {name: 'Restore from a backup'});
  await expect(region).toContainText('The Checklist restores too');
  await region.getByLabel('Export everything ZIP').setInputFiles({name: `zigoals-export-${DAY}.zip`, mimeType: 'application/zip', buffer: Buffer.from(zip.bytes)});
  const preview = region.getByLabel('What this backup holds');
  await expect(preview.getByRole('group', {name: 'Today and Life'})).toContainText('Checklist path and favourites');
  await expect(preview.getByRole('group', {name: 'Health'})).toContainText('Checklist Health quick inputs');
  for (const name of ['Tasks', 'Checklist path and favourites', 'Checklist day history', 'Checklist Health quick inputs']) await preview.getByRole('combobox', {name: `${name}: what to do`}).selectOption('replace');
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  await expect(region.locator('.restore-backup').getByRole('status')).toContainText('Tasks');
  expect(await stored(page, TASKS_KEY)).toEqual(TASKS);
  expect(await stored(page, CHECKLIST_KEY)).toEqual(PATH);
  expect(await stored(page, CHECKLIST_DAYS_KEY)).toEqual(DAYS);
  await page.goto('/app/tasks');
  await expect(page.getByRole('main')).toContainText('Fictional: call the bank');
});

test('LS-025: the encrypted backup holds Tasks and the Checklist, previews them and restores each', async ({page}) => {
  await openSettings(page);
  await page.evaluate(values => { for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, RECORDS);
  await page.reload();
  const vault = page.locator('#private-vault');
  await vault.getByLabel('Include my Health records in this encrypted download.').check();
  await vault.getByRole('button', {name: 'Prepare encrypted backup'}).click();
  // Exact: "I saved the recovery secret." and "Backup recovery secret" (distinct names a person can tell apart) contain it too.
  const secret = await vault.getByLabel('Recovery secret', {exact: true}).inputValue();
  await vault.getByLabel('I saved the recovery secret.').check();
  const download = page.waitForEvent('download');
  await vault.getByRole('button', {name: 'Download encrypted backup'}).click();
  const file = readFileSync((await (await download).path())!);
  // Session AL (deliberate, sweep 2): a file with Tasks or the Checklist is format 3, and format 4 once it also carries the
  // device's other records (lib/vault/backup.ts backupFormatVersion). This profile may hold such records the app wrote on
  // its own, so the format is checked against the sections the unlocked inventory lists below, never assumed.
  const version = JSON.parse(file.toString('utf8')).version as number;
  expect([3, 4]).toContain(version);
  await page.evaluate(keys => { for (const k of keys) localStorage.removeItem(k); }, [TASKS_KEY, CHECKLIST_KEY, CHECKLIST_DAYS_KEY]);
  await vault.getByText('Restore an encrypted backup', {exact: true}).click();
  await vault.getByLabel('Encrypted backup file').setInputFiles({name: 'zigoals-encrypted-backup-v1.json', mimeType: 'application/json', buffer: file});
  await vault.getByLabel('Backup recovery secret').fill(secret);
  await vault.getByRole('button', {name: 'Unlock and preview'}).click();
  const inventory = vault.getByLabel('Protected backup inventory');
  await expect(inventory).toContainText('Format version');
  const listed = (await inventory.textContent()) ?? '';
  expect(version).toBe(Object.values(RECORD_LABELS).some(label => listed.includes(label)) ? 4 : 3);
  await expect(inventory).toContainText(`Format version ${version}`);
  await expect(inventory).toContainText('Open tasks: 1');
  await expect(inventory).toContainText('Path items: 1 · Health quick inputs: 1 · Days recorded: 1');
  for (const part of ['Tasks', 'Checklist']) {
    await vault.getByLabel('Module to restore').selectOption({label: part});
    await vault.getByLabel('Replace the selected module with this validated backup.').check();
    await vault.getByRole('button', {name: 'Restore selected module'}).click();
    await expect(vault.getByRole('status')).toContainText('Selected module restored');
  }
  expect(await stored(page, TASKS_KEY)).toEqual(TASKS);
  expect(await stored(page, CHECKLIST_KEY)).toEqual(PATH);
  expect(await stored(page, CHECKLIST_DAYS_KEY)).toEqual(DAYS);
});
