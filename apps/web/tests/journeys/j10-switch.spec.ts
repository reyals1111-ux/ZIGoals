import {test, type Page} from '@playwright/test';
import {desktopOnly, expect, hydrated, offlineApis, seedRecords, stored, strayRequests, ZONE} from './journey-helpers';
import {buildStoredZip} from '../../lib/export/zip';
import {APPLE_XML, FITBIT, GARMIN, LOOP, OURA, SAMSUNG} from '../../lib/import/switch/test-fixtures';

/**
 * Session AK F2, journey 10: switching to ZIGoals from other apps, one export after another, as a person moving their
 * history would: Apple Health, Samsung Health, Oura and Loop through Settings → Switch to ZIGoals (each read on the device,
 * previewed, imported on confirm); Fitbit and Garmin recognised and refused with the reason; Daylio, Habitica and YNAB
 * through "From Daylio, Habitica or YNAB"; Strong and Hevy workouts through Health → Workouts → Import. Every file is a
 * fictional fixture (lib/import/switch/test-fixtures.ts and the importers' own test rows); nothing leaves the device.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE});
desktopOnly();
const zip = (entries: Record<string, string>) => Buffer.from(buildStoredZip(Object.entries(entries).map(([name, data]) => ({name, data, modified: new Date('2026-10-06T12:00:00Z')}))));
const DAYLIO = ['full_date,date,weekday,time,mood,activities,note_title,note', '2026-10-02,October 2,Friday,9:15 pm,rad,"friends | movies",Fictional evening,"Dinner with fictional friends."', '2026-10-01,October 1,Thursday,7:00,good,,,'].join('\n');
const YNAB = ['"Account","Flag","Date","Payee","Category Group/Category","Category Group","Category","Memo","Outflow","Inflow","Cleared"',
  '"Checking","","13/10/2026","Fictional grocer","Everyday: Groceries","Everyday","Groceries","","€45,20","€0,00","Cleared"',
  '"Checking","","15/10/2026","Fictional employer","Inflow: Ready to Assign","Inflow","Ready to Assign","","€0,00","€2.500,00","Cleared"'].join('\n');
const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const HABITICA = JSON.stringify({profile: {name: 'Fictional'}, tasks: {
  dailys: [{id: 'd-1', text: 'Fictional stretch', notes: 'Five minutes', type: 'daily', frequency: 'weekly', everyX: 1, startDate: '2026-09-01T00:00:00.000Z', repeat: {m: true, t: false, w: true, th: false, f: true, s: false, su: false}, history: [{date: day('2026-10-05'), value: 1, completed: true, isDue: true}]}],
  habits: [{id: 'h-1', text: 'Fictional water', type: 'habit', up: true, down: false, createdAt: '2026-10-01T00:00:00.000Z', history: [{date: day('2026-10-02'), value: 1, scoredUp: 1, scoredDown: 0}]}],
  todos: [], rewards: []}});
const STRONG = ['Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  '2026-10-01 07:30:00,"Fictional push day",1h 5m,"Bench Press (Barbell)",1,80,5,0,0,"","",8',
  '2026-10-03 18:00:00,"Fictional run",30m,"Running",1,0,0,5,1800,"","",'].join('\n');
const HEVY = ['"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"Fictional upper","8 Oct 2026, 18:03","8 Oct 2026, 19:10","","Bench Press (Barbell)","","",0,"normal",80,6,"","",9'].join('\r\n');
const card = (page: Page) => page.getByRole('region', {name: 'Bring your history with you.'});

async function healthImport(page: Page, name: string, buffer: Buffer, source: string) {
  const c = card(page);
  await c.getByLabel(/^Choose the export/).setInputFiles({name, mimeType: 'application/zip', buffer});
  await expect(c.getByRole('heading', {name: 'Check what comes in'})).toBeVisible();
  await c.getByRole('checkbox', {name: /I understand this adds health records/}).check();
  await c.getByRole('button', {name: /^Import [\d,]+ records?$/}).click();
  await expect(c.getByRole('status').filter({hasText: `Imported from ${source}`})).toBeVisible();
  await c.getByRole('button', {name: 'Import another export'}).click();
}

test('@journey 10 Switch to ZIGoals: every importer\'s fixture, one after another; the refused ones say why', async ({page}) => {
  test.setTimeout(180_000);
  const stray = strayRequests(page);
  await page.clock.install({time: new Date('2026-10-20T08:00:00Z')});
  await offlineApis(page);
  await seedRecords(page, {}, {settings: 'balanced'});
  await page.goto('/app/settings'); await hydrated(page);

  // Health histories: Apple Health, Samsung Health, Oura.
  await healthImport(page, 'export.zip', zip({'apple_health_export/export.xml': APPLE_XML}), 'Apple Health');
  await healthImport(page, 'samsung.zip', zip(SAMSUNG), 'Samsung Health');
  await healthImport(page, 'oura.zip', zip(OURA), 'Oura');
  const health = await stored<{weights: unknown[]; sleep: {nights: unknown[]}}>(page, 'zigoals:health:v1');
  expect(health!.weights.length).toBeGreaterThanOrEqual(3); // Apple's two and Samsung's one
  expect(health!.sleep.nights.length).toBeGreaterThanOrEqual(3);

  // Loop's habits.
  const c = card(page);
  await c.getByLabel(/^Choose the export/).setInputFiles({name: 'Loop Habits CSV 2026-10-06.zip', mimeType: 'application/zip', buffer: zip(LOOP)});
  await expect(c.getByText('Loop Habit Tracker: 4 new habits, 6 check-ins')).toBeVisible();
  await c.getByRole('button', {name: 'Import 4 habits'}).click();
  await expect(c.getByRole('status').filter({hasText: 'Imported from Loop'})).toBeVisible();
  await c.getByRole('button', {name: 'Import another export'}).click();

  // Fitbit (its connection ended) and Garmin (layout not published): recognised, refused, with the reason.
  await c.getByLabel(/^Choose the export/).setInputFiles({name: 'takeout.zip', mimeType: 'application/zip', buffer: zip(FITBIT)});
  await expect(c.getByRole('alert')).toContainText('Fitbit');
  await c.getByRole('button', {name: 'Choose another export'}).click();
  await c.getByLabel(/^Choose the export/).setInputFiles({name: 'garmin.zip', mimeType: 'application/zip', buffer: zip(GARMIN)});
  await expect(c.getByRole('alert')).toContainText('Garmin does not publish the layout of its export');
  await c.getByRole('button', {name: 'Choose another export'}).click();

  // Daylio, Habitica, YNAB.
  const more = page.locator('#switch-import');
  await more.locator('summary', {hasText: 'From Daylio, Habitica or YNAB'}).click();
  await more.getByLabel('Choose the Daylio CSV').setInputFiles({name: 'daylio.csv', mimeType: 'text/csv', buffer: Buffer.from(DAYLIO)});
  await more.getByRole('button', {name: 'Import from Daylio'}).click();
  await expect(more.getByRole('status').filter({hasText: 'Imported from Daylio: 1 journal entry'})).toBeVisible();
  await more.getByRole('radio', {name: 'Habitica (habits and dailies)'}).check();
  await more.getByLabel('Choose the userdata.json').setInputFiles({name: 'userdata.json', mimeType: 'application/json', buffer: Buffer.from(HABITICA)});
  await more.getByRole('button', {name: /^Import 2 habits/}).click();
  await expect(more.getByRole('status').filter({hasText: 'Imported from Habitica: 2 habits.'})).toBeVisible();
  await more.getByRole('radio', {name: 'YNAB (spending and income)'}).check();
  await more.getByLabel('Choose the Register CSV').setInputFiles({name: 'register.csv', mimeType: 'text/csv', buffer: Buffer.from(YNAB)});
  await more.getByLabel('Currency of this plan').selectOption('EUR');
  await more.getByRole('button', {name: 'Import into the money log'}).click();
  await expect(more.getByRole('status').filter({hasText: 'Imported from YNAB: 2 entries'})).toBeVisible();
  const titles = (await stored<{habits: {title: string}[]}>(page, 'zigoals:habits:v1'))!.habits.map(h => h.title);
  expect(titles).toEqual(expect.arrayContaining(['Meditate', 'Run', 'Water', 'Fictional stretch', 'Fictional water']));
  expect((await stored<{entries: unknown[]}>(page, 'zigoals:money-log:v1'))!.entries).toHaveLength(2);

  // Strong and Hevy workouts, in Health → Workouts.
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  const box = page.locator('details', {hasText: 'Import a GPX or TCX file'});
  await box.locator('summary').first().click();
  const input = box.getByLabel(/^GPX or TCX file/);
  await input.setInputFiles({name: 'strong.csv', mimeType: 'text/csv', buffer: Buffer.from(STRONG)});
  await expect(box).toContainText('Fictional push day');
  await box.getByRole('button', {name: /^Add 2 workouts$/}).click();
  await expect(box.getByRole('status')).toHaveText('2 workouts are added to your workouts.');
  // Later, the Hevy export.
  await page.reload(); await hydrated(page);
  await box.locator('summary').first().click();
  await input.setInputFiles({name: 'workouts.csv', mimeType: 'text/csv', buffer: Buffer.from(HEVY)});
  await expect(box).toContainText('Fictional upper');
  await box.getByRole('button', {name: /^Add (1 workout|workout)$/}).click();
  await expect.poll(async () => (await stored<{workouts: {name: string}[]}>(page, 'zigoals:workouts:v1'))?.workouts.map(w => w.name).sort()).toEqual(['Fictional push day', 'Fictional run', 'Fictional upper']);

  // Settings lists the imports, each with its own Undo.
  await page.goto('/app/settings'); await hydrated(page);
  await expect(card(page).getByRole('region', {name: 'Your imports'}).getByRole('button', {name: 'Undo this import'}).first()).toBeVisible();
  expect(stray).toEqual([]);
});
