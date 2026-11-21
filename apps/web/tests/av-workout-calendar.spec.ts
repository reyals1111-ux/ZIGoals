import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV, owner follow-up 1 (F-WORKOUT-CALENDAR; Hevy's calendar): Health → Workouts → "Calendar" shows November with
 * the two days trained lit and named, says "2 days with a workout this month (3 workouts)", and the previous month shows
 * October's workout — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const workout = (id: string, date: string, name: string) => ({id, name, date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T09:00:00.000Z`, exercises: []});
const record = {version: 1, templates: [], exercises: [], workouts: [workout('a', '2026-11-02', 'Fictional push'), workout('b', '2026-11-02', 'Fictional run'), workout('c', '2026-11-20', 'Fictional legs'), workout('d', '2026-10-14', 'Fictional swim')]};
for (const theme of THEMES) test(`${theme}: November's two training days, then October`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const fold = page.locator('details.workouts-calendar-fold');
  await fold.locator('summary').click();
  const calendar = fold.locator('.workout-calendar');
  await expect(calendar).toContainText('2 days with a workout this month (3 workouts).');
  await expect(calendar.getByRole('cell', {name: 'Mon, Nov 2: Fictional push, Fictional run'})).toHaveClass(/is-trained/);
  await expect(calendar.getByRole('cell', {name: 'Mon, Nov 23: no workout'})).toHaveClass(/is-today/);
  await expect(calendar.locator('td.is-trained')).toHaveCount(2);
  await expect(calendar.getByRole('button', {name: 'Next month'})).toBeDisabled();
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await calendar.getByRole('button', {name: 'Previous month'}).click();
  await expect(calendar.getByRole('cell', {name: 'Wed, Oct 14: Fictional swim'})).toHaveClass(/is-trained/);
  await expect(calendar).toContainText('1 day with a workout this month.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
