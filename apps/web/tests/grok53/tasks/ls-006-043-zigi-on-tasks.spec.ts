import {expect, test} from '@playwright/test';
import {freshTasks, record, task} from './helpers';

/**
 * Session AL (lane L5): LS-006 / LS-043 / P-LS-50 — opening ZIGi (its keys or its button) on /app/tasks and /app must not
 * take the tab down. The page must still answer and keep its tasks after ZIGi opens. Headless Chromium, as the bot ran.
 * (The crash is not in the Tasks page: see the lane report; this spec proves the person's path either way.)
 */
// Session AL (Q11, deliberate): ⌘/Ctrl+K opens the command menu (Ask ZIGi is its first row); ZIGi's own key is ⌘/Ctrl+Shift+Z.
// Both ways in are pressed here (was: Ctrl+K alone), and ZIGi's panel is checked open.
for (const path of ['/app/tasks', '/app']) test(`LS-006/LS-043: Ctrl+Shift+Z, and Ctrl+K then Enter, on ${path} open ZIGi and the page stays alive`, async ({page, isMobile}) => {
  test.skip(isMobile, 'keyboard shortcuts');
  await page.setViewportSize({width: 1280, height: 900});
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  await freshTasks(page, {tasks: record([task('task_a', 'Fictional: call the plumber', {due: '2026-11-04'})])});
  await page.goto(path);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('dialog.ai-chat[open]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.ai-chat[open]')).toHaveCount(0);
  await page.locator('body').press('Control+k');
  await expect(page.getByRole('dialog', {name: 'Command menu'})).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog.ai-chat[open]')).toHaveCount(1);
  await page.waitForTimeout(1500);
  expect(crashed).toBe(false);
  expect(await page.evaluate(() => document.readyState)).toBe('complete');
  if (path === '/app/tasks') await expect(page.locator('#task-task_a')).toBeVisible();
});
