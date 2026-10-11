import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, saveHabitTimezone, type HabitData} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {CELEBRATIONS_KEY, W_REMINDERS_KEY} from '../lib/w-device-keys';
import {closeFormSheet, isPhone} from './phone-nav';

// Session W Part 10: habit ideas, stacks shown together with a chained reminder, challenges with a calm one-time end,
// and a habit's patterns. Fictional habits; the clock is fixed in Brussels.
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07';
const ID = {bed: '11111111-1111-4111-8111-111111111111', water: '22222222-2222-4222-8222-222222222222', walk: '33333333-3333-4333-8333-333333333333'};
const at = (day: string, clock = '06:00') => new Date(`${day}T${clock}:00.000Z`);
function habits(): HabitData {
  let d = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels');
  const make = (id: string, title: string, day: string, extra: Record<string, unknown> = {}) => { d = createHabit(d, {title, category: 'Home', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}, ...extra} as never, at(day), id); };
  make(ID.bed, 'Fictional make the bed', '2026-09-01');
  make(ID.water, 'Fictional drink water', '2026-09-01', {stackAfterId: ID.bed});
  make(ID.walk, 'Fictional walk', '2026-09-28', {endCondition: {kind: 'date', date: '2026-10-04'}});
  for (const day of ['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-02', '2026-10-03']) d = logHabitValue(d, ID.walk, day, 1, {mode: 'set'}, at(day, '06:30'));
  for (const day of ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06']) d = logHabitValue(d, ID.bed, day, 1, {mode: 'set'}, at(day, '05:20'));
  return d;
}
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[HABITS_KEY]: JSON.stringify(habits()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), ...extra});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const card = (page: Page, title: string) => page.getByRole('article', {name: title, exact: true});

test('habit ideas: one tap adds a complete habit, or the same as a 30-day challenge; an idea already there says so', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'Habit ideas', exact: true}).click();
  const ideas = page.getByRole('region', {name: 'Habit ideas'});
  await ideas.getByRole('button', {name: 'Sleep', exact: true}).click();
  await ideas.getByRole('button', {name: 'Add Read before sleep', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Read before sleep added.'})).toBeVisible();
  if (await isPhone(page)) { await closeFormSheet(page); await page.getByRole('button', {name: 'Habit ideas', exact: true}).click(); await ideas.getByRole('button', {name: 'Sleep', exact: true}).click(); }
  await expect(ideas.getByText('Already in your habits')).toHaveCount(1);
  await ideas.getByRole('button', {name: 'Add Wind down without screens as a 30-day challenge', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Wind down without screens added as a 30-day challenge, ending 2026-11-05.'})).toBeVisible();
  await closeFormSheet(page);
  await expect(card(page, 'Wind down without screens')).toContainText('Challenge · day 1 of 30');
  const saved = (await stored(page, HABITS_KEY)) as HabitData;
  expect(saved.habits.find(h => h.title === 'Wind down without screens')?.endCondition).toEqual({kind: 'date', date: '2026-11-05'});
});

test('your stacks, together; a chained reminder shows on Today once the habit before is done, and can wait for tomorrow', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  const stacks = page.getByRole('region', {name: 'Your stacks'});
  await expect(stacks.getByRole('list', {name: 'Stack starting with Fictional make the bed'}).getByRole('listitem')).toHaveCount(2);
  await stacks.getByRole('checkbox', {name: 'Remind me after Fictional make the bed'}).check();
  expect((await stored(page, W_REMINDERS_KEY)).chained).toEqual({[ID.water]: true});
  await page.goto('/app');
  await expect(page.getByRole('article', {name: /next in your stack/})).toHaveCount(0);
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [HABITS_KEY, JSON.stringify(logHabitValue(habits(), ID.bed, TODAY, 1, {mode: 'set'}, at(TODAY)))]);
  await page.reload();
  const reminder = page.getByRole('article', {name: 'Reminder: next in your stack, Fictional drink water'});
  await expect(reminder).toContainText('After Fictional make the bed, which is done today.');
  await reminder.getByRole('button', {name: 'Not today', exact: true}).click();
  await expect(reminder).toHaveCount(0);
  expect((await stored(page, W_REMINDERS_KEY)).dismissed).toEqual({[`chained:${ID.water}`]: TODAY});
});

test('a finished challenge: one calm note in your own numbers, once on this device; a new challenge from the card', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'All', exact: true}).click();
  const walk = card(page, 'Fictional walk');
  const note = walk.getByRole('group', {name: 'Fictional walk challenge ended'});
  await expect(note).toContainText('Your 7-day Fictional walk challenge ended on 2026-10-04: done on 5 of 7 scheduled days.');
  await note.getByRole('button', {name: 'Let it rest', exact: true}).click();
  await expect(note).toHaveCount(0);
  expect(Object.keys((await stored(page, CELEBRATIONS_KEY)).seen)).toEqual([`challenge:${ID.walk}:2026-10-04`]);
  await page.reload();
  await page.getByRole('button', {name: 'All', exact: true}).click();
  await expect(card(page, 'Fictional walk').getByRole('group', {name: 'Fictional walk challenge ended'})).toHaveCount(0);
  const bed = card(page, 'Fictional make the bed');
  await bed.locator('summary', {hasText: 'Challenge'}).click();
  await bed.getByRole('textbox', {name: 'Days', exact: true}).fill('14');
  await bed.getByRole('button', {name: 'Start a challenge', exact: true}).click();
  await expect(bed.getByRole('status')).toContainText('Challenge started: 14 days from today.');
  await expect(bed).toContainText('Challenge · day 1 of 14');
});

test('a habit\'s patterns: by weekday and by week over 12 weeks, and when check-ins are usually saved', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  const bed = card(page, 'Fictional make the bed');
  await bed.locator('summary', {hasText: 'Consistency & trends'}).click();
  const patterns = bed.locator('.habit-patterns');
  await expect(patterns.getByRole('heading', {name: 'By weekday · last 12 weeks'})).toBeVisible();
  await expect(patterns.locator('.habit-weekdays li')).toHaveCount(7);
  await expect(patterns).toContainText('Check-ins are usually saved around 07:15');
  await patterns.locator('summary', {hasText: 'The weeks as a table'}).click();
  await expect(patterns.getByRole('table')).toContainText('Week of');
  if (await isPhone(page)) expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
