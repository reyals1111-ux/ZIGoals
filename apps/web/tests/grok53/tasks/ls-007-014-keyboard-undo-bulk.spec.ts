import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task, toast} from './helpers';

/**
 * Session AL (lane L5): LS-014 / LS-044 / LS-H25 / LS-H09 / P-LS-07 (shortcuts and their "?" sheet, no clash with "/",
 * Ctrl+K (the command menu since Q11), Ctrl+J), LS-051 / LS-072 / P-LS-08 (removals made while the toast shows join one Undo; Ctrl+Z runs it),
 * LS-061 / P-LS-09 (bulk select, Done, Clear done with Undo), LS-H07 / LS-H31 / P-LS-52 (Undo in the app's toast, no
 * blank line), LS-H22 / P-LS-10 (Move up / Move down, Alt+↑/↓). Fresh profile, 1280 px, UTC.
 */
test.use({timezoneId: 'UTC'});
const three = () => record([task('task_a', 'Fictional A', {due: DAY, order: 10}), task('task_b', 'Fictional B', {due: DAY, order: 20}), task('task_c', 'Fictional C', {due: DAY, order: 30})]);
test.beforeEach(async ({page, isMobile}) => { test.skip(isMobile, 'keyboard shortcuts'); await page.setViewportSize({width: 1280, height: 900}); });

test('LS-014/LS-044/P-LS-07: q, ?, j/k, e, 1–4, Enter and Esc on the Tasks page; "/" still opens Search', async ({page}) => {
  await freshTasks(page, {tasks: three()});
  await page.goto('/app/tasks');
  await page.locator('#task-task_a').waitFor();
  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', {name: 'Keyboard shortcuts'});
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Ctrl/⌘+K');
  await expect(sheet).toContainText('Open ZIGi');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await page.keyboard.press('q');
  await expect(page.getByRole('form', {name: 'Add a task'}).getByLabel('New task')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('j');
  await expect(page.locator('#task-task_a')).toBeFocused();
  await page.keyboard.press('j');
  await expect(page.locator('#task-task_b')).toBeFocused();
  await page.keyboard.press('1');
  await expect.poll(async () => (await storedTasks(page))!.tasks.find(t => t.id === 'task_b')).toMatchObject({level: 1, priority: 'high'});
  await page.keyboard.press('e');
  await expect.poll(async () => !!(await storedTasks(page))!.tasks.find(t => t.id === 'task_b')!.doneAt).toBe(true);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await storedTasks(page))!.tasks.find(t => t.id === 'task_b')!.doneAt).toBeUndefined();
  await page.locator('#task-task_a').focus();
  await page.keyboard.press('Enter');
  const editor = page.getByRole('form', {name: 'Edit “Fictional A”'});
  await expect(editor).toBeVisible();
  await editor.getByLabel('Title').press('Escape');
  await expect(editor).toBeHidden();
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog').getByRole('combobox').or(page.getByRole('searchbox'))).toBeVisible();
});

test('LS-051/LS-072/P-LS-08: three quick removals, one Undo puts all three back (also with Ctrl+Z)', async ({page}) => {
  await freshTasks(page, {tasks: three()});
  await page.goto('/app/tasks');
  for (const name of ['A', 'B', 'C']) await page.getByRole('button', {name: `Remove the task “Fictional ${name}”`}).click();
  await expect(toast(page)).toContainText('Removed 3 tasks.');
  await expect.poll(async () => (await storedTasks(page))!.tasks.length).toBe(0);
  await expect(page.locator('.tasks-status:not([data-empty])')).toHaveCount(0);
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await storedTasks(page))!.tasks.map(t => t.id).sort()).toEqual(['task_a', 'task_b', 'task_c']);
  await expect(page.locator('.task')).toHaveCount(3);
});

test('LS-061/P-LS-09 and LS-H22/P-LS-10: select three, Done; Clear done with Undo; Move up by button and Alt+↑', async ({page}) => {
  await freshTasks(page, {tasks: three()});
  await page.goto('/app/tasks?view=inbox');
  await page.getByRole('button', {name: 'Move “Fictional C” up'}).click();
  await expect(page.locator('.tasks-main .task-title')).toHaveText(['Fictional A', 'Fictional C', 'Fictional B']);
  await page.locator('#task-task_b').focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page.locator('.tasks-main .task-title')).toHaveText(['Fictional A', 'Fictional B', 'Fictional C']);
  // Release review AL (RR-18, deliberate): selecting is a mode the list's "Select" turns on (a row shows one box: done, or
  // in this mode, select), so the step presses it first; the selection and the bar below are asserted as before.
  await page.locator('.tasks-main').getByRole('button', {name: 'Select', exact: true}).click();
  await expect(page.getByRole('checkbox', {name: /^Mark “Fictional/})).toHaveCount(0);
  await page.getByRole('checkbox', {name: 'Select “Fictional A”'}).check();
  await page.getByRole('checkbox', {name: 'Select “Fictional C”'}).click({modifiers: ['Shift']});
  const bar = page.getByRole('toolbar', {name: '3 selected'});
  await expect(bar).toBeVisible();
  await bar.getByRole('button', {name: 'Done'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks.filter(t => t.doneAt).length).toBe(3);
  await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /^Completed/}).click();
  await page.getByRole('button', {name: 'Clear done (3)'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks.length).toBe(0);
  await toast(page).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks.length).toBe(3);
});
