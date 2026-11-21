import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-WEEK-GRID; Habitify's week view): Habits → "This week, Monday to Sunday": every habit
 * by day; Tuesday's missed walk ticked late with Undo, later days not tappable, the week before one tap away — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways page scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-25T08:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const tuesday = (page: Page) => page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {id: string; entries: {date: string; count: number}[]}[]).find(h => h.id === id)?.entries.find(e => e.date === '2026-11-24')?.count ?? 0, [HABITS_KEY, ID] as const);
for (const theme of THEMES) test(`${theme}: Tuesday ticked late in the week grid, with Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  d = logHabitValue(d, ID, '2026-11-23', 1, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-25'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  await page.locator('summary', {hasText: 'This week, Monday to Sunday'}).click();
  const grid = page.getByRole('region', {name: 'Habits this week, by day'});
  await expect(grid.getByRole('columnheader')).toHaveCount(8);
  await expect(grid.getByRole('button', {name: /^Fictional walk, Mon, Nov 23: done$/})).toHaveAttribute('aria-pressed', 'true');
  await expect(grid.getByRole('img', {name: /^Fictional walk, Thu, Nov 26: ahead$/})).toBeVisible();
  const findings = await axe(page, page.locator('.habit-week'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await grid.getByRole('button', {name: /^Fictional walk, Tue, Nov 24: missed$/}).click();
  await expect.poll(() => tuesday(page)).toBe(1);
  await expect(grid.getByRole('button', {name: /^Fictional walk, Tue, Nov 24: done$/})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => tuesday(page)).toBe(0);
  await page.getByRole('group', {name: 'Which week'}).getByRole('button', {name: '← Week before'}).click();
  await expect(grid.getByRole('columnheader').nth(1)).toContainText('16');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
