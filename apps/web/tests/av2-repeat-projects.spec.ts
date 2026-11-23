// Session AV lane 2 (review b2a #7: a repeating project is named with its day as the app writes days, "Nov 23, 2026", deliberate)
import {expect, test} from '@playwright/test';
import {moreViews} from './fr-layout-helpers';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addRepeat} from '../lib/tasks/repeat-projects';
import {BUILT_IN_TEMPLATES, emptyTaskTemplates} from '../lib/tasks/templates';

/**
 * Session AV lane 2 (rest, LEDGER #17; Things' repeating projects): a weekly repeat made last Monday comes round when
 * Tasks opens this Monday (one project, with its tasks); Tasks → Areas and templates lists it with its next day, makes a
 * new repeating project from a template, pauses one and stops one with Undo — at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const reset = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-reset')!;
const seeded = addRepeat(emptyTaskTemplates(), {name: 'Fictional reset', every: 'week', start: '2026-11-16', items: reset.items}, {id: 'repeat_fictional', madeFor: '2026-11-16'});
type Stored = {tasks: {title: string; projectId?: string; due?: string}[]; projects?: {id: string; name: string}[]};
const tasks = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}') as Stored);
const templates = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-templates:v1') ?? '{}') as {repeats?: {name: string; every: string; paused?: boolean; lastMade?: string}[]});
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: a repeating project comes round on open, and is set up, paused and stopped`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:50:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:task-templates:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  // This week's project, made once, its tasks due on its first day.
  await expect.poll(async () => (await tasks(page)).projects?.map(p => p.name)).toEqual(['Fictional reset · Nov 23, 2026']);
  const made = await tasks(page);
  expect(made.tasks.filter(t => t.projectId === made.projects![0]!.id).map(t => t.title)).toEqual(reset.items.map(i => i.title));
  await expect(page.getByText('Made “Fictional reset · Nov 23, 2026”: it comes round every week.')).toBeVisible();
  await expect.poll(async () => (await templates(page)).repeats?.[0]?.lastMade).toBe('2026-11-23');
  // Opened again: nothing new.
  await page.reload(); await settle(page);
  expect((await tasks(page)).projects?.length).toBe(1);

  // (fr-layout; deliberate) on a phone the view sits behind "More views" (FR-L-5): opened first, the same check after.
  await moreViews(page);
  await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /^Areas and templates/}).click(); await settle(page);
  const list = page.getByRole('list', {name: 'Repeating projects'});
  await expect(list).toContainText('Fictional reset');
  await expect(list).toContainText('every week · next on 2026-11-30');
  // Session AV lane 2 (“Template” also matched “Save a project as a template” once a project exists: the exact name, deliberate)
  await page.getByRole('combobox', {name: 'Template', exact: true}).selectOption({label: 'A trip'});
  await page.getByRole('textbox', {name: 'Project name'}).fill('Fictional city trip');
  await page.getByRole('combobox', {name: 'Repeats'}).selectOption({label: 'Every month'});
  await page.getByRole('button', {name: 'Make it and repeat'}).click();
  await expect.poll(async () => (await tasks(page)).projects?.map(p => p.name)).toContain('Fictional city trip · Nov 23, 2026');
  await expect.poll(async () => (await templates(page)).repeats?.map(r => `${r.name}:${r.every}`)).toEqual(['Fictional reset:week', 'Fictional city trip:month']);
  await expect(list).toContainText('every month · next on 2026-12-23');
  await clean(page);

  await list.getByRole('button', {name: 'Pause the repeating project “Fictional reset”'}).click();
  await expect.poll(async () => (await templates(page)).repeats?.[0]?.paused).toBe(true);
  await expect(list).toContainText('every week · paused');
  await list.getByRole('button', {name: 'Stop repeating “Fictional city trip”'}).click();
  await expect.poll(async () => (await templates(page)).repeats?.length).toBe(1);
  // Its project stays; Undo brings the repeat back.
  expect((await tasks(page)).projects?.map(p => p.name)).toContain('Fictional city trip · Nov 23, 2026');
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await templates(page)).repeats?.length).toBe(2);
  await clean(page);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
