import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks, LEDGER #1, #3, #11, #15, #31; Todoist, TickTick, Notion): "!2h" and "!18:30" in the Tasks
 * line, a reminder at its own date and time in the editor, "Start focus" on a reminder that has gone off, a long line
 * offered as several tasks, a countdown that counts the days since, and a reminder written in a note — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Call the fictional bank', due: '2026-11-23', time: '09:00', reminders: [{before: 0, at: '2026-11-23T08:30'}]}, {id: 'task_fictional-bank', at, today: '2026-11-23'});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; due?: string; time?: string; reminders?: {before: number; at?: string}[]}[]);
const noSideways = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const theme of THEMES) test(`${theme}: reminders in the line and the editor, Start focus, the split offer`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:40:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  // The reminder at its own time (08:30) has gone off: Done, Start focus, Snooze, Dismiss.
  const rows = page.getByRole('list', {name: 'Reminders that have gone off'});
  await expect(rows.getByRole('listitem')).toHaveCount(1);
  await rows.getByRole('button', {name: 'Start focus on “Call the fictional bank”'}).click();
  await expect(page.locator('.tasks-focus')).toBeVisible();
  // "!2h" in the line: read as a reminder piece, said in the preview, saved on the task.
  const field = page.getByRole('textbox', {name: 'New task'}).first();
  await field.fill('Pay the fictional rent tomorrow 10:00 !2h !18:30');
  await expect(page.locator('.tasks-pieces')).toContainText('Reminder');
  await expect(page.locator('.tasks-smart-preview')).toContainText('Reminder 2 h before');
  await page.getByRole('button', {name: 'Add task'}).first().click();
  await expect.poll(async () => (await stored(page)).find(t => t.title === 'Pay the fictional rent')?.reminders).toEqual([{before: 120}, {before: 0, at: '2026-11-24T18:30'}]);
  // A long line joined like speech is offered as two tasks.
  await field.fill('Call the fictional plumber about the boiler and then book the fictional dentist for Friday');
  await expect(page.getByRole('button', {name: 'Make 2 tasks'})).toBeVisible();
  const findings = await axe(page, page.locator('main'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await noSideways(page)).toBe(true);
});

test('a reminder at its own date and time in the editor, and a note reminder on the Notes page', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?task=task_fictional-bank'); await settle(page);
  const editor = page.getByRole('form', {name: 'Edit “Call the fictional bank”'});
  await expect(editor.getByLabel('Remind me at — optional')).toHaveValue('2026-11-23T08:30');
  await editor.getByLabel('Remind me at — optional').fill('2026-11-24T07:45');
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => (await stored(page))[0]!.reminders).toEqual([{before: 0, at: '2026-11-24T07:45'}]);
  await page.goto('/app/notes?view=notes'); await settle(page);
  await page.getByRole('textbox', {name: 'New note'}).fill('Fictional house');
  await page.getByRole('button', {name: 'Make note'}).click();
  await page.getByRole('textbox', {name: 'Note'}).fill('Boiler\n@remind tomorrow 9:30 call the fictional plumber');
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page.getByRole('list', {name: 'Reminders in this note'})).toContainText('Reminder · Tue, Nov 24, 9:30 AM · call the fictional plumber');
});

test('a countdown that counts the days since', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => {
    localStorage.setItem('zigoals:countdowns:v1', JSON.stringify({version: 1, items: [{id: 'quit', title: 'Fictional quit day', date: '2025-10-01', createdAt: '2025-10-01T08:00:00.000Z'}]}));
    localStorage.setItem('zigoals:countdown-extras:v1', JSON.stringify({version: 1, items: {quit: {since: true}}}));
    localStorage.setItem('zigoals:today-cards:v1', JSON.stringify({version: 1, cards: ['countdowns']}));
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  });
  await page.goto('/app'); await settle(page);
  const up = page.getByRole('list', {name: 'Counting up'});
  await expect(up).toContainText('418 days since · 1 year, 1 month');
  await expect(up.getByRole('button', {name: 'Count the days since: “Fictional quit day”'})).toHaveAttribute('aria-pressed', 'true');
});
