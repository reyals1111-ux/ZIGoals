import {expect, test, type Page} from '@playwright/test';
import {encryptBackup} from '../lib/vault/backup';
import {createEmptyHealth, HEALTH_STORAGE_KEY, healthSchema} from '../lib/health';
import {emptyPlatform, PLATFORM_KEY, platformSchema} from '../lib/positions';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, presetSettings} from '../lib/dashboard-settings';
import {buildShowcase} from '../lib/showcase-data';

// Session X Part 13 (docs/verification/x-cloud/DATA_SAFETY.md): encrypted backups made by older versions of each module
// (Health v1, v2 and v3, Today settings v1 and v2, finance v4) restore into this build through Settings, as a person
// does it, and every record comes back readable; the current versions with Session W's sections in use (Health v4 with
// sleep and meditation, settings v3 with links) come back byte for byte; a wrong secret or another file changes
// nothing. Fictional records.
// The data paths are the same on a phone, so the drill runs on the desktop project only.
const at = '2026-09-23T12:00:00.000Z';
const weight = {id: 'health_59a35604-3696-4a78-b455-4015acb66885', date: '2026-09-23', grams: 70000, createdAt: at, updatedAt: at};
const healthV1 = {...createEmptyHealth(), weights: [weight]};
const OLD: [label: string, domain: 'health' | 'settings' | 'finance', key: string, record: object][] = [
  ['Health v1', 'health', HEALTH_STORAGE_KEY, healthV1],
  ['Health v2', 'health', HEALTH_STORAGE_KEY, {...healthV1, schemaVersion: 2, fasting: {version: 1, sessions: []}}],
  ['Health v3', 'health', HEALTH_STORAGE_KEY, {...healthV1, schemaVersion: 3, fasting: {version: 1, sessions: []}}],
  ['settings v1', 'settings', DASHBOARD_SETTINGS_KEY, presetSettings('habits-health')],
  ['settings v2', 'settings', DASHBOARD_SETTINGS_KEY, {...presetSettings('habits-health'), schemaVersion: 2, journalTimeZone: 'Europe/Brussels'}],
  ['finance v4', 'finance', PLATFORM_KEY, {...emptyPlatform(), schemaVersion: 4}],
];
const SCHEMAS = {health: healthSchema, settings: dashboardSettingsSchema, finance: platformSchema};
// The Showcase's own records: Health v4 with its sleep and meditation groups, settings v3 with its links.
const showcase = buildShowcase('2026-09-20').records;
const CURRENT: [label: string, domain: 'health' | 'settings', key: string][] = [['Health v4 (sleep, meditation)', 'health', HEALTH_STORAGE_KEY], ['settings v3 (links)', 'settings', DASHBOARD_SETTINGS_KEY]];

async function restore(page: Page, file: string, secret: string) {
  await page.getByText('Restore an encrypted backup', {exact: true}).click();
  await page.getByLabel('Encrypted backup file', {exact: true}).setInputFiles({name: 'zigoals-encrypted-backup-v1.json', mimeType: 'application/json', buffer: Buffer.from(file)});
  await page.getByLabel('Backup recovery secret', {exact: true}).fill(secret);
  await page.getByRole('button', {name: 'Unlock and preview', exact: true}).click();
}

test.beforeEach(async ({page, isMobile}) => {
  test.skip(isMobile, 'The data paths are the same on a phone; the drill runs once.');
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});

for (const [label, domain, key, record] of OLD) {
  test(`a ${label} backup restores into this build, every record readable`, async ({page}) => {
    // The record is valid for its own version (the fixture is what that version wrote).
    expect(SCHEMAS[domain].safeParse(record).success, `${label} fixture is valid`).toBe(true);
    const {file, recovery} = await encryptBackup({[domain]: JSON.stringify(record)});
    await page.goto('/app/settings');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await restore(page, file, recovery);
    await page.getByLabel(/^Module to restore/).selectOption(domain);
    await page.getByLabel('Replace the selected module with this validated backup.', {exact: true}).check();
    await page.getByRole('button', {name: 'Restore selected module', exact: true}).click();
    await page.getByText('Selected module restored; prior local bytes retained.', {exact: true}).waitFor();
    const stored = await page.evaluate(k => localStorage.getItem(k), key);
    expect(stored, `${label} is stored`).not.toBeNull();
    const parsed = SCHEMAS[domain].parse(JSON.parse(stored!));
    // Nothing lost: the version never goes down, and the fictional records are all there.
    expect(parsed.schemaVersion).toBeGreaterThanOrEqual((record as {schemaVersion: number}).schemaVersion);
    if (domain === 'health') expect((parsed as {weights: unknown[]}).weights).toEqual([weight]);
    if (domain === 'settings') expect((parsed as {widgets: {id: string}[]}).widgets.map(w => w.id)).toEqual((record as {widgets: {id: string}[]}).widgets.map(w => w.id));
    if (domain === 'finance') expect(parsed).toMatchObject({goals: [], positions: []});
    // And the page that shows it reads it.
    if (domain === 'health') { await page.goto('/app/health'); await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Weight', exact: true}).click(); await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('70 kg'); }
  });
}

for (const [label, domain, key] of CURRENT) {
  test(`a ${label} backup comes back byte for byte`, async ({page}) => {
    const raw = showcase[key]!, record = JSON.parse(raw) as {schemaVersion: number};
    expect(record.schemaVersion, `${label} is the current version`).toBe(domain === 'health' ? 4 : 3);
    expect(raw).toContain(domain === 'health' ? '"meditation"' : '"links"');
    const {file, recovery} = await encryptBackup({[domain]: raw});
    await page.goto('/app/settings');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await restore(page, file, recovery);
    await page.getByLabel(/^Module to restore/).selectOption(domain);
    await page.getByLabel('Replace the selected module with this validated backup.', {exact: true}).check();
    await page.getByRole('button', {name: 'Restore selected module', exact: true}).click();
    await page.getByText('Selected module restored; prior local bytes retained.', {exact: true}).waitFor();
    expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), key))!)).toEqual(record);
  });
}

test('a wrong secret or another file is refused with a plain reason, and nothing changes', async ({page}) => {
  const {file} = await encryptBackup({health: JSON.stringify(healthV1)});
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HEALTH_STORAGE_KEY, JSON.stringify(healthV1)]);
  await page.reload();
  const before = await page.evaluate(() => JSON.stringify({...localStorage}));
  await restore(page, file, 'not the secret');
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({...localStorage}))).toBe(before);
  await page.getByLabel('Encrypted backup file', {exact: true}).setInputFiles({name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}')});
  await page.getByRole('button', {name: 'Unlock and preview', exact: true}).click();
  await expect(page.getByText(/not a complete ZIGoals encrypted backup/)).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({...localStorage}))).toBe(before);
});
