import {expect, type Locator, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, saveHabitTimezone, type HabitData, type HabitInput} from '../lib/habits';
import {journey, noSideways, open, ready, snap, type Journey} from './kit';

// Session X Part 14, journeys J061–J090: Habits (docs/verification/x-cloud/HUMAN_TEST.md). Created through the UI, as a
// person does, with fictional titles.
const card = (page: Page, title: string) => page.getByRole('article', {name: title, exact: true});
async function closeSheet(j: Journey) {
  if (!j.phone) return;
  const sheet = j.page.locator('dialog.phone-form-sheet[open]');
  if (await sheet.count()) { await j.page.keyboard.press('Escape'); await expect(sheet).toHaveCount(0); }
}
async function addHabit(j: Journey, title: string, target = '1') {
  const {page} = j;
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByLabel('Target value').fill(target);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await closeSheet(j);
  await expect(card(page, title)).toBeVisible();
}
const habits = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habits:v1') ?? 'null'));

journey('J061', 'create a daily habit, check it in, see it done', {views: 'all', data: ['E'], live: true}, async j => {
  await j.page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(j.page, '/app/habits');
  await addHabit(j, 'Fictional stretch');
  const c = card(j.page, 'Fictional stretch');
  await c.getByRole('button', {name: 'Complete Fictional stretch', exact: true}).click();
  await expect(c.getByRole('button', {name: 'Undo completion for Fictional stretch'})).toHaveAttribute('aria-pressed', 'true');
  await j.page.reload();
  await ready(j.page);
  await expect(card(j.page, 'Fictional stretch').getByRole('button', {name: 'Undo completion for Fictional stretch'})).toHaveAttribute('aria-pressed', 'true');
  await snap(j, 'J061', 'done');
});

journey('J063', 'a counter habit: +1 three times reaches its target of 3', {views: 'all', data: ['L']}, async j => {
  await open(j.page, '/app/habits');
  await addHabit(j, 'Fictional pages', '3');
  const c = card(j.page, 'Fictional pages');
  for (let i = 0; i < 3; i++) await c.getByRole('button', {name: 'Add one to Fictional pages'}).click();
  await expect(c.locator('.habit-count')).toHaveText('3 / 3 times per day');
});

journey('J065', 'undo a check-in', {views: 'all', data: ['L'], live: true}, async j => {
  await open(j.page, '/app/habits');
  await addHabit(j, 'Fictional floss');
  const c = card(j.page, 'Fictional floss');
  await c.getByRole('button', {name: 'Complete Fictional floss', exact: true}).click();
  await c.getByRole('button', {name: 'Undo completion for Fictional floss'}).click();
  await expect(c.locator('.habit-count')).toHaveText('0 / 1 time per day');
});

journey('J067', 'vacation days: mark a week, then remove it', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional run');
  await page.getByRole('button', {name: 'Vacation', exact: true}).click();
  const region = page.getByRole('region', {name: 'Vacation days', exact: true});
  // The panel offers a week (today to six days on, From/To dates, not a number of days) for every active habit.
  await expect(region.getByLabel('From', {exact: true})).toHaveValue('2026-10-14');
  await expect(region.getByLabel('To', {exact: true})).toHaveValue('2026-10-20');
  await expect(region.getByRole('checkbox', {name: 'Fictional run', exact: true})).toBeChecked();
  await region.getByRole('button', {name: 'Mark vacation', exact: true}).click();
  await expect(region.getByRole('status')).toHaveText('Vacation marked for 1 habit, 7 days.');
  const skipped = async () => ((await habits(page)).habits[0].entries as {date: string; disposition: string}[]).filter(e => e.disposition === 'skipped').map(e => e.date).sort();
  expect(await skipped()).toEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']);
  await region.getByRole('button', {name: 'Clear vacation days', exact: true}).click();
  await expect(region.getByRole('status')).toHaveText('Vacation days cleared. Your own check-ins and skips were kept.');
  expect(await skipped()).toEqual([]);
  // The panel closes with its Cancel button (it has no separate Done).
  await region.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(region).toHaveCount(0);
  await expect(card(page, 'Fictional run').getByRole('button', {name: 'Complete Fictional run', exact: true})).toBeVisible();
});

journey('J073', 'a habit title with emoji and 80 characters stays whole or ellipsed, never overflowing', {views: 'all', data: ['L'], live: true}, async j => {
  const title = 'Fictional 🧘 ' + 'calm breathing practice before the morning meeting starts, every day'.slice(0, 66);
  await open(j.page, '/app/habits');
  await addHabit(j, title);
  const box = await card(j.page, title).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(j.page.viewportSize()!.width + 0.5);
});

journey('J076', 'delete (archive) a habit: it leaves the list and Today', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional temporary');
  const c = card(page, 'Fictional temporary');
  // Habits has no hard delete: "Archive habit" (no confirmation) begins tomorrow, and today keeps its record.
  await expect(c).toContainText('Pause, resume and archive changes begin 2026-10-15.');
  await c.getByRole('button', {name: 'Archive habit', exact: true}).click();
  await expect(c).toContainText('Scheduled change from 2026-10-15: archived');
  await expect(c).toBeVisible();
  await page.clock.setSystemTime(new Date('2026-10-15T09:00:00+02:00'));
  await page.reload();
  await ready(page);
  await expect(card(page, 'Fictional temporary')).toHaveCount(0);
  await allHabits(page).click();
  await expect(card(page, 'Fictional temporary')).toHaveCount(0);
  await page.getByLabel('Filter habits').getByRole('button', {name: 'Archived', exact: true}).click();
  await expect(card(page, 'Fictional temporary').getByRole('button', {name: 'Restore habit', exact: true})).toBeVisible();
  await open(page, '/app');
  await expect(page.locator('main')).not.toContainText('Fictional temporary');
});

journey('J079', 'a check-in just before and just after midnight lands on two days', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T23:58:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional night note');
  await card(page, 'Fictional night note').getByRole('button', {name: 'Complete Fictional night note', exact: true}).click();
  await page.clock.runFor(4 * 60_000);
  await page.reload();
  await ready(page);
  await expect(card(page, 'Fictional night note').locator('.habit-count')).toHaveText('0 / 1 time per day');
  await card(page, 'Fictional night note').getByRole('button', {name: 'Complete Fictional night note', exact: true}).click();
  const data = await habits(page);
  const days = JSON.stringify(data);
  expect(days).toContain('2026-10-14');
  expect(days).toContain('2026-10-15');
});

journey('J080', 'DST: checked in on 25, 26 and 27 October 2026 in Brussels, three separate days', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-25T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional DST walk');
  for (const [i, when] of ['2026-10-25T09:00:00+02:00', '2026-10-26T09:00:00+01:00', '2026-10-27T09:00:00+01:00'].entries()) {
    if (i) { await page.clock.setFixedTime(new Date(when)); await page.reload(); await ready(page); }
    await card(page, 'Fictional DST walk').getByRole('button', {name: 'Complete Fictional DST walk', exact: true}).click();
  }
  const text = JSON.stringify(await habits(page));
  for (const day of ['2026-10-25', '2026-10-26', '2026-10-27']) expect(text).toContain(day);
});

journey('J081', 'history and reflection: write a note, reload, it is there', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional reading');
  const c = card(page, 'Fictional reading');
  await c.getByText('History & reflection', {exact: true}).click();
  await c.getByLabel('Day reflection (optional)').fill('Two chapters, calm evening. Ünïcödé ✓');
  await c.getByRole('button', {name: 'Save day', exact: true}).click();
  await expect(c.getByRole('status')).toHaveText('Day saved.');
  await page.reload();
  await ready(page);
  await card(page, 'Fictional reading').getByText('History & reflection', {exact: true}).click();
  await expect(card(page, 'Fictional reading').getByLabel('Day reflection (optional)')).toHaveValue('Two chapters, calm evening. Ünïcödé ✓');
});

journey('J085', 'Habits in Showcase writes nothing to my own records', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  const {page} = j;
  const before = await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'));
  await open(page, '/app/habits');
  const first = page.locator('article.habit-card, main article').first();
  await expect(first).toBeVisible();
  const complete = first.getByRole('button', {name: /^Complete /}).first();
  if (await complete.count()) await complete.click();
  expect(await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'))).toBe(before);
});

journey('J088', 'Habits\' empty state says what to do first', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/habits');
  await expect(j.page.getByRole('button', {name: '+ New habit', exact: true})).toBeVisible();
  await snap(j, 'J088', 'empty');
});

journey('J089', 'Today\'s habit progress matches Habits', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional one');
  await addHabit(j, 'Fictional two');
  await card(page, 'Fictional one').getByRole('button', {name: 'Complete Fictional one', exact: true}).click();
  await open(page, '/app');
  await expect(page.locator('main')).toContainText(/1 of 2|1\/2|1 \/ 2/);
});

/** A fictional habit saved with its check-ins, as an earlier week on this device would have left it. */
const at = (day: string, clock = '06:00') => new Date(`${day}T${clock}:00.000Z`);
function logged(title: string, created: string, days: string[], schedule: HabitInput['schedule'] = {kind: 'daily'}): HabitData {
  const id = '93000000-0000-4000-8000-000000000001';
  let d = createHabit(saveHabitTimezone(emptyHabitData(), 'Europe/Brussels'), {title, category: 'Health', description: '', notes: '', schedule, target: 1}, at(created), id);
  for (const day of days) d = logHabitValue(d, id, day, 1, {mode: 'set'}, at(day, '06:30'));
  return d;
}
async function seedHabits(page: Page, data: HabitData) { await page.goto('/app/settings'); await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HABITS_KEY, JSON.stringify(data)]); }
async function streak(page: Page, title: string) {
  const c = card(page, title), metric = c.locator('.habit-metrics > div').filter({hasText: 'Current streak'}).locator('strong');
  if (!await metric.isVisible()) await c.getByText('Consistency & trends', {exact: true}).click();
  return metric;
}
const allHabits = (page: Page) => page.getByLabel('Filter habits').getByRole('button', {name: 'All', exact: true});
async function editHabit(j: Journey, title: string) { await j.page.getByRole('button', {name: `Edit ${title}`, exact: true}).click(); }
async function saveHabit(j: Journey) { await j.page.getByRole('button', {name: 'Save habit', exact: true}).click(); await closeSheet(j); }
async function linkToHealth(j: Journey, title: string, measure: string, target: string) {
  await editHabit(j, title);
  const section = j.page.getByRole('group', {name: 'Done automatically from Health', exact: true});
  await section.getByLabel('Done automatically when').selectOption(measure);
  await section.getByRole('radio', {name: 'the day reaches at least'}).check();
  await section.getByLabel('Target', {exact: true}).fill(target);
  await saveHabit(j);
}

journey('J062', 'a weekdays-only habit: the weekend is a rest day and never breaks the streak', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-16T09:00:00+02:00')}); // a Friday
  await seedHabits(page, logged('Fictional desk stretch', '2026-10-12', ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'], {kind: 'weekdays', days: [1, 2, 3, 4, 5]}));
  await open(page, '/app/habits');
  await card(page, 'Fictional desk stretch').getByRole('button', {name: 'Complete Fictional desk stretch', exact: true}).click();
  await expect(await streak(page, 'Fictional desk stretch')).toHaveText('5 days');
  await page.clock.setSystemTime(new Date('2026-10-17T10:00:00+02:00')); // Saturday
  await page.reload();
  await ready(page);
  // The list opens on "Today": a rest day lists nothing and says so; the habit itself is under "View all habits".
  await expect(page.getByRole('heading', {level: 2, name: 'A little breathing room.'})).toBeVisible();
  await expect(page.getByText('Nothing is scheduled today.', {exact: false})).toBeVisible();
  await expect(card(page, 'Fictional desk stretch')).toHaveCount(0);
  await page.getByRole('button', {name: 'View all habits', exact: true}).click();
  await expect(card(page, 'Fictional desk stretch').getByText('Not scheduled', {exact: true}).first()).toBeVisible();
  await expect(await streak(page, 'Fictional desk stretch')).toHaveText('5 days');
  await page.clock.setSystemTime(new Date('2026-10-19T09:00:00+02:00')); // Monday
  await page.reload();
  await ready(page);
  await card(page, 'Fictional desk stretch').getByRole('button', {name: 'Complete Fictional desk stretch', exact: true}).click();
  await expect(await streak(page, 'Fictional desk stretch')).toHaveText('6 days');
});

journey('J064', 'a minutes habit: reading 20 minutes, reached in two sittings', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional reading time');
  // Each label wraps its select, so the field's name also carries the chosen option ("Measurement Count").
  await page.getByRole('combobox', {name: /^Measurement/}).selectOption('duration');
  await page.getByRole('combobox', {name: /^Unit/}).selectOption('minutes');
  await page.getByLabel('Target value').fill('20');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await closeSheet(j);
  const c = card(page, 'Fictional reading time');
  await expect(c.locator('.habit-count')).toHaveText(/^0 \/ 20 minutes/);
  await c.locator('summary', {hasText: 'Set or add a value'}).click();
  for (const minutes of ['15', '5']) { await c.getByLabel('Value for Fictional reading time').fill(minutes); await c.getByRole('button', {name: 'Add value', exact: true}).click(); }
  await expect(c.locator('.habit-count')).toHaveText(/^20 \/ 20 minutes/);
  expect((await habits(page)).habits[0].entries.map((e: {count: number}) => e.count)).toEqual([20]);
});

const healthView = (page: Page, name: string) => page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name, exact: true}).click();
const done = (page: Page, title: string) => card(page, title).getByRole('button', {name: `Undo completion for ${title}`});
const notDone = (page: Page, title: string) => card(page, title).getByRole('button', {name: `Complete ${title}`, exact: true});

journey('J066', 'skip a single missed day from History & reflection: the streak holds', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional daily sketch';
  await page.clock.install({time: new Date('2026-10-15T09:00:00+02:00')});
  await seedHabits(page, logged(title, '2026-10-10', ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-14', '2026-10-15']));
  await open(page, '/app/habits');
  // The missed 13th breaks the run: two days so far.
  await expect(await streak(page, title)).toHaveText('2 days');
  const c = card(page, title);
  await c.getByText('History & reflection', {exact: true}).click();
  await c.getByLabel('Day to review').fill('2026-10-13');
  await c.getByRole('button', {name: 'Skip day', exact: true}).click();
  await expect(c.getByRole('status').filter({hasText: 'Day skipped.'})).toBeVisible();
  await expect(c.getByRole('group', {name: `${title} completion calendar`}).getByRole('button', {name: /: Skipped, /})).toHaveCount(1);
  await expect(await streak(page, title)).toHaveText('5 days');
  await page.reload();
  await ready(page);
  await expect(await streak(page, title)).toHaveText('5 days');
});

journey('J068', 'a 30-day challenge: its end date, then one calm note when it ends (clock moved)', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional plank';
  await page.clock.install({time: new Date('2026-10-01T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, title);
  const c = card(page, title), challenge = c.locator('details.habit-challenge');
  await challenge.locator(':scope > summary').click();
  await expect(challenge.getByLabel('Days')).toHaveValue('30');
  await challenge.getByRole('button', {name: 'Start a challenge', exact: true}).click();
  await expect(challenge.getByRole('status')).toHaveText('Challenge started: 30 days from today.');
  await expect(c.locator('.habit-challenge-line')).toContainText('Challenge · day 1 of 30');
  await expect(c.locator('.habit-challenge-line')).toContainText('ends 2026-10-30');
  await notDone(page, title).click();
  await expect(c.locator('.habit-challenge-line')).toContainText('done on 1 of 1 scheduled day so far');
  // The day after its last day: it is not due any more (so only "All" lists it), and one calm note says what was done.
  await page.clock.setSystemTime(new Date('2026-10-31T09:00:00+01:00'));
  await page.reload();
  await ready(page);
  await expect(card(page, title)).toHaveCount(0);
  await allHabits(page).click();
  const note = card(page, title).getByRole('group', {name: `${title} challenge ended`});
  await expect(note).toContainText(`Your 30-day ${title} challenge ended on 2026-10-30: done on 1 of 30 scheduled days.`);
  await note.getByRole('button', {name: 'Let it rest', exact: true}).click();
  await expect(note).toHaveCount(0);
  await page.reload();
  await ready(page);
  await allHabits(page).click();
  await expect(card(page, title).getByRole('group', {name: `${title} challenge ended`})).toHaveCount(0);
});

journey('J069', 'a stack of three habits shown together; its chained reminder on Today', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  const [first, second, third] = ['Fictional glass of water', 'Fictional stretch after', 'Fictional journal last'] as const;
  await page.clock.install({time: new Date('2026-10-14T08:00:00+02:00')});
  await open(page, '/app/habits');
  for (const title of [first, second, third]) await addHabit(j, title);
  for (const [title, after] of [[second, first], [third, second]] as const) {
    await editHabit(j, title);
    await page.getByRole('combobox', {name: /^Stack after/}).selectOption({label: `After ${after}`});
    await saveHabit(j);
  }
  const stack = page.getByRole('region', {name: 'Your stacks'}).getByRole('list', {name: `Stack starting with ${first}`});
  await expect(stack.getByRole('listitem')).toHaveCount(3);
  await expect(stack.getByRole('button', {name: /^View /})).toHaveText([first, `→ ${second}`, `→ ${third}`]);
  await stack.getByRole('checkbox', {name: `Remind me after ${first}`}).check();
  await notDone(page, first).click();
  await expect(done(page, first)).toHaveAttribute('aria-pressed', 'true');
  await open(page, '/app');
  const reminder = page.getByRole('article', {name: `Reminder: next in your stack, ${second}`});
  await expect(reminder).toContainText(`After ${first}, which is done today.`);
  await reminder.getByRole('button', {name: 'Not today', exact: true}).click();
  await expect(reminder).toHaveCount(0);
});

journey('J070', 'a reminder time added to a habit shows on Today when due, and leaves once the habit is done', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional vitamin';
  await page.clock.install({time: new Date('2026-10-14T08:50:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, title);
  await editHabit(j, title);
  await page.getByLabel('Reminder time — on this device').fill('09:00');
  await saveHabit(j);
  await open(page, '/app');
  const reminder = page.getByRole('article', {name: `Reminder: ${title}`});
  await expect(reminder).toHaveCount(0);
  await page.clock.runFor(12 * 60_000);
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText('Reminder · 09:00 · on this device');
  await expect(reminder).toContainText('Not done yet today.');
  await reminder.getByRole('link', {name: 'Open habit', exact: true}).click();
  await page.waitForURL(/\/app\/habits/);
  await ready(page);
  await notDone(page, title).click();
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  await open(page, '/app');
  await expect(page.getByRole('article', {name: `Reminder: ${title}`})).toHaveCount(0);
});

journey('J071', 'water ticks a habit off by itself; a tap wins; Undo keeps it off for the day', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  const title = 'Fictional half litre';
  await page.clock.install({time: new Date('2026-10-14T10:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, title);
  await linkToHealth(j, title, 'water', '500');
  const drink = async (total: string) => {
    await open(page, '/app/health');
    const water = page.getByRole('region', {name: 'Water journal'});
    await water.getByRole('button', {name: 'Add 500 mL', exact: true}).click();
    await expect(water.locator('.health-water-total')).toHaveText(`${total} mL recorded`);
    await open(page, '/app/habits');
  };
  await drink('500');
  const badge = card(page, title).locator('.habit-auto-badge');
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  await expect(badge).toContainText('Done automatically · from');
  await expect(badge).toContainText('500 mL');
  // A tap wins: Undo takes it off for today, and more water does not tick it again.
  await done(page, title).click();
  await expect(notDone(page, title)).toHaveAttribute('aria-pressed', 'false');
  await expect(badge).toHaveText('Undone · it won’t be ticked off again today.');
  await drink('1,000');
  await expect(notDone(page, title)).toHaveAttribute('aria-pressed', 'false');
});

journey('J072', 'steps tick a habit off once the day reaches its target', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  const title = 'Fictional 6k steps';
  await page.clock.install({time: new Date('2026-10-14T12:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, title);
  await linkToHealth(j, title, 'steps', '6000');
  const walk = async (name: string, steps: string) => {
    await open(page, '/app/health');
    await healthView(page, 'Activity');
    const form = page.getByRole('form', {name: 'Manual activity'});
    await form.getByLabel('Activity name').fill(name);
    await form.getByLabel('Steps').fill(steps);
    await form.getByLabel('Minutes').fill('30');
    await form.getByRole('button', {name: 'Save activity'}).click();
    await expect(page.getByRole('status').filter({hasText: 'Activity saved'})).toContainText('Activity saved');
    await open(page, '/app/habits');
  };
  await walk('Fictional morning walk', '4000');
  await expect(notDone(page, title)).toHaveAttribute('aria-pressed', 'false');
  await walk('Fictional evening walk', '2500');
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, title).locator('.habit-auto-badge')).toContainText('6,500 steps');
});

journey('J074', 'filter habits, then find one by its name', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  const filters = page.getByLabel('Filter habits'), titles = async () => (await page.locator('article.habit-card h2').allTextContents()).sort();
  const choose = async (name: string) => { await filters.getByRole('button', {name, exact: true}).click(); await expect(filters.getByRole('button', {name, exact: true})).toHaveAttribute('aria-pressed', 'true'); };
  await choose('All');
  await expect.poll(titles).toEqual(['Contribute', 'Drink water', 'Exercise', 'Meditate', 'Read', 'Walk']);
  await choose('Completed');
  await expect.poll(titles).toEqual(['Contribute', 'Read', 'Walk']);
  await choose('Goal linked');
  await expect(page.locator('article.habit-card')).toHaveCount(0);
  await expect(page.getByRole('heading', {level: 2, name: 'A little breathing room.'})).toBeVisible();
  // Habits has no search box: under "All" each habit is listed by its own name, so it is found by reading (closest real step).
  await choose('All');
  await expect(card(page, 'Meditate').getByRole('heading', {level: 2, name: 'Meditate'})).toBeVisible();
});

journey('J075', 'a schedule edited mid-streak: past days keep their marks; the change starts tomorrow', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional evening read';
  await page.clock.install({time: new Date('2026-10-14T18:00:00+02:00')});
  await seedHabits(page, logged(title, '2026-10-10', ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']));
  await open(page, '/app/habits');
  await expect(await streak(page, title)).toHaveText('5 days');
  await editHabit(j, title);
  await expect(page.getByLabel('Changes effective from')).toHaveValue('2026-10-15');
  await page.getByRole('button', {name: 'Weekdays only', exact: true}).click();
  await saveHabit(j);
  const c = card(page, title);
  await expect(c.getByText(/^Scheduled change from 2026-10-15/)).toBeVisible();
  await expect(await streak(page, title)).toHaveText('5 days');
  await c.getByText('History & reflection', {exact: true}).click();
  await expect(c.getByRole('group', {name: `${title} completion calendar`}).getByRole('button', {name: /: Complete, 1 of 1$/})).toHaveCount(5);
  await c.getByText('Rule history', {exact: true}).click();
  const rules = c.locator('.habit-rule-history > ul > li');
  await expect(rules).toHaveCount(2);
  await expect(rules.nth(0)).toContainText('2026-10-10');
  await expect(rules.nth(1)).toContainText('2026-10-15');
});

journey('J077', 'Habits with the keyboard only: create, check in, filter, undo, open history', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional keyboard habit';
  // Each control is reached as Tab reaches it (all are in the tab order); every action is a key press.
  const press = async (target: Locator, key = 'Enter') => { await target.focus(); await page.keyboard.press(key); };
  await open(page, '/app/habits');
  await press(page.getByRole('button', {name: '+ New habit', exact: true}));
  await page.getByLabel('Habit title', {exact: true}).focus();
  await page.keyboard.type(title);
  await press(page.getByRole('button', {name: 'Create habit', exact: true}));
  const c = card(page, title);
  await expect(c).toBeVisible();
  await press(notDone(page, title), 'Space');
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  const filters = page.getByLabel('Filter habits');
  await press(filters.getByRole('button', {name: 'Completed', exact: true}));
  await expect(filters.getByRole('button', {name: 'Completed', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(c).toBeVisible();
  await press(filters.getByRole('button', {name: 'All', exact: true}));
  await press(done(page, title));
  await expect(notDone(page, title)).toHaveAttribute('aria-pressed', 'false');
  await expect(c.locator('.habit-count')).toHaveText('0 / 1 time per day');
  const history = c.locator('details.habit-details').filter({has: page.getByText('History & reflection', {exact: true})});
  await press(history.locator(':scope > summary'));
  await expect(history).toHaveAttribute('open', '');
  await expect(c.getByLabel('Day to review')).toBeVisible();
});

journey('J078', 'Habits at 320 px: every control at least 44 px, nothing sideways', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 320, height: 640});
  await open(page, '/app/habits');
  await expect(page.locator('article.habit-card').first()).toBeVisible();
  const small = await page.locator('main').evaluate(main => [...main.querySelectorAll('button, summary, a.text-link')].map(el => {
    const r = el.getBoundingClientRect();
    return {name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 50), w: Math.round(r.width), h: Math.round(r.height)};
  }).filter(t => t.w > 0 && t.h > 0 && (t.w < 44 || t.h < 44)));
  expect(small, 'controls under 44 px').toEqual([]);
  await noSideways(page);
});

journey('J082', 'the habit journal setting (its time zone): a wrong name refused, a right one saved and kept', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  // The charter's "week start, display" do not exist: the journal's one setting is its time zone (closest real step).
  await open(page, '/app/habits');
  const section = page.getByRole('region', {name: 'Habit journal settings'});
  await section.getByText('Habit journal timezone', {exact: true}).click();
  const zone = section.getByLabel('Habit timezone'), save = section.getByRole('button', {name: 'Save Habit timezone', exact: true});
  await expect(zone).toHaveValue('Europe/Brussels');
  await zone.fill('Mars/Olympus_Mons');
  await save.click();
  await expect(section.getByRole('status')).toHaveText('Choose a valid IANA timezone, such as Europe/Brussels.');
  expect((await habits(page))?.timeZone ?? null).toBeNull();
  await zone.fill('America/New_York');
  await save.click();
  await expect(section.getByRole('status')).toHaveText('Habit timezone saved. Existing date-only entries and saved timer timestamps remain unchanged.');
  await expect(section.locator('.habit-privacy')).toContainText('Days use America/New_York.');
  await page.reload();
  await ready(page);
  await expect(page.getByRole('region', {name: 'Habit journal settings'}).locator('.habit-privacy')).toContainText('Days use America/New_York.');
  expect((await habits(page)).timeZone).toBe('America/New_York');
});

journey('J083', 'Habits offline: a check-in is saved on the device and is still there back online', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional offline floss';
  await open(page, '/app/habits');
  await addHabit(j, title);
  await page.context().setOffline(true);
  await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toBeVisible();
  await notDone(page, title).click();
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  expect((await habits(page)).habits[0].entries.map((e: {count: number}) => e.count)).toEqual([1]);
  await page.context().setOffline(false);
  await page.reload();
  await ready(page);
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
});

journey('J084', 'two tabs checking in the same counter habit: both check-ins count', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional shared push-ups';
  await open(page, '/app/habits');
  await addHabit(j, title, '3');
  const other = await page.context().newPage();
  await open(other, '/app/habits');
  await card(page, title).getByRole('button', {name: `Add one to ${title}`}).click();
  await expect(card(page, title).locator('.habit-count')).toHaveText('1 / 3 times per day');
  await card(other, title).getByRole('button', {name: `Add one to ${title}`}).click();
  for (const tab of [page, other]) {
    await tab.reload();
    await ready(tab);
    await expect(card(tab, title).locator('.habit-count')).toHaveText('2 / 3 times per day');
  }
  expect((await habits(page)).habits[0].entries.map((e: {count: number}) => e.count)).toEqual([2]);
  await other.close();
});

journey('J086', 'a habit linked to mindful minutes ticks itself off from a logged session', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional quiet minutes';
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, title);
  await linkToHealth(j, title, 'meditationMinutes', '15');
  await open(page, '/app/health?view=meditation');
  // Mindful minutes done elsewhere this morning (the form offers today at 07:00).
  const form = page.getByRole('form', {name: 'Log mindful minutes'});
  await form.getByLabel('Minutes', {exact: true}).fill('20');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Mindful minutes saved.'}).first()).toBeAttached();
  await open(page, '/app/habits');
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, title).locator('.habit-auto-badge')).toContainText('20 min');
});

journey('J087', 'a habit linked to sleep ticks itself off from last night', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional seven hours';
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, title);
  await linkToHealth(j, title, 'sleepMinutes', '7');
  await open(page, '/app/health?view=sleep');
  // The form offers last night, 23:00 to 07:00: eight hours, saved as it is.
  await page.getByRole('form', {name: 'Log a night or a nap'}).getByRole('button', {name: 'Save', exact: true}).click();
  await open(page, '/app/habits');
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, title).locator('.habit-auto-badge')).toContainText('8 h');
});

journey('J090', 'Habits with reduced motion: a check-in plays no celebratory motion', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional calm habit';
  await page.emulateMedia({reducedMotion: 'reduce'});
  await open(page, '/app/habits');
  await addHabit(j, title);
  await notDone(page, title).click();
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  const moving = () => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect instanceof KeyframeEffect && !!(a.effect.target as Element | null)?.closest('.habits-workspace')).length);
  expect(await moving(), 'nothing moves right after the check-in').toBe(0);
  await expect(done(page, title)).toHaveAttribute('aria-pressed', 'true');
  expect(await moving(), 'nor a moment later').toBe(0);
});
