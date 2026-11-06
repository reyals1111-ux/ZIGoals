import {expect, test, type Page} from '@playwright/test';
import {buildStoredZip} from '../../../lib/export/zip';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {APPLE_XML} from '../../../lib/import/switch/test-fixtures';

// Session AL third pass (lane L6 for L2, P-MO-59): Moscow MO-039. After "Undo the import" the old "Imported from Apple
// Health: …" line stayed above "…was undone."; the preview showed "… of 2 MB" with no word on what the limit is. Fresh
// profile, desktop 1280, the fictional Apple Health export. Fails on main, passes on the branch.
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Moscow'});
const zip = (entries: Record<string, string>) => Buffer.from(buildStoredZip(Object.entries(entries).map(([name, data]) => ({name, data, modified: new Date('2026-10-06T12:00:00Z')}))));
async function seed(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => { localStorage.clear(); localStorage.setItem(key!, value!); }, [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('habits-health'), onboarded: true})]);
  await page.reload();
}
const card = (page: Page) => page.getByRole('region', {name: 'Bring your history with you.'});

test('MO-039: the 2 MB limit is explained; undoing the import just made replaces its "Imported from" line', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await seed(page);
  const c = card(page);
  await c.getByLabel(/^Choose the export/).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: zip({'apple_health_export/export.xml': APPLE_XML})});
  await expect(c.getByText(/Your Health journal after this import: .+ of 2 MB/)).toBeVisible();
  await expect(c.getByText(/Why a limit: Health keeps your journal as one record in this browser’s storage, which holds up to 2 MB of it\. An import that would not fit is refused before anything changes/)).toBeVisible();
  await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
  await c.getByRole('button', {name: /^Import [\d,]+ records?$/}).click();
  const imported = c.getByRole('status').filter({hasText: 'Imported from Apple Health'});
  await expect(imported).toBeVisible();
  const recent = c.getByRole('region', {name: 'Your imports'});
  await recent.getByRole('button', {name: 'Undo this import'}).click();
  await recent.getByRole('button', {name: 'Undo the import'}).click();
  await expect(c.getByRole('status').filter({hasText: 'was undone'})).toBeVisible();
  await expect(imported).toHaveCount(0);
  await expect(c.getByLabel(/^Choose the export/)).toBeVisible();
  const health = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:health:v1') ?? 'null'));
  expect([health.sleep.nights.length, health.weights.length]).toEqual([0, 0]);
});
