import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {GAME_KEY, HABIT_EXTRAS_KEY} from '../lib/aa-device-keys';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';
import {openDeskFold} from './ao/folds';

/**
 * Session AV lane 2 (habits; LEDGER #53, #55): Habits → "Your areas this week" (each life area's done of due, its weekly
 * milestone, the person's own number set by keyboard, focus back on its button) and Journey → "This month's theme"
 * (November: Gratitude, in the Mind area, 15 days earn the Theme month badge; hidden and shown again, focus kept) — at
 * 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-18T08:00:00+01:00');
const WALK = 'aaaaaaaa-0000-4000-8000-000000000011', CALM = 'aaaaaaaa-0000-4000-8000-000000000012';
for (const theme of THEMES) test(`${theme}: the areas' week and the month's theme`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = emptyHabitData();
  d = createHabit(d, {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, WALK);
  d = createHabit(d, {title: 'Fictional quiet minute', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, CALM);
  for (let day = 1; day <= 17; day++) d = logHabitValue(d, CALM, `2026-11-${String(day).padStart(2, '0')}`, 1, {}, NOW);
  d = logHabitValue(d, WALK, '2026-11-16', 1, {}, NOW);
  const extras = {version: 1, areas: {[WALK]: 'health', [CALM]: 'mind'}};
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([h, hv, x, xv, g, gv]) => { localStorage.setItem(h, hv); localStorage.setItem(x, xv); localStorage.setItem(g, gv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-18'); },
    [HABITS_KEY, JSON.stringify(d), HABIT_EXTRAS_KEY, JSON.stringify(extras), GAME_KEY, JSON.stringify({version: 1, enabled: true, levelSeen: 1, badges: false})] as const);

  // Habits: the areas' week (Monday 16 to Sunday 22 November; Wednesday today).
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByText('Your areas this week', {exact: true}).click();
  const list = page.getByRole('list', {name: 'Your areas this week'});
  await expect(list.getByRole('listitem').filter({hasText: 'Health'}).locator('.habit-area-week-line')).toHaveText('Health: 1 of 7 this week · 1 habit');
  await expect(list.getByRole('listitem').filter({hasText: 'Habits & Mind'}).locator('.habit-area-week-line')).toHaveText('Habits & Mind: 2 of 7 this week · 1 habit');
  const set = list.getByRole('button', {name: 'Set the weekly milestone for Habits & Mind'});
  await set.click();
  const field = list.getByLabel('Check-ins a week for Habits & Mind');
  await expect(field).toBeFocused();
  await field.fill('2');
  await field.press('Enter');
  await expect(set).toBeFocused();
  await expect(list.getByRole('status').filter({hasText: 'Habits & Mind: your weekly milestone is 2.'})).toBeVisible();
  await expect(list.getByRole('listitem').filter({hasText: 'Habits & Mind'})).toContainText('Weekly milestone: 2 (your own) · reached ✓');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null')?.areaGoals, HABIT_EXTRAS_KEY)).toEqual({mind: 2});
  let findings = await axe(page, list);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  // Journey: November's theme, reached on the quiet minute (Mind).
  await page.goto('/app/journey'); await hydrated(page);
  await openDeskFold(page, 'This month’s theme');
  const panel = page.getByRole('region', {name: 'Gratitude'});
  await expect(panel.locator('.journey-theme-count')).toHaveText('15 of 15 days with a check-in · reached: the Theme month badge is yours');
  await expect(panel).toContainText('Check-ins on your Habits & Mind habits count.');
  await expect(panel).toContainText('Months reached: Nov 2026 · Gratitude.');
  findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'Hide the monthly theme'}).click();
  const show = page.getByRole('button', {name: 'Show the monthly theme'});
  await expect(show).toBeFocused();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null')?.monthTheme, GAME_KEY)).toBe(false);
  await show.press('Enter');
  await expect(page.getByRole('button', {name: 'Hide the monthly theme'})).toBeFocused();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
