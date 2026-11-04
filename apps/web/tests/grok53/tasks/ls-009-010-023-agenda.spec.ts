import {readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task} from './helpers';
import {UI_PREFS_KEY} from '../../../lib/ab-design-keys';

/**
 * Session AL (lane L5): LS-009 / P-LS-37 (tasks go into the Agenda's .ics export), LS-010 (a calendar file's to-dos are
 * counted and can be added to Tasks, never dropped silently), LS-023 / P-LS-44 (the Agenda's tick box is 24 px inside a
 * 44 px target), P-LS-10 / C-LS-16 (a task moves to another day with its Move form). 375 px Light and 1280 px, UTC.
 */
test.use({timezoneId: 'UTC'});
const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:e1\r\nDTSTART;VALUE=DATE:20261104\r\nSUMMARY:Fictional swim\r\nEND:VEVENT\r\nBEGIN:VTODO\r\nUID:t1\r\nSUMMARY:Fictional renew the pass\r\nDUE;VALUE=DATE:20261120\r\nEND:VTODO\r\nEND:VCALENDAR\r\n';
test('LS-009: "What goes in" lists Tasks and the file has the task', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await freshTasks(page, {tasks: record([task('task_a', 'Fictional dentist', {due: DAY, time: '10:30'})])});
  await page.goto('/app/agenda?view=week');
  await page.getByRole('button', {name: 'Choose what to export'}).click();
  const choices = page.getByRole('group', {name: 'Export choices'});
  await expect(choices.getByRole('checkbox', {name: /^Tasks/})).toBeChecked();
  await expect(choices).not.toContainText('Nothing to export with these choices.');
  const download = page.waitForEvent('download');
  await choices.getByRole('button', {name: 'Download .ics'}).click();
  const text = readFileSync((await (await download).path())!, 'utf8');
  expect(text).toContain('SUMMARY:Fictional dentist');
});
test('LS-010: a to-do in an .ics file is counted and added to Tasks', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await freshTasks(page);
  await page.goto('/app/agenda');
  const panel = page.getByRole('region', {name: 'Import a calendar'});
  await panel.getByRole('button', {name: 'Choose a calendar file'}).click();
  await panel.getByLabel('Choose an .ics file').setInputFiles({name: 'fictional.ics', mimeType: 'text/calendar', buffer: Buffer.from(ICS)});
  await expect(panel).toContainText('1 to-do in this file is not an event');
  await panel.getByRole('button', {name: 'Add 1 to-do to Tasks'}).click();
  await expect.poll(async () => (await storedTasks(page))?.tasks[0]).toMatchObject({title: 'Fictional renew the pass', due: '2026-11-20'});
});
test('LS-023 at 375 Light: the tick box is at least 24 px; P-LS-10: Move to tomorrow', async ({page}) => {
  await page.setViewportSize({width: 375, height: 800});
  await freshTasks(page, {tasks: record([task('task_a', 'Fictional dentist', {due: DAY})]), extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, theme: 'light'})}});
  await page.goto('/app/agenda?view=day');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const item = page.locator('.agenda-task').filter({hasText: 'Fictional dentist'});
  const box = (await item.getByRole('checkbox').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24); expect(box.height).toBeGreaterThanOrEqual(24);
  const target = (await item.locator('.agenda-task-tick').boundingBox())!;
  expect(target.height).toBeGreaterThanOrEqual(44);
  await item.getByRole('button', {name: 'Move “Fictional dentist” to another day or time'}).click();
  await item.getByRole('button', {name: 'Tomorrow'}).click();
  await expect.poll(async () => (await storedTasks(page))!.tasks[0]!.due).toBe('2026-11-05');
});
