import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV, owner follow-up 1 (F-MATRIX-RULES, F-REPEAT-PAUSE; TickTick, Things): the priority matrix with the person's
 * own lines (urgent within 5 days) moves a task due in four days into "Urgent and …"; a weekly task with a checklist is
 * paused until 10 December and comes back on Monday 14 December; finished, its subtasks open again for the next time —
 * at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), T = '2026-11-23';
let seeded = addTask(emptyTasks(), {title: 'Fictional tax form', due: '2026-11-27', level: 3}, {id: 'task_fictional-tax', at, today: T});
seeded = addTask(seeded, {title: 'Fictional bins out', due: T, recur: {every: 'week', interval: 1}}, {id: 'task_fictional-bins', at, today: T});
seeded = addTask(seeded, {title: 'Paper bin', parentId: 'task_fictional-bins'}, {id: 'task_fictional-paper', at, today: T});
const read = (page: Page) => page.evaluate(() => Object.fromEntries((JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {id: string; due?: string; doneAt?: string}[]).map(t => [t.id, [t.due ?? null, !!t.doneAt]])));
for (const theme of THEMES) test(`${theme}: own matrix lines, then a weekly task paused and its checklist reset`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=matrix'); await settle(page);
  const box = (q: string) => page.locator(`.tasks-matrix-box[data-quadrant="${q}"]`);
  await expect(box('later')).toContainText('Fictional tax form');
  const rules = page.locator('details.tasks-matrix-rules');
  await rules.locator('summary').click();
  await rules.getByLabel('Urgent when due within').selectOption('5');
  // Session AV (1c, q1 #43, deliberate): the label reads "Important when priority is" (it read oddly); same select, same choice.
  await rules.getByLabel('Important when priority is').selectOption('3');
  await expect(box('do')).toContainText('Fictional tax form');
  await expect(page.locator('.tasks-when-lede')).toHaveText('Urgent: overdue or due within 5 days. Important: priority P1 to P3. Moving a card changes only its priority; its day stays. A deadline that near is urgent too.'); // Session AV (1c, q1 #15, deliberate): the rule names the deadline too
  expect(await page.evaluate(() => localStorage.getItem('zigoals:matrix-rules'))).toBe('{"urgentDays":5,"importantUpTo":3}');
  const findings = await axe(page, rules);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await rules.getByRole('button', {name: 'Back to the usual lines'}).click();
  await expect(box('later')).toContainText('Fictional tax form');
  // Pause the weekly task until 10 December: it comes back on Monday 14 December.
  await page.goto('/app/tasks?view=all'); await settle(page);
  const bins = page.locator('li.task').filter({hasText: 'Fictional bins out'}).first();
  await bins.getByRole('button', {name: 'Edit “Fictional bins out”'}).click();
  const editor = page.getByRole('form', {name: 'Edit “Fictional bins out”'});
  const pause = editor.getByRole('group', {name: 'Pause the repeat'});
  // Session AV (1c, q1 #43): today is refused, so the picker starts tomorrow.
  await expect(pause.getByLabel('Until')).toHaveAttribute('min', '2026-11-24');
  await pause.getByLabel('Until').fill('2026-12-10');
  await pause.getByRole('button', {name: 'Pause until then'}).click();
  await expect.poll(() => read(page)).toMatchObject({'task_fictional-bins': ['2026-12-14', false]});
  // Finished, it comes round again and its checklist opens again.
  await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('zigoals:tasks:v1')!); for (const t of r.tasks) if (t.id === 'task_fictional-paper') t.doneAt = '2026-11-23T07:30:00.000Z'; localStorage.setItem('zigoals:tasks:v1', JSON.stringify(r)); });
  await page.reload(); await settle(page);
  await page.locator('li.task').filter({hasText: 'Fictional bins out'}).first().getByRole('checkbox', {name: 'Mark “Fictional bins out” done'}).click(); // a repeat comes round unticked, on its next day
  await expect.poll(() => read(page)).toMatchObject({'task_fictional-bins': ['2026-12-21', false], 'task_fictional-paper': [null, false]});
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
