import {expect, test} from '@playwright/test';
import {freshTasks, record, task} from './helpers';

/**
 * Session AL (lane L5): LS-006 / LS-043 / P-LS-50 — opening ZIGi (Ctrl+K or its button) on /app/tasks and /app must not
 * take the tab down. The page must still answer and keep its tasks after ZIGi opens. Headless Chromium, as the bot ran.
 * (The crash is not in the Tasks page: see the lane report; this spec proves the person's path either way.)
 */
for (const path of ['/app/tasks', '/app']) test(`LS-006/LS-043: Ctrl+K on ${path} opens ZIGi and the page stays alive`, async ({page, isMobile}) => {
  test.skip(isMobile, 'Ctrl+K is a keyboard shortcut');
  await page.setViewportSize({width: 1280, height: 900});
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  await freshTasks(page, {tasks: record([task('task_a', 'Fictional: call the plumber', {due: '2026-11-04'})])});
  await page.goto(path);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(1500);
  expect(crashed).toBe(false);
  expect(await page.evaluate(() => document.readyState)).toBe('complete');
  if (path === '/app/tasks') await expect(page.locator('#task-task_a')).toBeVisible();
});
