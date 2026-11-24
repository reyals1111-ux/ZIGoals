import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #258; Structured's timeline for any day): the Day Timeline gains a day picker (Today,
 * Tomorrow, another day) and otherwise keeps its layout. Tomorrow shows tomorrow's tasks at their times, no "Now" line and
 * no Replan; the day stays in the address (?day=) for a reload; Today goes back. At 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
let seeded = addTask(emptyTasks(), {title: 'Fictional dentist tomorrow', due: '2026-11-24', time: '10:00'}, {id: 'task_fictional-tomorrow', at, today: '2026-11-23'});
seeded = addTask(seeded, {title: 'Fictional call today', due: '2026-11-23', time: '16:00'}, {id: 'task_fictional-today', at, today: '2026-11-23'});
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: the Day Timeline for tomorrow and another day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/timeline'); await settle(page);
  const picker = page.getByRole('group', {name: 'Day to show'});
  await expect(picker.getByRole('button', {name: 'Today'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.timeline-row').filter({hasText: 'Fictional call today'})).toBeVisible();
  await expect(page.locator('.timeline-now')).toHaveCount(1);

  await picker.getByRole('button', {name: 'Tomorrow'}).click();
  await expect(picker.getByRole('button', {name: 'Tomorrow'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.timeline-hero')).toContainText('Tomorrow');
  await expect(page.locator('.timeline-row').filter({hasText: 'Fictional dentist tomorrow'})).toBeVisible();
  await expect(page.locator('.timeline-row').filter({hasText: 'Fictional call today'})).toHaveCount(0);
  await expect(page.locator('.timeline-now')).toHaveCount(0);
  await expect(page.getByText(/keeps that time for this date only/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe('?day=2026-11-24');
  await clean(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  // A reload keeps the day; another day from the date field; Today goes back.
  await page.reload(); await settle(page);
  await expect(page.locator('.timeline-row').filter({hasText: 'Fictional dentist tomorrow'})).toBeVisible();
  await picker.getByLabel('Another day').fill('2026-11-30');
  await expect(page.getByRole('heading', {name: 'A quiet day'})).toBeVisible();
  await expect(page.getByText(/Nothing is planned for this day yet/)).toBeVisible();
  await picker.getByRole('button', {name: 'Today'}).click();
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe('');
  await expect(page.locator('.timeline-row').filter({hasText: 'Fictional call today'})).toBeVisible();
});
