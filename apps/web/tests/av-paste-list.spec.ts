import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-PASTE-LIST; Todoist's Quick Add): a pasted list becomes one task per line — each line
 * read as the task line reads it, shown before anything is added, then added in one go with one Undo, or kept as one
 * task — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api
 * call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const LIST = '- Buy fictional milk tomorrow\n- Call the fictional bank p1\n\n- [ ] Water the plants #Home';
const paste = (page: Page, text: string) => page.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.activeElement!.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); }, text);
const titles = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; due?: string; level?: number; projectId?: string}[]).map(t => [t.title, t.due ?? null, t.level ?? null, !!t.projectId]));
for (const theme of THEMES) test(`${theme}: three pasted lines become three tasks, with one Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/tasks?view=all'); await settle(page);
  const field = page.getByLabel('New task').first();
  await field.focus();
  await paste(page, LIST);
  const group = page.getByRole('group', {name: /^3 tasks from what you pasted/});
  await expect(group.getByRole('listitem')).toHaveText([/^Buy fictional milk · Tue, Nov 24$/, /^Call the fictional bank · P1/, /^Water the plants · #Home \(a new project\)$/]);
  await expect(field).toHaveValue('');
  const findings = await axe(page, group);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await group.getByRole('button', {name: 'Add 3 tasks'}).click();
  await expect.poll(() => titles(page)).toEqual([['Buy fictional milk', '2026-11-24', null, false], ['Call the fictional bank', null, 1, false], ['Water the plants', null, null, true]]);
  await expect(group).toHaveCount(0);
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => titles(page)).toEqual([]);
  // Kept as one task: the lines join in the field, nothing is added until Add task.
  await field.focus();
  await paste(page, 'Plan the fictional trip\nbook the train');
  await page.getByRole('group', {name: /^2 tasks from what you pasted/}).getByRole('button', {name: 'Add as one task'}).click();
  await expect(field).toHaveValue('Plan the fictional trip book the train');
  expect(await titles(page)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
