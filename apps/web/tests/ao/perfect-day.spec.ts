import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../ah-helpers';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, type HabitData, type HabitInput} from '../../lib/habits';

/**
 * Session AO (C-DVG-19, AL-COMPETITOR-GAP-087; EARLIER_SCOPE CO4, ADR-033 M42 "later"): Perfect days on Habits (today's
 * count, the run, every past day month by month, read only) and the week grid's Habits cells, which open that day's habits
 * with a link to each habit's own check-in for that day. The day is a test condition (Playwright's clock).
 */
const ZONE = 'Europe/Brussels';
const NOW = new Date('2026-11-12T09:00:00Z'); // Thursday 12 November 2026, 10:00 in Brussels
const at = (date: string) => new Date(`${date}T09:00:00Z`);
const input = (title: string): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}});
const A = 'a0a0a0a0-0000-4000-8000-000000000001', B = 'b0b0b0b0-0000-4000-8000-000000000002';

/** Two daily habits from Monday 2 November: 9–11 Nov both done (perfect), 3 Nov one of two, today one of two so far. */
function journal(): HabitData {
  let d: HabitData = {...emptyHabitData(), timeZone: ZONE};
  d = createHabit(d, input('AO Stretch'), at('2026-11-02'), A);
  d = createHabit(d, input('AO Read'), at('2026-11-02'), B);
  for (const day of ['2026-11-09', '2026-11-10', '2026-11-11']) { d = logHabitValue(d, A, day, 1, {}, NOW); d = logHabitValue(d, B, day, 1, {}, NOW); }
  d = logHabitValue(d, A, '2026-11-03', 1, {}, NOW);
  return logHabitValue(d, A, '2026-11-12', 1, {}, NOW);
}
const stored = (page: Page) => page.evaluate(k => localStorage.getItem(k), HABITS_KEY);

test.use({timezoneId: ZONE});

test('Perfect days: today n of m, the run, a browsable month in words, nothing written by looking; a day opens a habit’s check-in for that day', async ({page}) => {
  await page.clock.install({time: NOW});
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [HABITS_KEY, JSON.stringify(journal())] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const before = await stored(page);

  await page.getByRole('button', {name: 'Open perfect days', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Perfect days', exact: true});
  await expect(panel).toBeVisible();
  await expect(panel.locator('.habit-perfect-today')).toHaveText('Today: 1 of 2 due habits done.');
  await expect(panel).toContainText('Current run: 3 perfect days'); // 9–11 Nov; an unfinished today does not end it
  await expect(panel).toContainText(/Perfect days in Nov.*: 3 of 11 with habits due/);

  // Column headings and a text label per day, not colour alone.
  const grid = panel.getByRole('table');
  await expect(grid.getByRole('columnheader')).toHaveCount(7);
  const day = (n: number) => grid.getByRole('button', {name: new RegExp(`(\\b${n} November|November ${n}\\b).*2026`)}); // either date order
  await expect(day(10)).toHaveAccessibleName(/Perfect day: all 2 due habits done/);
  await expect(day(10)).toContainText('All');
  await expect(day(3)).toHaveAccessibleName(/1 of 2 due habits done/);
  await expect(day(3)).toContainText('1/2');
  await expect(day(4)).toHaveAccessibleName(/No record: 2 due, nothing logged/);
  await expect(day(1)).toHaveAccessibleName(/Nothing due/); // before the habits started: never a miss
  await expect(day(12)).toHaveAccessibleName(/today.*1 of 2 due habits done so far/);
  await expect(day(13)).toBeDisabled();
  for (const n of [3, 10, 12]) { const box = await day(n).boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44); }

  // Browsing: the habits started in November, so there is no earlier month and no later one.
  await expect(panel.getByRole('button', {name: 'Previous month', exact: true})).toBeDisabled();
  await expect(panel.getByRole('button', {name: 'Next month', exact: true})).toBeDisabled();

  await day(3).click();
  const detail = panel.locator('.habit-perfect-detail');
  await expect(detail).toContainText('1 of 2 due habits done.');
  await expect(detail.getByRole('listitem').filter({hasText: 'AO Stretch'})).toContainText('Done');
  await expect(detail.getByRole('listitem').filter({hasText: 'AO Read'})).toContainText('Missed: nothing logged');
  expect(await stored(page)).toBe(before); // looking writes nothing

  // A day's habit opens its own check-in for that day (Habits' History, its own rules).
  await detail.getByRole('link', {name: /Open the check-in for AO Read on/}).click();
  await page.waitForURL(/\/app\/habits\?habit=.*&date=2026-11-03/);
  const editor = page.locator('.habit-day-editor');
  await expect(editor.getByLabel('Day to review')).toHaveValue('2026-11-03');
  await editor.getByLabel('Count for this day').fill('1');
  await editor.getByRole('button', {name: 'Save day', exact: true}).click();
  await expect(editor.getByRole('status')).toHaveText('Day saved.');

  await page.goto('/app/habits?view=perfect-days'); await hydrated(page);
  await expect(page.getByRole('region', {name: 'Perfect days', exact: true}).getByRole('table').getByRole('button', {name: /(\b3 November|November 3\b).*2026/})).toHaveAccessibleName(/Perfect day: all 2 due habits done/);
});

test('the Showcase: Perfect days opens from its link, and a Habits cell in Today’s week grid lists that day’s habits with their check-ins', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'the week grid shows its day cells on wide screens; the phone folds them behind "Show each day"');
  await page.clock.install({time: NOW});
  await offlineApi(page); await freshDevice(page);
  await loadShowcase(page);

  await page.goto('/app/habits?view=perfect-days'); await hydrated(page);
  const panel = page.getByRole('region', {name: 'Perfect days', exact: true});
  await expect(panel.locator('.habit-perfect-today')).toHaveText(/^Today: (nothing is due\.|\d+ of \d+ due habits? done(, a perfect day)?\.)$/);
  await expect(panel).toContainText(/Current run: \d+ perfect days?/);
  await expect(panel.getByRole('table').getByRole('button')).not.toHaveCount(0);

  await page.goto('/app'); await hydrated(page);
  const week = page.getByRole('region', {name: /Your week, all in one orbit/});
  const cell = week.getByRole('button', {name: /^Habit check-ins, .* — show that day's habits to log$/}).last(); // today
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await expect(cell).toHaveAttribute('aria-expanded', 'true');
  const dayPanel = week.getByRole('region', {name: /^Habits on /});
  await expect(dayPanel).toBeVisible();
  const link = dayPanel.getByRole('link', {name: /^(Check in|Change the check-in) for /}).first();
  if (await link.count()) {
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/app\/habits\?habit=[^&]+&date=\d{4}-\d{2}-\d{2}$/);
    await link.click();
    await page.waitForURL(/\/app\/habits\?habit=/);
    await expect(page.locator('.habit-day-editor').getByLabel('Day to review')).toHaveValue(href!.slice(-10));
  } else {
    await expect(dayPanel).toContainText('No habit was due that day.');
  }
});
