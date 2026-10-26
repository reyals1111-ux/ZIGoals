import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, saveHabitTimezone, type HabitData, type HabitInput} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {GAME_KEY} from '../lib/aa-device-keys';
import {CELEBRATIONS_KEY} from '../lib/w-device-keys';

/**
 * Session AA-Local Part 2 (H7, S10): the game layer is off by default and shows nothing; on, the Journey page shows the
 * level from derived XP, three quests, badges and the path; a check-in raises the XP and its Undo lowers it (nothing
 * stored but the switch); a level reached celebrates once; a freeze repairs a missed day through the journal. Fictional
 * habits; the clock is fixed.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07';
const ID = {stretch: '11111111-1111-4111-8111-111111111111', read: '22222222-2222-4222-8222-222222222222'};
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels');
  d = createHabit(d, input('Fictional stretch'), new Date('2026-09-01T06:00:00Z'), ID.stretch);
  d = createHabit(d, input('Fictional read', {timeOfDay: 'evening'}), new Date('2026-09-01T06:00:00Z'), ID.read);
  // Nineteen days in a row up to 5 October: 190 XP (level 1 ends at 200), a seven-day streak (one freeze); 6 October missed.
  for (let i = 0; i < 19; i++) { const day = new Date(Date.parse('2026-09-17T12:00:00Z') + i * 86_400_000).toISOString().slice(0, 10); d = logHabitValue(d, ID.stretch, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); }
  return d;
}
async function seed(page: Page, game: Record<string, unknown> | null) {
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[HABITS_KEY]: JSON.stringify(habits()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), ...(game ? {[GAME_KEY]: JSON.stringify(game)} : {})});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test('off by default: the Journey page offers the switch and nothing else; Habits shows no progress card; the switch writes only its key', async ({page}) => {
  await seed(page, null);
  await page.goto('/app/habits');
  await expect(page.getByRole('heading', {name: 'Find your daily cadence.'})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Your progress'})).toHaveCount(0);
  await page.goto('/app/journey');
  await expect(page.getByRole('heading', {name: 'The game layer is off.'})).toBeVisible();
  await expect(page.getByText('Quests', {exact: true})).toHaveCount(0);
  await page.getByRole('switch', {name: 'Game layer'}).check();
  await expect(page.getByRole('heading', {name: 'Quests', exact: true})).toBeVisible();
  await expect.poll(() => stored(page, GAME_KEY)).toMatchObject({version: 1, enabled: true});
  expect(await stored(page, HABITS_KEY)).toEqual(habits()); // nothing else written
});

test('on: the level is derived from the records, three quests, badges and the path show; a check-in raises XP and its Undo lowers it', async ({page}) => {
  await seed(page, {version: 1, enabled: true, levelSeen: 1, badgesSeen: {'first-step': TODAY, 'first-week': TODAY, 'streak-7': TODAY}});
  await page.goto('/app/journey');
  const level = page.getByRole('img', {name: /^Level 1, Spark: 190 of 200 XP to level 2$/});
  await expect(level).toBeVisible();
  await expect(page.getByRole('list').filter({has: page.getByText('of 1', {exact: false})}).first()).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Quests', exact: true}).locator('..').getByRole('listitem')).toHaveCount(3);
  await expect(page.getByLabel('First step: earned')).toBeVisible();
  await expect(page.getByLabel('Seven in a row: earned')).toBeVisible();
  await expect(page.getByLabel('Thirty in a row: not yet')).toBeVisible();
  await expect(page.getByText('You are here')).toBeVisible();
  // A check-in on Habits: 190 → 200 XP, level 2, celebrated once; Undo takes the XP back.
  await page.goto('/app/habits');
  await page.getByRole('region', {name: 'Your progress'}).getByText('Lv 1').waitFor();
  await page.getByRole('button', {name: 'Complete Fictional stretch', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Level 2 · Ember'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Every check-in and log you made brought you here.')).toBeVisible();
  await dialog.getByRole('button', {name: 'Lovely', exact: true}).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => stored(page, CELEBRATIONS_KEY)).toMatchObject({seen: {'level:2': TODAY}});
  await expect(page.getByRole('region', {name: 'Your progress'}).getByText('Lv 2')).toBeVisible();
  await page.getByRole('button', {name: 'Undo completion for Fictional stretch', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Your progress'}).getByText('Lv 1')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', {name: 'Level 2 · Ember'})).toHaveCount(0); // celebrated once, never again
});

test('a freeze earned by a seven-day streak repairs one missed day of the last week through the journal', async ({page}) => {
  await seed(page, {version: 1, enabled: true, levelSeen: 1, badgesSeen: {'first-step': TODAY, 'first-week': TODAY, 'streak-7': TODAY}});
  await page.goto('/app/journey');
  const freezes = page.getByRole('region', {name: 'Freezes'});
  await expect(freezes.getByText(/You have 2 freezes/)).toBeVisible(); // a 19-day streak: two sevens
  await freezes.getByRole('button', {name: 'Use a freeze', exact: true}).first().click();
  // Session AH (HA7): it asks first, saying what it does and what is left; nothing is written before.
  const ask = freezes.getByRole('alertdialog');
  await expect(ask).toContainText('You will have 1 left.');
  expect((await stored(page, HABITS_KEY) as HabitData).habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === '2026-10-06')).toBeUndefined();
  await ask.getByRole('button', {name: 'Use a freeze', exact: true}).click();
  await expect(freezes.getByText(/Freeze used: Oct 6 now counts as a rest day/)).toBeVisible();
  const data = await stored(page, HABITS_KEY) as HabitData;
  expect(data.habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === '2026-10-06')).toMatchObject({disposition: 'skipped', note: 'Streak freeze'});
  await expect(freezes.getByText(/You have 1 freeze:/)).toBeVisible();
});
