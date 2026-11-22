import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #227; Any.do's imports): Tasks → Import / export reads a Trello board export (JSON)
 * and an Asana project CSV on the device: a preview says what comes in (into which project) and what is left out
 * (archived cards, finished ones, the people tasks were assigned to); Add to Tasks makes the project with its sections and
 * subtasks; Undo takes it back — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const trello = JSON.stringify({id: 'b1', name: 'Fictional kitchen redo', lists: [{id: 'l1', name: 'To do', closed: false, pos: 1}, {id: 'l2', name: 'Doing', closed: false, pos: 2}],
  cards: [{id: 'c1', name: 'Pick the fictional tiles', desc: 'Matte', idList: 'l1', closed: false, due: '2026-11-27T15:30:00.000Z', dueComplete: false, labels: [{name: 'Shop'}], pos: 1, idMembers: ['m1']},
    {id: 'c2', name: 'Measure the fictional walls', idList: 'l2', closed: false, pos: 1}, {id: 'c3', name: 'Old card', idList: 'l1', closed: true, pos: 2}],
  checklists: [{id: 'k1', idCard: 'c2', pos: 1, checkItems: [{id: 'i1', name: 'North wall', state: 'incomplete', pos: 1}]}]});
const asana = ['Task ID,Created At,Completed At,Last Modified,Name,Section/Column,Assignee,Assignee Email,Start Date,Due Date,Tags,Notes,Projects,Parent task',
  '1,2026-11-01,,2026-11-01,Book the fictional venue,Planning,Sam Fictional,,,2026-12-01,,,Fictional launch,',
  '2,2026-11-01,,2026-11-01,Call the fictional caterer,Planning,,,,,,,Fictional launch,Book the fictional venue'].join('\r\n');
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}') as {tasks: {title: string; parentId?: string; due?: string; time?: string}[]; projects?: {name: string}[]; sections?: {name: string}[]});

for (const theme of THEMES) test(`${theme}: a Trello board and an Asana project come in, with Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => { localStorage.setItem('zigoals:tasks:v1', JSON.stringify({version: 1, tasks: []})); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app/tasks?view=inbox'); await settle(page);
  await page.getByRole('button', {name: 'Import / export'}).click();
  const panel = page.getByRole('group', {name: 'Import and export'});
  const file = panel.getByLabel(/Import a Todoist CSV, a TickTick CSV backup, a Trello board \(JSON\), an Asana CSV/);
  await file.setInputFiles({name: 'kitchen.json', mimeType: 'application/json', buffer: Buffer.from(trello)});
  await expect(panel).toContainText('3 tasks to add from the Trello board, into “Fictional kitchen redo”: its lists as sections');
  await expect(panel).toContainText('Left out: 1 archived card; the 1 person tasks were assigned to (Tasks is yours alone: nothing is shared between people).');
  await expect.poll(async () => (await axe(page, panel)).filter(v => v.impact === 'serious' || v.impact === 'critical').length).toBe(0);
  await panel.getByRole('button', {name: 'Add to Tasks'}).click();
  await expect.poll(async () => (await stored(page)).sections?.map(s => s.name)).toEqual(['To do', 'Doing']);
  const after = await stored(page);
  expect(after.tasks.find(t => t.title === 'Pick the fictional tiles')).toMatchObject({due: '2026-11-27', time: '16:30'});
  expect(after.tasks.find(t => t.title === 'North wall')?.parentId).toBeTruthy();
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await stored(page)).tasks.length).toBe(0);

  await file.setInputFiles({name: 'launch.csv', mimeType: 'text/csv', buffer: Buffer.from(asana)});
  await expect(panel).toContainText('2 tasks to add from Asana, into “Fictional launch”');
  await panel.getByRole('button', {name: 'Add to Tasks'}).click();
  await expect.poll(async () => (await stored(page)).projects?.map(p => p.name)).toContain('Fictional launch');
  expect((await stored(page)).tasks.find(t => t.title === 'Call the fictional caterer')?.parentId).toBeTruthy();
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
