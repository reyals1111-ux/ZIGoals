import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (habits; LEDGER #185, Loop's "x times in y days"): Details → Habit options → "A few times in any few
 * days" on an every-day habit: 3 times in any 10 days by default, the card says the schedule and how the window stands,
 * today is "Not needed today" while the window holds enough and due again when it asks for more. Saved at once in the
 * habit extras; the focus stays on the control — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways
 * scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-10T08:00:00+01:00'), NOW = new Date('2026-11-23T08:00:00+01:00');
const RUN = 'aaaaaaaa-0000-4000-8000-000000000031';
for (const theme of THEMES) test(`${theme}: a few times in any few days`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = createHabit(emptyHabitData(), {title: 'Fictional run', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, RUN);
  for (const day of ['2026-11-18', '2026-11-20', '2026-11-22']) d = logHabitValue(d, RUN, day, 1, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-23'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);

  const run = page.getByRole('article', {name: 'Fictional run', exact: true});
  await run.getByLabel('Details for Fictional run', {exact: true}).click();
  await run.getByLabel('Habit options for Fictional run', {exact: true}).click();
  const options = run.getByRole('group', {name: 'Options for Fictional run'});
  const rolling = options.getByRole('checkbox', {name: /A few times in any few days/});
  await rolling.check();
  await expect(rolling).toBeFocused();
  await expect(run.getByRole('status').filter({hasText: 'Now 3 times in any 10 days. A day off is a rest day while the last 10 days hold 3.'})).toBeVisible();
  await expect(run.locator('h2 + small')).toContainText('3 times in any 10 days');
  await expect(run.locator('.habit-period-progress')).toHaveText('3 of 3 in the last 10 days');
  await expect(run.getByText('Not needed today').first()).toBeVisible();
  // The two options a window decides for itself are not offered beside it.
  await expect(options.getByRole('checkbox', {name: /Never miss twice/})).toHaveCount(0);
  await expect(options.getByRole('checkbox', {name: /counts as skipped/})).toHaveCount(0);
  // Four in any ten: today is due again.
  await options.getByLabel('Times', {exact: true}).selectOption('4');
  await expect(options.getByLabel('Times', {exact: true})).toBeFocused();
  await expect(run.getByRole('status').filter({hasText: 'Now 4 times in any 10 days.'})).toBeVisible();
  await expect(run.locator('.habit-period-progress')).toHaveText('3 of 4 in the last 10 days');
  await expect(run.getByText('Not needed today')).toHaveCount(0);
  const findings = await axe(page, run);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habit-extras:v1') ?? 'null')?.options);
  expect(kept).toEqual({[RUN]: {rolling: {times: 4, days: 10, from: '2026-11-23'}}});
  // Off again: every day, as before.
  await rolling.uncheck();
  await expect(run.locator('h2 + small')).toContainText('Every day');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
