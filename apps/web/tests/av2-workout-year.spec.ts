import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #118, Hevy's yearly calendar and consistency streak): Health → Workouts → Calendar says
 * the weeks in a row with a workout; "Year" shows 2026's twelve months with the days trained filled and named for a screen
 * reader, and 2025 by the arrow — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const workout = (id: string, date: string, name: string) => ({id, name, date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T09:00:00.000Z`, exercises: []});
const record = {version: 1, templates: [], exercises: [], workouts: [workout('a', '2026-11-02', 'Fictional push'), workout('b', '2026-11-09', 'Fictional legs'), workout('c', '2026-11-17', 'Fictional pull'), workout('d', '2026-03-03', 'Fictional swim'), workout('e', '2025-06-10', 'Fictional run')]};
for (const theme of THEMES) test(`${theme}: the week streak and the year`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const fold = page.locator('details.workouts-calendar-fold');
  await fold.locator('summary').click();
  await expect(fold.locator('.workout-streak')).toHaveText('3 weeks in a row with a workout.');
  await fold.getByRole('group', {name: 'Calendar view'}).getByRole('button', {name: 'Year'}).click();
  const year = fold.locator('.av2-year');
  await expect(year).toContainText('4 days with a workout in 2026.');
  await expect(year.getByRole('cell', {name: 'Mon, Nov 2: Fictional push'})).toHaveClass(/is-trained/);
  await expect(year.getByRole('cell', {name: 'Fri, Nov 20: no workout'})).toHaveClass(/is-today/);
  await expect(year.locator('td.is-trained')).toHaveCount(4);
  await expect(year.getByRole('button', {name: 'Next year'})).toBeDisabled();
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await year.getByRole('button', {name: 'Previous year'}).click();
  await expect(year).toContainText('1 day with a workout in 2025.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await fold.getByRole('button', {name: 'Month'}).click();
  await expect(fold.locator('.workout-calendar')).toContainText('3 days with a workout this month.');
});
