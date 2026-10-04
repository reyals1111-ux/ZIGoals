import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY, type HabitData} from '../lib/habits';
import {isPhone} from './phone-nav';

// H1 (Session P): planned skips and vacation days; a skipped day never breaks a streak and keeps reminders quiet.
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const stored = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS_KEY))!) as HabitData;
async function addHabit(page: Page, title: string) {
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}

test('plan a skip for tomorrow, see it in the list and the calendar, then remove it', async ({page}) => {
  await page.goto('/app/habits');
  await addHabit(page, 'Stretch');
  const card = page.getByRole('article', {name: 'Stretch', exact: true});
  await card.getByRole('button', {name: 'Complete Stretch', exact: true}).click();
  await expect(card.locator('.habit-count')).toHaveText('1 / 1 time per day');
  await card.getByText('History & reflection', {exact: true}).click();
  await card.getByRole('button', {name: 'Plan a skip', exact: true}).click();
  const form = card.getByRole('form', {name: 'Plan a skip for Stretch'});
  await form.getByLabel('Day to skip').fill('2026-09-16');
  await form.getByLabel('Reason (optional)').fill('Trip');
  await form.getByRole('button', {name: 'Save skip', exact: true}).click();
  await expect(card.getByRole('status')).toContainText('Skip planned for Wednesday, September 16, 2026.');
  await expect(card.getByRole('list', {name: 'Planned skips for Stretch'})).toContainText('Planned: 2026-09-16 · Trip');
  const planned = (await stored(page)).habits[0]!.entries.find(e => e.date === '2026-09-16')!;
  expect(planned).toMatchObject({disposition: 'skipped', count: 0});
  expect(planned.note).toMatch(/^Planned skip/); expect(planned.note).toContain('Trip');
  await expect(card.getByRole('button', {name: /^September 16, 2026: Planned skip/})).toBeVisible();
  await card.getByRole('button', {name: 'Remove the planned skip on 2026-09-16', exact: true}).click();
  await expect(card.getByRole('status')).toContainText('Planned skip on Wednesday, September 16, 2026 removed.');
  expect((await stored(page)).habits[0]!.entries.map(e => e.date)).toEqual(['2026-09-15']);
});

test('Showcase: the Exercise card lists the fictional planned skip and the Walk streak counts its logged days only', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/habits');
  const exercise = page.getByRole('article', {name: 'Exercise', exact: true});
  await exercise.getByText('History & reflection', {exact: true}).click();
  await expect(exercise.getByRole('list', {name: 'Planned skips for Exercise'})).toContainText('SHOWCASE DATA · fictional travel day');
  const walk = page.getByRole('article', {name: 'Walk', exact: true});
  await walk.getByText('Consistency & trends', {exact: true}).click();
  await expect(walk).toContainText('Current streak');
  await expect(walk.locator('.habit-metrics > div').filter({hasText: 'Current streak'}).locator('strong')).toContainText('27 days');
});

test('vacation days keep the streak and the reminders quiet, and clear exactly their own entries', async ({page}) => {
  await page.goto('/app/habits');
  await addHabit(page, 'Stretch');
  await addHabit(page, 'Read');
  await page.getByRole('button', {name: 'Edit Stretch', exact: true}).click();
  await page.getByLabel('Reminder time — on this device').fill('08:00');
  await page.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Stretch', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Vacation', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Vacation days', exact: true});
  await expect(panel).toBeVisible();
  const from = panel.getByLabel('From', {exact: true}), to = panel.getByLabel('To', {exact: true});
  await from.fill('2026-09-15'); await to.fill('2026-09-17');
  if (await isPhone(page)) {
    await expect(page.getByRole('dialog', {name: 'Vacation days'})).toBeVisible();
    expect(await from.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
    expect((await panel.getByRole('button', {name: 'Mark vacation', exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await panel.getByRole('button', {name: 'Mark vacation', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('Vacation marked for 2 habits, 3 days.');
  const marked = await stored(page);
  for (const habit of marked.habits) expect(habit.entries.filter(e => e.note === 'Vacation').map(e => e.date)).toEqual(['2026-09-15', '2026-09-16', '2026-09-17']);
  // The next day, after the reminder time: nothing to remind.
  await page.clock.setSystemTime(new Date('2026-09-16T19:00:00.000Z'));
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Reminders on this device'})).toHaveCount(0);
  await page.goto('/app/habits');
  await expect(page.getByRole('article', {name: 'Stretch', exact: true})).toContainText('Skipped');
  await page.getByRole('button', {name: 'Vacation', exact: true}).click();
  await page.getByRole('region', {name: 'Vacation days', exact: true}).getByLabel('From', {exact: true}).fill('2026-09-16');
  await page.getByRole('region', {name: 'Vacation days', exact: true}).getByLabel('To', {exact: true}).fill('2026-09-17');
  await page.getByRole('region', {name: 'Vacation days', exact: true}).getByRole('button', {name: 'Mark vacation', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Vacation days', exact: true}).getByRole('status')).toContainText('Vacation marked');
  await page.getByRole('button', {name: 'Clear vacation days', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Vacation days', exact: true}).getByRole('status')).toContainText('Vacation days cleared.');
  const cleared = await stored(page);
  for (const habit of cleared.habits) expect(habit.entries.filter(e => e.note === 'Vacation' && e.date >= '2026-09-16')).toEqual([]);
});
