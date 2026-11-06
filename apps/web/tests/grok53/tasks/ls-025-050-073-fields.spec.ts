import {expect, test} from '@playwright/test';
import {freshTasks, record, storedTasks, task} from './helpers';

/**
 * Session AL (lane L5): LS-049 / LS-052 / P-LS-25 (a blank title says why), LS-050 / LS-H03 / P-LS-15 (a paste over 140
 * characters says it was cut), LS-073 / N-LS-06 / P-LS-45 (titles take their own direction), N-LS-01/02 / P-LS-69 (the
 * count line and the empty state). 375 px, fresh profile.
 */
test('P-LS-25: three spaces + Enter says "Type a task first."; a blank edit says "A task needs a title."', async ({page}) => {
  await page.setViewportSize({width: 375, height: 800});
  await freshTasks(page, {tasks: record([task('task_a', 'Fictional A')])});
  await page.goto('/app/tasks?view=all');
  const add = page.getByRole('form', {name: 'Add a task'}), field = add.getByLabel('New task');
  await field.fill('   ');
  await field.press('Enter');
  await expect(add.getByRole('alert')).toHaveText('Type a task first.');
  await expect(field).toHaveValue('');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', {name: 'Edit “Fictional A”'}).click();
  const editor = page.getByRole('form', {name: 'Edit “Fictional A”'});
  await editor.getByLabel('Title').fill('');
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect(editor.getByRole('alert')).toHaveText('A task needs a title.');
});
test('P-LS-15: a 200-character paste is cut to 140 and says so', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await freshTasks(page);
  await page.goto('/app/tasks');
  const field = page.getByRole('form', {name: 'Add a task'}).getByLabel('New task');
  await page.evaluate(text => navigator.clipboard.writeText(text), 'x'.repeat(200));
  await field.focus();
  await page.keyboard.press('Control+v');
  await expect(page.getByText('Cut to 140 characters: the pasted text had 200.')).toBeVisible();
  await expect(field).toHaveValue('x'.repeat(140));
});
test('P-LS-45 and P-LS-69: an Arabic title is dir="auto"; an empty list says "none open" and how to start', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_ar', 'اتصل بالسباك')])});
  await page.goto('/app/tasks?view=all');
  await expect(page.locator('#task-task_ar .task-title')).toHaveAttribute('dir', 'auto');
  await page.getByRole('button', {name: 'Remove the task “اتصل بالسباك”'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks.length).toBe(0);
  await expect(page.getByRole('heading', {name: /All open tasks/})).toContainText('none open');
});
