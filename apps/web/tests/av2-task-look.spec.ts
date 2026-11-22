import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #257; Structured's task icons and colours): the task editor suggests a symbol from the
 * title's words ("dentist" → ✚, red), the person takes it or chooses another symbol and colour, Save keeps it on the task,
 * and the symbol shows beside the title in the list and on the Day Timeline (decoration: hidden from a screen reader, the
 * title says what it is). At 390 and 1440 in Nebula, Light and Dark, axe-clean. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Call the fictional dentist', due: '2026-11-23', time: '15:00'}, {id: 'task_fictional-dentist', at, today: '2026-11-23'});
const look = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {look?: unknown}[])[0]?.look ?? null);
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: a task's symbol and colour, suggested from its words`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  const row = page.locator('li.task').filter({hasText: 'Call the fictional dentist'});
  await row.getByRole('button', {name: 'Edit “Call the fictional dentist”'}).click();
  const field = row.getByRole('group', {name: 'Symbol and colour — optional'});
  await expect(field).toBeVisible();
  await field.getByRole('button', {name: 'Use the suggestion for “dentist”'}).click();
  await expect(field.getByRole('radio', {name: 'Symbol ✚'})).toBeChecked();
  await expect(field.getByRole('radio', {name: 'Red'})).toBeChecked();
  await clean(page);
  // Another colour, then Save.
  await field.getByRole('radio', {name: 'Teal'}).check({force: true});
  await row.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => look(page)).toEqual({glyph: '✚', colour: 'teal'});
  const mark = page.locator('li.task .task-look').first();
  await expect(mark).toHaveText('✚');
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
  await expect(mark).toHaveAttribute('data-look-colour', 'teal');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.goto('/app/timeline'); await settle(page);
  const block = page.locator('.timeline-row').filter({hasText: 'Call the fictional dentist'});
  await expect(block.locator('.timeline-title strong')).toHaveText('✚ Call the fictional dentist');
  await clean(page);

  // No symbol clears it.
  await page.goto('/app/tasks?view=today'); await settle(page);
  await row.getByRole('button', {name: 'Edit “Call the fictional dentist”'}).click();
  await row.getByRole('radio', {name: 'No symbol'}).check({force: true});
  await row.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => look(page)).toBeNull();
});
