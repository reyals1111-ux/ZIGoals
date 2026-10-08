import {expect, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, saveHabitTimezone, type HabitData, type HabitInput} from '../lib/habits';
import {journey, open, ready, snap, type Journey} from './kit';

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
  await region.getByRole('button', {name: 'Done', exact: true}).click();
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
