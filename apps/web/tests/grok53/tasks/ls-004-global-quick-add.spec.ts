import {expect, test} from '@playwright/test';
import {freshTasks, storedTasks, toast} from './helpers';

/**
 * Session AL (lane L5): LS-004 / N-LS-03 / C-LS-27 / P-LS-04 — the global Quick add knows a to-do from a food log: "call
 * mom tomorrow at 5pm" previews a task (never "Breakfast … AI estimate"), Add task saves it to Tasks with Undo in the
 * toast; "task buy milk" and "Remind me to floss at 21:00" too; a Task row opens Tasks. 375 px, fresh profile, UTC.
 */
test.use({timezoneId: 'UTC'});
test('LS-004: "call mom tomorrow at 5pm" in Quick add is a task, saved with Undo; never a food log', async ({page}) => {
  await page.setViewportSize({width: 375, height: 800});
  await freshTasks(page);
  await page.goto('/app');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.locator('.quick-add-trigger:visible').first().click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  // The line's form is named "Type a line" too (other specs find it by that name), so getByLabel matched both: the field by role.
  const line = dialog.getByRole('textbox', {name: 'Type a line'});
  await line.fill('call mom tomorrow at 5pm');
  await dialog.getByRole('button', {name: 'Preview'}).click();
  await expect(dialog).toContainText('Will add a task: “call mom”');
  await expect(dialog).not.toContainText(/Breakfast|AI estimate/i);
  await dialog.getByRole('button', {name: 'Add task'}).click();
  await expect(toast(page)).toContainText('Task added: “call mom”');
  await expect.poll(async () => (await storedTasks(page))?.tasks[0]).toMatchObject({title: 'call mom', due: '2026-11-05', time: '17:00'});
  await toast(page).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await storedTasks(page))?.tasks.length).toBe(0);
  for (const [typed, title] of [['task buy milk', 'buy milk'], ['Remind me to floss at 21:00', 'floss']] as const) {
    await line.fill(typed);
    await dialog.getByRole('button', {name: 'Preview'}).click();
    await expect(dialog).toContainText(`Will add a task: “${title}”`);
  }
  await expect(dialog.getByRole('link', {name: /^Task/})).toHaveAttribute('href', '/app/tasks?add=1');
});
