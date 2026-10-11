import {expect, test, type Page} from '@playwright/test';
import {buildStoredZip} from '../lib/export/zip';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {APPLE_XML, GARMIN, LOOP} from '../lib/import/switch/test-fixtures';

// Session W Part 7: Settings → Switch to ZIGoals with fictional exports (lib/import/switch/test-fixtures.ts). The file is
// read in the bundled Web Worker on this device; the preview says what would come in; nothing is written before the
// person confirms; "Undo this import" removes exactly what was added. No request leaves for any other site.
test.use({timezoneId: 'Europe/Brussels'});
const zip = (entries: Record<string, string>) => Buffer.from(buildStoredZip(Object.entries(entries).map(([name, data]) => ({name, data, modified: new Date('2026-10-06T12:00:00Z')}))));
async function seed(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('habits-health'), onboarded: true})]);
  await page.reload();
}
const card = (page: Page) => page.getByRole('region', {name: 'Bring your history with you.'});
const choose = (page: Page) => card(page).getByLabel(/^Choose the export/);
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test('Apple Health: read in the worker, checked in the preview, imported with the Health box ticked, then undone', async ({page, baseURL}) => {
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  const outside: string[] = [], workers: string[] = [];
  page.on('request', request => { if (!request.url().startsWith(baseURL!) && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) outside.push(request.url()); });
  page.on('worker', worker => workers.push(worker.url()));
  await seed(page);
  await choose(page).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: zip({'apple_health_export/export.xml': APPLE_XML, 'apple_health_export/export_cda.xml': '<ClinicalDocument/>'})});
  const c = card(page);
  await expect(c.getByRole('heading', {name: 'Check what comes in'})).toBeVisible();
  expect(workers.some(url => /\/_next\/static\/chunks\/turbopack-worker-/.test(url))).toBe(true);
  await expect(c.getByText('Apple Health export · ')).toBeVisible();
  const row = (name: string) => c.getByRole('row', {name: new RegExp(`^${name}`)});
  await expect(row('Nights and naps')).toContainText(/Nights and naps\s*2\s*0\s*0/);
  await expect(row('Steps and workouts')).toContainText(/3\s*0\s*0/);
  await expect(c.getByText(/Night ending 2026-10-06: in bed 22:30 → up 06:30 · 7 h 15 min asleep/)).toBeVisible();
  await expect(c.getByText(/Heart rate: each day's lowest, average and highest/)).toBeVisible();
  await expect(c.getByText(/Your Health journal after this import: .+ of 2 MB/)).toBeVisible();
  // Nothing is written while the preview shows.
  expect(await stored(page, 'zigoals:health:v1')).toBeNull();
  const go = c.getByRole('button', {name: 'Import 9 records'});
  await expect(go).toBeDisabled();
  await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
  await go.click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Apple Health'})).toHaveText('Imported from Apple Health: 2 nights and naps, 1 meditation session, 1 day of vitals, 3 activity lines, 2 weights.');
  const health = await stored(page, 'zigoals:health:v1');
  expect(health.schemaVersion).toBe(4);
  expect(health.sleep.nights.map((n: {timeZone: string}) => n.timeZone)).toEqual(['Europe/Brussels', 'Europe/Brussels']);
  expect(health.weights.map((w: {grams: number}) => w.grams)).toEqual([70400, 69989]);
  expect((await stored(page, 'zigoals:import-batches:v1')).batches).toHaveLength(1);
  // The week on Health shows the imported vitals.
  await page.goto('/app/health');
  await expect(page.getByRole('group', {name: 'Resting heart rate · bpm, last 7 days'})).toContainText('58');
  await page.goto('/app/settings');
  const recent = card(page).getByRole('region', {name: 'Your imports'});
  await recent.getByRole('button', {name: 'Undo this import'}).click();
  await expect(recent.getByText('This removes the 9 records it added that are still here.')).toBeVisible();
  await recent.getByRole('button', {name: 'Undo the import'}).click();
  await expect(card(page).getByRole('status').filter({hasText: 'was undone'})).toBeVisible();
  const after = await stored(page, 'zigoals:health:v1');
  expect([after.sleep.nights.length, after.weights.length, after.activity.length, after.meditation.sessions.length]).toEqual([0, 0, 0, 0]);
  expect(outside).toEqual([]);
});

test('Loop Habit Tracker: habits with their days come in, a second import adds nothing, undo removes them', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await seed(page);
  const file = {name: 'Loop Habits CSV 2026-10-06.zip', mimeType: 'application/zip', buffer: zip(LOOP)};
  await choose(page).setInputFiles(file);
  const c = card(page);
  await expect(c.getByText('Loop Habit Tracker: 4 new habits, 6 check-ins')).toBeVisible();
  await expect(c.getByRole('row', {name: /^Water/})).toContainText('at least 8 glasses');
  await expect(c.getByRole('row', {name: /^Old habit/})).toContainText('New · archived');
  await c.getByRole('button', {name: 'Import 4 habits'}).click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Loop'})).toHaveText('Imported from Loop Habit Tracker: 4 habits with 6 check-ins.');
  expect((await stored(page, 'zigoals:habits:v1')).habits.map((h: {title: string}) => h.title)).toEqual(['Meditate', 'Run', 'Water', 'Old habit']);
  await c.getByRole('button', {name: 'Import another export'}).click();
  await choose(page).setInputFiles(file);
  await expect(c.getByRole('button', {name: 'Nothing new to import'})).toBeDisabled();
  await c.getByRole('button', {name: 'Start over'}).click();
  await c.getByRole('region', {name: 'Your imports'}).getByRole('button', {name: 'Undo this import'}).click();
  await c.getByRole('button', {name: 'Undo the import'}).click();
  await expect(c.getByRole('status').filter({hasText: 'was undone'})).toBeVisible();
  expect((await stored(page, 'zigoals:habits:v1')).habits).toEqual([]);
});

test('Garmin is recognised and not read, with the reason; a MyFitnessPal file goes to Import meals with its columns matched', async ({page}) => {
  await seed(page);
  await choose(page).setInputFiles({name: 'garmin.zip', mimeType: 'application/zip', buffer: zip(GARMIN)});
  await expect(card(page).getByRole('alert')).toContainText('Garmin does not publish the layout of its export');
  await card(page).getByRole('button', {name: 'Choose another export'}).click();
  const mfp = 'Date,Meal,Calories,Fat (g),Saturated Fat,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note\n2026-10-01,Breakfast,420,12,3,560,300,55,6,12,22,10,8,15,20,\n';
  const mfpFile = {name: 'Nutrition-Summary-2026-01-01-to-2026-10-01.csv', mimeType: 'text/csv', buffer: Buffer.from(mfp)};
  await choose(page).setInputFiles(mfpFile);
  await expect(card(page).getByRole('alert')).toContainText('This is a MyFitnessPal export. Its meals go into Health → Diary → Import a nutrition CSV');
  await card(page).getByRole('link', {name: 'Open Health → Import meals'}).click();
  await page.waitForURL(/\/app\/health\?import=meals$/);
  const panel = page.getByRole('region', {name: 'Import meals'});
  await panel.getByLabel('CSV file').setInputFiles(mfpFile);
  await expect(panel.getByText(/This looks like MyFitnessPal's Nutrition-Summary/)).toBeVisible();
  const field = (name: string) => panel.locator('label.field').filter({has: page.locator('span', {hasText: new RegExp(`^${name}$`)})}).locator('select');
  await expect(field('Food · required')).toHaveValue('1');
  await expect(field('Meal')).toHaveValue('1');
  await expect(field('Calories')).toHaveValue('2');
  // MyFitnessPal's calcium and iron are a percentage of a daily value: never matched as amounts.
  await expect(field('Calcium')).toHaveValue('');
  await expect(field('Iron')).toHaveValue('');
});

test('Showcase never imports: it holds fictional records only', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/settings');
  await choose(page).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: zip({'apple_health_export/export.xml': APPLE_XML})});
  await expect(card(page).getByRole('alert')).toHaveText('Showcase holds fictional records only, so imports are off here. Leave Showcase to bring in your own export.');
});

test('a long export: past three quarters of the storage, the preview offers the newest days that fit, and imports only those', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await seed(page);
  const days: string[] = [], start = Date.parse('2019-01-01T00:00:00Z');
  for (let i = 0; i < 2800; i++) {
    const d = new Date(start + i * 86_400_000).toISOString().slice(0, 10), next = new Date(start + (i + 1) * 86_400_000).toISOString().slice(0, 10);
    days.push(`<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Fictional Watch" startDate="${d} 23:00:00 +0000" endDate="${next} 06:30:00 +0000" value="HKCategoryValueSleepAnalysisInBed"/>`,
      `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Fictional Watch" unit="count" startDate="${d} 12:00:00 +0000" endDate="${d} 12:30:00 +0000" value="${6000 + i}"/>`,
      `<Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Fictional Watch" unit="count/min" startDate="${d} 08:00:00 +0000" endDate="${d} 08:00:00 +0000" value="58"/>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE HealthData [\n<!ELEMENT HealthData (ExportDate,Me,(Record)*)>\n]>\n<HealthData locale="en_BE">\n${days.join('\n')}\n</HealthData>\n`;
  await choose(page).setInputFiles({name: 'export.xml', mimeType: 'text/xml', buffer: Buffer.from(xml)});
  const c = card(page);
  await expect(c.getByText(/more than three quarters of what this browser keeps for Health/)).toBeVisible();
  const window = c.getByRole('radio', {name: /^From .+ on \(the most that fits comfortably\)$/});
  await window.check();
  await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
  const go = c.getByRole('button', {name: /^Import [\d,]+ records$/});
  const label = await go.textContent(), count = Number(label!.replace(/\D/g, ''));
  expect(count).toBeLessThan(2800 * 3);
  await go.click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Apple Health'})).toBeVisible();
  const bytes = await page.evaluate(() => new TextEncoder().encode(localStorage.getItem('zigoals:health:v1') ?? '').byteLength);
  expect(bytes).toBeLessThanOrEqual(1_500_000);
});
