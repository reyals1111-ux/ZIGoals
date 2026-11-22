import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #260; Structured's notes in the Focus Timer): while a Pomodoro started from a task runs,
 * "Notes for this session" takes a note; it is kept with the session's block, shown in the result, and on the person's tap
 * added under the task's own notes (with Undo). The clock is fast-forwarded. At 390 and 1440 in Nebula, Light and Dark,
 * axe-clean. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Write the fictional report', due: '2026-11-23'}, {id: 'task_fictional-report', at, today: '2026-11-23'});
const records = (page: import('@playwright/test').Page) => page.evaluate(() => ({
  notes: (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {notes?: string}[])[0]?.notes ?? null,
  sessions: (JSON.parse(localStorage.getItem('zigoals:focus-sessions:v1') ?? '{"sessions":[]}').sessions as {note?: string}[]).map(s => s.note ?? null),
}));
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: notes during a focus session, kept and added to the task`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  await page.getByRole('button', {name: 'Focus on “Write the fictional report”'}).click();
  const panel = page.locator('section.pomodoro');
  await panel.getByLabel('Focus block').selectOption('5');
  await panel.getByLabel('Blocks').selectOption('1');
  await panel.getByLabel('Long break').selectOption('10');
  await panel.getByRole('checkbox', {name: /Mark “Write the fictional report” done/}).uncheck();
  await panel.getByRole('button', {name: 'Start the Pomodoro'}).click();
  const box = panel.getByLabel('Notes for this session');
  await box.fill('Ask Noor about the fictional figures');
  await box.blur();
  await clean(page);
  await page.clock.runFor(16 * 60_000);
  await expect(panel.getByText('Your note is kept with this session:')).toBeVisible();
  await expect(panel.locator('.pomodoro-note-text')).toHaveText('Ask Noor about the fictional figures');
  await expect.poll(async () => (await records(page)).sessions).toEqual(['Ask Noor about the fictional figures']);
  await panel.getByRole('button', {name: 'Add the note to “Write the fictional report”’s notes'}).click();
  await expect.poll(async () => (await records(page)).notes).toBe('Ask Noor about the fictional figures');
  await expect(panel.getByText('Added to “Write the fictional report”’s notes.')).toBeVisible();
  await clean(page);
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await records(page)).notes).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
