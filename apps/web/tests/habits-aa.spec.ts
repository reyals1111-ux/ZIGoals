import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, saveHabitTimezone, type HabitData, type HabitInput} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HABIT_EXTRAS_KEY, ROUTINE_RUN_KEY} from '../lib/aa-device-keys';
import {isPhone} from './phone-nav';

/**
 * Session AA-Local Part 1 (H1–H6, H8): time-of-day sections that open by the clock and remember a fold, the timer's
 * Finish logging today's check-in and surviving a reload, days since for a quit habit with the money-saved estimate, a
 * skip with a reason and a note with a mood shown in the history, a routine from a template played to its finish screen,
 * an area set on a card and the area filter, and the year view's accessible summary. Fictional habits; the clock is fixed.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07';
const ID = {stretch: '11111111-1111-4111-8111-111111111111', read: '22222222-2222-4222-8222-222222222222', snacks: '33333333-3333-4333-8333-333333333333', walk: '44444444-4444-4444-8444-444444444444'};
const at = (day: string, clock = '06:00') => new Date(`${day}T${clock}:00.000Z`);
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels');
  d = createHabit(d, input('Fictional stretch', {timeOfDay: 'morning'}), at('2026-09-01'), ID.stretch);
  d = createHabit(d, input('Fictional read', {timeOfDay: 'evening', measurement: {kind: 'duration', unit: 'minutes'}, target: 1}), at('2026-09-01'), ID.read);
  d = createHabit(d, input('Fictional late snacks', {type: 'quit', target: 0, measurement: {kind: 'count', unit: 'times'}}), at('2026-09-01'), ID.snacks);
  d = createHabit(d, input('Fictional walk', {timeOfDay: 'afternoon'}), at('2026-09-01'), ID.walk);
  for (const day of ['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-02', '2026-10-03']) d = logHabitValue(d, ID.stretch, day, 1, {mode: 'set'}, at(day, '06:30'));
  d = logHabitValue(d, ID.snacks, '2026-09-30', 1, {mode: 'set'}, at('2026-09-30', '22:00'));
  return d;
}
async function seed(page: Page, clock = '08:00', extra: Record<string, string> = {}) {
  await page.clock.install({time: new Date(`${TODAY}T${clock}:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[HABITS_KEY]: JSON.stringify(habits()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), ...extra});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const card = (page: Page, title: string) => page.getByRole('article', {name: title, exact: true});
const section = (page: Page, name: string) => page.locator('details.habit-section').filter({has: page.locator('summary.habit-section-summary').filter({hasText: name})});
/** Opens a folded time-of-day section (only the clock's section is open by default). */
async function openSection(page: Page, name: string) { const s = section(page, name); if ((await s.getAttribute('open')) === null) await s.locator('summary.habit-section-summary').click(); await expect(s).toHaveAttribute('open', ''); }

test('H1: every section is open, the clock\'s section is marked current, a fold is remembered on this device', async ({page}) => {
  await seed(page, '08:00'); // 10:00 in Brussels: morning
  await page.goto('/app/habits');
  // ADR-022 B49 (deliberate): all four sections open; the clock's section carries data-now.
  await expect(section(page, 'Morning')).toHaveAttribute('open', '');
  await expect(section(page, 'Morning')).toHaveAttribute('data-now', 'true');
  await expect(section(page, 'Afternoon')).toHaveAttribute('open', '');
  await expect(section(page, 'Afternoon')).not.toHaveAttribute('data-now', 'true');
  await expect(section(page, 'Morning').getByRole('article', {name: 'Fictional stretch'})).toBeVisible();
  await expect(section(page, 'Morning').locator('.habit-section-count [aria-hidden]')).toHaveText('0 / 1'); // the visible figure; the hidden text reads "0 of 1 due habits complete"
  await expect(section(page, 'Morning').locator('.habit-section-count .sr-only')).toHaveText('0 of 1 due habits complete');
  await section(page, 'Morning').locator('summary.habit-section-summary').click();
  await expect(section(page, 'Morning')).not.toHaveAttribute('open', '');
  await expect.poll(() => stored(page, HABIT_EXTRAS_KEY)).toMatchObject({version: 1, folds: {morning: true}});
  await page.reload();
  await expect(section(page, 'Morning')).not.toHaveAttribute('open', '');
  // Today's widget groups the due habits the same way (compact).
  await page.goto('/app');
  const widget = page.getByRole('region', {name: 'Small steps, steady rhythm.'}).first();
  await expect(widget.getByRole('heading', {name: 'Morning', exact: true})).toBeVisible();
  await expect(widget.getByRole('heading', {name: 'Anytime', exact: true})).toBeVisible();
});

test('H2: Finish logs the timer into today\'s check-in; the timer survives a reload from its stored start', async ({page}) => {
  await seed(page, '18:00'); // evening
  await page.goto('/app/habits');
  const read = card(page, 'Fictional read');
  await expect(section(page, 'Evening')).toHaveAttribute('open', ''); // 20:00 in Brussels
  await read.getByRole('button', {name: 'Start timer', exact: true}).click();
  await expect(read.locator('.habit-timer-chip')).toHaveAttribute('data-running', 'true');
  await page.clock.runFor(90_000);
  await page.reload();
  await expect(card(page, 'Fictional read').locator('.habit-timer-chip strong')).toHaveText(/^1:3\d$/);
  await card(page, 'Fictional read').getByRole('button', {name: 'Log reviewed duration', exact: true}).click();
  await expect(card(page, 'Fictional read').getByText('Complete', {exact: true})).toBeVisible();
  const data = await stored(page, HABITS_KEY) as HabitData;
  const habit = data.habits.find(h => h.id === ID.read)!;
  expect(habit.timer).toBeUndefined(); expect(habit.timerReceipts).toHaveLength(1); expect(habit.timerReceipts![0]!.status).toBe('logged');
  expect(habit.entries.find(e => e.date === TODAY)!.count).toBeGreaterThanOrEqual(1.5);
});

test('H3: a quit habit shows days since, the longest run, the slip calendar and a money-saved estimate from the person\'s own cost', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await openSection(page, 'Anytime'); // the morning section is the one open at 10:00
  const snacks = card(page, 'Fictional late snacks');
  const quit = snacks.getByRole('region', {name: 'Days since for Fictional late snacks'});
  await expect(quit.locator('.habit-quit-days')).toHaveText('7');
  await expect(quit.getByText('since September 30')).toBeVisible();
  await expect(quit.getByText('29 days')).toBeVisible(); // 1 Sep → 29 Sep
  await quit.getByRole('button', {name: 'Set a cost per day', exact: true}).click();
  await quit.getByRole('textbox', {name: 'Cost per day'}).fill('3.50');
  await quit.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(quit.getByText('€24.50')).toBeVisible();
  await expect(quit.getByText('estimate', {exact: true})).toBeVisible();
  await expect.poll(() => stored(page, HABIT_EXTRAS_KEY)).toMatchObject({quitCost: {[ID.snacks]: {perDay: 3.5, currency: 'EUR'}}});
  await quit.getByRole('button', {name: 'Previous month', exact: true}).click();
  await expect(quit.locator('.habit-quit-slip')).toHaveCount(1);
  await expect(quit.locator('.habit-quit-slip')).toHaveAttribute('title', '2026-09-30: a slip');
});

test('H4: skip today with a reason keeps the streak; a note and mood save on today\'s check-in; both show in the history', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  const stretch = card(page, 'Fictional stretch');
  await stretch.getByRole('button', {name: 'Skip today…', exact: true}).click();
  await stretch.getByRole('button', {name: 'Travelling', exact: true}).click();
  await stretch.getByRole('button', {name: 'Skip today', exact: true}).click();
  await expect(stretch.getByText('Skipped today · Travelling. Your streak keeps its place.')).toBeVisible();
  let data = await stored(page, HABITS_KEY) as HabitData;
  expect(data.habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === TODAY)).toMatchObject({disposition: 'skipped', note: 'Skipped · Travelling'});
  await openSection(page, 'Afternoon');
  const walk = card(page, 'Fictional walk');
  await walk.getByRole('button', {name: 'Add a note or mood', exact: true}).click();
  await walk.getByRole('button', {name: 'Calm', exact: true}).click();
  await walk.getByLabel('Note for today').fill('Fictional note: a slow one along the river.');
  await walk.getByRole('button', {name: 'Save note', exact: true}).click();
  await expect(walk.getByText('Note saved for today.')).toBeVisible();
  data = await stored(page, HABITS_KEY) as HabitData;
  expect(data.habits.find(h => h.id === ID.walk)!.entries.find(e => e.date === TODAY)).toMatchObject({mood: 'calm', note: 'Fictional note: a slow one along the river.', count: 0});
  await walk.getByText('History & reflection').click();
  await expect(walk.getByRole('heading', {name: 'Notes, moods and skips'})).toBeVisible();
  await expect(walk.getByText('Fictional note: a slow one along the river.').last()).toBeVisible();
});

test('H5: a routine from a template is played step by step and ends on the finish screen; the run is on this device', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'Add routine', exact: true}).nth(2).click(); // Workout: three steps
  await expect(page.getByRole('status').filter({hasText: 'Workout routine ready: 3 new habits.'})).toBeVisible();
  await page.getByRole('button', {name: 'Start', exact: true}).click();
  const player = page.getByRole('dialog', {name: 'Routine'});
  await expect(player.getByRole('heading', {name: 'Warm up'})).toBeVisible();
  await expect(player.getByRole('timer')).toBeVisible();
  await player.getByRole('button', {name: 'Done · next', exact: true}).click();
  await expect(player.getByRole('heading', {name: 'Exercise'})).toBeVisible();
  await expect.poll(() => stored(page, ROUTINE_RUN_KEY)).toMatchObject({version: 1, run: {step: 1, day: TODAY}});
  await player.getByRole('button', {name: 'Skip', exact: true}).click();
  await player.getByRole('button', {name: 'Done · finish', exact: true}).click();
  await expect(player.getByRole('heading', {name: 'Well done.'})).toBeVisible();
  await expect(player.getByText('2 of 3 steps done, 1 skipped')).toBeVisible();
  await player.getByRole('button', {name: 'Close', exact: true}).click();
  await expect(player).toBeHidden();
  expect(await stored(page, ROUTINE_RUN_KEY)).toMatchObject({run: null});
  const data = await stored(page, HABITS_KEY) as HabitData;
  expect(data.habits.find(h => h.title === 'Warm up')!.entries.find(e => e.date === TODAY)!.count).toBeGreaterThanOrEqual(5);
  expect(data.habits.find(h => h.title === 'Exercise')!.entries.find(e => e.date === TODAY)).toBeUndefined();
});

test('H6: an area set on a card is kept by habit id on this device and the area filter appears', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'All', exact: true}).click();
  await openSection(page, 'Afternoon');
  const walk = card(page, 'Fictional walk');
  await walk.getByRole('button', {name: 'Area for Fictional walk: none'}).click();
  await walk.getByLabel('Area for Fictional walk').selectOption('health');
  await expect(walk.getByRole('button', {name: 'Area for Fictional walk: Health'})).toBeVisible();
  await expect.poll(() => stored(page, HABIT_EXTRAS_KEY)).toMatchObject({areas: {[ID.walk]: 'health'}});
  const bar = page.getByRole('group', {name: 'Filter by area'});
  await bar.getByRole('button', {name: 'Health', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional walk'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Fictional stretch'})).toBeHidden();
});

test('H8: the year view opens on use with a readable summary per habit and for every habit', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'Open the year view', exact: true}).click();
  const year = page.getByRole('region', {name: 'Year view'});
  await expect(year.getByRole('status')).toHaveText('2026: 0 of 37 days with every scheduled habit complete.');
  await year.getByRole('combobox').selectOption(ID.stretch);
  await expect(year.getByRole('status')).toHaveText('Fictional stretch, 2026: 5 of 37 scheduled days complete, 0 partial, 0 skipped, 31 missed.');
  await expect(year.getByRole('img', {name: /Fictional stretch, 2026/})).toBeVisible();
  if (!(await isPhone(page))) await expect(year.locator('.habit-year-months span').first()).toHaveText('Jan');
});
