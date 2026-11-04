import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task, toast} from './helpers';

/**
 * Session AL (lane L5): LS-001 / LS-046 / LS-H05 / P-LS-03 (the add line reads days, times, repeats, p1–p4, #project and
 * @label, with "Keep as text"), LS-003 / P-LS-02 (repeats roll forward with Undo), LS-012 / LS-H40 / P-LS-11 (a past day
 * is taken and shows as overdue, never a silent refusal), LS-060 / LS-H44 (a day in another year names it). Fresh profile,
 * 1280 px and 375 px, UTC, fixed clock.
 */
test.use({timezoneId: 'UTC'});
for (const width of [1280, 375]) test(`LS-001/LS-046/P-LS-03 at ${width}: "Pay rent every month on the 1st p1 #Home @bills" and "call mum tomorrow 6pm"`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await freshTasks(page);
  await page.goto('/app/tasks?view=inbox');
  const add = page.getByRole('form', {name: 'Add a task'}), field = add.getByLabel('New task');
  await field.fill('Pay rent every month on the 1st p1 #Home @bills');
  const pieces = add.getByRole('list', {name: 'Read from your line'});
  await expect(pieces.locator('mark')).toHaveText(['every month on the 1st', 'p1', '#Home', '@bills']);
  await expect(add).toContainText('Will add “Pay rent”');
  await expect(add).toContainText('Every month on the 1st');
  await add.getByRole('button', {name: 'Add task'}).click();
  await expect(toast(page)).toContainText('Added “Pay rent”.');
  await expect.poll(async () => (await storedTasks(page))!.tasks[0]).toMatchObject({title: 'Pay rent', due: '2026-12-01', level: 1, priority: 'high', labels: ['bills'], recur: {every: 'month', monthDay: 1}});
  const s = await storedTasks(page);
  expect(s!.projects).toMatchObject([{name: 'Home'}]);
  expect(s!.tasks[0]!.projectId).toBe(s!.projects![0]!.id);
  await expect(page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /^Home/})).toBeVisible();

  await field.fill('call mum tomorrow 6pm');
  await add.getByRole('button', {name: 'Add task'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks.find(t => t.title === 'call mum')).toMatchObject({due: '2026-11-05', time: '18:00'});
  // "Keep as text": a title that names a weekday keeps it.
  await field.fill('Watch Friday Night Lights');
  await add.getByRole('button', {name: 'Keep “Friday” as text'}).click();
  await expect(add).toContainText('Will add “Watch Friday Night Lights”');
  await add.getByRole('button', {name: 'Add task'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks.find(t => t.title === 'Watch Friday Night Lights')?.due).toBeUndefined();
});

test('LS-003/P-LS-02: a repeating task rolls to its next day when ticked, its occurrence is kept, and Undo puts it back', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_rent', 'Fictional rent', {due: DAY, recur: {every: 'month', interval: 1, monthDay: 4}})])});
  await page.goto('/app/tasks');
  const row = page.locator('#task-task_rent');
  await expect(row).toContainText('Every month on the 4th');
  await row.getByRole('checkbox', {name: 'Mark “Fictional rent” done'}).check();
  await expect(toast(page)).toContainText('It comes back on its next day');
  await expect.poll(async () => (await storedTasks(page))!.tasks[0]).toMatchObject({due: '2026-12-04', completions: [{due: DAY}]});
  await toast(page).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks[0]!.due).toBe(DAY);
  expect((await storedTasks(page))!.tasks[0]!.completions).toBeUndefined();
  await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /^Completed/}).click();
  await expect(page.getByText('Nothing finished in the last 30 days.')).toBeVisible();
});

test('LS-012/LS-H40/P-LS-11 and LS-060/LS-H44: a past day is taken (overdue); a day in 2027 names its year', async ({page}) => {
  await freshTasks(page);
  await page.goto('/app/tasks?view=all');
  const add = page.getByRole('form', {name: 'Add a task'});
  await add.getByLabel('New task').fill('Fictional receipts');
  await add.getByRole('button', {name: 'More options', exact: true}).click();
  await add.getByLabel('Due (optional)').fill('2026-11-03');
  await expect(add).toContainText('A past day: it shows as overdue.');
  await add.getByRole('button', {name: 'Add task'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks[0]?.due).toBe('2026-11-03');
  await expect(page.getByRole('list', {name: 'Overdue tasks'})).toContainText('Overdue · ');
  await add.getByLabel('Due (optional)').fill('2027-11-04');
  await add.getByLabel('New task').fill('Fictional renewal');
  await add.getByRole('button', {name: 'Add task'}).click();
  await expect(page.locator('.task').filter({hasText: 'Fictional renewal'})).toContainText('2027');
});
