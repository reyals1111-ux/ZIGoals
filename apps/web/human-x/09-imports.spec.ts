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

journey('J216', 'Fitbit / Google Takeout CSVs: recognised and previewed, nothing written before confirming; imported, then undone', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await open(page, '/app/settings');
  const seen = outside(page);
  await choose(page).setInputFiles({name: 'takeout-20261006.zip', mimeType: 'application/zip', buffer: zip(FITBIT)});
  const c = card(page);
  await expect(c.getByRole('heading', {name: 'Check what comes in'})).toBeVisible();
  await expect(c.locator('.import-summary')).toContainText('Fitbit / Google Health export');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:health:v1'))).toBeNull();
  const go = c.getByRole('button', {name: /^Import \d+ records?$/});
  await expect(go).toBeDisabled();
  await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
  await go.click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Fitbit / Google Health'})).toBeVisible();
  await open(page, '/app/health?view=sleep');
  await expect(page.getByRole('region', {name: 'Recent nights and naps'})).toContainText('Night ending 2026-10-05');
  await open(page, '/app/settings');
  const recent = card(page).getByRole('region', {name: 'Your imports'});
  await expect(recent).toContainText('Fitbit / Google Health');
  await recent.getByRole('button', {name: 'Undo this import'}).click();
  await recent.getByRole('button', {name: 'Undo the import'}).click();
  await expect(card(page).getByRole('status').filter({hasText: 'was undone'})).toBeVisible();
  await open(page, '/app/health?view=sleep');
  await expect(page.getByRole('region', {name: 'Recent nights and naps'})).not.toContainText('Night ending 2026-10-05');
  expect(seen).toEqual([]);
});

journey('J217', 'Samsung Health, Oura and Loop Habit Tracker: each recognised and previewed, nothing written before confirming; imported; Loop undone', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await open(page, '/app/settings');
  const seen = outside(page), c = card(page);
  for (const [label, file] of [['Samsung Health', {name: 'samsunghealth.zip', mimeType: 'application/zip', buffer: zip(SAMSUNG)}], ['Oura', {name: 'oura.zip', mimeType: 'application/zip', buffer: zip(OURA)}]] as const) {
    const before = await page.evaluate(() => JSON.stringify({...localStorage}));
    await choose(page).setInputFiles(file);
    await expect(c.locator('.import-summary')).toContainText(`${label} export`);
    expect(await page.evaluate(() => JSON.stringify({...localStorage})), `${label}: nothing written before confirming`).toBe(before);
    await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
    await c.getByRole('button', {name: /^Import \d+ records?$/}).click();
    await expect(c.getByRole('status').filter({hasText: `Imported from ${label}`})).toBeVisible();
    await c.getByRole('button', {name: 'Import another export', exact: true}).click();
  }
  const before = await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'));
  await choose(page).setInputFiles({name: 'Loop Habits CSV 2026-10-06.zip', mimeType: 'application/zip', buffer: zip(LOOP)});
  await expect(c.locator('.import-summary')).toContainText('Loop Habit Tracker: 4 new habits');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'))).toBe(before);
  await c.getByRole('button', {name: /^Import 4 habits/}).click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Loop Habit Tracker: 4 habits with'})).toBeVisible();
  await open(page, '/app/habits');
  // Habits opens on "Today"; Run (three times a week) may not be due, so all habits are shown.
  await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'All', exact: true}).click();
  for (const title of ['Meditate', 'Run', 'Water']) await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
  await open(page, '/app/settings');
  const recent = card(page).getByRole('region', {name: 'Your imports'});
  await expect(recent.getByRole('listitem')).toHaveCount(3);
  await recent.getByRole('listitem').filter({hasText: 'Loop Habit Tracker'}).getByRole('button', {name: 'Undo this import'}).click();
  await recent.getByRole('button', {name: 'Undo the import'}).click();
  await expect(card(page).getByRole('status').filter({hasText: 'The Loop Habit Tracker import from'})).toContainText('was undone');
  await open(page, '/app/habits');
  await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'All', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Meditate', exact: true})).toHaveCount(0);
  expect(seen).toEqual([]);
});

journey('J218', 'a Garmin export is recognised, not read, and says why', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const before = await page.evaluate(() => JSON.stringify({...localStorage}));
  await choose(page).setInputFiles({name: 'garmin.zip', mimeType: 'application/zip', buffer: zip(GARMIN)});
  await expect(card(page)).toContainText(/Garmin/);
  await expect(card(page).getByRole('button', {name: /^Import \d+/})).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({...localStorage}))).toBe(before);
});

journey('J219', 'Switch to ZIGoals: Health\'s box starts unticked; unticked, nothing reaches Health', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await open(page, '/app/settings');
  const c = card(page), box = c.getByRole('checkbox', {name: /I understand this adds health records/});
  for (const round of [1, 2]) {
    await choose(page).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: zip({'apple_health_export/export.xml': APPLE_XML})});
    await expect(c.getByRole('heading', {name: 'Check what comes in'})).toBeVisible();
    await expect(box, `round ${round}: the box starts unticked`).not.toBeChecked();
    await expect(c.getByRole('button', {name: /^Import \d+ records?$/})).toBeDisabled();
    // Ticked, then unticked again: still nothing can be imported.
    await box.check();
    await box.uncheck();
    await expect(c.getByRole('button', {name: /^Import \d+ records?$/})).toBeDisabled();
    await c.getByRole('button', {name: 'Start over', exact: true}).click();
    await expect(c.getByText(/^Choose the export/)).toBeVisible();
  }
  expect(await page.evaluate(() => localStorage.getItem('zigoals:health:v1'))).toBeNull();
  await expect(c.getByRole('region', {name: 'Your imports'})).toHaveCount(0);
});

const MFP = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-10-01,Breakfast,420,12,3,2,4,0,180,560,300,55,6,12,22,10,8,15,20,
2026-10-01,Dinner,700,25,8,4,9,0,90,900,800,70,9,10,40,5,30,10,25,fictional
`;
/** Health → Diary → "Import a nutrition CSV" with a fictional MyFitnessPal Nutrition-Summary, imported as it is offered. */
async function importMeals(page: Page) {
  await open(page, '/app/health');
  await page.getByText('Import a nutrition CSV', {exact: true}).click();
  await page.getByRole('button', {name: 'Choose a file', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import meals', exact: true});
  await panel.getByLabel('CSV file').setInputFiles({name: 'Nutrition-Summary-2026-10-01-to-2026-10-01.csv', mimeType: 'text/csv', buffer: Buffer.from(MFP)});
  await expect(panel.getByRole('heading', {name: /Step 2 of 4/})).toBeVisible();
  await expect(panel.locator('.import-preset')).toContainText('This looks like MyFitnessPal\'s Nutrition-Summary.');
  await expect(panel.locator('.import-preset')).toContainText('Calcium, iron and vitamins are left out');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-summary')).toHaveText('0 foods will be added to your library · 2 diary entries on 1 day · 2 entries without a serving measure · 0 rows refused');
  await expect(panel.getByRole('list', {name: 'The first entries that will be imported'})).toContainText('2026-10-01 · Breakfast · Breakfast · 1 serving · 420 kcal · P 22 g · C 55 g · F 12 g · serving measure unknown');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 2 entries', exact: true}).click();
  await expect(panel.getByRole('status').filter({hasText: '2 entries and 0 foods imported.'})).toBeVisible();
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
}

journey('J220', 'meals from a MyFitnessPal file: recognised, matched, previewed, imported to their own day; percentages left out', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T12:00:00+02:00')});
  const seen = outside(page);
  await importMeals(page);
  await page.locator('.health-date').getByLabel('Journal date').fill('2026-10-01');
  await expect(page.getByRole('region', {name: 'Breakfast diary'}).locator('.health-entry')).toContainText('420 kcal');
  await expect(page.getByRole('region', {name: 'Dinner diary'}).locator('.health-entry')).toContainText('700 kcal');
  const diary = (JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:health:v1')))!) as {diary: {date: string; meal: string; snapshot: {name: string; servingGrams: number | null; nutrients: Record<string, number | null>}}[]}).diary;
  expect(diary.map(e => [e.date, e.meal, e.snapshot.name, e.snapshot.nutrients.kcal])).toEqual([['2026-10-01', 'Breakfast', 'Breakfast', 420], ['2026-10-01', 'Dinner', 'Dinner', 700]]);
  for (const e of diary) { expect(e.snapshot.nutrients.calciumMg).toBeUndefined(); expect(e.snapshot.nutrients.ironMg).toBeUndefined(); expect(e.snapshot.servingGrams).toBeNull(); }
  expect(seen).toEqual([]);
});

journey('J221', 'an import changed afterwards: Undo refuses and says why; nothing is removed', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T12:00:00+02:00')});
  await importMeals(page);
  const banner = page.locator('.import-banner');
  await expect(banner).toContainText('2 entries and 0 foods imported.');
  // One imported entry corrected: breakfast was two servings.
  await page.locator('.health-date').getByLabel('Journal date').fill('2026-10-01');
  const breakfast = page.getByRole('region', {name: 'Breakfast diary'});
  await breakfast.getByRole('button', {name: 'Edit Breakfast', exact: true}).click();
  const edit = breakfast.getByRole('form', {name: 'Edit diary entry'});
  await edit.getByLabel('Servings', {exact: true}).fill('2');
  await edit.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect(page.locator('p.health-feedback')).toHaveText('Diary entry updated.');
  await expect(breakfast.locator('.health-section-heading')).toContainText('840 kcal');
  const before = await page.evaluate(() => localStorage.getItem('zigoals:health:v1'));
  await banner.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(banner.getByRole('alert')).toHaveText('Some imported entries were edited or used since. Remove them one by one in Health.');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:health:v1'))).toBe(before);
  await expect(page.getByRole('region', {name: 'Dinner diary'}).locator('.health-entry')).toContainText('700 kcal');
});
