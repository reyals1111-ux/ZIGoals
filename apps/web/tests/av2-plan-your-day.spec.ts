import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #256; Structured's morning planning and overdue reminders): the "Plan your day" time is
 * chosen in Tasks → This week and kept in the planning record; the notification's address (/app/tasks?view=today&plan=1)
 * opens Plan my day with the focus on it and forgets ?plan=1; Settings lists "Plan your day" among the notification types.
 * The notification's words are unit-tested against the service worker (lib/notify/r3-plan-day-notify.test.ts). At 390 and
 * 1440 in Nebula, Light and Dark, axe-clean. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-20T09:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Post the fictional parcel', due: '2026-11-21'}, {id: 'task_fictional-parcel', at, today: '2026-11-20'});
const planRecord = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}') as {planReminder?: {time: string}});
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: Plan your day is chosen in Tasks and its address opens Plan my day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T07:30:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => {
    localStorage.setItem('zigoals:tasks:v1', v);
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  }, JSON.stringify(seeded));
  await expect(page.getByText('Plan your day', {exact: true}).first()).toBeAttached();

  await page.goto('/app/tasks?view=week'); await settle(page);
  const choice = page.getByLabel('Plan your day reminder');
  await choice.selectOption('07:30');
  await expect.poll(() => planRecord(page)).toMatchObject({planReminder: {time: '07:30'}});
  await expect(page.getByText(/opens Plan my day and says how many tasks are overdue, never their names/)).toBeVisible();
  await clean(page);

  await page.goto('/app/tasks?view=today&plan=1'); await settle(page);
  const fold = page.locator('details.tasks-plan-day');
  await expect(fold).toHaveAttribute('open', '');
  await expect(fold.locator('summary')).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe('?view=today');
  await expect(fold.getByRole('list', {name: 'Suggested for today'}).getByRole('listitem')).toHaveText([/Post the fictional parcel/]);
  await clean(page);

  // None: the choice clears the record's time.
  await page.goto('/app/tasks?view=week'); await settle(page);
  await page.getByLabel('Plan your day reminder').selectOption('');
  await expect.poll(async () => (await planRecord(page)).planReminder ?? null).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
