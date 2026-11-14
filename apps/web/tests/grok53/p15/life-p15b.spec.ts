import {expect, test, type Page} from '@playwright/test';
import {createHabit as habitWith, emptyHabitData, HABITS_KEY, type HabitInput} from '../../../lib/habits';
import {createEmptyHealth, HEALTH_STORAGE_KEY, quickLogFood} from '../../../lib/health';
import {FASTING_KEY} from '../../../lib/fasting/schema';
import {HABIT_EXTRAS_KEY} from '../../../lib/aa-device-keys';
import {freshHealth, openHealth} from '../health/al-health-helpers';
import {offline, open, hydrated} from '../l3-helpers';
import {openModule, project, seedGoals, stored} from '../goals/goal-fixtures';
import {openSettings} from '../../settings-open';

/**
 * Session AL Part 15, lane P15-B (Life: Health, Habits, Today, Goals): the items built in this part, each from a fresh
 * profile with fictional data, every /api request answered 503. Desktop 1280, Europe/Brussels, en-GB, the clock on
 * Sun 8 Nov 2026 at 19:30 local (outside the default quiet hours' start, after a dinner time).
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
const NOW = '2026-11-08T18:30:00.000Z', DAY = '2026-11-08';
const ID = '6b2d1f0e-15b0-4c4e-9d0b-1c5a2f15b001';
const habit = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Fictional morning routine', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1, ...extra} as HabitInput);
async function seed(page: Page, records: Record<string, unknown>) {
  await offline(page);
  await page.clock.install({time: new Date(NOW)});
  await openSettings(page);
  await page.evaluate(records => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    for (const [k, v] of Object.entries(records)) localStorage.setItem(k, JSON.stringify(v));
  }, records);
}
const read = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
async function details(page: Page, title: string) {
  const card = page.getByRole('article', {name: title, exact: true});
  await card.getByLabel(`Details for ${title}`, {exact: true}).click();
  return card;
}

test('AL-COMPETITOR-GAP-105: a checklist inside a habit; ticking the last step checks the yes/no habit in for today', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habitWith(emptyHabitData(), habit(), new Date('2026-11-01T08:00:00Z'), ID)});
  await open(page, '/app/habits');
  const card = await details(page, 'Fictional morning routine');
  await card.getByRole('button', {name: 'Add the checklist of Fictional morning routine', exact: true}).click();
  await card.getByLabel(/Steps, one per line/).fill('Make the bed\n- Stretch\n\nGlass of water');
  await card.getByRole('button', {name: 'Save checklist', exact: true}).click();
  const steps = card.getByRole('group', {name: 'Steps of Fictional morning routine today'});
  await expect(steps.getByRole('checkbox')).toHaveCount(3);
  await expect(steps).toContainText('0 of 3 steps today · the last tick checks the habit in');
  await steps.getByRole('checkbox', {name: 'Make the bed'}).check();
  await steps.getByRole('checkbox', {name: 'Stretch'}).check();
  await expect(steps).toContainText('2 of 3 steps today');
  expect((await read(page, HABITS_KEY)).habits[0].entries.filter((e: {date: string}) => e.date === DAY)).toHaveLength(0);
  await steps.getByRole('checkbox', {name: 'Glass of water'}).check();
  await expect(card.locator('.habit-checklist-said').first()).toHaveText('All 3 steps done: Fictional morning routine is checked in for today.');
  expect(await card.locator('.habit-checklist-said[role]').count()).toBe(0);
  await expect(steps).toContainText('All 3 steps done today');
  await expect.poll(async () => (await read(page, HABITS_KEY)).habits[0].entries.filter((e: {date: string; disposition: string}) => e.date === DAY && e.disposition === 'logged').length).toBe(1);
  // Kept in the habit extras, ticks for today only.
  const extras = await read(page, HABIT_EXTRAS_KEY);
  expect(extras.checklists[ID].items.map((i: {text: string}) => i.text)).toEqual(['Make the bed', 'Stretch', 'Glass of water']);
  expect(extras.checklists[ID].day).toBe(DAY);
  // The next day starts with every step open.
  await page.clock.setSystemTime(new Date('2026-11-09T08:00:00.000Z'));
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('group', {name: 'Steps of Fictional morning routine today'})).toContainText('0 of 3 steps today');
});

test('AL-COMPETITOR-GAP-100: a habit keeps its own why, shown on its card; Habits link to the calendar export (GAP-109)', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habitWith(emptyHabitData(), habit({title: 'Fictional walk'}), new Date('2026-11-01T08:00:00Z'), ID)});
  await open(page, '/app/habits');
  const card = await details(page, 'Fictional walk');
  await card.getByRole('button', {name: 'Add why Fictional walk matters', exact: true}).click();
  await card.getByLabel('Why it matters to you (optional)').fill('So I have energy for the kids');
  await card.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(card.locator('.habit-why')).toHaveText('Why: So I have energy for the kids');
  await expect(card.locator('.habit-intention-why')).toContainText('Why: So I have energy for the kids');
  expect((await read(page, HABIT_EXTRAS_KEY)).intentions[ID]).toEqual({why: 'So I have energy for the kids'});
  // GAP-109: the calendar link opens the Agenda's .ics export.
  const link = card.getByRole('link', {name: 'Put your habits in a calendar app'});
  await expect(link).toHaveAttribute('href', '/app/agenda?export=1');
  await link.click();
  await expect(page.getByRole('group', {name: 'Export choices'})).toBeVisible();
  await expect(page.getByRole('group', {name: 'Export choices'}).locator('label[data-pillar="habit"]')).toContainText('Habits');
});

test('AL-COMPETITOR-GAP-121: a time habit takes "1:30" and "1 h 15 min", read into its own unit', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habitWith(emptyHabitData(), habit({title: 'Fictional practice', measurement: {kind: 'duration', unit: 'minutes'}, target: 120}), new Date('2026-11-01T08:00:00Z'), ID)});
  await open(page, '/app/habits');
  const card = await details(page, 'Fictional practice');
  await card.getByLabel('Fictional practice: set or add a value').click();
  await expect(card.getByText('Minutes, or a time like 1:30 or 1 h 30 min.')).toBeVisible();
  const value = card.getByLabel('Value for Fictional practice', {exact: true});
  await value.fill('1:30');
  await card.getByRole('button', {name: 'Set value', exact: true}).click();
  await expect.poll(async () => (await read(page, HABITS_KEY)).habits[0].entries.find((e: {date: string}) => e.date === DAY)?.count).toBe(90);
  await value.fill('1 h 15 min');
  await card.getByRole('button', {name: 'Set value', exact: true}).click();
  await expect.poll(async () => (await read(page, HABITS_KEY)).habits[0].entries.find((e: {date: string}) => e.date === DAY)?.count).toBe(75);
  await value.fill('1:75');
  await card.getByRole('button', {name: 'Set value', exact: true}).click();
  await expect(card.getByRole('alert')).toContainText('Minutes after the colon go from 00 to 59');
});

test('AL-COMPETITOR-GAP-049/067/081: after Dinner is in the Diary, Today asks to start a fast; one tap starts the person\'s own target', async ({page}) => {
  await page.clock.install({time: new Date(NOW)});
  const health = quickLogFood(createEmptyHealth(), {foodId: 'health_food-p15b-0001', logId: 'health_diary-p15b-0001', name: 'Fictional soup', servingGrams: 300, nutrients: {kcal: 250, proteinMg: null, carbsMg: null, fatMg: null}, date: DAY, meal: 'Dinner'}, '2026-11-08T18:10:00.000Z');
  await freshHealth(page, health);
  await openHealth(page);
  const fasting = page.locator('#fasting');
  const ask = fasting.getByLabel('Ask on Today to start a fast after I log');
  await expect(ask).toHaveValue('');
  await ask.selectOption('Dinner');
  await expect(fasting.getByText('Today asks whether to start a fast once Dinner is in your Diary.')).toBeVisible();
  await open(page, '/app');
  const card = page.getByRole('article', {name: 'Reminder: start a fast after Dinner'});
  await expect(card).toContainText('Dinner is in your Diary today (logged 19:10).');
  await card.getByRole('button', {name: 'Start a 16 h fast', exact: true}).click();
  await expect(card).toHaveCount(0);
  // With the sync writes on, fasts live in Health (`fasting`) and the device key is not written (mo-025-past-fast.spec.ts).
  const sessions = (await read(page, FASTING_KEY))?.sessions ?? (await read(page, HEALTH_STORAGE_KEY))?.fasting?.sessions ?? [];
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({endedAt: null, targetHours: 16, timeZone: 'Europe/Brussels'});
  // "Not today" on another day's ask is remembered for that day only (unit-tested); the switch can be turned off.
  await openHealth(page);
  await page.locator('#fasting').getByLabel('Ask on Today to start a fast after I log').selectOption('');
  await expect(page.locator('#fasting').getByText('Today no longer asks to start a fast.')).toBeVisible();
});

test('AL-COMPETITOR-GAP-114: milestones move by a handle (keyboard ↑/↓ or drag) and a new one goes in after any step', async ({page}) => {
  await seedGoals(page, [project('95', ['Plan', 'Build', 'Ship'], 0)], '/app/goals/tracked/95');
  const milestones = await openModule(page, 'milestones');
  const grip = milestones.getByRole('button', {name: 'Reorder Ship, position 3 of 3: press ↑ or ↓, or drag'});
  await grip.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('status').filter({hasText: '“Ship” moved to position 2 of 3.'})).toBeAttached();
  await expect.poll(async () => (await stored(page)).goals[0]!.milestones.map(m => m.title)).toEqual(['Plan', 'Ship', 'Build']);
  // A plain press, move and release with the rows in view (dragTo can scroll between press and move; l5-fourth-pass.spec).
  await milestones.locator('.goal-milestone-list').evaluate(el => el.scrollIntoView({block: 'center'}));
  const from = (await milestones.getByRole('button', {name: /^Reorder Build, position 3 of 3/}).boundingBox())!, to = (await milestones.locator('.goal-milestone-row').filter({hasText: 'Plan'}).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 60, to.y + to.height / 2, {steps: 12});
  await page.mouse.up();
  await expect.poll(async () => (await stored(page)).goals[0]!.milestones.map(m => m.title)).toEqual(['Build', 'Plan', 'Ship']);
  const add = milestones.getByRole('form', {name: 'Add a milestone'});
  await add.getByLabel('New milestone').fill('Test');
  await add.getByLabel('Place').selectOption({label: 'After “Build”'});
  await add.getByRole('button', {name: 'Add milestone'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Milestone added: “Test”, after “Build”.'})).toBeAttached();
  await expect.poll(async () => (await stored(page)).goals[0]!.milestones.map(m => m.title)).toEqual(['Build', 'Test', 'Plan', 'Ship']);
});

test('AL-COMPETITOR-GAP-118: the goal wizard offers the fourth kind, Keep an average, and habits', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  const more = page.locator('.goal-type-more');
  await expect(more).toContainText('Want to keep a daily average instead, like sleep, steps or screen time?');
  await more.getByRole('link', {name: 'Keep an average'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/average\/new$/);
  await expect(page.locator('main h1').first()).toBeVisible();
});
