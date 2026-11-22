import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addProject, addSection, addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #228; Any.do's automations): a project's "Rules and fields" adds rules in plain words;
 * moving a task into "Done" marks it done, and ticking a task done makes the next one a week later — each in the same
 * change as what set it off, so one Undo takes back both; a rule that makes no sense is refused in words — at 390 and 1440
 * in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23', P = 'project_fictional-garden';
let seeded = addSection(addSection(addProject(emptyTasks(), {name: 'Fictional garden'}, P), P, 'Doing', 'section_doing'), P, 'Done', 'section_done');
seeded = addTask(seeded, {title: 'Prune the fictional roses', projectId: P, sectionId: 'section_doing'}, {id: 'task_roses', at, today});
seeded = addTask(seeded, {title: 'Mow the fictional lawn', projectId: P}, {id: 'task_lawn', at, today});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}') as {tasks: {id: string; title: string; sectionId?: string; doneAt?: string; due?: string}[]; projects: {rules?: unknown[]}[]});

for (const theme of THEMES) test(`${theme}: project rules run with the change, one Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto(`/app/tasks?view=project:${P}`); await settle(page);
  await page.getByRole('button', {name: 'Rules and fields'}).click();
  const rules = page.getByRole('group', {name: 'Rules', exact: true});
  await expect(rules).toContainText('No rules yet.');
  // Refused in words: a section rule with no section.
  await rules.getByRole('combobox', {name: 'When'}).selectOption({label: 'A task enters a section'});
  await rules.getByRole('combobox', {name: 'Then'}).selectOption({label: 'Mark it done'});
  await rules.getByRole('button', {name: 'Add rule'}).click();
  await expect(rules.getByRole('alert')).toHaveText('Choose the section the rule watches.');
  await rules.getByRole('combobox', {name: 'Section'}).selectOption({label: 'Done'});
  await rules.getByRole('button', {name: 'Add rule'}).click();
  await rules.getByRole('combobox', {name: 'When'}).selectOption({label: 'A task here is done'});
  await rules.getByRole('combobox', {name: 'Then'}).selectOption({label: 'Create the next one'});
  await rules.getByRole('textbox', {name: 'Due after (days, optional)'}).fill('7');
  await rules.getByRole('button', {name: 'Add rule'}).click();
  await expect(rules.getByRole('list', {name: 'Rules of “Fictional garden”'}).getByRole('listitem')).toHaveText([
    /^When a task enters “Done”, mark it done\.Remove$/, /^When a task is done, create the next one, due 7 days later\.Remove$/,
  ]);
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);

  // Into "Done" by the editor: the rule marks it done in the same change.
  const roses = page.locator('li.task').filter({hasText: 'Prune the fictional roses'});
  await roses.getByRole('button', {name: 'Edit “Prune the fictional roses”'}).click();
  await roses.getByRole('combobox', {name: 'Section'}).selectOption({label: 'Done'});
  await roses.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.id === 'task_roses')).toMatchObject({sectionId: 'section_done', doneAt: expect.any(String)});
  await expect(page.locator('.aa-toast').first()).toContainText('A rule in “Fictional garden” marked “Prune the fictional roses” done.');
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.id === 'task_roses')).toMatchObject({sectionId: 'section_doing'});
  expect((await stored(page)).tasks.find(t => t.id === 'task_roses')!.doneAt).toBeUndefined();

  // Done by the box: the next one, a week later.
  await page.getByRole('checkbox', {name: 'Mark “Mow the fictional lawn” done'}).check();
  await expect.poll(async () => (await stored(page)).tasks.filter(t => t.title === 'Mow the fictional lawn' && !t.doneAt).map(t => t.due)).toEqual(['2026-11-30']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
