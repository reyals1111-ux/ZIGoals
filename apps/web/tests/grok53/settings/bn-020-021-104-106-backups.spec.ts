import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6, second pass): Berlin BN-020, BN-021, BN-104, BN-106 and Denver D-058/D-219 on Settings' backups.
// Desktop 1280, a fresh empty profile; fictional files only.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('BN-104/BN-020: an export names its file and never claims a save the browser has not made', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const habits = page.getByRole('region', {name: 'Habits backup', exact: true});
  await expect(habits).toContainText('In this file:');
  await expect(habits).toContainText('Not in it:');
  await expect(habits.locator('code')).toContainText(/^zigoals-habits-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const [download] = await Promise.all([page.waitForEvent('download'), habits.getByRole('button', {name: 'Export Habits'}).click()]);
  expect(download.suggestedFilename()).toMatch(/^zigoals-habits-backup-/);
  await expect(habits.getByRole('status')).toContainText('If it asks where to save it, the copy exists once you choose a place.');
  await expect(habits).not.toContainText('Backup download started');
  // BN-020: the Goals and Wealth card names its file, whose name differs from the card's title.
  await expect(page.getByRole('region', {name: 'Goals and Wealth backup', exact: true}).locator('code')).toContainText('zigoals-positions-and-goals-backup-');
});

test('BN-021/D-219/D-058: only the card used last speaks, and a refused file is explained under its field', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const health = page.getByRole('region', {name: 'Health backup', exact: true}), habits = page.getByRole('region', {name: 'Habits backup', exact: true});
  await Promise.all([page.waitForEvent('download'), health.getByRole('button', {name: 'Export Health'}).click()]);
  await expect(health.getByRole('status')).toBeVisible();
  await habits.getByText('Restore Habits from a file', {exact: true}).click();
  const input = habits.getByLabel('Choose Habits backup');
  await input.setInputFiles({name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"kind":')});
  const alert = habits.getByRole('alert');
  await expect(alert).toContainText('not a ZIGoals module backup');
  // Right under the field: the alert follows the file field inside the open restore panel.
  expect(await habits.locator('details.backup-restore').getByRole('alert').count()).toBe(1);
  await expect(health.getByRole('status')).toHaveCount(0);
  // A second refused file replaces the line; nothing piles up.
  await input.setInputFiles({name: 'junk2.json', mimeType: 'application/json', buffer: Buffer.from('[]')});
  await expect(page.locator('.private-backup-grid [role="alert"]')).toHaveCount(1);
});

test('BN-106: the restore panel says what the file does not bring back', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const goals = page.getByRole('region', {name: 'Goals and Wealth backup', exact: true});
  await expect(goals).toContainText('your theme and page switches, Chess, Earn progress, Habits, Health, the Checklist and Tasks');
});

test('BN-021: the encrypted-backup field answers a picked file at once', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const panel = page.locator('#private-vault');
  await panel.getByText('Restore an encrypted backup', {exact: true}).click();
  await panel.getByLabel('Encrypted backup file', {exact: true}).setInputFiles({name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}')});
  await expect(panel.getByRole('alert')).toContainText('not a ZIGoals protected (encrypted) backup');
});
