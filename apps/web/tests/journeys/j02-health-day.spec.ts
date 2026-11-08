import {test, type Page, type Route} from '@playwright/test';
import {at, inTheme, JOURNEY_THEMES, themedTitle, expect, hydrated, nextDay, offlineApis, seedRecords, stored, strayRequests, ZONE} from './journey-helpers';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../../lib/health';
import {addLocalDays} from '../../lib/local-date';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../../lib/ai/store/keys';
import {MEAL_ESTIMATES_KEY} from '../../lib/meal-estimates/schema';
import {WORKOUTS_KEY} from '../../lib/workouts/schema';
import {HEALTH_COACH_KEY} from '../../lib/aa-device-keys';
import {sendToZigi, zigiPanel} from '../zigi-open';

/**
 * Session AK F2, journey 2: one health day of someone who has logged food and weight for six weeks (fictional history,
 * so the weekly coach has its two weeks of logs). Breakfast from a barcode (the app's food route MOCKED, Open Food Facts
 * shape), a snack from the offline generic library (the Swiss database route down, so only the device's library
 * answers), dinner estimated from a photo by the person's own AI (a MOCK local OpenAI-compatible server), water, a
 * workout with a superset, RPE and the plate calculator, last night's sleep, and the coach card's Keep with its Undo.
 * The next morning the scanned food is logged again in one tap from Recent scans.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE});
// Session AK G4: on the desktop and the phone, in Nebula, Light and Dark (inTheme() in journey-helpers.ts).
const DAY = '2026-11-04', AI = 'http://127.0.0.1:1234';
const stamp = (d: string, t = '08:00') => `${d}T${t}:00.000Z`;
const PRODUCT = {barcode: '0034000470693', name: 'Fictional oat flakes', brand: 'Fixture', basis: 'unverified-100g-or-100ml', nutrients: {kcal: 370, proteinMg: 13000, carbsMg: 60000, fatMg: null}, source: 'Open Food Facts', apiVersion: '3.4', observedAt: '2026-11-04T07:00:00.000Z'};
function history(): HealthData {
  const h = createEmptyHealth();
  h.targets = {kcal: 2200, proteinMg: 120000, carbsMg: 260000, fatMg: 73000, weightGrams: 70000, steps: 8000};
  const bowl = {kcal: 1100, proteinMg: 60000, carbsMg: 120000, fatMg: 40000, fiberMg: 9000, ironMg: 4};
  h.foods.push({id: 'health_food-0001', name: 'Fictional bowl', brand: '', servingGrams: 300, nutrients: bowl, createdAt: stamp('2026-09-01'), updatedAt: stamp('2026-09-01')});
  for (let i = 1; i <= 42; i++) {
    const d = addLocalDays(DAY, -i);
    for (const [k, meal, t] of [['a', 'Lunch', '12:00'], ['b', 'Dinner', '19:00']] as const) h.diary.push({id: `health_diary-${String(i).padStart(3, '0')}${k}`, sourceId: 'health_food-0001', sourceKind: 'food', snapshot: {name: 'Fictional bowl', servingGrams: 300, nutrients: bowl}, date: d, meal, quantityMilli: 1000, createdAt: stamp(d, t), updatedAt: stamp(d, t)});
    if (i % 2 === 0) h.weights.push({id: `health_weight-${String(i).padStart(3, '0')}`, date: d, grams: 72000 + i * 60, createdAt: stamp(d), updatedAt: stamp(d)});
  }
  return healthSchema.parse({...h, schemaVersion: 4});
}
/** The person's own AI, a MOCK: it answers the photo request with one estimated food. */
async function mockModel(page: Page) {
  const asked: string[] = [];
  const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
  const block = {kind: 'log-food', name: 'Fictional lentil curry', meal: 'Dinner', estimate: {range: {kcal: [500, 700], protein_g: [22, 30]}, serving_g: 400, from: 'photo'}};
  await page.route(`${AI}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({json: {object: 'list', data: [{id: 'mock-chat'}]}});
    if (url.endsWith('/v1/chat/completions')) { asked.push(route.request().postData() ?? ''); return route.fulfill({contentType: 'text/event-stream', body: [chunk({role: 'assistant', content: `A curry with rice, judged from the photo.\n\n\`\`\`zigoals-action\n${JSON.stringify(block)}\n\`\`\``}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('')}); }
    return route.fulfill({status: 404, body: ''});
  });
  return asked;
}
const health = (page: Page) => stored<HealthData & {daily: {water: {amountMilli: number; date: string}[]}; sleep?: {nights: unknown[]}}>(page, HEALTH_STORAGE_KEY);
const todaysDiary = async (page: Page, day = DAY) => (await health(page))!.diary.filter(d => d.date === day).map(d => d.snapshot.name);

for (const theme of JOURNEY_THEMES) test(themedTitle('@journey 2 health day: barcode → offline generic food → photo estimate → water → workout (superset, RPE, plates) → sleep → coach', theme), inTheme(theme, async ({page}) => {
  test.setTimeout(180_000);
  const stray = strayRequests(page, u => u.origin === AI);
  await page.clock.install({time: at(DAY, '07:30')});
  await offlineApis(page);
  const lookups: string[] = [];
  await page.route('**/api/food-lookup?*', route => {
    const url = new URL(route.request().url()); lookups.push(url.search);
    return url.searchParams.has('code') ? route.fulfill({json: PRODUCT}) : route.fulfill({status: 503, json: {error: 'UNAVAILABLE'}});
  });
  const asked = await mockModel(page);
  const base = defaultAiSettings();
  await seedRecords(page, {[HEALTH_STORAGE_KEY]: history(), [AI_SETTINGS_KEY]: {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: AI, includeHealth: true, pageShare: {...base.pageShare, health: true}}, [AI_OPTIONS_KEY]: {version: 1, toolMode: 'attach'}}, {settings: 'health'});

  // Breakfast: a barcode, looked up (only the code leaves), reviewed and logged.
  await page.goto('/app/health'); await hydrated(page);
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const lookup = page.getByRole('region', {name: 'Barcode food lookup'});
  await lookup.getByLabel('Product barcode', {exact: true}).fill('0034000470693');
  await lookup.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(lookup.getByRole('heading', {name: PRODUCT.name})).toBeVisible();
  await expect(lookup.getByLabel('Fat (g)', {exact: true})).toHaveValue(''); // unknown stays unknown
  await expect(lookup.getByRole('button', {name: 'Confirm and log food'})).toBeDisabled();
  await lookup.getByLabel(/^I checked the package:/).check();
  await lookup.getByLabel('Grams eaten').fill('60');
  await lookup.getByRole('button', {name: 'Confirm and log food'}).click();
  await expect(lookup).toContainText('Added to your private diary');
  expect(lookups).toEqual(['?code=0034000470693&grade=1']);

  // A snack from the offline generic library: the Swiss database is down, the device's library still answers.
  await lookup.getByRole('button', {name: 'Search foods by name', exact: true}).click();
  const search = lookup.getByRole('search', {name: 'Swiss food database search'});
  await search.getByLabel('Food name').fill('banana');
  await search.getByLabel('Food name').press('Enter');
  const offline = lookup.getByRole('list', {name: 'Offline food library results'});
  await expect(offline.getByRole('button', {name: /^Use Bananas/}).first()).toBeVisible({timeout: 20_000});
  await expect(lookup).toContainText('The Swiss food database is not available right now.');
  await offline.getByRole('button', {name: /^Use Bananas/}).first().click();
  await expect(lookup.getByLabel('Calories (kcal)', {exact: true})).not.toHaveValue('');
  await lookup.getByLabel('I checked these values: they are per 100 g, or I corrected them privately.').check();
  await lookup.getByLabel('Grams eaten').fill('120');
  await lookup.getByRole('button', {name: 'Confirm and log food'}).click();
  await expect(lookup).toContainText('Added to your private diary');
  expect((await todaysDiary(page)).length).toBe(2);
  expect(lookups.filter(l => l.startsWith('?q=banana'))).toHaveLength(1); // only the typed words

  // Water: two glasses.
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  // Session AL (P-MO-97, MO-111, deliberate): a second tap within 350 ms (the event's own time, not the faked clock) is the
  // same tap and is ignored, so the second glass is a tap of its own: after the first is saved and 350 ms have passed.
  await expect.poll(async () => (await health(page))!.daily.water.filter(w => w.date === DAY).reduce((s, w) => s + w.amountMilli, 0)).toBe(250_000);
  await page.waitForTimeout(400);
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect.poll(async () => (await health(page))!.daily.water.filter(w => w.date === DAY).reduce((s, w) => s + w.amountMilli, 0)).toBe(500_000);

  // Dinner, estimated from a photo by the person's own AI: a card with ranges; nothing logged until Add.
  await page.clock.setSystemTime(at(DAY, '19:30'));
  // Session AL (COPY_AUDIT, deliberate): P-MO-40 (MO-012, MO-156) moved the meal photo into the Diary, under a named header.
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Diary', exact: true}).click();
  await page.locator('summary', {hasText: 'Estimate a meal from a photo'}).click();
  const photo = page.getByRole('region', {name: 'Estimate a meal from a photo'});
  await expect(photo).toContainText('Nothing is logged until you accept a card.');
  await photo.getByRole('button', {name: 'Open ZIGi', exact: true}).click();
  await expect(zigiPanel(page)).toBeVisible({timeout: 15_000});
  await sendToZigi(page, 'Log this meal from the photo.');
  const estimate = zigiPanel(page).locator('.ai-card').last();
  await expect(estimate).toContainText('kcal 500–700 (saved as 600)');
  expect((await todaysDiary(page)).length).toBe(2);
  await estimate.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(estimate).toHaveClass(/ai-card-added/);
  await expect.poll(async () => Object.values((await stored<{foods: Record<string, {source: string}>}>(page, MEAL_ESTIMATES_KEY))?.foods ?? {})).toEqual([expect.objectContaining({source: 'photo'})]);
  expect(asked).toHaveLength(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('list', {name: 'Meals estimated by your AI'})).toContainText('Fictional lentil curry');

  // A workout: bench press and rows as a superset, RPE on a set, the plates for the working weight.
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  await page.getByRole('button', {name: 'Start an empty workout'}).click();
  const now = page.getByRole('region', {name: 'Workout in progress'});
  await now.getByLabel('Find an exercise').fill('bench');
  await now.getByRole('button', {name: /^Bench press/}).click();
  await now.getByRole('button', {name: '+ Add an exercise'}).click();
  await now.getByLabel('Find an exercise').fill('barbell row');
  await now.getByRole('button', {name: /^Barbell row/}).click();
  await now.getByRole('button', {name: 'Superset with next', exact: true}).click();
  await expect(now.getByRole('heading', {name: /Superset A.*Bench press/})).toBeVisible();
  await expect(now.getByRole('heading', {name: /Superset A.*Barbell row/})).toBeVisible();
  await now.getByLabel('Bench press, set 1: weight in kg').fill('60');
  await now.getByLabel('Bench press, set 1: reps').fill('8');
  await now.getByLabel('Bench press, set 1: RPE, how hard it felt').selectOption('8');
  await now.getByRole('button', {name: 'Mark Bench press, set 1 done'}).click();
  await expect(now.getByRole('timer')).toHaveCount(0); // in a superset the rest waits for the round's last exercise
  await now.getByLabel('Barbell row, set 1: weight in kg').fill('50');
  await now.getByLabel('Barbell row, set 1: reps').fill('10');
  await now.getByRole('button', {name: 'Mark Barbell row, set 1 done'}).click();
  await expect(now.getByRole('timer')).toContainText('Rest');
  await now.getByRole('button', {name: 'Skip rest'}).click();
  const bench = now.getByRole('article', {name: /Bench press/});
  await bench.locator('summary', {hasText: 'Warm-up and plates'}).click();
  await expect(bench.getByRole('region', {name: 'Plates for each side'})).toContainText('kg on each side');
  await expect(bench.getByRole('region', {name: 'Warm-up'})).toContainText('kg ×');
  await now.getByRole('button', {name: 'Finish workout'}).click();
  await expect(page.getByRole('region', {name: 'Workout, done'})).toBeVisible();
  const w = (await stored<{workouts: {endedAt?: string; exercises: {name: string; supersetId?: string; sets: {rpe?: number; weightKg?: number}[]}[]}[]}>(page, WORKOUTS_KEY))!;
  expect(w.workouts).toHaveLength(1);
  expect(w.workouts[0]!.exercises.map(e => e.name)).toEqual(['Bench press', 'Barbell row']);
  expect(w.workouts[0]!.exercises[0]!.sets[0]).toMatchObject({weightKg: 60, rpe: 8});

  // Last night's sleep.
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const night = page.getByRole('form', {name: 'Log a night or a nap'});
  await night.getByRole('radio', {name: '4 · Good', exact: true}).check();
  await night.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Night saved.');
  expect((await health(page))!.sleep!.nights).toHaveLength(1);

  // The weekly coach: Keep, then Undo clears the answer, then Keep again.
  // Session AK RB (R2-8, deliberate): the coach card lives in Health's Weight view now; #weight opens it.
  await page.goto('/app/health#weight'); await hydrated(page);
  const coach = page.getByRole('region', {name: 'Your coach'});
  await expect(coach.getByText(/^This week: [−+]?\d+(\.\d)? kg\/week\.$/)).toBeVisible();
  await coach.getByRole('button', {name: 'Keep my target', exact: true}).click();
  await expect(coach.getByText('You kept your target this week.')).toBeVisible();
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect(coach.getByRole('button', {name: 'Keep my target', exact: true})).toBeVisible();
  await coach.getByRole('button', {name: 'Keep my target', exact: true}).click();
  await expect.poll(async () => Object.values((await stored<{answers?: Record<string, {answer: string}>}>(page, HEALTH_COACH_KEY))?.answers ?? {}).map(a => a.answer)).toEqual(['keep']);
  expect((await health(page))!.targets.kcal).toBe(2200); // Keep never changes the target

  // The next morning: the scanned food again in one tap, from Recent scans; nothing is looked up again.
  const tomorrow = addLocalDays(DAY, 1);
  await nextDay(page, at(tomorrow, '07:45'), '/app/health');
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const again = page.getByRole('region', {name: 'Barcode food lookup'});
  await again.getByRole('button', {name: `Log ${PRODUCT.name} again`}).click();
  await expect(again).toContainText(`${PRODUCT.name} logged again`);
  expect(await todaysDiary(page, tomorrow)).toEqual([PRODUCT.name]);
  expect(lookups.filter(l => l.startsWith('?code'))).toHaveLength(1);
  expect(stray).toEqual([]);
}));
