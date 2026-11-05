import {gzipSync} from 'node:zlib';
import {expect, test, type Page, type Route} from '@playwright/test';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {addLocalDays} from '../lib/local-date';
import {buildStoredZip} from '../lib/export/zip';
import {FitWriter, fitTime, T} from '../lib/import/fit/test-encoder';
import {hydrated, offlineApis, seedRecords, stored} from './journeys/journey-helpers';
import {loadShowcase, showcaseRecord, PNG, healthView} from './wiring-helpers';

/**
 * Session AK Q1 (WIRING_AUDIT): Health features that worked in the build but had no browser test on the UI path, each
 * driven as a person would and checked by its real result: 4.4 the nutrient report and its top sources (#4), 4.7 a FIT
 * file and a Strava export ZIP, 4.8 the recipe import's per-row match and food picker, #2 Compare, #3 the label scan
 * (the person's own AI is a MOCK local server), #7 the weekly calorie budget, #8 muscle freshness, #9 the energy curve,
 * #20 diet templates, and F5's supplements, measurement trends, the photo-compare slider and Experiments. Fictional data;
 * every /api route answers 503 unless a test routes it; no outside host is reached.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-04', NOW = new Date(`${TODAY}T09:00:00.000Z`);
const stamp = (d: string, t = '08:00') => `${d}T${t}:00.000Z`;
test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'these wiring specs run once, on the desktop project'); });

/** Two weeks of fictional logs: a daily target, three foods (iron on two), a bowl and lentils every day, weigh-ins. */
function health(): HealthData {
  const h = createEmptyHealth();
  h.targets = {kcal: 2200, proteinMg: 120000, carbsMg: 260000, fatMg: 73000, weightGrams: 70000, steps: 8000};
  h.foods.push({id: 'health_food-0001', name: 'Fictional bowl', brand: '', servingGrams: 300, nutrients: {kcal: 900, proteinMg: 40000, carbsMg: 100000, fatMg: 30000, ironMg: 4}, createdAt: stamp('2026-08-01'), updatedAt: stamp('2026-08-01')});
  h.foods.push({id: 'health_f-lentils', name: 'Red lentils', brand: '', servingGrams: 100, nutrients: {kcal: 116, proteinMg: 9000, carbsMg: 20000, fatMg: 400, ironMg: 7}, createdAt: stamp('2026-08-01'), updatedAt: stamp('2026-08-01')});
  h.foods.push({id: 'health_f-onion01', name: 'Onion', brand: '', servingGrams: 100, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: stamp('2026-08-01'), updatedAt: stamp('2026-08-01')});
  for (let i = 0; i < 14; i++) {
    const d = addLocalDays(TODAY, -i);
    h.diary.push({id: `health_diary-${String(i).padStart(3, '0')}a`, sourceId: 'health_food-0001', sourceKind: 'food', snapshot: {name: 'Fictional bowl', servingGrams: 300, nutrients: {kcal: 900, proteinMg: 40000, carbsMg: 100000, fatMg: 30000, ironMg: 4}}, date: d, meal: 'Lunch', quantityMilli: 1000, createdAt: stamp(d, '12:00'), updatedAt: stamp(d, '12:00')});
    h.diary.push({id: `health_diary-${String(i).padStart(3, '0')}b`, sourceId: 'health_f-lentils', sourceKind: 'food', snapshot: {name: 'Red lentils', servingGrams: 100, nutrients: {kcal: 116, proteinMg: 9000, carbsMg: 20000, fatMg: 400, ironMg: 7}}, date: d, meal: 'Dinner', quantityMilli: 2000, createdAt: stamp(d, '19:00'), updatedAt: stamp(d, '19:00')});
  }
  return healthSchema.parse({...h, schemaVersion: 4});
}
async function seeded(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({time: NOW});
  await offlineApis(page);
  await seedRecords(page, {[HEALTH_STORAGE_KEY]: health(), ...extra});
}

test('4.4 and #4: the nutrient report reads the 7-day average and where the iron came from; "high in" lists my foods', async ({page}) => {
  await seeded(page);
  await page.goto('/app/health'); await hydrated(page);
  await healthView(page, 'Targets');
  await page.getByRole('button', {name: 'Open the nutrient report'}).click();
  const report = page.locator('[data-region="nutrient-report"]');
  await expect(report.getByRole('heading', {name: 'Nutrient report'})).toBeVisible();
  // This day: 4 mg from the bowl + 2 × 7 mg from the lentils = 18 mg of iron.
  const minerals = report.getByRole('region', {name: 'Minerals'});
  await expect(minerals.getByRole('listitem').filter({hasText: 'Iron'})).toContainText('18 mg');
  await report.getByRole('group', {name: 'Report period'}).getByRole('button', {name: '7-day average'}).click();
  await expect(minerals.getByRole('listitem').filter({hasText: 'Iron'})).toContainText(/18 mg.*average of 7 days with a value, of 7 logged/s);
  await minerals.getByRole('button', {name: 'Where Iron came from'}).click();
  const sources = report.getByRole('group', {name: 'Where Iron came from'});
  // Lentils gave 14 of the 18 mg a day (78 %), the bowl 4 (22 %), on every one of the 7 days.
  await expect(sources.getByRole('listitem').first()).toContainText(/Red lentils.*98 mg · 78 % · 7 days/s);
  await expect(sources.getByRole('listitem').nth(1)).toContainText(/Fictional bowl.*28 mg · 22 % · 7 days/s);
  await sources.getByRole('group', {name: 'Days to read'}).getByRole('button', {name: '30 days'}).click();
  await expect(sources.getByRole('listitem').first()).toContainText(/Red lentils.*14 days/s);
  // "Which of my foods are high in…": iron per serving, highest first; a food without the value is not listed.
  const rich = page.locator('.health-rich').filter({has: page.getByRole('heading', {name: 'Which of my foods are high in…'})});
  await rich.getByRole('group', {name: 'Nutrient'}).getByRole('button', {name: 'Iron', exact: true}).click();
  await expect(rich.getByRole('listitem')).toHaveText([/^Red lentils · 7 mg per 100 g/, /^Fictional bowl · 4 mg per 300 g/]);
});

test('#7: the weekly calorie budget shifts 200 kcal from Monday to Saturday and keeps it on the device', async ({page}) => {
  await seeded(page);
  await page.goto('/app/health'); await hydrated(page);
  await healthView(page, 'Targets');
  await page.getByText('Weekly calorie budget (optional)').click();
  const week = page.getByRole('group', {name: 'Weekly calorie budget'});
  await expect(week).toContainText('15,400 kcal this week (2,200 a day × 7)');
  const shift = week.getByRole('form', {name: 'Shift calories between weekdays'});
  await shift.getByLabel('Move (kcal)').fill('200');
  await shift.getByRole('button', {name: 'Shift'}).click();
  await expect(week).toContainText(/200 kcal moved from Mon\w* to Sat\w*, every week\. The weekly total is the same\./);
  const days = week.locator('.health-micro-list > li');
  await expect(days.nth(0)).toContainText('2,000 kcal (−200 shifted)');
  await expect(days.nth(5)).toContainText('2,400 kcal (+200 shifted)');
  await expect(week).toContainText('15,400 kcal this week');
  expect(await stored(page, 'zigoals:calorie-week:v1')).toMatchObject({version: 1, shifts: expect.anything()});
  await page.reload(); await hydrated(page);
  await healthView(page, 'Targets');
  await page.getByText('Weekly calorie budget (optional)').click();
  await expect(page.getByRole('group', {name: 'Weekly calorie budget'}).locator('.health-micro-list > li').nth(5)).toContainText('(+200 shifted)');
});

test('#20: a diet template fills this week\'s planner from the offline food library; nothing is logged as eaten', async ({page}) => {
  await seeded(page);
  await page.goto('/app/health'); await hydrated(page);
  await healthView(page, 'Planner');
  await page.getByText('Start from a template (Mediterranean, high-protein, vegetarian)').click();
  const templates = page.getByRole('region', {name: 'Fill the week from a template'});
  await templates.getByRole('radio', {name: /^Vegetarian/}).check();
  const diaryBefore = (await stored<HealthData>(page, HEALTH_STORAGE_KEY))!.diary.length;
  await templates.getByRole('button', {name: 'Add to this week'}).click();
  await expect(page.getByText(/Vegetarian template added to the week of .*\. Nothing is logged as eaten until you tap Log\./).first()).toBeVisible({timeout: 20_000});
  const h = (await stored<HealthData & {daily: {plans: {name?: string; loggedAt?: string}[]; savedMeals: {name: string}[]}}>(page, HEALTH_STORAGE_KEY))!;
  expect(h.daily.plans.length).toBeGreaterThanOrEqual(28); // four meals a day, seven days
  expect(h.daily.plans.every(p => !p.loggedAt)).toBe(true);
  expect(h.daily.savedMeals.some(m => m.name.includes('· Vegetarian template'))).toBe(true);
  expect(h.diary).toHaveLength(diaryBefore);
  await expect(page.getByRole('button', {name: /^Log .*Vegetarian template.* for Breakfast on /}).first()).toBeVisible();
});

test('4.8: a pasted recipe shows each row\'s match; an unmatched row is pointed at one of my foods; the recipe saves with them', async ({page}) => {
  await seeded(page);
  await page.goto('/app/health'); await hydrated(page);
  await healthView(page, 'Import');
  const importer = page.getByRole('region', {name: 'Import a recipe'});
  await importer.getByLabel('Recipe text').fill('Fictional lentil soup\nServes 4\n200 g lentils\n100 g ONION\n50 g fictional mystery beans');
  await importer.getByRole('button', {name: 'Read the ingredients'}).click();
  const confirm = importer.getByRole('form', {name: 'Confirm the recipe'});
  const rows = confirm.locator('.health-import-rows > li');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Close match, check it: your food Red lentils (116 kcal per 100 g)');
  await expect(rows.nth(1)).toContainText('Matches your food Onion (nutrition unknown, per 100 g)');
  await expect(rows.nth(2)).toContainText('A new food: its nutrition stays unknown until you fill it in');
  // The person points the unmatched row at one of their own foods (the picker lists every food).
  await confirm.getByLabel('Food for ingredient 3').selectOption({label: 'Fictional bowl'});
  await expect(rows.nth(2)).toContainText('Uses your food Fictional bowl (900 kcal per 300 g)');
  await confirm.getByRole('button', {name: 'Save recipe'}).click();
  await expect(page.getByText('Recipe "Fictional lentil soup" saved with 3 ingredients.', {exact: false}).first()).toBeVisible();
  const h = (await stored<HealthData>(page, HEALTH_STORAGE_KEY))!;
  const soup = h.recipes.find(r => r.name === 'Fictional lentil soup')!;
  expect(soup.ingredients.map(i => i.foodId)).toEqual(['health_f-lentils', 'health_f-onion01', 'health_food-0001']);
  expect(h.foods).toHaveLength(3); // no new food was made: every row uses an existing one
});

test('#3: "Read the label from a photo" in New food fills the form from the person\'s own AI (a MOCK); nothing is saved until Save', async ({page}) => {
  const AI = 'http://127.0.0.1:1234', asked: string[] = [];
  const label = {readable: true, basis: 'per-100g', serving_size: {amount: 40, unit: 'g'}, energy_kcal: 380, protein_g: 12, carbohydrate_g: 60, fat_g: 8, fibre_g: 9, sugars_g: 10, saturated_fat_g: 1.5, salt_g: 0.5, vitamins_minerals: [{name: 'Iron', amount: 4.2, unit: 'mg'}]};
  const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
  await page.route(`${AI}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({json: {object: 'list', data: [{id: 'mock-vision'}]}});
    if (url.endsWith('/v1/chat/completions')) { asked.push(route.request().postData() ?? ''); return route.fulfill({contentType: 'text/event-stream', body: [chunk({role: 'assistant', content: JSON.stringify(label)}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('')}); }
    return route.fulfill({status: 404, body: ''});
  });
  const base = defaultAiSettings();
  await seeded(page, {[AI_SETTINGS_KEY]: {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-vision', localServer: 'openai-compatible', baseUrl: AI, includeHealth: true, pageShare: {...base.pageShare, health: true}}, [AI_OPTIONS_KEY]: {version: 1, toolMode: 'attach', visionDeclared: {'local:mock-vision': true}}});
  await page.goto('/app/health'); await hydrated(page);
  await healthView(page, 'Foods & recipes');
  await page.getByRole('button', {name: 'New food', exact: true}).click();
  const form = page.locator('section.health-editor');
  await form.getByLabel('Food name').fill('Fictional oat flakes');
  await form.getByText('Read the label from a photo').click();
  const chooser = page.waitForEvent('filechooser');
  await form.getByRole('button', {name: 'Choose a photo'}).click();
  await (await chooser).setFiles({name: 'label.png', mimeType: 'image/png', buffer: PNG});
  await expect(form.getByText('Every field below stays yours to change; nothing is saved until you save.')).toBeVisible({timeout: 20_000});
  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain('Read the nutrition label in this photo.');
  expect(asked[0]).not.toContain('Fictional bowl'); // only the photo and the instructions go
  await expect(form.getByLabel('Nutrition label basis')).toHaveValue('100g');
  await expect(form.getByLabel('Calories (kcal)')).toHaveValue('380');
  await expect(form.getByLabel('Protein (g)')).toHaveValue('12');
  await expect(form.getByLabel('Carbs (g)')).toHaveValue('60');
  await expect(form.getByLabel('Fat (g)')).toHaveValue('8');
  expect((await stored<HealthData>(page, HEALTH_STORAGE_KEY))!.foods.some(f => f.name === 'Fictional oat flakes')).toBe(false);
  // The label's per-100 g column with its 40 g serving: the food is saved per serving (380 kcal per 100 g → 152 per 40 g).
  await expect(form.getByLabel('Serving weight (g)')).toHaveValue('40');
  await form.getByRole('button', {name: 'Save food'}).click();
  await expect.poll(async () => (await stored<HealthData>(page, HEALTH_STORAGE_KEY))!.foods.find(f => f.name === 'Fictional oat flakes')).toMatchObject({servingGrams: 40, nutrients: {kcal: 152, proteinMg: 4800, carbsMg: 24000, fatMg: 3200}});
});

// A Strava bulk export: activities.csv naming a gzipped FIT file and a GPX file (both fictional).
const fit = (iso: string, seconds: number, meters: number, hr: number) => new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [4])
  .define(1, 18, [[2, T.uint32], [5, T.enum], [7, T.uint32], [9, T.uint32], [16, T.uint8]]).data(1, [fitTime(iso), 1, seconds * 1000, meters * 100, hr]).file();
const GPX = `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Fictional commute</name><type>cycling</type><trkseg>
<trkpt lat="10" lon="20"><time>2026-10-22T06:00:00Z</time></trkpt><trkpt lat="10.01" lon="20"><time>2026-10-22T06:20:00Z</time></trkpt></trkseg></trk></gpx>`;
const STRAVA_CSV = ['Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Filename',
  '1,"Oct 21, 2026, 6:00:00 AM",Fictional tempo run,Run,,1800,5.0,activities/111.fit.gz',
  '2,"Oct 22, 2026, 6:00:00 AM",Fictional commute,Ride,,1200,1.1,activities/222.gpx'].join('\n');

test('4.7: a FIT file from a watch, then a Strava export ZIP, come in as workouts (summary only); the same FIT twice is refused', async ({page}) => {
  await seeded(page);
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  const box = page.locator('details.workouts-import');
  await box.locator('summary').click();
  const input = box.getByLabel('GPX or TCX file, FIT file, Strava ZIP, or Strong or Hevy CSV');
  await input.setInputFiles({name: 'Fictional_watch_run.fit', mimeType: 'application/octet-stream', buffer: Buffer.from(fit('2026-10-30T07:00:00Z', 2700, 8000, 152))});
  const preview = box.getByRole('group', {name: 'What this file holds'});
  await expect(preview.getByRole('article')).toHaveCount(1);
  await expect(preview).toContainText('Duration45:00');
  await expect(preview).toContainText('Distance8 km');
  await expect(preview).toContainText('Average heart rate152 bpm');
  await preview.getByRole('button', {name: 'Add workout'}).click();
  await expect(box.getByRole('status')).toBeVisible();
  type S = {source: string; durationSeconds: number; distanceKm?: number | string; avgHr?: number};
  type W = {workouts: {name: string; imported?: S; fileImport?: S}[]};
  let w = (await stored<W>(page, 'zigoals:workouts:v1'))!;
  expect(w.workouts).toHaveLength(1);
  // A FIT file's summary is kept as `fileImport` (GPX and TCX keep theirs as `imported`); never the points.
  expect(w.workouts[0]!.fileImport).toMatchObject({source: 'fit', durationSeconds: 2700, avgHr: 152});
  expect(Number(w.workouts[0]!.fileImport!.distanceKm)).toBeCloseTo(8, 3);
  // The same file again: already in the workouts, nothing to add.
  await input.setInputFiles({name: 'Fictional_watch_run.fit', mimeType: 'application/octet-stream', buffer: Buffer.from(fit('2026-10-30T07:00:00Z', 2700, 8000, 152))});
  await expect(box.getByRole('group', {name: 'What this file holds'})).toContainText('Already imported. It is in your workouts below.');
  await expect(box.getByRole('button', {name: /^Add \d* ?workouts?$/})).toHaveCount(0);
  await box.getByRole('button', {name: 'Cancel'}).click();

  // Strava's whole-account ZIP: the CSV names a gzipped FIT and a GPX file.
  const zip = buildStoredZip([
    {name: 'export_123/activities.csv', data: STRAVA_CSV, modified: new Date('2026-10-30T00:00:00Z')},
    {name: 'export_123/activities/111.fit.gz', data: gzipSync(fit('2026-10-21T06:00:00Z', 1800, 5000, 148)), modified: new Date('2026-10-30T00:00:00Z')},
    {name: 'export_123/activities/222.gpx', data: GPX, modified: new Date('2026-10-30T00:00:00Z')},
  ]);
  await input.setInputFiles({name: 'export_123.zip', mimeType: 'application/zip', buffer: Buffer.from(zip)});
  const strava = box.getByRole('group', {name: 'What this file holds'});
  await expect(strava.getByRole('article')).toHaveCount(2, {timeout: 20_000});
  await expect(strava.getByRole('heading', {name: 'Fictional tempo run'})).toBeVisible();
  await expect(strava.getByRole('heading', {name: 'Fictional commute'})).toBeVisible();
  await strava.getByRole('button', {name: 'Add 2 workouts'}).click();
  await expect.poll(async () => (await stored<W>(page, 'zigoals:workouts:v1'))!.workouts.length).toBe(3);
  w = (await stored<W>(page, 'zigoals:workouts:v1'))!;
  // A FIT file without a name is named by its sport; the Strava ones keep their names from activities.csv.
  expect(w.workouts.map(x => x.name).sort()).toEqual(['Fictional commute', 'Fictional tempo run', 'Run (imported)']);
  expect(JSON.stringify(w)).not.toContain('"lat"');
  await page.reload(); await hydrated(page);
  await expect(page.getByText('Fictional tempo run').first()).toBeVisible();
});

test('F5 supplements: add one with a time, mark today\'s dose taken; it is kept after a reload', async ({page}) => {
  await seeded(page);
  await page.goto('/app/health'); await hydrated(page);
  await page.getByText('Supplements and medication (optional)', {exact: true}).click();
  const card = page.getByRole('group', {name: 'Supplements and medication'});
  await card.getByRole('button', {name: 'Add a supplement or medication'}).click();
  const form = card.getByRole('form', {name: 'Add a supplement or medication'});
  await form.getByRole('textbox', {name: 'Name'}).fill('Fictional vitamin D');
  await form.getByLabel('Dose (your own words, optional)').fill('1 capsule');
  await form.getByLabel('Time 1').fill('08:00');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  const dose = card.getByRole('group', {name: /^Fictional vitamin D at /});
  await dose.getByRole('button', {name: 'Taken'}).click();
  await expect(dose.getByRole('button', {name: 'Taken'})).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('status')).toHaveText('Fictional vitamin D: taken.');
  const record = (await stored<{items: {id: string; name: string; times: string[]}[]; log: {itemId: string; date: string; slot: string; status: string}[]}>(page, 'zigoals:supplements:v1'))!;
  expect(record.items).toMatchObject([{name: 'Fictional vitamin D', dose: '1 capsule', times: ['08:00']}]);
  expect(record.log).toMatchObject([{itemId: record.items[0]!.id, date: TODAY, slot: '08:00', status: 'taken'}]);
  await page.reload(); await hydrated(page);
  await page.getByText('Supplements and medication (optional)', {exact: true}).click();
  await expect(page.getByRole('group', {name: /^Fictional vitamin D at /}).getByRole('button', {name: 'Taken'})).toHaveAttribute('aria-pressed', 'true');
});

test('F5 measurement trends and the photo-compare slider: two waist readings give a weekly change; two photos compare before and after', async ({page}) => {
  const waist = (id: string, day: string, quantityMilli: number) => ({id, kind: 'waist', quantityMilli, unit: 'cm', observedAt: stamp(day), timezone: 'UTC', sourceLabel: 'Typed in', canonical: quantityMilli * 10, recordedAt: stamp(day), createdAt: stamp(day), source: 'MANUAL', corrections: []});
  const h = healthSchema.parse({...health(), measurements: [waist('health_meas-0001', addLocalDays(TODAY, -7), 90000), waist('health_meas-0002', TODAY, 88500)]});
  await page.clock.install({time: NOW});
  await offlineApis(page);
  await seedRecords(page, {[HEALTH_STORAGE_KEY]: h});
  await page.goto('/app/health'); await hydrated(page);
  await healthView(page, 'Measurements');
  await page.getByText('Trends and weekly change', {exact: true}).click();
  const trends = page.locator('.measure-trends');
  await expect(trends.getByRole('listitem').filter({hasText: 'Waist'})).toContainText(/88\.5 cm/);
  await expect(trends.getByRole('listitem').filter({hasText: 'Waist'})).toContainText(/This week: [−-]1\.5 cm/);
  await expect(trends.getByRole('img', {name: /^Waist: 2 readings from 90 cm/})).toBeVisible();

  // Progress photos: two, a week apart, then the slider.
  const photos = page.getByRole('region', {name: 'Progress photos'});
  const add = photos.getByRole('form', {name: 'Add a progress photo'});
  await add.getByLabel('Date').fill(addLocalDays(TODAY, -7));
  // Session AL (P-MO-30, MO-097, deliberate): each field names what it is for ("Photo file", "Pose in the photo", "Date taken").
  await add.getByLabel('Photo file', {exact: true}).setInputFiles({name: 'before.png', mimeType: 'image/png', buffer: PNG});
  await expect(photos.locator('.health-photo')).toHaveCount(1, {timeout: 15_000});
  await add.getByLabel('Date').fill(TODAY);
  await add.getByLabel('Photo file', {exact: true}).setInputFiles({name: 'after.png', mimeType: 'image/png', buffer: PNG});
  await expect(photos.locator('.health-photo')).toHaveCount(2, {timeout: 15_000});
  for (const n of [0, 1]) await photos.locator('.health-photo').nth(n).getByRole('button', {name: 'Compare'}).click();
  await photos.getByRole('button', {name: 'Compare with a slider'}).click();
  const slider = photos.getByRole('figure', {name: 'Before and after'});
  await expect(slider.getByRole('img', {name: /^Before: front photo, /})).toBeVisible();
  await expect(slider.getByRole('img', {name: /^After: front photo, /})).toBeVisible();
  const divider = slider.getByRole('slider', {name: 'Divider'});
  await expect(divider).toHaveAttribute('aria-valuetext', '50% before, 50% after');
  await divider.focus(); await page.keyboard.press('End');
  await expect(divider).toHaveAttribute('aria-valuetext', 'Before only');
  await expect(slider.getByRole('button', {name: 'Before'})).toHaveAttribute('aria-pressed', 'true');
  await slider.getByRole('button', {name: 'After'}).click();
  await expect(divider).toHaveAttribute('aria-valuetext', 'After only');
  expect((await stored<{photos: unknown[]}>(page, 'zigoals:progress-photos:v1'))!.photos).toHaveLength(2);
});

test.describe('on the Showcase', () => {
  test.beforeEach(async ({page}) => { await offlineApis(page); await loadShowcase(page); });

  test('#2 Compare: counts first, the next-day choice is kept; #8 muscle freshness changes with my recovery days', async ({page}) => {
    await page.goto('/app/health'); await hydrated(page);
    await healthView(page, 'Insights');
    await page.getByText('Compare: does one thing go with another?').first().click();
    const explorer = page.locator('.compare-explorer');
    await expect(explorer.locator('.compare-counts')).toHaveText(/^\d+ days? with · \d+ without$/);
    await expect(explorer.locator('.compare-confounder')).toContainText('Something else could explain it');
    await explorer.getByRole('button', {name: 'The next day'}).click();
    await expect(explorer.getByRole('button', {name: 'The next day'})).toHaveAttribute('aria-pressed', 'true');
    expect(await showcaseRecord(page, 'zigoals:compare-pair:v1')).toMatchObject({lag: 'next'});
    await page.reload(); await hydrated(page);
    await healthView(page, 'Insights');
    await page.getByText('Compare: does one thing go with another?').first().click();
    await expect(page.locator('.compare-explorer').getByRole('button', {name: 'The next day'})).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/app/health?view=workouts'); await hydrated(page);
    const fresh = page.locator('section.muscle-freshness');
    await expect(fresh.getByRole('heading', {name: 'Freshness (an estimate)'})).toBeVisible({timeout: 15_000});
    await expect(fresh.getByRole('img', {name: /^Front and back of a body, each muscle group shaded by its estimated freshness\./})).toBeVisible();
    const trained = fresh.locator('.workouts-freshness > li').filter({hasText: /About \d+% recovered/}).first();
    const muscle = (await trained.locator('.workouts-freshness-name').textContent())!;
    await fresh.getByText('Recovery days per muscle group').click();
    await fresh.getByRole('combobox', {name: new RegExp(`^${muscle}\\b`)}).selectOption('5');
    await expect(fresh.getByRole('status')).toHaveText(`${muscle}: 5 days to recover, on this device.`);
    await expect(fresh.locator('.workouts-freshness > li').filter({hasText: muscle})).toContainText('your 5-day recovery');
    expect(JSON.stringify(await showcaseRecord(page, 'zigoals:muscle-recovery:v1'))).toContain('5');
  });

  test('#9 the energy curve shows a focus window from the Showcase\'s nights; F5 Experiments starts one and keeps it', async ({page}) => {
    await page.goto('/app/health?view=sleep'); await hydrated(page);
    await page.getByText('Your energy today: an estimate from your sleep').click();
    const curve = page.locator('.energy-curve-fold');
    await expect(curve.locator('.energy-curve-lead')).toContainText(/A good focus window\s*\d{1,2}:\d{2}\s*[AP]M–\d{1,2}:\d{2}\s*[AP]M/);
    await expect(curve.getByRole('img').first()).toHaveAttribute('aria-label', /focus/i);
    await expect(curve).toContainText('An estimate from your sleep times, not a measurement.');

    await page.goto('/app/health'); await hydrated(page);
    await healthView(page, 'Insights');
    await page.getByText('Experiments: try one change for 14 days').first().click();
    const form = page.getByRole('form', {name: 'Start an experiment'});
    await form.getByLabel('A name — optional').fill('Fictional evening walk');
    await form.getByRole('button', {name: '21 days'}).click();
    await form.getByRole('button', {name: 'Start the experiment'}).click();
    await expect(page.getByText('“Fictional evening walk” starts today.')).toBeVisible();
    const card = page.getByRole('list', {name: 'Your experiments'}).getByRole('article', {name: 'Fictional evening walk'});
    await expect(card).toContainText('Day 1 of 21');
    await expect(card.locator('.compare-counts')).toHaveText(/^\d+ days? with · \d+ without$/);
    const saved = await showcaseRecord<{items: {title: string; days: number}[]}>(page, 'zigoals:experiments:v1');
    expect(saved!.items.some(x => x.title === 'Fictional evening walk' && x.days === 21)).toBe(true);
    await page.reload(); await hydrated(page);
    await healthView(page, 'Insights');
    await page.getByText('Experiments: try one change for 14 days').first().click();
    await expect(page.getByRole('list', {name: 'Your experiments'}).getByRole('article', {name: 'Fictional evening walk'})).toBeVisible();
  });
});
