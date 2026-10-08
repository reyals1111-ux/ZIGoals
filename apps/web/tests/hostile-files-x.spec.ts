import {expect, test, type Page} from '@playwright/test';
import {buildStoredZip} from '../lib/export/zip';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, healthSchema} from '../lib/health';
import {habitDataSchema} from '../lib/habits';
import {APPLE_XML, LOOP} from '../lib/import/switch/test-fixtures';

// Session X P2.4: hostile and broken files through the import screens a person uses (Settings → Switch to ZIGoals,
// Health → Import meals). Each is refused in words or imports only what is valid; nothing half-written is left, and no
// JavaScript or parser message reaches the screen. Fictional files; every /api answered by a fixture.
test.use({timezoneId: 'Europe/Brussels'});
const INTERNAL = /undefined|is not a function|Cannot read|Unexpected token|in JSON|RangeError|TypeError|ZodError|"code":/;
const zip = (entries: Record<string, string>) => Buffer.from(buildStoredZip(Object.entries(entries).map(([name, data]) => ({name, data, modified: new Date('2026-10-06T12:00:00Z')}))));
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
async function switchCard(page: Page) {
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('habits-health'), onboarded: true})]);
  await page.reload();
  return page.getByRole('region', {name: 'Bring your history with you.'});
}

test('Switch to ZIGoals: a ZIP cut short and an export with a "billion laughs" entity are handled in words; nothing is written', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const card = await switchCard(page), before = await stored(page, HEALTH_STORAGE_KEY);
  const whole = zip({'apple_health_export/export.xml': APPLE_XML});
  await card.getByLabel(/^Choose the export/).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: whole.subarray(0, Math.floor(whole.length / 2))});
  const message = card.getByRole('alert').first();
  await expect(message).toBeVisible();
  await expect(message).not.toHaveText(INTERNAL);
  expect(await stored(page, HEALTH_STORAGE_KEY)).toEqual(before);
  // An XML that declares entities expands none of them (the reader never builds a document from a DTD).
  const laughs = APPLE_XML.replace('<!DOCTYPE HealthData [', '<!DOCTYPE HealthData [\n<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">').replace('sourceName="Fictional Watch"', 'sourceName="&c;"');
  await page.reload();
  await card.getByLabel(/^Choose the export/).setInputFiles({name: 'export.zip', mimeType: 'application/zip', buffer: zip({'apple_health_export/export.xml': laughs})});
  await expect(card.getByRole('heading', {name: 'Check what comes in'}).or(card.getByRole('alert').first())).toBeVisible();
  await expect(card).not.toContainText('aaaaaaaaaaaaaaaaaaaa');
  await expect(card).not.toContainText(INTERNAL);
  expect(await stored(page, HEALTH_STORAGE_KEY)).toEqual(before);
  expect(errors).toEqual([]);
});

test('Switch to ZIGoals: a Loop export with a habit listed twice and impossible days imports cleanly and says what it did', async ({page}) => {
  const card = await switchCard(page);
  const loop = {...LOOP, 'Habits.csv': LOOP['Habits.csv'] + '001,Meditate,YES_NO,Did you meditate today?,,1,1,#FF8F00,,AT_LEAST,0,false\n', '002 Run/Checkmarks.csv': 'Date,Value,Notes\n2026-10-05,2,\n2026-02-30,2,\n2026-13-01,2,\n'};
  await card.getByLabel(/^Choose the export/).setInputFiles({name: 'Loop Habits CSV 2026-10-06.zip', mimeType: 'application/zip', buffer: zip(loop)});
  await expect(card).toContainText('1 habit is listed twice in Habits.csv; it was read once.');
  await card.getByRole('button', {name: 'Import 4 habits'}).click();
  await expect(card.getByRole('status').filter({hasText: 'Imported from Loop'})).toBeVisible();
  const habits = habitDataSchema.parse(await stored(page, 'zigoals:habits:v1'));
  expect(habits.habits.map(h => h.title)).toEqual(['Meditate', 'Run', 'Water', 'Old habit']);
  expect(habits.habits[1]!.entries.map(e => e.date)).toEqual(['2026-10-05']);
});

test('Import meals: formula-like names, an impossible date, a future date and words for numbers: refused rows say why, the rest imports', async ({page}) => {
  await page.goto('/app/health');
  await page.getByText('Import a nutrition CSV', {exact: true}).click();
  await page.getByRole('button', {name: 'Choose a file', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Import meals', exact: true});
  const csv = 'Date,Meal,Food,Calories,Protein (g)\n2026-10-01,Breakfast,Oats,380,13\n2026-10-01,Lunch,"=HYPERLINK(""x"")",200,5\n2026-02-30,Lunch,Soup,120,4\n2027-01-01,Dinner,Rice,130,3\n2026-10-02,Dinner,"‮evil‬ 🍲",lots,4\n';
  await panel.getByLabel('CSV file').setInputFiles({name: 'diary.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await expect(panel.getByRole('heading', {name: /Step 2 of 4/})).toBeVisible();
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  const summary = panel.locator('.import-summary');
  await expect(summary).toContainText('rows refused');
  await expect(panel).toContainText('Row 3:');
  await expect(panel).toContainText('Row 4: the date is in the future.');
  await expect(panel).not.toContainText(INTERNAL);
  for (let i = 0; i < 3 && !(await panel.getByRole('button', {name: /^Import \d+ entr/}).isVisible()); i++) await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: /^Import \d+ entr/}).click();
  await expect.poll(async () => (await stored(page, HEALTH_STORAGE_KEY))?.diary?.length ?? 0).toBeGreaterThan(0);
  const health = healthSchema.parse(await stored(page, HEALTH_STORAGE_KEY));
  expect(health.diary.every(e => e.date <= '2026-10-07')).toBe(true);
});
