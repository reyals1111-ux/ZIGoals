import {expect, type Page} from '@playwright/test';
import {journey, open, ready, snap, type Journey} from './kit';

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
