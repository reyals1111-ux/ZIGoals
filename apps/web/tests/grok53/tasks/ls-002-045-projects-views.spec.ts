import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task, toast} from './helpers';

/**
 * Session AL (lane L5): LS-002 / LS-071 / LS-076 / LS-H21 / C-LS-02…07 / P-LS-01 (projects with colours and sections,
 * subtasks with progress, labels, notes) and LS-045 / C-LS-10…15 / P-LS-06 (Inbox, Today, Upcoming, a project's list and
 * board, labels, priority, overdue, completed; ?view= honoured; filters with operators, saved). Fresh profile, 1280 px.
 */
test.use({timezoneId: 'UTC'});
test('P-LS-01: a project with a colour and a section, a subtask with progress, a board, a label view and a saved filter', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await freshTasks(page);
  await page.goto('/app/tasks');
  const nav = page.getByRole('navigation', {name: 'Task views'});
  await nav.getByRole('button', {name: '+ Add a project'}).click();
  await nav.getByLabel('Project name').fill('Fictional Garden');
  await nav.getByLabel('Colour').selectOption('green');
  await nav.getByRole('button', {name: 'Add project'}).click();
  await nav.getByRole('button', {name: /^Fictional Garden/}).click();
  await expect(page).toHaveURL(/view=project%3A|view=project:/);
  await page.getByRole('button', {name: '+ Add a section'}).click();
  await page.getByLabel('Section name').fill('Beds');
  await page.getByRole('button', {name: 'Add section'}).click();
  const add = page.getByRole('form', {name: 'Add a task'});
  await add.getByLabel('New task').fill('Fictional dig the bed @outside p2');
  await add.getByRole('button', {name: 'Add task'}).click();
  await expect.poll(async () => (await storedTasks(page))?.tasks[0]).toMatchObject({title: 'Fictional dig the bed', level: 2, labels: ['outside']});
  const row = page.locator('.task').filter({hasText: 'Fictional dig the bed'}).first();
  await row.getByRole('checkbox', {name: 'Mark “Fictional dig the bed” done'}).focus();
  await row.getByRole('button', {name: 'Add a subtask'}).click();
  await row.getByPlaceholder('Add a subtask').fill('Fictional buy compost');
  await row.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(row.getByLabel('0 of 1 subtasks done')).toBeVisible();
  await expect.poll(async () => (await storedTasks(page))!.tasks.find(t => t.title === 'Fictional buy compost')?.parentId).toBe((await storedTasks(page))!.tasks[0]!.id);
  await page.getByRole('group', {name: 'Layout'}).getByRole('button', {name: 'Board'}).click();
  await expect(page.getByRole('region', {name: 'Board'})).toBeVisible();
  await expect(page.getByRole('region', {name: /^Beds/})).toBeVisible();
  await nav.getByRole('button', {name: /^@outside/}).click();
  await expect(page.getByRole('heading', {name: /@outside/})).toBeVisible();
  await page.getByLabel('Filter').fill('p2 & @outside');
  await page.getByLabel('Save this filter as').fill('Fictional outside');
  await page.getByRole('button', {name: 'Save filter'}).click();
  await expect(nav.getByRole('button', {name: /^Fictional outside/})).toBeVisible();
  expect((await storedTasks(page))!.filters).toMatchObject([{name: 'Fictional outside', query: 'p2 & @outside'}]);
});
test('P-LS-06/LS-045: ?view= is honoured; Today shows overdue first; Upcoming by day; Completed has Undo', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await freshTasks(page, {tasks: record([task('task_late', 'Fictional late', {due: '2026-11-01'}), task('task_today', 'Fictional today', {due: DAY}), task('task_next', 'Fictional next', {due: '2026-11-06'}), task('task_none', 'Fictional someday')])});
  await page.goto('/app/tasks?view=upcoming');
  await expect(page.getByRole('heading', {level: 2, name: /^Upcoming/})).toBeVisible();
  await expect(page.locator('.tasks-main .task-title')).toHaveText(['Fictional today', 'Fictional next']);
  await page.goto('/app/tasks?view=today');
  await expect(page.locator('.tasks-main .task-title')).toHaveText(['Fictional late', 'Fictional today']);
  await page.getByRole('checkbox', {name: 'Mark “Fictional today” done'}).check();
  await page.goto('/app/tasks?view=completed');
  await expect(page.locator('.tasks-main')).toContainText('Fictional today');
  await page.getByRole('checkbox', {name: 'Mark “Fictional today” not done'}).uncheck();
  await expect(toast(page)).toContainText('is open again');
  await expect.poll(async () => (await storedTasks(page))!.tasks.find(t => t.id === 'task_today')!.doneAt).toBeUndefined();
  await page.goto('/app/tasks?view=calendar');
  await expect(page.getByRole('heading', {level: 2, name: /^Upcoming/})).toBeVisible();
});
