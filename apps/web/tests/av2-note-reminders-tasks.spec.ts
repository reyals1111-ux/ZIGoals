import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #224; Google Keep reminders in Google Tasks): reminders written in a note show in
 * Tasks → Today ("From your notes"), in Tasks → Upcoming by day and on the Agenda's day and week, each opening its note;
 * they stay note lines — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const saved = '2026-11-23T07:00:00.000Z';
const notes = JSON.stringify({version: 1, voice: false, notes: [{id: 'note_fictional-house', kind: 'topic', title: 'Fictional house', body: 'Boiler\n@remind 18:30 call the fictional plumber\n@remind tomorrow 9:30 order the fictional filter', createdAt: saved, updatedAt: saved}]});
const tasks = JSON.stringify(addTask(emptyTasks(), {title: 'Water the fictional plants', due: '2026-11-23'}, {id: 'task_fictional-water', at: new Date(saved), today: '2026-11-23'}));
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: a note's reminders in Today, Upcoming and the Agenda`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([n, t]) => { localStorage.setItem('zigoals:notes:v1', n!); localStorage.setItem('zigoals:tasks:v1', t!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [notes, tasks]);

  await page.goto('/app/tasks?view=today'); await settle(page);
  const today = page.getByRole('list', {name: 'Reminders in your notes today'});
  await expect(today.getByRole('listitem')).toHaveText([/^⏰ 6:30 PM · call the fictional plumberOpen the note “Fictional house”$/]);
  // Nothing is copied into the task list.
  await expect(page.locator('li.task')).toHaveCount(1);
  await clean(page);

  await page.goto('/app/tasks?view=upcoming'); await settle(page);
  await expect(page.getByRole('list', {name: 'Reminders in your notes: Tomorrow'})).toContainText('Tomorrow, 9:30 AM · order the fictional filter');
  await clean(page);

  await page.goto('/app/agenda'); await settle(page);
  const agenda = page.getByRole('list', {name: 'Reminders in your notes on these days'});
  await expect(agenda.getByRole('listitem')).toHaveCount(2);
  await agenda.getByRole('link', {name: 'Open the note “Fictional house”'}).first().click();
  await expect(page).toHaveURL(/\/app\/notes\?note=note_fictional-house/);
  await page.setViewportSize({width: 320, height: 720});
  await page.goto('/app/tasks?view=today'); await settle(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
