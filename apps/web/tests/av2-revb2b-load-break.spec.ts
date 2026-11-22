import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Review b2b #8 (LEDGER #111): Health → Workouts → "Distance goals and training load" for someone back after a long break
 * (runs in July to September, nothing in the four weeks before, a run this week): the load line says "Welcome back",
 * never "your first week here"; a first-ever week still says so. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const run = (id: string, date: string, km: number, seconds: number) => ({id, name: `Fictional run ${id}`, date, type: 'cardio', startedAt: `${date}T08:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T08:00:00.000Z`) + seconds * 1000).toISOString(),
  exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds, done: true}]}]});
const log = (workouts: ReturnType<typeof run>[]) => JSON.stringify({version: 1, templates: [], exercises: [], restSeconds: 90, workouts});
for (const [name, workouts, words, never] of [
  ['back after a break', [run('a', '2026-07-04', 5, 1800), run('b', '2026-08-15', 6, 2100), run('c', '2026-09-30', 5, 1800), run('d', '2026-11-12', 8, 2720)], 'Welcome back: nothing in the four weeks before, so there is no usual to compare with yet.', 'first week'],
  ['a first week', [run('d', '2026-11-12', 8, 2720)], 'This is your first week here, so there is no usual yet.', 'Welcome back'],
] as const) test(`the training load words: ${name}`, async ({page, isMobile}) => {
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-14T12:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, log([...workouts])] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const panel = page.getByRole('region', {name: 'Distance goals and training load'});
  await panel.locator('details.workouts-goals-fold > summary').click();
  const line = panel.locator('.av2-load-line');
  await expect(line).toContainText('Last 7 days: 45 min');
  await expect(line).toContainText(words);
  await expect(line).not.toContainText(never);
});
