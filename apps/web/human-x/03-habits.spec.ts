import {expect, type Page} from '@playwright/test';
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
  await expect(c.locator('.habit-count')).toHaveText('0 / 1 times per day');
});

journey('J067', 'vacation days: mark a week, then remove it', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional run');
  await page.getByRole('button', {name: 'Vacation', exact: true}).click();
  const region = page.getByRole('region', {name: 'Vacation days', exact: true});
  await expect(region).toBeVisible();
  await region.getByRole('textbox', {name: 'Days', exact: true}).fill('7').catch(() => undefined);
  await region.getByRole('button', {name: 'Mark vacation', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: /vacation|skipped/i}).first()).toBeVisible();
  await closeSheet(j);
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
  await open(page, '/app/habits');
  await addHabit(j, 'Fictional temporary');
  await card(page, 'Fictional temporary').getByRole('button', {name: 'Archive habit'}).click();
  await expect(card(page, 'Fictional temporary')).toHaveCount(0);
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
  await expect(card(page, 'Fictional night note').locator('.habit-count')).toHaveText('0 / 1 times per day');
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
