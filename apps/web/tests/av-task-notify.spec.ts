import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {openAllSettingsGroups} from './settings-open';

/**
 * Session AV, owner follow-up 1 (F-TASK-NOTIFY; Todoist, TickTick, Things): task reminders join "What to be told about" in
 * Settings → Notifications: on by default, said in words, kept on this device when switched off; the card stays axe-clean
 * and fits at 320 px, in Nebula, Light and Dark. The plan and the worker's words are unit-tested
 * (lib/notify/av-task-notify.test.ts). Fictional data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: the Task reminders switch, on by default, off kept on the device`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings#notifications'); await settle(page); await openAllSettingsGroups(page);
  const card = page.locator('#notifications');
  const types = card.getByRole('group', {name: 'What to be told about'});
  const tasks = types.getByRole('switch', {name: /^Task reminders/});
  await expect(tasks).toBeVisible();
  await expect(tasks).toHaveAttribute('aria-checked', 'true');
  await expect(types).toContainText('At each reminder you set on a task, with Snooze 1 h');
  await expect(card).toContainText('Your habits, tasks, water');
  await tasks.click();
  await expect(tasks).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:notify:v1') ?? '{}').types?.tasks)).toBe(false);
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
