import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../lib/health';
import {HABITS_KEY, createHabit, emptyHabitData} from '../lib/habits';
import {emptySleep, type Sleep} from '../lib/sleep/schema';
import {saveNight, startNight} from '../lib/sleep/engine';
import {addDays, instantAt} from '../lib/zone-time';
import {withHealthGroup} from '../lib/vault/w-homes';
import {W_REMINDERS_KEY} from '../lib/w-device-keys';
import {isPhone, openTodayWidgets} from './phone-nav';

// Session W Part 4: Sleep, a view of Health (/app/health?view=sleep). Nights are instants plus the zone they were lived
// in, so the night through Brussels' clock change on 25 October 2026 lasts nine hours; a missing night is never zero;
// nothing is medical advice. Every record here is fictional; every request to the server is answered offline.
const BXL = 'Europe/Brussels';
test.use({timezoneId: BXL});
const MORNING = new Date('2026-10-25T09:30:00.000Z'); // 10:30 in Brussels, after the clocks went back
const SAVED = new Date('2026-10-25T09:00:00.000Z');

async function seed(page: Page, {health, settings = {}, extra = {}}: {health?: HealthData; settings?: Record<string, unknown>; extra?: Record<string, string>} = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  const records: Record<string, string> = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true, ...settings}), ...extra};
  if (health) records[HEALTH_STORAGE_KEY] = JSON.stringify(healthSchema.parse(health));
  await page.evaluate(entries => { for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, records);
}
const withSleep = (sleep: Sleep, base: HealthData = createEmptyHealth()) => withHealthGroup(base, 'sleep', sleep, false);
/** A night typed as the person would: bed and wake clock times in a zone. */
const night = (s: Sleep, wake: string, bed: string, up: string, extra: Partial<Parameters<typeof saveNight>[1]> = {}, zone = BXL) =>
  saveNight(s, {kind: 'night', start: instantAt(bed > up ? addDays(wake, -1) : wake, bed, zone), end: instantAt(wake, up, zone), timeZone: zone, ...extra}, SAVED);
const storedSleep = async (page: Page) => (await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), HEALTH_STORAGE_KEY)) as (HealthData & {sleep?: Sleep}) | null;
async function openSleep(page: Page) {
  await page.goto('/app/health?view=sleep');
  await expect(page.getByRole('heading', {level: 1, name: 'Your sleep, your rhythm.'})).toBeVisible();
}
const note = (page: Page) => page.locator('.sleep-note');
const logForm = (page: Page) => page.getByRole('form', {name: 'Log a night or a nap'});
const recent = (page: Page) => page.getByRole('region', {name: 'Recent nights and naps'});

test('log the night through the Brussels clock change, see it in the week, edit it and delete it', async ({page}) => {
  await page.clock.install({time: MORNING});
  await seed(page);
  await openSleep(page);
  await expect(page.getByRole('region', {name: 'Your last 7 days'})).toContainText('No night logged in the last 7 days yet.');
  const form = logForm(page);
  // The form starts at last night: bed on the 24th at 23:00, up on the 25th at 07:00, in the zone the days follow.
  await expect(form.getByLabel('Went to bed (date)')).toHaveValue('2026-10-24');
  await expect(form.getByLabel('Went to bed (time)')).toHaveValue('23:00');
  await expect(form.getByLabel('Woke up (date)')).toHaveValue('2026-10-25');
  await expect(form.getByLabel('Woke up (time)')).toHaveValue('07:00');
  await expect(form).toContainText('Times in Europe/Brussels.');
  await form.getByLabel('Time to fall asleep (minutes, optional)').fill('10');
  await form.getByLabel('Time awake in the night (minutes, optional)').fill('20');
  await form.getByRole('radio', {name: '4 · Good', exact: true}).check();
  await form.getByRole('checkbox', {name: 'caffeine', exact: true}).check();
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(note(page)).toHaveText('Night saved.');
  // Nine hours in bed (the clocks went back at 03:00), eight and a half asleep.
  await expect(recent(page)).toContainText('Night ending 2026-10-25');
  await expect(recent(page)).toContainText('23:00 → 07:00 · 8 h 30 min asleep · in bed 9 h 00 min');
  await expect(recent(page)).toContainText('Quality 4/5 · caffeine');
  const week = page.getByRole('region', {name: 'Your last 7 days'});
  await expect(week).toContainText('8 h 30 min');
  await expect(week).toContainText('1 night logged');
  await expect(week).toContainText('Set a goal');
  const stored = await storedSleep(page);
  expect(stored!.schemaVersion).toBe(4);
  expect(stored!.sleep!.nights).toMatchObject([{kind: 'night', start: '2026-10-24T21:00:00.000Z', end: '2026-10-25T06:00:00.000Z', timeZone: BXL, latencyMin: 10, awakeMin: 20, quality: 4, tags: ['caffeine'], source: 'manual'}]);
  // Edit: up at 06:30 instead.
  await recent(page).getByRole('button', {name: 'Edit the night ending 2026-10-25', exact: true}).click();
  const edit = page.getByRole('form', {name: 'Edit this night'});
  await edit.getByLabel('Woke up (time)').fill('06:30');
  await edit.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(note(page)).toHaveText('Night updated.');
  await expect(recent(page)).toContainText('23:00 → 06:30 · 8 h 00 min asleep · in bed 8 h 30 min');
  expect((await storedSleep(page))!.sleep!.nights).toHaveLength(1);
  // Delete asks first.
  await recent(page).getByRole('button', {name: 'Delete the night ending 2026-10-25', exact: true}).click();
  await recent(page).getByRole('button', {name: 'Keep it', exact: true}).click();
  await expect(recent(page)).toContainText('Night ending 2026-10-25');
  await recent(page).getByRole('button', {name: 'Delete the night ending 2026-10-25', exact: true}).click();
  await recent(page).getByRole('button', {name: 'Delete it', exact: true}).click();
  await expect(note(page)).toHaveText('The night is deleted.');
  await expect(recent(page)).toContainText('No nights yet.');
  expect((await storedSleep(page))!.sleep!.nights).toEqual([]);
  if (await isPhone(page)) {
    for (const width of [320, 390]) {
      await page.setViewportSize({width, height: 800});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    for (const name of ['I’m going to bed', 'Save', '7 days', '30 days']) expect((await page.getByRole('button', {name, exact: true}).first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('refusals: an overlap, a night ending in the future, a missing time, a minutes field that is not a number', async ({page}) => {
  await page.clock.install({time: MORNING});
  await seed(page, {health: withSleep(night(emptySleep(), '2026-10-25', '23:00', '07:00'))});
  await openSleep(page);
  const form = logForm(page);
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(form.getByRole('alert')).toHaveText('This overlaps the night that ended on 2026-10-25. Edit that one instead.');
  await form.getByLabel('Went to bed (date)').fill('2026-10-25');
  await form.getByLabel('Woke up (date)').fill('2026-10-26');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(form.getByRole('alert')).toHaveText('A night cannot end in the future.');
  await form.getByLabel('Woke up (time)').fill('');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(form.getByRole('alert')).toHaveText('Enter when you went to bed and when you woke up.');
  await form.getByLabel('Woke up (date)').fill('2026-10-23');
  await form.getByLabel('Went to bed (date)').fill('2026-10-22');
  await form.getByLabel('Woke up (time)').fill('07:00');
  await form.getByLabel('Time to fall asleep (minutes, optional)').fill('ten');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(form.getByRole('alert')).toHaveText('Time to fall asleep: enter whole minutes from 0 to 720, or leave it empty.');
  expect((await storedSleep(page))!.sleep!.nights).toHaveLength(1);
});

test('“I’m going to bed”, then “I woke up”; the Health card follows the night', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-20T20:40:00.000Z')}); // 22:40 in Brussels (summer time)
  await seed(page);
  await openSleep(page);
  const tonight = page.getByRole('region', {name: 'Tonight'});
  await tonight.getByRole('button', {name: 'I’m going to bed', exact: true}).click();
  await expect(note(page)).toHaveText('Good night. Tap “I woke up” in the morning.');
  await expect(tonight.locator('.sleep-running')).toHaveText('In bed since 22:40 · 0 min');
  expect((await storedSleep(page))!.sleep!.nights).toMatchObject([{end: null, timeZone: BXL, source: 'timer'}]);
  // Health shows the running night (on a phone the card stays open while it runs).
  await page.goto('/app/health');
  const card = page.getByRole('region', {name: 'Rest well.'});
  await expect(card).toContainText('In bed since 22:40');
  await page.clock.fastForward(7 * 3_600_000 + 50 * 60_000);
  await expect(card.locator('.sleep-running')).toHaveText('In bed since 22:40 · 7 h 50 min');
  await card.getByRole('button', {name: 'I woke up', exact: true}).click();
  await expect(card.getByRole('status')).toHaveText('Good morning. Your night is saved.');
  await expect(card).toContainText('7 h 50 min asleep (estimated) · 22:40–06:30, night ending 2026-10-21');
  await expect(card).toContainText('Last 7 days: 7 h 50 min a night on average over 1 night.');
  await card.getByRole('link', {name: 'Open Sleep →'}).click();
  await expect(page).toHaveURL(/\/app\/health\?view=sleep$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Your sleep, your rhythm.'})).toBeVisible();
  // A night without fall-asleep or awake minutes is an estimate, and its bar says so in the key.
  await expect(page.getByRole('figure', {name: 'Time asleep · last 7 days'}).locator('.sleep-key')).toHaveText('Lighter bar: estimated from time in bed');
  await expect(page.locator('.sleep-bar.estimated')).toHaveCount(1);
  await page.getByRole('link', {name: '← Health'}).click();
  await expect(page).toHaveURL(/\/app\/health$/);
});

test('a night left running for more than a day asks when you woke up; nothing is invented', async ({page}) => {
  await page.clock.install({time: MORNING});
  const running = startNight(emptySleep(), new Date('2026-10-23T21:15:00.000Z'), BXL, 'health_sleep-running-0001');
  await seed(page, {health: withSleep(running)});
  await openSleep(page);
  const tonight = page.getByRole('region', {name: 'Tonight'});
  const ask = tonight.getByRole('form', {name: 'When did the night from 2026-10-23 23:15 end?'});
  await expect(ask).toContainText('A night started on 2026-10-23 at 23:15 is still open. When did you wake up?');
  await expect(tonight.getByRole('button', {name: 'I’m going to bed', exact: true})).toHaveCount(0);
  await ask.getByLabel('Woke up (date)').fill('2026-10-25');
  await ask.getByLabel('Woke up (time)').fill('07:00');
  await ask.getByRole('button', {name: 'Save the wake time', exact: true}).click();
  await expect(ask.getByRole('alert')).toHaveText('This night started more than 24 hours ago. Enter when you woke up.');
  await ask.getByLabel('Woke up (date)').fill('2026-10-24');
  await ask.getByRole('button', {name: 'Save the wake time', exact: true}).click();
  await expect(note(page)).toHaveText('Night saved.');
  await expect(recent(page)).toContainText('23:15 → 07:00');
  await expect(tonight.getByRole('button', {name: 'I’m going to bed', exact: true})).toBeVisible();
});

test('your goal: sleep debt and consistency with their formulas, the goal line, the bedtime band and the tables', async ({page}) => {
  await page.clock.install({time: MORNING});
  let s = emptySleep();
  // Six nights, one left out (the 22nd): bedtimes between 22:40 and 23:40.
  for (const [wake, bed, up] of [['2026-10-19', '22:40', '06:40'], ['2026-10-20', '23:10', '06:50'], ['2026-10-21', '23:40', '06:40'], ['2026-10-23', '22:50', '06:20'], ['2026-10-24', '23:20', '07:10'], ['2026-10-25', '23:00', '06:30']] as const) s = night(s, wake, bed, up, {latencyMin: 10, awakeMin: 10, quality: 3});
  await seed(page, {health: withSleep(s)});
  await openSleep(page);
  const goal = page.getByRole('form', {name: 'Your sleep goal'});
  await goal.getByLabel('Time asleep I aim for').selectOption({label: '7 h 30 min'});
  await goal.getByLabel('In bed from (optional)').fill('22:30');
  await goal.getByRole('button', {name: 'Save goal', exact: true}).click();
  await expect(goal.getByRole('alert')).toHaveText('Choose both ends of the bedtime window, or neither.');
  await goal.getByLabel('Until (optional)').fill('23:30');
  await goal.getByRole('button', {name: 'Save goal', exact: true}).click();
  await expect(note(page)).toHaveText('Your sleep goal is saved.');
  const week = page.getByRole('region', {name: 'Your last 7 days'});
  await expect(week).toContainText('Your goal (7 h 30 min) minus time asleep, added up over the 6 nights you logged in the last 7 days.');
  await expect(week).toContainText('How much your bedtimes vary: the standard deviation of 6 bedtimes in the last 14 days.');
  await expect(week).toContainText('± ');
  await expect(week).toContainText('6 nights logged');
  const charts = page.getByRole('region', {name: 'Over time'});
  // The reference marks are named in a key under each title, never on top of the data.
  await expect(charts.getByRole('figure', {name: 'Time asleep · last 7 days'}).locator('.sleep-key')).toHaveText('Goal 7 h 30 min');
  await expect(charts.getByRole('figure', {name: 'Bed and wake times · last 7 days'}).locator('.sleep-key')).toHaveText('Bedtime window 22:30–23:30');
  await expect(charts.locator('.sleep-goal line')).toHaveCount(1);
  await expect(charts.getByRole('img').first()).toHaveAttribute('aria-label', /^Time asleep, 7 days: 6 nights logged, from .* to .*; goal 7 h 30 min\.$/);
  // The table holds every day: the missing night says so, never zero.
  await charts.getByText('Show as a table').first().click();
  const table = charts.getByRole('table').first();
  await expect(table.getByRole('row', {name: /Thu, Oct 22/})).toContainText('No night logged');
  // The night of the 24th–25th spans the clock change: 23:00 → 06:30 is 8 h 30 min in bed.
  await expect(table.getByRole('row', {name: /Sun, Oct 25/})).toContainText('8 h 10 min8 h 30 min23:00 → 06:303 of 5');
  await charts.getByRole('button', {name: '30 days', exact: true}).click();
  await expect(charts.locator('figcaption').first()).toHaveText('Time asleep · last 30 days');
  expect((await storedSleep(page))!.sleep!.goal).toMatchObject({minutes: 450, bedFrom: '22:30', bedTo: '23:30'});
  await expect(page.locator('.sleep-privacy')).toHaveText('Nothing here is medical advice. Imported nights keep the source they came from.');
});

test('short nights get a gentle word, never a score or a diagnosis', async ({page}) => {
  await page.clock.install({time: MORNING});
  let s = emptySleep();
  for (let i = 0; i < 5; i++) s = night(s, addDays('2026-10-25', -i), '01:30', '06:30');
  await seed(page, {health: withSleep(s)});
  await openSleep(page);
  const word = page.getByRole('region', {name: 'A gentle word'});
  await expect(word).toHaveText('Your recent nights have been short. That happens, and small steps count. If sleeping stays hard for a while, a doctor or another health professional can help.');
  await expect(page.locator('main')).not.toContainText(/insomnia|disorder|score|you should/i);
});

test('Today: the Sleep widget shows last night, and the wind-down card goes away for tonight', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-25T20:30:00.000Z')}); // 21:30 in Brussels
  const s = night(emptySleep(), '2026-10-25', '23:00', '07:00', {latencyMin: 10, awakeMin: 20, quality: 4});
  const preset = presetSettings('habits-health');
  const widget = {id: 'w-sleep-fixture', kind: 'sleep', metric: 'last-night', title: '', size: 'compact', hidden: false, revision: 1};
  await seed(page, {health: withSleep(s), settings: {schemaVersion: 3, widgets: [...preset.widgets, widget]}, extra: {[W_REMINDERS_KEY]: JSON.stringify({version: 1, windDown: {time: '21:00'}, chained: {}, contributions: {}, dismissed: {}})}});
  await page.goto('/app');
  await openTodayWidgets(page);
  const card = page.getByRole('article', {name: 'Sleep', exact: true});
  await expect(card).toContainText('8 h 30 min asleep');
  await expect(card).toContainText('Night ending 2026-10-25 · quality 4/5');
  const windDown = page.getByRole('article', {name: 'Reminder: Wind-down time'});
  await expect(windDown).toContainText('Time to wind down');
  await expect(windDown.getByRole('link', {name: 'Open Sleep'})).toHaveAttribute('href', '/app/health?view=sleep');
  await windDown.getByRole('button', {name: 'Not tonight', exact: true}).click();
  await expect(windDown).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('article', {name: 'Sleep', exact: true})).toBeAttached();
  await expect(page.getByRole('article', {name: 'Reminder: Wind-down time'})).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), W_REMINDERS_KEY))!).dismissed).toEqual({'wind-down': '2026-10-25'});
});

test('the wind-down setting is this device\'s own, and a night in bed ends the card', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-25T20:30:00.000Z')});
  await seed(page);
  await openSleep(page);
  const setting = page.getByRole('form', {name: 'Wind-down reminder'});
  await expect(setting).toContainText('Off.');
  await setting.getByLabel('Wind-down reminder (this device)').fill('21:15');
  await setting.getByRole('button', {name: 'Set reminder', exact: true}).click();
  await expect(setting.getByRole('status')).toHaveText('Wind-down reminder set for 21:15 on this device.');
  await expect(setting).toContainText('Today shows a card from 21:15 until you go to bed.');
  await page.goto('/app');
  await expect(page.getByRole('article', {name: 'Reminder: Wind-down time'})).toBeVisible();
  await openSleep(page);
  await page.getByRole('region', {name: 'Tonight'}).getByRole('button', {name: 'I’m going to bed', exact: true}).click();
  await expect(note(page)).toHaveText('Good night. Tap “I woke up” in the morning.');
  await page.goto('/app');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByRole('article', {name: 'Reminder: Wind-down time'})).toHaveCount(0);
  await openSleep(page);
  await page.getByRole('form', {name: 'Wind-down reminder'}).getByRole('button', {name: 'Turn off', exact: true}).click();
  await expect(page.getByRole('form', {name: 'Wind-down reminder'})).toContainText('Off.');
});

test('a sleep habit ticks itself off from last night', async ({page}) => {
  await page.clock.install({time: MORNING});
  const id = '92000000-0000-4000-8000-0000000000a1';
  const habits = createHabit(emptyHabitData(), {title: 'Sleep 7 hours', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00.000Z'), id);
  const health: HealthData = {...withSleep(night(emptySleep(), '2026-10-25', '23:00', '07:00', {latencyMin: 20, awakeMin: 10})), habitLinks: {version: 1, links: {[id]: {version: 1, measure: 'sleepMinutes', rule: 'at-least', target: 420, updatedAt: SAVED.toISOString()}}, applied: []}} as HealthData;
  await seed(page, {health, extra: {[HABITS_KEY]: JSON.stringify(habits)}});
  await page.goto('/app/habits');
  await expect(page.locator('#main .habit-auto-badge').first()).toHaveText('Done automatically · from your sleep log · 8 h 30 min');
  const stored = (await storedSleep(page)) as HealthData & {habitLinks: {applied: {measure: string; value: number}[]}};
  expect(stored.habitLinks.applied).toMatchObject([{habitId: id, date: '2026-10-25', measure: 'sleepMinutes', value: 510}]);
});

test('Showcase: fictional nights with a pattern from their own tags, and nothing asked of any other site', async ({page, baseURL}) => {
  await page.clock.install({time: MORNING});
  const outside: string[] = [];
  page.on('request', request => { if (!request.url().startsWith(baseURL!) && !request.url().startsWith('data:')) outside.push(request.url()); });
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await openSleep(page);
  await expect(recent(page)).toContainText('Night ending 2026-10-25');
  await expect(page.getByRole('region', {name: 'Patterns in your log'})).toContainText('On nights you tagged “caffeine”');
  await expect(page.getByRole('region', {name: 'Patterns in your log'})).toContainText('A pattern in your own log, not proof of a cause.');
  await expect(page.getByRole('region', {name: 'Your last 7 days'})).toContainText('Your goal (8 h 00 min)');
  expect(outside).toEqual([]);
});

test('the first run: “Sleep & mind” offers a sleep goal, saved with Finish', async ({page}) => {
  await page.clock.install({time: MORNING});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Sleep & mind/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  const goal = flow.getByRole('radiogroup', {name: 'Sleep goal'});
  await expect(goal.getByRole('radio', {name: 'No sleep goal', exact: true})).toBeChecked();
  await goal.getByRole('radio', {name: '7 h 30 min asleep', exact: true}).check();
  await expect(flow).toContainText('Not advice.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow.getByRole('region', {name: 'When you finish'})).toContainText('A sleep goal of 7 h 30 min.');
  expect(await storedSleep(page)).toBeNull();
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app(\/health)?$/);
  await expect.poll(async () => (await storedSleep(page))?.sleep?.goal?.minutes).toBe(450);
  expect((await storedSleep(page))!.schemaVersion).toBe(4);
});
