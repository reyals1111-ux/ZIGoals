import {expect, type Page} from '@playwright/test';
import {buildStoredZip} from '../lib/export/zip';
import {APPLE_XML, FITBIT, GARMIN, LOOP, OURA, SAMSUNG} from '../lib/import/switch/test-fixtures';
import {journey, open} from './kit';

// Session X Part 14, journeys J215–J221: Settings → Switch to ZIGoals with the repository's fictional exports
// (lib/import/switch/test-fixtures.ts). Read on the device; nothing written before confirming; undo removes exactly
// what came in; no request leaves for another site.
const zip = (entries: Record<string, string>) => Buffer.from(buildStoredZip(Object.entries(entries).map(([name, data]) => ({name, data, modified: new Date('2026-10-06T12:00:00Z')}))));
const card = (page: Page) => page.getByRole('region', {name: 'Bring your history with you.'});
const choose = (page: Page) => card(page).getByLabel(/^Choose the export/);
function outside(page: Page) {
  const seen: string[] = [], origin = new URL(page.url() === 'about:blank' ? 'http://127.0.0.1' : page.url()).origin;
  page.on('request', r => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).hostname !== new URL(origin).hostname && !u.includes('127.0.0.1')) seen.push(u); });
  return seen;
}

journey('J215', 'Apple Health export.zip: the preview, Health\'s box ticked, imported, then undone', {views: 'all', data: ['E']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await open(page, '/app/settings');
  const seen = outside(page);
  await choose(page).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: zip({'apple_health_export/export.xml': APPLE_XML})});
  const c = card(page);
  await expect(c.getByRole('heading', {name: 'Check what comes in'})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('zigoals:health:v1'))).toBeNull();
  const go = c.getByRole('button', {name: /^Import \d+ records/});
  await expect(go).toBeDisabled();
  await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
  await go.click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Apple Health'})).toBeVisible();
  const recent = c.getByRole('region', {name: 'Your imports'});
  await recent.getByRole('button', {name: 'Undo this import'}).click();
  await recent.getByRole('button', {name: 'Undo the import'}).click();
  await expect(c.getByRole('status').filter({hasText: 'was undone'})).toBeVisible();
  expect(seen).toEqual([]);
});

for (const [id, name, file, label] of [
  ['J216', 'Fitbit / Google Takeout', {name: 'takeout.zip', mimeType: 'application/zip', buffer: zip(FITBIT)}, /Fitbit|Google/],
  ['J217', 'Samsung Health', {name: 'samsunghealth.zip', mimeType: 'application/zip', buffer: zip(SAMSUNG)}, /Samsung/],
  ['J217b', 'Oura', {name: 'oura.zip', mimeType: 'application/zip', buffer: zip(OURA)}, /Oura/],
  ['J217c', 'Loop Habit Tracker', {name: 'Loop Habits CSV 2026-10-06.zip', mimeType: 'application/zip', buffer: zip(LOOP)}, /Loop/],
] as const) {
  journey(id, `${name}: recognised and previewed; nothing written before confirming`, {views: ['D', 'P'], data: ['E']}, async j => {
    const {page} = j;
    await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
    await open(page, '/app/settings');
    const before = await page.evaluate(() => JSON.stringify({...localStorage}));
    await choose(page).setInputFiles(file);
    await expect(card(page)).toContainText(label);
    expect(await page.evaluate(() => JSON.stringify({...localStorage}))).toBe(before);
  });
}

journey('J218', 'a Garmin export is recognised, not read, and says why', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const before = await page.evaluate(() => JSON.stringify({...localStorage}));
  await choose(page).setInputFiles({name: 'garmin.zip', mimeType: 'application/zip', buffer: zip(GARMIN)});
  await expect(card(page)).toContainText(/Garmin/);
  await expect(card(page).getByRole('button', {name: /^Import \d+/})).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({...localStorage}))).toBe(before);
});
