import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addProject, addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #229; Any.do's custom fields): a project's "Rules and fields" adds a number and a
 * choice field; a task's editor fills them (a value that does not fit says why and Save waits); Tasks → Table with the
 * project chosen shows them as columns, sortable — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways
 * scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23', P = 'project_fictional-redo';
let seeded = addProject(emptyTasks(), {name: 'Fictional redo'}, P);
seeded = addTask(seeded, {title: 'Fictional tiles', projectId: P}, {id: 'task_tiles', at, today});
seeded = addTask(seeded, {title: 'Fictional paint', projectId: P}, {id: 'task_paint', at, today});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}') as {tasks: {id: string; fields?: Record<string, unknown>}[]; projects: {fields?: {id: string; name: string; kind: string; options?: string[]}[]}[]});
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: custom fields in the editor and the Table`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto(`/app/tasks?view=project:${P}`); await settle(page);
  await page.getByRole('button', {name: 'Rules and fields'}).click();
  const fields = page.getByRole('group', {name: 'Fields', exact: true});
  await expect(fields).toContainText('No fields yet.');
  await fields.getByRole('textbox', {name: 'Field name'}).fill('Budget');
  await fields.getByRole('combobox', {name: 'It holds'}).selectOption({label: 'Number'});
  await fields.getByRole('button', {name: 'Add field'}).click();
  await fields.getByRole('textbox', {name: 'Field name'}).fill('Room');
  await fields.getByRole('combobox', {name: 'It holds'}).selectOption({label: 'A choice from a list'});
  await fields.getByRole('textbox', {name: 'Choices, separated by commas'}).fill('Kitchen, Hall');
  await fields.getByRole('button', {name: 'Add field'}).click();
  await expect.poll(async () => (await stored(page)).projects[0]!.fields?.map(f => [f.name, f.kind, f.options ?? null])).toEqual([['Budget', 'number', null], ['Room', 'choice', ['Kitchen', 'Hall']]]);
  await clean(page);

  // The editor: a value that does not fit says why; then both are kept.
  const tiles = page.locator('li.task').filter({hasText: 'Fictional tiles'});
  await tiles.getByRole('button', {name: 'Edit “Fictional tiles”'}).click();
  const group = tiles.getByRole('group', {name: 'Project fields'});
  await group.getByRole('textbox', {name: 'Budget'}).fill('lots');
  await tiles.getByRole('button', {name: 'Save'}).click();
  await expect(group.getByRole('alert')).toHaveText('“Budget” is a number, for example 12 or 4.5.');
  await group.getByRole('textbox', {name: 'Budget'}).fill('450');
  await group.getByRole('combobox', {name: 'Room'}).selectOption('Hall');
  await tiles.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => Object.values((await stored(page)).tasks.find(t => t.id === 'task_tiles')?.fields ?? {})).toEqual([450, 'Hall']);
  const paint = page.locator('li.task').filter({hasText: 'Fictional paint'});
  await paint.getByRole('button', {name: 'Edit “Fictional paint”'}).click();
  await paint.getByRole('group', {name: 'Project fields'}).getByRole('textbox', {name: 'Budget'}).fill('80');
  await paint.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => Object.values((await stored(page)).tasks.find(t => t.id === 'task_paint')?.fields ?? {})).toEqual([80]);

  // The Table with the project chosen: the fields are columns, sortable by Budget.
  await page.goto('/app/tasks?view=table'); await settle(page);
  await page.getByRole('combobox', {name: 'Project'}).selectOption({label: 'Fictional redo'});
  const table = page.getByRole('table');
  await table.getByRole('button', {name: 'Budget'}).click();
  await expect(table.getByRole('columnheader', {name: /Budget/})).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('rowheader')).toHaveText(['Fictional paint', 'Fictional tiles']);
  await table.getByRole('button', {name: 'Budget'}).click();
  await expect(table.getByRole('rowheader')).toHaveText(['Fictional tiles', 'Fictional paint']);
  await expect(table.getByRole('row').filter({hasText: 'Fictional tiles'}).getByRole('cell').last()).toHaveText('Hall');
  await clean(page);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
