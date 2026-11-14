import {expect, test} from '@playwright/test';
import {TODAY, seeded, stored, tasksRecord} from './ap-fixtures';

/**
 * Session AP (owner-approved feature list, time-blocking): the Agenda's day by the hour. "By the hour" loads the grid on
 * demand; a task moves to an hour by its "Move to…" picker (keyboard) or by dragging it (pointer), which writes the
 * task's existing day and time (and nothing else) with Undo; the day says its load. Draft for the integrator to run.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TASKS = tasksRecord([
  {id: 'ap-report', title: 'Fictional report draft', due: TODAY},
  {id: 'ap-call', title: 'Fictional call', due: TODAY, time: '09:00'},
]);
type Stored = {tasks: {id: string; due?: string; time?: string; title: string}[]};
const task = async (page: Parameters<typeof stored>[0], id: string) => (await stored<Stored>(page, 'zigoals:tasks:v1'))!.tasks.find(t => t.id === id)!;

test('the grid loads on demand; "Move to…" gives a task a time; the load counts timed items', async ({page}) => {
  await seeded(page, {'zigoals:tasks:v1': TASKS}, '/app/agenda?view=day');
  await expect(page.locator('.agenda-page[data-agenda="ready"]')).toBeVisible();
  // The list view says the day's load before the grid is opened.
  await expect(page.locator('.agenda-load').first()).toHaveText('1 item at a set time');
  const toggle = page.getByRole('button', {name: 'By the hour', exact: true});
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const grid = page.locator('.agenda-hours');
  await expect(grid.getByRole('heading', {name: /^By the hour/})).toContainText('1 item at a set time');
  await expect(grid.locator('.agenda-hour[data-hour="9"]')).toContainText('Fictional call');
  await expect(grid.locator('.agenda-hours-waiting')).toContainText('Fictional report draft');
  // The keyboard way: Move to… → 14:00 → Move.
  const move = grid.getByRole('button', {name: 'Move “Fictional report draft” to another time'});
  await move.focus(); await page.keyboard.press('Enter');
  const form = grid.getByRole('form', {name: 'Move “Fictional report draft” to a time'});
  await form.getByRole('combobox', {name: 'Time'}).selectOption('14:00');
  await form.getByRole('button', {name: 'Move', exact: true}).click();
  await expect(grid.locator('.agenda-hour[data-hour="14"]')).toContainText('Fictional report draft');
  await expect(grid.getByRole('heading', {name: /^By the hour/})).toContainText('2 items at a set time');
  const moved = await task(page, 'ap-report');
  expect([moved.due, moved.time, moved.title]).toEqual([TODAY, '14:00', 'Fictional report draft']);
  // Undo puts the task back without a time.
  await page.locator('.aa-toast').last().getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await task(page, 'ap-report')).time).toBeUndefined();
});

test('dragging a task onto an hour writes that hour; nothing else changes', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'HTML drag and drop needs a mouse; the phone uses Move to… (above)');
  await seeded(page, {'zigoals:tasks:v1': TASKS}, '/app/agenda?view=day');
  await expect(page.locator('.agenda-page[data-agenda="ready"]')).toBeVisible();
  await page.getByRole('button', {name: 'By the hour', exact: true}).click();
  const grid = page.locator('.agenda-hours');
  await grid.locator('.agenda-hour-item', {hasText: 'Fictional call'}).dragTo(grid.locator('.agenda-hour[data-hour="11"]'));
  await expect(grid.locator('.agenda-hour[data-hour="11"]')).toContainText('Fictional call');
  const moved = await task(page, 'ap-call');
  expect([moved.due, moved.time]).toEqual([TODAY, '11:00']);
  expect(await task(page, 'ap-report')).toMatchObject({due: TODAY});
  expect((await task(page, 'ap-report')).time).toBeUndefined();
});
