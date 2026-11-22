import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (habits; LEDGER #45, #49, #50, #57): a habit's own options in its Details → Habit options: Whenever
 * (no set days: the card says "Whenever" and "Any day you like"), Never miss twice (the streak keeps one missed day), a
 * day left unlogged counted as skipped, and how hard it is (the XP). Each saves at once in the habit extras; focus stays
 * on the control — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data;
 * every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-10T08:00:00+01:00'), NOW = new Date('2026-11-23T08:00:00+01:00');
const WALK = 'aaaaaaaa-0000-4000-8000-000000000001', READ = 'aaaaaaaa-0000-4000-8000-000000000002';
for (const theme of THEMES) test(`${theme}: habit options change the streak, the schedule and the XP`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = emptyHabitData();
  d = createHabit(d, {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, WALK);
  d = createHabit(d, {title: 'Fictional reading', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, READ);
  // Reading: done 10–20 Nov, missed the 21st, done the 22nd; today (the 23rd) still open.
  for (let day = 10; day <= 22; day++) if (day !== 21) d = logHabitValue(d, READ, `2026-11-${day}`, 1, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-23'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);

  // Never miss twice on the reading habit: the streak keeps the 21st.
  const reading = page.getByRole('article', {name: 'Fictional reading', exact: true});
  await expect(reading.locator('.habit-metrics strong').first()).toContainText('1');
  await reading.getByLabel('Details for Fictional reading', {exact: true}).click();
  const options = reading.getByRole('group', {name: 'Options for Fictional reading'});
  await reading.getByLabel('Habit options for Fictional reading', {exact: true}).click();
  const twice = options.getByRole('checkbox', {name: /Never miss twice/});
  await twice.check();
  await expect(twice).toBeFocused();
  await expect(reading.getByRole('status').filter({hasText: 'Your streak now keeps one missed day.'})).toBeVisible();
  await expect(reading.locator('.habit-metrics strong').first()).toContainText('12');
  // How hard it is: Hard, 20 XP.
  await options.getByLabel('How hard is it?').selectOption('hard');
  await expect(reading.getByRole('status').filter({hasText: 'Hard: 20 XP for a done day.'})).toBeVisible();
  const findings = await axe(page, reading);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  // Whenever on the walk: no set days; today is never due.
  const walk = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await walk.getByLabel('Details for Fictional walk', {exact: true}).click();
  await walk.getByLabel('Habit options for Fictional walk', {exact: true}).click();
  const whenever = walk.getByRole('checkbox', {name: /Whenever, no set days/});
  await whenever.press('Space');
  await expect(whenever).toBeChecked();
  await expect(whenever).toBeFocused();
  await expect(walk.locator('h2 + small')).toContainText('Whenever');
  await expect(walk.getByText('Any day you like').first()).toBeVisible();
  // The two options that need due days are not offered for a whenever habit.
  await expect(walk.getByRole('checkbox', {name: /Never miss twice/})).toHaveCount(0);

  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habit-extras:v1') ?? 'null')?.options);
  expect(kept).toEqual({[READ]: {twoDay: true, difficulty: 'hard'}, [WALK]: {whenever: true}});
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
