import {readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task, toast} from './helpers';

/**
 * Session AL (lane L5): C-LS-23 / C-LS-24 / LS-064 (importer part) / P-LS-37 — import a Todoist CSV (sections, subtasks,
 * priorities, labels, repeats, notes) with one Undo; export every task as spreadsheet-safe CSV. Fresh profile, UTC.
 */
test.use({timezoneId: 'UTC'});
const TODOIST = 'TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE\r\nsection,Kitchen,,,,,,,,\r\ntask,Fictional paint the wall @diy,Use white,1,1,,,every month on the 1st,en,\r\ntask,Fictional buy brushes,,4,2,,,tomorrow 5pm,en,\r\n';
test('P-LS-37: a Todoist CSV comes in as a project with a section, a subtask and its fields; Undo takes it out', async ({page}) => {
  await freshTasks(page);
  await page.goto('/app/tasks');
  await page.getByRole('button', {name: 'Import / export'}).click();
  const panel = page.getByRole('group', {name: 'Import and export'});
  await panel.getByLabel(/Import a Todoist CSV/).setInputFiles({name: 'Fictional_Home.csv', mimeType: 'text/csv', buffer: Buffer.from(TODOIST)});
  await expect(panel).toContainText('2 tasks to add from Todoist, into “Fictional Home”');
  await panel.getByRole('button', {name: 'Add to Tasks'}).click();
  await expect.poll(async () => (await storedTasks(page))?.tasks.length).toBe(2);
  const s = (await storedTasks(page))!;
  expect(s.projects).toMatchObject([{name: 'Fictional Home'}]);
  expect(s.sections).toMatchObject([{name: 'Kitchen'}]);
  expect(s.tasks[0]).toMatchObject({title: 'Fictional paint the wall', level: 1, labels: ['diy'], notes: 'Use white', due: '2026-12-01', recur: {every: 'month', monthDay: 1}});
  expect(s.tasks[1]).toMatchObject({title: 'Fictional buy brushes', parentId: s.tasks[0]!.id, due: '2026-11-05', time: '17:00'});
  await toast(page).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await storedTasks(page))?.tasks.length).toBe(0);
});
test('P-LS-37: Export as CSV keeps a formula-looking title as text', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_x', '=HYPERLINK("http://example.invalid")', {due: DAY})])});
  await page.goto('/app/tasks');
  await page.getByRole('button', {name: 'Import / export'}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export as CSV'}).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`zigoals-tasks-${DAY}.csv`);
  const text = readFileSync((await file.path())!, 'utf8');
  expect(text).toContain('"\'=HYPERLINK(""http://example.invalid"")"');
});
