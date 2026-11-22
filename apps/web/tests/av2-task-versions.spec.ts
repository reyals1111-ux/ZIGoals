import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (rest, LEDGER #33; Notion's version history, for a task): a saved change to a task's title and notes
 * keeps what it said before under "Earlier versions" in its editor; the version is read, restored (Undo), deleted (Undo)
 * and all earlier versions deleted — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Write the fictional letter', notes: 'Dear fictional council'}, {id: 'task_letter', at, today: '2026-11-23'});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; notes?: string}[]);
const versions = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}').versions ?? []) as {title: string; notes?: string}[]);
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: a task's earlier versions are kept, restored and deleted`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:40:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?task=task_letter'); await settle(page);
  let editor = page.getByRole('form', {name: 'Edit “Write the fictional letter”'});
  // Empty state teaches.
  await editor.locator('details.task-versions-fold > summary').click();
  await expect(editor.locator('.task-versions-fold')).toContainText('what it said before is kept here, up to ten versions');
  await editor.getByRole('textbox', {name: 'Title'}).fill('Send the fictional letter');
  await editor.getByRole('textbox', {name: 'Notes'}).fill('Dear fictional council, a second try');
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => (await versions(page)).map(v => `${v.title}|${v.notes}`)).toEqual(['Write the fictional letter|Dear fictional council']);

  // Open it again: the version is there to read and restore.
  await page.goto('/app/tasks?task=task_letter'); await settle(page);
  editor = page.getByRole('form', {name: 'Edit “Send the fictional letter”'});
  await editor.locator('details.task-versions-fold > summary').click();
  const list = editor.locator('.task-versions-list');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await list.locator('summary').first().click();
  await expect(list).toContainText('Dear fictional council');
  await clean(page);
  await list.getByRole('button', {name: /^Restore the version of /}).click();
  await expect.poll(async () => (await stored(page))[0]).toMatchObject({title: 'Write the fictional letter', notes: 'Dear fictional council'});
  // The words it replaced are kept too.
  await expect.poll(async () => (await versions(page)).map(v => v.title)).toEqual(['Write the fictional letter', 'Send the fictional letter']);

  await page.goto('/app/tasks?task=task_letter'); await settle(page);
  editor = page.getByRole('form', {name: 'Edit “Write the fictional letter”'});
  await editor.locator('details.task-versions-fold > summary').click();
  await expect(editor.locator('.task-versions-list').getByRole('listitem')).toHaveCount(2);
  await editor.locator('.task-versions-list summary').first().click();
  await editor.getByRole('button', {name: /^Delete the version of /}).first().click();
  await expect.poll(async () => (await versions(page)).length).toBe(1);
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await versions(page)).length).toBe(2);
  await editor.getByRole('button', {name: 'Delete all earlier versions'}).click();
  await expect.poll(async () => (await versions(page)).length).toBe(0);
  await expect(editor.locator('.task-versions-fold')).toContainText('what it said before is kept here');
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
