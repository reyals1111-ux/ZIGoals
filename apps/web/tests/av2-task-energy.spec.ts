import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #259; Structured's Energy Monitor): a task's energy is chosen in its editor, the day's
 * amount in Tasks → This week, and Tasks → Today says the day's total in calm words ("room for more", "near your amount",
 * "more than your amount"), never as an alert. At 390 and 1440 in Nebula, Light and Dark, axe-clean. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Fictional move of the shed', due: '2026-11-23', minutes: 120}, {id: 'task_fictional-shed', at, today: '2026-11-23'});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {energy?: string}[])[0]?.energy ?? null);
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: a task's energy and the day's total in calm words`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  const row = page.locator('li.task').filter({hasText: 'Fictional move of the shed'});
  await row.getByRole('button', {name: 'Edit “Fictional move of the shed”'}).click();
  await row.getByLabel('Energy — optional').selectOption('heavy');
  await expect(row.getByText(/Heavy: takes a lot out of you/)).toBeVisible();
  await row.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => stored(page)).toBe('heavy');
  await expect(row.locator('.task-energy')).toHaveText('Energy · Heavy');
  await expect(page.locator('.tasks-energy-line')).toContainText('Energy today: about 12 of your 20 — room for more.');
  await expect(page.locator('.tasks-energy')).not.toHaveAttribute('role', 'alert');
  await clean(page);

  // A smaller amount: the same day is "more than your amount", still a plain line.
  await page.goto('/app/tasks?view=week'); await settle(page);
  await page.getByLabel('Energy a day holds').selectOption('8');
  await page.goto('/app/tasks?view=today'); await settle(page);
  await expect(page.locator('.tasks-energy-line')).toContainText('about 12 of your 8 — more than your amount');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
