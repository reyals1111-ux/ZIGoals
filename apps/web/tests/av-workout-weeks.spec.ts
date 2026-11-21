import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV, owner follow-up 1 (F-WORKOUT-WEEKS; Strava, Hevy): Health → Workouts shows the last 12 weeks — distance,
 * time or weight lifted per week — with the same figures as a table, at 390 and 1440, three themes, axe-clean, no
 * sideways scroll at 320. Fictional workouts; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const workout = (id: string, date: string, minutes: number, exercises: unknown[]) => ({id, name: 'Fictional session', date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T08:00:00.000Z`) + minutes * 60_000).toISOString(), exercises});
const run = (id: string, km: number) => ({id, exerciseId: 'run', name: 'Run', measure: 'distance-time', sets: [{id: `${id}s`, kind: 'normal', distanceKm: km, seconds: 1800, done: true}]});
for (const theme of THEMES) test(`${theme}: two runs this week and one last week, by distance, then by time`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify({version: 1, templates: [], exercises: [], workouts: [workout('a', '2026-11-23', 30, [run('r1', 5)]), workout('b', '2026-11-24', 40, [run('r2', 7.5)]), workout('c', '2026-11-18', 35, [run('r3', 6)])]})] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const weeks = page.getByRole('region', {name: 'Your last 12 weeks'});
  await expect(weeks.getByRole('button', {name: 'Distance'})).toHaveAttribute('aria-pressed', 'true');
  await expect(weeks).toContainText('Distance this week: 12.5 km · in 12 weeks: 18.5 km.');
  await weeks.getByRole('button', {name: 'Time'}).click();
  await expect(weeks).toContainText('Time this week: 70 min');
  await weeks.getByText('As a table').click();
  await expect(weeks.getByRole('table').getByRole('row').nth(1)).toContainText('2');
  const findings = await axe(page, weeks);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
