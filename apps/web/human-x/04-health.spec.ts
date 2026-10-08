import {expect, type Page} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY, healthSchema, logHealthItem, saveFood, type HealthData, type HealthDiaryEntry} from '../lib/health';
import {journey, noSideways, open, ready, snap, type Journey} from './kit';

// Session X Part 14, journeys J091–J135: Health, Sleep, Meditation, Devices (docs/verification/x-cloud/HUMAN_TEST.md).
const health = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:health:v1') ?? 'null'));
async function view(page: Page, name: string) { await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name, exact: true}).click(); }
/** On a phone, Sleep, Meditation and the Fasting timer sit in folds on the Health page (health-app.tsx); this opens one. */
async function fold(j: Journey, label: string) {
  if (!j.phone) return;
  const toggle = j.page.locator('.phone-fold-toggle').filter({hasText: new RegExp(`^${label}\\s*(Show|Hide)$`)});
  await expect(async () => { if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true', {timeout: 1500}); }).toPass({timeout: 15_000});
}
async function newFood(j: Journey, name: string, kcal = '150') {
  const {page} = j;
  await view(page, 'Foods & recipes');
  await page.getByRole('button', {name: 'New food', exact: true}).click();
  const form = page.getByRole('form', {name: 'Food details'});
  for (const [label, value] of [['Food name', name], ['Serving weight (g)', '40'], ['Calories (kcal)', kcal], ['Protein (g)', '5'], ['Carbs (g)', '27'], ['Fat (g)', '3']] as const) await form.getByLabel(label).fill(value);
  await form.getByRole('button', {name: 'Save food', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Food saved'})).toContainText('Food saved');
  if (j.phone) { const sheet = page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await page.keyboard.press('Escape'); }
}
/** Fictional records written as the app writes them (lib/health), before the journey opens Health. */
const STAMP = '2026-10-01T08:00:00.000Z';
function pantry(foods: [key: string, name: string, kcal: number, grams?: number][], logs: [key: string, date: string, meal: HealthDiaryEntry['meal'], servings: number][] = []): HealthData {
  let data = createEmptyHealth();
  for (const [key, name, kcal, grams = 40] of foods) data = saveFood(data, {id: `health_food-${key}`, name, brand: '', servingGrams: grams, nutrients: {kcal, proteinMg: 5000, carbsMg: 20000, fatMg: 3000}, createdAt: STAMP, updatedAt: STAMP});
  logs.forEach(([key, date, meal, servings], i) => { data = logHealthItem(data, {id: `health_entry-${String(i).padStart(3, '0')}`, sourceId: `health_food-${key}`, sourceKind: 'food', date, meal, quantityMilli: servings * 1000}, `${date}T07:00:00.000Z`); });
  return data;
}
async function seedHealth(page: Page, data: HealthData) { await page.goto('/app/settings'); await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HEALTH_STORAGE_KEY, JSON.stringify(healthSchema.parse(data))]); }
async function closeSheet(j: Journey) { if (!j.phone) return; const sheet = j.page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await j.page.keyboard.press('Escape'); }
/** Health's status line (one per page, under the views). */
const said = (page: Page) => page.locator('p.health-feedback');
const offline = (page: Page) => page.getByRole('alert').filter({hasText: 'You’re offline.'});
const water = (page: Page) => page.getByRole('region', {name: 'Water journal'});
const meal = (page: Page, name: HealthDiaryEntry['meal']) => page.getByRole('region', {name: `${name} diary`});
const running = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition)).length);
const todays = async (page: Page, day = '2026-10-07') => ((await health(page)) as HealthData).diary.filter(e => e.date === day).map(e => [e.meal, e.snapshot.name, e.quantityMilli]);
const LOOKUP = {barcode: '0034000470693', name: 'Fictional granola', brand: 'Fixture', basis: 'unverified-100g-or-100ml', nutrients: {kcal: 400, proteinMg: 9000, carbsMg: 60000, fatMg: null}, source: 'Open Food Facts', apiVersion: '3.4', observedAt: '2026-10-01T12:00:00.000Z'};
const barcodeArea = async (page: Page) => { await page.getByText('Scan or look up a food barcode', {exact: true}).click(); return page.getByRole('region', {name: 'Barcode food lookup'}); };
const diaryCount = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{"diary":[]}') as {diary: unknown[]}).diary.length, HEALTH_STORAGE_KEY);
const dateControl = (page: Page) => page.locator('.health-date');
async function logFood(j: Journey, label: string, servings: string, at: HealthDiaryEntry['meal'] = 'Breakfast') {
  const form = await mealLog(j);
  await form.getByLabel('Food or recipe').selectOption({label});
  await form.getByLabel('Meal', {exact: true}).selectOption(at);
  await form.getByLabel('Servings', {exact: true}).fill(servings);
  await form.getByRole('button', {name: 'Log to diary', exact: true}).click();
  await expect(said(j.page)).toHaveText('Meal logged.');
}
async function mealLog(j: Journey) {
  const {page} = j;
  if (j.phone) {
    const sheet = page.getByRole('dialog', {name: 'Log a meal'});
    await expect(async () => { if (!await sheet.isVisible()) await page.getByRole('button', {name: 'Log a meal', exact: true}).click(); await expect(sheet).toBeVisible({timeout: 1500}); }).toPass({timeout: 15_000});
  }
  return page.getByRole('form', {name: 'Log a meal'});
}

journey('J091', 'Health\'s first visit says what stays on the device', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/health');
  await expect(j.page.locator('main')).toContainText(/on this device|stays on|private/i);
  await snap(j, 'J091', 'first-visit');
});

journey('J092', 'the diary: a food, then a meal of 1.5 servings, the calories right', {views: 'all', data: ['E', 'L'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await newFood(j, 'Fictional oats');
  await view(page, 'Diary');
  const form = await mealLog(j);
  await form.getByLabel('Food or recipe').selectOption({label: 'Fictional oats · food'});
  await form.getByLabel('Servings').fill('1.5');
  await form.getByRole('button', {name: 'Log to diary'}).click();
  await expect(page.getByRole('region', {name: 'Breakfast diary'})).toContainText('225 kcal');
});

journey('J093', 'a food with no name is refused with a reason; the draft is kept', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await view(page, 'Foods & recipes');
  await page.getByRole('button', {name: 'New food', exact: true}).click();
  const form = page.getByRole('form', {name: 'Food details'});
  await form.getByLabel('Food name').fill('   ');
  await form.getByLabel('Serving weight (g)').fill('80');
  await form.getByLabel('Calories (kcal)').fill('120');
  const before = await page.evaluate(() => localStorage.getItem('zigoals:health:v1'));
  await form.getByRole('button', {name: 'Save food', exact: true}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Could not save'})).toBeVisible();
  await expect(form.getByLabel('Serving weight (g)')).toHaveValue('80');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:health:v1'))).toBe(before);
});

journey('J099', 'weight: 78.4 kg saved and listed; a second entry the same day', {views: 'all', data: ['L'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await view(page, 'Weight');
  const form = page.getByRole('form', {name: 'Weight entry'});
  await form.getByLabel('Weight (kg)').fill('78.4');
  await form.getByRole('button', {name: 'Save weight'}).click();
  await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('78.4 kg');
});

journey('J104', 'fasting: start 16:8, stop early; only hours and the target are kept', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T20:00:00+02:00')});
  await open(page, '/app/health');
  await fold(j, 'Fasting timer');
  const fasting = page.getByRole('region', {name: 'Fasting timer', exact: true});
  await fasting.scrollIntoViewIfNeeded();
  await fasting.getByRole('button', {name: '16:8', exact: true}).click();
  await fasting.getByRole('button', {name: 'Start fast', exact: true}).click();
  await page.clock.fastForward(3 * 3_600_000);
  await fasting.getByRole('button', {name: 'Stop fast', exact: true}).click();
  await expect(fasting.getByRole('status')).toContainText('Your target was 16 h.');
  const stored = JSON.stringify(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.includes('fasting')))));
  expect(stored).not.toMatch(/streak|record|calorie/i);
  // The fast is kept as its times and its target only (zigoals:fasting:v1).
  const sessions = (await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:fasting:v1') ?? '{"sessions":[]}'))).sessions as Record<string, unknown>[];
  expect(sessions).toHaveLength(1);
  const fast = sessions[0]!;
  expect(Object.keys(fast).every(k => ['id', 'startedAt', 'endedAt', 'targetHours', 'timeZone', 'stoppedBy'].includes(k)), JSON.stringify(fast)).toBe(true);
  expect(fast.targetHours).toBe(16);
  const hours = (Date.parse(fast.endedAt as string) - Date.parse(fast.startedAt as string)) / 3_600_000;
  expect(hours).toBeGreaterThanOrEqual(3);
  expect(hours).toBeLessThan(3.1);
});

journey('J109', 'Sleep: "I\'m going to bed", then "I woke up"; time asleep marked estimated', {views: 'all', data: ['L'], live: true}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-20T22:40:00+02:00')});
  await open(page, '/app/health?view=sleep');
  const tonight = page.getByRole('region', {name: 'Tonight'});
  await tonight.getByRole('button', {name: 'I’m going to bed', exact: true}).click();
  await expect(tonight.locator('.sleep-running')).toContainText('In bed since 22:40');
  await page.clock.fastForward(7 * 3_600_000 + 50 * 60_000);
  await open(page, '/app/health');
  const card = page.getByRole('region', {name: 'Rest well.'});
  await card.getByRole('button', {name: 'I woke up', exact: true}).click();
  await expect(card.getByRole('status')).toHaveText('Good morning. Your night is saved.');
  await expect(card).toContainText('(estimated)');
  await snap(j, 'J109', 'night-saved');
});

journey('J115', 'Meditation: a one-minute session timed to the end', {views: 'all', data: ['L'], live: true}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T07:00:00+02:00')});
  await open(page, '/app/health?view=meditation');
  const begin = page.getByRole('form', {name: 'Begin a session'});
  await begin.getByRole('radio', {name: '1 min', exact: true}).check();
  await begin.getByRole('group', {name: 'How do you feel before? (optional)'}).getByRole('button', {name: '3 · OK', exact: true}).click();
  await begin.getByRole('button', {name: 'Begin', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Meditation in progress'})).toBeVisible();
  await page.clock.fastForward(61_000);
  // Timed to the end, the session is offered to be saved or let go: it reaches the journal only with "Save".
  const done = page.getByRole('region', {name: '1 min of stillness', exact: true});
  await expect(done).toBeVisible({timeout: 15_000});
  await done.getByRole('group', {name: 'How do you feel now? (optional)'}).getByRole('button', {name: '4 · Calm', exact: true}).click();
  await done.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Saved: 1 min.'}).first()).toBeAttached();
  await expect(page.getByRole('region', {name: 'Recent sessions'})).toContainText('1 min', {timeout: 15_000});
  const sessions = ((await health(page))?.meditation?.sessions ?? []) as Record<string, unknown>[];
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({kind: 'timer', seconds: 60, moodBefore: 3, moodAfter: 4});
});

journey('J119', 'Devices: the honest list; without Web Bluetooth it says so', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/health?view=devices');
  const main = j.page.locator('main');
  await expect(main).toContainText('turned off 30 October 2026');
  await expect(main).toContainText('Needs setup by ZIGoals');
  await snap(j, 'J119', 'devices');
});

journey('J122', 'Health in Showcase writes nothing to my records', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  const {page} = j;
  const before = await page.evaluate(() => localStorage.getItem('zigoals:health:v1'));
  await open(page, '/app/health');
  await view(page, 'Weight');
  await open(page, '/app/health?view=sleep');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:health:v1'))).toBe(before);
});

journey('J123', 'a long food name with emoji stays inside its card', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await newFood(j, 'Fictional 🥣 overnight oats with blueberries, chia, almond milk & honey');
  await expect(page.getByRole('heading', {name: 'Fictional 🥣 overnight oats with blueberries, chia, almond milk & honey', exact: true})).toBeVisible();
});

journey('J131', 'Health\'s empty state says what to do first', {views: 'all', data: ['E']}, async j => {
  await open(j.page, '/app/health');
  await expect(j.page.getByText('No calorie target set')).toBeVisible();
});

journey('J132', 'Health → Sleep → back → Meditation → back: each title shown', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = (name: string) => page.getByRole('heading', {level: 1, name});
  // From the Health page by its own links (Sleep's "Open Sleep →", Meditation's "Begin a session"), then the browser's Back.
  await open(page, '/app/health');
  await expect(title('A little care, every day.')).toBeVisible();
  await fold(j, 'Sleep');
  await page.getByRole('link', {name: 'Open Sleep →', exact: true}).click();
  await page.waitForURL(/\/app\/health\?view=sleep$/);
  await expect(title('Your sleep, your rhythm.')).toBeVisible();
  await page.goBack();
  await page.waitForURL(/\/app\/health$/);
  await expect(title('A little care, every day.')).toBeVisible();
  await fold(j, 'Meditation');
  await page.getByRole('link', {name: 'Begin a session', exact: true}).click();
  await page.waitForURL(/\/app\/health\?view=meditation$/);
  await expect(title('Breathe. Be here.')).toBeVisible();
  await page.goBack();
  await page.waitForURL(/\/app\/health$/);
  await expect(title('A little care, every day.')).toBeVisible();
  await ready(page);
});

journey('J101', 'activity by hand: a walk with steps and minutes, saved and kept after a reload', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await view(page, 'Activity');
  const form = page.getByRole('form', {name: 'Manual activity'});
  await form.getByLabel('Activity name').fill('Fictional afternoon walk');
  await form.getByLabel('Steps').fill('2500');
  await form.getByLabel('Minutes').fill('25');
  await form.getByRole('button', {name: 'Save activity'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Activity saved'})).toContainText('Activity saved');
  await page.reload();
  await ready(page);
  expect(JSON.stringify(await health(page))).toContain('Fictional afternoon walk');
});

journey('J102', 'targets: set mine, then clear one; ZIGoals suggests none', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await view(page, 'Targets');
  const targets = page.getByRole('form', {name: 'Personal targets'});
  await targets.getByLabel('Calorie target (kcal)').fill('2300');
  await targets.getByRole('button', {name: 'Save targets'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Targets saved'})).toContainText('Targets saved');
  await targets.getByLabel('Calorie target (kcal)').fill('');
  await targets.getByRole('button', {name: 'Save targets'}).click();
  await view(page, 'Diary');
  await expect(page.getByText('No calorie target set')).toBeVisible();
});

journey('J106', 'a health goal counts only my own water entries; "No data yet" before', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/goals');
  const section = page.getByRole('region', {name: 'Health goals', exact: true});
  await expect(section).toContainText('No health goals yet.');
  await section.getByRole('button', {name: '+ Health goal', exact: true}).click();
  await page.getByLabel('Name', {exact: true}).fill('Fictional water days');
  await page.getByLabel(/^Measure/).selectOption('water');
  await page.getByLabel('Target', {exact: true}).fill('5');
  await page.getByRole('radio', {name: /^Rolling/}).check();
  await page.getByLabel('Weeks', {exact: true}).fill('2');
  await page.getByRole('button', {name: 'Create health goal', exact: true}).click();
  await expect(section.getByRole('status')).toContainText('Health goal created.');
  await expect(section).toContainText(/No data yet|0 of 5/);
});

journey('J110', 'a night logged by hand with quality and a tag, edited, then deleted', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/health?view=sleep');
  const form = page.getByRole('form', {name: 'Log a night or a nap'});
  await form.getByRole('radio', {name: '4 · Good', exact: true}).check();
  await form.getByRole('checkbox', {name: 'caffeine', exact: true}).check();
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  const recent = page.getByRole('region', {name: 'Recent nights and naps'});
  await expect(recent).toContainText('Night ending 2026-10-14');
  await recent.getByRole('button', {name: /^Delete the night ending 2026-10-14/}).click();
  const confirm = page.getByRole('button', {name: 'Delete it', exact: true});
  if (await confirm.count()) await confirm.click();
  await expect(recent).not.toContainText('Night ending 2026-10-14');
});

journey('J111', 'a night across the Brussels clock change counts nine hours in bed', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-25T09:00:00+01:00')});
  await open(page, '/app/health?view=sleep');
  const form = page.getByRole('form', {name: 'Log a night or a nap'});
  await form.getByLabel('Went to bed (date)').fill('2026-10-24');
  await form.getByLabel('Went to bed (time)').fill('23:00');
  await form.getByLabel('Woke up (date)').fill('2026-10-25');
  await form.getByLabel('Woke up (time)').fill('07:00');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Recent nights and naps'})).toContainText('in bed 9 h 00 min');
});

journey('J100', 'measurements: waist and chest saved; the waist corrected, its earlier value kept in its history', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await view(page, 'Measurements');
  const kind = page.getByLabel('Measurement history type', {exact: true}), form = page.getByRole('form', {name: 'Body measurement entry'}), records = page.getByRole('region', {name: 'Measurement records'});
  for (const [k, value] of [['waist', '82'], ['chest', '98']] as const) {
    await kind.selectOption(k);
    await form.getByLabel('Measurement value', {exact: true}).fill(value);
    // "Measured at" is required and starts empty (a timed measurement): the person sets it.
    await form.getByLabel('Measured at (device time)', {exact: true}).fill('2026-10-01T08:00');
    await form.getByRole('button', {name: 'Save measurement', exact: true}).click();
    await expect(records).toContainText(`${value} cm`);
  }
  await kind.selectOption('waist');
  // A reading has no remove: it is corrected and its history kept (closest real behaviour to "remove").
  await page.getByRole('button', {name: 'Correct measurement', exact: true}).click();
  await form.getByLabel('Measurement value', {exact: true}).fill('81');
  await form.getByRole('button', {name: 'Save measurement', exact: true}).click();
  await expect(records).toContainText('81 cm');
  await records.getByText('Record history', {exact: true}).click();
  await expect(records).toContainText('Previous: 82 cm');
  await expect(records.locator('tbody tr')).toHaveCount(1);
  await kind.selectOption('chest');
  await expect(records).toContainText('98 cm');
});

journey('J094', 'Foods & recipes: two foods, a recipe from both, then the recipe logged in the diary', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  await newFood(j, 'Fictional rolled oats', '150');
  await newFood(j, 'Fictional plain yoghurt', '100');
  await page.getByRole('button', {name: 'New recipe', exact: true}).click();
  const recipe = page.getByRole('form', {name: 'Recipe details'});
  await recipe.getByLabel('Recipe name').fill('Fictional overnight oats');
  await recipe.getByLabel('Recipe makes (servings)').fill('2');
  await recipe.getByLabel('Ingredient 1', {exact: true}).selectOption({label: 'Fictional rolled oats'});
  await recipe.getByLabel('Ingredient servings 1').fill('2');
  await recipe.getByRole('button', {name: 'Add ingredient', exact: true}).click();
  await recipe.getByLabel('Ingredient 2', {exact: true}).selectOption({label: 'Fictional plain yoghurt'});
  await recipe.getByLabel('Ingredient servings 2').fill('1');
  // (2 × 150 + 1 × 100) kcal shared by 2 servings.
  await expect(recipe.locator('.health-preview strong')).toHaveText('200 kcal per serving');
  await recipe.getByRole('button', {name: 'Save recipe', exact: true}).click();
  await expect(said(page)).toHaveText('Recipe saved.');
  const saved = page.locator('.health-library-row').filter({has: page.getByRole('heading', {name: 'Fictional overnight oats', exact: true})});
  await expect(saved).toContainText('Makes 2 servings · 2 ingredients · Version 1');
  await view(page, 'Diary');
  await logFood(j, 'Fictional overnight oats · recipe', '2', 'Lunch');
  const lunch = meal(page, 'Lunch');
  await expect(lunch.locator('.health-entry')).toHaveCount(1);
  await expect(lunch.locator('.health-entry')).toContainText('Fictional overnight oats');
  await expect(lunch.locator('.health-entry')).toContainText('Recipe version 1');
  await expect(lunch.locator('.health-section-heading')).toContainText('400 kcal');
  const entry = ((await health(page)) as HealthData).diary[0]!;
  expect(entry).toMatchObject({meal: 'Lunch', sourceKind: 'recipe', quantityMilli: 2000});
  expect(entry.snapshot.nutrients.kcal).toBe(200);
});

journey('J095', 'Meals & planning: tomorrow planned from two saved meals; the grocery list adds them up; a checkoff is kept', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T08:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150, 40], ['yoghurt', 'Fictional yoghurt', 100, 125], ['rice', 'Fictional brown rice', 160, 75]],
    [['oats', '2026-10-14', 'Breakfast', 1], ['yoghurt', '2026-10-14', 'Breakfast', 1], ['rice', '2026-10-14', 'Lunch', 2]]));
  await open(page, '/app/health');
  await view(page, 'Meals & planning');
  const keep = page.getByRole('form', {name: 'Save a reusable meal'});
  await keep.getByLabel('Saved meal name').fill('Fictional weekday breakfast');
  await expect(keep).toContainText('2 entries selected.');
  await keep.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(said(page)).toHaveText('Reusable meal saved.');
  await keep.getByLabel('Saved meal name').fill('Fictional desk lunch');
  await keep.getByLabel('Diary meal to save').selectOption('Lunch');
  await expect(keep).toContainText('1 entry selected.');
  await keep.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Remove saved meal Fictional desk lunch', exact: true})).toBeVisible();
  const plan = page.getByRole('form', {name: 'Plan a meal'});
  for (const [name, slot] of [['Fictional weekday breakfast', 'Breakfast'], ['Fictional desk lunch', 'Lunch']] as const) {
    await plan.getByLabel('Planned saved meal').selectOption({label: name});
    await plan.getByLabel('Plan date').fill('2026-10-15');
    await plan.getByLabel('Planned meal slot').selectOption(slot);
    await plan.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.locator('.health-simple-list li').filter({hasText: name}).filter({hasText: `2026-10-15 · ${slot} · Planned`})).toBeVisible();
  }
  await expect(said(page)).toHaveText('Meal planned; nothing logged as consumed.');
  // The list covers today and the next six days, from the plans' own recorded ingredient measures.
  const groceries = page.getByRole('region', {name: 'Grocery list'});
  const row = (name: string) => groceries.getByRole('listitem').filter({has: page.getByRole('checkbox', {name: `Bought ${name}`})});
  await expect(groceries.getByRole('checkbox')).toHaveCount(3);
  await expect(row('Fictional oats')).toContainText('Planned: 40 g');
  await expect(row('Fictional yoghurt')).toContainText('Planned: 125 g');
  await expect(row('Fictional brown rice')).toContainText('Planned: 150 g');
  await groceries.getByRole('checkbox', {name: 'Bought Fictional oats'}).check();
  await expect(said(page)).toHaveText('Grocery checkoff saved.');
  await page.reload();
  await ready(page);
  await view(page, 'Meals & planning');
  await expect(page.getByRole('region', {name: 'Grocery list'}).getByRole('checkbox', {name: 'Bought Fictional oats'})).toBeChecked();
  await expect(page.getByRole('region', {name: 'Grocery list'}).getByRole('checkbox', {name: 'Bought Fictional yoghurt'})).not.toBeChecked();
  // A plan is not a meal eaten: tomorrow's diary is still empty.
  expect(await todays(page, '2026-10-15')).toEqual([]);
});

journey('J096', 'Copy yesterday\'s breakfast and lunch, then the next morning "Repeat yesterday"', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-07T09:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150], ['yoghurt', 'Fictional yoghurt', 100], ['apple', 'Fictional apple', 80]],
    [['oats', '2026-10-06', 'Breakfast', 1.5], ['yoghurt', '2026-10-06', 'Breakfast', 1], ['apple', '2026-10-06', 'Lunch', 2]]));
  await open(page, '/app/health');
  await expect(page.getByRole('button', {name: 'Repeat yesterday (3 entries in 2 meals)', exact: true})).toBeVisible();
  await meal(page, 'Breakfast').getByRole('button', {name: 'Copy yesterday’s breakfast (2 entries)', exact: true}).click();
  await expect(said(page)).toHaveText('Copied breakfast from yesterday: 2 entries.');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toHaveCount(2);
  await expect(meal(page, 'Breakfast')).toContainText('1.5 servings');
  // The day is no longer empty: "Repeat yesterday" steps aside; lunch can still be copied on its own.
  await expect(page.getByRole('button', {name: /^Repeat yesterday/})).toHaveCount(0);
  await meal(page, 'Lunch').getByRole('button', {name: 'Copy yesterday’s lunch (1 entry)', exact: true}).click();
  await expect(said(page)).toHaveText('Copied lunch from yesterday: 1 entry.');
  expect((await todays(page)).sort()).toEqual((await todays(page, '2026-10-06')).sort());
  // The next morning.
  await page.clock.setSystemTime(new Date('2026-10-08T08:30:00+02:00'));
  await page.reload();
  await ready(page);
  await expect(dateControl(page).getByLabel('Journal date')).toHaveValue('2026-10-08');
  await page.getByRole('button', {name: 'Repeat yesterday (3 entries in 2 meals)', exact: true}).click();
  await expect(said(page)).toHaveText('Copied 3 entries from yesterday.');
  await expect(page.getByRole('button', {name: /^Repeat yesterday/})).toHaveCount(0);
  await expect(meal(page, 'Lunch')).toContainText('Fictional apple');
  expect((await todays(page, '2026-10-08')).sort()).toEqual((await todays(page, '2026-10-06')).sort());
  expect(await diaryCount(page)).toBe(9);
});

journey('J097', 'one-tap chips: the usual oats at breakfast; a pinned yoghurt on every meal, kept after a reload', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T08:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150], ['yoghurt', 'Fictional yoghurt', 100], ['banana', 'Fictional banana', 90]],
    [['oats', '2026-10-10', 'Breakfast', 1], ['oats', '2026-10-11', 'Breakfast', 1], ['oats', '2026-10-12', 'Breakfast', 1.5], ['banana', '2026-10-12', 'Snacks', 1]]));
  await open(page, '/app/health');
  // "Usual" is what I logged at this meal in the last 30 days, at the amount I last used there.
  const breakfast = meal(page, 'Breakfast').getByRole('group', {name: 'One tap for breakfast'});
  await expect(breakfast.getByRole('button')).toHaveCount(1);
  await breakfast.getByRole('button', {name: 'Log Fictional oats, 1.5 servings, to breakfast', exact: true}).click();
  await expect(said(page)).toHaveText('Fictional oats logged to breakfast: 1.5 servings.');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  await expect(meal(page, 'Breakfast').getByRole('group', {name: 'One tap for breakfast'})).toHaveCount(0);
  await expect(meal(page, 'Snacks').getByRole('button', {name: 'Log Fictional banana, 1 serving, to snacks', exact: true})).toBeVisible();
  await expect(meal(page, 'Lunch').getByRole('group', {name: 'One tap for lunch'})).toHaveCount(0);
  // Pin the yoghurt from the quick picks (on a phone they sit in the "Log a meal" sheet).
  await mealLog(j);
  const picks = page.getByRole('region', {name: 'Private food quick picks'});
  await picks.getByRole('navigation', {name: 'Food quick-pick views'}).getByRole('button', {name: 'All', exact: true}).click();
  await picks.getByRole('button', {name: 'Pin Fictional yoghurt', exact: true}).click();
  await expect(said(page)).toHaveText('Fictional yoghurt pinned: one tap on every meal.');
  await expect(picks.getByRole('button', {name: 'Unpin Fictional yoghurt', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await closeSheet(j);
  await meal(page, 'Lunch').getByRole('button', {name: 'Log Fictional yoghurt, 1 serving, to lunch', exact: true}).click();
  await expect(said(page)).toHaveText('Fictional yoghurt logged to lunch: 1 serving.');
  await expect(meal(page, 'Lunch').locator('.health-entry')).toContainText('Fictional yoghurt');
  await page.reload();
  await ready(page);
  await expect(meal(page, 'Dinner').getByRole('button', {name: 'Log Fictional yoghurt, 1 serving, to dinner', exact: true})).toBeVisible();
  expect(await todays(page, '2026-10-14')).toEqual([['Breakfast', 'Fictional oats', 1500], ['Lunch', 'Fictional yoghurt', 1000]]);
});

journey('J098', 'water: my own glass sizes (a typo refused first), two glasses added, one removed, kept after a reload', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  const card = water(page);
  await expect(card.locator('.health-water-total')).toHaveText('No water entries yet');
  await card.getByRole('button', {name: 'Change these buttons', exact: true}).click();
  const sizes = card.getByRole('form', {name: 'Your water buttons'});
  const field = sizes.getByLabel(/^Your water buttons/);
  await expect(field).toHaveValue('250, 500');
  await field.fill('330, big');
  await sizes.getByRole('button', {name: 'Save buttons', exact: true}).click();
  await expect(sizes.getByRole('alert')).toHaveText('“big” is not a size. Use numbers like 250, 500.');
  await field.fill('330, 750');
  await sizes.getByRole('button', {name: 'Save buttons', exact: true}).click();
  await expect(said(page)).toHaveText('Water buttons saved.');
  await expect(card.getByRole('button', {name: 'Add 250 mL', exact: true})).toHaveCount(0);
  await card.getByRole('button', {name: 'Add 330 mL', exact: true}).click();
  await expect(card.locator('.health-water-total')).toHaveText('330 mL recorded');
  await card.getByRole('button', {name: 'Add 750 mL', exact: true}).click();
  await expect(card.locator('.health-water-total')).toHaveText('1,080 mL recorded');
  // Undo the second glass.
  await card.getByRole('button', {name: 'Remove water 750', exact: true}).click();
  await expect(said(page)).toHaveText('Water entry removed.');
  await expect(card.locator('.health-water-total')).toHaveText('330 mL recorded');
  await page.reload();
  await ready(page);
  await expect(water(page).locator('.health-water-total')).toHaveText('330 mL recorded');
  await expect(water(page).getByRole('button', {name: 'Add 750 mL', exact: true})).toBeVisible();
  expect(((await health(page)) as HealthData).daily!.water.map(w => w.amountMilli)).toEqual([330_000]);
});

journey('J103', 'Journal settings: a wrong zone refused; Tokyo, lb, US fl oz and my own water target; the day follows the zone', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  // 20:00 in Brussels is already 03:00 the next day in Tokyo.
  await page.clock.install({time: new Date('2026-10-14T20:00:00+02:00')});
  await open(page, '/app/health');
  await expect(dateControl(page).getByLabel('Journal date')).toHaveValue('2026-10-14');
  await view(page, 'Journal settings');
  const prefs = page.getByRole('form', {name: 'Health preferences'});
  await prefs.getByLabel('Journal timezone').fill('Mars/Olympus_Mons');
  await prefs.getByRole('button', {name: 'Save journal preferences', exact: true}).click();
  // The refusal is the journal's one shared fields message; the typed zone stays to be corrected.
  await expect(page.locator('.health-error')).toContainText('Check the highlighted fields.');
  await expect(prefs.getByLabel('Journal timezone')).toHaveValue('Mars/Olympus_Mons');
  expect(((await health(page)) as HealthData | null)?.daily?.preferences.timezone ?? null).toBeNull();
  await prefs.getByLabel('Journal timezone').fill('Asia/Tokyo');
  await prefs.getByLabel('Preferred water unit').selectOption('fl-oz-us');
  await prefs.getByLabel('Preferred weight unit').selectOption('lb');
  await prefs.getByLabel('Personal water target (mL, optional)').fill('2000');
  await prefs.getByRole('button', {name: 'Save journal preferences', exact: true}).click();
  await expect(said(page)).toHaveText('Journal preferences saved. Existing entry dates are unchanged.');
  // "Day start": the journal's day begins at midnight in its own zone.
  await expect(dateControl(page).getByLabel('Journal date')).toHaveValue('2026-10-15');
  await view(page, 'Diary');
  await expect(water(page).getByRole('button', {name: 'Add 8 US fl oz', exact: true})).toBeVisible();
  await expect(water(page)).toContainText('2026-10-15 · 2,000 mL personal target');
  await view(page, 'Weight');
  const weight = page.getByRole('form', {name: 'Weight entry'});
  await weight.getByLabel('Weight (lb)').fill('172.8');
  await weight.getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect(said(page)).toHaveText('Weight saved.');
  // Stored as grams; the history reads kg (172.8 lb = 78.381 kg).
  await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('2026-10-15');
  await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('78.381 kg');
});

journey('J105', 'a fast left running is stopped automatically at 24 hours when the clock moves on', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T20:00:00+02:00')});
  await open(page, '/app/health');
  const fasting = page.getByRole('region', {name: 'Fasting timer', exact: true});
  await fasting.getByRole('button', {name: '16:8', exact: true}).click();
  await fasting.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(fasting.getByRole('button', {name: 'Stop fast', exact: true})).toBeVisible();
  await page.clock.fastForward('25:00:00');
  await expect(fasting.getByRole('status')).toHaveText('This fast was stopped automatically at 24 hours.');
  await expect(fasting.getByRole('button', {name: 'Start fast', exact: true})).toBeVisible();
  await expect(fasting.locator('.fasting-history li').first()).toContainText('24.0 h · target 16 h · stopped at 24 h');
  const sessions = (await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:fasting:v1') ?? '{"sessions":[]}'))).sessions as {startedAt: string; endedAt: string; stoppedBy: string}[];
  expect(sessions).toHaveLength(1);
  expect(sessions[0]!.stoppedBy).toBe('limit');
  expect(Date.parse(sessions[0]!.endedAt) - Date.parse(sessions[0]!.startedAt)).toBe(24 * 3_600_000);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('region', {name: 'Fasting timer', exact: true}).getByRole('status')).toHaveText('This fast was stopped automatically at 24 hours.');
});

journey('J107', 'barcode: the camera is refused, the message is plain; the number typed instead, reviewed, then logged', {views: ['P'], data: ['L']}, async j => {
  const {page} = j;
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))}}));
  const asked: string[] = [];
  await page.route('**/api/food-lookup?**', route => { asked.push(new URL(route.request().url()).search); return route.fulfill({json: LOOKUP}); });
  await open(page, '/app/health');
  const area = await barcodeArea(page);
  await area.getByRole('button', {name: 'Scan barcode', exact: true}).click();
  await expect(area.getByRole('status')).toHaveText('Camera permission was denied. Manual barcode entry remains available.');
  const before = await diaryCount(page);
  await area.getByLabel('Product barcode').fill('0034000470693');
  await area.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(area.getByRole('heading', {level: 3, name: 'Fictional granola'})).toBeVisible();
  await expect(area.getByRole('status')).toHaveText('Review the package and correct any fields privately. Nothing has been logged.');
  // Only the code went out; a nutrient the provider did not give stays blank (unknown), never 0.
  expect(asked).toEqual(['?code=0034000470693']);
  await expect(area.getByLabel('Fat (g)')).toHaveValue('');
  expect(await diaryCount(page)).toBe(before);
  await area.getByLabel('Grams eaten').fill('50');
  await area.getByRole('checkbox', {name: /^I checked the package/}).check();
  await area.getByRole('button', {name: 'Confirm and log food', exact: true}).click();
  await expect(area.getByRole('status')).toHaveText('Added to your private diary with the reviewed nutrition snapshot.');
  await expect(meal(page, 'Snacks').locator('.health-entry')).toContainText('Fictional granola');
  await expect(meal(page, 'Snacks').locator('.health-section-heading')).toContainText('200 kcal');
  expect(await diaryCount(page)).toBe(before + 1);
});

journey('J108', 'barcode lookup offline, then with the lookup service down: "unavailable", nothing invented, nothing logged', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150]]));
  await open(page, '/app/health');
  const area = await barcodeArea(page);
  await area.getByLabel('Product barcode').fill('0034000470693');
  const before = await page.evaluate(k => localStorage.getItem(k), HEALTH_STORAGE_KEY);
  await page.context().setOffline(true);
  await expect(offline(page)).toBeVisible();
  await area.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(area.getByRole('status')).toHaveText('Food lookup is unavailable: this device looks offline. Your private food library still works.');
  await expect(area.getByRole('heading', {level: 3})).toHaveCount(0);
  await page.context().setOffline(false);
  await expect(offline(page)).toHaveCount(0);
  await page.route('**/api/food-lookup?**', route => route.fulfill({status: 503, json: {error: 'FOOD_LOOKUP_UNAVAILABLE'}}));
  await area.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(area.getByRole('status')).toHaveText('Food lookup is unavailable or awaiting provider setup. Your private food library still works.');
  await expect(area.getByRole('heading', {level: 3})).toHaveCount(0);
  await expect(area.getByRole('button', {name: 'Confirm and log food'})).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), HEALTH_STORAGE_KEY)).toBe(before);
  // The private library still works: a meal from it is logged as usual.
  await logFood(j, 'Fictional oats · food', '1');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toHaveCount(1);
});

journey('J112', 'Sleep debt and bedtime consistency, each with the formula it is worked out from', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/health?view=sleep');
  const week = page.getByRole('region', {name: 'Your last 7 days'});
  await expect(week).toContainText('No night logged in the last 7 days yet.');
  const goal = page.getByRole('form', {name: 'Your sleep goal'});
  await goal.getByRole('combobox', {name: /^Time asleep I aim for/}).selectOption('480');
  await goal.getByRole('button', {name: 'Save goal', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Your sleep goal is saved.');
  const recent = page.getByRole('region', {name: 'Recent nights and naps'});
  const stat = (name: string) => week.locator('.sleep-stat-wide').filter({hasText: name});
  // Four nights to 07:00, 10 minutes to fall asleep and 10 awake each: 460, 430, 490 and 460 minutes asleep.
  const nights = [['2026-10-10', '23:00', '2026-10-11'], ['2026-10-11', '23:30', '2026-10-12'], ['2026-10-12', '22:30', '2026-10-13'], ['2026-10-13', '23:00', '2026-10-14']] as const;
  for (const [i, [bedDate, bedTime, wakeDate]] of nights.entries()) {
    const form = page.getByRole('form', {name: 'Log a night or a nap'});
    await form.getByLabel('Went to bed (date)').fill(bedDate);
    await form.getByLabel('Went to bed (time)').fill(bedTime);
    await form.getByLabel('Woke up (date)').fill(wakeDate);
    await form.getByLabel('Woke up (time)').fill('07:00');
    await form.getByLabel(/^Time to fall asleep/).fill('10');
    await form.getByLabel(/^Time awake in the night/).fill('10');
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(recent).toContainText(`Night ending ${wakeDate}`);
    if (i === 2) {
      await expect(stat('Bedtime consistency').locator('dd')).toHaveText('Not yet');
      await expect(stat('Bedtime consistency')).toContainText('Needs at least 4 logged nights in 14 days.');
    }
  }
  await expect(week.locator('dl > div').filter({hasText: 'Asleep, on average'}).locator('dd')).toHaveText('7 h 40 min');
  // Debt: Σ (480 − asleep) = 20 + 50 − 10 + 20 = 80 minutes.
  await expect(stat('Sleep debt').locator('dd')).toHaveText('1 h 20 min');
  await expect(stat('Sleep debt')).toContainText('Your goal (8 h 00 min) minus time asleep, added up over the 4 nights you logged in the last 7 days.');
  // Consistency: bedtimes 23:00, 23:30, 22:30 and 23:00 have a standard deviation of √450 ≈ 21 minutes.
  await expect(stat('Bedtime consistency').locator('dd')).toHaveText('± 21 min');
  await expect(stat('Bedtime consistency')).toContainText('How much your bedtimes vary: the standard deviation of 4 bedtimes in the last 14 days.');
  await snap(j, 'J112', 'debt-consistency');
});

journey('J113', 'a nap is logged as a nap and never counted as a night', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T16:00:00+02:00')});
  await open(page, '/app/health?view=sleep');
  const form = page.getByRole('form', {name: 'Log a night or a nap'});
  await form.getByRole('radio', {name: 'A nap', exact: true}).check();
  await form.getByLabel('Went to bed (date)').fill('2026-10-14');
  await form.getByLabel('Went to bed (time)').fill('13:30');
  await form.getByLabel('Woke up (date)').fill('2026-10-14');
  await form.getByLabel('Woke up (time)').fill('14:10');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Nap saved.');
  const nap = page.getByRole('region', {name: 'Recent nights and naps'}).getByRole('listitem').filter({hasText: 'Nap ending 2026-10-14'});
  await expect(nap).toContainText('13:30 → 14:10 · 40 min asleep (estimated) · in bed 40 min');
  await expect(nap.getByRole('button', {name: 'Edit the nap ending 2026-10-14', exact: true})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Your last 7 days'})).toContainText('No night logged in the last 7 days yet.');
  const nights = ((await health(page)) as {sleep: {nights: {kind: string}[]}}).sleep.nights;
  expect(nights.map(n => n.kind)).toEqual(['nap']);
});

journey('J114', 'Sleep at 320 px: the title on the first screen, the form and the night inside the page, 44 px buttons', {views: ['P'], data: ['L']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 320, height: 568});
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/health?view=sleep');
  const title = (await page.getByRole('heading', {level: 1, name: 'Your sleep, your rhythm.'}).boundingBox())!;
  expect(title.y).toBeLessThan(568);
  expect(title.x + title.width).toBeLessThanOrEqual(320.5);
  const tonight = page.getByRole('region', {name: 'Tonight'}).getByRole('button', {name: 'I’m going to bed', exact: true});
  expect((await tonight.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const form = page.getByRole('form', {name: 'Log a night or a nap'});
  for (const field of await form.locator('input:not([type=radio]):not([type=checkbox]), textarea').all()) {
    const box = (await field.boundingBox())!;
    expect(box.x, 'a field starts inside the page').toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, 'a field ends inside the page').toBeLessThanOrEqual(320.5);
  }
  const save = form.getByRole('button', {name: 'Save', exact: true});
  const box = (await save.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(320.5);
  await save.click();
  await expect(page.locator('.sleep-note')).toHaveText('Night saved.');
  const night = page.getByRole('region', {name: 'Recent nights and naps'}).getByRole('listitem').first();
  await expect(night).toContainText('Night ending 2026-10-14');
  const line = (await night.boundingBox())!;
  expect(line.x + line.width).toBeLessThanOrEqual(320.5);
  await noSideways(page);
  await snap(j, 'J114', 'sleep-320');
});

journey('J116', 'the breathing circle moves with motion; with reduced motion or Motion Off it stands still and words and a count guide', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health?view=meditation');
  const begin = page.getByRole('form', {name: 'Begin a session'});
  await begin.getByRole('radio', {name: 'Breathe with a guide', exact: true}).check();
  await begin.getByRole('radio', {name: /^Box breathing/}).check();
  await begin.getByRole('button', {name: 'Begin', exact: true}).click();
  const session = page.getByRole('region', {name: 'Breathing in progress'});
  await expect(session).toBeVisible();
  await expect(session.locator('.breathing-pattern')).toHaveText('Box breathing: In 4 · hold 4 · out 4 · hold 4');
  const guide = session.locator('.breathing'), circle = session.locator('.breathing-circle');
  const scale = () => circle.evaluate(el => (el as HTMLElement).style.transform);
  // The circle moves only while it is on screen.
  await guide.scrollIntoViewIfNeeded();
  const words = () => session.locator('.breathing-words').innerText();
  // With motion allowed, the circle grows and shrinks.
  await expect(guide).toHaveAttribute('data-motion', 'on');
  await expect.poll(scale).toMatch(/^scale\(/);
  const first = await scale();
  await expect.poll(scale, {message: 'the circle keeps moving'}).not.toBe(first);
  // Reduced motion: the circle stands still; the words and the count carry on.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(guide).toHaveAttribute('data-motion', 'off');
  await expect.poll(scale).toBe('');
  await expect(session.locator('.breathing-words strong')).toHaveText(/^(Breathe in|Hold|Breathe out|Hold, empty)$/);
  await expect(session.locator('.breathing-count')).toHaveText(/· [1-4]$/);
  const said = await words();
  await expect.poll(words, {message: 'the count goes on'}).not.toBe(said);
  // Motion Off, chosen in Settings in another tab while the guide runs.
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect(guide).toHaveAttribute('data-motion', 'on');
  const settings = await page.context().newPage();
  await open(settings, '/app/settings');
  await settings.getByRole('region', {name: 'Appearance', exact: true}).getByRole('combobox', {name: /^Motion/}).selectOption('off');
  await settings.close();
  await expect(guide).toHaveAttribute('data-motion', 'off');
  await expect.poll(scale).toBe('');
  await expect(session.locator('.breathing-count')).toHaveText(/· [1-4]$/);
  // Let it go without saving.
  await session.getByRole('button', {name: 'End now', exact: true}).click();
  await page.getByRole('button', {name: 'Don’t save', exact: true}).click();
  await expect(page.getByRole('form', {name: 'Begin a session'})).toBeVisible();
  expect((((await health(page)) as {meditation?: {sessions?: unknown[]}} | null)?.meditation?.sessions ?? [])).toEqual([]);
});

journey('J117', 'Meditation\'s weekly goal: set my own, minutes count toward it, kept after a reload, then removed', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T19:00:00+02:00')});
  await open(page, '/app/health?view=meditation');
  const practice = page.getByRole('region', {name: 'Your practice'});
  const week = practice.locator('dl > div').filter({hasText: 'This week'});
  await expect(week.locator('dd')).toHaveText('0 min');
  await expect(week).toContainText('Set your own weekly goal below.');
  const goal = page.getByRole('form', {name: 'Your weekly goal'});
  await goal.getByRole('combobox', {name: /^Minutes a week I aim for/}).selectOption('90');
  await goal.getByRole('button', {name: 'Save goal', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Your weekly goal is saved.');
  await expect(week).toContainText('of your goal of 1 h 30 min a week');
  const manual = page.getByRole('form', {name: 'Log mindful minutes'});
  await manual.getByLabel('Minutes').fill('20');
  await manual.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Mindful minutes saved.');
  await expect(week.locator('dd')).toHaveText('20 min');
  await page.reload();
  await ready(page);
  await expect(page.getByRole('form', {name: 'Your weekly goal'}).getByRole('combobox', {name: /^Minutes a week I aim for/})).toHaveValue('90');
  const kept = page.getByRole('region', {name: 'Your practice'}).locator('dl > div').filter({hasText: 'This week'});
  await expect(kept.locator('dd')).toHaveText('20 min');
  await expect(kept).toContainText('of your goal of 1 h 30 min a week');
  await page.getByRole('form', {name: 'Your weekly goal'}).getByRole('button', {name: 'Remove the goal', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Your weekly goal is removed.');
  const after = page.getByRole('region', {name: 'Your practice'}).locator('dl > div').filter({hasText: 'This week'});
  await expect(after).toContainText('Set your own weekly goal below.');
  // Removing the goal keeps the minutes I sat.
  await expect(after.locator('dd')).toHaveText('20 min');
});

journey('J118', 'focus sounds: a 15-minute timer ends the sound on time; "Stop when I leave ZIGoals" stops it when I leave', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/health?view=meditation');
  const sounds = page.getByRole('region', {name: 'Focus sounds'});
  const status = sounds.locator('.ambient-status');
  await expect(status).toHaveText('Off');
  await sounds.getByRole('button', {name: 'Rain-like', exact: true}).click();
  await expect(sounds.getByRole('button', {name: 'Rain-like', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await sounds.getByRole('combobox', {name: /^Stop after/}).selectOption('15');
  await sounds.getByRole('button', {name: 'Play', exact: true}).click();
  await expect(status).toHaveText('Playing Rain-like · stops at 09:15');
  // The fade runs on the audio clock (not observable here); at the timer's end the player says Off and offers Play.
  await page.clock.fastForward('15:01');
  await expect(status).toHaveText('Off');
  await expect(sounds.getByRole('button', {name: 'Play', exact: true})).toBeVisible();
  const leave = () => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
  const back = () => page.evaluate(() => { delete (document as unknown as {visibilityState?: string}).visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  // Without the box, leaving ZIGoals keeps the sound playing.
  await sounds.getByRole('combobox', {name: /^Stop after/}).selectOption('0');
  await sounds.getByRole('button', {name: 'Play', exact: true}).click();
  await expect(status).toHaveText('Playing Rain-like');
  await leave();
  await back();
  await expect(status).toHaveText('Playing Rain-like');
  await sounds.getByRole('button', {name: 'Stop', exact: true}).click();
  await expect(status).toHaveText('Off');
  // With it, leaving stops the sound.
  await sounds.getByRole('checkbox', {name: 'Stop when I leave ZIGoals (another tab or app)', exact: true}).check();
  await sounds.getByRole('button', {name: 'Play', exact: true}).click();
  await expect(status).toHaveText('Playing Rain-like');
  await leave();
  await expect(status).toHaveText('Off');
  await back();
  await expect(status).toHaveText('Off');
});

journey('J120', 'Devices: Oura, Withings, Polar and Strava each say "Needs setup by ZIGoals"; nothing connects', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  const providers: string[] = [];
  page.on('request', r => { if (/ouraring|withings|polar\.com|strava/.test(r.url())) providers.push(r.url()); });
  await open(page, '/app/health?view=devices');
  const linked = page.getByRole('region', {name: 'Linked accounts'});
  await expect(linked.getByRole('listitem')).toHaveCount(4);
  for (const name of ['Oura', 'Withings', 'Polar', 'Strava']) await expect(linked.getByRole('listitem').filter({hasText: name}).locator('.devices-state')).toHaveText('Needs setup by ZIGoals');
  await expect(linked.getByRole('button')).toHaveCount(0);
  await expect(linked.getByRole('link')).toHaveCount(0);
  expect(providers, 'no request to a provider').toEqual([]);
});

journey('J121', 'Health\'s views in order with the keyboard; Enter and Space open them; focus stays visible', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/health');
  const nav = page.getByRole('navigation', {name: 'Health views'});
  const focused = () => page.evaluate(() => ({name: document.activeElement?.textContent ?? '', visible: !!document.activeElement?.matches(':focus-visible')}));
  await nav.getByRole('button', {name: 'Diary', exact: true}).click();
  const order = ['Diary'];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    const now = await focused();
    expect(now.visible, `focus is visible on ${now.name}`).toBe(true);
    order.push(now.name);
  }
  expect(order).toEqual(['Diary', 'Foods & recipes', 'Meals & planning', 'Weight', 'Measurements', 'Activity', 'Targets', 'Journal settings']);
  await page.keyboard.press('Enter');
  await expect(nav.getByRole('button', {name: 'Journal settings', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('form', {name: 'Health preferences'})).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect((await focused()).name).toBe('Targets');
  await page.keyboard.press('Space');
  await expect(nav.getByRole('button', {name: 'Targets', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('form', {name: 'Personal targets'})).toBeVisible();
  // After the last view, the journal's date comes next.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(dateControl(page).getByRole('button', {name: 'Previous day', exact: true})).toBeFocused();
});

journey('J124', 'a day with 50 diary entries: every meal lists its own, totals add up, removing and logging still work', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T12:00:00+02:00')});
  const foods = Array.from({length: 10}, (_, i) => [`item-${i}`, `Fictional pantry item ${i}`, 100 + 10 * i] as [string, string, number]);
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
  await seedHealth(page, pantry(foods, Array.from({length: 50}, (_, k) => [`item-${k % 10}`, '2026-10-14', meals[k % 4]!, 1] as [string, string, HealthDiaryEntry['meal'], number])));
  await open(page, '/app/health');
  for (const [name, count] of [['Breakfast', 13], ['Lunch', 13], ['Dinner', 12], ['Snacks', 12]] as const) await expect(meal(page, name).locator('.health-entry')).toHaveCount(count);
  // 5 × (100 + 110 + … + 190) = 7,250 kcal for the day; breakfast holds items 0, 4, 8, 2, 6, … = 1,820 kcal.
  const summary = page.getByRole('region', {name: 'Daily nutrition summary'});
  await expect(summary.locator('.health-gauge strong')).toHaveText('7,250');
  await expect(summary).toContainText('4 meal groups · 50 entries');
  await expect(meal(page, 'Breakfast').locator('.health-section-heading')).toContainText('1,820 kcal');
  await meal(page, 'Breakfast').locator('.health-entry').first().getByRole('button', {name: /^Remove /}).click();
  await expect(said(page)).toHaveText('Diary entry removed.');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toHaveCount(12);
  await expect(meal(page, 'Breakfast').locator('.health-section-heading')).toContainText('1,720 kcal');
  await logFood(j, 'Fictional pantry item 0 · food', '1');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toHaveCount(13);
  await expect(summary).toContainText('4 meal groups · 50 entries');
  await expect(summary.locator('.health-gauge strong')).toHaveText('7,250');
  // The last entry of the long day is corrected in place: item 7 (170 kcal) to two servings.
  await meal(page, 'Snacks').locator('.health-entry').last().getByRole('button', {name: /^Edit /}).click();
  const edit = meal(page, 'Snacks').getByRole('form', {name: 'Edit diary entry'});
  await edit.getByLabel('Servings', {exact: true}).fill('2');
  await edit.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect(said(page)).toHaveText('Diary entry updated.');
  await expect(summary.locator('.health-gauge strong')).toHaveText('7,420');
});

journey('J125', 'Health offline: water, a meal and a weight saved on the device; after reconnecting and a reload all three are there', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T12:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150]]));
  await open(page, '/app/health');
  await page.context().setOffline(true);
  await expect(offline(page)).toBeVisible();
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(page).locator('.health-water-total')).toHaveText('250 mL recorded');
  await logFood(j, 'Fictional oats · food', '1');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  await view(page, 'Weight');
  const weight = page.getByRole('form', {name: 'Weight entry'});
  await weight.getByLabel('Weight (kg)').fill('78.4');
  await weight.getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect(said(page)).toHaveText('Weight saved.');
  await page.context().setOffline(false);
  await expect(offline(page)).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(water(page).locator('.health-water-total')).toHaveText('250 mL recorded');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  await view(page, 'Weight');
  await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('78.4 kg');
});

journey('J126', 'Health\'s date picker: yesterday, last week by typing the date, then back to today', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T10:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150], ['yoghurt', 'Fictional yoghurt', 100]], [['oats', '2026-10-13', 'Breakfast', 1], ['yoghurt', '2026-10-07', 'Breakfast', 1]]));
  await open(page, '/app/health');
  const date = dateControl(page), eyebrow = page.getByRole('region', {name: 'Daily nutrition summary'}).locator('.health-summary-main .eyebrow');
  await expect(date.getByLabel('Journal date')).toHaveValue('2026-10-14');
  await expect(eyebrow).toHaveText('TODAY’S NOURISHMENT');
  await expect(meal(page, 'Breakfast')).toContainText('Nothing logged yet.');
  await date.getByRole('button', {name: 'Previous day', exact: true}).click();
  await expect(date.getByLabel('Journal date')).toHaveValue('2026-10-13');
  await expect(eyebrow).toHaveText('2026-10-13');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  await date.getByLabel('Journal date').fill('2026-10-07');
  await expect(eyebrow).toHaveText('2026-10-07');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional yoghurt');
  await expect(meal(page, 'Breakfast')).not.toContainText('Fictional oats');
  await date.getByRole('button', {name: 'Next day', exact: true}).click();
  await expect(date.getByLabel('Journal date')).toHaveValue('2026-10-08');
  await expect(meal(page, 'Breakfast')).toContainText('Nothing logged yet.');
  await date.getByRole('button', {name: 'Today', exact: true}).click();
  await expect(date.getByLabel('Journal date')).toHaveValue('2026-10-14');
  await expect(eyebrow).toHaveText('TODAY’S NOURISHMENT');
});

journey('J127', 'the diary at midnight: the page moves to the new day, a half-typed meal is kept and logged on the new day', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T23:58:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150], ['tea', 'Fictional tea', 5]], [['tea', '2026-10-14', 'Snacks', 1]]));
  await open(page, '/app/health');
  await expect(dateControl(page).getByLabel('Journal date')).toHaveValue('2026-10-14');
  const form = await mealLog(j);
  await form.getByLabel('Food or recipe').selectOption({label: 'Fictional oats · food'});
  await form.getByLabel('Servings', {exact: true}).fill('2');
  await page.clock.fastForward('03:00');
  await expect(dateControl(page).getByLabel('Journal date')).toHaveValue('2026-10-15');
  await expect(form.getByLabel('Servings', {exact: true})).toHaveValue('2');
  await expect(form).toContainText('Logging for 2026-10-15.');
  await form.getByRole('button', {name: 'Log to diary', exact: true}).click();
  await expect(said(page)).toHaveText('Meal logged.');
  expect(await todays(page, '2026-10-15')).toEqual([['Breakfast', 'Fictional oats', 2000]]);
  expect(await todays(page, '2026-10-14')).toEqual([['Snacks', 'Fictional tea', 1000]]);
  await dateControl(page).getByRole('button', {name: 'Previous day', exact: true}).click();
  await expect(meal(page, 'Snacks').locator('.health-entry')).toContainText('Fictional tea');
  await expect(meal(page, 'Breakfast')).toContainText('Nothing logged yet.');
});

journey('J128', 'the Health page\'s counters: no entry is a dash, not zero; taps add and take away; a counter of my own; kept after a reload', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T10:00:00+02:00')});
  await open(page, '/app/health');
  const counters = page.getByRole('region', {name: 'Every repetition counts.'});
  const pushups = counters.getByLabel('Push-ups today');
  await expect(pushups).toContainText('No entry today');
  await expect(counters.getByRole('button', {name: 'Decrease Push-ups', exact: true})).toBeDisabled();
  for (let i = 0; i < 3; i++) await counters.getByRole('button', {name: 'Increase Push-ups', exact: true}).click();
  await expect(pushups).toHaveText('3');
  await counters.getByRole('button', {name: 'Decrease Push-ups', exact: true}).click();
  await expect(pushups).toHaveText('2');
  await counters.getByRole('button', {name: '+ Add counter', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Add a counter'});
  await dialog.getByLabel('Counter name').fill('Fictional planks');
  await dialog.getByRole('radio', {name: 'Core', exact: true}).check();
  await dialog.getByRole('button', {name: 'Add counter', exact: true}).click();
  await expect(counters.locator('.exercise-counters-status')).toHaveText('Fictional planks counter added.');
  await counters.getByRole('button', {name: 'Increase Fictional planks', exact: true}).click();
  await expect(counters.getByLabel('Fictional planks today')).toHaveText('1');
  await page.reload();
  await ready(page);
  const again = page.getByRole('region', {name: 'Every repetition counts.'});
  await expect(again.getByLabel('Push-ups today')).toHaveText('2');
  await expect(again.getByLabel('Fictional planks today')).toHaveText('1');
  await expect(again.getByLabel('Squats today')).toContainText('No entry today');
  const days = ((await health(page)) as {exercise: {days: {counterId: string; date: string; count: number}[]}}).exercise.days;
  expect(days.find(d => d.counterId === 'health_counter-pushups')).toMatchObject({date: '2026-10-14', count: 2});
});

journey('J129', 'Health in America/New_York, then Asia/Tokyo: each day\'s entries stay on the day they were logged', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  // 23:30 on 14 October in New York is 12:30 on 15 October in Tokyo.
  await page.clock.install({time: new Date('2026-10-14T23:30:00-04:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150]]));
  await open(page, '/app/health');
  const zone = async (name: string, day: string) => {
    await view(page, 'Journal settings');
    const prefs = page.getByRole('form', {name: 'Health preferences'});
    await prefs.getByLabel('Journal timezone').fill(name);
    await prefs.getByRole('button', {name: 'Save journal preferences', exact: true}).click();
    await expect(said(page)).toHaveText('Journal preferences saved. Existing entry dates are unchanged.');
    await expect(dateControl(page).getByLabel('Journal date')).toHaveValue(day);
    await view(page, 'Diary');
  };
  await zone('America/New_York', '2026-10-14');
  await logFood(j, 'Fictional oats · food', '1');
  await zone('Asia/Tokyo', '2026-10-15');
  await expect(meal(page, 'Breakfast')).toContainText('Nothing logged yet.');
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(page).locator('.health-water-total')).toHaveText('250 mL recorded');
  await dateControl(page).getByRole('button', {name: 'Previous day', exact: true}).click();
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  await expect(water(page).locator('.health-water-total')).toHaveText('No water entries yet');
  await zone('America/New_York', '2026-10-14');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  const data = (await health(page)) as HealthData;
  expect(data.diary.map(e => e.date)).toEqual(['2026-10-14']);
  expect(data.daily!.water.map(w => w.date)).toEqual(['2026-10-15']);
});

journey('J130', 'Health consent withdrawn: ZIGi\'s Health gate closes again; my Health records stay as they were', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150]], [['oats', '2026-10-01', 'Breakfast', 1]]));
  const records = await page.evaluate(k => localStorage.getItem(k), HEALTH_STORAGE_KEY);
  // ZIGi connected the way that needs no key (a chat-app subscription): Settings → ZIGi → Connection.
  await open(page, '/app/settings#your-ai');
  await page.getByRole('button', {name: /^I only have a subscription/}).click();
  await page.getByRole('button', {name: /^Use my .+ subscription$/}).click();
  const privacy = page.getByRole('region', {name: 'Privacy & data', exact: true});
  const include = privacy.getByRole('switch', {name: 'Include Health', exact: true});
  await expect(include).toHaveAttribute('aria-checked', 'false');
  await page.getByText('Context pack for my AI', {exact: true}).click();
  const healthBox = page.locator('details.ai-pack').getByRole('checkbox', {name: /^Health\b/});
  await expect(healthBox).toBeDisabled();
  await expect(page.locator('details.ai-pack')).toContainText('Needs Include Health (below the page switches) and Health on Today first.');
  // The gate opens only with Health's page switch and "Include Health" both on.
  await privacy.getByRole('switch', {name: 'Health page data', exact: true}).click();
  await include.click();
  await expect(include).toHaveAttribute('aria-checked', 'true');
  await expect(healthBox).toBeEnabled();
  await expect(page.locator('details.ai-pack')).toContainText('Off unless you tick it.');
  // Withdrawn: the gate closes at once.
  await include.click();
  await expect(include).toHaveAttribute('aria-checked', 'false');
  await expect(healthBox).toBeDisabled();
  await expect(page.locator('details.ai-pack')).toContainText('Needs Include Health (below the page switches) and Health on Today first.');
  expect(await page.evaluate(k => localStorage.getItem(k), HEALTH_STORAGE_KEY)).toBe(records);
  await open(page, '/app/health?date=2026-10-01');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
});

journey('J133', 'Health in two tabs: each tab\'s water and meals show in the other; nothing is lost when both add at once', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T12:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150]]));
  await open(page, '/app/health');
  const other = await page.context().newPage();
  await open(other, '/app/health');
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(other).locator('.health-water-total')).toHaveText('250 mL recorded');
  await logFood({...j, page: other}, 'Fictional oats · food', '1');
  await expect(meal(page, 'Breakfast').locator('.health-entry')).toContainText('Fictional oats');
  await Promise.all([water(page).getByRole('button', {name: 'Add 500 mL', exact: true}).click(), water(other).getByRole('button', {name: 'Add 250 mL', exact: true}).click()]);
  for (const tab of [page, other]) await expect(water(tab).locator('.health-water-total')).toHaveText('1,000 mL recorded');
  const data = (await health(page)) as HealthData;
  expect(data.daily!.water.map(w => w.amountMilli).sort((a, b) => a - b)).toEqual([250_000, 250_000, 500_000]);
  expect(data.diary).toHaveLength(1);
  await other.close();
});

journey('J134', 'Health, Sleep and Meditation with reduced motion, then with Motion Off: nothing keeps moving, even after a save', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const still = async (path: string, mode: string) => { await open(page, path); await expect.poll(() => running(page), {message: `${path} (${mode})`, timeout: 4000}).toBe(0); };
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const path of ['/app/health', '/app/health?view=sleep', '/app/health?view=meditation']) await still(path, 'reduced motion');
  await open(page, '/app/health');
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(page).locator('.health-water-total')).toHaveText('250 mL recorded');
  await expect.poll(() => running(page), {message: 'after a save (reduced motion)', timeout: 4000}).toBe(0);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Appearance', exact: true}).getByRole('combobox', {name: /^Motion/}).selectOption('off');
  for (const path of ['/app/health', '/app/health?view=sleep', '/app/health?view=meditation']) await still(path, 'Motion Off');
  await open(page, '/app/health');
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(page).locator('.health-water-total')).toHaveText('500 mL recorded');
  await expect.poll(() => running(page), {message: 'after a save (Motion Off)', timeout: 4000}).toBe(0);
});

journey('J135', 'Health at 200 % zoom (720 px wide): the title, the date and the meals fit; a meal and water are logged', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 720, height: 450});
  await page.clock.install({time: new Date('2026-10-14T12:00:00+02:00')});
  await seedHealth(page, pantry([['oats', 'Fictional oats', 150]]));
  await open(page, '/app/health');
  const inside = async (box: {x: number; width: number} | null, what: string) => { expect(box, what).not.toBeNull(); expect(box!.x, what).toBeGreaterThanOrEqual(-0.5); expect(box!.x + box!.width, what).toBeLessThanOrEqual(720.5); };
  await inside(await page.getByRole('heading', {level: 1, name: 'A little care, every day.'}).boundingBox(), 'the title');
  await inside(await dateControl(page).getByLabel('Journal date').boundingBox(), 'the journal date');
  // At 720 px the phone layout applies (components/phone/use-phone-layout.ts): "Log a meal" is a sheet.
  await logFood({...j, phone: true}, 'Fictional oats · food', '1');
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(page).locator('.health-water-total')).toHaveText('250 mL recorded');
  for (const name of ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const) await inside(await meal(page, name).boundingBox(), `${name}`);
  await inside(await meal(page, 'Breakfast').locator('.health-entry').boundingBox(), 'the logged meal');
  await inside(await water(page).boundingBox(), 'the water card');
  await noSideways(page);
  await snap(j, 'J135', 'zoom-200');
});
