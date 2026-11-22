import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #110, #111; Strava's per-run summary, goals and fitness): a run in "Your workouts" says
 * its pace beside the runs before it; "Distance goals and training load" sets a running goal for the month (19 of 60 km,
 * a day's pace, behind pace) and says the last 7 days beside the usual week, never calories — at 390 and 1440, in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const run = (id: string, date: string, km: number, seconds: number) => ({id, name: `Fictional run ${id}`, date, type: 'cardio', startedAt: `${date}T08:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T08:00:00.000Z`) + seconds * 1000).toISOString(),
  exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds, done: true}]}]});
const record = {version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [run('a', '2026-11-03', 5, 1800), run('b', '2026-11-08', 6, 2100), run('c', '2026-11-12', 8, 2720)]};
for (const theme of THEMES) test(`${theme}: a run's summary, a running goal and the load`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-14T12:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const history = page.getByRole('region', {name: 'Your workouts'});
  await history.locator('details').filter({hasText: 'Fictional run c'}).locator('summary').click();
  await expect(history.locator('.workouts-run-summary').first()).toHaveText('8 km at 5:40 a km. Against your last 2 runs: 15 s a km faster, 2.5 km longer. A running best: longest run.');
  const panel = page.getByRole('region', {name: 'Distance goals and training load'});
  await panel.locator('details.workouts-goals-fold > summary').click();
  await expect(panel).toContainText('No distance goal yet.');
  await panel.getByRole('combobox', {name: 'Sport'}).selectOption('run');
  await panel.getByRole('combobox', {name: 'For'}).selectOption('month');
  await panel.getByRole('textbox', {name: 'Distance (km)'}).fill('60');
  await panel.getByRole('button', {name: 'Set the goal'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Goal set: running, 60 km this month.'})).toBeVisible();
  const bar = panel.getByRole('progressbar', {name: 'Running this month'});
  await expect(bar).toHaveAttribute('aria-valuenow', '32');
  await expect(panel.locator('.av2-goal-list')).toContainText('19 km of 60 km');
  await expect(panel.locator('.av2-goal-list')).toContainText('41 km to go, 16 days left (about 2.6 km a day) · behind pace for now.');
  await expect(panel.locator('.workouts-goal-line')).toHaveText('Running this month: 19 of 60 km.');
  await expect(panel.locator('.av2-load-line')).toContainText('Last 7 days: 80 min');
  await expect(panel).not.toContainText('kcal');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'Kilometres'}).click();
  await expect(panel.locator('.av2-load-line')).toContainText('Last 7 days: 14 km');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await panel.getByRole('button', {name: 'Remove the goal Running this month'}).click();
  await expect(panel).toContainText('No distance goal yet.');
});
